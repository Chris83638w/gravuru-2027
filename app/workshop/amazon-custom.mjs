import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { isRelativeSourcePath } from './design-source-path.mjs';
import { zipCrc32 } from './design-zip.mjs';

// Sample inspection only. No network, extraction, database or rendering capability.
export const AMAZON_CUSTOM_LIMITS = Object.freeze({ archiveBytes: 8 * 1024 * 1024, totalBytes: 16 * 1024 * 1024,
  fileBytes: 4 * 1024 * 1024, jsonBytes: 1024 * 1024, entries: 100, ratio: 100, depth: 32, nodes: 5000, candidates: 500 });
const L = AMAZON_CUSTOM_LIMITS;
const fail = (code = 'amazon_custom_invalid') => {
  throw Object.assign(new Error('Custom-Testdatei wurde aus Sicherheits- oder Formatgründen abgewiesen.'), { status: 422, code });
};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const utf8 = bytes => { try { const value = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (value.includes('\0')) fail(); return value; } catch { fail('amazon_custom_encoding'); } };
const pathKey = name => name.normalize('NFC').toLocaleLowerCase('en-US');
function safePath(name) {
  if (!isRelativeSourcePath(name) || /[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(name)) fail('amazon_custom_path');
  if (name.split('/').some(part => /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) fail('amazon_custom_path');
}

/** This gate never accepts/returns a download URL or credentials and cannot send anything. */
export function prepareAmazonCustomDownloadPlan({ restrictedRoleApproved, appAuthorized, realDataApproved } = {}) {
  const blockers = [];
  if (restrictedRoleApproved !== true) blockers.push('dtc_restricted_role_not_verified');
  if (appAuthorized !== true) blockers.push('app_authorization_not_verified');
  if (realDataApproved !== true) blockers.push('real_data_not_approved');
  return { schema: 'gravuru-amazon-custom-download-plan/v1', status: blockers.length ? 'blocked' : 'prerequisites_recorded',
    blockers, roleGatePassed: blockers.length === 0, canDownload: false, networkEnabled: false,
    requiresSecureDownloadImplementation: true, requiresOperationPermissionVerification: true };
}

function readZip(bytes) {
  if (bytes.length < 22 || bytes.length > L.archiveBytes) fail('amazon_custom_archive_limit');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const within = (p, n, end = bytes.length) => { if (p < 0 || n < 0 || p + n > end) fail('amazon_custom_zip_bounds'); };
  const u16 = p => view.getUint16(p, true), u32 = p => view.getUint32(p, true);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (u32(p) === 0x06054b50 && p + 22 + u16(p + 20) === bytes.length) { end = p; break; }
  }
  if (end < 0) fail('amazon_custom_zip_end');
  const count = u16(end + 10), directorySize = u32(end + 12), directory = u32(end + 16);
  if (u16(end + 4) || u16(end + 6) || u16(end + 8) !== count || count === 65535 ||
      directory === 0xffffffff || directorySize === 0xffffffff) fail('amazon_custom_zip_unsupported');
  if (!count || count > L.entries || directory + directorySize !== end) fail('amazon_custom_zip_directory');
  within(directory, directorySize, end);
  const entries = [], names = new Map(), ranges = [];
  let cursor = directory, total = 0;
  const checkExtras = (start, size) => {
    const last = start + size; within(start, size);
    while (start < last) {
      within(start, 4, last); const type = u16(start), length = u16(start + 2); within(start + 4, length, last);
      if ([0x0001, 0x0017, 0x7075, 0x9901].includes(type)) fail('amazon_custom_zip_extra_unsupported');
      start += length + 4;
    }
  };
  for (let i = 0; i < count; i++) {
    within(cursor, 46, end); if (u32(cursor) !== 0x02014b50) fail('amazon_custom_zip_directory');
    const flags = u16(cursor + 8), method = u16(cursor + 10), crc = u32(cursor + 16), compressedSize = u32(cursor + 20),
      size = u32(cursor + 24), nameSize = u16(cursor + 28), extraSize = u16(cursor + 30), commentSize = u16(cursor + 32),
      attrs = u32(cursor + 38), local = u32(cursor + 42);
    if (flags & ~0x080e || ![0, 8].includes(method) || u16(cursor + 34) || [size, compressedSize, local].includes(0xffffffff)) fail('amazon_custom_zip_unsupported');
    within(cursor + 46, nameSize + extraSize + commentSize, end);
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameSize);
    if (!(flags & 0x800) && rawName.some(n => n > 127)) fail('amazon_custom_encoding');
    const name = utf8(rawName), isDirectory = name.endsWith('/'), path = isDirectory ? name.slice(0, -1) : name;
    safePath(path); const key = pathKey(path);
    if (names.has(key)) fail('amazon_custom_zip_duplicate'); names.set(key, isDirectory);
    const mode = (attrs >>> 16) & 0xf000;
    if ((mode && mode !== (isDirectory ? 0x4000 : 0x8000)) || ((attrs & 0x10) && !isDirectory)) fail('amazon_custom_zip_special_file');
    total += size;
    if (size > L.fileBytes || total > L.totalBytes || size > Math.max(1, compressedSize) * L.ratio) fail('amazon_custom_zip_expansion_limit');
    if ((isDirectory && size !== 0) || (method === 0 && size !== compressedSize)) fail('amazon_custom_zip_size');
    checkExtras(cursor + 46 + nameSize, extraSize);
    within(local, 30, directory);
    if (u32(local) !== 0x04034b50 || u16(local + 6) !== flags || u16(local + 8) !== method) fail('amazon_custom_zip_local');
    const localNameSize = u16(local + 26), localExtraSize = u16(local + 28), start = local + 30 + localNameSize + localExtraSize;
    within(local + 30, localNameSize + localExtraSize, directory);
    if (localNameSize !== nameSize || !rawName.every((b, index) => bytes[local + 30 + index] === b)) fail('amazon_custom_zip_local');
    checkExtras(local + 30 + localNameSize, localExtraSize);
    if (!(flags & 8) && (u32(local + 14) !== crc || u32(local + 18) !== compressedSize || u32(local + 22) !== size)) fail('amazon_custom_zip_local');
    within(start, compressedSize, directory); let finish = start + compressedSize;
    if (flags & 8) {
      within(finish, 12, directory); const descriptor = u32(finish) === 0x08074b50 ? finish + 4 : finish; within(descriptor, 12, directory);
      if (u32(descriptor) !== crc || u32(descriptor + 4) !== compressedSize || u32(descriptor + 8) !== size) fail('amazon_custom_zip_descriptor');
      finish = descriptor + 12;
    }
    entries.push({ name, path, isDirectory, method, crc, compressedSize, size, start }); ranges.push([local, finish]);
    cursor += 46 + nameSize + extraSize + commentSize;
  }
  if (cursor !== end) fail('amazon_custom_zip_directory');
  ranges.sort((a, b) => a[0] - b[0]);
  if (ranges[0][0] !== 0 || ranges.at(-1)[1] !== directory || ranges.some((range, i) => i > 0 && range[0] !== ranges[i - 1][1])) fail('amazon_custom_zip_overlap');
  for (const [name] of names) {
    const parts = name.split('/'); parts.pop();
    while (parts.length) { if (names.get(parts.join('/')) === false) fail('amazon_custom_zip_path_conflict'); parts.pop(); }
  }
  // Every header is validated before any expansion. No partial result on failure.
  return entries.map(entry => {
    const compressed = bytes.subarray(entry.start, entry.start + entry.compressedSize); let content;
    if (entry.method === 0) content = compressed;
    else {
      try {
        const result = inflateRawSync(compressed, { maxOutputLength: Math.max(1, entry.size), info: true });
        if (result.engine.bytesWritten !== compressed.length) fail(); content = result.buffer;
      } catch { fail('amazon_custom_zip_deflate'); }
    }
    if (content.length !== entry.size || zipCrc32(content) !== entry.crc) fail('amazon_custom_zip_crc');
    return { ...entry, content };
  });
}

function parseJson(bytes) {
  if (bytes.length > L.jsonBytes) fail('amazon_custom_json_limit');
  const source = utf8(bytes); let parsed;
  try { parsed = JSON.parse(source); } catch { fail('amazon_custom_json'); }
  // JSON.parse alone silently overwrites duplicate keys; validate the source too.
  let offset = 0, nodes = 0;
  const whitespace = () => { while (/\s/u.test(source[offset] ?? '') && offset < source.length) offset++; };
  const string = () => {
    const start = offset++;
    while (offset < source.length) {
      if (source[offset] === '\\') { offset += 2; continue; }
      if (source[offset++] === '"') { if (offset - start > 32768) fail('amazon_custom_json_limit'); return JSON.parse(source.slice(start, offset)); }
    }
    fail('amazon_custom_json');
  };
  const scan = depth => {
    if (++nodes > L.nodes || depth > L.depth) fail('amazon_custom_json_limit');
    whitespace(); const char = source[offset];
    if (char === '{') {
      offset++; whitespace(); const keys = new Set();
      if (source[offset] === '}') { offset++; return; }
      for (;;) {
        whitespace(); const key = string();
        if (keys.has(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) fail('amazon_custom_json_key');
        keys.add(key); whitespace(); offset++; scan(depth + 1); whitespace();
        if (source[offset++] === '}') return;
      }
    }
    if (char === '[') {
      offset++; whitespace(); if (source[offset] === ']') { offset++; return; }
      for (;;) { scan(depth + 1); whitespace(); if (source[offset++] === ']') return; }
    }
    if (char === '"') { string(); return; }
    while (offset < source.length && !/[\s,}\]]/u.test(source[offset])) offset++;
  };
  scan(0);
  if (parsed === null || typeof parsed !== 'object') fail('amazon_custom_json_root');
  return parsed;
}

// Strict rejection gate, NOT an SVG sanitizer or renderer. Supported subset is
// intentionally narrow; accepted SVG is still inventory-only, never production.
function inspectMarkup(bytes, svg) {
  let source = utf8(bytes);
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/iu.test(source)) fail('amazon_custom_xml_entities');
  if (!svg) return 'unsupported_xml_not_parsed';
  source = source.replace(/^\s*<\?xml\s+version=["']1\.0["'](?:\s+encoding=["']utf-8["'])?\s*\?>/iu, '');
  source = source.replace(/<!--[\s\S]*?-->/gu, '');
  if (/[&]/u.test(source) || /<\?|<!/u.test(source)) fail('amazon_custom_svg_unsupported');
  const tags = new Set(['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'defs', 'clippath', 'mask', 'use', 'image', 'title', 'desc']);
  const attrs = new Set(['xmlns', 'xmlns:xlink', 'id', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'viewbox', 'preserveaspectratio', 'd', 'points', 'transform', 'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'clip-path', 'clip-rule', 'mask', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline', 'href', 'xlink:href']);
  const stack = []; let rootSeen = false, cursor = 0;
  while (cursor < source.length) {
    if (source[cursor] !== '<') {
      const next = source.indexOf('<', cursor), last = next < 0 ? source.length : next;
      if (!stack.length && source.slice(cursor, last).trim()) fail('amazon_custom_svg_unsupported'); cursor = last; continue;
    }
    const last = source.indexOf('>', cursor); if (last < 0) fail('amazon_custom_svg_unsupported');
    const token = source.slice(cursor, last + 1), match = /^<(\/?)\s*([a-zA-Z][\w:-]*)([^<>]*)>$/u.exec(token);
    if (!match || !tags.has(match[2].toLowerCase())) fail('amazon_custom_svg_active');
    const closing = Boolean(match[1]), name = match[2], selfClosing = !closing && /\/\s*>$/u.test(token);
    let rest = match[3];
    if (closing) { if (rest.trim() || stack.pop() !== name) fail('amazon_custom_svg_unsupported'); }
    else {
      if (!stack.length) { if (rootSeen || name !== 'svg') fail('amazon_custom_svg_unsupported'); rootSeen = true; }
      if (selfClosing) rest = rest.replace(/\/\s*$/u, '');
      let p = 0; const seen = new Set();
      while (p < rest.length) {
        if (!/\s/u.test(rest[p])) fail('amazon_custom_svg_unsupported');
        while (p < rest.length && /\s/u.test(rest[p])) p++;
        if (p === rest.length) break;
        const attribute = /^([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/u.exec(rest.slice(p));
        if (!attribute) fail('amazon_custom_svg_unsupported');
        const key = attribute[1].toLowerCase(), value = attribute[2] ?? attribute[3];
        if (!attrs.has(key) || seen.has(key) || /[\\<>]/u.test(value)) fail('amazon_custom_svg_active'); seen.add(key);
        if (key === 'xmlns' || key === 'xmlns:xlink') {
          if (value !== (key === 'xmlns' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xlink')) fail('amazon_custom_svg_external');
        } else if (key === 'href' || key === 'xlink:href') {
          if (!/^#[a-zA-Z_][\w.-]*$/u.test(value)) fail('amazon_custom_svg_external');
        } else if (/url\s*\(/iu.test(value)) {
          if (!/^url\(#[a-zA-Z_][\w.-]*\)$/u.test(value)) fail('amazon_custom_svg_external');
        } else if (/[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith('//')) fail('amazon_custom_svg_external');
        p += attribute[0].length;
      }
      if (!selfClosing) stack.push(name);
    }
    cursor = last + 1;
  }
  if (!rootSeen || stack.length) fail('amazon_custom_svg_unsupported');
  return 'unsupported_svg_not_rendered';
}

function candidatesFromJson(data, file) {
  const candidates = [], unknownFields = []; let count = 0;
  const walk = (value, path, key, ancestorKind = null) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/gu, '');
    const kind = /^(?:text|textvalue|name|label|message|personalizationtext)$/u.test(normalized) ? 'text' :
      /(?:image|photo|logo|artwork|customizedurl)/u.test(normalized) ? 'image' :
      /(?:design|variant|option|font|colou?r)/u.test(normalized) ? 'design' :
      /^(?:x|y|width|height|rotation|angle|scale|scalex|scaley|position|placement|transform)$/u.test(normalized) ? 'placement' : null;
    const inherited = kind ?? ancestorKind;
    const unknownKey = key !== '' && !/^\d+$/u.test(key) && !kind;
    if (unknownKey) unknownFields.push({ file, path, type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value });
    if (value !== null && typeof value === 'object') {
      for (const [child, entry] of Object.entries(value)) walk(entry, `${path}/${child.replace(/~/gu, '~0').replace(/\//gu, '~1')}`, child, inherited);
      return;
    }
    if (typeof value === 'number' && !Number.isFinite(value)) fail('amazon_custom_json_number');
    if (!inherited) { if (!unknownKey) unknownFields.push({ file, path, type: value === null ? 'null' : typeof value }); return; }
    if (++count > L.candidates) fail('amazon_custom_candidate_limit');
    // URLs remain opaque. Even approved samples cannot make signed URLs appear in a report.
    const external = typeof value === 'string' && (/[a-z][a-z0-9+.-]*:\/\//iu.test(value) || /^(?:data|javascript|file):/iu.test(value) || value.startsWith('//'));
    candidates.push({ file, path, kind: inherited, value: external ? null : value,
      ...(external ? { valueRedacted: 'external_reference' } : {}), confidence: 'heuristic_only', reviewRequired: true });
  };
  walk(data, '', '');
  return { candidates, unknownFields };
}

/** bytes are approved synthetic/anonymized samples. No real-data escape hatch. */
export function inspectAmazonCustomSample({ bytes, format, source } = {}) {
  if (!source || !['synthetic', 'anonymized'].includes(source.classification) || source.operatorApproved !== true) fail('amazon_custom_sample_approval');
  if (!(bytes instanceof Uint8Array) || !bytes.length || !['zip', 'json'].includes(format)) fail();
  const files = format === 'zip' ? readZip(bytes) : [{ name: 'sample.json', size: bytes.length, isDirectory: false, content: bytes }];
  const inventory = [], candidates = [], unknownFields = [], warnings = [];
  for (const file of files) {
    const ext = file.name.split('.').at(-1).toLowerCase(); let type = 'unknown', inspection = 'unsupported_type';
    if (file.isDirectory) { type = 'directory'; inspection = 'inventory_only'; }
    else if (ext === 'json') {
      type = 'json'; inspection = 'candidate_fields_only';
      const result = candidatesFromJson(parseJson(file.content), file.name); candidates.push(...result.candidates); unknownFields.push(...result.unknownFields);
    } else if (ext === 'xml' || ext === 'svg') { type = ext; inspection = inspectMarkup(file.content, ext === 'svg'); }
    else if (['zip', 'gz', '7z', 'rar'].includes(ext)) fail('amazon_custom_nested_archive');
    else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) { type = 'image'; inspection = 'inventory_only_not_decoded'; }
    if (inspection.startsWith('unsupported')) warnings.push({ file: file.name, code: inspection });
    inventory.push({ name: file.name, bytes: file.size, sha256: sha(file.content), type, inspection });
  }
  if (candidates.length > L.candidates || unknownFields.length > L.nodes) fail('amazon_custom_candidate_limit');
  return { schema: 'gravuru-amazon-custom-sample-inspection/v1', sourceClassification: source.classification,
    originalSha256: sha(bytes), originalBytes: bytes.length, format, inventory, candidates, unknownFields, warnings,
    reviewRequired: true, productionReady: false, networkEnabled: false, rendered: false,
    interpretation: 'unversioned_candidate_paths_not_an_amazon_schema',
    limitations: ['operator_classification_not_independently_verified', 'no_verified_real_amazon_samples',
      'no_automatic_workshop_mapping', 'xml_not_parsed', 'svg_never_rendered', 'images_not_decoded'] };
}
