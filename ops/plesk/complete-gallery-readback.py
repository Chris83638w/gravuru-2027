"""Read back the activated private site 19; never write approval/shop data."""
import argparse
import base64
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import hmac
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import sqlite3
import ssl
import stat
import time
import urllib.error
import urllib.request

ROOT = Path('/var/www/vhosts/gravuru-designwerkstatt.de')
STAGE = ROOT / 'private/complete-gallery-20261107-v1'
DATA = ROOT / 'private/gesamtbestand-stage-0bb50565-20261106-v1/data'
ORIGIN = 'https://test-2027.gravuru-designwerkstatt.de'
EXPECTED_UID = 10005
EXPECTED_APPROVALS = 109
EXPECTED_ORIGINALS = 19661
MAX_RESPONSE = 32 * 1024**2


class ReadbackError(Exception):
    pass


def require(value, code):
    if not value:
        raise ReadbackError(code)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def checked(file, directory=False):
    require(file.is_absolute() and file.resolve() == file, 'noncanonical_private_path')
    require(all(not p.is_symlink() and not (p / '.git').exists() for p in (file, *file.parents)), 'linked_private_path')
    info = file.stat()
    require(info.st_uid == EXPECTED_UID and not info.st_mode & 0o077, 'private_ownership_or_permissions')
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode), 'private_regular_path_required')
    return file


def file_bytes(file, limit=128 * 1024**2):
    checked(file)
    require(file.stat().st_size <= limit, 'private_input_too_large')
    return file.read_bytes()


def file_json(file, limit=128 * 1024**2):
    return json.loads(file_bytes(file, limit).decode('utf-8'))


def scan_gallery(stream, selected_ids, chunk_size=65536):
    """Decode one original at a time, including compact single-line manifests."""
    buffer = ''; position = 0; eof = False; decoder = json.JSONDecoder()

    def fill():
        nonlocal buffer, position, eof
        chunk = stream.read(chunk_size)
        buffer = buffer[position:] + chunk; position = 0; eof = not chunk

    def peek():
        nonlocal position
        while True:
            while position < len(buffer) and buffer[position].isspace():
                position += 1
            if position < len(buffer):
                return buffer[position]
            if eof:
                return None
            fill()

    def take(character):
        nonlocal position
        require(peek() == character, 'gallery_manifest_invalid')
        position += 1

    def value():
        nonlocal position
        require(peek() is not None, 'gallery_manifest_invalid')
        while True:
            try:
                result, end = decoder.raw_decode(buffer, position)
                if end < len(buffer) or eof:
                    position = end
                    return result
            except json.JSONDecodeError:
                require(not eof, 'gallery_manifest_invalid')
            require(len(buffer) - position < 32 * 1024**2, 'gallery_metadata_item_too_large')
            fill()

    take('{'); fields = set(); ids = set(); selected = {}
    while peek() != '}':
        name = value()
        require(isinstance(name, str) and name not in fields, 'gallery_manifest_duplicate_field')
        fields.add(name); take(':')
        if name == 'originals':
            take('[')
            while peek() != ']':
                original = value(); original_id = original.get('id') if isinstance(original, dict) else None
                require(isinstance(original_id, str) and original_id and original_id not in ids, 'gallery_original_identity_invalid')
                ids.add(original_id)
                if original_id in selected_ids:
                    selected[original_id] = original.get('reviewSourcePreview')
                if peek() == ']':
                    break
                take(','); require(peek() != ']', 'gallery_manifest_invalid')
            take(']')
        else:
            value()
        if peek() == '}':
            break
        take(','); require(peek() != '}', 'gallery_manifest_invalid')
    take('}'); require(peek() is None and 'originals' in fields, 'gallery_manifest_invalid')
    return len(ids), selected


def gallery_inventory(proof, selected_ids):
    file = checked(STAGE / 'gallery/manifest.json')
    require(file.stat().st_size <= 512 * 1024**2, 'gallery_manifest_too_large')
    digest = hashlib.sha256()
    with file.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024**2), b''):
            digest.update(chunk)
    require(digest.hexdigest() == proof.get('galleryManifestSha256'), 'gallery_manifest_changed')
    with file.open('r', encoding='utf-8') as stream:
        return scan_gallery(stream, selected_ids)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PrivateClient:
    def __init__(self, username, password):
        self.authorization = 'Basic ' + base64.b64encode((username + ':' + password).encode('utf-8')).decode('ascii')
        message = json.dumps(['gravuru-private-slate-review-csrf/v1', ORIGIN, username], ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        self.csrf = hmac.new(password.encode('utf-8'), message, hashlib.sha256).hexdigest()
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl.create_default_context()), NoRedirect())
        self.evidence = []

    def request(self, route, *, body=None, authenticated=True):
        method = 'POST' if body is not None else 'GET'
        allowed = route in ('/__test/health', '/originale/') and method == 'GET' or route == '/originale/approvals?action=read' and method == 'POST' or bool(re.fullmatch(r'/originale/files/originals/_source-previews/[a-f0-9]{24}\.png', route)) and method == 'GET'
        require(allowed and (authenticated or route == '/__test/health'), 'request_outside_readback_scope')
        headers = {'Accept': '*/*', 'Cache-Control': 'no-store', 'User-Agent': 'Gravuru-Private-Readback/1'}
        if authenticated:
            headers['Authorization'] = self.authorization
        raw = None
        if body is not None:
            raw = json.dumps(body, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
            require(len(raw) <= 65536, 'read_scope_too_large')
            headers.update({'Content-Type': 'application/json', 'Origin': ORIGIN, 'X-Slate-Review-CSRF': self.csrf})
        request = urllib.request.Request(ORIGIN + route, data=raw, headers=headers, method=method)
        start = time.monotonic()
        try:
            response = self.opener.open(request, timeout=90)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status = response.code
            require(not 300 <= status < 400, 'redirect_rejected')
            payload = response.read(MAX_RESPONSE + 1)
            require(len(payload) <= MAX_RESPONSE, 'response_too_large')
            mime = response.headers.get_content_type()
        self.evidence.append({'path': route, 'method': method, 'authenticated': authenticated, 'status': status, 'mime': mime, 'bytes': len(payload), 'sha256': sha(payload), 'elapsedMs': round((time.monotonic() - start) * 1000)})
        return status, mime, payload


class GalleryPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = 0
        self.assignments = False
        self.page_data = []; self.capture_page_data = False; self.page_data_count = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.cards += int('data-design-card' in values)
        self.assignments |= 'data-assignment-open' in values
        if tag == 'script' and values.get('id') == 'review-page-data' and values.get('type') == 'application/json':
            self.capture_page_data = True; self.page_data_count += 1

    def handle_data(self, data):
        if self.capture_page_data:
            self.page_data.append(data)

    def handle_endtag(self, tag):
        if tag == 'script':
            self.capture_page_data = False

    def totals(self):
        require(self.page_data_count == 1, 'gallery_pagination_metadata_missing')
        page = json.loads(''.join(self.page_data))
        require(page.get('totalOriginals') == page.get('totalMatches') == page.get('matchingOriginals') == EXPECTED_ORIGINALS, 'gallery_total_originals_differs')
        require(page.get('page') == 1 and page.get('pageSize') == 60 and page.get('pages') == (EXPECTED_ORIGINALS + 59) // 60 and self.cards == min(60, EXPECTED_ORIGINALS), 'gallery_pagination_differs')
        filters = page.get('filters', {})
        require(filters.get('view') == 'designs' and all(not value for key, value in filters.items() if key != 'view'), 'gallery_initial_filter_unexpected')
        return page['totalOriginals']


def load_context(backup=None):
    require(os.getuid() == EXPECTED_UID, 'private_site_account_required')
    checked(STAGE, directory=True)
    marker = file_json(STAGE / 'ACTIVATED.json', 1024**2)
    require(marker.get('schema') == 'gravuru-complete-gallery-activated/v1' and marker.get('siteId') == 19 and marker.get('mappingActivated') is True and marker.get('shopifyWrites') == 0, 'activation_marker_required')
    receipt_path = Path(marker.get('receipt', ''))
    require(receipt_path.name == 'ACTIVATION-RECEIPT.json' and receipt_path.parent.parent == STAGE and bool(re.fullmatch(r'activation-backup-[A-Za-z0-9_-]+', receipt_path.parent.name)), 'activation_receipt_path')
    require(backup is None or backup == receipt_path.parent, 'backup_does_not_match_activation')
    backup = checked(receipt_path.parent, directory=True)
    receipt_raw = file_bytes(receipt_path, 1024**2)
    require(sha(receipt_raw) == marker.get('receiptSha256'), 'activation_receipt_changed')
    receipt = json.loads(receipt_raw)
    proof_raw = file_bytes(STAGE / 'STAGE-READY.json', 1024**2)
    require(sha(proof_raw) == marker.get('stageProofSha256') == receipt.get('stageProofSha256'), 'activated_stage_proof_changed')
    proof = json.loads(proof_raw)
    require(receipt.get('schema') == 'gravuru-complete-gallery-activation/v1' and receipt.get('siteId') == 19 and receipt.get('sameData') is True and receipt.get('data') == str(DATA) and receipt.get('mappingActivated') is True and receipt.get('shopifyWrites') == 0, 'private_activation_receipt_required')
    require(proof.get('sourceCommit') == marker.get('sourceCommit') == receipt.get('sourceCommit') and bool(re.fullmatch('[a-f0-9]{40}', proof.get('sourceCommit', ''))), 'activation_commit_differs')
    require(sha(file_bytes(DATA / 'local-review-import.json')) == marker.get('mappingSha256') == receipt.get('mappingSha256') == proof.get('mappingSha256'), 'activated_mapping_changed')
    config_raw = file_bytes(STAGE / 'config.json', 16384)
    require(sha(config_raw) == proof.get('configSha256'), 'private_config_changed')
    config = json.loads(config_raw)
    require(config.get('schema') == 1 and config.get('purpose') == 'private-test-runtime', 'private_config_required')
    values = config.get('values', {})
    require(values.get('GRAVURU_TEST_ORIGIN') == ORIGIN and values.get('GRAVURU_PRIVATE_DATA_DIR') == str(DATA) and values.get('GRAVURU_SLATE_REVIEW_PACKAGE') == str(STAGE / 'gallery'), 'private_origin_or_data_differs')
    username, password = values.get('GRAVURU_TEST_USERNAME', ''), values.get('GRAVURU_TEST_PASSWORD', '')
    require(isinstance(username, str) and bool(re.fullmatch(r'[A-Za-z0-9._-]{1,64}', username)) and isinstance(password, str) and bool(re.fullmatch(r'[\x20-\x7e]{24,200}', password)), 'private_credentials_invalid')
    approval_path = backup / 'review-approvals.sqlite'
    evidence = [row for row in receipt.get('sqliteBackups', []) if row.get('file') == approval_path.name]
    approval_raw = file_bytes(approval_path)
    require(len(evidence) == 1 and evidence[0].get('sha256') == sha(approval_raw) and evidence[0].get('bytes') == len(approval_raw), 'approval_backup_changed')
    with closing(sqlite3.connect(approval_path.as_uri() + '?mode=ro&immutable=1', uri=True)) as db:
        rows = db.execute('SELECT e.target_key,e.revision,e.fingerprint,e.metadata FROM design_review_approval_events e JOIN (SELECT target_key,MAX(revision) AS revision FROM design_review_approval_events GROUP BY target_key) h ON h.target_key=e.target_key AND h.revision=e.revision WHERE e.approved=1 ORDER BY e.target_key').fetchall()
    require(len(rows) == EXPECTED_APPROVALS, 'expected_109_approved_targets')
    approvals = []
    for key, revision, fingerprint, metadata_raw in rows:
        identity = json.loads(key); metadata = json.loads(metadata_raw)
        require(isinstance(identity, list) and len(identity) == 3 and all(isinstance(v, str) and v for v in identity) and metadata.get('id') == identity[1] and type(revision) is int and revision > 0 and bool(re.fullmatch('[a-f0-9]{64}', fingerprint or '')), 'invalid_backup_approval')
        approvals.append({'key': key, 'originalId': identity[1], 'revision': revision, 'fingerprint': fingerprint})
    return {'username': username, 'password': password, 'proof': proof, 'backup': backup, 'approvals': approvals, 'evidence': {'stageProofSha256': sha(proof_raw), 'mappingSha256': marker['mappingSha256'], 'approvalBackupSha256': sha(approval_raw), 'sourceCommit': proof['sourceCommit']}}


def preview_examples(proof):
    supplement = proof.get('supplementProof', {})
    archive_hash = supplement.get('archiveSha256', '')
    require(bool(re.fullmatch('[a-f0-9]{64}', archive_hash)), 'preview_supplement_required')
    folder = STAGE / ('preview-supplement-' + archive_hash[:16])
    require(supplement.get('file') == str(folder / 'SUPPLEMENT-READY.json'), 'preview_supplement_path')
    require(sha(file_bytes(folder / 'SUPPLEMENT-READY.json')) == supplement.get('sha256'), 'preview_supplement_report_changed')
    raw = file_bytes(folder / 'supplement-manifest.json')
    require(sha(raw) == supplement.get('manifestSha256'), 'preview_supplement_manifest_changed')
    delivery = json.loads(raw)
    require(delivery.get('schema') == 'gravuru-source-preview-supplement/v1', 'preview_supplement_schema')
    examples = [row for row in delivery.get('rows', []) if isinstance(row.get('preview'), str) and re.fullmatch(r'originals/_source-previews/[a-f0-9]{24}\.png', row['preview'])][:3]
    require(len(examples) == 3 and len({row['originalId'] for row in examples}) == 3, 'three_png_preview_examples_required')
    total, originals = gallery_inventory(proof, {row['originalId'] for row in examples})
    require(total == EXPECTED_ORIGINALS, 'gallery_manifest_total_differs')
    for row in examples:
        require(originals.get(row['originalId']) == row['preview'], 'preview_original_mapping_changed')
        raw = file_bytes(STAGE / 'gallery' / row['preview'], MAX_RESPONSE)
        require(sha(raw) == row.get('sha256') and len(raw) == row.get('bytes') and raw.startswith(b'\x89PNG\r\n\x1a\n'), 'preview_local_bytes_changed')
    return examples


def run(backup=None):
    started = time.monotonic()
    os.umask(0o077)
    checked(STAGE, directory=True)
    output = STAGE / 'ONLINE-READBACK.json'
    require(not output.exists() and not output.is_symlink(), 'readback_report_already_exists')
    report = {'schema': 'gravuru-complete-gallery-online-readback/v1', 'createdAtUtc': datetime.now(timezone.utc).isoformat(), 'siteId': 19, 'origin': ORIGIN, 'ready': False, 'approvalWrites': 0, 'shopifyWrites': 0, 'counts': {'galleryCards': 0, 'galleryOriginalsExpected': EXPECTED_ORIGINALS, 'galleryOriginalsOnline': 0, 'galleryOriginalsManifest': 0, 'approvedExpected': EXPECTED_APPROVALS, 'approvedVerified': 0, 'previewExamplesVerified': 0}, 'requests': []}
    try:
        context = load_context(backup)
        report['sourceEvidence'] = context['evidence']; report['backup'] = str(context['backup'])
        client = PrivateClient(context['username'], context['password']); report['requests'] = client.evidence
        require(client.request('/__test/health', authenticated=False)[0] == 401, 'anonymous_health_not_protected')
        status, mime, raw = client.request('/__test/health')
        require(status == 200 and mime == 'application/json', 'authenticated_health_failed')
        health = json.loads(raw)
        require(health.get('ready') is True and health.get('scope') == 'private-operator-test' and health.get('shopifyConnected') is False, 'private_health_scope_differs')
        status, mime, raw = client.request('/originale/')
        require(status == 200 and mime == 'text/html', 'gallery_page_failed')
        page = GalleryPage(); page.feed(raw.decode('utf-8'))
        require(0 < page.cards <= 60 and page.assignments, 'gallery_page_scope_or_family_button_missing')
        report['counts']['galleryCards'] = page.cards
        report['counts']['galleryOriginalsOnline'] = page.totals()
        for start in range(0, len(context['approvals']), 60):
            selected = context['approvals'][start:start + 60]
            scope = {'originalIds': list(dict.fromkeys(row['originalId'] for row in selected)), 'targetKeys': [row['key'] for row in selected]}
            status, mime, raw = client.request('/originale/approvals?action=read', body=scope)
            require(status == 200 and mime == 'application/json', 'approval_read_failed')
            current = json.loads(raw).get('approvals', {})
            for expected in selected:
                state = current.get(expected['key'], {})
                require(state.get('key') == expected['key'] and state.get('approved') is True and state.get('status') == 'approved' and state.get('fingerprint') == state.get('approvedFingerprint') == expected['fingerprint'] and state.get('revision') == expected['revision'] and state.get('metadata', {}).get('id') == expected['originalId'], 'existing_approval_no_longer_identical')
                report['counts']['approvedVerified'] += 1
        report['previewExamples'] = []
        examples = preview_examples(context['proof'])
        report['counts']['galleryOriginalsManifest'] = EXPECTED_ORIGINALS
        for row in examples:
            status, mime, raw = client.request('/originale/files/' + row['preview'])
            require(status == 200 and mime == 'image/png' and len(raw) == row['bytes'] and sha(raw) == row['sha256'], 'preview_http_bytes_differ')
            report['previewExamples'].append({'originalId': row['originalId'], 'path': row['preview'], 'bytes': len(raw), 'sha256': sha(raw), 'mime': mime})
            report['counts']['previewExamplesVerified'] += 1
        report['ready'] = True
    except Exception as error:
        # urllib errors may contain request details. Never log raw exceptions,
        # response bodies, headers, credentials or configuration values.
        report['error'] = str(error) if isinstance(error, ReadbackError) else 'readback_transport_or_input_failed'
    report['elapsedMs'] = round((time.monotonic() - started) * 1000)
    raw = (json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw); stream.flush(); os.fsync(stream.fileno())
    return {'ready': report['ready'], 'counts': report['counts'], 'report': str(output), 'sha256': sha(raw), 'elapsedMs': report['elapsedMs']}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backup', type=Path)
    try:
        summary = run(parser.parse_args().backup)
        print(json.dumps(summary)); raise SystemExit(0 if summary['ready'] else 1)
    except Exception:
        raise SystemExit('Private readback stopped; no credentials or response bodies logged.')
