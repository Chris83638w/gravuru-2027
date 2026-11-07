"""Add pinned catalogue previews to the INACTIVE private complete-gallery stage.

No native import, database/configuration write, service action or publication.
The ZIP, its manifest and the current STAGE-READY proof are operator-pinned.
Activation uses the same .metadata.lock; STAGE-READY is the final commit record.
"""
import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import struct
import zipfile
import zlib

ROOT = Path('/var/www/vhosts/gravuru-designwerkstatt.de')
STAGE = ROOT / 'private/complete-gallery-20261107-v1'
ACTIVE = ROOT / 'private/gesamtbestand-stage-0bb50565-20261106-v1'
DATA = ACTIVE / 'data'
EXPECTED_UID = 10005
SOURCE_COMMIT = '86c1ff5f431acfe60d4cff388958112187005550'
CATALOGUE_COMMIT = '3c6051fbbc7904969948950fae12cae2ae663f30'
ORIGIN = 'https://test-2027.gravuru-designwerkstatt.de'
MAX_FILE = 100 * 1024**2
MAX_JSON = 32 * 1024**2
MAX_ARCHIVE = 8 * 1024**3
MAX_GIT_OBJECT = 8 * 1024**2


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(file):
    h = hashlib.sha256()
    with file.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def is_digest(value, length=64):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{' + str(length) + '}', value) is not None


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def decode_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'Duplicate JSON field')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs)


def relative(name):
    require(isinstance(name, str) and name and not PurePosixPath(name).is_absolute()
            and '\\' not in name and ':' not in name and not any(ord(c) < 32 for c in name)
            and all(p not in ('', '.', '..') for p in name.split('/')), 'Unsafe inventory path')
    return name


def safe(root, name):
    file = root.joinpath(*PurePosixPath(relative(name)).parts)
    for item in (file, *file.parents):
        require(not item.is_symlink(), 'Linked path rejected')
    return file


def checked(file, directory=False, private=True):
    require(file.is_absolute() and file.resolve() == file, 'Canonical site path required')
    for item in (file, *file.parents):
        require(not item.is_symlink() and not (item / '.git').exists(), 'Linked or Git path rejected')
    info = file.stat()
    require(info.st_uid == EXPECTED_UID, 'Unexpected site ownership')
    require(stat.S_ISDIR(info.st_mode) if directory else stat.S_ISREG(info.st_mode), 'Regular site path required')
    require(not private or not info.st_mode & 0o077, 'Private permissions required')
    return file


def read_json(file, private=True):
    return decode_json(checked(file, private=private).read_bytes())


def write_new(file, raw, created=None):
    fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    if created is not None:
        created.append(file)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())


def fsync_directory(directory):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


@contextmanager
def metadata_lock():
    import fcntl
    file = STAGE / '.metadata.lock'
    require(not file.is_symlink(), 'Linked metadata lock rejected')
    fd = os.open(file, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'r+b') as stream:
        checked(file)
        fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        require(os.fstat(stream.fileno()).st_ino == file.stat().st_ino, 'Metadata lock changed')
        yield


def verify_stage(args):
    require(os.getuid() == EXPECTED_UID and is_digest(args.commit, 40)
            and all(is_digest(v) for v in (args.zip_sha256, args.manifest_sha256, args.stage_proof_sha256)), 'Pinned private stage required')
    for directory in (STAGE, ACTIVE, DATA, STAGE / 'gallery'):
        checked(directory, directory=True)
    proof_file = checked(STAGE / 'STAGE-READY.json')
    require(digest(proof_file) == args.stage_proof_sha256, 'Stage proof changed')
    proof = read_json(proof_file)
    require(proof.get('schema') == 'gravuru-complete-gallery-stage/v1'
            and proof.get('sourceCommit') == args.commit and proof.get('ready') is True
            and proof.get('activated') is False and proof.get('shopifyWrites') == 0
            and not proof.get('activationReviewRequired') and proof.get('concurrentlyChangedExistingHeads') == []
            and proof.get('backupVerified') is True and proof.get('preservation', {}).get('passed') is True
            and proof.get('runtimeImportsAndBuildVerified') is True and proof.get('stagedMappingVerified') is True,
            'Verified, ready and inactive stage required')
    require('supplementProof' not in proof, 'A preview supplement is already recorded')
    paths = {'code': ROOT / ('gravuru-2027-complete-' + args.commit[:8]), 'gallery': STAGE / 'gallery',
             'mapping': STAGE / 'staged-import.json', 'config': STAGE / 'config.json'}
    require(all(proof.get(key) == str(path) for key, path in paths.items()), 'Stage paths differ')
    for field, file, private in [
        ('galleryManifestSha256', paths['gallery'] / 'manifest.json', True),
        ('mappingSha256', paths['mapping'], True), ('configSha256', paths['config'], True),
        ('activeConfigSha256', ACTIVE / 'config.json', True), ('wrapperSha256', paths['code'] / 'app.cjs', False)]:
        require(is_digest(proof.get(field)) and digest(checked(file, private=private)) == proof[field], 'Stage content changed: ' + field)
    require(proof.get('beforeMappingSha256') != proof['mappingSha256']
            and digest(checked(DATA / 'local-review-import.json')) == proof.get('beforeMappingSha256'), 'Stage mapping is already active or changed')
    require(not any(STAGE.glob('activation-backup-*/ACTIVATION-RECEIPT.json'))
            and not any((STAGE / name).exists() or (STAGE / name).is_symlink()
                        for name in ('ACTIVATED', 'ACTIVATED.json', 'ACTIVATION-RECEIPT.json')), 'Stage was already activated')
    require(read_json(paths['gallery'] / '.gravuru-slate-review.json') ==
            {'schema': 1, 'purpose': 'slate-review-gallery', 'origin': ORIGIN}, 'Wrong gallery marker')
    current = read_json(ACTIVE / 'config.json')
    staged = read_json(paths['config'])
    for config, gallery in ((current, ACTIVE / 'gallery-4'), (staged, paths['gallery'])):
        require(config.get('schema') == 1 and config.get('purpose') == 'private-test-runtime'
                and config.get('values', {}).get('GRAVURU_TEST_ORIGIN') == ORIGIN
                and config['values'].get('GRAVURU_PRIVATE_DATA_DIR') == str(DATA)
                and config['values'].get('GRAVURU_SLATE_REVIEW_PACKAGE') == str(gallery), 'Wrong private site configuration')
    expected = decode_json(json_bytes(current))
    expected['values']['GRAVURU_SLATE_REVIEW_PACKAGE'] = str(paths['gallery'])
    require(staged == expected, 'Configuration differs beyond the inactive gallery path')
    return proof, paths


def descriptors(rows):
    require(isinstance(rows, list), 'File inventory required')
    result = {}
    for row in rows:
        require(isinstance(row, dict) and set(row) == {'file', 'bytes', 'sha256'}, 'Invalid file descriptor')
        name = relative(row['file'])
        require(name not in result and type(row['bytes']) is int and row['bytes'] >= 0 and is_digest(row['sha256']), 'Duplicate or invalid file descriptor')
        result[name] = row
    return result


def checked_image(raw, name):
    """Require a complete PNG or WebP container, never SVG/HTML under an image name."""
    if name.endswith('.png'):
        require(raw[:8] == b'\x89PNG\r\n\x1a\n', 'Invalid PNG signature')
        pos = 8; kinds = []
        while pos + 12 <= len(raw):
            length = struct.unpack('>I', raw[pos:pos + 4])[0]
            kind = raw[pos + 4:pos + 8]; end = pos + 8 + length
            require(end + 4 <= len(raw), 'Truncated PNG')
            require(zlib.crc32(raw[pos + 4:end]) & 0xffffffff == struct.unpack('>I', raw[end:end + 4])[0], 'PNG checksum differs')
            if not kinds:
                require(kind == b'IHDR' and length == 13, 'PNG header required')
                width, height = struct.unpack('>II', raw[pos + 8:pos + 16])
                require(0 < width <= 16384 and 0 < height <= 16384 and width * height <= 80_000_000, 'PNG dimensions exceed limit')
            require(kind not in (b'acTL', b'fcTL', b'fdAT'), 'Animated preview rejected')
            kinds.append(kind); pos = end + 4
            if kind == b'IEND':
                require(length == 0 and pos == len(raw), 'Trailing PNG content rejected')
                break
        require(pos == len(raw) and kinds.count(b'IHDR') == 1 and kinds[-1:] == [b'IEND'] and b'IDAT' in kinds, 'Incomplete PNG')
    else:
        require(name.endswith('.webp') and raw[:4] == b'RIFF' and raw[8:12] == b'WEBP'
                and len(raw) >= 20 and struct.unpack('<I', raw[4:8])[0] + 8 == len(raw), 'Invalid WebP container')
        pos = 12; kinds = []
        while pos + 8 <= len(raw):
            kind = raw[pos:pos + 4]; size = struct.unpack('<I', raw[pos + 4:pos + 8])[0]
            pos += 8 + size + size % 2
            require(pos <= len(raw) and kind not in (b'ANIM', b'ANMF'), 'Invalid or animated WebP')
            kinds.append(kind)
        require(pos == len(raw) and any(k in (b'VP8 ', b'VP8L') for k in kinds), 'Incomplete WebP')


def eligible(original, mapped_ids):
    targets = original.get('targets', [])
    legacy_open = original.get('status') is None and targets and all(t.get('status') == 'open' for t in targets)
    require((original.get('status') == 'open' or legacy_open) and original.get('reviewSourcePreview') in (None, '')
            and original['id'] not in mapped_ids and not original.get('reusedTargetRefs')
            and not any(t.get('status') == 'prepared' or t.get('productId') for t in targets),
            'Original already has a preview or native target, or is not open')


def git_oid(kind, raw):
    return hashlib.sha1(kind.encode('ascii') + b' ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def git_tree(raw):
    entries = {}; pos = 0
    while pos < len(raw):
        space = raw.find(b' ', pos); end = raw.find(b'\0', space + 1)
        require(space > pos and end > space + 1 and end + 21 <= len(raw), 'Malformed Git tree object')
        mode = raw[pos:space]
        name = raw[space + 1:end].decode('utf-8')
        require(mode in (b'40000', b'100644', b'100755', b'120000', b'160000')
                and '/' not in name and '\\' not in name and name not in ('', '.', '..') and name not in entries,
                'Invalid or duplicate Git tree entry')
        entries[name] = (mode, raw[end + 1:end + 21].hex())
        pos = end + 21
    return entries


def verify_git_evidence(payloads, pack):
    """Authenticate raw Git objects to fixed commits, never to asserted hashes alone."""
    proof_file = 'evidence/git/proof.json'
    require(proof_file in payloads, 'Pinned catalogue Git proof missing')
    proof = decode_json(payloads[proof_file])
    expected_pins = {'deliveryCommit': SOURCE_COMMIT, 'catalogueCommit': CATALOGUE_COMMIT}
    actual_pins = {p.get(key) for p in [pack, *pack.get('sourcePackages', [])]
                   for key in ('sourceCommit', 'catalogueCommit', 'deliveryCommit')}
    require(proof.get('schema') == 'gravuru-pinned-catalogue-image-proof/v1' and proof.get('commitPins') == expected_pins
            and set(expected_pins.values()) <= actual_pins, 'Git commit pins differ from the staged package')
    records = proof.get('objects'); commits = proof.get('commits')
    require(isinstance(records, list) and records and isinstance(commits, list) and commits, 'Git object inventory required')
    objects = {}; files = {proof_file}
    for record in records:
        oid = record.get('oid'); kind = record.get('type')
        require(is_digest(oid, 40) and kind in ('commit', 'tree') and oid not in objects, 'Invalid or duplicate Git object')
        file = 'evidence/git/objects/' + oid + '.' + kind
        require(record.get('file') == file and file in payloads and file not in files, 'Git object path differs')
        raw = payloads[file]
        require(type(record.get('bytes')) is int and record['bytes'] == len(raw) and record.get('sha256') == sha(raw)
                and git_oid(kind, raw) == oid, 'Git object bytes do not match their identity')
        objects[oid] = (kind, raw); files.add(file)
    require(files == set(payloads), 'Unreferenced Git evidence file')
    roots = {}
    for commit in commits:
        oid = commit.get('oid')
        require(oid in expected_pins.values() and oid not in roots and objects.get(oid, (None,))[0] == 'commit'
                and commit.get('file') == 'evidence/git/objects/' + oid + '.commit', 'Unpinned Git commit')
        raw = objects[oid][1]
        first = raw.split(b'\n', 1)[0]
        require(re.fullmatch(rb'tree [a-f0-9]{40}', first) is not None, 'Git commit root tree missing')
        tree = first[5:].decode('ascii')
        require(commit.get('tree') == tree and objects.get(tree, (None,))[0] == 'tree', 'Git commit root tree differs')
        roots[oid] = tree
    require({oid for oid, (kind, _) in objects.items() if kind == 'commit'} == set(roots), 'Unreferenced commit object')
    trees = {oid: git_tree(raw) for oid, (kind, raw) in objects.items() if kind == 'tree'}
    return {'roots': roots, 'trees': trees, 'files': files}


def git_file_blob(evidence, commit, file):
    require(commit in evidence['roots'], 'Catalogue image commit is unproven')
    parts = relative(file).split('/'); tree = evidence['roots'][commit]
    for i, name in enumerate(parts):
        require(tree in evidence['trees'] and name in evidence['trees'][tree], 'Catalogue image path is absent from pinned Git trees')
        mode, oid = evidence['trees'][tree][name]
        if i == len(parts) - 1:
            require(mode in (b'100644', b'100755'), 'Catalogue image is not a regular Git blob')
            return oid
        require(mode == b'40000', 'Catalogue image path crosses a non-directory Git entry')
        tree = oid


def validate_supplement(archive, args, gallery, pack, old_index):
    require(digest(checked(archive)) == args.zip_sha256, 'Preview archive digest differs')
    by_id = {row['id']: row for row in pack['originals']}
    require(len(by_id) == len(pack['originals']), 'Duplicate gallery original')
    mapped_ids = {key for product in pack.get('products', []) for key in product.get('designIds', [])}
    with zipfile.ZipFile(archive) as zipped:
        infos = zipped.infolist(); names = [i.filename for i in infos]
        require(len(names) == len(set(names)) and len(names) <= 5003, 'Duplicate or excessive archive entries')
        require(sum(i.file_size for i in infos) <= MAX_ARCHIVE, 'Preview archive exceeds limit')
        for info in infos:
            relative(info.filename)
            require(not info.is_dir() and not info.flag_bits & 1 and stat.S_IFMT(info.external_attr >> 16) in (0, stat.S_IFREG)
                    and info.file_size <= (MAX_JSON if info.filename.endswith('.json') else MAX_GIT_OBJECT if info.filename.endswith(('.commit', '.tree')) else MAX_FILE), 'Unsafe archive member')
        index_raw = zipped.read('files-sha256.json'); incoming = descriptors(decode_json(index_raw))
        require(set(names) == set(incoming) | {'files-sha256.json'}, 'Archive inventory differs')
        require('files-sha256.json' not in incoming and {'supplement-manifest.json', 'preparation-proof.json'} <= set(incoming), 'Missing supplement proof')
        git_payloads = {}; image_blobs = {}
        for name, descriptor in incoming.items():
            raw = zipped.read(name)
            require(len(raw) == descriptor['bytes'] and sha(raw) == descriptor['sha256'], 'Archive member checksum differs')
            if name == 'evidence/git/proof.json' or re.fullmatch(r'evidence/git/objects/[a-f0-9]{40}\.(commit|tree)', name):
                git_payloads[name] = raw
                require(sum(len(b) for b in git_payloads.values()) <= 64 * 1024**2, 'Git evidence exceeds bounded verification size')
            elif name not in ('supplement-manifest.json', 'preparation-proof.json'):
                require(re.fullmatch(r'originals/_source-previews/[a-f0-9]{24}\.(png|webp)', name), 'Only isolated preview images are permitted')
                checked_image(raw, name)
                image_blobs[name] = git_oid('blob', raw)
        manifest_raw = zipped.read('supplement-manifest.json'); preparation_raw = zipped.read('preparation-proof.json')
    require(sha(manifest_raw) == args.manifest_sha256, 'Supplement manifest digest differs')
    manifest = decode_json(manifest_raw); proof = decode_json(preparation_raw)
    for value, schema in ((manifest, 'gravuru-source-preview-supplement/v1'), (proof, 'gravuru-source-preview-preparation-proof/v1')):
        require(value.get('schema') == schema and value.get('sourceCommit') == SOURCE_COMMIT and value.get('deliveryCommit') == SOURCE_COMMIT
                and value.get('reviewOnly') is True and value.get('released') is False, 'Unpinned or released preview package')
    renderer = proof.get('renderer', {})
    require(proof.get('pinnedSourceVerified') is True and proof.get('originalSourcesVerified') is True
            and renderer.get('name') == 'isolated-chromium' and isinstance(renderer.get('version'), str) and renderer['version']
            and all(renderer.get(k) is True for k in ('offline', 'explicitFonts', 'glyphCoverageChecked')), 'Verified isolated rendering proof required')
    sources = {}
    for source in proof.get('sources', []):
        name = relative(source['file'])
        require(name not in sources and is_digest(source.get('sha256')) and is_digest(source.get('blob'), 40)
                and type(source.get('bytes')) is int and source['bytes'] >= 0, 'Invalid pinned source evidence')
        sources[name] = source
    rows = manifest.get('rows'); blocked = manifest.get('blocked')
    require(isinstance(rows, list) and rows and isinstance(blocked, list) and len(rows) + len(blocked) <= 5000, 'Preview rows required')
    existing_rows = [r for r in rows if r.get('provenanceKind') == 'existing-source-image']
    catalogue_rows = [r for r in rows if r.get('provenanceKind') == 'pinned-catalogue-image']
    git_evidence = None
    if catalogue_rows:
        require(manifest.get('gitProof') == 'evidence/git/proof.json' and proof.get('gitProof') == manifest['gitProof'], 'Catalogue image Git evidence reference missing')
        git_evidence = verify_git_evidence(git_payloads, pack)
    else:
        require(not git_payloads, 'Unexpected catalogue Git evidence')
    rendering_blockers = manifest.get('renderingBlockers', [])
    require(isinstance(rendering_blockers, list) and proof.get('renderingBlockers', []) == rendering_blockers, 'Rendering blocker evidence differs')
    counts = {'requested': len(rows) + len(blocked), 'rendered': len(rows) - len(existing_rows) - len(catalogue_rows), 'blocked': len(blocked), 'pending': 0}
    if existing_rows or 'available' in manifest.get('counts', {}):
        counts.update({'available': len(rows), 'existingOriginalPreviews': len(existing_rows), 'renderingBlockers': len(rendering_blockers)})
    if catalogue_rows or 'pinnedCataloguePreviews' in manifest.get('counts', {}):
        counts['pinnedCataloguePreviews'] = len(catalogue_rows)
    require(manifest.get('complete') is True and manifest.get('counts') == counts and proof.get('counts') == counts, 'Complete preparation with matching counts required')
    ids = set(); previews = set()
    for row in rows:
        original_id = row.get('originalId')
        require(original_id in by_id and original_id not in ids, 'Missing, duplicate or mismatched original ID')
        ids.add(original_id); original = by_id[original_id]; eligible(original, mapped_ids)
        require(row.get('sourceOriginalId') == original.get('sourceOriginalId', original_id)
                and row.get('reviewOnly') is True and row.get('released') is False, 'Original source identity differs')
        preview = relative(row['preview'])
        expected_prefix = 'originals/_source-previews/' + sha(original_id.encode('utf-8'))[:24]
        require(preview in (expected_prefix + '.png', expected_prefix + '.webp') and preview not in previews
                and preview not in old_index and not safe(gallery, preview).exists(), 'Existing or mismatched preview path')
        previews.add(preview)
        require(incoming.get(preview) == {'file': preview, 'bytes': row.get('bytes'), 'sha256': row.get('sha256')}, 'Preview descriptor differs')
        source = row.get('source', {})
        if row.get('provenanceKind') == 'pinned-catalogue-image':
            source_name = relative(source.get('file'))
            original_path = original.get('source')
            require(isinstance(original_path, str) and original_path, 'Canonical catalogue source missing')
            expected_source = original_path[:-len('design.json')] + 'preview.png' if original_path.endswith('/design.json') else original_path.rstrip('/') + '/preview.png'
            require(source_name == expected_source and source.get('kind') == 'pinned-catalogue-image' and 'galleryFile' not in source
                    and row.get('fonts') == [] and row.get('photos') == [] and preview.endswith('.png'), 'Catalogue image source/provenance differs')
            require(source.get('sha256') == row['sha256'] and is_digest(source.get('gitBlob'), 40)
                    and source['gitBlob'] == image_blobs[preview]
                    and git_file_blob(git_evidence, source.get('commit'), source_name) == source['gitBlob'], 'Catalogue PNG bytes are not the pinned Git blob')
            continue
        if row.get('provenanceKind') == 'existing-source-image':
            gallery_file = relative(source.get('galleryFile'))
            require(gallery_file in ('originals/' + original_id + '/preview.png', 'originals/' + original_id + '/design.png')
                    and source.get('kind') == 'preserved-gallery-original' and row.get('fonts') == [] and row.get('photos') == [],
                    'Existing preview must be this original\'s unchanged PNG without rendering claims')
            require(source.get('sha256') == row['sha256'] and preview.endswith('.png')
                    and old_index.get(gallery_file) == {'file': gallery_file, 'bytes': row['bytes'], 'sha256': row['sha256']}, 'Original PNG index or copied bytes differ')
            original_files = [r for r in original.get('files', []) if r.get('name') == PurePosixPath(gallery_file).name]
            require(len(original_files) == 1 and original_files[0].get('sha256') == row['sha256'] and original_files[0].get('bytes') == row['bytes'], 'Original PNG file evidence differs')
            actual = checked(safe(gallery, gallery_file))
            require(actual.stat().st_size == row['bytes'] and digest(actual) == row['sha256'], 'Original PNG bytes differ')
            continue
        require(row.get('provenanceKind', 'rendered-source-svg') == 'rendered-source-svg', 'Unknown preview provenance')
        source_name = relative(source.get('file')); gallery_file = 'originals/' + original_id + '/design.svg'
        require(source.get('galleryFile') == gallery_file and is_digest(source.get('sha256'))
                and old_index.get(gallery_file, {}).get('sha256') == source['sha256'], 'Original SVG evidence differs')
        actual_source = checked(safe(gallery, gallery_file))
        require(actual_source.stat().st_size == old_index[gallery_file]['bytes'] and digest(actual_source) == source['sha256'], 'Original SVG bytes differ')
        # Original SVGs are already pinned by the staged package inventory.
        # The preparation source list separately pins font/photo Git blobs;
        # it need not repeat every preserved original SVG.
        require(source.get('kind') in ('pinned-catalogue-original', 'preserved-gallery-original'), 'Unknown original source provenance')
        if source_name in sources:
            require(sources[source_name]['sha256'] == source['sha256'], 'Original source evidence disagrees')
        if isinstance(original.get('source'), str):
            original_path = original['source']
            expected_source = original_path[:-len('design.json')] + 'design.svg' if original_path.endswith('/design.json') else original_path.rstrip('/') + '/design.svg'
            require(source_name == expected_source, 'Original catalogue source path differs')
        require(isinstance(row.get('fonts'), list) and row['fonts'] and isinstance(row.get('photos'), list), 'Font and photo evidence required')
        for resource in row['fonts'] + row['photos']:
            resource_name = relative(resource.get('file'))
            require(is_digest(resource.get('sha256')) and sources.get(resource_name, {}).get('sha256') == resource['sha256'], 'Font/photo source hash is unproven')
        for font in row['fonts']:
            require(isinstance(font.get('name'), str) and font['name'] and isinstance(font.get('sourceName'), str) and font['sourceName']
                    and type(font.get('substitution')) is bool, 'Invalid font evidence')
            if font['substitution']:
                require(isinstance(font.get('substitutionSource'), str) and font['substitutionSource'], 'Documented font substitution required')
    for row in blocked:
        require(row.get('originalId') in by_id and row['originalId'] not in ids and isinstance(row.get('reason'), str) and row['reason'], 'Invalid blocked original')
        ids.add(row['originalId']); eligible(by_id[row['originalId']], mapped_ids)
    blocker_ids = set(); existing_ids = {r['originalId'] for r in existing_rows}
    for blocker in rendering_blockers:
        require(blocker.get('originalId') in existing_ids and blocker['originalId'] not in blocker_ids
                and blocker.get('coveredByExistingOriginalPreview') is True and isinstance(blocker.get('reason'), str) and blocker['reason'],
                'Rendering blocker lacks an unchanged original preview')
        blocker_ids.add(blocker['originalId'])
    require(set(incoming) == previews | {'supplement-manifest.json', 'preparation-proof.json'} | set(git_payloads), 'Unreferenced archive image')
    return {'manifest': manifest, 'manifestRaw': manifest_raw, 'preparationRaw': preparation_raw,
            'indexRaw': index_raw, 'descriptors': incoming, 'gitPayloads': git_payloads}


def apply(args):
    os.umask(0o077)
    checked(STAGE, directory=True)
    with metadata_lock():
        stage_proof, paths = verify_stage(args)
        gallery = paths['gallery']; archive = STAGE / 'source-previews.zip'
        old_manifest_raw = (gallery / 'manifest.json').read_bytes()
        old_index_raw = checked(gallery / 'files-sha256.json').read_bytes()
        old_ready_raw = (STAGE / 'STAGE-READY.json').read_bytes()
        pack = decode_json(old_manifest_raw); old_index = descriptors(decode_json(old_index_raw))
        require(pack.get('schema') in ('gravuru-design-original-review/v1', 'gravuru-slate-original-review/v1')
                and pack.get('reviewOnly') is True and pack.get('released') is False, 'Unpublished gallery required')
        require(old_index.get('manifest.json') == {'file': 'manifest.json', 'bytes': len(old_manifest_raw), 'sha256': sha(old_manifest_raw)}, 'Gallery index differs from ready manifest')
        for name in old_index:
            safe(gallery, name)
        package = validate_supplement(archive, args, gallery, pack, old_index)
        rows = package['manifest']['rows']; by_id = {r['id']: r for r in pack['originals']}
        for row in rows:
            by_id[row['originalId']]['reviewSourcePreview'] = row['preview']
        next_manifest = json_bytes(pack)
        next_index = dict(old_index)
        next_index['manifest.json'] = {'file': 'manifest.json', 'bytes': len(next_manifest), 'sha256': sha(next_manifest)}
        for row in rows:
            next_index[row['preview']] = package['descriptors'][row['preview']]
        next_index_raw = json_bytes([next_index[k] for k in sorted(next_index)])
        backup = STAGE / ('preview-supplement-' + args.zip_sha256[:16])
        require(not backup.exists() and not backup.is_symlink(), 'Fresh supplement backup required')
        require(shutil.disk_usage(STAGE).free > sum(r['bytes'] for r in rows) + 4 * (len(old_manifest_raw) + len(next_manifest) + len(old_index_raw) + len(next_index_raw)) + 16 * 1024**2, 'Insufficient preview staging storage')
        # Recheck pins after full ZIP/source validation, before the first write.
        verify_stage(args)
        require(digest(gallery / 'files-sha256.json') == sha(old_index_raw) and digest(archive) == args.zip_sha256, 'Input changed during preview validation')
        backup.mkdir(mode=0o700)
        for name, raw in [('previous-manifest.json', old_manifest_raw), ('previous-files-sha256.json', old_index_raw),
                          ('previous-STAGE-READY.json', old_ready_raw), ('supplement-manifest.json', package['manifestRaw']),
                          ('preparation-proof.json', package['preparationRaw']), ('supplement-files-sha256.json', package['indexRaw']),
                          ('next-manifest.json', next_manifest), ('next-files-sha256.json', next_index_raw),
                          ('rollback-manifest.json', old_manifest_raw), ('rollback-files-sha256.json', old_index_raw), ('rollback-STAGE-READY.json', old_ready_raw)]:
            write_new(backup / name, raw)
        for name, raw in package['gitPayloads'].items():
            file = safe(backup, name); file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            write_new(file, raw)
        if package['gitPayloads']:
            for directory in (backup / 'evidence/git/objects', backup / 'evidence/git', backup / 'evidence'):
                fsync_directory(directory)
        pending = {**stage_proof, 'ready': False, 'previewSupplementPending': args.zip_sha256}
        write_new(backup / 'pending-STAGE-READY.json', json_bytes(pending))
        report = {'schema': 'gravuru-complete-gallery-preview-install/v1', 'createdAtUtc': datetime.now(timezone.utc).isoformat(),
                  'ready': True, 'sourceCommit': args.commit, 'catalogueCommit': SOURCE_COMMIT,
                  'helperSha256': digest(Path(__file__).resolve()),
                  'archiveSha256': args.zip_sha256, 'manifestSha256': args.manifest_sha256,
                  'preparationProofSha256': sha(package['preparationRaw']), 'previousStageProofSha256': args.stage_proof_sha256,
                  'previousGalleryManifestSha256': sha(old_manifest_raw), 'previousGalleryIndexSha256': sha(old_index_raw),
                  'galleryManifestSha256': sha(next_manifest), 'galleryIndexSha256': sha(next_index_raw),
                  'previewsAdded': len(rows), 'blocked': len(package['manifest']['blocked']),
                  'gallery': str(gallery), 'backup': str(backup), 'metadataFieldsChanged': ['originals[].reviewSourcePreview'],
                  'originalsTargetsAndNativeFilesPreserved': True, 'activeMappingPreserved': True,
                  'configurationWrites': 0, 'databaseWrites': 0, 'shopifyWrites': 0, 'activated': False}
        if package['gitPayloads']:
            report.update({'gitProofSha256': sha(package['gitPayloads']['evidence/git/proof.json']),
                           'pinnedCataloguePreviews': package['manifest']['counts']['pinnedCataloguePreviews']})
        report_raw = json_bytes(report)
        write_new(backup / 'SUPPLEMENT-PREPARED.json', report_raw)
        supplement_proof = {k: report[k] for k in ('archiveSha256', 'manifestSha256', 'preparationProofSha256', 'previousGalleryManifestSha256', 'galleryManifestSha256', 'galleryIndexSha256', 'previewsAdded', 'blocked')}
        supplement_proof.update({'file': str(backup / 'SUPPLEMENT-READY.json'), 'sha256': sha(report_raw)})
        final_proof = {**stage_proof, 'galleryManifestSha256': sha(next_manifest), 'supplementProof': supplement_proof}
        write_new(backup / 'next-STAGE-READY.json', json_bytes(final_proof))
        fsync_directory(backup)
        created = []; pending_installed = False
        try:
            # A crash after this point leaves the stage non-activatable. The
            # external immutable backups support explicit operator recovery.
            os.replace(backup / 'pending-STAGE-READY.json', STAGE / 'STAGE-READY.json'); pending_installed = True
            fsync_directory(STAGE)
            preview_directory = safe(gallery, 'originals/_source-previews')
            preview_directory.mkdir(mode=0o700, exist_ok=True); checked(preview_directory, directory=True)
            fsync_directory(preview_directory.parent)
            with zipfile.ZipFile(archive) as zipped:
                for row in rows:
                    raw = zipped.read(row['preview'])
                    require(len(raw) == row['bytes'] and sha(raw) == row['sha256'], 'Preview changed after validation')
                    target = safe(gallery, row['preview'])
                    require(not target.exists(), 'Preview appeared during installation')
                    write_new(target, raw, created=created)
                    require(target.stat().st_size == row['bytes'] and digest(target) == row['sha256'], 'Installed preview readback differs')
            fsync_directory(preview_directory)
            os.replace(backup / 'next-manifest.json', gallery / 'manifest.json')
            os.replace(backup / 'next-files-sha256.json', gallery / 'files-sha256.json')
            fsync_directory(gallery)
            require(digest(gallery / 'manifest.json') == report['galleryManifestSha256'] and digest(gallery / 'files-sha256.json') == report['galleryIndexSha256'], 'Metadata readback differs')
            for file, expected in [(DATA / 'local-review-import.json', stage_proof['beforeMappingSha256']),
                                   (paths['mapping'], stage_proof['mappingSha256']), (paths['config'], stage_proof['configSha256']),
                                   (ACTIVE / 'config.json', stage_proof['activeConfigSha256'])]:
                require(digest(checked(file)) == expected, 'Protected active/staged metadata changed')
            os.replace(backup / 'SUPPLEMENT-PREPARED.json', backup / 'SUPPLEMENT-READY.json')
            fsync_directory(backup)
            os.replace(backup / 'next-STAGE-READY.json', STAGE / 'STAGE-READY.json')
            fsync_directory(STAGE)
            require((STAGE / 'STAGE-READY.json').read_bytes() == json_bytes(final_proof), 'Ready proof readback differs')
        except BaseException:
            if pending_installed:
                os.replace(backup / 'rollback-manifest.json', gallery / 'manifest.json')
                os.replace(backup / 'rollback-files-sha256.json', gallery / 'files-sha256.json')
                for file in created:
                    if file.exists():
                        file.unlink()
                if created:
                    fsync_directory(created[0].parent)
                fsync_directory(gallery)
                require(digest(gallery / 'manifest.json') == sha(old_manifest_raw) and digest(gallery / 'files-sha256.json') == sha(old_index_raw), 'Rollback needs operator recovery; stage remains disabled')
                os.replace(backup / 'rollback-STAGE-READY.json', STAGE / 'STAGE-READY.json')
                fsync_directory(STAGE)
                if (backup / 'SUPPLEMENT-READY.json').exists():
                    os.replace(backup / 'SUPPLEMENT-READY.json', backup / 'SUPPLEMENT-ROLLED-BACK.json')
            raise
        return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--zip-sha256', required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--stage-proof-sha256', required=True)
    try:
        print(json.dumps(apply(parser.parse_args())))
    except Exception as error:
        raise SystemExit('Private preview supplement stopped: ' + str(error))
