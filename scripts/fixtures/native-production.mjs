import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {build} from '../../app/configurator/variant-m/build.mjs';import {createWorkshop} from '../../app/workshop/http.mjs';import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';import {importEnvironment} from '../../app/workshop/design-assets.mjs';
const directory=path.resolve(process.argv[2]||'');if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-native-profiles-only'))||fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh marked fixture required.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0],w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Acrylglas · synthetische Profilprüfung',kind:'product'}),config=w.model(record.id,1).universal,source=config.profile.designs[0];
const profile=w.productionProfiles.create({name:'Acryl klar · synthetischer Mimaki-Test',method:'print',materialId:'acrylic-clear',thicknessMm:3,machine:'Mimaki 2513 EX',rip:'Synthetischer Test – keine Freigabe',notes:'Nur Browserprüfung',archived:false,output:{profile:'mimaki',dpi:300,white:'motif',bleedMm:0,whiteBleedMm:0,mirror:true}});
w.productionProfiles.create({...profile.document,name:'Falsches Material · Stahl',materialId:'steel'});w.productionProfiles.create({...profile.document,name:'Falsche Stärke · 5 mm',thicknessMm:5});w.productionProfiles.create({...profile.document,name:'Anderes Verfahren · Gravur',method:'engraving',output:{mode:'vector',dpi:300,mirror:false}});
const photo=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(300,400),(130,160,190,255)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
const input={productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:{size:'small',base:'eiche',wall:'none'},quantity:1,media:[{id:'synthetic-photo',original:photo}],preview:photo};Object.assign(input.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
let usage=null;
if(process.argv[3]==='profile-usage'){
 let bound=w.repository.save(record.id,{...record.document,productionProfile:{id:profile.id,revision:1}},record.revision);
 bound=w.repository.publish(bound.id,{expectedRevision:bound.revision});const activatedRevision=bound.revision;
 w.productionProfiles.save(profile.id,{...profile.document,output:{...profile.document.output,dpi:600}},1);
 bound=w.repository.save(bound.id,{...bound.document,productionProfile:{id:profile.id,revision:2}},bound.revision);
 let master=w.repository.copy(bound.id,{expectedRevision:bound.revision,name:'Archivierter synthetischer Master',kind:'master'});master=w.repository.setArchived(master.id,{expectedRevision:master.revision,archived:true});
 usage={activatedRevision,currentRevision:bound.revision,masterId:master.id};
}
const server=createPreviewServer({workshop:w,outputDirectory:directory});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,productId:record.id,profile,input,built,usage}),{mode:0o600}));process.on('SIGTERM',()=>server.close(()=>{w.close();process.exit(0);}));
