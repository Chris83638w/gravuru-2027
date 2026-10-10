"""Validate/build an immutable extension candidate privately on the Plesk host.

No app deploy/release, service restart, database access or product mutation.
The existing automation credential remains on its server and only enters the
Shopify CLI child environment. Run with the private Python 3.11 interpreter.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import tempfile
import zipfile

ROOT = Path('/var/www/vhosts/gravuru-designwerkstatt.de/private')
ARCHIVE = ROOT / 'gravuru-shopify-extension-candidate.zip'
EXPECTED_SHA256 = '5c447d58a9b35d935d5155db108afcb1d9975b6f2cb67f0ca80f1534e1e2c904'
CLI = ROOT / 'gravuru-shopify-deploy-tools/node_modules/@shopify/cli/bin/run.js'
NODE = '/opt/plesk/node/24/bin/node'


def private_file(file):
    info = file.lstat()
    if not stat.S_ISREG(info.st_mode) or file.is_symlink() or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError('Private file permissions not confirmed')
    return file.read_bytes()


def main():
    os.umask(0o077)
    info = ROOT.lstat()
    if not stat.S_ISDIR(info.st_mode) or ROOT.is_symlink() or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise ValueError('Private directory not confirmed')
    if os.environ.get('NODE_TLS_REJECT_UNAUTHORIZED') == '0':
        raise ValueError('TLS verification required')
    # Uploads are nonsecret, but must have the fixed reviewed digest.
    if ARCHIVE.is_symlink() or hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise ValueError('Archive checksum differs')
    with zipfile.ZipFile(ARCHIVE) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or len(names) > 1000:
            raise ValueError('Invalid archive inventory')
        manifest = json.loads(archive.read('RELEASE-FILES.json'))
        if set(names) != set(manifest['files']) | {'RELEASE-FILES.json'}:
            raise ValueError('Archive inventory differs')
        for name in names:
            path = PurePosixPath(name)
            info = archive.getinfo(name)
            if path.is_absolute() or '..' in path.parts or '\\' in name or info.is_dir() or stat.S_ISLNK(info.external_attr >> 16):
                raise ValueError('Unsafe archive member')
            data = archive.read(name)
            if name != 'RELEASE-FILES.json':
                expected = manifest['files'][name]
                if len(data) != expected['bytes'] or hashlib.sha256(data).hexdigest() != expected['sha256']:
                    raise ValueError('Member checksum differs')
        work = Path(tempfile.mkdtemp(prefix='gravuru-extension-check-', dir=ROOT))
        project = work / 'project'
        project.mkdir(mode=0o700)
        archive.extractall(project)
    report = {'schema': 1, 'privateDirectory': str(work), 'archiveSha256': EXPECTED_SHA256,
              'released': False, 'wholeApplicationReady': False, 'checks': []}
    # Fixed lockfile; install into this new private project only. No lifecycle
    # scripts and no automation credential in the npm child environment.
    install_env = {k: v for k, v in os.environ.items() if k not in ['SHOPIFY_APP_AUTOMATION_TOKEN', 'DEBUG', 'NODE_DEBUG']}
    install = subprocess.run([NODE, '/opt/plesk/node/24/lib/node_modules/npm/bin/npm-cli.js',
                              'ci', '--offline=false', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', str(work / 'npm-cache')],
                             cwd=project, env=install_env, text=True, capture_output=True, timeout=240)
    (work / 'install.log').write_text(install.stdout + '\n' + install.stderr)
    report['checks'].append({'name': 'lockedDependencies', 'exitCode': install.returncode})
    if install.returncode:
        (work / 'RESULT.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report))
        return
    credential = private_file(ROOT / 'gravuru-shopify-app-automation-token').decode().strip()
    if not credential or any(ord(c) < 33 or ord(c) > 126 for c in credential):
        raise ValueError('Automation credential unavailable')
    environment = dict(os.environ)
    environment.update(SHOPIFY_APP_AUTOMATION_TOKEN=credential, SHOPIFY_CLI_NO_ANALYTICS='1',
                       CI='true', NO_COLOR='1', XDG_CONFIG_HOME=str(work / 'config'))
    for key in ['DEBUG', 'NODE_DEBUG']:
        environment.pop(key, None)
    for label, command in [('configuration', ['app', 'config', 'validate', '--json']),
                           ('build', ['app', 'build'])]:
        result = subprocess.run([NODE, str(CLI), *command, '--path', str(project), '--no-input'],
                                cwd=project, env=environment, text=True, capture_output=True, timeout=120)
        output = (result.stdout + '\n' + result.stderr).replace(credential, '[redacted]')
        (work / (label + '.log')).write_text(output)
        report['checks'].append({'name': label, 'exitCode': result.returncode})
        if result.returncode:
            break
    (work / 'RESULT.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
