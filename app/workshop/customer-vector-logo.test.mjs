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
  const wide=await prepare(svg('<rect width="10" height="10"/>','width="50mm" height="10mm" viewBox="0 0 20 20"'));
  assert.equal(wide.width/wide.height,5);assert.equal(wide.widthMm,50);assert.equal(wide.heightMm,10);
});

test('valid viewport mismatch preserves default meet, explicit none, slice and all alignments',async()=>{
 const body='<rect x="10" y="30" width="20" height="10"/>';
 const base='width="200" height="100" viewBox="0 0 100 100"';
 for(const [aspect,bounds] of [
  ['', [30,15,40,20]],['xMidYMid meet',[30,15,40,20]],['none',[10,15,30,20]],
  ['none slice',[10,15,30,20]],['xMidYMid slice',[10,5,30,15]],
  ['xMinYMin meet',[5,15,15,20]],['xMaxYMax meet',[55,15,65,20]],
  ['defer xMaxYMax meet',[55,15,65,20]],
 ]){
  const result=await prepare(svg(body,base+(aspect?` preserveAspectRatio="${aspect}"`:'')));
  assert.equal(result.width,100);assert.equal(result.height,50);
  assert.deepEqual(geometry(result.svg).bounds,bounds,aspect||'default meet');
  assert.deepEqual(geometry(result.preview).bounds,bounds,'preview '+aspect);
 }
 for(const x of ['Min','Mid','Max'])for(const [y,offset] of [['Min',0],['Mid',25],['Max',50]]){
  const result=await prepare(svg(body,`width="100" height="200" viewBox="0 0 100 100" preserveAspectRatio="x${x}Y${y} meet"`));
  assert.deepEqual(geometry(result.svg).bounds,[5,15+offset,15,20+offset]);
 }
});

test('viewport normalization handles rounded physical units, offset and slice clipping without rasterization',async()=>{
 const rounded=await prepare(svg('<rect width="300" height="100"/>','width="100mm" height="33.33mm" viewBox="0 0 300 100"'));
 assert.equal(rounded.widthMm,100);assert.equal(rounded.heightMm,33.33);
 assert.ok(Math.abs(rounded.width/rounded.height-100/33.33)<1e-10);
 const offset=await prepare(svg('<rect x="10" y="20" width="100" height="100"/>','width="2in" height="72pt" viewBox="10 20 100 100"'));
 assert.deepEqual(geometry(offset.svg).bounds,[25,0,75,50]);
 const cropped=await prepare(svg('<rect width="100" height="100"/>','width="200px" height="100px" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"'));
 assert.deepEqual(geometry(cropped.svg).bounds,[0,0,100,50]);
 assert.equal(geometry(cropped.svg).area,5000);assert.ok(cropped.warnings.some(x=>x.includes('beschnitten')));
 const stroked=await prepare(svg('<path d="M10 50H90" fill="none" stroke="black" stroke-width="10"/>','width="200" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"'));
 assert.deepEqual(geometry(stroked.svg).bounds,[10,22.5,90,27.5]);
 assert.doesNotMatch(stroked.svg.toString(),/<image|stroke=|transform=/);
 for(const aspect of ['xBogusYMid meet','xMidYMid stretch','none javascript'])await assert.rejects(prepare(svg('<rect width="5" height="5"/>',`viewBox="0 0 20 20" preserveAspectRatio="${aspect}"`)),{code:'logo_effect'});
});

test('previously accepted v1 source and preview bytes remain identical to the pinned 587a395 worker',async()=>{
 // SHA-256 captured from the unmodified worker, before this change. Historical
 // account/cart verification must still reproduce the exact stored output.
 const cases=[
  ['viewBox="0 0 20 20"','<rect x="1" y="2" width="12" height="10"/>','187fc87fdc234ce4d786b8a304777a978540387f16582af810c0791ff347003f'],
  ['width="40mm" height="20mm" viewBox="10 20 20 10"','<rect x="10" y="20" width="20" height="10"/>','1c13433bf1887b003a634a3dd34a583cf893e3fc27ec0f5c4f405fb01b108c4b'],
  ['width="200" height="100" viewBox="0 0 20 10" preserveAspectRatio="none"','<circle cx="10" cy="5" r="4"/>','4b7aed30440750fe28962d3656073a48e0521a1293fe6bd8b8c838efb8f9b154'],
  ['viewBox="0 0 20 20"','<rect x="1" y="1" width="10" height="10" fill="red"/><rect x="6" y="1" width="10" height="10" fill="#00f"/><rect x="7" y="3" width="2" height="4" fill="white"/>','93a016824421537d5ae296243534b838ea1d398ae7c69c52fa7ac93290203e3c','a5b606807ba4a072a116f2d5baf935d51cf4c8b3c895d966c4f0c971fe7d728a'],
  ['viewBox="0 0 20 20"','<path d="M2 12 C2 2 18 2 18 12 L18 18 L2 18 Z"/>','33e586b8b099df07847a4400d437b96758ca218ac32e2ab4f35358ebac3a3ccd'],
  ['viewBox="0 0 20 20"','<path d="M2 10 L18 10" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"/>','f655828721b4e9690e77974de3fa9d430b4a32e3133f088f620fb2542629f20f'],
 ];
 for(const [attrs,body,output,preview=output] of cases){const result=await prepare(svg(body,attrs));assert.equal(digest(result.svg),output);assert.equal(digest(result.preview),preview);assert.equal(result.version,'svg-black-v1');}
});

test('independent SVG renderer sees the same visible artwork before and after viewport normalization',async()=>{
 const pairs=[];
 for(const aspect of ['', 'none', 'xMidYMid slice', 'xMinYMin meet', 'xMaxYMax meet']){
  const original=svg('<rect x="15" y="25" width="80" height="80" fill="red"/><circle cx="55" cy="65" r="10" fill="white"/>',`width="200" height="100" viewBox="10 20 100 100"${aspect?` preserveAspectRatio="${aspect}"`:''}`);
  const result=await prepare(original);pairs.push({source:original.toString(),preview:result.preview.toString()});
 }
 const script=`import io,json,sys\nimport cairosvg\nfrom PIL import Image,ImageChops\nfor pair in json.load(sys.stdin):\n a,b=[Image.open(io.BytesIO(cairosvg.svg2png(bytestring=pair[k].encode(),output_width=400,output_height=200))).convert('RGBA') for k in ('source','preview')]\n assert ImageChops.difference(a,b).getbbox(alpha_only=False) is None, 'normalized preview changed visible artwork'\nprint('matched')`;
 const result=spawnSync(process.env.GRAVURU_PYTHON||(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3'),['-c',script],{env:{...process.env,PYTHONPATH:[fileURLToPath(new URL('../../.local-data/python',import.meta.url)),process.env.PYTHONPATH].filter(Boolean).join(delimiter)},input:JSON.stringify(pairs),encoding:'utf8',windowsHide:true,timeout:10000});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'matched');
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
