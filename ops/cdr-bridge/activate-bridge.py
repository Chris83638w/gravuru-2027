#!/usr/bin/env python3
"""One-time operator activation, only after approval for the new upload access.

Run as the existing gravuru_werkstatt app owner. --check changes nothing.
Creates a separate private token and copy directory, and backs up config.
Never prints or changes the existing MCP credential. Does not restart the app.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import secrets
import stat
import tempfile

BASE = Path('/var/www/vhosts/gravuru-designwerkstatt.de')


def activate(base, apply=False):
    private = base / 'private'
    config = private / 'gravuru-cdr-mcp-config.json'
    root = private / 'cdr-produkte'
    token = private / 'cdr-bridge-token.txt'
    backup = private / 'cdr-bridge-config-before.json'
    for p in (private, config, base / 'gravuru-cdr-mcp'):
        s = p.lstat()
        if stat.S_ISLNK(s.st_mode) or s.st_uid != os.getuid():
            raise RuntimeError('Pfade/Eigentümer prüfen: ' + p.name)
    original = config.read_bytes()
    doc = json.loads(original)
    values = doc.get('values')
    if not isinstance(values, dict) or values.get('CDR_MCP_BRIDGE_ENABLED') == '1' or values.get('CDR_MCP_SOURCE_ROOT'):
        raise RuntimeError('Konfiguration ist nicht im erwarteten unverbundenen Ausgangszustand')
    if any(p.exists() or p.is_symlink() for p in (root, token, backup)):
        raise RuntimeError('Kopienordner, Upload-Token oder Sicherung schon vorhanden; nicht überschrieben')
    if "const VERSION = '1.2.0'" not in (base / 'gravuru-cdr-mcp/server.mjs').read_text():
        raise RuntimeError('Zuerst geprüfte Runtime 1.2.0 installieren')
    if not apply:
        return {'ready': True, 'changed': False, 'copyRoot': str(root), 'quotaMiB': 5120}
    os.umask(0o077)
    # Recheck before making the one-time transition; no tokens enter command text.
    if config.read_bytes() != original:
        raise RuntimeError('Konfiguration wurde inzwischen geändert')
    created = []
    replaced = False
    temp = None
    try:
        with backup.open('xb') as f:
            created.append(backup)
            f.write(original)
            f.flush()
            os.fsync(f.fileno())
        root.mkdir(mode=0o700)
        created.append(root)
        with token.open('x', encoding='utf-8') as f:
            created.append(token)
            f.write(secrets.token_urlsafe(48) + '\n')
            f.flush()
            os.fsync(f.fileno())
        values.update({'CDR_MCP_BRIDGE_ENABLED': '1', 'CDR_MCP_BRIDGE_ROOT': str(root),
                       'CDR_MCP_SOURCE_ROOT': str(root), 'CDR_MCP_BRIDGE_TOKEN_FILE': str(token),
                       'CDR_MCP_BRIDGE_MAX_MB': '5120'})
        fd, temp = tempfile.mkstemp(prefix='.cdr-bridge-config-', dir=private)
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(doc, f, indent=2)
            f.write('\n')
            f.flush()
            os.fsync(f.fileno())
        if config.read_bytes() != original:
            raise RuntimeError('Konfiguration wurde inzwischen geändert')
        os.replace(temp, config)
        replaced = True
        temp = None
        return {'configured': True, 'restartRequired': True, 'copyRoot': str(root),
                'uploadTokenFile': str(token), 'configBackup': str(backup),
                'createdAt': datetime.now(timezone.utc).isoformat()}
    finally:
        if temp:
            Path(temp).unlink(missing_ok=True)
        if not replaced:
            for p in reversed(created):
                if p.is_dir():
                    p.rmdir()
                else:
                    p.unlink()


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mode', choices=['check', 'activate'])
    args = ap.parse_args()
    if os.getuid() == 0 or BASE.name != 'gravuru-designwerkstatt.de':
        raise SystemExit('Als bestehender Plesk-App-Benutzer ausführen, nicht als root')
    print(json.dumps(activate(BASE, apply=args.mode == 'activate')))
