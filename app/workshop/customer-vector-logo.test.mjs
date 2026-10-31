import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,delimiter} from 'node:path';
import {homedir} from 'node:os';
import {prepareCustomerVectorLogo,MAX_CUSTOMER_VECTOR_LOGO_BYTES,CUSTOMER_VECTOR_LOGO_VERSION} from './customer-vector-logo.mjs';

const svg=(body,attrs='viewBox="0 0 20 20"')=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`);
const prepare=bytes=>prepareCustomerVectorLogo({name:'logo.svg',bytes});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python',process.platform==='win32'?'python.exe':'bin/python3');
function geometry(bytes,points=[]){
  const script=`import json,sys\nfrom picosvg.svg import SVG\nfrom picosvg.svg_pathops import skia_path\nr=json.load(sys.stdin)\ns=SVG.fromstring(r['svg']).shapes()\np=skia_path(s[0].as_cmd_seq(),s[0].fill_rule)\nprint(json.dumps({'area':p.area,'bounds':p.bounds,'contours':len(list(p.contours)),'contains':[p.contains(tuple(x)) for x in r['points']]}))`;
  const result=spawnSync(process.env.GRAVURU_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3'),['-c',script],{
    env:{...process.env,PYTHONPATH:[fileURLToPath(new URL('../../.local-data/python',import.meta.url)),process.env.PYTHONPATH].filter(Boolean).join(delimiter)},
    input:JSON.stringify({svg:bytes.toString(),points}),encoding:'utf8',windowsHide:true,timeout:10000,
  });
  assert.equal(result.status,0,result.stderr);
  return JSON.parse(result.stdout);
}

test('real union removes overlapping coloured surfaces; white hole remains and colour-loss warning is explicit',async()=>{
  const input=svg('<rect x="1" y="1" width="10" height="10" fill="red"/><rect x="6" y="1" width="10" height="10" fill="#00f"/><rect x="7" y="3" width="2" height="4" fill="white"/>');
  const result=await prepare(input);
  assert.equal(result.version,CUSTOMER_VECTOR_LOGO_VERSION);
  assert.deepEqual(result.original,input);
  assert.equal(result.sourceSha256,digest(input));
  assert.equal(result.sha256,result.sourceSha256);
  assert.equal(result.outputSha256,digest(result.svg));
  assert.equal(result.pathCount,2);
  assert.equal((result.svg.toString().match(/<path /g)||[]).length,1);
  assert.match(result.svg.toString(),/fill="#000000"/);
  assert.doesNotMatch(result.svg.toString(),/stroke=|<image|<defs|<use|transform=|href=/);
  assert.match(result.preview.toString(),/fill="#ff0000"/);
  assert.match(result.preview.toString(),/fill="#0000ff"/);
  assert.match(result.preview.toString(),/fill="#ffffff"/);
  assert.ok(result.warnings.some(x=>/Farbgrenzen.*verschwinden/.test(x)));
  const actual=geometry(result.svg,[[2,2],[8,2],[15,2],[8,5],[19,19]]);
  assert.equal(actual.area,142); // 100+100-50 overlap-8 white hole.
  assert.deepEqual(actual.contains,[true,true,true,false,false]);
  assert.equal(actual.contours,2);
});

test('white paint is applied in order, not globally subtracted from later artwork',async()=>{
  const result=await prepare(svg('<rect width="20" height="20"/><rect x="2" y="2" width="16" height="16" fill="white"/><rect x="8" y="8" width="4" height="4" fill="blue"/>'));
  const actual=geometry(result.svg,[[1,1],[3,3],[10,10]]);
  assert.equal(actual.area,160);
  assert.deepEqual(actual.contains,[true,false,true]);
});

test('even-odd holes, transforms, cubic curves and outline strokes remain vectors',async()=>{
  const ring=await prepare(svg('<g transform="translate(2 3)"><path fill-rule="evenodd" d="M0 0H12V12H0Z M3 3H9V9H3Z"/></g>'));
  const ringGeometry=geometry(ring.svg,[[3,4],[7,8]]);
  assert.equal(ringGeometry.area,108);
  assert.deepEqual(ringGeometry.contains,[true,false]);
  const curve=await prepare(svg('<path d="M2 12 C2 2 18 2 18 12 L18 18 L2 18 Z"/>'));
  assert.match(curve.svg.toString(),/\bC/);
  const line=await prepare(svg('<path d="M2 10 L18 10" fill="none" stroke="rgb(0,0,255)" stroke-width="2" stroke-linecap="round"/>'));
  assert.doesNotMatch(line.svg.toString(),/stroke=/);
  assert.match(line.svg.toString(),/\b[QC]/);
  const actual=geometry(line.svg,[[2,10],[10,10],[10,12],[0,10]]);
  assert.ok(Math.abs(actual.area-(32+Math.PI))<0.001,`stroke area ${actual.area}`);
  assert.deepEqual(actual.contains,[true,true,false,false]);
});

test('safe preview only has normalized passive paths; immutable source and deterministic output',async()=>{
  const input=svg('<title>Private &amp; logo</title><g style="fill: #abc; stroke: none"><rect x="1" y="1" width="8" height="8"/></g>');
  const one=await prepare(input),two=await prepare(input);
  assert.deepEqual(one.svg,two.svg);
  assert.deepEqual(one.preview,two.preview);
  assert.deepEqual(one.original,input);
  assert.doesNotMatch(one.preview.toString(),/Private|style=|<g|<title/);
  assert.match(one.preview.toString(),/fill="#aabbcc"/);
  assert.equal(one.minFeatureUnits,null);
  assert.equal(one.detailCheck,'manual-required');
  assert.ok(one.warnings.some(x=>x.includes('keine Mindeststärke')));
});

test('nonzero viewBox origin is normalized; physical dimensions are reported only from explicit source units',async()=>{
  const result=await prepare(svg('<rect x="10" y="20" width="20" height="10"/>','width="40mm" height="20mm" viewBox="10 20 20 10"'));
  assert.equal(result.width,20);assert.equal(result.height,10);
  assert.equal(result.widthMm,40);assert.equal(result.heightMm,20);
  assert.match(result.svg.toString(),/viewBox="0 0 20 10"/);
  assert.deepEqual(geometry(result.svg).bounds,[0,0,20,10]);
  const unitless=await prepare(svg('<rect width="10" height="10"/>'));
  assert.equal(unitless.widthMm,null);assert.equal(unitless.heightMm,null);
  await assert.rejects(prepare(svg('<rect width="10" height="10"/>','width="50mm" height="10mm" viewBox="0 0 20 20"')),{code:'logo_viewbox'});
});

test('off-canvas paint is clipped to the same source viewport and reported',async()=>{
  const result=await prepare(svg('<rect x="-2" y="1" width="4" height="4"/>'));
  assert.deepEqual(geometry(result.svg).bounds,[0,1,2,5]);
  assert.ok(result.warnings.some(x=>x.includes('beschnitten')));
});

test('malicious XML, scripts, external references and raster payloads fail closed',async()=>{
  const attacks=[
    Buffer.from('<!DOCTYPE svg [<!ENTITY steal SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><desc>&steal;</desc></svg>'),
    svg('<script>alert(1)</script>'),
    svg('<rect width="10" height="10" onclick="alert(1)"/>'),
    svg('<use href="https://example.com/x.svg#shape"/>'),
    svg('<use href="#self" id="self"/>'),
    svg('<image width="10" height="10" href="data:image/png;base64,aGVsbG8="/>'),
    svg('<foreignObject><div>unsafe</div></foreignObject>'),
    svg('<rect style="fill:url(https://example.com/paint.svg)" width="10" height="10"/>'),
    Buffer.from('<?xml-stylesheet href="https://example.com/style.css"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="10" height="10"/></svg>'),
  ];
  for(const bytes of attacks)await assert.rejects(prepare(bytes),error=>error.status===422);
});

test('photos, editable text, gradients, transparency, masks and dynamic CSS are explicitly unsupported',async()=>{
  const examples=[
    ['<image href="photo.png"/>','logo_raster'],
    ['<text x="2" y="8">No font substitution</text>','logo_text'],
    ['<defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="10" height="10"/>','logo_effect'],
    ['<rect width="10" height="10" opacity="0.5"/>','logo_effect'],
    ['<g opacity="0.5"><rect width="10" height="10"/></g>','logo_effect'],
    ['<rect width="10" height="10" fill="#00000080"/>','logo_effect'],
    ['<path d="M0 10H20" fill="none" stroke="black" stroke-dasharray="0.000000001 0.000000001"/>','logo_effect'],
    ['<mask id="m"/>','logo_effect'],
    ['<rect width="10" height="10" style="fill:var(--logo)"/>','logo_unsafe'],
  ];
  for(const [body,code] of examples)await assert.rejects(prepare(svg(body)),{code});
});

test('format and complexity bounds reject unsupported or excessive inputs without accepting partial output',async()=>{
  await assert.rejects(prepareCustomerVectorLogo({name:'logo.pdf',bytes:Buffer.from('%PDF')}),{code:'logo_format'});
  await assert.rejects(prepare(Buffer.alloc(MAX_CUSTOMER_VECTOR_LOGO_BYTES+1)),{code:'logo_size'});
  await assert.rejects(prepare(svg('<rect width="1" height="1"/>'.repeat(257))),{code:'logo_complexity'});
  await assert.rejects(prepare(svg('<g>'.repeat(25)+'<rect width="1" height="1"/>'+'</g>'.repeat(25))),{code:'logo_complexity'});
  await assert.rejects(prepare(svg('<path d="M0 0 '+('L1 1 '.repeat(8001))+'Z"/>')),{code:'logo_complexity'});
  await assert.rejects(prepare(svg('<rect width="1e99" height="1"/>')),{code:'logo_complexity'});
  await assert.rejects(prepare(svg('<rect width="20" height="20" fill="white"/>')),{code:'logo_empty'});
});
