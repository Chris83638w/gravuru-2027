import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {deflateSync, inflateSync, crc32} from 'node:zlib';
import {execFileSync} from 'node:child_process';

const [runtimeArg, data, packFile, output, dxfFile, only] = process.argv.slice(2);
if (!dxfFile) throw Error('Usage: node audit-uv-cross-dxf-print.mjs runtime data import-report.json output-dir konturen.json [design-id[:size-key]]');
const runtime = path.resolve(runtimeArg);
const app = file => import(pathToFileURL(path.join(runtime, 'app', file)));
const [{prepareAcrylicReview}, {createAcrylicPrintProof, acrylicContourProof}, {readReviewPackage, digest},
  {resolveProduct}, {resolvedOptions, selectedProfile}, {formPrintSettings,rasterizePrint}, {productionSubject},
  {nativeContour}, {exportSettings}, {printDelivery}, {importEnvironment}] = await Promise.all([
  app('workshop/acrylic-review.mjs'), app('workshop/acrylic-print-proof.mjs'), app('workshop/review-package.mjs'),
  app('workshop/product-model.mjs'), app('configurator/variant-m/contract.mjs'), app('workshop/form-print-proof.mjs'),
  app('workshop/production-profiles.mjs'),
  app('workshop/acrylic-artwork.mjs'), app('configurator/variant-m/print-export-model.mjs'),
  app('workshop/print-delivery.mjs'), app('workshop/design-assets.mjs'),
]);
const dxf = JSON.parse(fs.readFileSync(dxfFile,'utf8'));
assert.equal(dxf.schema,'gravuru-uv-cross-dxf-contours/v1');
assert.equal(dxf.units,'mm');
const sources = new Map(Object.values(dxf.sizes).map(source => {
  assert.equal(digest(fs.readFileSync(path.join(path.dirname(dxfFile),path.basename(source.file)))),source.sha256);
  return [source.heightMm,source];
}));
assert.equal(sources.size,3);

function png(w, h, pixel) {
  const image = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * (1 + w * 4) + 1 + x * 4;
      const p = pixel(x, y);
      for (let n = 0; n < 4; n++) image[i + n] = p[n];
    }
  }
  function chunk(name, bytes) {
    const raw = Buffer.concat([Buffer.from(name), bytes]);
    const result = Buffer.alloc(raw.length + 8);
    result.writeUInt32BE(bytes.length);
    raw.copy(result, 4);
    result.writeUInt32BE(crc32(raw), raw.length + 4);
    return result;
  }
  const header = Buffer.from('00000000000000000806000000', 'hex');
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header), chunk('IDAT', deflateSync(image)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
const preview = png(10, 10, () => [0, 0, 255, 255]).toString('base64');
const photoBytes = png(1200, 1200, (x, y) => (
  x >= 450 && x < 750 && y >= 450 && y < 750 ? [0, 0, 0, 0] :
    x < 600 ? [255, 0, 0, 255] : [0, 255, 0, 255]
));
const photoData = photoBytes.toString('base64');
const pack = JSON.parse(fs.readFileSync(packFile));
assert.equal(pack.schema, 'gravuru-uv-cross-products/v1');
assert.deepEqual(pack.groups.map(g => g.id), ['hunde-ohne-foto','hunde-mit-foto','katzen-ohne-foto','katzen-mit-foto']);
assert.notEqual(path.resolve(output), path.resolve(data));
fs.mkdirSync(output, {recursive:true, mode:0o700});

// Only the pinned, allowlisted UV catalog rows are read. No review/order/customer store is opened.
const products = new DatabaseSync(path.join(data, 'workshop.sqlite'), {readOnly:true});
const designAssets = new DatabaseSync(path.join(data, 'design-assets.sqlite'), {readOnly:true});
const getProduct = products.prepare(`
  SELECT r.product_id, r.revision, r.document, r.metadata, r.status
  FROM import_items i
  JOIN product_revisions r ON r.product_id=i.product_id AND r.tenant_id=i.tenant_id
  JOIN products p ON p.id=r.product_id AND p.tenant_id=r.tenant_id
  WHERE i.import_key=? AND i.tenant_id='gravuru' AND p.archived=0
  AND r.product_id=? AND r.revision=? AND r.revision=p.revision
`);
const getAsset = designAssets.prepare(`
  SELECT a.metadata, a.preview, s.bytes
  FROM design_assets a JOIN design_sources s ON s.sha256=a.source_sha256
  WHERE a.id=? AND a.tenant_id='gravuru'
`);
const assets = {
  get(id) { return JSON.parse(getAsset.get(id).metadata); },
  read(id, original = false) {
    const item = getAsset.get(id);
    return Buffer.from(original ? item.bytes : item.preview);
  },
};
const PT = 72 / 25.4;
function objectTable(pdf) {
  const ascii = pdf.toString('latin1');
  const index = /startxref\s+(\d+)\s+%%EOF$/.exec(ascii);
  assert.ok(index, 'PDF xref');
  const xref = Number(index[1]);
  const lines = ascii.slice(xref).split('\n');
  assert.equal(lines[0], 'xref');
  const count = Number(lines[1].split(' ')[1]);
  const offsets = lines.slice(3, count + 2).map(l => Number(l.slice(0, 10)));
  return [null, ...offsets.map((offset, i) => {
    const stop = offsets[i + 1] || xref, object = ascii.slice(offset, stop);
    assert.ok(object.startsWith(`${i + 1} 0 obj\n`), 'PDF xref object header');
    assert.ok(object.endsWith('\nendobj\n'), 'PDF xref object end');
    const marker = object.indexOf('\nstream\n');
    return {
      dict: marker < 0 ? object : object.slice(0, marker),
      bytes() {
        assert.ok(marker >= 0, 'PDF stream expected');
        const length = Number(/\/Length (\d+)/.exec(this.dict)?.[1]);
        const start = offset + marker + 8;
        assert.equal(ascii.slice(start + length, start + length + 10), '\nendstream');
        return inflateSync(pdf.subarray(start, start + length));
      },
    };
  })];
}
function mmBox(dict, name, w, h, inset = 0) {
  const box = new RegExp(`/${name} \\[([^\\]]+)\\]`).exec(dict)[1].split(' ').map(Number);
  const expected = [inset,inset,w-inset,h-inset];
  assert.ok(box.every((v,i)=>Math.abs(v/PT-expected[i])<0.001),name);
}
function pdfLayers(pdf) {
  const table = objectTable(pdf);
  const page = table.find(o => o && /\/Type \/Page /.test(o.dict)).dict;
  const content = table[Number(/\/Contents (\d+) 0 R/.exec(page)[1])].bytes().toString();
  const layers = [...content.matchAll(/\/OC \/L(\d+) BDC\n([\s\S]+?)\nEMC/g)].map(m => ({
    name: /\/Name \(([^)]+)\)/.exec(table[Number(m[1])].dict)[1], text:m[2],
  }));
  return {table,page,layers};
}
function inspectCut(cut, geometry, bleed) {
  const {width,height,outlinePath} = geometry;
  const source=sources.get(height);
  assert.equal(width,source.widthMm);
  assert.equal(outlinePath,source.outline,'Selected product uses the exact DXF-derived SVG path');
  assert.ok(cut.includes(`-1 0 0 1 ${width+bleed} ${bleed} cm`),'Rear-side CutContour registration');
  const drawing = cut.match(/\/Cut CS 1 SCN 0\.05 w\n([\s\S]+?) S\n/)[1];
  const commands = drawing.split('\n').map(line => {
    const parts=line.split(/\s+/);
    return {op:parts.pop(),values:parts.map(Number)};
  });
  const vertexMatches=(a,b)=>a.length===2 && Math.hypot(a[0]-b[0],a[1]-b[1])<0.00001;
  let at=0, position, maxRadiusErrorMm=0, cubicSegments=0, arcs=0;
  const points=[];
  for (const [,op,raw] of source.outline.matchAll(/([MLA])([-+\d., \t]+)/g)) {
    const values=raw.trim().split(/[\s,]+/).map(Number), end=values.slice(-2);
    points.push(end);
    if (op==='A') {
      const [radius,ry,rotation,large,sweep]=values;
      assert.deepEqual([ry,rotation,large,sweep],[radius,0,0,1]);
      const [dx,dy]=end.map((value,i)=>value-position[i]);
      const center=[position[0]+(dx-dy)/2,position[1]+(dy+dx)/2];
      arcs++;
      let pieces=0;
      do {
        const part=commands[at++];
        assert.equal(part.op,'c');
        assert.equal(part.values.length,6);
        const [a,b,c]=[part.values.slice(0,2),part.values.slice(2,4),part.values.slice(4,6)];
        for(let step=1;step<=20;step++){
          const t=step/20,s=1-t;
          const [x,y]=position.map((v,i)=>s**3*v+3*s*s*t*a[i]+3*s*t*t*b[i]+t**3*c[i]);
          maxRadiusErrorMm=Math.max(maxRadiusErrorMm,Math.abs(Math.hypot(x-center[0],y-center[1])-radius));
        }
        position=c;
        pieces++;
        cubicSegments++;
      } while (!vertexMatches(position,end));
      assert.ok(pieces>=4 && pieces<=5,'Quarter circle approximated with short cubic segments');
    } else {
      const command=commands[at++];
      assert.equal(command.op,op.toLowerCase());
      assert.ok(vertexMatches(command.values,end),'DXF cut vertex kept 1:1');
    }
    position=end;
  }
  assert.deepEqual(commands.slice(at),[{op:'h',values:[]}],'Exactly one closed CutContour path');
  assert.equal(arcs,source.arcCount);
  assert.equal(points.length-1,source.vertices);
  assert.ok(maxRadiusErrorMm<0.001,`PDF arc radius error ${maxRadiusErrorMm} mm`);
  return {drawing,points,cubicSegments,maxRadiusErrorMm,dxfSha256:source.sha256};
}
function readColorImage(image, table) {
  const width = Number(/\/Width (\d+)/.exec(image.dict)[1]);
  const height = Number(/\/Height (\d+)/.exec(image.dict)[1]);
  const alphaId = Number(/\/SMask (\d+) 0 R/.exec(image.dict)[1]);
  const alpha = table[alphaId].bytes(), color = image.bytes();
  assert.equal(alpha.length, width * height);
  assert.equal(color.length, width * height * 4);
  let red = 0, green = 0, redX = 0, greenX = 0, blue = 0, transparent = 0;
  for (let p = 0; p < alpha.length; p++) {
    if (alpha[p] === 0) transparent++;
    if (alpha[p] < 250) continue;
    const [c,m,y,k] = color.subarray(p*4,p*4+4);
    if (c < 10 && m > 245 && y > 245 && k < 10) { red++; redX += p % width; }
    if (m < 10 && c > 245 && y > 245 && k < 10) { green++; greenX += p % width; }
    if (c > 245 && m > 245 && y < 10 && k < 10) blue++;
  }
  return {width,height,transparent,red,green,blue,redX:redX/red,greenX:greenX/green,alpha};
}
function inspectPdf(pdf, geometry, photo, bleed) {
  const {width:w,height:h} = geometry, {table,page,layers}=pdfLayers(pdf);
  const W=w+2*bleed,H=h+2*bleed;
  for (const name of ['MediaBox','BleedBox','TrimBox']) mmBox(page,name,W,H,name==='TrimBox'?bleed:0);
  assert.match(page, /\/White \[\/Separation \/RDG_WHITE \/DeviceCMYK \d+ 0 R\]/);
  assert.match(page, /\/Cut \[\/Separation \/CutContour \/DeviceCMYK \d+ 0 R\]/);
  assert.match(page, /\/GSWhite << \/Type \/ExtGState \/OP true \/op true \/OPM 1/);
  assert.ok(!table.some(o => o && /\/Type \/Font\b/.test(o.dict)), 'Outlines, no font objects');
  assert.deepEqual(layers.map(l => l.name), ['RDG_WHITE','Farbmotiv','CutContour']);
  const [white, , cut] = layers.map(l => l.text);
  const mirror = `-1 0 0 1 ${w+bleed} ${bleed} cm`;
  assert.match(white, /\/White cs 1 scn/);
  assert.ok(white.includes(mirror), 'RDG_WHITE text transform');
  const {drawing,points,cubicSegments,maxRadiusErrorMm,dxfSha256}=inspectCut(cut,geometry,bleed);
  const shoulderByHeight={200:166.725,250:207.65,400:333.45};
  const stakeY=shoulderByHeight[h];
  assert.ok(stakeY>0 && stakeY<h && points.some(([,y])=>Math.abs(y-stakeY)<0.00001),'Source start of soil stake');
  const clearFromY=Math.min(stakeY,h-55);
  const rects = [...white.matchAll(/^([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+) re$/gm)].map(m => m.slice(1).map(Number));
  assert.ok(rects.length > 10, 'Motif-local, raster-derived RDG_WHITE');
  const rasterW = Math.ceil(W*300/25.4), rasterH = Math.ceil(H*300/25.4);
  const whiteArea = rects.reduce((a, [, , rw, rh]) => a + rw * rh, 0);
  assert.ok(whiteArea > 100 && whiteArea < 0.3 * rasterW * rasterH, 'White underbase must remain local');
  const whiteBottom = rects.reduce((max, [, y, , rh]) => Math.max(max,(y + rh) / rasterH * H - bleed), 0);
  assert.ok(whiteBottom <= clearFromY, `White ink reaches soil stake (${whiteBottom} > ${clearFromY} mm)`);
  const group = table[Number(/\/Artwork (\d+) 0 R/.exec(page)[1])];
  const artwork = group.bytes().toString();
  assert.ok(artwork.includes(mirror), 'Color artwork transform');
  assert.match(artwork, /(?:^|\n)[\d. ]+ k\n[\s\S]+? f Q/, 'CMYK text outlines present');
  const paints = [...artwork.matchAll(/\/GSArt gs ([^\n]+)/g)].map(m => m[1]);
  assert.ok(paints.length && paints.every(p => p === mirror), 'Every process-color layer mirrored once');
  const images = [...group.dict.matchAll(/\/(Art\d+) (\d+) 0 R/g)];
  assert.ok(images.length > 0, 'Raster color layers present');
  const rasters = images.map(([, name, id]) => ({name, ...readColorImage(table[Number(id)], table)}));
  assert.ok(rasters.every(r => r.blue === 0), 'Blue reference PNG must never be part of production');
  // Compare opaque color pixels with the reflected raster-derived white geometry.
  // Stroke/text white is additionally verified through its own path transform.
  const whiteRows = Array.from({length:rasterH}, () => []);
  for (const [x,y,rw,rh] of rects) {
    for (let yy=y; yy<y+rh; yy++) whiteRows[yy].push([x,x+rw]);
  }
  let whiteRegistrationSamples = 0;
  for (const raster of rasters) {
    const imageMatrix = new RegExp(`([\\d.]+) 0 0 (-[\\d.]+) (-?[\\d.]+) ([\\d.]+) cm /${raster.name} Do Q`).exec(artwork);
    assert.ok(imageMatrix && Number(imageMatrix[1]) > 0, 'Expected color-image placement');
    const [ , , negHeight, x, bottom ] = imageMatrix.map(Number);
    const x0 = Math.round((x+bleed)/W*rasterW), y0 = Math.round((bottom+negHeight+bleed)/H*rasterH);
    const step = Math.max(1, Math.floor(raster.alpha.length / 4096));
    for (let p=0; p<raster.alpha.length; p+=step) {
      if (raster.alpha[p] < 250) continue;
      const sourceX = x0 + p % raster.width, sourceY = y0 + Math.floor(p/raster.width);
      const rearX = rasterW - 1 - sourceX;
      assert.ok(whiteRows[sourceY].some(([start,end]) => rearX >= start && rearX < end), 'Color/white rear registration');
      whiteRegistrationSamples++;
    }
  }
  assert.ok(whiteRegistrationSamples >= 50);
  const sentinels = rasters.filter(l => l.red > 100 && l.green > 100);
  if (photo) {
    assert.equal(sentinels.length, 1, 'An uploaded photo must reach one CMYK raster layer');
    const {name,redX,greenX,transparent} = sentinels[0];
    assert.ok(redX < greenX && transparent > 100, 'Asymmetric photo pixels and alpha');
    const placement = new RegExp(`([\\d.]+) 0 0 (-[\\d.]+) ([\\d.]+) ([\\d.]+) cm /${name} Do Q`).exec(artwork);
    assert.ok(placement && Number(placement[1]) > 0, 'Photo raster uses inherited rear transform exactly once');
  } else {
    assert.equal(sentinels.length, 0, 'No test-photo pixels in no-photo variants');
  }
  const layerBottom = [...artwork.matchAll(/ ([\d.]+) cm \/Art\d+ Do Q/g)].map(m => Number(m[1]));
  assert.ok(layerBottom.length && Math.max(...layerBottom) <= clearFromY, 'Raster ink cannot reach soil stake');
  const embeddedTestPhoto = sentinels.length ? Object.fromEntries(Object.entries(sentinels[0]).filter(([key]) => key !== 'alpha')) : null;
  return {layers:layers.map(l=>l.name), dxfSha256, cutPathSha256:digest(Buffer.from(drawing)), cubicSegments, maxRadiusErrorMm, whiteRectangles:rects.length, whiteBottomMm:whiteBottom,
    stakeBeginsMm:stakeY, clearFromMm:clearFromY, colorRasterLayers:rasters.length, whiteRegistrationSamples, embeddedTestPhoto};
}

async function inspectEdgeBleed(geometry,settings,expectedCut) {
  const {width,height}=geometry;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><g data-native-design="probe"><rect x="${width/2-8}" y="0" width="4" height="5" fill="#f00"/></g></svg>`;
  const raw=await rasterizePrint({svg,geometry:nativeContour(geometry),settings,fillDrillHoles:true,textFields:[],photoFields:[],photos:[]});
  assert.equal(raw.edgeInk,true);
  assert.equal(raw.bleedMm,1.5);
  assert.equal(raw.whiteBleedMm,1.5);
  const keys=['rgb','alpha','whiteAllowed','whiteAlpha'], decode=value=>new Uint8Array(Buffer.from(value,'base64'));
  const pixels={width:raw.width,height:raw.height,...Object.fromEntries(keys.map(k=>[k,decode(raw[k])]))};
  const artwork=raw.artworkLayers.map(layer=>({...layer,rgb:decode(layer.rgb),alpha:decode(layer.alpha)}));
  const {pdf}=await printDelivery({settings:exportSettings({width,height},settings),pixels,paths:raw.paths,artwork});
  const {page,layers}=pdfLayers(pdf);
  mmBox(page,'MediaBox',width+3,height+3);
  mmBox(page,'BleedBox',width+3,height+3);
  mmBox(page,'TrimBox',width+3,height+3,1.5);
  assert.deepEqual(layers.map(l=>l.name),['RDG_WHITE','Farbmotiv','CutContour']);
  const {drawing}=inspectCut(layers[2].text,geometry,1.5);
  assert.equal(digest(Buffer.from(drawing)),expectedCut,'Overprint cannot move any point of the cut path');
  // Render the actual PDF separations and inspect the added paint, not just page dimensions.
  const samples=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`
import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf')
points=[(${width/2+7.5},0.15),(${width/2-4.5},0.15),(${width/2+1.5},${height-3.5})]
result={}
layers=p.get_ocgs()
for name in ['Farbmotiv','RDG_WHITE']:
    on=[key for key, layer in layers.items() if layer['name']==name]
    p.set_layer(-1,on=on,off=[key for key in layers if key not in on])
    with f.open(stream=p.tobytes(),filetype='pdf') as q:
        scale=4
        pix=q[0].get_pixmap(matrix=f.Matrix(scale,scale),alpha=True)
        result[name]=[pix.pixel(round(x*scale*72/25.4),round(y*scale*72/25.4)) for x,y in points]
print(json.dumps(result))
`],{input:pdf,env:importEnvironment()}).toString());
  const {Farbmotiv:color,RDG_WHITE:white}=samples;
  assert.ok(color[0][0]>color[0][1]+100 && color[0][3]>=250,'Red ink extends 1.35 mm beyond the cut');
  assert.ok(white[0][3]>=250,'RDG_WHITE accompanies the edge overprint');
  assert.deepEqual(color.slice(1).map(pixel=>pixel[3]),[0,0],'Unpainted edge and stake stay transparent');
  assert.deepEqual(white.slice(1).map(pixel=>pixel[3]),[0,0],'Unpainted edge and stake receive no RDG_WHITE');
  return {pdf,samples};
}

const report = {at:new Date().toISOString(), scope:'Native UV Gedenkkreuz print proof, DXF revision and 1.5 mm edge bleed, synthetic input, private DB read-only',
  dbReadOnly:true, jobDatabaseUsed:false, machineApproval:false, only:only || null, cases:[], separateCut:[], edgeBleed:[]};
const cutSizes = new Set();
function persist() {
  const passed = report.cases.filter(c => c.passed).length;
  fs.writeFileSync(path.join(output,'uv-cross-print-audit.json'), JSON.stringify({...report, passed, failed:report.cases.length-passed},null,2)+'\n', {mode:0o600});
}
try {
  for (const group of pack.groups) {
    const importKey = group.created ? 'uv-cross-20261109:' : 'uv-cross-dxf-20261109:';
    const row = getProduct.get(importKey + group.id, group.productId, group.revision);
    assert.ok(row, 'Pinned imported UV product head missing');
    const record = {id:row.product_id, revision:row.revision, status:row.status,
      document:JSON.parse(row.document), metadata:JSON.parse(row.metadata)};
    assert.deepEqual(record.document, group.document, 'Pinned DB document equals the import receipt');
    assert.deepEqual(productionSubject(record.document), {method:'print',materialId:'acrylic-clear',thicknessMm:5});
    const {config} = resolveProduct(record.document);
    assert.ok(!config.localResources.motifs.some(m=>m.artwork), 'Model has inline motifs; no artwork resource remap required');
    delete config.workbench;
    config.workshopElementRights = structuredClone(record.document.elementRights);
    config.workshopProfiles = record.metadata.profiles || {selections:{fonts:null,motifs:null,colors:null,bestsellers:null},sources:{},settingsRevision:0};
    config.profile.name = record.document.name;
    config.profile.id = record.id;
    config.profile.binding = {kind:'local-review',productId:record.id};
    config.profile.revision = `${record.id}:${record.revision}`;
    for (const format of config.familyFormats.formats) {
      const options = resolvedOptions(config, {size:format.key}), profile = selectedProfile(config,options);
      assert.deepEqual([profile.geometry.width,profile.geometry.height], [format.geometry.width,format.geometry.height]);
      for (const design of profile.designs) {
        const id = design.katalog.sourceDesignId, size = format.key, tag = `${id}:${size}`;
        if (only && id !== only && tag !== only) continue;
        const start = Date.now(), item = {id,size,product:record.id,revision:record.revision,
          widthMm:profile.geometry.width,heightMm:profile.geometry.height};
        report.cases.push(item);
        let stage = 'snapshot';
        try {
          const objects = structuredClone(design.objects), photo = objects.find(o=>o.type === 'photoSlot');
          const name = objects.find(o=>o.fieldKey === 'name');
          name.text = 'Mia';
          for (const o of objects.filter(o => o.fieldKey?.startsWith('daten'))) {
            o.text = o.fieldKey === 'daten' ? '2014 – 2026' : o.fieldKey === 'daten-1' ? '2014' : '2026';
          }
          if (photo) {
            photo.uxUploadId = 'print-audit-test-photo';
            photo.uxUploadKind = 'photo';
            photo.uxPhotoCrop = {zoom:1,x:0,y:0,angle:0};
          }
          const media = photo ? [{id:photo.uxUploadId,name:'synthetic-print-audit.png',original:photoData}] : [];
          const {package:archive, manifest} = await prepareAcrylicReview({record,config,assets,
            input:{productId:record.id,productRevision:record.revision,designId:design.id,objects,options,quantity:1,media,preview}});
          assert.equal(manifest.schema,'gravuru-native-review/v1');
          assert.equal(manifest.capabilities.print,true);
          assert.equal(manifest.product.material.thicknessMm,5);
          assert.equal(manifest.product.material.variant,'klar');
          assert.equal(manifest.product.engravingSide,'back');
          assert.equal(manifest.photos.length,photo ? 1 : 0);
          assert.equal(manifest.order,null);
          assert.equal(manifest.productionReady,false);
          stage = 'production exporter';
          const settings = formPrintSettings(manifest.productionProfile.document.output);
          assert.deepEqual(settings,{profile:'roland',dpi:300,white:'motif',bleedMm:1.5,whiteBleedMm:1.5,mirror:true});
          const proof = await createAcrylicPrintProof(archive,manifest.packageSha256);
          stage = 'inspection of exported files';
          const {pdf,metadata} = proof;
          assert.equal(metadata.profileSettingsOverridden,false);
          assert.equal(metadata.photoSources.length,photo ? 1 : 0);
          assert.equal(metadata.vectorGlyphs > 0,true);
          assert.equal(metadata.productionReady,false);
          assert.equal(metadata.pdfSha256,digest(pdf));
          const zip = readReviewPackage(proof.archive,digest(proof.archive),manifest.schema);
          assert.ok(zip.files.get('technische-druckpruefung.pdf').equals(pdf), 'ZIP and PDF identical');
          if (photo) assert.ok(zip.files.get('fotos/1-original.png').equals(photoBytes), 'Photo original byte identical');
          assert.deepEqual(metadata.requested,settings);
          const actualBleed=metadata.edgeInk?1.5:0;
          assert.equal(metadata.settings.bleedMm,actualBleed);
          assert.equal(metadata.settings.whiteBleedMm,actualBleed);
          item.bleed = {requestedMm:settings.bleedMm,appliedMm:actualBleed,edgeInk:metadata.edgeInk};
          item.pdf = inspectPdf(pdf,profile.geometry,photo,actualBleed);
          item.pdfSha256 = metadata.pdfSha256;
          item.zipSha256 = digest(proof.archive);
          item.photograph = photo ? {originalByteIdentical:true,width:1200,height:1200,grade:manifest.photoResolution[0].grade} : null;
          // Retain up to six representative print and ZIP outputs as inspectable artifacts.
          const takeSample = /-O01$|-F01$/.test(id) && id.startsWith('UV-H-');
          if (takeSample) {
            fs.writeFileSync(path.join(output,`${id}-${size}.pdf`),pdf,{mode:0o600});
            fs.writeFileSync(path.join(output,`${id}-${size}.zip`),proof.archive,{mode:0o600});
          }
          if (!cutSizes.has(size)) {
            stage = 'standalone contour export';
            const cut = await acrylicContourProof(archive,manifest.packageSha256);
            assert.ok(cut.subarray(0,5).equals(Buffer.from('%PDF-')));
            fs.writeFileSync(path.join(output,`${size}-CutContour.pdf`),cut,{mode:0o600});
            assert.ok(!cut.includes('/Separation /CutContour'), 'Standalone contour is a geometry proof');
            report.separateCut.push({size,sha256:digest(cut),bytes:cut.length,kind:'1:1 vector geometry proof, no spot ink'});
            stage = 'edge bleed probe';
            const edge=await inspectEdgeBleed(profile.geometry,settings,item.pdf.cutPathSha256);
            fs.writeFileSync(path.join(output,`${size}-Randprobe-1_5mm.pdf`),edge.pdf,{mode:0o600});
            report.edgeBleed.push({size,sha256:digest(edge.pdf),actualBleedMm:1.5,sampledOutsideCutMm:1.35,samples:edge.samples});
            cutSizes.add(size);
          }
          item.passed = true;
        } catch (error) {
          item.passed = false;
          item.stage = stage;
          item.error = String(error.message).slice(0,500);
        }
        item.ms = Date.now()-start;
        persist();
        console.log(JSON.stringify({id,size,passed:item.passed,ms:item.ms,stage:item.stage,error:item.error}));
      }
    }
  }
  assert.equal(report.cases.length,only ? (only.includes(':') ? 1 : 3) : 60,'Expected exact scope');
  if (report.cases.some(c => !c.passed)) process.exitCode = 1;
} finally {
  products.close();
  designAssets.close();
  persist();
}
