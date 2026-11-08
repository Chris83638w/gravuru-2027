import base64
from contextlib import closing
from email.message import Message
import hashlib
import hmac
import importlib.util
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('readback', Path(__file__).with_name('complete-gallery-readback.py'))
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)


class ReadbackTests(unittest.TestCase):
    def setUp(self):
        os.umask(0o077)
        self.temp = tempfile.TemporaryDirectory(prefix='private-readback-'); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.stage = self.root / 'private/complete-gallery-20261107-v1'; self.data = self.root / 'private/old/data'
        for name, value in [('ROOT', self.root), ('STAGE', self.stage), ('DATA', self.data), ('EXPECTED_UID', os.getuid()), ('EXPECTED_ORIGINALS', 3)]:
            p = patch.object(module, name, value); p.start(); self.addCleanup(p.stop)
        self.stage.mkdir(parents=True, mode=0o700); self.data.mkdir(parents=True, mode=0o700)
        self.backup = self.stage / 'activation-backup-test'; self.backup.mkdir(mode=0o700)
        self.username = 'private-test'; self.password = 'SYNTHETIC-secret-do-not-log-123456'
        self.approvals = {}
        database = self.backup / 'review-approvals.sqlite'
        with closing(sqlite3.connect(database)) as db, db:
            db.execute('CREATE TABLE design_review_approval_events(target_key TEXT,revision INTEGER,approved INTEGER,fingerprint TEXT,metadata TEXT,PRIMARY KEY(target_key,revision))')
            for i in range(109):
                original = 'bestand/' + 'long-original-family-' * 4 + str(i)
                key = json.dumps(['steel', original, 'GR-ES-RE-50X20-T15'], separators=(',', ':')); fingerprint = hashlib.sha256(key.encode()).hexdigest()
                state = {'key': key, 'approved': True, 'status': 'approved', 'revision': 1, 'fingerprint': fingerprint, 'approvedFingerprint': fingerprint, 'metadata': {'id': original}}
                self.approvals[key] = state
                db.execute('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?)', (key, 1, 1, fingerprint, json.dumps(state['metadata'])))
            db.execute('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?)', ('old-revoked', 1, 1, '0' * 64, '{}'))
            db.execute('INSERT INTO design_review_approval_events VALUES(?,?,?,?,?)', ('old-revoked', 2, 0, '0' * 64, '{}'))
        database.chmod(0o600)
        self.write(self.data / 'local-review-import.json', {'products': [], 'localOnly': True})
        config = {'schema': 1, 'purpose': 'private-test-runtime', 'values': {'GRAVURU_TEST_ORIGIN': module.ORIGIN, 'GRAVURU_PRIVATE_DATA_DIR': str(self.data), 'GRAVURU_SLATE_REVIEW_PACKAGE': str(self.stage / 'gallery'), 'GRAVURU_TEST_USERNAME': self.username, 'GRAVURU_TEST_PASSWORD': self.password}}
        self.write(self.stage / 'config.json', config)
        self.previews = {}
        rows = []
        for i in range(3):
            original = 'new-preview-' + str(i); preview = 'originals/_source-previews/' + hashlib.sha256(original.encode()).hexdigest()[:24] + '.png'
            raw = b'\x89PNG\r\n\x1a\nsynthetic-byte-proof-' + str(i).encode()
            self.write(self.stage / 'gallery' / preview, raw); self.previews['/originale/files/' + preview] = raw
            rows.append({'originalId': original, 'preview': preview, 'bytes': len(raw), 'sha256': module.sha(raw), 'provenanceKind': ['rendered-source-svg', 'existing-source-image', 'pinned-catalogue-image'][i]})
        self.write(self.stage / 'gallery/manifest.json', {'originals': [{'id': row['originalId'], 'reviewSourcePreview': row['preview']} for row in rows]})
        supplement = self.stage / ('preview-supplement-' + 'b' * 16)
        self.write(supplement / 'supplement-manifest.json', {'schema': 'gravuru-source-preview-supplement/v1', 'rows': rows})
        self.write(supplement / 'SUPPLEMENT-READY.json', {'ready': True})
        self.proof = {'sourceCommit': 'a' * 40, 'configSha256': self.digest(self.stage / 'config.json'), 'mappingSha256': self.digest(self.data / 'local-review-import.json'), 'galleryManifestSha256': self.digest(self.stage / 'gallery/manifest.json'), 'supplementProof': {'archiveSha256': 'b' * 64, 'file': str(supplement / 'SUPPLEMENT-READY.json'), 'sha256': self.digest(supplement / 'SUPPLEMENT-READY.json'), 'manifestSha256': self.digest(supplement / 'supplement-manifest.json')}}
        self.write(self.stage / 'STAGE-READY.json', self.proof)
        receipt = {'schema': 'gravuru-complete-gallery-activation/v1', 'siteId': 19, 'sameData': True, 'data': str(self.data), 'mappingActivated': True, 'shopifyWrites': 0, 'sourceCommit': self.proof['sourceCommit'], 'mappingSha256': self.proof['mappingSha256'], 'stageProofSha256': self.digest(self.stage / 'STAGE-READY.json'), 'sqliteBackups': [{'file': database.name, 'bytes': database.stat().st_size, 'sha256': self.digest(database)}]}
        self.write(self.backup / 'ACTIVATION-RECEIPT.json', receipt)
        self.write(self.stage / 'ACTIVATED.json', {'schema': 'gravuru-complete-gallery-activated/v1', 'siteId': 19, 'mappingActivated': True, 'shopifyWrites': 0, 'sourceCommit': self.proof['sourceCommit'], 'mappingSha256': self.proof['mappingSha256'], 'stageProofSha256': receipt['stageProofSha256'], 'receipt': str(self.backup / 'ACTIVATION-RECEIPT.json'), 'receiptSha256': self.digest(self.backup / 'ACTIVATION-RECEIPT.json')})
        self.calls = []; self.evidence = []

    def write(self, file, value):
        file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        file.write_bytes(value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False).encode('utf-8')); file.chmod(0o600)

    def digest(self, file):
        return module.sha(file.read_bytes())

    def request(self, route, *, body=None, authenticated=True):
        self.calls.append((route, body, authenticated)); self.evidence.append({'path': route, 'method': 'POST' if body is not None else 'GET'})
        if route == '/__test/health':
            return (200, 'application/json', b'{"ready":true,"scope":"private-operator-test","shopifyConnected":false}') if authenticated else (401, 'text/plain', b'protected')
        if route == '/originale/':
            paging = {'totalOriginals': 3, 'totalMatches': 3, 'matchingOriginals': 3, 'page': 1, 'pageSize': 60, 'pages': 1, 'filters': {'view': 'designs', 'search': '', 'material': ''}}
            return 200, 'text/html', b'<button data-assignment-open>Familien zuweisen</button>' + b'<article data-design-card></article>' * 3 + ('<script id="review-page-data" type="application/json">' + json.dumps(paging) + '</script>').encode()
        if route == '/originale/approvals?action=read':
            self.assertEqual(set(body), {'originalIds', 'targetKeys'}); self.assertLessEqual(len(body['targetKeys']), 60)
            return 200, 'application/json', json.dumps({'approvals': {key: self.approvals[key] for key in body['targetKeys']}}).encode('utf-8')
        return 200, 'image/png', self.previews[route]

    def run_fake(self, request=None):
        fixture = self
        call = request or self.request
        class Client:
            def __init__(self, username, password):
                fixture.assertEqual((username, password), (fixture.username, fixture.password)); self.evidence = fixture.evidence
            request = staticmethod(call)
        with patch.object(module, 'PrivateClient', Client):
            return module.run()

    def test_109_preserved_approvals_two_bounded_reads_and_three_pngs_without_writes_or_secret_output(self):
        before = self.digest(self.backup / 'review-approvals.sqlite')
        result = self.run_fake()
        self.assertTrue(result['ready']); self.assertEqual(result['counts'], {'galleryCards': 3, 'galleryOriginalsExpected': 3, 'galleryOriginalsOnline': 3, 'galleryOriginalsManifest': 3, 'approvedExpected': 109, 'approvedVerified': 109, 'previewExamplesVerified': 3})
        posts = [body for route, body, _ in self.calls if body is not None]
        self.assertEqual([len(body['targetKeys']) for body in posts], [60, 49]); self.assertEqual(len(self.calls), 8)
        self.assertEqual(self.digest(self.backup / 'review-approvals.sqlite'), before)
        report = (self.stage / 'ONLINE-READBACK.json').read_text(encoding='utf-8')
        self.assertNotIn(self.password, report); self.assertNotIn(self.username, report); self.assertNotIn('<article', report)
        self.assertEqual(module.sha(report.encode('utf-8')), result['sha256'])
        with self.assertRaisesRegex(module.ReadbackError, 'already_exists'):
            module.run()

    def test_revoked_or_changed_approval_fails_instead_of_reporting_109(self):
        state = next(iter(self.approvals.values())); state['status'] = 'changed'; state['approved'] = False
        result = self.run_fake(); self.assertFalse(result['ready']); self.assertLess(result['counts']['approvedVerified'], 109)
        self.assertNotIn('image/png', json.dumps(self.evidence))

    def test_raw_transport_exception_cannot_expose_credentials(self):
        def failed(*args, **kwargs):
            raise RuntimeError('Authorization: Basic ' + self.password)
        result = self.run_fake(failed)
        report = (self.stage / 'ONLINE-READBACK.json').read_text(encoding='utf-8')
        self.assertFalse(result['ready']); self.assertNotIn(self.password, report); self.assertIn('readback_transport_or_input_failed', report)

    def test_changed_backup_is_rejected_before_http(self):
        with (self.backup / 'review-approvals.sqlite').open('ab') as stream:
            stream.write(b'changed')
        result = self.run_fake(); self.assertFalse(result['ready']); self.assertEqual(self.calls, [])

    def test_anonymous_access_is_a_failure_not_a_successful_healthcheck(self):
        def public(route, **options):
            if not options.get('authenticated', True):
                return 200, 'application/json', b'{}'
            return self.request(route, **options)
        result = self.run_fake(public)
        self.assertFalse(result['ready']); self.assertEqual(result['counts']['approvedVerified'], 0)

    def test_more_than_60_cards_stops_before_any_approval_reads(self):
        def oversized(route, **options):
            if route == '/originale/':
                return 200, 'text/html', b'<button data-assignment-open></button>' + b'<article data-design-card></article>' * 61
            return self.request(route, **options)
        result = self.run_fake(oversized)
        self.assertFalse(result['ready']); self.assertFalse(any(body is not None for _, body, _ in self.calls))

    def test_wrong_online_png_bytes_fail_after_the_approved_targets_are_verified(self):
        def wrong_png(route, **options):
            if route in self.previews:
                return 200, 'image/png', b'wrong bytes'
            return self.request(route, **options)
        result = self.run_fake(wrong_png)
        self.assertFalse(result['ready']); self.assertEqual(result['counts']['approvedVerified'], 109); self.assertEqual(result['counts']['previewExamplesVerified'], 0)

    def test_online_total_cannot_claim_a_partial_catalogue_as_complete(self):
        def wrong_total(route, **options):
            status, mime, raw = self.request(route, **options)
            if route == '/originale/':
                raw = raw.replace(b'"totalOriginals": 3', b'"totalOriginals": 2')
            return status, mime, raw
        result = self.run_fake(wrong_total)
        self.assertFalse(result['ready']); self.assertEqual(result['counts']['galleryOriginalsOnline'], 0)

    def test_gallery_manifest_streaming_handles_utf8_escaped_delimiters_and_rejects_duplicate_ids(self):
        rows = [{'id': 'D' + str(i), 'reviewSourcePreview': 'ä{"x"}/' + str(i), 'targets': [{'nested': [True, None, {'value': 'comma,brace}'}]}]} for i in range(150)]
        raw = json.dumps({'before': {'n': 12345}, 'originals': rows, 'after': [1, 2, 3]}, ensure_ascii=False)
        class Bounded(io.StringIO):
            def read(self, size=-1):
                if size < 0 or size > 17:
                    raise AssertionError('unbounded manifest read')
                return super().read(size)
        total, selected = module.scan_gallery(Bounded(raw), {'D0', 'D149'}, chunk_size=17)
        self.assertEqual(total, 150); self.assertEqual(selected, {'D0': rows[0]['reviewSourcePreview'], 'D149': rows[-1]['reviewSourcePreview']})
        for bad in ('{"originals":[{"id":"D"},{"id":"D"}]}', '{"originals":[],}', '{"originals":[{"id":"D"},]}', '{"originals":[]} trailing'):
            with self.assertRaises(module.ReadbackError):
                module.scan_gallery(io.StringIO(bad), set(), chunk_size=7)

    def test_inventory_avoids_the_old_whole_manifest_byte_reader(self):
        original = module.file_bytes
        def bounded(file, limit=128 * 1024**2):
            self.assertNotEqual(file, self.stage / 'gallery/manifest.json')
            return original(file, limit)
        with patch.object(module, 'file_bytes', side_effect=bounded):
            self.assertTrue(self.run_fake()['ready'])

    def test_production_client_uses_fixed_origin_tls_no_proxy_short_read_url_and_runtime_hmac(self):
        client = module.PrivateClient(self.username, self.password)
        message = json.dumps(['gravuru-private-slate-review-csrf/v1', module.ORIGIN, self.username], separators=(',', ':')).encode()
        expected = hmac.new(self.password.encode(), message, hashlib.sha256).hexdigest()
        self.assertEqual(client.csrf, expected)
        self.assertTrue(any(isinstance(handler, module.NoRedirect) for handler in client.opener.handlers))
        https = next(handler for handler in client.opener.handlers if isinstance(handler, module.urllib.request.HTTPSHandler))
        self.assertTrue(https._context.check_hostname); self.assertEqual(https._context.verify_mode, module.ssl.CERT_REQUIRED)
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://foreign.invalid/'))
        requests = []
        class Response(io.BytesIO):
            code = 200
            headers = Message(); headers['Content-Type'] = 'application/json'
        class Opener:
            def open(self, req, timeout):
                requests.append(req); return Response(b'{}')
        client.opener = Opener()
        body = {'originalIds': ['one'], 'targetKeys': ['key']}
        client.request('/originale/approvals?action=read', body=body)
        self.assertEqual(requests[0].full_url, module.ORIGIN + '/originale/approvals?action=read')
        self.assertEqual(requests[0].get_header('X-slate-review-csrf'), expected); self.assertEqual(json.loads(requests[0].data), body)
        self.assertEqual(requests[0].get_header('Authorization'), 'Basic ' + base64.b64encode((self.username + ':' + self.password).encode()).decode())
        for route in ('https://foreign.invalid/', '//foreign.invalid/', '/originale/approvals', '/api/workshop/products'):
            with self.assertRaisesRegex(module.ReadbackError, 'outside_readback_scope'):
                client.request(route, body={})
        Response.code = 302
        with self.assertRaisesRegex(module.ReadbackError, 'redirect_rejected'):
            client.request('/__test/health')


if __name__ == '__main__':
    unittest.main()
