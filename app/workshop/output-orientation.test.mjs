// K3 / Ü7.2: Spiegelung kommt ausschließlich aus dem Fertigungsprofil bzw. dem
// Produktvertrag (Acryl-Rückseite). Ein Client-Flag ändert sie nicht.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {once} from 'node:events';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {createPreviewServer} from '../configurator/variant-m/server.mjs';import {makeProductDocument} from './product-model.mjs';import {prepareAcrylicReview} from './acrylic-review.mjs';import {importEnvironment} from './design-assets.mjs';
import {productionMirror,clientOutputSettings,MIRROR_SOURCES} from './output-orientation.mjs';import {steelSpecimen} from './specimen-product.mjs';

const SQUARE={id:'square',type:'graphic',shape:'rect',filled:true,strokeWidth:.2,x:25,y:40,w:20,h:20,rotation:0,color:'#b56943',technicalLocked:true,customerEditable:false};
const manifest=(schema,method,output)=>({schema,product:{method},productionProfile:output?{document:{output}}:null});
test('productionMirror: Profil zuerst, dann Acryl-Rückseitendruck, dann Verfahrensprofil (K10), sonst Vorderseite',()=>{
 assert.deepEqual(productionMirror(manifest('gravuru-acrylic-review/v1','print',{mirror:false,dpi:300})),{mirror:false,source:MIRROR_SOURCES.profile});
 assert.deepEqual(productionMirror(manifest('gravuru-native-review/v1','engraving',{mode:'vector',dpi:300,mirror:true})),{mirror:true,source:MIRROR_SOURCES.profile});
 assert.deepEqual(productionMirror(manifest('gravuru-acrylic-review/v1','print')),{mirror:true,source:MIRROR_SOURCES.rear});
 assert.deepEqual(productionMirror(manifest('gravuru-acrylic-review/v1','engraving')),{mirror:false,source:MIRROR_SOURCES.front});
 assert.deepEqual(productionMirror(manifest('gravuru-native-review/v1','engraving')),{mirror:false,source:MIRROR_SOURCES.front});
 assert.deepEqual(productionMirror(manifest('gravuru-form-review/v1','print')),{mirror:false,source:MIRROR_SOURCES.front});
 // K10: ohne Maschinenprofil entscheidet das Verfahrensprofil; die Gravurseite der Familie überschreibt.
 const withProcess=(id,engravingSide)=>({schema:'gravuru-native-review/v1',product:{method:'engraving',processingProfileId:id,...(engravingSide?{engravingSide}:{})},productionProfile:null});
 assert.deepEqual(productionMirror(withProcess('acrylic-engraving')),{mirror:true,source:MIRROR_SOURCES.process});
 assert.deepEqual(productionMirror(withProcess('acrylic-engraving','front')),{mirror:false,source:MIRROR_SOURCES.process});
 assert.deepEqual(productionMirror(withProcess('steel-engraving')),{mirror:false,source:MIRROR_SOURCES.process});
 assert.deepEqual(productionMirror(withProcess('steel-engraving','back')),{mirror:true,source:MIRROR_SOURCES.process});
 assert.deepEqual(productionMirror(withProcess('unbekannt')),{mirror:false,source:MIRROR_SOURCES.front});
 assert.deepEqual(productionMirror({...withProcess('acrylic-engraving'),productionProfile:{document:{output:{mode:'vector',dpi:300,mirror:false}}}}),{mirror:false,source:MIRROR_SOURCES.profile});
});
test('clientOutputSettings ersetzt ein gesendetes mirror durch den abgeleiteten Wert und meldet Abweichungen',()=>{
 const rear=manifest('gravuru-acrylic-review/v1','print'),steel=manifest('gravuru-native-review/v1','engraving');
 const a=clientOutputSettings(rear,{profile:'mimaki',mirror:false});assert.deepEqual(a.settings,{profile:'mimaki',mirror:true});assert.equal(a.ignored.length,1);assert.equal(a.ignored[0].field,'mirror');assert.equal(a.ignored[0].requested,false);assert.equal(a.ignored[0].applied,true);
 const b=clientOutputSettings(steel,{mode:'raster',mirror:true});assert.deepEqual(b.settings,{mode:'raster',mirror:false});assert.equal(b.ignored.length,1);
 assert.deepEqual(clientOutputSettings(rear,{mirror:true}).ignored,[]);assert.deepEqual(clientOutputSettings(rear).settings,{mirror:true});assert.deepEqual(clientOutputSettings(steel,undefined).settings,{mirror:false});
 assert.throws(()=>clientOutputSettings(rear,[]),/Ausgabeeinstellungen/);assert.throws(()=>clientOutputSettings(rear,'mirror'),/Ausgabeeinstellungen/);
});

async function fixture(t,{steel=false}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-orientation-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 // Stahl: wiederhergestelltes Heimathafen-Muster (90 × 60 mm, Gravur von vorn), Acryl: Seed mit Rückseitendruck.
 const c=steel?await steelSpecimen(w.assets):structuredClone(seed.universal);c.profile.designs[0].objects=[structuredClone(SQUARE)];c.profile.defaultDesignId=c.profile.designs[0].id;
 const record=w.repository.create(makeProductDocument(c,{name:steel?'Stahlgravur · synthetisch':'Acryl-Rückseite · synthetisch',kind:'product'})),config=w.model(record.id,record.revision).universal,design=config.profile.designs[0];
 const preview=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const bundle=await prepareAcrylicReview({record,config,assets:w.assets,input:{productId:record.id,productRevision:record.revision,designId:design.id,objects:structuredClone(design.objects),options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media:[],preview}});
 w.customerDrafts.captureAcrylicReview('orientation-'+(steel?'steel':'acryl'),bundle);
 const base='http://127.0.0.1:'+server.address().port,csrf=(await(await fetch(base+'/api/workshop/session')).json()).csrfToken,headers={'Content-Type':'application/json','X-Gravuru-CSRF':csrf};
 return {w,bundle,base,headers,config,id:bundle.manifest.id,width:config.profile.geometry.width};
}
function inspect(pdf,points){return JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];k=72/25.4;pix=page.get_pixmap(alpha=True);print(json.dumps([list(pix.pixel(round(x*k),round(y*k))) for x,y in ${JSON.stringify(points)}]))`],{input:pdf,env:importEnvironment()}).toString());}

test('Acryl-Rückseite liefert die gespiegelte Datei, auch wenn der Client mirror:false sendet',{timeout:180000},async t=>{
 const f=await fixture(t);assert.equal(f.config.acrylic.print.side,'rear');
 const detail=await(await fetch(f.base+'/api/workshop/review-snapshots/'+f.id)).json();assert.deepEqual(detail.outputOrientation,{mirror:true,source:MIRROR_SOURCES.rear});
 const response=await fetch(f.base+'/api/workshop/export-jobs',{method:'POST',headers:f.headers,body:JSON.stringify({snapshotId:f.id,settings:{profile:'roland',mirror:false}})});
 assert.equal(response.status,202);const job=await response.json();assert.equal(job.settings.mirror,true);assert.equal(job.clientSettingsIgnored[0].field,'mirror');assert.equal(job.outputOrientation.source,MIRROR_SOURCES.rear);
 await f.w.exportWorker.wait(job.id);const proof=f.w.customerDrafts.printProof(f.id,job.recipeKey);assert.equal(proof.metadata.settings.mirror,true);
 const [left,right]=inspect(proof.pdf,[[25,40],[125,40]]);assert.equal(left[3],0,'Originalposition bleibt frei');assert.equal(right[3],255,'Quadrat erscheint gespiegelt');
 const same=await(await fetch(f.base+'/api/workshop/export-jobs',{method:'POST',headers:f.headers,body:JSON.stringify({snapshotId:f.id,settings:{profile:'roland'}})})).json();assert.equal(same.id,job.id,'ohne Clientflag derselbe Auftrag');
});
test('Stahl-Gravur bleibt ungespiegelt, auch wenn der Client mirror:true sendet',{timeout:180000},async t=>{
 const f=await fixture(t,{steel:true});assert.equal(f.bundle.manifest.schema,'gravuru-native-review/v1');assert.equal(f.bundle.manifest.product.method,'engraving');
 // K10: Der Prüfstand trägt das Verfahrensprofil (steel-engraving, nicht gespiegelt).
 assert.equal(f.bundle.manifest.product.processingProfileId,'steel-engraving');
 const detail=await(await fetch(f.base+'/api/workshop/review-snapshots/'+f.id)).json();assert.deepEqual(detail.outputOrientation,{mirror:false,source:MIRROR_SOURCES.process});
 const response=await fetch(f.base+'/api/workshop/export-jobs',{method:'POST',headers:f.headers,body:JSON.stringify({snapshotId:f.id,settings:{mode:'raster',mirror:true}})});
 assert.equal(response.status,202);const job=await response.json();assert.equal(job.settings.mirror,false);assert.equal(job.clientSettingsIgnored.length,1);
 await f.w.exportWorker.wait(job.id);const proof=f.w.customerDrafts.printProof(f.id,job.recipeKey);assert.equal(proof.metadata.settings.mirror,false);
 const [left,right]=inspect(proof.pdf,[[25,40],[f.width-25,40]]);assert.deepEqual(left.slice(0,3),[0,0,0]);assert.deepEqual(right.slice(0,3),[255,255,255]);
});
test('Gebundenes Fertigungsprofil bestimmt die Spiegelung auch gegen den Produktvertrag',{timeout:180000},async t=>{
 const f=await fixture(t);
 const profile=f.w.productionProfiles.create({name:'Vorderseite synthetisch',method:'print',materialId:'acrylic-clear',thicknessMm:f.config.profile.material.thicknessMm,machine:'',rip:'',notes:'Keine Maschinenfreigabe',archived:false,output:{profile:'roland',dpi:300,white:'motif',bleedMm:0,whiteBleedMm:0,mirror:false}});
 const record=f.w.repository.get(f.bundle.manifest.product.id),bound=f.w.repository.save(record.id,{...record.document,productionProfile:{id:profile.id,revision:1}},record.revision),config=f.w.model(bound.id,bound.revision).universal,design=config.profile.designs[0];
 const preview=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const bundle=await prepareAcrylicReview({record:bound,config,assets:f.w.assets,input:{productId:bound.id,productRevision:bound.revision,designId:design.id,objects:structuredClone(design.objects),options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media:[],preview}});
 f.w.customerDrafts.captureAcrylicReview('orientation-profile',bundle);
 const job=await(await fetch(f.base+'/api/workshop/export-jobs',{method:'POST',headers:f.headers,body:JSON.stringify({snapshotId:bundle.manifest.id,settings:{mirror:true}})})).json();
 assert.equal(job.settings.mirror,false);assert.equal(job.outputOrientation.source,MIRROR_SOURCES.profile);assert.equal(job.clientSettingsIgnored[0].requested,true);
 await f.w.exportWorker.wait(job.id);const proof=f.w.customerDrafts.printProof(bundle.manifest.id,job.recipeKey);assert.equal(proof.metadata.settings.mirror,false);assert.equal(proof.metadata.profileSettingsOverridden,false);
});
