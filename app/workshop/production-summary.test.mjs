import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {makeProductDocument} from './product-model.mjs';import {makeFormProduct} from './form-product.mjs';import {addFormDesign} from './form-designs.mjs';import {initialFormCustomerState} from './form-customer-model.mjs';import {prepareCustomerPhoto} from './customer-photo.mjs';import {prepareFormReview} from './form-review-snapshot.mjs';import {prepareAcrylicReview} from './acrylic-review.mjs';import {createFormPrintProof} from './form-print-proof.mjs';import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';import {createAcrylicPrintProof} from './acrylic-print-proof.mjs';import {readReviewPackage,digest} from './review-package.mjs';import {importEnvironment} from './design-assets.mjs';import {resolutionStatus,productionPackage,SUMMARY_FILES,PRODUCTION_SUMMARY_SCHEMA} from './production-summary.mjs';

const png=(w,h)=>execFileSync('python3',['-c',`from PIL import Image,ImageDraw;import sys;im=Image.new('RGB',(${w},${h}),'white');ImageDraw.Draw(im).rectangle((0,0,${Math.floor(w/2)-1},${h-1}),fill='red');im.save(sys.stdout.buffer,format='PNG')`],{env:importEnvironment()});
// Windows-Arial/PyMuPDF ordnet SPACE/NBSP sowie Hyphen/SoftHyphen derselben Glyph-ID zu.
// Nur diese belegten Extraktionsaliasse normalisieren; Inhalt, andere Abstände und Zeilen bleiben erhalten.
const normalizePdfText=text=>text.replace(/\u00a0/g,' ').replace(/\u00ad/g,'-');
const pdfInfo=bytes=>{const info=JSON.parse(execFileSync('python3',['-c',"import sys,json,pymupdf as f;d=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');p=d[0];print(json.dumps({'pages':len(d),'width':p.rect.width,'height':p.rect.height,'images':len(p.get_images()),'text':p.get_text()}))"],{input:bytes,env:importEnvironment()}).toString());return {...info,text:normalizePdfText(info.text)};};
function workshop(t,prefix){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),prefix));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});return {dir,seed,w};
}
async function formFixture(t){
 const {seed,w}=workshop(t,'g27-summary-form-');
 const c=await w.contours.import({name:'Freiform.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><path d="M0 0H60V30H40V40H0Z"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 const a=await w.assets.import({name:'Design.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect x="10" y="4" width="10" height="7" fill="red"/></svg>').toString('base64')});
 const font=Object.keys(seed.universal.localResources.fonts)[0],d=addFormDesign(makeFormProduct(c,'Freiform-Zusammenfassung'),a,{name:'Design',designId:'design-print'});
 d.processingMethod='print';d.material={id:'steel',thicknessMm:1.5,surfaceNotes:''};d.basePriceCents=2999;d.designs[0].sourcePrepared=true;
 d.designs[0].fields=[{id:'text',type:'text',label:'Name',xMm:2,yMm:30,widthMm:34,heightMm:7,text:'Hallo Wörld',font,sizeMm:3,color:'#222222',bold:false,italic:false,allowMove:false,allowScale:false,allowDelete:false,allowColor:false},{id:'photo',type:'photo',label:'Foto',xMm:25,yMm:6,widthMm:24,heightMm:16,shape:'rect',required:false,allowMove:true,allowScale:true,allowDelete:true}];
 const record=w.repository.create(d),created=w.customerDrafts.create(record,d.defaultDesignId,initialFormCustomerState(d.designs[0]));
 const raw=png(120,80),photo=await prepareCustomerPhoto(raw.toString('base64')),media=w.customerDrafts.addPhoto(created.id,created.token,photo),state=structuredClone(created.state);state.fields.find(f=>f.id==='photo').mediaId=media.mediaId;const draft=w.customerDrafts.save(created.id,created.token,state,1);
 const bundle=await prepareFormReview({record,draft,assets:w.assets,contours:w.contours,fonts:seed.universal.localResources.fonts,media:id=>w.customerDrafts.photo(created.id,created.token,id)});w.customerDrafts.capture(created.id,created.token,draft.revision,bundle);return {w,bundle,raw,font};
}
async function acrylicFixture(t,{engraving=false,photo=true}={}){
 const {seed,w}=workshop(t,'g27-summary-native-');
 const c=structuredClone(seed.universal);if(engraving)c.profile.processing.profileId='acrylic-engraving';const d=c.profile.designs[0],text=structuredClone(d.objects.find(o=>o.type==='text'));Object.assign(text,{id:'text',fieldKey:'names',text:'Anna & Lukas',size:5,x:100,y:40,w:10,h:6,rotation:15});
 d.objects=[text,{id:'photo',fieldKey:'photo-test',type:'photoSlot',x:90,y:100,w:20,h:20,rotation:0,photoShape:'rect',required:false,customerEditable:true}];
 const record=w.repository.create(makeProductDocument(c,{name:'Acryl · Zusammenfassung',kind:'product'})),config=w.model(record.id,1).universal,objects=structuredClone(config.profile.designs[0].objects),raw=png(200,200);if(photo)Object.assign(objects[1],{uxUploadId:'photo-test',uxUploadKind:'photo'});
 const input={productId:record.id,productRevision:1,designId:d.id,objects,options:{size:'small',base:'buche',wall:'none'},quantity:2,media:photo?[{id:'photo-test',original:raw.toString('base64')}]:[],preview:raw.toString('base64')},bundle=await prepareAcrylicReview({record,config,input,assets:w.assets});w.customerDrafts.captureAcrylicReview('fixture',bundle);return {w,bundle,raw,config};
}
function unpack(result,schema){const {files,manifest}=readReviewPackage(result.archive,digest(result.archive),schema);const summary=JSON.parse(files.get(SUMMARY_FILES.json));return {files,manifest,summary};}

test('PDF-Textextraktion normalisiert nur belegte Glyph-Aliasse und erhält Inhalt sowie Zeilen',()=>{
 assert.equal(normalizePdfText('Hallo\u00a0Wörld\nAnna & Lukas'),'Hallo Wörld\nAnna & Lukas');
 assert.equal(normalizePdfText('UV\u00adDruck'),'UV-Druck');
 assert.ok(!normalizePdfText('UVDruck').includes('UV-Druck')); 
 assert.equal(normalizePdfText('A  B\tC\nD\u202fE'), 'A  B\tC\nD\u202fE');
 assert.ok(!normalizePdfText('Hallo\u00a0').includes('Hallo Wörld'));
});

test('Ampel nach Ü5.1: grün ab Soll-dpi, gelb ab 60 %, rot darunter, offen ohne Messwert',()=>{
 assert.equal(resolutionStatus(300,300),'gruen');assert.equal(resolutionStatus(180,300),'gelb');assert.equal(resolutionStatus(179,300),'rot');assert.equal(resolutionStatus(null,300),'offen');assert.equal(resolutionStatus(200,null),'offen');
});

test('Form-Druckpaket enthält summary.pdf, summary.json und Originalfotos mit Manifest-Hashes; Textfelder in mm und Fotovermerk',async t=>{
 const f=await formFixture(t),result=await createFormPrintProof(f.bundle.package,f.bundle.manifest.packageSha256,{}),{files,manifest,summary}=unpack(result);
 for(const name of [SUMMARY_FILES.pdf,SUMMARY_FILES.json,'fotos/photo-original.png','technische-druckpruefung.pdf','druckpruefung.json'])assert.ok(files.has(name),name);
 assert.deepEqual(files.get('fotos/photo-original.png'),f.raw);
 const info=pdfInfo(files.get(SUMMARY_FILES.pdf));assert.equal(info.pages,1);assert.ok(Math.abs(info.width-595.28)<1&&Math.abs(info.height-841.89)<1);assert.equal(info.images,1);
 for(const needle of ['Fertigungspaket','Hallo Wörld','Auflösung niedrig','Edelstahl','60 × 40 mm','Bestellbezug','UV-Druck'])assert.ok(info.text.includes(needle),needle);
 // manifest.json listet alle neuen Dateien mit sha256 und Größe; Prüfstanddateien bleiben erhalten.
 for(const name of [SUMMARY_FILES.pdf,SUMMARY_FILES.json,'technische-druckpruefung.pdf','druckpruefung.json']){const entry=manifest.files.find(x=>x.path===name);assert.ok(entry,name);assert.equal(entry.sha256,digest(files.get(name)));assert.equal(entry.bytes,files.get(name).length);}
 assert.equal(manifest.production.schema,PRODUCTION_SUMMARY_SCHEMA);assert.equal(manifest.production.summary.pdf,digest(files.get(SUMMARY_FILES.pdf)));assert.equal(manifest.production.productionReady,false);assert.equal(manifest.schema,'gravuru-form-review/v1');
 const review=readReviewPackage(f.bundle.package,f.bundle.manifest.packageSha256);for(const entry of review.manifest.files){assert.deepEqual(files.get(entry.path),review.files.get(entry.path),entry.path);assert.deepEqual(manifest.files.find(x=>x.path===entry.path),entry);}
 assert.equal(summary.schema,PRODUCTION_SUMMARY_SCHEMA);assert.equal(summary.order,null);assert.match(summary.orderNote,/Konfigurations-ID/);
 assert.deepEqual(summary.configuration,{snapshotId:f.bundle.manifest.id,draftId:f.bundle.manifest.source.draftId,draftRevision:f.bundle.manifest.source.draftRevision,designId:'design-print',productId:f.bundle.manifest.product.id,productRevision:1,productName:'Freiform-Zusammenfassung',sourcePackageSha256:f.bundle.manifest.packageSha256});
 assert.equal(summary.product.material.label,'Edelstahl · gebürstet');assert.equal(summary.product.material.thicknessMm,1.5);assert.equal(summary.product.widthMm,60);assert.equal(summary.product.heightMm,40);assert.equal(summary.product.mounting.holeCount,1);assert.equal(summary.product.price.unitCents,2999);
 assert.deepEqual(summary.textFields,[{id:'text',label:'Name',text:'Hallo Wörld',font:f.font,bold:false,italic:false,colorHex:'#222222',sizeMm:3,xMm:19,yMm:33.5,widthMm:34,heightMm:7,rotationDeg:0,anchor:'center'}]);
 const [photo]=summary.photos;assert.equal(photo.path,'fotos/photo-original.png');assert.equal(photo.fileName,'photo-original.png');assert.equal(photo.sha256,digest(f.raw));assert.equal(photo.effectiveDpi,f.bundle.manifest.photos[0].effectiveDpi);assert.equal(photo.targetDpi,300);assert.equal(photo.status,'rot');assert.equal(photo.note,'Auflösung niedrig');
 assert.equal(summary.profile.mirror,false);assert.equal(summary.profile.name,null);assert.equal(summary.output.recipe,'gravuru-form-print-proof/v7');
 // #265, ENTSCHEIDUNGEN 3.61/3.62: Auch das Formprodukt führt die zwei Dateien der Bestellansicht (PDF und SVG mit Kontur).
 // Ihr Zweck im Manifest nennt, was die Fertigung wissen muss: nicht gespiegelt, Konturen in CutContour, Linie 0,001 mm.
 for(const name of ['druck-1zu1-mit-kontur.pdf','druck-1zu1-mit-kontur.svg']){const {purpose}=manifest.production.files.find(x=>x.path===name);assert.match(purpose,/nicht gespiegelt/,name);assert.match(purpose,/0,001 mm/);assert.match(purpose,/CutContour/);assert.doesNotMatch(purpose,/blau|rot|Haarlinie \(Schablone/);}
 assert.deepEqual(summary.output.files,['technische-druckpruefung.pdf','druckpruefung.json','druck-1zu1-mit-kontur.pdf','druck-1zu1-mit-kontur.svg']);assert.equal(summary.output.productionReady,false);
 assert.deepEqual(JSON.parse(files.get('druckpruefung.json')),result.metadata);
});

test('Natives Gravurpaket: Bestellbezug, Optionen mit Preis, skalierte Textposition und Drehung, Fotoampel aus photoResolution',async t=>{
 const f=await acrylicFixture(t,{engraving:true}),lines=[{id:'orderline_fixture',snapshotId:f.bundle.manifest.id,orderId:'1001',lineId:'55',shopDomain:'fixture.myshopify.com',quantity:2,unitCents:2398,totalCents:4796,currency:'EUR',test:true},{id:'orderline_other',snapshotId:'proof_other',orderId:'1002',lineId:'56'}];
 const result=await createAcrylicEngravingProof(f.bundle.package,f.bundle.manifest.packageSha256,{mirror:true},{orderLines:lines}),{files,manifest,summary}=unpack(result,'gravuru-acrylic-review/v1');
 assert.deepEqual(files.get('fotos/1-original.png'),f.raw);assert.ok(files.has('gravur-kontur-1zu1.pdf'));assert.ok(files.has('technische-gravurpruefung.pdf'));
 for(const name of [SUMMARY_FILES.pdf,SUMMARY_FILES.json,'gravur-kontur-1zu1.pdf','technische-gravurpruefung.pdf','gravurpruefung.json','gesicherte-gravurgestaltung.svg'])assert.equal(manifest.files.find(x=>x.path===name)?.sha256,digest(files.get(name)),name);
 assert.deepEqual(summary.order,[{orderId:'1001',lineId:'55',positionId:'orderline_fixture',shopDomain:'fixture.myshopify.com',quantity:2,unitCents:2398,totalCents:4796,currency:'EUR',test:true}]);assert.equal(summary.orderNote,null);
 assert.equal(summary.product.material.label,'Acrylglas');assert.equal(summary.product.methodLabel,'Gravur auf Acrylglas');assert.equal(summary.product.quantity,2);assert.equal(summary.product.price.unitCents,f.bundle.manifest.selection.price.unitCents);
 assert.deepEqual(summary.product.options.map(o=>[o.group,o.value,o.priceCents,o.priceKind]),[['Größe','15 × 20 cm',f.config.acrylic.pricing.sizes.small,'base'],['Sockel','Massiver Holzsockel · Buche',f.config.acrylic.pricing.bases.buche,'surcharge'],['Unsichtbare Wandhalterung','Ohne Wandhalterung',0,'surcharge']]);
 const [text]=summary.textFields;assert.equal(text.label,'names');assert.equal(text.text,'Anna & Lukas');assert.equal(text.sizeMm,5);assert.equal(text.xMm,100);assert.equal(text.yMm,40);assert.equal(text.rotationDeg,15);assert.equal(text.anchor,'center');
 const [photo]=summary.photos;assert.equal(photo.label,'photo-test');assert.equal(photo.effectiveDpi,f.bundle.manifest.photoResolution[0].effectiveDpi);assert.equal(photo.status,resolutionStatus(photo.effectiveDpi,300));assert.equal(photo.sha256,digest(f.raw));
 assert.equal(summary.profile.mirror,true);assert.equal(summary.profile.methodLabel,'Gravur auf Acrylglas');assert.equal(summary.output.recipe,'gravuru-acrylic-engraving-proof/v11');
 // #265, ENTSCHEIDUNGEN 3.62: Zweck der Bestelldateien der Gravur im Manifest – nicht gespiegelt (auch hier, bei gespiegeltem Profil), Ebene „03 Gravur“, Anlegen blau, Schnitte rot, Linie 0,001 mm.
 for(const name of ['gravur-1zu1-mit-kontur.pdf','gravur-1zu1-mit-kontur.svg']){const {purpose}=manifest.production.files.find(x=>x.path===name);for(const needle of ['nicht gespiegelt','03 Gravur','blau','rot','0,001 mm'])assert.ok(purpose.includes(needle),name+': '+needle);assert.doesNotMatch(purpose,/CutContour/);}
 const info=pdfInfo(files.get(SUMMARY_FILES.pdf));assert.equal(info.pages,1);assert.equal(info.images,1);for(const needle of ['1001','orderline_fixture','Anna & Lukas','15°','Massiver Holzsockel','Spiegelung','ja'])assert.ok(info.text.includes(needle),needle);
});

test('Natives Druckpaket ohne Foto: Ampel bleibt leer, Produktionsdateinamen unverändert, doppelte Namen abgelehnt',async t=>{
 const f=await acrylicFixture(t,{photo:false}),result=await createAcrylicPrintProof(f.bundle.package,f.bundle.manifest.packageSha256,{profile:'mimaki'}),{files,manifest,summary}=unpack(result,'gravuru-acrylic-review/v1');
 assert.ok(files.has('Mimaki-FARBE-ohne-RDG_WHITE.pdf'));assert.ok(files.has('Mimaki-NUR-RDG_WHITE.pdf'));assert.deepEqual(summary.photos,[]);assert.equal(summary.product.method,'print');
 assert.equal(manifest.files.find(x=>x.path==='Mimaki-NUR-RDG_WHITE.pdf').sha256,result.metadata.downloads.white.sha256);assert.equal(manifest.files.find(x=>x.path==='Mimaki-FARBE-ohne-RDG_WHITE.pdf').sha256,result.metadata.downloads.pdf.sha256);
 assert.equal(pdfInfo(files.get(SUMMARY_FILES.pdf)).images,1);
 const review=readReviewPackage(f.bundle.package,f.bundle.manifest.packageSha256,'gravuru-acrylic-review/v1');
 await assert.rejects(()=>productionPackage({files:review.files,manifest:review.manifest,metadata:result.metadata,pdf:result.pdf,extras:[{name:'manifest.json',blob:new Blob([Buffer.from('{}')])}]}),/nicht eindeutig/);
});
