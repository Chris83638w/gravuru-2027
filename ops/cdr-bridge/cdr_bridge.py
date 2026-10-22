#!/usr/bin/env python3
"""Read-only CDR sender for a Windows computer with access to V:\\Produkte.

Python 3.10+, standard library only. Defaults to a local plan for the 7x2 sheet.
Credentials are read interactively or from a local file; never written to logs.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import getpass
import hashlib
import http.client
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import stat
import sys
import tempfile
from urllib.parse import quote

HOST = 'cdr.gravuru-designwerkstatt.de'
ENDPOINT = '/bridge/v1/file'
TARGET = 'Türschilder/Gravur/Edelstahl/__NEU/7x2/[CDR]/TRE-V2A-7x2_Designs.cdr'
MAX_BYTES = 200 * 1024 * 1024
CHUNK = 1024 * 1024


class BridgeError(Exception):
    pass


def unlinked(p):
    s = p.lstat()
    if stat.S_ISLNK(s.st_mode) or getattr(s, 'st_file_attributes', 0) & 0x400:
        raise BridgeError('Verknüpfung/Junction wird nicht gelesen: ' + str(p))
    return s


def checked_file(root, rel):
    parts = PurePosixPath(rel).parts
    if not parts or rel != '/'.join(parts) or len(parts) > 32 or len(rel) > 2048 or re.search(r'[\\:\x00-\x1f\x7f]', rel) or any(p.startswith('.') or p.endswith(('.', ' ')) for p in parts) or not rel.lower().endswith('.cdr'):
        raise BridgeError('Ungültiger relativer CDR-Pfad: ' + rel)
    p = root
    for part in parts:
        p = p / part
        unlinked(p)
    if not p.is_file():
        raise BridgeError('Keine reguläre CDR-Datei: ' + rel)
    return p


def select_files(root, all_files=False):
    if not root.is_absolute():
        raise BridgeError('Quellordner muss absolut sein')
    # Check ancestors too, including Windows share/drive roots, without following junctions.
    for p in [*reversed(root.parents), root]:
        unlinked(p)
    if not root.is_dir():
        raise BridgeError('Quellordner nicht erreichbar: ' + str(root))
    if not all_files:
        return [(TARGET, checked_file(root, TARGET))]
    selected = []
    def walk(directory, depth=0):
        if depth > 31:
            raise BridgeError('Ordner zu tief verschachtelt: ' + str(directory))
        for p in sorted(directory.iterdir()):
            s = unlinked(p)
            if stat.S_ISDIR(s.st_mode):
                walk(p, depth + 1)
            elif stat.S_ISREG(s.st_mode) and p.suffix.lower() == '.cdr':
                rel = p.relative_to(root).as_posix()
                selected.append((rel, checked_file(root, rel)))
                if len(selected) > 50000:
                    raise BridgeError('Mehr als 50000 CDR-Dateien; Umfang aufteilen')
    walk(root)
    if not selected:
        raise BridgeError('Keine CDR-Dateien gefunden')
    return selected


def same_file_stat(a, b):
    return (a.st_size, a.st_mtime_ns, a.st_ctime_ns, a.st_ino, a.st_dev) == (b.st_size, b.st_mtime_ns, b.st_ctime_ns, b.st_ino, b.st_dev)


@contextmanager
def snapshot(root, rel):
    source = checked_file(root, rel)
    before = source.stat()
    if before.st_size < 12 or before.st_size > MAX_BYTES:
        raise BridgeError('Datei außerhalb der erlaubten Größe (12 Bytes bis 200 MiB): ' + rel)
    # TemporaryFile is private and removed even when upload fails. Source is only opened rb.
    with source.open('rb') as src, tempfile.TemporaryFile('w+b') as copy:
        opened = os.fstat(src.fileno())
        if not same_file_stat(before, opened):
            raise BridgeError('Quelle wurde vor dem Lesen geändert: ' + rel)
        digest, size, signature = hashlib.sha256(), 0, b''
        while True:
            block = src.read(CHUNK)
            if not block:
                break
            size += len(block)
            if size > MAX_BYTES:
                raise BridgeError('Datei ist während des Lesens zu groß geworden: ' + rel)
            signature = (signature + block[:12])[:12]
            digest.update(block)
            copy.write(block)
        after = os.fstat(src.fileno())
        if not same_file_stat(opened, after) or not same_file_stat(after, checked_file(root, rel).stat()) or size != before.st_size:
            raise BridgeError('Quelle wurde beim Lesen geändert; erneut versuchen: ' + rel)
        if not (signature.startswith(b'PK\x03\x04') or signature[:4] == b'RIFF' and signature[8:11] == b'CDR'):
            raise BridgeError('Keine unterstützte CDR-Signatur: ' + rel)
        copy.seek(0)
        yield copy, {'server_path': rel, 'sha256': digest.hexdigest(), 'bytes': size,
                     'sourceModified': datetime.fromtimestamp(before.st_mtime, timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')}


class Transport:
    def __init__(self, token):
        if not re.fullmatch(r'[A-Za-z0-9_-]{40,128}', token):
            raise BridgeError('Ungültiges Upload-Token')
        self.token = token

    def request(self, method, metadata, body=None):
        headers = {'Authorization': 'Bearer ' + self.token,
                   'X-CDR-Path': quote(metadata['server_path'], safe=''),
                   'User-Agent': 'gravuru-cdr-bridge/1.2.0'}
        if method == 'PUT':
            headers.update({'Content-Type': 'application/octet-stream', 'Content-Length': str(metadata['bytes']),
                            'X-CDR-SHA256': metadata['sha256'], 'X-CDR-Modified': metadata['sourceModified']})
        # Fixed, company-owned HTTPS destination. Validates certificate/hostname;
        # does not follow redirects and does not accept an insecure mode.
        connection = http.client.HTTPSConnection(HOST, timeout=120, context=ssl.create_default_context())
        try:
            connection.request(method, ENDPOINT, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read(16385)
            if len(data) > 16384:
                raise BridgeError('Unerwartet große Serverantwort')
            return response.status, dict(response.getheaders()), data
        except (OSError, http.client.HTTPException) as e:
            # Exception text can include proxy/server details; do not echo it or credentials.
            raise BridgeError('HTTPS-Übertragung nicht bestätigt (' + type(e).__name__ + ')') from None
        finally:
            connection.close()


def send_one(root, rel, transport):
    with snapshot(root, rel) as (copy, meta):
        status, headers, _ = transport.request('HEAD', meta)
        headers = {k.lower(): v for k, v in headers.items()}
        if status == 200 and headers.get('x-cdr-sha256') == meta['sha256'] and headers.get('x-cdr-bytes') == str(meta['bytes']):
            return {**meta, 'status': 'unverändert'}
        if status not in (200, 404, 409):
            raise BridgeError('Serverprüfung fehlgeschlagen (HTTP ' + str(status) + '); Upload-Zugang/Einrichtung prüfen')
        status, _, data = transport.request('PUT', meta, copy)
        if status != 200:
            raise BridgeError('Übertragung nicht bestätigt (HTTP ' + str(status) + ')')
        try:
            receipt = json.loads(data)
            if any(receipt.get(k) != meta[k] for k in ('server_path', 'sha256', 'bytes', 'sourceModified')) or receipt.get('source') != 'outbound-copy' or not receipt.get('receivedAt'):
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise BridgeError('Serverbestätigung passt nicht zur Datei') from None
        return {**meta, 'status': 'übertragen', 'receivedAt': receipt['receivedAt']}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--root', type=Path, default=Path('V:/Produkte'), help='V:/Produkte oder die entsprechende UNC-Freigabe')
    ap.add_argument('--all', action='store_true', help='Alle .cdr unter Produkte; ohne diese Option nur bekannter 7x2-Bogen')
    ap.add_argument('--send', action='store_true', help='Übertragen; ohne diese Option nur lokalen Plan anzeigen')
    ap.add_argument('--token-file', type=Path, help='Privates lokales Upload-Token; sonst verdeckte Eingabe')
    ap.add_argument('--report', type=Path, help='Optionaler lokaler JSON-Bericht ohne Token')
    args = ap.parse_args(argv)
    try:
        files = select_files(args.root, args.all)
        print('Quelle:', args.root)
        print('CDR-Dateien:', len(files), '| Ziel:', 'https://' + HOST)
        if not args.send:
            for rel, p in files:
                print(str(p.stat().st_size) + ' Bytes  ' + rel)
            print('Nur Plan. Keine Daten übertragen. Start mit --send.')
            return 0
        if args.token_file:
            token_stat = unlinked(args.token_file)
            if not stat.S_ISREG(token_stat.st_mode) or token_stat.st_size > 1024:
                raise BridgeError('Ungültige Token-Datei')
            if os.name != 'nt' and token_stat.st_mode & 0o077:
                raise BridgeError('Token-Datei muss privat sein (chmod 600)')
            token = args.token_file.read_text(encoding='utf-8').strip()
        else:
            token = getpass.getpass('Separates Upload-Token (Eingabe unsichtbar): ').strip()
        transport = Transport(token)
        results = []
        for rel, _ in files:
            try:
                result = send_one(args.root, rel, transport)
                print(result['status'] + ': ' + rel)
                results.append(result)
            except (BridgeError, OSError) as e:
                # Stop on first failed file; running again safely skips confirmed files.
                results.append({'server_path': rel, 'status': 'Fehler', 'error': str(e) if isinstance(e, BridgeError) else type(e).__name__})
                print('Fehler:', results[-1]['error'])
                break
        if args.report:
            args.report.write_text(json.dumps({'finishedAt': datetime.now(timezone.utc).isoformat(), 'sourceRoot': str(args.root), 'selected': len(files), 'files': results}, ensure_ascii=False, indent=2), encoding='utf-8')
        return 1 if any(r['status'] == 'Fehler' for r in results) else 0
    except (BridgeError, OSError) as e:
        print('Abbruch:', str(e) if isinstance(e, BridgeError) else type(e).__name__, file=sys.stderr)
        return 1


if __name__ == '__main__':
    if sys.version_info < (3, 10):
        sys.exit('Python 3.10 oder neuer erforderlich.')
    sys.exit(main())
