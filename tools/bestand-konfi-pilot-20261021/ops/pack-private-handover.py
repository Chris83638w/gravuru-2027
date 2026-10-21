"""Pack only the completed, checked 2026-10-21 private handover. No live reads.

Linux/Python 3.11+, existing app owner only. No SQLite, app, network, config,
credential, subprocess or service imports. All paths and members are fixed.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

BASE = Path('/var/www/vhosts/gravuru-designwerkstatt.de/private')
UID = 10005
DESTINATION = 'gravuru-handover-20261021/gravuru-private-handover-20261021.zip'
RECEIPT = 'gravuru-handover-20261021/PACKING-RECEIPT.json'
DATABASES = ('workshop.sqlite', 'profiles.sqlite', 'design-assets.sqlite')
SOURCE_BYTES = 28980925
SOURCE_SHA = '57bff9f9dd1c978718e0687241fb9c43b16703cc91bd040db72d83ee3fa10460'
SOURCE_COMMIT = 'd18bc6cb8fdbe9e69008d9be18b2b74ce72365eb'
ASSETS_SHA = '3fa677fcc380b65d9636c79f31c7c555d9268923ab4b72c4165314b7640b779a'
SHA = re.compile(r'^[a-f0-9]{64}$')
CHUNK = 1024 * 1024
INPUTS = (
    *((f'gravuru-snapshot-20261021/{name}', f'data/{name}', 2 * 1024**3) for name in DATABASES),
    ('gravuru-snapshot-20261021/SNAPSHOT.json', 'evidence/SNAPSHOT.json', CHUNK),
    ('gravuru-restorecheck-20261021/RESTORE-CHECK.json', 'evidence/RESTORE-CHECK.json', CHUNK),
    ('gravuru-merchant-release-d18bc6c/quellsicherung-d18bc6c-20261021.zip', 'source/quellsicherung-d18bc6c-20261021.zip', SOURCE_BYTES),
    ('gravuru-source-restore-receipt-20261021.json', 'evidence/SOURCE-RESTORE-CHECK.json', CHUNK),
    *((f'gravuru-handover-20261021/context/{name}', f'context/{name}', CHUNK)
      for name in ('storage-marker.json', 'start-r5.cjs', 'app.cjs')),
)
EXCLUDED = [
    'Live data directory and running databases; WAL/SHM/journals/runtime lock',
    'Merchant configuration, client secrets, access tokens, signing keys and other credentials',
    'Unlisted files, old backups, runtime environments, caches and logs',
    'The separate restored database copies (the original verified snapshot is included once)',
    'Unmapped legacy workshop inventory: historical 171 designs and seven plate templates are not attested',
]
LIMITATIONS = [
    'Database restore and known source-file restore passed; a full application restart from this package is NOT proven.',
    'No native geometry recalculation, physical mounting check, live checkout or production approval is implied.',
    'Configuration/credentials and runtime prerequisites require a separate secure handover.',
    'Snapshot statuses and all included source bytes are preserved; no design is reactivated.',
    'This ZIP contains private data and is NOT encrypted. Never place it in GitHub, a release or a public webroot.',
]


class Refused(Exception):
    pass


def require(condition, code):
    if not condition:
        raise Refused(code)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode('utf-8')


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, 'duplicate_json_key')
        result[key] = value
    return result


def parse_json(value):
    def invalid_constant(_):
        raise Refused('invalid_json_constant')
    try:
        result = json.loads(value.decode('utf-8'), object_pairs_hook=unique_object, parse_constant=invalid_constant)
        require(isinstance(result, dict), 'json_object_required')
        return result
    except (UnicodeError, ValueError):
        raise Refused('invalid_json') from None


def fingerprint(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns,
            info.st_uid, info.st_mode, info.st_nlink)


class PrivateRoot:
    def __init__(self):
        require(os.name == 'posix' and hasattr(os, 'O_NOFOLLOW') and os.geteuid() == UID,
                'linux_existing_app_owner_required')
        require(BASE.is_absolute() and BASE.resolve(strict=True) == BASE, 'canonical_private_root_required')
        self.fd = os.open(BASE, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        info = os.fstat(self.fd)
        require(info.st_uid == UID and stat.S_ISDIR(info.st_mode) and not info.st_mode & 0o077,
                'private_root_owner_permissions')

    def close(self):
        os.close(self.fd)

    def directory(self, relative):
        parts = relative.split('/') if relative else []
        require(all(p and p not in ('.', '..') for p in parts), 'fixed_relative_path_required')
        fd = os.dup(self.fd)
        try:
            for part in parts:
                next_fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
                os.close(fd)
                fd = next_fd
                info = os.fstat(fd)
                require(info.st_uid == UID and not info.st_mode & 0o022, 'directory_owner_permissions')
            return fd
        except BaseException:
            os.close(fd)
            raise

    def names(self, relative):
        fd = self.directory(relative)
        try:
            return set(os.listdir(fd))
        finally:
            os.close(fd)

    def open_input(self, relative, limit):
        parent, _, name = relative.rpartition('/')
        fd = self.directory(parent)
        try:
            result = os.open(name, os.O_RDONLY | os.O_NOFOLLOW, dir_fd=fd)
        finally:
            os.close(fd)
        try:
            info = os.fstat(result)
            require(stat.S_ISREG(info.st_mode) and info.st_uid == UID and info.st_nlink == 1
                    and not info.st_mode & 0o022 and 0 < info.st_size <= limit, 'input_owner_type_size')
            return result, info
        except BaseException:
            os.close(result)
            raise

    def absent(self, relative):
        parent, _, name = relative.rpartition('/')
        fd = self.directory(parent)
        try:
            try:
                os.stat(name, dir_fd=fd, follow_symlinks=False)
            except FileNotFoundError:
                return
            raise Refused('new_exclusive_output_required')
        finally:
            os.close(fd)

    def create(self, relative):
        parent, _, name = relative.rpartition('/')
        directory_fd = self.directory(parent)
        try:
            fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=directory_fd)
            info = os.fstat(fd)
            require(info.st_uid == UID and info.st_nlink == 1 and stat.S_IMODE(info.st_mode) == 0o600,
                    'output_owner_permissions')
            return fd
        finally:
            os.close(directory_fd)

    def sync_destination_directory(self):
        fd = self.directory('gravuru-handover-20261021')
        try:
            os.fsync(fd)
        finally:
            os.close(fd)


def read_small(entry):
    os.lseek(entry['fd'], 0, os.SEEK_SET)
    value = os.read(entry['fd'], entry['info'].st_size + 1)
    require(len(value) == entry['info'].st_size, 'input_changed')
    require(fingerprint(os.fstat(entry['fd'])) == fingerprint(entry['info']), 'input_changed')
    return value


def database_receipts(receipt, kind):
    entries = receipt.get('databases')
    require(isinstance(entries, list) and len(entries) == 3 and all(isinstance(r, dict) for r in entries), 'three_database_receipts_required')
    require({r.get('file') for r in entries} == set(DATABASES), 'database_allowlist_mismatch')
    result = {}
    for row in entries:
        require(type(row.get('bytes')) is int and 0 < row['bytes'] <= 2 * 1024**3
                and isinstance(row.get('sha256'), str) and SHA.fullmatch(row['sha256']), 'invalid_database_receipt')
        if kind == 'snapshot':
            require(row.get('quickCheck') == 'ok', 'snapshot_quickcheck_failed')
        else:
            require(row.get('integrityCheck') == 'ok' and row.get('foreignKeys') == 'ok', 'restore_integrity_failed')
        result[row['file']] = {'bytes': row['bytes'], 'sha256': row['sha256']}
    return result


def validate_evidence(snapshot, report, source):
    require(snapshot.get('schema') == 'gravuru-merchant-private-snapshot/v1'
            and snapshot.get('runtimeLockHeld') is True and snapshot.get('privateDataChanged') is False,
            'completed_offline_snapshot_required')
    require(report.get('schema') == 'gravuru-private-restore-check/v1'
            and all(report.get(k) is True for k in ('databaseRestorePassed', 'sourceFilesUnchanged', 'allDatabaseBytesPreserved'))
            and all(report.get(k) is False for k in ('runtimeStarted', 'migrationsRun', 'externalNetwork', 'completeApplicationRestoreProven')),
            'successful_limited_restore_required')
    relations = report.get('relations')
    require(isinstance(relations, dict) and relations.get('valid') is True and relations.get('issues') == {}, 'restore_relations_failed')
    expected = database_receipts(snapshot, 'snapshot')
    require(expected == database_receipts(report, 'restore'), 'snapshot_restore_hash_mismatch')
    require(expected['design-assets.sqlite']['sha256'] == ASSETS_SHA, 'observed_assets_hash_mismatch')
    require(source.get('schema') == 'gravuru-source-restore-check/v1'
            and source.get('sourceCommit') == SOURCE_COMMIT and type(source.get('verifiedFiles')) is int
            and source['verifiedFiles'] == 436 and type(source.get('archiveBytes')) is int
            and source['archiveBytes'] == SOURCE_BYTES and source.get('archiveSha256') == SOURCE_SHA
            and source.get('restoreDirectory') == str(BASE / 'gravuru-source-restore-check-20261021')
            and source.get('databaseRestored') is False and source.get('runtimeStarted') is False,
            'successful_source_receipt_required')
    return expected


def zip_info(name):
    info = zipfile.ZipInfo(name, date_time=(2026, 10, 21, 0, 0, 0))
    info.create_system = 3
    info.external_attr = (stat.S_IFREG | 0o600) << 16
    info.compress_type = zipfile.ZIP_STORED
    return info


README = '''GRAVURU – PRIVATE ÜBERGABE VOM 21.10.2026

Dieses Paket enthält private Werkstatt- und möglicherweise Kundendaten. Es ist
nicht verschlüsselt. Ausschließlich über einen bestätigten privaten, geschützten
Übertragungsweg senden; niemals GitHub, Release, öffentlichen Link oder Webroot.

Enthalten: drei vollständige, bereits mit SQLite Backup gesicherte Datenbanken,
Snapshotbeleg, bestandener getrennter DB-Restorebericht, byteidentische aktive
Quellsicherung mit 436 geprüften Dateien, Quell-Restorebeleg und drei separat
gesicherte Start-/Speicherkontextdateien. Die DBs werden nur einmal beigefügt.
Material-/Motivoriginale und Revisionen sind in den DBs enthalten, soweit sie zum
gesicherten aktuellen Merchant-Bestand gehören. Alle Bytes und Status bleiben
unverändert; abgelehnte Designs werden nicht reaktiviert.

Nicht enthalten: laufende DBs, Journale/Lock, private Konfiguration, Tokens,
Schlüssel, weitere Geheimnisse, installierte Node-/Python-Umgebungen und nicht
zugeordnete ältere Werkstattbestände. Die historischen 171 Designs und sieben
Plattenvorlagen sind noch nicht vollständig diesem Bestand zugeordnet.

Übernahme durch „Gravuru Neustart 1“:
1. ZIP und PACKING-RECEIPT.json sicher privat übertragen. SHA-256 und Größe der
   ZIP gegen den separat übermittelten Beleg vergleichen. Der Beleg schützt nur
   bei vertrauenswürdigem Übertragungsweg; er ist keine digitale Signatur.
2. Inhaltsliste prüfen, ausschließlich in einen neuen privaten Testordner
   entpacken. Keine vorhandene Anwendung/DB überschreiben. ZIP-Pfadtraversal und
   Symlinks beim Entpacken verbieten. Die Quellsicherung ist eine innere ZIP.
3. Jeden entpackten Eintrag mit MANIFEST.json abgleichen; dessen eigener Hash
   steht im separaten PACKING-RECEIPT.json. Innere Source-ZIP ebenfalls gegen
   ihren festgehaltenen Hash prüfen, dann getrennt und sicher entpacken.
4. Passenden Release d18bc6cb8fdbe9e69008d9be18b2b74ce72365eb und Voraussetzungen
   anhand Quellmanifest einrichten. Die drei data/*.sqlite zusammen in ein neues
   privates Datenverzeichnis übernehmen. SQLite-Prüfungen dort erneut ausführen.
5. context/storage-marker.json ist die Kopie des Merchant-Speichermarkers; am
   Ziel gehört sie unter den originalen Namen .gravuru-shopify-merchant-test.json.
   Die Startdateien enthalten bestehende Pfadverweise: zuerst lesen und nur in
   Testkopien auf die Zielpfade anpassen. Nicht ungeprüft ausführen.
6. Konfiguration und benötigte Geheimnisse separat über den vorhandenen sicheren
   Weg übergeben. Zugangsdaten gehören nicht nachträglich in dieses Paket.
7. Einen späteren Teststart vollständig von echtem Shopify, Webhooks, Warenkorb,
   KI-Diensten und Produktion trennen. Erst nach Abgleich aller Voraussetzungen
   starten. Dieses Paket selbst startet keinen Dienst und führt keine Migration aus.

Prüfgrenzen: DB-Restore und unterstützte Beziehungen waren erfolgreich; das ist
kein vollständiger Anwendungsstart aus dem Backup. Es gibt keinen Nachweis einer
erneuten mm-Geometrieberechnung, mechanischen Fertigungsfreigabe oder erfolgreichen
Kunden-/Checkoutstrecke. Source-Restore und DB-Restore sind getrennte Nachweise.
Das Paket ist ein unveränderter Stand, keine automatische Synchronisierung.

MANIFEST.json enthält Größen/Hashes aller Eingaben und dieser README, jedoch
nicht seinen eigenen Hash. PACKING-RECEIPT.json enthält zusätzlich den Manifest-
Hash, alle zwölf Paketmitglieder, ZIP-Größe und SHA-256. Der Pakethelfer prüft
jedes ZIP-Mitglied nach dem Schreiben erneut mit SHA-256 und ZIP-CRC.
'''.encode('utf-8')


def pack():
    os.umask(0o077)
    root = PrivateRoot()
    opened = []
    try:
        require(root.names('gravuru-snapshot-20261021') == {'SNAPSHOT.json', *DATABASES}, 'snapshot_extra_files_refused')
        require(root.names('gravuru-handover-20261021/context') == {'storage-marker.json', 'start-r5.cjs', 'app.cjs'}, 'context_extra_files_refused')
        root.absent(DESTINATION)
        root.absent(RECEIPT)
        for source, member, limit in INPUTS:
            fd, info = root.open_input(source, limit)
            opened.append({'source': source, 'member': member, 'fd': fd, 'info': info})
        by_member = {entry['member']: entry for entry in opened}
        for member in ('evidence/SNAPSHOT.json', 'evidence/RESTORE-CHECK.json', 'evidence/SOURCE-RESTORE-CHECK.json'):
            by_member[member]['evidence'] = read_small(by_member[member])
        expected = validate_evidence(*(parse_json(by_member[m]['evidence']) for m in (
            'evidence/SNAPSHOT.json', 'evidence/RESTORE-CHECK.json', 'evidence/SOURCE-RESTORE-CHECK.json')))
        for name in DATABASES:
            by_member['data/' + name]['expected'] = expected[name]
        by_member['source/quellsicherung-d18bc6c-20261021.zip']['expected'] = {'bytes': SOURCE_BYTES, 'sha256': SOURCE_SHA}
        for entry in opened:
            if 'evidence' in entry:
                entry['expected'] = {'bytes': len(entry['evidence']), 'sha256': hashlib.sha256(entry['evidence']).hexdigest()}
        disk = os.fstatvfs(root.fd)
        required = sum(entry['info'].st_size for entry in opened) + 32 * CHUNK
        require(disk.f_bavail * disk.f_frsize >= required, 'insufficient_private_free_space')
        records = []
        archive_fd = root.create(DESTINATION)
        with os.fdopen(archive_fd, 'w+b') as archive:
            with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as result:
                for entry in opened:
                    os.lseek(entry['fd'], 0, os.SEEK_SET)
                    digest, size = hashlib.sha256(), 0
                    with result.open(zip_info(entry['member']), 'w', force_zip64=True) as target:
                        while True:
                            value = os.read(entry['fd'], CHUNK)
                            if not value:
                                break
                            size += len(value)
                            require(size <= entry['info'].st_size, 'input_changed')
                            digest.update(value)
                            target.write(value)
                    actual = {'bytes': size, 'sha256': digest.hexdigest()}
                    require(size == entry['info'].st_size and fingerprint(os.fstat(entry['fd'])) == fingerprint(entry['info']), 'input_changed')
                    require('expected' not in entry or entry['expected'] == actual, 'input_hash_mismatch')
                    records.append({'member': entry['member'], 'sourceRelative': entry['source'], **actual})
                result.writestr(zip_info('README-DE.txt'), README)
                records.append({'member': 'README-DE.txt', 'generated': True, 'bytes': len(README), 'sha256': hashlib.sha256(README).hexdigest()})
                manifest = json_bytes({'schema': 'gravuru-private-handover/v1', 'date': '2026-10-21',
                    'sourceCommit': SOURCE_COMMIT, 'inputBytesPreserved': True, 'privateData': True,
                    'encrypted': False, 'fullApplicationRestoreProven': False,
                    'files': records, 'excluded': EXCLUDED, 'limitations': LIMITATIONS,
                    'manifestSelfHashLocation': 'separate PACKING-RECEIPT.json'})
                result.writestr(zip_info('MANIFEST.json'), manifest)
                records.append({'member': 'MANIFEST.json', 'generated': True, 'bytes': len(manifest), 'sha256': hashlib.sha256(manifest).hexdigest()})
            archive.flush()
            os.fsync(archive.fileno())
            archive.seek(0)
            with zipfile.ZipFile(archive, 'r') as result:
                require(result.namelist() == [r['member'] for r in records], 'zip_member_allowlist_failed')
                for row in records:
                    info = result.getinfo(row['member'])
                    require(info.file_size == row['bytes'] and not info.flag_bits & 1
                            and info.compress_type == zipfile.ZIP_STORED
                            and stat.S_IMODE(info.external_attr >> 16) == 0o600, 'zip_member_metadata_failed')
                    digest, size = hashlib.sha256(), 0
                    # Reading to EOF invokes ZipFile's CRC verification as well.
                    with result.open(info, 'r') as item:
                        while True:
                            value = item.read(CHUNK)
                            if not value:
                                break
                            digest.update(value)
                            size += len(value)
                    require(size == row['bytes'] and digest.hexdigest() == row['sha256'], 'zip_member_hash_failed')
            archive.seek(0)
            digest, size = hashlib.sha256(), 0
            while True:
                value = archive.read(CHUNK)
                if not value:
                    break
                digest.update(value)
                size += len(value)
            require(size == os.fstat(archive.fileno()).st_size, 'archive_changed')
            for entry in opened:
                require(fingerprint(os.fstat(entry['fd'])) == fingerprint(entry['info']), 'input_changed')
            result_summary = {'bytes': size, 'sha256': digest.hexdigest(), 'members': len(records)}
            receipt = json_bytes({'schema': 'gravuru-private-handover-packing-receipt/v1',
                'file': DESTINATION.rsplit('/', 1)[1], **result_summary, 'mode': '0600',
                'allMemberSha256Verified': True, 'allMemberCrcVerified': True,
                'inputBytesPreserved': True, 'files': records, 'liveDataRead': False,
                'credentialsRead': False, 'runtimeStarted': False, 'fullApplicationRestoreProven': False})
            with os.fdopen(root.create(RECEIPT), 'wb') as evidence:
                evidence.write(receipt)
                evidence.flush()
                os.fsync(evidence.fileno())
        root.sync_destination_directory()
        return result_summary
    finally:
        for entry in opened:
            os.close(entry['fd'])
        root.close()


def main():
    try:
        require(sys.argv[1:] == ['--create'], 'explicit_create_argument_required')
        print(json.dumps(pack(), separators=(',', ':')))
        return 0
    except Exception as error:
        code = str(error) if isinstance(error, Refused) and re.fullmatch(r'[a-z_]+', str(error)) else 'packing_failed'
        print(json.dumps({'ok': False, 'code': code}, separators=(',', ':')))
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
