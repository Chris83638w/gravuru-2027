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
test('imported engraving flattens source alpha to dark output and does not claim vectorization',async t=>{
 const f=await setup(t),s=await f.snapshot({engraving:true,preserveColors:true}),p=await createAcrylicEngravingProof(s.bundle.package,s.bundle.manifest.packageSha256),pixels=samples(p.pdf);assert.deepEqual(pixels[0],[0,0,0,255]);assert.deepEqual(pixels[2],[0,0,0,255]);assert.ok(pixels[1][0]>=125&&pixels[1][0]<=130);assert.deepEqual(pixels[3],[255,255,255,255]);await assert.rejects(()=>createAcrylicEngravingProof(s.bundle.package,s.bundle.manifest.packageSha256,{mode:'vector'}),/Rasterbilder/);
});
