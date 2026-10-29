import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {rasterizePrint,formPrintSettings} from './form-print-proof.mjs';
import {exportSettings,printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {nativeContour} from './acrylic-artwork.mjs';
import {importEnvironment} from './design-assets.mjs';
import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {renderEngraving,formEngravingSettings} from './form-engraving-proof.mjs';

test('native print fills future drill holes in raster, white and PDF; cut geometry stays exact',async()=>{
 const geometry=nativeContour({shape:'rect',width:20,height:15,holes:[{x:5,y:7,diameter:4}]}),settings=formPrintSettings({white:'motif',dpi:300,mirror:false,bleedMm:0});
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="20mm" height="15mm" viewBox="0 0 20 15"><g data-native-design="true"><rect x="2" y="3" width="6" height="8" fill="black"/></g></svg>';
 const source={geometry,settings,svg,textFields:[],photoFields:[],photos:[]},raw=await rasterizePrint({...source,fillDrillHoles:true}),legacy=await rasterizePrint(source);
 const index=Math.floor(7*raw.height/15)*raw.width+Math.floor(5*raw.width/20);
 assert.equal(Buffer.from(raw.alpha,'base64')[index],255);assert.equal(Buffer.from(raw.whiteAllowed,'base64')[index],255);
 assert.equal(Buffer.from(legacy.alpha,'base64')[index],0);assert.equal(raw.paths.cut,legacy.paths.cut);assert.notEqual(raw.paths.artwork,raw.paths.cut);
 const pixels={width:raw.width,height:raw.height,...Object.fromEntries(['rgb','alpha','whiteAllowed','whiteAlpha'].map(k=>[k,new Uint8Array(Buffer.from(raw[k],'base64'))]))};
 const pdf=Buffer.from(await(await printPDF({settings:exportSettings({width:20,height:15},settings),pixels,paths:raw.paths,kind:'color'})).arrayBuffer());
 const checked=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import sys,json,pymupdf
doc=pymupdf.open(stream=sys.stdin.buffer.read(),filetype='pdf');p=doc[0];pix=p.get_pixmap(matrix=pymupdf.Matrix(3,3))
print(json.dumps({'sample':list(pix.pixel(round(5*72/25.4*3),round(7*72/25.4*3))),'outsideHole':list(pix.pixel(round(2.5*72/25.4*3),round(7*72/25.4*3))),'width':p.rect.width*25.4/72,'height':p.rect.height*25.4/72}))`],{input:pdf,env:importEnvironment()}).toString());
 assert.deepEqual(checked.sample,checked.outsideHole,'same printed ink inside and outside drilling');assert(checked.sample.every(v=>v<50),'CMYK black, not white knockout');assert(Math.abs(checked.width-20)<.001);assert(Math.abs(checked.height-15)<.001);
});

test('frozen native engraving retains ink through drilling in SVG, vector and raster PDF',async()=>{
 const family=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url)));
 const size=family.sizes.find(s=>s.groupKey==='RE');size.baseCents=1999;family.sizes=[size];const config=familyProductConfig(family,size,1);
 const graphic={id:'ink',type:'graphic',shape:'rect',filled:true,strokeWidth:.1,color:'#000000',x:45,y:30,w:6,h:6,rotation:0,templateOrigin:true,customerEditable:true};
 config.profile.designs=[{id:'drill',name:'Bohrprobe',objects:[graphic],marks:[]}];config.profile.defaultDesignId='drill';
 const document=makeProductDocument(config),c=document.config,group=c.profile.optionGroups.find(g=>g.id==='mounting'),value=group.values.find(v=>v.holes?.length),hole=value.holes[0];
 const record={id:c.profile.id,revision:1,document,metadata:{}},objects=[{...graphic,x:hole.x,y:hole.y}];
 const input={productId:record.id,productRevision:1,designId:'drill',objects,options:{mounting:value.id},quantity:1,media:[],preview:'fixture'};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==','base64');
 const frozen=await prepareAcrylicReview({record,config:c,input,preparePhoto:async()=>({preview:png,width:1,height:1})});
 const a=await acrylicArtwork(frozen.package,frozen.manifest.packageSha256,{engraving:true});
 assert.equal(a.geometry.holeCount,value.holes.length);
 for(const mode of ['vector','raster']){
  const raw=await renderEngraving({svg:a.svg,geometry:a.geometry,settings:formEngravingSettings({mode,mirror:false}),photoFields:[],photos:[]});
  const checked=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import sys,json,pymupdf
doc=pymupdf.open(stream=sys.stdin.buffer.read(),filetype='pdf');p=doc[0];pix=p.get_pixmap(matrix=pymupdf.Matrix(3,3))
print(json.dumps({'sample':list(pix.pixel(round(${hole.x}*72/25.4*3),round(${hole.y}*72/25.4*3))),'images':len(p.get_images()),'fonts':len(p.get_fonts())}))`],{input:Buffer.from(raw.pdf,'base64'),env:importEnvironment()}).toString());
  assert(checked.sample.every(v=>v<10),mode+' keeps ink inside the future hole');
  assert.equal(checked.fonts,0);assert.equal(checked.images,mode==='vector'?0:1);
 }
});
