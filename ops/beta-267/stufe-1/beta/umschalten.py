"""Nach der Übertragung ausschließlich unter dem bestehenden Beta-Konto ausführen."""
import fcntl
from hashlib import sha256
import os
from pathlib import Path
import pwd
import sys
import tempfile

HERE = Path(__file__).resolve().parent
OLD = b"require('./tools/beta-267/hosted-c267.cjs');\n"
NEW = b"require('./tools/beta-267/hosted-stufe1.cjs');\n"
OLD_ROUTER_SHA = '7422443a01abb66e9a031bf00cc5361fdb7a5159a82498fdd00231d0bf567953'
OLD_HANDLER_SHA = '193c906e6febc8156119f8c813f83829635e6a672a8c255289e243a3fbfc5c16'
ENTRY_SHA = 'c3100bcfef7ce8b0468d1f2a10a789f15c06c70df8a9da092ff123f6d35f6e71'
OLDER_ROUTE = b"  if (url.origin === origin && url.pathname.startsWith('/variante-c/')) return require('./variante-c-test/versuch.cjs')(req,res,url);\n"
NEW_ROUTE = b"  if (url.origin === origin && url.pathname === '/prio-stufe-1/') return require('./prio-claude-stufe1/einstieg.cjs')(req,res,url);\n"


def require(value, message):
    if not value:
        raise SystemExit(message)


def check_target(path):
    require(path.resolve() == path, 'Unerwarteter Dateipfad: ' + str(path))


def read(path):
    check_target(path)
    return path.read_bytes()


def write(path, data, mode, before=None):
    """Neue Dateien exklusiv anlegen; vorhandenen Starter geprüft atomar tauschen."""
    check_target(path)
    if path.exists() and read(path) == data:
        return
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix='.prio-stufe1-', delete=False) as stage:
        name = stage.name
        try:
            stage.write(data)
            stage.flush()
            os.fchmod(stage.fileno(),mode)
            os.fsync(stage.fileno())
            if before is None:
                os.link(name,path)
            else:
                require(read(path) == before, 'Der laufende Startstand hat sich geändert.')
                os.replace(name,path)
        finally:
            Path(name).unlink(missing_ok=True)


def run(action):
    require(action in ('stage','activate','rollback'), 'Aktion: stage, activate oder rollback')
    require(pwd.getpwuid(os.geteuid()).pw_name=='gravurukonfibeta','Ausschließlich das Beta-Konto verwenden.')
    root = Path.home()/'beta'
    private = root/'private'
    require(private in HERE.parents or private == HERE, 'Die Dateien zuerst unter beta/private entpacken.')
    start = root/'start.cjs'
    tools = root/'tools'/'beta-267'
    backup = private/'prio-stufe1-start-vorher.cjs'
    check_target(root)
    check_target(private)
    gate = read(tools/'hosted-c267.cjs')
    require(sha256(gate).hexdigest()==OLD_ROUTER_SHA and gate.count(OLDER_ROUTE)==1, 'Bisheriger Beta-Router abweichend.')
    old_entry = read(tools/'variante-c-test'/'versuch.cjs')
    require(sha256(old_entry).hexdigest()==OLD_HANDLER_SHA, 'Bisheriger C-Test hat sich geändert.')
    lock = private/'prio-stufe1-install.lock'
    check_target(lock)
    with lock.open('a+b') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX)
        require(read(start) in (OLD,NEW), 'Bisheriger Starter abweichend.')
        if action == 'rollback':
            require(read(backup)==OLD, 'Die gesicherte Startdatei stimmt nicht.')
            write(start,OLD,0o644,NEW)
        else:
            router = read(HERE/'hosted-stufe1.cjs')
            require(router==gate.replace(OLDER_ROUTE,OLDER_ROUTE+NEW_ROUTE),'Zusätzliche Änderung im Router entdeckt.')
            entry = read(HERE/'einstieg.cjs')
            require(sha256(entry).hexdigest()==ENTRY_SHA, 'Prio-Einstieg abweichend.')
            entry_dir = tools/'prio-claude-stufe1'
            check_target(entry_dir)
            entry_dir.mkdir(mode=0o755, exist_ok=True)
            write(entry_dir/'einstieg.cjs',entry,0o644)
            write(tools/'hosted-stufe1.cjs',router,0o644)
            write(backup,OLD,0o600)
            if action == 'activate':
                write(start,NEW,0o644,OLD)
    print(action, 'OK. Startdatei', sha256(read(start)).hexdigest())


if __name__=='__main__':
    run(sys.argv[1] if len(sys.argv)==2 else '')
