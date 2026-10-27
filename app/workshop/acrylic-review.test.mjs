import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {once} from 'node:events';import {execFileSync} from 'node:child_process';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {importEnvironment} from './design-assets.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview,ACRYLIC_REVIEW,validateAcrylicReview} from './acrylic-review.mjs';
import {acrylicPrintKey,createAcrylicPrintProof} from './acrylic-print-proof.mjs';
import {digest,readReviewPackage} from './review-package.mjs';

test('hidden native photo originals and applied raster remain in the immutable package without entering the visible price',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-hidden-original-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const original=w.repository.get(w.defaultId),document=structuredClone(original.document),design=document.config.profile.designs[0],slot=design.objects.find(o=>o.type==='photoSlot');
 slot.acrylicFixed=false;slot.required=false;slot.customerEditable=true;delete document.config.workshopElementRights;document.elementRights[design.id][slot.id].delete=true;
 const record={...original,document},config={...document.config,localResources:seed.universal.localResources};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
 const objects=structuredClone(design.objects);Object.assign(objects.find(o=>o.id===slot.id),{uxHidden:true,uxUploadId:'hidden-original',uxUploadKind:'photo'});
 const input={productId:record.id,productRevision:record.revision,designId:design.id,objects,options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:2,media:[{id:'hidden-original',original:png.toString('base64'),edited:png.toString('base64')}],preview:png.toString('base64')};
 const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});const saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,ACRYLIC_REVIEW);
 assert.equal(bundle.manifest.photos.length,1);assert.equal(bundle.manifest.photoResolution.length,0);assert.equal(bundle.manifest.selection.price.chargedUploads,0);
 assert.deepEqual(saved.files.get(bundle.manifest.photos[0].path),png);assert.deepEqual(saved.files.get(bundle.manifest.photos[0].edited.path),png);
 assert.equal(JSON.parse(saved.files.get('produkt-und-gestaltung.json')).state.design.objects.find(o=>o.id===slot.id).uxHidden,true);
 assert.throws(()=>validateAcrylicReview(record,config,{...input,media:[]}),/Originalbilder/);
});

test('native acrylic handoff pins rights, all 28 prices, originals and immutable snapshots; rejects forged requests',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-acrylic-review-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],filename=path.join(dir,'workshop.sqlite');
 let w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});
 const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Acryl Prüfmuster',kind:'product'}),config=w.model(record.id,1).universal,source=config.profile.designs[0];
 const png=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import io,sys;f=io.BytesIO();Image.new('RGBA',(40,60),(210,80,40,255)).save(f,format='PNG');sys.stdout.buffer.write(f.getvalue())"],{env:importEnvironment()}).toString('base64');
 const input={productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:{size:'large',base:'eiche',wall:'yes'},quantity:2,media:[{id:'test-photo',original:png,edited:png}],preview:png};
 const photo=input.objects.find(o=>o.type==='photoSlot');Object.assign(photo,{uxUploadId:'test-photo',uxUploadKind:'photo',uxPhotoCrop:{zoom:1.4,x:.1,y:-.1,angle:0}});
 // Use the real catalogue IDs, and exercise every commercial combination.
 const groups=config.profile.optionGroups;input.options=Object.fromEntries(groups.map(g=>[g.id,g.defaultValueId]));
 for(const size of groups.find(g=>g.id==='size').values)for(const base of groups.find(g=>g.id==='base').values)for(const wall of groups.find(g=>g.id==='wall').values){const result=validateAcrylicReview(record,config,{...input,options:{size:size.id,base:base.id,wall:wall.id}});assert.equal(result.price.totalCents,result.price.unitCents*2);assert.ok(result.geometry.widthMm>=150);}
 const known=validateAcrylicReview(record,config,{...input,options:{size:'large',base:'eiche',wall:'wall'}});assert.equal(known.price.unitCents,3697);assert.equal(known.price.totalCents,7394);assert.equal(known.geometry.insertionMm,7);
 const server=createPreviewServer({workshop:w,outputDirectory:dir});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const {csrfToken}=await (await fetch(base+'/api/workshop/session')).json();
 const post=(data,headers={})=>fetch(base+'/api/workshop/acrylic-reviews',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken,...headers},body:JSON.stringify(data)});
 assert.equal((await post(input,{'X-Gravuru-CSRF':''})).status,403);
 assert.equal((await post(input,{Origin:'https://foreign.example'})).status,403);
 for(const bad of [{...input,totalCents:1},{...input,quantity:undefined},{...input,productRevision:undefined},{...input,options:{size:'invented'}},{...input,media:[]},{...input,media:[{id:'other',original:png}]},{...input,preview:Buffer.from('<svg onload="alert(1)"/>').toString('base64')}])assert.equal((await post(bad)).status,422);
 const locked=structuredClone(input);locked.objects.find(o=>o.acrylicFixed).x+=1;assert.equal((await post(locked)).status,422);
 const response=await post(input);const saved=await response.json();assert.equal(response.status,201,JSON.stringify(saved));
 const repeat=await (await post(input)).json();assert.equal(repeat.id,saved.id);assert.equal(w.customerDrafts.listSnapshots().length,1);
 const original=w.customerDrafts.downloadSnapshot(saved.id,'package'),manifest=w.customerDrafts.review(saved.id).manifest;
 assert.equal(manifest.schema,ACRYLIC_REVIEW);assert.equal(manifest.selection.price.quantity,2);assert.equal(manifest.productionReady,false);
 assert.equal(manifest.photos[0].edited.width,40);assert.equal(manifest.photos[0].edited.height,60);assert.equal(manifest.photoResolution.length,1);assert.equal(manifest.photoResolution[0].source,'edited');assert.ok(manifest.photoResolution[0].effectiveDpi<300);assert.equal(manifest.photoResolution[0].grade,'rot');assert.equal(manifest.photoResolution[0].targetDpi,300);assert.ok(manifest.warnings.some(s=>s.startsWith('Auflösung niedrig')&&s.includes('Foto wurde angenommen')));assert.deepEqual(manifest.photoHints.map(h=>h.text),['Das Foto ist klein, wir holen das Beste raus.']);assert.equal(manifest.blockers.some(s=>/Auflösung/.test(s)),false); // Ü5.2: nie eine Sperre
 const largeBundle=await prepareAcrylicReview({record,config,input:{...input,options:{size:'large',base:'eiche',wall:'wall'}},assets:w.assets});assert.ok(largeBundle.manifest.photoResolution[0].placedWidthMm>manifest.photoResolution[0].placedWidthMm);assert.ok(largeBundle.manifest.photoResolution[0].effectiveDpi<manifest.photoResolution[0].effectiveDpi);
 const archive=readReviewPackage(original,manifest.packageSha256,ACRYLIC_REVIEW);assert.deepEqual(archive.manifest.photoResolution,manifest.photoResolution);assert.deepEqual(archive.files.get('fotos/1-original.png'),Buffer.from(png,'base64'));assert.deepEqual(archive.files.get('fotos/1-bearbeitet.png'),Buffer.from(png,'base64'));assert.throws(()=>readReviewPackage(original,manifest.packageSha256));
 const queued=await fetch(base+'/api/workshop/export-jobs',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken},body:JSON.stringify({snapshotId:saved.id,settings:{}})});assert.equal(queued.status,202);const job=await queued.json();await w.exportWorker.wait(job.id);assert.equal(job.settings.mirror,true,'Acryl-Rückseite: Spiegelung aus dem Produktvertrag (Ü7.2)');assert.equal(job.recipeKey,acrylicPrintKey({mirror:true}));const proof=w.customerDrafts.printProof(saved.id,job.recipeKey);assert.ok(proof.metadata.vectorGlyphs>0);assert.equal(proof.metadata.settings.mirror,true);assert.equal(proof.metadata.settings.dpi,300);assert.equal(proof.metadata.settings.bleedMm,0);assert.equal(proof.metadata.settings.white,'motif');assert.equal(proof.metadata.settings.colorSpace,'DeviceCMYK');
 const inspect=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');k=72/25.4;page=p[0];layers=p.get_ocgs();objs='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()));white=[i for i,v in layers.items() if v['name']=='RDG_WHITE'];p.set_layer(-1,on=white,off=[i for i in layers if i not in white]);q=f.open(stream=p.tobytes(),filetype='pdf');pix=q[0].get_pixmap(matrix=f.Matrix(2,2),alpha=True);print(json.dumps({'width':page.rect.width/k,'height':page.rect.height/k,'rdg':'/Separation /RDG_WHITE' in objs,'cut':'/Separation /CutContour' in objs,'empty':pix.pixel(round(2*k*2),round(2*k*2))[-1],'photo':pix.pixel(round(75*k*2),round(60*k*2))[-1],'cmyk':all(i[5]=='DeviceCMYK' for i in page.get_images() if i[5]!='DeviceGray')}))`],{input:proof.pdf,env:importEnvironment()}).toString());assert.ok(Math.abs(inspect.width-150)<.001);assert.ok(Math.abs(inspect.height-200)<.001);assert.equal(inspect.empty,0);assert.equal(inspect.photo,255);assert.equal(inspect.rdg,true);assert.equal(inspect.cut,true);assert.equal(inspect.cmyk,true);
 const contourRequest=()=>fetch(base+'/api/workshop/review-snapshots/'+saved.id+'/download',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken},body:JSON.stringify({kind:'contour'})});const contourResponse=await contourRequest();assert.equal(contourResponse.status,200);const contour=Buffer.from(await contourResponse.arrayBuffer());assert.equal(contour.subarray(0,5).toString(),'%PDF-');assert.deepEqual(Buffer.from(await (await contourRequest()).arrayBuffer()),contour);
 const output=readReviewPackage(proof.archive,digest(proof.archive),ACRYLIC_REVIEW);assert.deepEqual(output.files.get('fotos/1-original.png'),Buffer.from(png,'base64'));assert.doesNotMatch(output.files.get('gesicherte-gestaltung.svg').toString(),/scene|base-eiche|data-resize|data-object|<text/);
 const mimaki=await createAcrylicPrintProof(original,manifest.packageSha256,{profile:'mimaki',bleedMm:1,mirror:true});assert.equal(mimaki.metadata.settings.bleedMm,0);assert.equal(mimaki.metadata.settings.mirror,true);assert.ok(readReviewPackage(mimaki.archive,digest(mimaki.archive),ACRYLIC_REVIEW).files.has('Mimaki-NUR-RDG_WHITE.pdf'));

 const changed=structuredClone(record.document);changed.config.acrylic.pricing.sizes.small+=100;w.repository.save(record.id,changed,1);
 assert.deepEqual(w.customerDrafts.printProof(saved.id,job.recipeKey).pdf,proof.pdf);assert.deepEqual(w.customerDrafts.downloadSnapshot(saved.id,'package'),original);assert.equal((await (await post(input)).json()).id,saved.id);
 const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="80mm" viewBox="0 0 100 80"><path d="M10 10H90V70H10Z" fill="#334455"/></svg>');
 const asset=await w.assets.import({name:'Design.svg',bytes:svg.toString('base64')});const importInput={expectedRevision:2,designId:source.id,assetId:asset.assetId,fit:'visible',originalName:'Design.svg'};const plan=planDesignImport(w.repository,w.assets,record.id,importInput);const imported=applyDesignImport(w.repository,w.assets,record.id,{...importInput,token:plan.token});
 const native=w.model(record.id,imported.revision).universal,importedInput={...input,productRevision:imported.revision,objects:native.profile.designs[0].objects,quantity:1,media:[]};const importedResponse=await post(importedInput),importedSnapshot=await importedResponse.json();assert.equal(importedResponse.status,201,JSON.stringify(importedSnapshot));
 const importedManifest=w.customerDrafts.review(importedSnapshot.id).manifest,importedArchive=readReviewPackage(w.customerDrafts.downloadSnapshot(importedSnapshot.id,'package'),importedManifest.packageSha256,ACRYLIC_REVIEW);assert.deepEqual(importedArchive.files.get('quellen/'+asset.assetId+'-original.svg'),svg);assert.ok(importedArchive.files.has('quellen/'+asset.assetId+'-vorschau.svg'));
 const importedProof=await createAcrylicPrintProof(w.customerDrafts.downloadSnapshot(importedSnapshot.id,'package'),importedManifest.packageSha256,{});assert.equal(importedProof.pdf.subarray(0,5).toString(),'%PDF-');assert.equal(importedProof.metadata.settings.dpi,300);
 const db=new DatabaseSync(filename);assert.throws(()=>db.prepare('UPDATE form_review_snapshots SET preview=? WHERE id=?').run('changed',saved.id),/immutable/);db.close();
 w.close();w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy});assert.deepEqual(w.customerDrafts.downloadSnapshot(saved.id,'package'),original);
});

test('native full-area print extends only inked outer edges, keeps white inside and mirrors once',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-acrylic-full-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const config=structuredClone(seed.universal);config.profile.geometry.safeMarginMm=0;config.profile.geometry.cornerRadiusMm=0;config.profile.designs[0].objects=[{id:'left',type:'graphic',shape:'rect',x:37.5,y:100,w:75,h:200,rotation:0,strokeWidth:.2,filled:true,color:'#ff0000',customerEditable:false,technicalLocked:true},{id:'right',type:'graphic',shape:'rect',x:112.5,y:100,w:75,h:200,rotation:0,strokeWidth:.2,filled:true,color:'#0000ff',customerEditable:false,technicalLocked:true}];
 const record=w.repository.create(makeProductDocument(config,{name:'Vollfläche · synthetisch',kind:'product'})),native=w.model(record.id,1).universal;
 const preview=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const input={productId:record.id,productRevision:1,designId:native.profile.designs[0].id,objects:native.profile.designs[0].objects,options:{size:'small',base:'none',wall:'none'},quantity:1,media:[],preview};
 const bundle=await prepareAcrylicReview({record,config:native,input,assets:w.assets}),result=await createAcrylicPrintProof(bundle.package,bundle.manifest.packageSha256,{bleedMm:1,mirror:true});assert.equal(result.metadata.settings.bleedMm,1);assert.equal(result.metadata.settings.whiteBleedMm,0);assert.equal(result.metadata.edgeInk,true);
 const info=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];k=72/25.4;pix=page.get_pixmap(matrix=f.Matrix(2,2),alpha=True)
def sample(pix,x,y):return list(pix.pixel(round(x*k*2),round(y*k*2)))
color=[sample(pix,x,y) for x,y in [(10,100),(140,100),(.5,100)]];layers=p.get_ocgs();white=[i for i,v in layers.items() if v['name']=='RDG_WHITE'];p.set_layer(-1,on=white,off=[i for i in layers if i not in white]);q=f.open(stream=p.tobytes(),filetype='pdf');wp=q[0].get_pixmap(matrix=f.Matrix(2,2),alpha=True);print(json.dumps({'width':page.rect.width/k,'height':page.rect.height/k,'color':color,'white':[sample(wp,x,y)[-1] for x,y in [(.5,100),(10,100)]]}))`],{input:result.pdf,env:importEnvironment()}).toString());assert.ok(Math.abs(info.width-152)<.001);assert.ok(Math.abs(info.height-202)<.001);assert.ok(info.color[0][2]>info.color[0][0]);assert.ok(info.color[1][0]>info.color[1][2]);assert.equal(info.color[2][3],255);assert.deepEqual(info.white,[0,255]);
});

test('review package freezes only the fonts and motifs of this design and references the embedded material image by hash',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-slim-review-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const record=w.repository.get(w.defaultId),config=w.model(record.id,record.revision).universal,design=config.profile.designs[0];
 // Live-Modelle tragen das ganze Profil-Schriftset und das Materialbild als data:-URL (zusammen ~11 MB).
 const unused={...Object.values(config.localResources.fonts)[0],note:'x'.repeat(2*1024*1024)};
 const big={...config,materialSurface:'data:image/png;base64,'+Buffer.alloc(1536*1024,7).toString('base64'),localResources:{...config.localResources,fonts:{...config.localResources.fonts,'Ungenutzt · 000000000000':unused},motifs:[...config.localResources.motifs,{...config.localResources.motifs[0],key:'ungenutztes-motiv'}]}};
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64').toString('base64');
 const objects=structuredClone(design.objects),media=[];
 for(const [i,o] of objects.filter(o=>o.type==='photoSlot').entries()){Object.assign(o,{uxUploadId:'foto-'+i,uxUploadKind:'photo'});media.push({id:'foto-'+i,original:png,edited:png});}
 const input={productId:record.id,productRevision:record.revision,designId:design.id,objects,options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media,preview:png};
 const bundle=await prepareAcrylicReview({record,config:big,input,assets:w.assets});
 const saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256,ACRYLIC_REVIEW),frozen=JSON.parse(saved.files.get('konfigurator-quellen.json'));
 const usedFonts=new Set(objects.filter(o=>typeof o.font==='string').map(o=>o.font)),usedMotifs=new Set(objects.filter(o=>typeof o.motif==='string').map(o=>o.motif));
 assert.deepEqual(new Set(Object.keys(frozen.localResources.fonts)),new Set([...usedFonts].filter(id=>Object.hasOwn(big.localResources.fonts,id))));
 assert.deepEqual(new Set(frozen.localResources.motifs.map(m=>m.key)),new Set([...usedMotifs].filter(k=>big.localResources.motifs.some(m=>m.key===k))));
 assert.equal(frozen.localResources.scope,config.localResources.scope);
 assert.equal(frozen.materialSurface,undefined);
 assert.equal(frozen.embeddedImageReferences.materialSurface.sha256,digest(big.materialSurface));
 assert.deepEqual(frozen.profile,JSON.parse(JSON.stringify(config.profile)));
 assert.ok(bundle.package.length<1.5*1024*1024,'Paket bleibt klein: '+bundle.package.length);
});

test('profile fonts that are present in the product library are accepted on save; unknown fonts stay rejected',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-profile-font-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 const w=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const record=w.repository.get(w.defaultId),config=structuredClone(w.model(record.id,record.revision).universal),design=config.profile.designs[0];
 // Live: importierte Profilschriften tragen eine Hash-Endung und stehen nicht in SUPPORTED_FONT_IDS.
 const id='Lato Regular · c3d3cabdb582';config.localResources.fonts[id]=structuredClone(Object.values(config.localResources.fonts)[0]);
 if(Array.isArray(config.workshopProfiles?.selections?.fonts))config.workshopProfiles.selections.fonts.push(id);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64').toString('base64');
 const objects=structuredClone(design.objects),media=[];
 for(const [i,o] of objects.filter(o=>o.type==='photoSlot').entries()){Object.assign(o,{uxUploadId:'foto-'+i,uxUploadKind:'photo'});media.push({id:'foto-'+i,original:png,edited:png});}
 const text=objects.find(o=>o.type==='text');assert.ok(text,'Seed-Design braucht einen Text');text.font=id;
 const input={productId:record.id,productRevision:record.revision,designId:design.id,objects,options:Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId])),quantity:1,media,preview:png};
 const bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});
 const frozen=JSON.parse(readReviewPackage(bundle.package,bundle.manifest.packageSha256,ACRYLIC_REVIEW).files.get('konfigurator-quellen.json'));
 assert.ok(Object.hasOwn(frozen.localResources.fonts,id),'genutzte Profilschrift liegt im Paket');
 text.font='Nicht vorhanden · 000000000000';
 await assert.rejects(prepareAcrylicReview({record,config,input,assets:w.assets}),/Schrift/);
 // Ohne Schriftauswahl im Profil bleibt es beim bisherigen Rahmen: Produktschriften und Grundset, keine Fremdschrift.
 const open=structuredClone(config);open.workshopProfiles={...open.workshopProfiles,selections:{...open.workshopProfiles?.selections,fonts:null}};delete open.localResources.fonts[id];
 text.font=id;
 await assert.rejects(prepareAcrylicReview({record,config:open,input,assets:w.assets}),/nicht freigegeben/);
 text.font='Montserrat';
 await prepareAcrylicReview({record,config:open,input,assets:w.assets});
});
