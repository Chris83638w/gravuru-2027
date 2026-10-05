"""Private photo preview. Originals are retained separately by the caller."""
import base64, io, json, sys, warnings
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = 20_000_000
warnings.simplefilter('error', Image.DecompressionBombWarning)
try:
    data = json.load(sys.stdin)
    raw = base64.b64decode(data['bytes'], validate=True)
    if not raw or len(raw) > 15 * 1024 * 1024:
        raise ValueError('size')
    with Image.open(io.BytesIO(raw)) as probe:
        if probe.format not in ('JPEG', 'PNG', 'WEBP') or getattr(probe, 'n_frames', 1) != 1:
            raise ValueError('format')
        if probe.width * probe.height > 20_000_000:
            raise ValueError('pixels')
        probe.verify()
    with Image.open(io.BytesIO(raw)) as image:
        image = ImageOps.exif_transpose(image).convert('RGBA')
        width, height = image.size
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        image.info.clear()
        out = io.BytesIO()
        image.save(out, format='PNG')
        print(json.dumps({'width': width, 'height': height, 'preview': base64.b64encode(out.getvalue()).decode()}))
except Exception:
    print(json.dumps({'error': 'Bitte ein gültiges einzelnes JPEG-, PNG- oder WebP-Foto bis 15 MB und 20 Megapixel verwenden.'}))
