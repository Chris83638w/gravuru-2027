"""Private photo preview. Originals are retained separately by the caller."""
import base64, io, json, os, stat, sys, tempfile
from PIL import Image, ImageOps

MAX_BYTES = 15 * 1024 * 1024
MAX_INPUT = ((MAX_BYTES + 2) // 3) * 4 + 4096


def protect_worker():
    """Linux production: bound actual resource use, not customer megapixels.

    Both editors and all Node processes share two slots per Unix user. The
    existing caller also kills each worker after 30 seconds. Windows is used
    only for local functional tests, not as the production photo service.
    """
    if sys.platform != 'linux':
        return None
    import fcntl
    import resource
    for kind, ceiling in ((resource.RLIMIT_AS, 512 * 1024 * 1024),
                          (resource.RLIMIT_CPU, 20)):
        soft, hard = resource.getrlimit(kind)
        bounds = [ceiling] + [n for n in (soft, hard) if n != resource.RLIM_INFINITY]
        limit = min(bounds)
        resource.setrlimit(kind, (limit, limit))
    directory = os.path.join(tempfile.gettempdir(), 'gravuru-photo-workers-' + str(os.getuid()))
    try:
        os.mkdir(directory, 0o700)
    except FileExistsError:
        pass
    info = os.lstat(directory)
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError('Unsafe worker slot directory')
    for slot in range(2):
        fd = os.open(os.path.join(directory, str(slot)), os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
                raise RuntimeError('Unsafe worker slot file')
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return fd
        except BlockingIOError:
            os.close(fd)
        except BaseException:
            os.close(fd)
            raise
    raise BlockingIOError('Photo workers busy')


def prepare_photo(data):
    raw = base64.b64decode(data['bytes'], validate=True)
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError('size')
    with Image.open(io.BytesIO(raw)) as probe:
        if probe.format not in ('JPEG', 'PNG', 'WEBP') or getattr(probe, 'n_frames', 1) != 1:
            raise ValueError('format')
        probe.verify()
    with Image.open(io.BytesIO(raw)) as image:
        width, height = image.size
        if image.getexif().get(274) in (5, 6, 7, 8):
            width, height = height, width
        # Reduce the preview before transpose/conversion to avoid full-size
        # duplicate buffers. The original bytes never pass through this resize.
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA')
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image = ImageOps.exif_transpose(image).convert('RGBA')
        color = data.get('previewColor', 'original')
        if color not in ('original', 'grayscale', 'sepia'):
            raise ValueError('preview color')
        if color != 'original':
            # Same sRGB matrices as photo-color.mjs, baked into this private
            # preview so the passive SVG importer needs no filter exception.
            matrix = ((.213, .715, .072, 0) * 3 if color == 'grayscale'
                      else (.393, .769, .189, 0, .349, .686, .168, 0, .272, .534, .131, 0))
            alpha = image.getchannel('A')
            image = image.convert('RGB').convert('RGB', matrix).convert('RGBA')
            image.putalpha(alpha)
        if data.get('monochrome') is True:
            # A newly generated engraving motif uses its alpha as the ink mask.
            # Keep original PNG bytes separately; print and photo edits stay RGB.
            alpha = image.getchannel('A')
            image = Image.new('RGBA', image.size, (0, 0, 0, 0))
            image.putalpha(alpha)
        image.info.clear()
        out = io.BytesIO()
        image.save(out, format='PNG')
        return {'width': width, 'height': height, 'preview': base64.b64encode(out.getvalue()).decode()}


slot_fd = None
try:
    slot_fd = protect_worker()
    # Resource guards are installed before replacing Pillow's pixel threshold.
    Image.MAX_IMAGE_PIXELS = None
    payload = sys.stdin.read(MAX_INPUT + 1)
    if len(payload) > MAX_INPUT:
        raise ValueError('size')
    data = json.loads(payload)
    if sys.argv[1:] == ['--review-previews']:
        # Two editor previews share one limited worker slot and keep their individual transforms.
        result = {name: prepare_photo({'bytes': data[name]}) for name in ('customer', 'reference')}
    else:
        result = prepare_photo(data)
    print(json.dumps(result))
except BlockingIOError:
    print(json.dumps({'error': 'Die Fotoprüfung ist gerade ausgelastet. Bitte versuche das Speichern gleich erneut; dein Foto bleibt erhalten.'}))
except MemoryError:
    print(json.dumps({'error': 'Dieses Foto konnte gerade nicht verarbeitet werden. Dein Original bleibt unverändert. Bitte versuche es erneut.', 'retrySeparately': True}))
except Exception:
    print(json.dumps({'error': 'Bitte ein gültiges einzelnes JPEG-, PNG- oder WebP-Foto bis 15 MB verwenden.'}))
finally:
    if slot_fd is not None:
        os.close(slot_fd)
