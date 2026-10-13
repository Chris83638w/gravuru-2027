import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {tintFixture} from '../../scripts/fixtures/acrylic-import-tint.mjs';
import {createAcrylicPrintProof} from './acrylic-print-proof.mjs';import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';import {readReviewPackage} from './review-package.mjs';import {importEnvironment} from './design-assets.mjs';
async function setup(t,format='svg'){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-import-tint-'));const f=await tintFixture(dir,{format});t.after(()=>{f.w.close();fs.rmSync(dir,{recursive:true,force:true});});return f;}
function samples(pdf,layer='Farbmotiv'){
 return JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
d=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');layers=d.get_ocgs()
if layers:d.set_layer(-1,on=[i for i,v in layers.items() if v['name']==${JSON.stringify(layer)}],off=[i for i,v in layers.items() if v['name']!=${JSON.stringify(layer)}]);d=f.open(stream=d.tobytes(),filetype='pdf')
p=d[0].get_pixmap(alpha=True);k=72/25.4
print(json.dumps([list(p.pixel(round(x*k),round(y*k))) for x,y in [(50,55),(90,55),(50,90),(28,33)]]))`],{input:pdf,env:importEnvironment()}).toString());
}
test('tinted SVG import preserves alpha, original bytes and motif-only white in native print PDF',async t=>{
 const f=await setup(t),s=await f.snapshot(),proof=await createAcrylicPrintProof(s.bundle.package,s.bundle.manifest.packageSha256),p=samples(proof.pdf),white=samples(proof.pdf,'RDG_WHITE');
 assert.ok(p[0][1]>p[0][0]&&p[0][1]>p[0][2]);assert.deepEqual(p[0],p[2]);assert.equal(p[0][3],255);assert.ok(p[1][3]>=126&&p[1][3]<=130);assert.equal(p[3][3],0);assert.equal(white[3][3],0);assert.equal(white[0][3],255);
 assert.deepEqual(readReviewPackage(s.bundle.package,s.bundle.manifest.packageSha256,'gravuru-acrylic-review/v1').files.get('quellen/'+f.asset.assetId+'-original.svg'),f.bytes);
 const original=await f.snapshot({preserveColors:true}),originalPdf=await createAcrylicPrintProof(original.bundle.package,original.bundle.manifest.packageSha256),colors=samples(originalPdf.pdf);assert.ok(colors[0][0]>colors[0][1]);assert.ok(colors[1][2]>colors[1][0]);assert.equal(colors[3][3],0);assert.equal(proof.metadata.settings.dpi,300);
});
test('imported PDF tint is included in the technical CMYK output without replacing its source',async t=>{
 const f=await setup(t,'pdf'),s=await f.snapshot(),p=await createAcrylicPrintProof(s.bundle.package,s.bundle.manifest.packageSha256),pixels=samples(p.pdf);assert.ok(pixels[0][1]>pixels[0][0]);assert.equal(pixels[3][3],0);assert.deepEqual(readReviewPackage(s.bundle.package,s.bundle.manifest.packageSha256,'gravuru-acrylic-review/v1').files.get('quellen/'+f.asset.assetId+'-original.pdf'),f.bytes);
});
test('imported engraving follows the preview: white stays unengraved, colours become tones, no vectorization claim (P1-1)',async t=>{
 const f=await setup(t),s=await f.snapshot({engraving:true,preserveColors:true}),p=await createAcrylicEngravingProof(s.bundle.package,s.bundle.manifest.packageSha256),pixels=samples(p.pdf);
 // red (luminance .2126) → coverage .787; white rectangle → no engraving; half-transparent blue → coverage ≈ .46
 assert.ok(pixels[0][0]>=45&&pixels[0][0]<=65,String(pixels[0]));assert.deepEqual(pixels[2],[255,255,255,255]);assert.ok(pixels[1][0]>=125&&pixels[1][0]<=150,String(pixels[1]));assert.deepEqual(pixels[3],[255,255,255,255]);await assert.rejects(()=>createAcrylicEngravingProof(s.bundle.package,s.bundle.manifest.packageSha256,{mode:'vector'}),/Rasterbilder/);
});
test('steel vector engraving is solid black, white knockout stays free; tone and flat modes stay distinct',()=>{
 const script=`import importlib.util,base64,io,json
import xml.etree.ElementTree as ET
from PIL import Image
s=importlib.util.spec_from_file_location('w','app/workshop/form-print-worker.py');w=importlib.util.module_from_spec(s);s.loader.exec_module(w)
src=b'<svg xmlns="http://www.w3.org/2000/svg" width="20mm" height="10mm" viewBox="0 0 20 10"><rect width="20" height="10" fill="#ffffff"/><rect x="5" y="2" width="10" height="6" fill="#808080"/></svg>'
out={}
for mode in ['solid','tone','flat']:
 root=ET.fromstring('<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,'+base64.b64encode(src).decode()+'" data-native-tint="#000000" data-native-tonal="'+mode+'" data-raster-width-mm="20" data-raster-height-mm="10"/></svg>')
 w.tint_imported_artwork(root,254)
 img=next(root.iter('{http://www.w3.org/2000/svg}image'));assert 'data-native-tonal' not in img.attrib
 im=Image.open(io.BytesIO(base64.b64decode(img.get('href').split(',',1)[1]))).convert('RGBA')
 out[mode]=[im.getpixel((10,10))[3],im.getpixel((100,50))[3]]
print(json.dumps(out))`;
 const r=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',script],{cwd:new URL('../../',import.meta.url),env:importEnvironment()}).toString();
 const v=JSON.parse(r);
 assert.deepEqual(v.solid,[0,255]);assert.equal(v.tone[0],0);assert.ok(v.tone[1]>120&&v.tone[1]<135,String(v.tone));assert.deepEqual(v.flat,[255,255]);
});
