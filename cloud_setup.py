"""Materialize the reviewed source package without replacing existing work."""
from pathlib import Path, PurePosixPath
import hashlib
import stat
import zipfile

ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / "GRAVURU-2027-G27-02.zip"
EXPECTED = "0869f8f74cb81c9dfacfcefada9662b930daa5a3a96fcc324962ed8e7e46391a"
DEST = ROOT / "runtime"

if hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != EXPECTED:
    raise SystemExit("Archive checksum mismatch; nothing extracted.")
if DEST.exists():
    raise SystemExit("runtime already exists; existing work was not changed. Continue in runtime/.")
with zipfile.ZipFile(ARCHIVE) as archive:
    names = set()
    for item in archive.infolist():
        p = PurePosixPath(item.filename)
        if p.is_absolute() or '..' in p.parts or '\\' in item.filename or ':' in item.filename:
            raise SystemExit("Unsafe archive path")
        if any(part in ('.git', '.local-data', '.env') for part in p.parts):
            raise SystemExit("Private runtime data in archive")
        if stat.S_ISLNK(item.external_attr >> 16):
            raise SystemExit("Symlinks are not supported")
        if item.filename in names:
            raise SystemExit("Duplicate archive entry")
        names.add(item.filename)
    archive.extractall(DEST)
print("Reviewed source prepared in runtime/. Requires Node.js 24+. No packages need installing.")
print("cd runtime && npm test && npm run build")
