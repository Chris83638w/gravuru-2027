import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import http.client
import os
from unittest.mock import patch

import cdr_bridge as b

DATA = b'RIFF0000CDRA-synthetic-only'


class Transport:
    def __init__(self, head=404, wrong_receipt=False, fail_put=False):
        self.calls, self.head, self.wrong, self.fail = [], head, wrong_receipt, fail_put

    def request(self, method, meta, body=None):
        self.calls.append(method)
        if method == 'HEAD':
            return self.head, {'X-CDR-SHA256': meta['sha256'], 'X-CDR-Bytes': str(meta['bytes'])}, b''
        assert body.read() == DATA
        receipt = {**meta, 'source': 'outbound-copy', 'receivedAt': '2026-10-22T12:00:00Z'}
        if self.wrong:
            receipt['sha256'] = '0' * 64
        return (503 if self.fail else 200), {}, json.dumps(receipt).encode()


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.file = self.root / b.TARGET
        self.file.parent.mkdir(parents=True)
        self.file.write_bytes(DATA)

    def test_plan_is_offline_and_only_known_sheet(self):
        (self.root / 'other.cdr').write_bytes(DATA)
        with patch.object(b, 'Transport', side_effect=AssertionError('no network')), patch('sys.stdout', io.StringIO()):
            self.assertEqual(b.main(['--root', str(self.root)]), 0)
        self.assertEqual(len(b.select_files(self.root)), 1)
        self.assertEqual(len(b.select_files(self.root, True)), 2)

    def test_send_and_skip_preserve_original(self):
        before = self.file.stat()
        tr = Transport()
        result = b.send_one(self.root, b.TARGET, tr)
        self.assertEqual(tr.calls, ['HEAD', 'PUT'])
        self.assertEqual(result['sha256'], hashlib.sha256(DATA).hexdigest())
        self.assertEqual(result['status'], 'übertragen')
        tr = Transport(200)
        self.assertEqual(b.send_one(self.root, b.TARGET, tr)['status'], 'unverändert')
        self.assertEqual(tr.calls, ['HEAD'])
        self.assertEqual(self.file.read_bytes(), DATA)
        self.assertTrue(b.same_file_stat(before, self.file.stat()))

    def test_failed_auth_and_wrong_confirmation_are_not_success(self):
        for tr in [Transport(401), Transport(wrong_receipt=True), Transport(fail_put=True)]:
            with self.assertRaises(b.BridgeError):
                b.send_one(self.root, b.TARGET, tr)
        tr = Transport(409)
        self.assertEqual(b.send_one(self.root, b.TARGET, tr)['status'], 'übertragen')

    def test_traversal_and_symlinks_rejected(self):
        for rel in ['../x.cdr', '/x.cdr', 'a//x.cdr', 'x.cdr:secret', 'a/./x.cdr']:
            with self.assertRaises(b.BridgeError):
                b.checked_file(self.root, rel)
        linked = self.root / 'link.cdr'
        linked.symlink_to(self.file)
        with self.assertRaises(b.BridgeError):
            b.checked_file(self.root, 'link.cdr')

    def test_bad_signature_and_size(self):
        for content in [b'not-a-cdr-at-all', b'RIFF']:
            self.file.write_bytes(content)
            with self.assertRaises(b.BridgeError):
                with b.snapshot(self.root, b.TARGET):
                    self.fail('invalid source accepted')

    def test_transport_has_fixed_tls_destination_and_no_redirect(self):
        with patch('http.client.HTTPSConnection') as conn:
            response = conn.return_value.getresponse.return_value
            response.status = 302
            response.getheaders.return_value = [('Location', 'https://outside.example')]
            response.read.return_value = b''
            result = b.Transport('T' * 48).request('HEAD', {'server_path': b.TARGET})
            self.assertEqual(result[0], 302)
            self.assertEqual(conn.call_args.args[0], b.HOST)
            context = conn.call_args.kwargs['context']
            self.assertTrue(context.check_hostname)
            self.assertEqual(context.verify_mode, b.ssl.CERT_REQUIRED)
            conn.assert_called_once()

    def test_real_node_receiver_roundtrip(self):
        # Exercise the real request/stream/receipt implementation end to end.
        # Only this test substitutes loopback HTTP for the fixed production TLS connection.
        repo = Path(__file__).resolve().parents[2]
        module = (repo / 'app/cdr-mcp/server.mjs').as_uri()
        copies = self.root / 'receiver'
        copies.mkdir(mode=0o700)
        cfg = {'token': 'M' * 48, 'data': str(self.root / 'work'), 'sourceRoot': str(copies),
               'bridgeEnabled': True, 'bridgeRoot': str(copies), 'bridgeToken': 'T' * 48,
               'bridgeQuota': 1024 * 1024, 'maxBytes': 1024 * 1024, 'jobs': 1,
               'diskBytes': 1024 * 1024, 'origin': '', 'memMb': 256}
        code = 'import {createCdrServer} from ' + json.dumps(module) + '; const s=createCdrServer(' + json.dumps(cfg) + ');s.listen(0,"127.0.0.1",()=>console.log(s.address().port));'
        process = subprocess.Popen(['node', '--input-type=module', '-e', code], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'CDR_MCP_QUIET': '1'})
        try:
            port = int(process.stdout.readline().strip())
            def local_connection(host, **kwargs):
                self.assertEqual(host, b.HOST)
                return http.client.HTTPConnection('127.0.0.1', port, timeout=10)
            with patch('http.client.HTTPSConnection', side_effect=local_connection):
                tr = b.Transport('T' * 48)
                self.assertEqual(b.send_one(self.root, b.TARGET, tr)['status'], 'übertragen')
                self.assertEqual(b.send_one(self.root, b.TARGET, tr)['status'], 'unverändert')
            self.assertEqual((copies / b.TARGET).read_bytes(), DATA)
            self.assertEqual(json.loads(Path(str(copies / b.TARGET) + '.source.json').read_text())['sha256'], hashlib.sha256(DATA).hexdigest())
        finally:
            process.terminate()
            process.communicate(timeout=10)


if __name__ == '__main__':
    unittest.main()
