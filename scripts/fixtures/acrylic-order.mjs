// Local synthetic order fixture. Never opens an existing/private customer database.
import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';import {execFileSync} from 'node:child_process';
import {formPrintSettings} from '../../app/workshop/form-print-proof.mjs';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {acrylicArtwork} from '../../app/workshop/acrylic-artwork.mjs';
import {prepareAcrylicReview} from '../../app/workshop/acrylic-review.mjs';
import {importEnvironment} from '../../app/workshop/design-assets.mjs';
const directory=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-acrylic-order-only'))||fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh marked fixture required.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const webhook={shopDomain:'gravuru-synthetic.myshopify.com',apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
const w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:webhook});
let record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Acryl · synthetische Bestellprüfung',kind:'product'});
const profile=process.argv[3]==='with-profile'?w.productionProfiles.create({name:'Synthetischer Acryl-Mimaki-Stand',method:'print',materialId:'acrylic-clear',thicknessMm:3,machine:'Mimaki 2513 EX',rip:'Nur technischer Test',notes:'Keine Maschinenfreigabe',archived:false,output:{profile:'mimaki',dpi:300,white:'motif',bleedMm:0,whiteBleedMm:0,mirror:true}}):null;
if(profile)record=w.repository.save(record.id,{...record.document,productionProfile:{id:profile.id,revision:1}},1);
const config=w.model(record.id,record.revision).universal,source=config.profile.designs[0];
const photo=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(300,400),(130,160,190,255)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
const input={productId:record.id,productRevision:record.revision,designId:source.id,objects:structuredClone(source.objects),options:{size:'large',base:'eiche',wall:'wall'},quantity:2,media:[{id:'synthetic-photo',original:photo}],preview:photo};Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
input.objects.find(o=>o.id==='names').text='Mika & Chris';
let bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});
const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);input.preview=execFileSync('python3',['-c',"import sys,cairosvg;sys.stdout.buffer.write(cairosvg.svg2png(bytestring=sys.stdin.buffer.read(),output_width=450,output_height=600))"],{input:artwork.svg,env:importEnvironment()}).toString('base64');
bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});const snapshot=w.customerDrafts.captureAcrylicReview('synthetic-order-fixture',bundle);
if(profile)w.productionProfiles.save(profile.id,{...profile.document,archived:true,output:{...profile.document.output,profile:'roland',mirror:false}},1);
let obsolete=null;
if(process.argv[3]==='obsolete-output'){
 const settings=formPrintSettings({profile:'mimaki',white:'motif',mirror:true});
 obsolete=w.exportJobs.enqueue({snapshotId:snapshot.id,recipe:'gravuru-acrylic-print-proof/v3',recipeKey:'synthetic-obsolete-output',settings});w.exportWorker.kick();
 try{await w.exportWorker.wait(obsolete.id);throw Error('Obsolete fixture unexpectedly succeeded');}catch(error){if(w.exportJobs.get(obsolete.id).status!=='failed')throw error;}
 obsolete=w.exportJobs.get(obsolete.id);
}
const server=createPreviewServer({workshop:w,outputDirectory:directory});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,productId:record.id,snapshotId:snapshot.id,built,webhook,profile,obsolete}),{mode:0o600}));
process.on('SIGTERM',()=>server.close(()=>{w.close();process.exit(0);}));
