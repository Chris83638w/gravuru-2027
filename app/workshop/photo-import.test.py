"""Functional worker tests; synthetic images only. Optional private file via argv."""
import base64, hashlib, io, json, os, pathlib, struct, subprocess, sys, tempfile, unittest, zlib
from PIL import Image

WORKER = pathlib.Path(__file__).with_name('photo-import.py')
if '--worker' in sys.argv:
    index = sys.argv.index('--worker')
    WORKER = pathlib.Path(sys.argv[index + 1])
    del sys.argv[index:index + 2]
PRIVATE = None
if '--private-file' in sys.argv:
    index = sys.argv.index('--private-file')
    PRIVATE = pathlib.Path(sys.argv[index + 1])
    del sys.argv[index:index + 2]
MAX_BYTES = 15 * 1024 * 1024


def encoded(size=(20, 30), format='PNG', **kwargs):
    image = Image.new('RGBA' if format == 'PNG' else 'RGB', size, (100, 80, 60, 128) if format == 'PNG' else (100, 80, 60))
    out = io.BytesIO()
    image.save(out, format=format, **kwargs)
    return out.getvalue()


class PhotoTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory(prefix='gravuru-photo-test-')
        cls.env = dict(os.environ, TMPDIR=cls.directory.name, TEMP=cls.directory.name, TMP=cls.directory.name)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def run_photo(self, raw, **options):
        result = subprocess.run([sys.executable, '-I', str(WORKER)], input=json.dumps({'bytes': base64.b64encode(raw).decode(), **options}), text=True, capture_output=True, timeout=30, env=self.env)
        self.assertEqual(result.returncode, 0, result.stderr[-500:])
        return json.loads(result.stdout)

    def test_formats(self):
        for format in ('JPEG', 'PNG', 'WEBP'):
            with self.subTest(format=format):
                result = self.run_photo(encoded(format=format))
                self.assertNotIn('error', result)
                self.assertEqual((result['width'], result['height']), (20, 30))

    def test_over_both_previous_pixel_limits(self):
        result = self.run_photo(encoded((8000, 6000)))
        self.assertNotIn('error', result)
        self.assertEqual((result['width'], result['height']), (8000, 6000))
        with Image.open(io.BytesIO(base64.b64decode(result['preview']))) as preview:
            self.assertEqual(preview.size, (1600, 1200))

    def test_exact_byte_boundary(self):
        raw = encoded()
        self.assertNotIn('error', self.run_photo(raw + b'\0' * (MAX_BYTES - len(raw))))
        self.assertIn('error', self.run_photo(raw + b'\0' * (MAX_BYTES + 1 - len(raw))))

    def test_invalid_and_unsupported(self):
        for raw in (b'', b'not an image', encoded(format='GIF'), encoded()[:60]):
            self.assertIn('error', self.run_photo(raw))

    def test_animation_rejected(self):
        out = io.BytesIO()
        frames = [Image.new('RGB', (12, 12), color) for color in ('red', 'blue')]
        frames[0].save(out, 'PNG', save_all=True, append_images=frames[1:], duration=100)
        self.assertIn('error', self.run_photo(out.getvalue()))

    def test_exif_dimensions(self):
        exif = Image.Exif(); exif[274] = 6
        result = self.run_photo(encoded((2400, 1200), 'JPEG', exif=exif))
        self.assertEqual((result['width'], result['height']), (1200, 2400))
        with Image.open(io.BytesIO(base64.b64decode(result['preview']))) as preview:
            self.assertEqual(preview.size, (800, 1600))
            self.assertFalse(preview.getexif())

    def test_monochrome_alpha_preserved(self):
        result = self.run_photo(encoded(), monochrome=True)
        with Image.open(io.BytesIO(base64.b64decode(result['preview']))) as preview:
            self.assertEqual(preview.getpixel((2, 2)), (0, 0, 0, 128))

    @unittest.skipUnless(sys.platform == 'linux', 'Production Linux resource isolation')
    def test_resource_limits(self):
        source = 'import runpy,resource,json; runpy.run_path(' + repr(str(WORKER)) + '); print(json.dumps([resource.getrlimit(resource.RLIMIT_AS),resource.getrlimit(resource.RLIMIT_CPU)]))'
        result = subprocess.run([sys.executable, '-I', '-c', source], input=json.dumps({'bytes': base64.b64encode(encoded()).decode()}), text=True, capture_output=True, timeout=30, env=self.env)
        self.assertEqual(result.returncode, 0)
        limits = json.loads(result.stdout.splitlines()[-1])
        self.assertLessEqual(limits[0][1], 512 * 1024 * 1024)
        self.assertLessEqual(limits[1][1], 20)

    @unittest.skipUnless(sys.platform == 'linux', 'Production Linux resource isolation')
    def test_decompression_bomb_is_bounded(self):
        def chunk(kind, data):
            return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
        raw = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', 100000, 100000, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\0')) + chunk(b'IEND', b'')
        self.assertIn('error', self.run_photo(raw))

    @unittest.skipUnless(sys.platform == 'linux', 'Production Linux worker slots')
    def test_shared_worker_slots(self):
        import fcntl
        directory = pathlib.Path(self.directory.name) / ('gravuru-photo-workers-' + str(os.getuid()))
        directory.mkdir(mode=0o700, exist_ok=True)
        handles = []
        try:
            for slot in range(2):
                fd = os.open(directory / str(slot), os.O_CREAT | os.O_RDWR, 0o600)
                handles.append(fd); fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertIn('ausgelastet', self.run_photo(encoded())['error'])
        finally:
            for fd in handles: os.close(fd)
        self.assertNotIn('error', self.run_photo(encoded()))

    @unittest.skipUnless(PRIVATE is not None, 'Optional private real upload')
    def test_private_upload(self):
        raw = PRIVATE.read_bytes(); before = hashlib.sha256(raw).hexdigest()
        with Image.open(io.BytesIO(raw)) as source:
            size = source.size
        result = self.run_photo(raw)
        self.assertNotIn('error', result)
        self.assertEqual((result['width'], result['height']), size)
        self.assertEqual(hashlib.sha256(PRIVATE.read_bytes()).hexdigest(), before)
        self.assertLessEqual(max(Image.open(io.BytesIO(base64.b64decode(result['preview']))).size), 1600)


if __name__ == '__main__':
    unittest.main(verbosity=2)
