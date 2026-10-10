import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('activate',Path(__file__).with_name('activate-merchant-release.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ActivationTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='gravuru-activation-test-');self.addCleanup(self.temp.cleanup);self.base=Path(self.temp.name)
  self.root=self.base/'gravuru-2027-merchant';self.root.mkdir(mode=0o700);self.entry=self.root/'app.cjs';self.entry.write_text('previous code\n')
  self.data=self.base/'data';self.data.mkdir(mode=0o700)
  for name in ['workshop.sqlite','profiles.sqlite','design-assets.sqlite']:
   with sqlite3.connect(self.data/name) as db:db.execute('CREATE TABLE preserved(value TEXT)');db.execute("INSERT INTO preserved VALUES('untouched')")
   (self.data/name).chmod(0o600)
  self.release=self.base/'release';self.release.mkdir(mode=0o700);(self.release/'ops/plesk').mkdir(parents=True);source=self.release/'ops/plesk/merchant-app.cjs';source.write_text('new code\n')
  commit='a'*40
  (self.release/'PACKAGE-MANIFEST.json').write_text(json.dumps({'scope':'shopify-merchant-test','sourceCommit':commit,'version':'0.1.0-test','files':[{'path':'ops/plesk/merchant-app.cjs','sha256':module.digest(source)}]}))
  (self.release/'STAGE-RECEIPT.json').write_text(json.dumps({'sourceCommit':commit,'activated':False,'runtimeConfigurationChecked':True,'archiveSha256':'b'*64}))
  self.config=self.base/'config.json';self.config.write_text(json.dumps({'purpose':'shopify-merchant-test-runtime','values':{'GRAVURU_SHOPIFY_APP_ORIGIN':'https://app-2027.gravuru-designwerkstatt.de','GRAVURU_PRIVATE_DATA_DIR':str(self.data)}}));self.config.chmod(0o600)
  self.args=SimpleNamespace(root=self.root,release=self.release,config=self.config,backup=self.base/'backup',expected_entry_sha256=module.digest(self.entry))
 def test_backup_and_atomic_entry_preserve_all_databases(self):
  hashes={p.name:module.digest(p) for p in self.data.glob('*.sqlite')}
  with patch('builtins.print'):module.activate(self.args)
  self.assertIn(str(self.release),self.entry.read_text());self.assertEqual((self.args.backup/'previous-app.cjs').read_text(),'previous code\n')
  self.assertEqual(hashes,{p.name:module.digest(p) for p in self.data.glob('*.sqlite')})
  receipt=json.loads((self.args.backup/'ACTIVATION-RECEIPT.json').read_text());self.assertEqual(len(receipt['sqliteBackups']),3)
  for item in receipt['sqliteBackups']:
   with sqlite3.connect(self.args.backup/item['file']) as db:self.assertEqual(db.execute('SELECT value FROM preserved').fetchone(),('untouched',))
 def test_running_runtime_prevents_backup_and_switch(self):
  with (self.data/'.runtime.lock').open('a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
   with self.assertRaises(BlockingIOError):module.activate(self.args)
  self.assertFalse(self.args.backup.exists());self.assertEqual(self.entry.read_text(),'previous code\n')
 def test_concurrent_entry_edit_is_never_overwritten(self):
  self.entry.write_text('newer code\n')
  with self.assertRaisesRegex(ValueError,'changed since review'):module.activate(self.args)
  self.assertEqual(self.entry.read_text(),'newer code\n');self.assertFalse(self.args.backup.exists())
 def test_changed_release_is_rejected_before_backup(self):
  (self.release/'ops/plesk/merchant-app.cjs').write_text('changed')
  with self.assertRaisesRegex(ValueError,'source changed'):module.activate(self.args)
  self.assertFalse(self.args.backup.exists())
 def test_legacy_application_cannot_be_targeted(self):
  self.args.root=self.base/'gravuru-werkstatt'
  with self.assertRaisesRegex(ValueError,'separate merchant'):module.activate(self.args)
  self.assertFalse(self.args.backup.exists())

if __name__=='__main__':unittest.main()
