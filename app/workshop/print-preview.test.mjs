import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {printPreview} from './print-preview.mjs';
import {printDelivery} from './print-delivery.mjs';
import {digest} from './review-package.mjs';
import {importEnvironment} from './design-assets.mjs';
import {exportSettings,zipFiles} from '../configurator/variant-m/print-export-model.mjs';
async function fixture(profile='roland',white='motif'){
 const width=20,height=30,rgb=new Uint8Array(width*height*3),alpha=new Uint8Array(width*height);
 for(let y=8;y<22;y++)for(let x=5;x<15;x++){rgb[(y*width+x)*3]=255;alpha[y*width+x]=255;}
 const settings=exportSettings({width:20,height:30},{profile,white}),result=await printDelivery({settings,pixels:{width,height,rgb,alpha}}),archive=Buffer.from(await(await zipFiles([{name:'manifest.json',blob:new Blob([JSON.stringify({schema:'gravuru-form-review/v1',files:[]})])},...result.extras])).arrayBuffer());
 return {pdf:result.pdf,archive,metadata:{settings,downloads:result.downloads,sourceReviewSchema:'gravuru-form-review/v1'}};
}
function inspect(png){return JSON.parse(execFileSync('python3',['-c',`from PIL import Image
import io,sys,json
im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGBA');w,h=im.size
print(json.dumps({'width':w,'height':h,'center':im.getpixel((w//2,h//2)),'corner':im.getpixel((0,0)),'empty':im.getpixel((w//10,h//10))}))`],{env:importEnvironment(),input:png}).toString());}
test('saved Roland PDF renders isolated red artwork and white coverage with transparent empty area, without modifying PDF',async()=>{
 const r=await fixture(),hash=digest(r.pdf),color=await printPreview(r,'color'),white=await printPreview(r,'white'),a=inspect(color.png),b=inspect(white.png);
 assert.equal(color.sourceSha256,hash);assert.equal(white.sourceSha256,hash);assert.equal(digest(r.pdf),hash);assert.equal(a.height,1000);assert.ok(a.width<=1000);assert.ok(a.center[0]>200&&a.center[1]<100&&a.center[3]===255);assert.deepEqual(b.center,[255,255,255,255]);assert.equal(a.empty[3],0);assert.equal(b.empty[3],0);assert.equal(a.corner[3],0);assert.equal(b.corner[3],0);assert.equal(a.width,b.width);
});
test('Mimaki preview uses the exact separate archived white PDF and full white is visibly different from motif white',async()=>{
 const motif=await fixture('mimaki'),full=await fixture('mimaki','full'),a=await printPreview(motif,'white'),b=await printPreview(full,'white'),c=await printPreview(motif,'color');
 assert.equal(a.sourceSha256,motif.metadata.downloads.white.sha256);assert.equal(c.sourceSha256,motif.metadata.downloads.pdf.sha256);assert.equal(inspect(a.png).empty[3],0);assert.equal(inspect(b.png).empty[3],255);assert.deepEqual(inspect(a.png).center,[255,255,255,255]);
});
test('missing white, engraving, unknown modes and damaged PDFs fail instead of displaying an invented plate',async()=>{
 const r=await fixture('mimaki','none');await assert.rejects(()=>printPreview(r,'white'),/ohne Weiß/);await assert.rejects(()=>printPreview(r,'file:///tmp/private'),/vorhandene/);await assert.rejects(()=>printPreview({...r,metadata:{...r.metadata,settings:{mode:'vector'}}},'color'),/Druckaufträge/);
 await assert.rejects(()=>printPreview({...r,pdf:Buffer.from('%PDF-damaged')},'color'),/keine eindeutig/);
});

test('raster and vector engraving previews render the exact stored PDF on white without changing output or orientation',async()=>{
 for(const mode of ['raster','vector']){
  const pdf=execFileSync('python3',['-c',`import sys,pymupdf as p
from PIL import Image
import io
d=p.open();page=d.new_page(width=100,height=200)
if '${mode}'=='vector':page.draw_rect(p.Rect(10,50,40,150),color=None,fill=(0,0,0))
else:
 im=Image.new('L',(100,200),255)
 for y in range(50,150):
  for x in range(10,40):im.putpixel((x,y),80)
 b=io.BytesIO();im.save(b,format='PNG');page.insert_image(page.rect,stream=b.getvalue())
sys.stdout.buffer.write(d.tobytes())`],{env:importEnvironment()});
  const before=digest(pdf),r={pdf,metadata:{settings:{mode},pdfSha256:before}},preview=await printPreview(r,'engraving');assert.equal(preview.sourceSha256,before);assert.equal(digest(pdf),before);assert.deepEqual(inspect(preview.png).empty,[255,255,255,255]);
  const samples=JSON.parse(execFileSync('python3',['-c',"from PIL import Image;import sys,io,json;im=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert('RGB');print(json.dumps([list(im.getpixel((100,500))),list(im.getpixel((400,500)))]))"],{input:preview.png,env:importEnvironment()}).toString());assert.deepEqual(samples,[[mode==='vector'?0:80,mode==='vector'?0:80,mode==='vector'?0:80],[255,255,255]]);
  await assert.rejects(()=>printPreview(r,'white'),/Druckaufträge/);await assert.rejects(()=>printPreview({...r,metadata:{...r.metadata,pdfSha256:'0'.repeat(64)}},'engraving'),/Prüfsumme/);
 }
 const print=await fixture();await assert.rejects(()=>printPreview(print,'engraving'),/Gravuraufträge/);
 await assert.rejects(()=>printPreview({...print,metadata:{settings:{mode:'vector'}}},'engraving'),/keine eindeutig/);
});
