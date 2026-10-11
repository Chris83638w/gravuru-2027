"""Create a deterministic Shopify upload package from root-level theme files only."""
from pathlib import Path
import hashlib
import json
import zipfile

ROOT = Path(__file__).resolve().parent
THEME = ROOT / 'theme'
FOLDERS = ('assets', 'config', 'layout', 'locales', 'sections', 'snippets', 'templates')
FILES = sorted(file for folder in FOLDERS for file in (THEME / folder).rglob('*')
               if file.is_file() and (file.parent == THEME / folder or folder == 'templates'))
required = ['gravuru-hero.png', 'gravuru-home.png', 'gravuru-gift.png', 'gravuru-remembrance.png', 'gravuru-materials.png', 'sparkle.gif', 'dawn-license.txt']
for name in required:
    if not (THEME / 'assets' / name).is_file():
        raise SystemExit(f'Missing asset: {name}')
for file in FILES:
    if file.suffix in {'.b64'} or file.name.startswith('part0'):
        raise SystemExit(f'Unexpected transfer file: {file}')
manifest = [{'path': file.relative_to(THEME).as_posix(), 'bytes': file.stat().st_size,
             'sha256': hashlib.sha256(file.read_bytes()).hexdigest()} for file in FILES]
(ROOT / 'theme-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
archive = ROOT / 'gravuru-salbei-0.1.0.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as target:
    for file in FILES:
        entry = zipfile.ZipInfo(file.relative_to(THEME).as_posix(), date_time=(2026, 10, 11, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        target.writestr(entry, file.read_bytes())
with zipfile.ZipFile(archive) as verify:
    assert verify.testzip() is None
    assert len(verify.namelist()) == len(manifest)
    for item in manifest:
        assert hashlib.sha256(verify.read(item['path'])).hexdigest() == item['sha256']
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(ROOT / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='ascii')
print(f'{len(FILES)} files; {archive.stat().st_size} bytes; SHA-256 {digest}')
