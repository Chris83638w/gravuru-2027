import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { crc32, deflateRawSync } from 'node:zlib';
import { AMAZON_CUSTOM_LIMITS as L, inspectAmazonCustomSample, prepareAmazonCustomDownloadPlan } from './amazon-custom.mjs';
const source = { classification: 'synthetic', operatorApproved: true };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inspectJson = value => inspectAmazonCustomSample({ bytes: Buffer.from(value), format: 'json', source });
// Independent ZIP constructor, including intentionally invalid headers for rejection tests.
function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const e of entries) {
    const body = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data ?? '{}');
    const name = Buffer.from(e.name), localName = Buffer.from(e.localName ?? e.name), method = e.method ?? 8, flags = e.flags ?? 0x800;
    const compressed = e.compressed ?? (method === 8 ? deflateRawSync(body) : body), original = e.originalSize ?? body.length, checksum = e.crc ?? crc32(body);
    const l = Buffer.alloc(30), c = Buffer.alloc(46), extra = e.extra ?? Buffer.alloc(0);
    l.writeUInt32LE(0x04034b50); l.writeUInt16LE(20, 4); l.writeUInt16LE(flags, 6); l.writeUInt16LE(method, 8);
    if (!(flags & 8)) { l.writeUInt32LE(checksum, 14); l.writeUInt32LE(compressed.length, 18); l.writeUInt32LE(original, 22); }
    l.writeUInt16LE(localName.length, 26); l.writeUInt16LE(extra.length, 28);
    const descriptor = flags & 8 ? Buffer.alloc(16) : Buffer.alloc(0);
    if (flags & 8) { descriptor.writeUInt32LE(0x08074b50); descriptor.writeUInt32LE(checksum, 4); descriptor.writeUInt32LE(compressed.length, 8); descriptor.writeUInt32LE(original, 12); }
    c.writeUInt32LE(0x02014b50); c.writeUInt16LE(0x0314, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(flags, 8); c.writeUInt16LE(method, 10);
    c.writeUInt32LE(checksum, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(original, 24); c.writeUInt16LE(name.length, 28); c.writeUInt16LE(extra.length, 30);
    c.writeUInt32LE(e.attrs ?? 0, 38); c.writeUInt32LE(e.offset ?? offset, 42);
    local.push(l, localName, extra, compressed, descriptor); central.push(c, name, extra);
    offset += l.length + localName.length + extra.length + compressed.length + descriptor.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
const inspectZip = entries => inspectAmazonCustomSample({ bytes: zip(entries), format: 'zip', source });

test('every real-data gate must be exactly true; a passed gate still cannot download', () => {
  for (const gate of [{}, { restrictedRoleApproved: true }, { restrictedRoleApproved: true, appAuthorized: true },
    { restrictedRoleApproved: 'true', appAuthorized: true, realDataApproved: true }]) {
    const result = prepareAmazonCustomDownloadPlan(gate); assert.equal(result.status, 'blocked'); assert.equal(result.canDownload, false);
  }
  const result = prepareAmazonCustomDownloadPlan({ restrictedRoleApproved: true, appAuthorized: true, realDataApproved: true, url: 'https://PRIVATE.invalid?token=SECRET' });
  assert.equal(result.roleGatePassed, true); assert.equal(result.networkEnabled, false); assert.equal(result.canDownload, false);
  assert.equal(JSON.stringify(result).includes('SECRET'), false); assert.equal(Object.hasOwn(result, 'url'), false);
});

test('sample inspector never accepts real data or an unapproved sample classification', () => {
  for (const value of [undefined, {}, { classification: 'real', operatorApproved: true },
    { classification: 'anonymized', operatorApproved: false }]) {
    assert.throws(() => inspectAmazonCustomSample({ bytes: Buffer.from('{}'), format: 'json', source: value }), { code: 'amazon_custom_sample_approval' });
  }
  assert.equal(inspectAmazonCustomSample({ bytes: Buffer.from('{}'), format: 'json', source: { ...source, classification: 'anonymized' } }).sourceClassification, 'anonymized');
});

test('JSON reports heuristic candidate paths and unknown fields without claiming production mapping', () => {
  const bytes = Buffer.from(JSON.stringify({ title: 'synthetic metadata', surfaces: [{ text: 'TEST NAME', image: 'image.png',
    designVariant: 'A', placement: { x: 12, y: 10, width: 30, height: 20 }, unexplained: 7 }] }));
  const result = inspectAmazonCustomSample({ bytes, format: 'json', source });
  assert.equal(result.originalSha256, hash(bytes)); assert.equal(result.inventory[0].sha256, hash(bytes));
  assert.ok(result.candidates.some(c => c.path === '/surfaces/0/text' && c.kind === 'text' && c.value === 'TEST NAME'));
  assert.ok(result.candidates.some(c => c.path === '/surfaces/0/placement/x' && c.kind === 'placement'));
  assert.ok(result.unknownFields.some(c => c.path === '/surfaces/0/unexplained'));
  assert.equal(result.reviewRequired, true); assert.equal(result.productionReady, false); assert.equal(result.rendered, false);
});

test('signed/external reference values remain redacted and are never treated as fetched images', () => {
  const result = inspectJson('{"customizedUrl":"https://example.invalid/private?secret=SECRET","image":"data:image/png;base64,SECRET"}');
  assert.equal(JSON.stringify(result).includes('SECRET'), false);
  assert.ok(result.candidates.every(c => c.value === null && c.valueRedacted === 'external_reference'));
});

test('an unrecognized nested placement field stays unknown even when a heuristic parent suggests its meaning', () => {
  const result = inspectJson('{"placement":{"unknownMeasurement":5},"customContainer":[]}');
  assert.ok(result.unknownFields.some(f => f.path === '/placement/unknownMeasurement'));
  assert.ok(result.unknownFields.some(f => f.path === '/customContainer' && f.type === 'array'));
  assert.equal(result.reviewRequired, true);
});

test('JSON duplicate keys, prototype keys, nonfinite numbers, deep input and malformed UTF-8 fail', () => {
  for (const value of ['{"text":"a","text":"b"}', '{"text":"a","te\\u0078t":"b"}', '{"__proto__":{}}', '{"constructor":{}}']) {
    assert.throws(() => inspectJson(value), { code: 'amazon_custom_json_key' });
  }
  assert.throws(() => inspectJson('{"x":1e999}'), { code: 'amazon_custom_json_number' });
  assert.throws(() => inspectJson('['.repeat(40) + '0' + ']'.repeat(40)), { code: 'amazon_custom_json_limit' });
  assert.throws(() => inspectJson('"only a string"'), { code: 'amazon_custom_json_root' });
  assert.throws(() => inspectJson('{bad json}'), { code: 'amazon_custom_json' });
  assert.throws(() => inspectAmazonCustomSample({ bytes: Buffer.from([0xff]), format: 'json', source }), { code: 'amazon_custom_encoding' });
});

test('ZIP inventory retains byte hashes across stored, deflated and descriptor members without extraction', () => {
  const json = '{"text":"SYNTHETIC","variant":"blue"}', image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const entries = [{ name: 'custom.json', data: json, method: 0 }, { name: 'assets/', data: '', method: 0 },
    { name: 'assets/photo.png', data: image, flags: 0x808 }, { name: 'readme.txt', data: 'sample only' }];
  const bytes = zip(entries), original = Buffer.from(bytes), result = inspectAmazonCustomSample({ bytes, format: 'zip', source });
  assert.equal(result.originalSha256, hash(bytes)); assert.equal(result.inventory.length, 4);
  assert.equal(result.inventory.find(f => f.name === 'assets/photo.png').sha256, hash(image));
  assert.equal(result.inventory.find(f => f.name === 'assets/photo.png').inspection, 'inventory_only_not_decoded');
  assert.equal(result.warnings[0].file, 'readme.txt'); assert.deepEqual(bytes, original);
  assert.equal(Object.hasOwn(result.inventory[0], 'content'), false);
});

test('ZIP traversal, URL/absolute paths, duplicate canonical paths and file-directory collisions fail', () => {
  for (const name of ['../custom.json', '/custom.json', 'C:/custom.json', 'a\\custom.json', 'a//custom.json',
    './custom.json', 'a/%2e%2e/custom.json', 'https://host/file.json', 'a/CON.json', 'a./custom.json', 'a/\u202ecustom.json']) {
    assert.throws(() => inspectZip([{ name }]), { code: 'amazon_custom_path' });
  }
  for (const names of [['A.json', 'a.json'], ['ä.json', 'a\u0308.json'], ['a/', 'a']]) {
    assert.throws(() => inspectZip(names.map(name => ({ name, data: name.endsWith('/') ? '' : '{}' }))), { code: 'amazon_custom_zip_duplicate' });
  }
  assert.throws(() => inspectZip([{ name: 'a', data: '' }, { name: 'a/file.json' }]), { code: 'amazon_custom_zip_path_conflict' });
});

test('ZIP symlinks, encryption, unsupported methods, ZIP64 and multi-volume formats fail', () => {
  assert.throws(() => inspectZip([{ name: 'custom.json', attrs: 0xa1ff0000 }]), { code: 'amazon_custom_zip_special_file' });
  for (const flags of [1, 0x40]) assert.throws(() => inspectZip([{ name: 'custom.json', flags }]), { code: 'amazon_custom_zip_unsupported' });
  assert.throws(() => inspectZip([{ name: 'custom.json', method: 12 }]), { code: 'amazon_custom_zip_unsupported' });
  const extra = Buffer.alloc(4); extra.writeUInt16LE(1);
  assert.throws(() => inspectZip([{ name: 'custom.json', extra }]), { code: 'amazon_custom_zip_extra_unsupported' });
  const bytes = zip([{ name: 'custom.json' }]); bytes.writeUInt16LE(1, bytes.length - 18);
  assert.throws(() => inspectAmazonCustomSample({ bytes, format: 'zip', source }), { code: 'amazon_custom_zip_unsupported' });
});

test('all ZIP headers, checksums and descriptors are checked; no partial successes escape', () => {
  assert.throws(() => inspectZip([{ name: 'good.json' }, { name: 'bad.json', crc: 0 }]), { code: 'amazon_custom_zip_crc' });
  assert.throws(() => inspectZip([{ name: 'custom.json', localName: 'other.json' }]), { code: 'amazon_custom_zip_local' });
  const bytes = zip([{ name: 'custom.json', flags: 0x808 }]), compressed = deflateRawSync(Buffer.from('{}'));
  bytes.writeUInt32LE(99, 30 + Buffer.byteLength('custom.json') + compressed.length + 8);
  assert.throws(() => inspectAmazonCustomSample({ bytes, format: 'zip', source }), { code: 'amazon_custom_zip_descriptor' });
  assert.throws(() => inspectAmazonCustomSample({ bytes: bytes.subarray(0, bytes.length - 1), format: 'zip', source }));
});

test('zip expansion, dishonest uncompressed lengths, excessive counts, nested archives and trailing deflate data fail', () => {
  assert.throws(() => inspectZip([{ name: 'custom.json', originalSize: L.fileBytes + 1 }]), { code: 'amazon_custom_zip_expansion_limit' });
  assert.throws(() => inspectZip([{ name: 'custom.json', data: 'x'.repeat(100000) }]), { code: 'amazon_custom_zip_expansion_limit' });
  assert.throws(() => inspectZip([{ name: 'custom.json', data: 'x'.repeat(10000), originalSize: 10 }]), { code: 'amazon_custom_zip_deflate' });
  assert.throws(() => inspectZip(Array.from({ length: 101 }, (_, i) => ({ name: `${i}.json` }))), { code: 'amazon_custom_zip_directory' });
  assert.throws(() => inspectZip([{ name: 'nested.zip', data: 'not opened' }]), { code: 'amazon_custom_nested_archive' });
  const compressed = Buffer.concat([deflateRawSync(Buffer.from('{}')), Buffer.from('junk')]);
  assert.throws(() => inspectZip([{ name: 'custom.json', compressed }]), { code: 'amazon_custom_zip_deflate' });
});

test('XML without entities is explicitly unsupported; DTD/entity documents are rejected', () => {
  const result = inspectZip([{ name: 'custom.xml', data: '<custom><text>SYNTHETIC</text></custom>' }]);
  assert.equal(result.inventory[0].inspection, 'unsupported_xml_not_parsed'); assert.deepEqual(result.candidates, []);
  for (const data of ['<!DOCTYPE x [<!ENTITY e SYSTEM "file:///secret">]><x/>', '<!ENTITY e "x"><x/>']) {
    assert.throws(() => inspectZip([{ name: 'custom.xml', data }]), { code: 'amazon_custom_xml_entities' });
  }
});

test('safe SVG subset remains unrendered inventory; active content and external references are blocked', () => {
  const safe = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><path id="shape" d="M0 0 L10 10"/></defs><use href="#shape"/></svg>';
  const result = inspectZip([{ name: 'position.svg', data: safe }]);
  assert.equal(result.inventory[0].inspection, 'unsupported_svg_not_rendered'); assert.equal(result.rendered, false);
  for (const data of ['<svg><script>alert(1)</script></svg>', '<svg onload="alert(1)"/>',
    '<svg><image href="https://evil.invalid/pixel"/></svg>', '<svg><image href="image.png"/></svg>',
    '<svg><image href="data:image/svg+xml,x"/></svg>', '<svg><path fill="url(https://evil.invalid/a)"/></svg>',
    '<svg><foreignObject/></svg>', '<svg><animate/></svg>', '<svg style="fill:red"/>',
    '<svg><use href="&#104;ttps://evil.invalid"/></svg>', '<?xml-stylesheet href="https://evil.invalid"?><svg/>']) {
    assert.throws(() => inspectZip([{ name: 'unsafe.svg', data }]));
  }
});

test('malformed SVG nesting/attributes and unsupported encodings cannot be mistaken for a sanitized document', () => {
  for (const data of ['<svg><g></svg>', '<svg/><svg/>', '<svg id="x" id="y"/>', '<svg><g x=2/></svg>', '<svg>&unknown;</svg>']) {
    assert.throws(() => inspectZip([{ name: 'bad.svg', data }]));
  }
  assert.throws(() => inspectZip([{ name: 'bad.svg', data: Buffer.from('<svg/>', 'utf16le') }]), { code: 'amazon_custom_encoding' });
});
