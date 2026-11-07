"""Isolated POSIX fixtures only; never opens a real gallery or database."""
import copy
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import struct
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zipfile
import zlib

spec = importlib.util.spec_from_file_location('previews', Path(__file__).with_name('complete-gallery-previews.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def png(colour=b'\xff\xff\xff'):
    def chunk(kind, raw):
        return struct.pack('>I', len(raw)) + kind + raw + struct.pack('>I', zlib.crc32(kind + raw) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b'\0' + colour)) + chunk(b'IEND', b'')


class PreviewTests(unittest.TestCase):
    def setUp(self):
        os.umask(0o077)
        self.temp = tempfile.TemporaryDirectory(prefix='complete-preview-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = self.root / 'private/complete-gallery-20261107-v1'
        self.active = self.root / 'private/gesamtbestand-stage-0bb50565-20261106-v1'
        self.data = self.active / 'data'
        for name, value in [('ROOT', self.root), ('STAGE', self.stage), ('ACTIVE', self.active), ('DATA', self.data), ('EXPECTED_UID', os.getuid())]:
            mocked = patch.object(module, name, value); mocked.start(); self.addCleanup(mocked.stop)
        self.gallery = self.stage / 'gallery'
        self.gallery.mkdir(parents=True, mode=0o700); self.data.mkdir(parents=True, mode=0o700)
        self.commit = 'a' * 40
        self.code = self.root / ('gravuru-2027-complete-' + self.commit[:8])
        self.code.mkdir(mode=0o755)
        self.write(self.code / 'app.cjs', b"require('./ops/plesk/app.cjs');\n")
        self.write(self.data / 'local-review-import.json', {'products': ['old']})
        for name in ('workshop.sqlite', 'design-assets.sqlite', 'profiles.sqlite', 'review-comments.sqlite', 'review-approvals.sqlite'):
            self.write(self.data / name, ('preserved user bytes ' + name).encode())
        self.write(self.stage / 'staged-import.json', {'products': ['old', 'new']})
        config = {'schema': 1, 'purpose': 'private-test-runtime', 'values': {
            'GRAVURU_TEST_ORIGIN': module.ORIGIN, 'GRAVURU_PRIVATE_DATA_DIR': str(self.data),
            'GRAVURU_SLATE_REVIEW_PACKAGE': str(self.active / 'gallery-4'), 'PRIVATE_CANARY': 'never-in-report'}}
        self.write(self.active / 'config.json', config)
        config['values']['GRAVURU_SLATE_REVIEW_PACKAGE'] = str(self.gallery)
        self.write(self.stage / 'config.json', config)
        self.write(self.gallery / '.gravuru-slate-review.json', {'schema': 1, 'purpose': 'slate-review-gallery', 'origin': module.ORIGIN})
        self.ids = ['gedenktafeln/Menschen/Allgemein/Design Ü,1', 'GT-S-30x20-D50--source-095ec4f8e87f']
        self.pack = {'schema': 'gravuru-design-original-review/v1', 'reviewOnly': True, 'released': False,
            'products': [{'key': 'native', 'designIds': ['OLD']}], 'counts': {'originals': 3}, 'originals': [
                {'id': self.ids[0], 'status': 'open', 'targets': [{'status': 'open', 'reason': 'Source only'}], 'sourceTargetGroup': 'Menschen'},
                {'id': self.ids[1], 'sourceOriginalId': 'GT-S-30x20-D50', 'status': 'open', 'targets': []},
                {'id': 'OLD', 'status': 'prepared', 'targets': [{'status': 'prepared', 'productId': 'cfg_old'}], 'reviewSourcePreview': 'originals/OLD/preview.png'}]}
        self.rows = []; self.evidence = []; self.images = {}
        font = {'name': 'Original Font', 'sourceName': 'Original Font', 'file': 'schriften/original.ttf', 'sha256': module.sha(b'font'), 'substitution': False}
        photo = {'file': 'designs/photo.png', 'sha256': module.sha(b'photo')}
        self.evidence += [{'file': font['file'], 'sha256': font['sha256'], 'bytes': 4, 'blob': 'f' * 40},
                          {'file': photo['file'], 'sha256': photo['sha256'], 'bytes': 5, 'blob': 'e' * 40}]
        for i, original_id in enumerate(self.ids):
            svg = ('<svg><text>Quelltext ' + str(i) + '</text></svg>').encode()
            source_path = 'originals/' + original_id + '/design.svg'
            self.write(self.gallery / source_path, svg)
            original_source = 'designs/source-' + str(i) + '/design.svg'
            self.evidence.append({'file': original_source, 'sha256': module.sha(svg), 'bytes': len(svg), 'blob': 'd' * 40})
            preview = 'originals/_source-previews/' + module.sha(original_id.encode())[:24] + '.png'
            raw = png(); self.images[preview] = raw
            self.rows.append({'originalId': original_id, 'sourceOriginalId': self.pack['originals'][i].get('sourceOriginalId', original_id),
                'preview': preview, 'bytes': len(raw), 'sha256': module.sha(raw), 'reviewOnly': True, 'released': False,
                'source': {'file': original_source, 'galleryFile': source_path, 'sha256': module.sha(svg), 'kind': 'pinned-catalogue-original'},
                'fonts': [copy.deepcopy(font)], 'photos': [copy.deepcopy(photo)] if i == 0 else []})
        self.write(self.gallery / 'originals/OLD/preview.png', png())
        self.write(self.gallery / 'native/untouched.json', b'{"immutableNative":"original"}')
        self.update_gallery()
        self.make_zip()

    def write(self, file, value):
        file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        file.write_bytes(value if isinstance(value, bytes) else module.json_bytes(value)); file.chmod(0o600)

    def update_gallery(self):
        self.write(self.gallery / 'manifest.json', self.pack)
        index = [{'file': f.relative_to(self.gallery).as_posix(), 'bytes': f.stat().st_size, 'sha256': module.digest(f)}
                 for f in self.gallery.rglob('*') if f.is_file() and f.name not in ('files-sha256.json', '.gravuru-slate-review.json')]
        self.write(self.gallery / 'files-sha256.json', index)
        self.stage_proof = {'schema': 'gravuru-complete-gallery-stage/v1', 'sourceCommit': self.commit,
            'ready': True, 'activated': False, 'shopifyWrites': 0, 'activationReviewRequired': False,
            'concurrentlyChangedExistingHeads': [], 'backupVerified': True, 'preservation': {'passed': True},
            'runtimeImportsAndBuildVerified': True, 'stagedMappingVerified': True,
            'code': str(self.code), 'gallery': str(self.gallery), 'mapping': str(self.stage / 'staged-import.json'), 'config': str(self.stage / 'config.json'),
            'galleryManifestSha256': module.digest(self.gallery / 'manifest.json'), 'mappingSha256': module.digest(self.stage / 'staged-import.json'),
            'beforeMappingSha256': module.digest(self.data / 'local-review-import.json'), 'configSha256': module.digest(self.stage / 'config.json'),
            'activeConfigSha256': module.digest(self.active / 'config.json'), 'wrapperSha256': module.digest(self.code / 'app.cjs')}
        self.write(self.stage / 'STAGE-READY.json', self.stage_proof)

    def make_zip(self, change_manifest=None, change_proof=None, change_files=None):
        counts = {'requested': 2, 'rendered': 2, 'blocked': 0, 'pending': 0}
        manifest = {'schema': 'gravuru-source-preview-supplement/v1', 'sourceCommit': module.SOURCE_COMMIT,
                    'deliveryCommit': module.SOURCE_COMMIT, 'reviewOnly': True, 'released': False, 'complete': True,
                    'counts': counts, 'rows': copy.deepcopy(self.rows), 'blocked': []}
        proof = {'schema': 'gravuru-source-preview-preparation-proof/v1', 'sourceCommit': module.SOURCE_COMMIT,
                 'deliveryCommit': module.SOURCE_COMMIT, 'reviewOnly': True, 'released': False,
                 'pinnedSourceVerified': True, 'originalSourcesVerified': True, 'sources': copy.deepcopy(self.evidence),
                 'renderer': {'name': 'isolated-chromium', 'version': 'test', 'offline': True, 'explicitFonts': True, 'glyphCoverageChecked': True},
                 'counts': counts}
        if change_manifest: change_manifest(manifest)
        if change_proof: change_proof(proof)
        files = {**self.images, **getattr(self, 'extra_files', {}), 'supplement-manifest.json': module.json_bytes(manifest), 'preparation-proof.json': module.json_bytes(proof)}
        if change_files: change_files(files)
        index = [{'file': name, 'bytes': len(raw), 'sha256': module.sha(raw)} for name, raw in files.items()]
        files['files-sha256.json'] = module.json_bytes(index)
        archive = self.stage / 'source-previews.zip'
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as zipped:
            for name, raw in files.items():
                zipped.writestr(name, raw)
        archive.chmod(0o600)
        self.args = SimpleNamespace(commit=self.commit, zip_sha256=module.digest(archive),
                                    manifest_sha256=module.sha(files['supplement-manifest.json']), stage_proof_sha256=module.digest(self.stage / 'STAGE-READY.json'))

    def gallery_snapshot(self):
        return {f.relative_to(self.gallery).as_posix(): module.digest(f) for f in self.gallery.rglob('*') if f.is_file()}

    def assert_rejected(self, pattern):
        before = self.gallery_snapshot(); ready = (self.stage / 'STAGE-READY.json').read_bytes()
        with self.assertRaisesRegex((ValueError, KeyError), pattern): module.apply(self.args)
        self.assertEqual(self.gallery_snapshot(), before)
        self.assertEqual((self.stage / 'STAGE-READY.json').read_bytes(), ready)
        self.assertEqual(list(self.stage.glob('preview-supplement-*')), [])

    def original_png_fixture(self, edit=None):
        original = self.pack['originals'][0]; original.pop('status')
        source = 'originals/' + original['id'] + '/preview.png'; raw = png()
        original['files'] = [{'name': 'preview.png', 'bytes': len(raw), 'sha256': module.sha(raw)}]
        self.write(self.gallery / source, raw); self.update_gallery()
        self.rows[0].update({'provenanceKind': 'existing-source-image', 'fonts': [], 'photos': [],
                             'source': {'galleryFile': source, 'sha256': module.sha(raw), 'kind': 'preserved-gallery-original'}})
        blocker = {'originalId': original['id'], 'reason': 'Original font remains unresolved', 'coveredByExistingOriginalPreview': True}
        def change_manifest(m):
            m['counts'].update({'rendered': 1, 'available': 2, 'existingOriginalPreviews': 1, 'renderingBlockers': 1})
            m['renderingBlockers'] = [blocker]
            if edit: edit(m)
        self.make_zip(change_manifest=change_manifest, change_proof=lambda p: p.update(renderingBlockers=[blocker]))
        return source

    def catalogue_png_fixture(self, edit=None, file_mode=b'100644', change_files=None):
        raw = png(); source = 'designs/bestand/Quelle Ü/preview.png'
        blob = module.git_oid('blob', raw); objects = {}; child = blob
        for i, name in enumerate(reversed(source.split('/'))):
            tree = (file_mode if i == 0 else b'40000') + b' ' + name.encode() + b'\0' + bytes.fromhex(child)
            child = module.git_oid('tree', tree)
            objects[child] = ('tree', tree)
        root_tree = child
        commit = ('tree ' + root_tree + '\nauthor Fixture <fixture@example.invalid> 0 +0000\ncommitter Fixture <fixture@example.invalid> 0 +0000\n\nPinned fixture\n').encode()
        commit_oid = module.git_oid('commit', commit); objects[commit_oid] = ('commit', commit)
        mocked = patch.object(module, 'SOURCE_COMMIT', commit_oid); mocked.start(); self.addCleanup(mocked.stop)
        self.pack.update({'deliveryCommit': commit_oid, 'catalogueCommit': module.CATALOGUE_COMMIT})
        self.pack['originals'][0].update({'source': source[:-len('preview.png')] + 'design.json', 'files': []})
        self.rows[0].update({'provenanceKind': 'pinned-catalogue-image', 'fonts': [], 'photos': [],
                            'source': {'file': source, 'sha256': module.sha(raw), 'gitBlob': blob, 'commit': commit_oid, 'kind': 'pinned-catalogue-image'}})
        self.update_gallery()
        records = [{'oid': oid, 'type': kind, 'file': 'evidence/git/objects/' + oid + '.' + kind,
                    'bytes': len(data), 'sha256': module.sha(data)} for oid, (kind, data) in objects.items()]
        proof = {'schema': 'gravuru-pinned-catalogue-image-proof/v1',
                 'commitPins': {'deliveryCommit': commit_oid, 'catalogueCommit': module.CATALOGUE_COMMIT},
                 'commits': [{'oid': commit_oid, 'file': 'evidence/git/objects/' + commit_oid + '.commit', 'tree': root_tree}],
                 'objects': records}
        self.extra_files = {'evidence/git/proof.json': module.json_bytes(proof), **{r['file']: objects[r['oid']][1] for r in records}}
        def change_manifest(m):
            m['gitProof'] = 'evidence/git/proof.json'
            m['counts'].update({'rendered': 1, 'available': 2, 'existingOriginalPreviews': 0, 'renderingBlockers': 0, 'pinnedCataloguePreviews': 1})
            if edit: edit(m)
        self.make_zip(change_manifest=change_manifest, change_proof=lambda p: p.update(gitProof='evidence/git/proof.json'), change_files=change_files)
        return proof

    def test_success_changes_only_missing_preview_field_and_index_and_preserves_hardlinks(self):
        before = self.gallery_snapshot()
        protected = {f: f.read_bytes() for f in self.data.iterdir()}
        protected.update({self.active / 'config.json': (self.active / 'config.json').read_bytes(), self.stage / 'config.json': (self.stage / 'config.json').read_bytes()})
        witness = self.stage / 'hardlinked-original-manifest.json'; os.link(self.gallery / 'manifest.json', witness)
        old_raw = witness.read_bytes()
        report = module.apply(self.args)
        self.assertEqual(report['previewsAdded'], 2)
        self.assertNotIn('never-in-report', json.dumps(report))
        self.assertEqual(witness.read_bytes(), old_raw)
        after = json.loads((self.gallery / 'manifest.json').read_bytes())
        for row in after['originals'][:2]: row.pop('reviewSourcePreview')
        self.assertEqual(after, self.pack)
        for name, old_sha in before.items():
            if name not in ('manifest.json', 'files-sha256.json'): self.assertEqual(module.digest(self.gallery / name), old_sha)
        for file, raw in protected.items(): self.assertEqual(file.read_bytes(), raw)
        ready = json.loads((self.stage / 'STAGE-READY.json').read_bytes())
        self.assertTrue(ready['ready']); self.assertFalse(ready['activated'])
        expected = copy.deepcopy(ready); expected.pop('supplementProof'); expected['galleryManifestSha256'] = self.stage_proof['galleryManifestSha256']
        self.assertEqual(expected, self.stage_proof)
        self.assertEqual(module.digest(Path(ready['supplementProof']['file'])), ready['supplementProof']['sha256'])
        for entry in json.loads((self.gallery / 'files-sha256.json').read_bytes()):
            self.assertEqual(module.digest(self.gallery / entry['file']), entry['sha256'])
        with self.assertRaisesRegex(ValueError, 'Stage proof changed'): module.apply(self.args)

    def test_existing_preview_refuses_entire_supplement(self):
        self.pack['originals'][1]['reviewSourcePreview'] = 'existing.png'; self.update_gallery(); self.make_zip()
        self.assert_rejected('already has a preview')

    def test_native_even_without_prepared_target_flag_refuses(self):
        self.pack['products'][0]['designIds'].append(self.ids[0]); self.update_gallery(); self.make_zip()
        self.assert_rejected('native target')

    def test_wrong_canonical_original_or_alias_refuses(self):
        self.make_zip(change_manifest=lambda m: m['rows'][1].update(sourceOriginalId='wrong'))
        self.assert_rejected('source identity')

    def test_wrong_source_bytes_refuses_before_write(self):
        self.write(self.gallery / self.rows[1]['source']['galleryFile'], b'changed original')
        self.assert_rejected('Original SVG bytes')

    def test_unproven_font_photo_and_substitution_refuse(self):
        for field in ('fonts', 'photos'):
            with self.subTest(field=field):
                self.make_zip(change_manifest=lambda m: m['rows'][0][field][0].update(sha256='b' * 64))
                self.assert_rejected('source hash is unproven')
        self.make_zip(change_manifest=lambda m: m['rows'][0]['fonts'][0].update(substitution=True))
        self.assert_rejected('Documented font substitution')

    def test_partial_preview_sample_refuses(self):
        self.make_zip(change_manifest=lambda m: m.update(complete=False))
        self.assert_rejected('Complete preparation')

    def test_existing_svg_index_is_source_proof_without_repeated_git_entry(self):
        self.make_zip(change_proof=lambda p: p.update(sources=[r for r in p['sources'] if not r['file'].endswith('.svg')]))
        self.assertEqual(module.apply(self.args)['previewsAdded'], 2)

    def test_existing_original_png_is_byte_identical_without_font_claims(self):
        source = self.original_png_fixture()
        raw = (self.gallery / source).read_bytes()
        report = module.apply(self.args)
        self.assertEqual(report['previewsAdded'], 2)
        self.assertEqual((self.gallery / self.rows[0]['preview']).read_bytes(), raw)
        self.assertEqual((self.gallery / source).read_bytes(), raw)

    def test_existing_png_of_another_original_is_rejected(self):
        self.original_png_fixture(edit=lambda m: m['rows'][0]['source'].update(galleryFile='originals/OLD/preview.png'))
        self.assert_rejected('this original')

    def test_existing_png_replacement_is_not_allowed_to_change_pixels(self):
        changed = png(b'\xff\0\0')
        self.images[self.rows[0]['preview']] = changed
        self.original_png_fixture(edit=lambda m: m['rows'][0].update(bytes=len(changed), sha256=module.sha(changed)))
        self.assert_rejected('Original PNG index or copied bytes')

    def test_rendering_blocker_must_have_actual_original_png(self):
        self.original_png_fixture(edit=lambda m: m['renderingBlockers'][0].update(originalId=self.ids[1]))
        self.assert_rejected('blocker lacks')

    def test_catalogue_png_authenticated_to_git_commit_with_no_source_file_import(self):
        self.catalogue_png_fixture()
        before = self.gallery_snapshot(); original_rows = copy.deepcopy(self.pack['originals'])
        report = module.apply(self.args)
        self.assertEqual(report['previewsAdded'], 2)
        self.assertEqual((self.gallery / self.rows[0]['preview']).read_bytes(), png())
        self.assertFalse((self.gallery / 'originals' / self.ids[0] / 'preview.png').exists())
        self.assertFalse((self.gallery / 'evidence').exists())
        rows = json.loads((self.gallery / 'manifest.json').read_bytes())['originals']
        for row in rows[:2]: row.pop('reviewSourcePreview')
        self.assertEqual(rows, original_rows)
        for name, old_sha in before.items():
            if name not in ('manifest.json', 'files-sha256.json'): self.assertEqual(module.digest(self.gallery / name), old_sha)

    def test_catalogue_image_cannot_claim_another_canonical_source(self):
        self.catalogue_png_fixture(edit=lambda m: m['rows'][0]['source'].update(file='designs/other/preview.png'))
        self.assert_rejected('source/provenance differs')

    def test_consistent_json_hash_claims_do_not_replace_the_git_blob(self):
        changed = png(b'\xff\0\0')
        def edit(m):
            m['rows'][0].update(bytes=len(changed), sha256=module.sha(changed))
            m['rows'][0]['source'].update(sha256=module.sha(changed), gitBlob=module.git_oid('blob', changed))
        self.catalogue_png_fixture(edit=edit, change_files=lambda f: f.update({self.rows[0]['preview']: changed}))
        self.assert_rejected('not the pinned Git blob')

    def test_rehashed_tree_json_cannot_forge_pinned_tree_object(self):
        def change(files):
            proof = json.loads(files['evidence/git/proof.json'])
            record = next(r for r in proof['objects'] if r['type'] == 'tree')
            raw = files[record['file']][:-1] + bytes([files[record['file']][-1] ^ 1])
            files[record['file']] = raw; record['sha256'] = module.sha(raw)
            files['evidence/git/proof.json'] = module.json_bytes(proof)
        self.catalogue_png_fixture(change_files=change)
        self.assert_rejected('Git object bytes do not match')

    def test_rehashed_commit_json_cannot_forge_pinned_commit_object(self):
        def change(files):
            proof = json.loads(files['evidence/git/proof.json'])
            record = next(r for r in proof['objects'] if r['type'] == 'commit')
            raw = files[record['file']].replace(b'Pinned fixture', b'Forged fixture')
            files[record['file']] = raw; record['sha256'] = module.sha(raw)
            files['evidence/git/proof.json'] = module.json_bytes(proof)
        self.catalogue_png_fixture(change_files=change)
        self.assert_rejected('Git object bytes do not match')

    def test_git_image_must_be_regular_not_symlink(self):
        self.catalogue_png_fixture(file_mode=b'120000')
        self.assert_rejected('not a regular Git blob')

    def test_git_commit_must_also_be_pinned_by_the_stage_package(self):
        self.catalogue_png_fixture()
        self.pack['deliveryCommit'] = 'b' * 40; self.update_gallery()
        self.args.stage_proof_sha256 = module.digest(self.stage / 'STAGE-READY.json')
        self.assert_rejected('pins differ from the staged package')

    def test_wrong_zip_and_stale_stage_proof_refuse(self):
        self.args.zip_sha256 = '0' * 64; self.assert_rejected('archive digest')
        self.make_zip(); self.args.stage_proof_sha256 = '0' * 64; self.assert_rejected('Stage proof changed')

    def test_traversal_extra_file_and_html_disguised_as_png_refuse(self):
        self.make_zip(change_files=lambda f: f.update({'../outside.png': png()})); self.assert_rejected('Unsafe inventory path')
        self.make_zip(change_files=lambda f: f.update({'native/overwrite.json': b'{}'})); self.assert_rejected('Only isolated preview')
        self.make_zip(change_files=lambda f: f.update({self.rows[1]['preview']: b'<html>not image</html>'})); self.assert_rejected('Invalid PNG')

    def test_symlink_image_or_linked_destination_refuse(self):
        archive = self.stage / 'source-previews.zip'
        with zipfile.ZipFile(archive, 'a') as zipped:
            info = zipfile.ZipInfo('originals/_source-previews/' + '0' * 24 + '.png')
            info.create_system = 3; info.external_attr = (stat.S_IFLNK | 0o777) << 16
            zipped.writestr(info, '/outside')
        self.args.zip_sha256 = module.digest(archive); self.assert_rejected('Unsafe archive member')
        self.make_zip()
        (self.gallery / 'originals/_source-previews').symlink_to(self.active, target_is_directory=True)
        self.assert_rejected('Linked path')

    def test_activation_mapping_and_receipt_are_refused(self):
        active_mapping = self.data / 'local-review-import.json'; original = active_mapping.read_bytes()
        active_mapping.write_bytes((self.stage / 'staged-import.json').read_bytes())
        self.assert_rejected('already active')
        active_mapping.write_bytes(original)
        self.write(self.stage / 'activation-backup-test/ACTIVATION-RECEIPT.json', {'mappingActivated': True})
        self.assert_rejected('already activated')

    def test_activation_marker_is_refused_even_if_mapping_was_restored(self):
        self.write(self.stage / 'ACTIVATED.json', {'mappingActivated': True})
        self.assert_rejected('already activated')

    def test_atomic_metadata_failure_restores_exact_previous_bytes(self):
        before = self.gallery_snapshot(); ready = (self.stage / 'STAGE-READY.json').read_bytes()
        replace = os.replace; failed = False
        def fail_once(source, target):
            nonlocal failed
            if Path(source).name == 'next-files-sha256.json' and not failed:
                failed = True; raise OSError('simulated metadata interruption')
            return replace(source, target)
        with patch.object(module.os, 'replace', fail_once):
            with self.assertRaisesRegex(OSError, 'simulated'): module.apply(self.args)
        self.assertEqual(before, self.gallery_snapshot())
        self.assertEqual(ready, (self.stage / 'STAGE-READY.json').read_bytes())
        self.assertEqual(len(list(self.stage.glob('preview-supplement-*/previous-manifest.json'))), 1)
        self.assertEqual(list(self.stage.glob('preview-supplement-*/SUPPLEMENT-READY.json')), [])

    def test_shared_stage_lock_refuses_concurrent_activation(self):
        lock = self.stage / '.metadata.lock'; self.write(lock, b'')
        with lock.open('r+b') as stream:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError): module.apply(self.args)
        self.assertEqual(list(self.stage.glob('preview-supplement-*')), [])


if __name__ == '__main__':
    unittest.main()
