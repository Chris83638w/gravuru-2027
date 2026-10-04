import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {exportSettings,contourPath,maskRectangles,printPDF,zipFiles} from './print-export-model.mjs';
const geometry={width:150,height:200,shape:'rect',cornerRadiusMm:2,holes:[]};
function pixels(){const w=150,h=200,rgb=new Uint8Array(w*h*3),alpha=new Uint8Array(w*h).fill(255);for(let y=0;y<h;y++)for(let x=0;x<w;x++){rgb[(y*w+x)*3+(x<75?0:2)]=255;}return {width:w,height:h,rgb,alpha};}
const inspect=async(blob,script)=>{const r=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',script],{input:Buffer.from(await blob.arrayBuffer()),maxBuffer:5e6});assert.equal(r.status,0,r.stderr.toString());return JSON.parse(r.stdout);};
test('print settings keep cut size and independently bound color and white bleed',()=>{
 const s=exportSettings(geometry,{bleedMm:1});assert.equal(s.pageWidthMm,152);assert.equal(s.pageHeightMm,202);assert.deepEqual(s.geometry,geometry);assert.equal(s.whiteBleedMm,0);
 for(const bad of [{bleedMm:2},{whiteBleedMm:1},{profile:'unknown'},{white:'auto'},{mirror:'true'}])assert.throws(()=>exportSettings(geometry,bad));
 assert.throws(()=>exportSettings({...geometry,shape:'custom-path'}));
 assert.throws(()=>exportSettings({...geometry,width:Infinity}));
 assert.throws(()=>exportSettings({...geometry,holes:[{x:0,y:0,diameter:4}]}));
});
test('white silhouette produces closed merged runs and preserves transparent holes',()=>{
 const a=Uint8Array.from([255,255,0,255,255,0,255,0,127]);
 assert.deepEqual(maskRectangles(a,3,3),[{x:0,y:0,w:2,h:2},{x:0,y:2,w:1,h:1}]);
 assert.match(contourPath({...geometry,holes:[{x:10,y:12,diameter:4}]}),/12 12 m/);
 assert.match(contourPath({...geometry,shape:'ellipse'},1),/^151 100 m/);
});
test('Roland PDF has real spot resources, cut paths, bleed/trim boxes and RGB artwork',async()=>{
 const pdf=await printPDF({settings:exportSettings(geometry,{bleedMm:1,white:'full'}),pixels:pixels()});
 const data=await inspect(pdf,`import sys,json,fitz
p=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];objects='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()));content=page.read_contents().decode();pix=page.get_pixmap()
print(json.dumps({'size':[round(page.rect.width*25.4/72,3),round(page.rect.height*25.4/72,3)],'trim':[round(page.trimbox.width*25.4/72,3),round(page.trimbox.height*25.4/72,3)],'white':'/Separation /RDG_WHITE' in objects,'cut':'/Separation /CutContour' in objects,'layers':[x['name'] for x in p.get_ocgs().values()],'left':pix.pixel(100,200),'right':pix.pixel(300,200),'images':len(page.get_images()),'drawings':len(page.get_drawings()),'spotPaint':'/White cs 1 scn' in content,'cutPaint':'/Cut CS 1 SCN' in content}))`);
 assert.deepEqual(data.size,[152,202]);assert.deepEqual(data.trim,[150,200]);assert.equal(data.white,true);assert.equal(data.cut,true);assert.deepEqual(data.layers,['Farbmotiv','RDG_WHITE','CutContour']);assert.deepEqual(data.left,[255,0,0]);assert.deepEqual(data.right,[0,0,255]);assert.ok(data.drawings>=1);assert.equal(data.spotPaint,true);assert.equal(data.cutPaint,true);
});
test('Mimaki combined is one PDF page with white vector layer, no RDG_WHITE resource',async()=>{
 const pdf=await printPDF({settings:exportSettings(geometry,{profile:'mimaki',white:'motif'}),pixels:pixels()});
 const data=await inspect(pdf,`import sys,json,fitz
p=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];objects='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()));pix=page.get_pixmap()
print(json.dumps({'pages':len(p),'rdg':'RDG_WHITE' in objects,'layers':[x['name'] for x in p.get_ocgs().values()],'left':pix.pixel(100,200),'right':pix.pixel(300,200),'whiteVectors':sum(x.get('layer')=='Weissersatz Vektor' for x in page.get_drawings())}))`);
 assert.equal(data.pages,1);assert.equal(data.rdg,false);assert.ok(data.layers.includes('Weissersatz Vektor'));assert.ok(data.whiteVectors>0);assert.deepEqual(data.left,[255,0,0]);assert.deepEqual(data.right,[0,0,255]);
});
test('separate Mimaki white is vector-only; no-white removes actual white paint',async()=>{
 for(const white of ['motif','none']){
  const pdf=await printPDF({settings:exportSettings(geometry,{profile:'mimaki',white}),pixels:pixels(),kind:'white'});
  const data=await inspect(pdf,`import sys,json,fitz
p=fitz.open(stream=sys.stdin.buffer.read(),filetype='pdf');print(json.dumps({'images':len(p[0].get_images()),'drawings':len(p[0].get_drawings())}))`);
  assert.equal(data.images,0);assert.equal(data.drawings,white==='none'?0:1);
 }
});
test('ZIP keeps original image bytes and readable member names',async()=>{
 const original=new Blob([Uint8Array.from([0,1,2,255])]);const zip=await zipFiles([{name:'Originalfoto-1.png',blob:original},{name:'Einstellungen.json',blob:new Blob(['{}'])}]);
 const data=await inspect(zip,`import sys,json,zipfile,io
z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()));print(json.dumps({'names':z.namelist(),'bytes':list(z.read('Originalfoto-1.png')),'bad':z.testzip()}))`);
 assert.deepEqual(data.names,['Originalfoto-1.png','Einstellungen.json']);assert.deepEqual(data.bytes,[0,1,2,255]);assert.equal(data.bad,null);
});
