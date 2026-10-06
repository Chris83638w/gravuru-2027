// Synthetic imported artwork only; never opens an existing customer database.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {makeProductDocument} from '../../app/workshop/product-model.mjs';
import {prepareAcrylicReview} from '../../app/workshop/acrylic-review.mjs';
import {importEnvironment} from '../../app/workshop/design-assets.mjs';
export const testSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><rect x="10" y="10" width="30" height="30" fill="red"/><rect x="50" y="10" width="30" height="30" fill="blue" opacity=".5"/><rect x="10" y="50" width="30" height="20" fill="white"/></svg>');
export async function tintFixture(directory,{format='svg'}={}){
 if(fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh synthetic directory required.');
 const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0],w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const bytes=format==='svg'?testSvg:execFileSync('python3',['-c',"import sys,pymupdf as f;d=f.open();p=d.new_page(width=100*72/25.4,height=80*72/25.4);p.draw_rect(f.Rect(10,10,40,40)*f.Matrix(72/25.4,72/25.4),color=None,fill=(1,0,0));sys.stdout.buffer.write(d.tobytes())"],{env:importEnvironment()});
 const asset=await w.assets.import({name:'Synthetischer Import.'+format,bytes:bytes.toString('base64')}),resource=w.assets.resource(asset.assetId);
 const png=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(10,10),(0,0,0,0)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 async function snapshot({preserveColors=false,engraving=false}={}){
  const c=structuredClone(seed.universal);if(engraving)c.profile.processing.profileId='acrylic-engraving';
  c.localResources.motifs.push(resource);const d=c.profile.designs[0];d.objects=[{id:'imported',type:'motif',motif:resource.key,x:75,y:70,w:100,h:80,rotation:0,color:'#228855',preserveColors,templateOrigin:true,technicalLocked:true,customerEditable:false}];d.marks=[];
  const record=w.repository.create(makeProductDocument(c,{name:'Eingefärbter Import · synthetisch',kind:'product'})),config=w.model(record.id,1).universal;
  const input={productId:record.id,productRevision:1,designId:d.id,objects:config.profile.designs[0].objects,options:{size:'small',base:'none',wall:'none'},quantity:1,media:[],preview:png};
  const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});w.customerDrafts.captureAcrylicReview('synthetic-tint-'+record.id,bundle);return {record,config,input,bundle};
 }
 return {built,w,bytes,asset,snapshot};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const dir=path.resolve(process.argv[2]||'');if(!process.argv[2]||!fs.existsSync(path.join(dir,'synthetic-tint-only')))throw Error('Marked synthetic directory required.');
 const f=await tintFixture(dir),s=await f.snapshot(),server=createPreviewServer({workshop:f.w,outputDirectory:dir});
 server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(dir,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,productId:s.record.id,snapshotId:s.bundle.manifest.id,built:f.built}),{mode:0o600}));
 process.on('SIGTERM',()=>server.close(()=>{f.w.close();process.exit(0);}));
}
