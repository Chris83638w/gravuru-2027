import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('activate_bridge', Path(__file__).with_name('activate-bridge.py'))
activation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activation)


class ActivationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name)
        self.private = self.base / 'private'
        self.private.mkdir(mode=0o700)
        app = self.base / 'gravuru-cdr-mcp'
        app.mkdir()
        (app / 'server.mjs').write_text("const VERSION = '1.2.0';")
        self.config = self.private / 'gravuru-cdr-mcp-config.json'
        self.original = json.dumps({'values': {'CDR_MCP_TOKEN': 'M' * 48, 'OTHER_SETTING': 'preserved'}}).encode()
        self.config.write_bytes(self.original)

    def test_readonly_plan_then_private_activation_preserves_existing_settings(self):
        self.assertFalse(activation.activate(self.base)['changed'])
        self.assertEqual(len(list(self.private.iterdir())), 1)
        result = activation.activate(self.base, apply=True)
        self.assertTrue(result['restartRequired'])
        values = json.loads(self.config.read_text())['values']
        self.assertEqual(values['CDR_MCP_TOKEN'], 'M' * 48)
        self.assertEqual(values['OTHER_SETTING'], 'preserved')
        token = Path(result['uploadTokenFile'])
        self.assertEqual(token.stat().st_mode & 0o777, 0o600)
        self.assertEqual(Path(result['copyRoot']).stat().st_mode & 0o777, 0o700)
        self.assertNotIn(token.read_text().strip(), json.dumps(result))
        self.assertEqual(Path(result['configBackup']).read_bytes(), self.original)
        with self.assertRaises(RuntimeError):
            activation.activate(self.base, apply=True)

    def test_failed_config_replace_cleans_only_created_files_and_keeps_original(self):
        with patch.object(activation.os, 'replace', side_effect=OSError('synthetic failure')):
            with self.assertRaises(OSError):
                activation.activate(self.base, apply=True)
        self.assertEqual(self.config.read_bytes(), self.original)
        self.assertEqual(list(self.private.iterdir()), [self.config])


if __name__ == '__main__':
    unittest.main()
