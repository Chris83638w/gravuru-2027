import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {holesFor,ruleFromHoles,keepoutZones} from '../platform/sources/app/shared/models/mounting-rules.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {createProductRepository} from './repository.mjs';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {createProductFamilies,validateFamily,familyProductConfig,familyTemplate,geometryOf,familyGaps,familyReady,familyProcess,familyBriefing} from './product-families.mjs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {selectedProfile,customerLayoutIssue} from '../configurator/variant-m/contract.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';

const family=()=>JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
const OVAL='GR-ES-OV-90X60-T15',RECT='GR-ES-RE-120X80-T15',R5='GR-ES-AB-90X60-T15';

test('139: stake starter fits the head and the native product retains the full stem',()=>{
 const f=family();f.groups=[{key:'STAKE',name:'Grabstecker',shape:'contour',cornerRadiusMm:0}];f.mountingRules=[];f.withoutMounting=true;f.designArea={marginMm:0,keepoutMm:0};
 const s={key:'stake-test',groupKey:'STAKE',label:'Kopf 12 × 10 cm',widthMm:120,heightMm:300,baseCents:1899,mounting:[],holesMm:[],outlinePath:'M0 0H120V100H65V300H55V100H0Z',workingArea:{headHeightMm:100,previewHeightMm:110}};f.sizes=[s];
 validateFamily(f);const c=familyProductConfig(f,s,1),t=c.profile.designs[0].objects[0];
 assert.equal(c.profile.geometry.height,300);assert.equal(c.profile.geometry.outlinePath,s.outlinePath);assert.deepEqual(c.profile.workingArea,s.workingArea);
 assert(t.size>=1&&t.size<=100);assert(t.y+t.h/2<=100);assert.equal(customerLayoutIssue(t,c.profile,c.localResources),'');
 const bad=structuredClone(f);bad.sizes[0].workingArea.previewHeightMm=300;assert.throws(()=>validateFamily(bad),/Kopfansicht/);
});
function stores(t){
 const assets=createDesignAssetStore({filename:':memory:'});t.after(()=>assets.close());
 const repository=createProductRepository({filename:':memory:',validateDocument:d=>assets.validateDocument(validateProductDocument(d))});t.after(()=>repository.close());
 const families=createProductFamilies({filename:':memory:',repository});t.after(()=>families.close());
 return {repository,families};
}

test('drill pattern rules: plan acceptance values, user example, resize keeps millimetres',()=>{
 const two={layout:'left-right',count:2,diameterMm:4,edgeMm:8},four={layout:'corners',count:4,diameterMm:4,edgeMm:8};
 assert.deepEqual(holesFor({width:120,height:80,shape:'rect'},two).map(h=>[h.x,h.y]),[[8,40],[112,40]]);
 assert.deepEqual(holesFor({width:120,height:80,shape:'rect'},four).map(h=>[h.x,h.y]),[[8,8],[112,8],[8,72],[112,72]]);
 const user={layout:'left-right',count:2,diameterMm:4,edgeMm:6};
 assert.deepEqual(holesFor({width:90,height:60,shape:'ellipse'},user).map(h=>[h.x,h.y,h.diameter]),[[6,30,4],[84,30,4]]);
 assert.deepEqual(holesFor({width:120,height:80,shape:'ellipse'},user).map(h=>[h.x,h.y]),[[6,40],[114,40]],'edge distance stays 6 mm, not proportional');
 assert.throws(()=>holesFor({width:90,height:60,shape:'ellipse'},{...four,edgeMm:6}),/ovalen Form/);
 assert.throws(()=>holesFor({width:12,height:30,shape:'rect'},{...two,edgeMm:4}),/zu dicht/);
 assert.throws(()=>holesFor({width:90,height:60,shape:'rect'},{...user,count:4}),/benötigt 2/);
 assert.throws(()=>holesFor({width:90,height:60,shape:'rect'},{...user,edgeMm:1}),/halben Durchmesser/);
 assert.deepEqual(ruleFromHoles({width:90,height:60,shape:'ellipse'},[{x:6,y:30,diameter:4},{x:84,y:30,diameter:4}]),user);
 assert.equal(ruleFromHoles({width:90,height:60,shape:'rect'},[{x:6,y:30,diameter:4},{x:80,y:30,diameter:4}]),null,'asymmetric coordinates are not silently turned into a rule');
 assert.deepEqual(keepoutZones([{x:6,y:30,diameter:4}],1),[{x:6,y:30,r:3}]);
});

test('bundled steel family reproduces the master data and rejects invalid documents',()=>{
 const f=validateFamily(family());
 assert.equal(f.sizes.length,61);assert.equal(f.groups.length,5);assert.deepEqual(f.designArea,{marginMm:0,keepoutMm:1});
 const oval=f.sizes.find(s=>s.key===OVAL);assert.equal(oval.baseCents,1099);assert.deepEqual(oval.mounting,['KGL','KRA','B02-E6-D4','B02S-E6-D4']);
 assert.deepEqual(Object.fromEntries(f.mountingRules.map(r=>[r.skuSuffix,r.priceCents])),{KGL:299,KRA:399,B02:249,B02S:269,B04:289,B04S:309},'surcharges as in the shop product Variante C');
 for(const broken of [d=>d.sizes[0].groupKey='XX',d=>d.mountingRules[0].count=3,d=>d.sizes.push(structuredClone(d.sizes[0])),d=>d.designArea.keepoutMm=-1,d=>d.material.kind='acrylic',d=>d.extra=1]){const d=family();broken(d);assert.throws(()=>validateFamily(d));}
});

test('products are generated once per size with rule-based holes, prices and no publication',async t=>{
 const {repository,families}=stores(t),rec=families.create(family());
 const first=families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL,RECT,R5]});
 assert.equal(first.created,3);
 const again=families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL,RECT]});
 assert.equal(again.created,0);assert.equal(again.existing,2);assert.deepEqual(again.products.map(p=>p.productId),first.products.slice(0,2).map(p=>p.productId));
 const oval=repository.get(first.products[0].productId).document,values=oval.config.profile.optionGroups[0].values;
 assert.equal(oval.name,'Edelstahl-Türschilder · Oval 9 × 6 cm');assert.deepEqual(oval.categoryIds,['familie-steel-door-signs','form-ov']);
 assert.equal(oval.config.profile.geometry.shape,'ellipse');assert.equal(oval.config.profile.features.orderEnabled,false);assert.equal(oval.config.profile.binding.kind,'local-review');
 assert.deepEqual(values.map(v=>v.id),['K00','KGL','KRA','B02','B02S']);const b02=values.find(v=>v.id==='B02');assert.deepEqual(b02.holes,[{x:6,y:30,diameter:4},{x:84,y:30,diameter:4}]);assert.equal(b02.mountingRule.keepoutMm,1);
 assert.deepEqual(values.find(v=>v.id==='B02S').holes,b02.holes);assert.equal(values.find(v=>v.id==='B02S').mountingRule.accessory,'screws');assert.deepEqual(values.find(v=>v.id==='KGL').holes,[]);
 for(const [mounting,total] of [['K00',1099],['KGL',1398],['KRA',1498],['B02',1348],['B02S',1368]])assert.equal(resolveProduct(oval,{options:{mounting}}).price.totalCents,total);
 const rect=repository.get(first.products[1].productId).document.config.profile.optionGroups[0].values.find(v=>v.id==='B02');assert.deepEqual(rect.holes.map(h=>[h.x,h.y]),[[6,40],[114,40]]);
 assert.deepEqual(families.get(rec.id).products.filter(p=>p.productId).map(p=>p.sizeKey).sort(),[OVAL,R5,RECT].sort());
});

test('family revisions are immutable, conflicts are reported, existing products stay unchanged',async t=>{
 const {repository,families}=stores(t),rec=families.create(family());
 const made=families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL]}),before=repository.get(made.products[0].productId);
 const changed=family();changed.sizes.find(s=>s.key===OVAL).baseCents=1299;
 assert.throws(()=>families.save(rec.id,changed,0),e=>e.status===409);
 const saved=families.save(rec.id,changed,1);assert.equal(saved.revision,2);
 assert.equal(families.get(rec.id,{revision:1}).document.sizes.find(s=>s.key===OVAL).baseCents,1099);
 assert.equal(families.save(rec.id,changed,2).revision,2,'unchanged save adds no revision');
 assert.throws(()=>families.generate(rec.id,{expectedRevision:1}),e=>e.status===409);
 families.generate(rec.id,{expectedRevision:2,sizeKeys:[OVAL]});
 assert.deepEqual(repository.get(made.products[0].productId),before,'a family revision never rewrites an existing product');
 assert.throws(()=>families.create(family()),e=>e.status===409);
});

test('design template shows contour, holes and keep-out only; briefing bundles all sizes',async t=>{
 const {families}=stores(t),rec=families.create(family()),svg=families.template(rec.id,OVAL);
 assert.match(svg,/width="90mm" height="60mm" viewBox="0 0 90 60"/);assert.match(svg,/<circle cx="6" cy="30" r="2" fill="#d33"\/>/);assert.match(svg,/r="3" fill="none"/);
 assert.match(svg,/id="bohrbild-B02"/);assert.match(svg,/nicht drucken/);
 const zip=await families.briefing(rec.id),names=(await import('node:zlib'),[...zip.toString('latin1').matchAll(/schablonen\/[A-Z0-9-]+\.svg/g)].map(m=>m[0]));
 assert.equal(new Set(names).size,61);assert.ok(zip.includes(Buffer.from('BRIEFING.md')));assert.ok(zip.includes(Buffer.from('schriften.txt')));
});

test('family HTTP routes require the session CSRF token and deliver template and briefing',async t=>{
 const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
 const ws=createWorkshop({filename:':memory:',seedConfig:makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'b'.repeat(64)),legacy:{purchasing:{},features:{}}});t.after(()=>ws.close());
 const server=createPreviewServer({workshop:ws});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port+'/api/workshop/',session=await (await fetch(url+'session')).json();
 const send=(path,data,token=session.csrfToken)=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(data)});
 assert.equal((await send('families',{bundled:'steel-door-signs'},'0'.repeat(64))).status,403);
 const list=await (await fetch(url+'families')).json();assert.deepEqual(list.families,[]);assert.equal(list.bundled[0].id,'steel-door-signs');
 const created=await send('families',{bundled:'steel-door-signs'});assert.equal(created.status,201);
 assert.equal((await send('families',{bundled:'steel-door-signs'})).status,409);
 const gen=await (await send('families/steel-door-signs/products',{expectedRevision:1,sizeKeys:[OVAL]})).json();assert.equal(gen.created,1);
 const tpl=await fetch(url+'families/steel-door-signs/template/'+OVAL);assert.equal(tpl.status,200);assert.match(tpl.headers.get('content-type'),/image\/svg\+xml/);assert.match(await tpl.text(),/bohrbild-B02/);
 const zip=await send('families/steel-door-signs/briefing',{});assert.equal(zip.status,200);assert.equal(zip.headers.get('content-type'),'application/zip');
 assert.equal((await fetch(url+'families/steel-door-signs/template/..%2Fetc')).status,404);
});

test('family changes reach generated products only after preview and confirmation; designs are kept',async t=>{
 const {repository,families}=stores(t),rec=families.create(family());
 const SMALL='GR-ES-RE-50X20-T15',made=families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL,SMALL]}),ovalId=made.products[0].productId;
 const designBefore=repository.get(ovalId).document.config.profile.designs;
 assert.equal(families.planSync(rec.id).changed,0);
 const changed=family();changed.sizes.find(s=>s.key===OVAL).baseCents=1199;changed.mountingRules.find(r=>r.id==='B02-E6-D4').priceCents=150;
 const small=changed.sizes.find(s=>s.key===SMALL);small.widthMm=30;small.heightMm=12;
 families.save(rec.id,changed,1);
 const plan=families.planSync(rec.id),oval=plan.items.find(i=>i.sizeKey===OVAL),tiny=plan.items.find(i=>i.sizeKey===SMALL);
 assert.equal(repository.get(ovalId).revision,1,'preview writes nothing');
 assert.equal(oval.status,'change');assert.ok(oval.changes.some(c=>c.label==='Grundpreis'&&c.before==='10,99 €'&&c.after==='11,99 €'));
 assert.equal(tiny.status,'error');assert.match(tiny.message,/passt nicht/);
 assert.throws(()=>families.applySync(rec.id,{expectedRevision:2,token:'0'.repeat(64)}),e=>e.status===409);
 const applied=families.applySync(rec.id,{expectedRevision:2,token:plan.token});assert.equal(applied.updated,1);
 const after=repository.get(ovalId);assert.equal(after.revision,2);assert.equal(after.document.config.basePriceCents,1199);
 assert.equal(resolveProduct(after.document,{options:{mounting:'B02'}}).price.totalCents,1349);
 assert.deepEqual(after.document.config.profile.designs,designBefore,'designs untouched');
 assert.equal(repository.get(ovalId,{revision:1}).document.config.basePriceCents,1099,'old revision kept');
 assert.equal(families.planSync(rec.id).items.find(i=>i.sizeKey===OVAL).status,'same');
 // A product edited in the meantime is not overwritten.
 const again=family();again.sizes.find(s=>s.key===OVAL).baseCents=1299;families.save(rec.id,again,2);
 const p3=families.planSync(rec.id),doc=repository.get(ovalId).document;doc.seo.description='Händler hat geändert';repository.save(ovalId,doc,2);
 assert.throws(()=>families.applySync(rec.id,{expectedRevision:3,token:p3.token}),e=>e.status===409);
});

test('order snapshot keeps a production note when the customer leaves a text in a drill-hole zone',async t=>{
 const {prepareAcrylicReview}=await import('./acrylic-review.mjs');
 const {repository,families}=stores(t),rec=families.create(family());
 const id=families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL]}).products[0].productId,record=repository.get(id);
 const config=structuredClone(record.document.config);config.profile.id=record.id;config.profile.revision=record.id+':1';
 const objects=structuredClone(config.profile.designs[0].objects),preview=fs.readFileSync(new URL('./preview-assets/reference.jpg',import.meta.url)).toString('base64');
 const snapshot=async(options,x)=>{objects[0].x=x;return (await prepareAcrylicReview({record,config,input:{productId:id,productRevision:1,designId:'start',objects:structuredClone(objects),options,quantity:1,media:[],preview}})).manifest;};
 const near=await snapshot({mounting:'B02'},32);
 assert.ok(near.warnings.some(w=>/Prüfvermerk Bohrloch: Text „Familie Muster“ liegt im Schutzbereich des Bohrlochs bei 6 \| 30 mm/.test(w)),near.warnings.join('\n'));
 assert.equal(near.productionReady,false);
 assert.ok(!(await snapshot({mounting:'B02'},45)).warnings.some(w=>/Bohrloch/.test(w)),'centred text: no note');
 assert.ok(!(await snapshot({mounting:'K00'},32)).warnings.some(w=>/Bohrloch/.test(w)),'no holes: no note');
});

test('resizing a family product keeps drill holes at the same edge distance in mm',async t=>{
 const {resizeSteelDocument}=await import('../configurator/variant-m/steel-formats.mjs');
 const {repository,families}=stores(t),rec=families.create(family());
 const doc=repository.get(families.generate(rec.id,{expectedRevision:1,sizeKeys:[OVAL]}).products[0].productId).document;
 const resized=resizeSteelDocument(doc,{width:120,height:80});
 const b02=resized.config.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.id==='B02');
 assert.deepEqual(b02.holes,[{x:6,y:40,diameter:4},{x:114,y:40,diameter:4}],'6 mm edge distance kept, not scaled to 8 mm');
 validateProductDocument(resized);
 const legacy=structuredClone(doc);delete legacy.config.profile.optionGroups[0].values.find(v=>v.id==='B02').mountingRule;
 assert.throws(()=>resizeSteelDocument(legacy,{width:120,height:80}),/festem Bohrbild/,'fixed coordinates without rule stay blocked');
});

// Materialübergreifende Familien (v2): offene Stammdaten bleiben null, nichts wird geraten.
const memorial=k=>JSON.parse(fs.readFileSync(new URL('../designs/gedenktafeln-30x20/'+k+'.json',import.meta.url)));
test('memorial families 30 × 20: all materials validate, open values block generation with plain reasons',async t=>{
 for(const k of ['edelstahl','schiefer-natur','schiefer-premium','acryl-schwarz','acryl-anthrazit'])validateFamily(memorial(k));
 const {repository,families}=stores(t);
 const slate=families.create(memorial('schiefer-natur'));
 assert.equal(slate.readiness.ready,true);
 const made=families.generate(slate.id,{expectedRevision:slate.revision});
 assert.equal(made.created,1);
 const doc=repository.get(made.products[0].productId).document,p=doc.config.profile;
 assert.equal(p.material.kind,'slate');assert.equal(p.processing.profileId,'slate-engraving');assert.equal(doc.config.basePriceCents,2999);
 assert.deepEqual(p.optionGroups[0].values.map(v=>[v.id,v.priceCents,v.holes.map(h=>[h.x,h.y,h.diameter])]),[['K00',0,[]],['B02',299,[[12,100,5],[288,100,5]]],['B04',399,[[12,12,5],[288,12,5],[12,188,5],[288,188,5]]]]);
 const acryl=families.create(memorial('acryl-schwarz'));
 assert.equal(acryl.readiness.ready,false);assert.match(acryl.readiness.reason,/Stammdaten unvollständig/);assert.ok(acryl.readiness.gaps.includes('Materialstärke'));
 assert.throws(()=>families.generate(acryl.id,{expectedRevision:acryl.revision}),e=>e.status===422);
 const steel=families.create(memorial('edelstahl'));
 assert.deepEqual(steel.readiness.gaps,['Materialstärke','Gestaltungsrand','Bohrbild „4 Bohrlöcher“: Durchmesser und Randabstand']);
 assert.throws(()=>families.generate(steel.id,{expectedRevision:steel.revision}),/Stammdaten unvollständig/);
 assert.match(families.template(steel.id,'GT-ES-RE-300X200'),/Bohrbild offen/);
 const zip=await families.briefing(steel.id);assert.ok(zip.length>100);
 // filling in the open values makes the same family generate
 const filled=structuredClone(steel.document);filled.material.thicknessMm=1.5;filled.designArea.marginMm=0;Object.assign(filled.mountingRules[0],{diameterMm:4,edgeMm:8});
 const saved=families.save(steel.id,filled,steel.revision);assert.equal(saved.readiness.ready,true);
 assert.equal(families.generate(steel.id,{expectedRevision:saved.revision}).created,1);
});
test('family validation: wrong process for a material and half-open drill rules are rejected',()=>{
 const f=memorial('schiefer-natur');
 assert.throws(()=>validateFamily({...f,material:{...f.material,processingProfileId:'steel-engraving'}}),/slate-engraving/);
 const half=structuredClone(f);half.mountingRules[0].edgeMm=null;assert.throws(()=>validateFamily(half),/gemeinsam/);
 const v1=family();v1.schema='gravuru-product-family/v1';v1.mountingRules=v1.mountingRules.filter(r=>r.layout!=='none'&&!r.accessory);for(const r of v1.mountingRules)r.priceCents=0;for(const z of v1.sizes)z.mounting=z.mounting.filter(m=>v1.mountingRules.some(r=>r.id===m));delete v1.source.shopVariants;delete v1.sizeKeyPrefix;delete v1.sizeKeySuffix;validateFamily(v1);
 assert.throws(()=>validateFamily({...memorial('acryl-schwarz'),schema:'gravuru-product-family/v1'}),/v1/);
});

test('K10: family process profile – id validated, null stays open, engraving side sets the mirror, Excel round trip keeps the column',()=>{
 const f=memorial('schiefer-natur');
 assert.throws(()=>validateFamily({...f,material:{...f.material,processingProfileId:'uv-roland'}}),/Unbekanntes Verfahrensprofil/);
 const open={...f,material:{...f.material,processingProfileId:null}};validateFamily(open);
 assert.ok(familyGaps(open).includes('Verfahrensprofil'));assert.equal(familyProcess(open),null);
 assert.throws(()=>familyProductConfig(open,open.sizes[0],1),/Verfahrensprofil/);
 const slate=familyProcess(f);assert.equal(slate.id,'slate-engraving');assert.equal(slate.tools.textColor,false);assert.deepEqual(slate.palette,[]);assert.equal(slate.minTextMm,3);assert.equal(slate.mirror,false);
 // UV-Druck ist materialneutral und für jede Familie zulässig.
 validateFamily({...f,material:{...f.material,processingProfileId:'color-print'}});assert.equal(familyProcess({...f,material:{...f.material,processingProfileId:'color-print'}}).minTextMm,3);
 const standoff=id=>JSON.parse(fs.readFileSync(new URL('../designs/acrylic-standoff-signs/'+id+'.json',import.meta.url)));
 assert.equal(familyProcess(standoff('aa')).mirror,true);assert.equal(familyProcess(standoff('ss')).mirror,false);assert.equal(familyProcess(memorial('acryl-schwarz')).mirror,true);
 assert.match(familyBriefing(standoff('aa'),1),/Profil „acrylic-engraving“/);assert.match(familyBriefing(standoff('aa'),1),/Mindestschriftgröße 3 mm/);assert.match(familyBriefing(standoff('aa'),1),/Spiegelung für die Fertigung: ja/);
 assert.match(familyBriefing(open,1),/Verfahren offen/);
 // Excel-Rundlauf: Spalte „Verfahrensprofil“ wird geschrieben und exakt zurückgelesen (auch die Gravurseite).
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-family-excel-')),xlsx=path.join(dir,'stamm.xlsx'),root=fileURLToPath(new URL('../../',import.meta.url)),python=process.env.GRAVURU_PYTHON||'python3';
 try{
  execFileSync(python,[path.join(root,'scripts/family-excel.py'),'export','--out',xlsx,path.join(root,'app/designs/acrylic-standoff-signs/ss.json'),path.join(root,'app/designs/gedenktafeln-30x20/schiefer-natur.json')],{cwd:root});
  const header=execFileSync(python,['-c',"import sys;from openpyxl import load_workbook;wb=load_workbook(sys.argv[1]);print('|'.join(str(c.value) for c in wb['Familien'][1]));print('|'.join(str(c.value) for c in wb['Familien'][2]))",xlsx]).toString().split('\n');
  assert.ok(header[0].split('|').includes('Verfahrensprofil'));assert.ok(header[1].split('|').includes('acrylic-engraving'));
  execFileSync(python,[path.join(root,'scripts/family-excel.py'),'import','--xlsx',xlsx,'--out',path.join(dir,'out')],{cwd:root});
  const back=JSON.parse(fs.readFileSync(path.join(dir,'out','acryl-ss-abstandshalter.json')));
  assert.equal(back.material.processingProfileId,'acrylic-engraving');assert.equal(back.material.engravingSide,'front');assert.equal(familyProcess(validateFamily(back)).mirror,false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'out','gedenktafel-30x20-schiefer-natur.json'))).material.processingProfileId,'slate-engraving');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('steel family reproduces all 309 shop variants of „Variante C“ (SKU and price)',()=>{
 const f=validateFamily(family()),v=JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/shopify-variante-c-20261016.json',import.meta.url)));
 const shop=new Map(v.variants.map(x=>[x.sku,x.priceCents]));const seen=new Set();
 for(const s of f.sizes){const c=familyProductConfig(f,s,1);for(const val of c.profile.optionGroups[0].values){const sku=s.key.replace('GR-ES-','GR-C-')+'-'+val.id;assert.equal(c.basePriceCents+val.priceCents,shop.get(sku),sku);seen.add(sku);}}
 assert.equal(seen.size,309);assert.equal(shop.size,309);
});

test('acrylic standoff families from the Corel drawing: per-size radius, standoffs, backing plate',()=>{
 const load=k=>JSON.parse(fs.readFileSync(new URL('../designs/acrylic-standoff-signs/'+k+'.json',import.meta.url)));
 
 for(const k of ['aa','as','ss']){const f=validateFamily(load(k));assert.equal(f.sizes.length,33);assert.equal(f.fonts.length,75,'Freigabeliste: 49 Nutzer + Fjalla One + 25 Ergänzungen');assert.ok(f.fonts.includes('Michroma')&&f.fonts.includes('Zentenar Fraktur')&&f.fonts.includes('Uncial Antiqua'));assert.deepEqual(f.mountingRules.map(r=>r.id),['AH02-E10-D8','AH02-E15-D8','AH04-E10-D8','AH04-E15-D8']);assert.ok(f.mountingRules.every(r=>r.accessory==='standoffs'&&r.diameterMm===8));}
 const ss=load('ss');
 // Eingezogene Ecken (konkav) as drawn: own shape, radius per size, backing radius as measured.
 const ee=ss.sizes.find(s=>s.key==='SS-EE-210X140');assert.deepEqual(geometryOf(ss,ee),{width:210,height:140,shape:'plaque',cornerRadiusMm:13.5,backingCornerRadiusMm:14.8});assert.deepEqual(ee.mounting,['AH02-E10-D8'],'10 mm as drawn, not unified');
 const ov=ss.sizes.find(s=>s.key==='SS-OV-210X140');assert.deepEqual(ov.mounting,['AH02-E15-D8']);
 // R5 = column 1 of the drawing (rect 3:2, 2 standoffs) with 5 mm rounded corners, appended after the drawn sizes.
 const r5=ss.sizes.filter(s=>s.groupKey==='R5');assert.deepEqual(r5.map(s=>s.key),['SS-R5-150X100','SS-R5-180X120','SS-R5-240X160','SS-R5-300X200','SS-R5-360X240','SS-R5-420X280']);assert.ok(r5.every(s=>s.mounting.length===1&&s.mounting[0].startsWith('AH02')));assert.equal(geometryOf(ss,r5[1]).cornerRadiusMm,5);
 // Order as drawn: column by column, top to bottom; the added R5 size last.
 assert.deepEqual(ss.sizes.slice(0,6).map(s=>s.key),['SS-RE-150X100','SS-RE-180X120','SS-RE-240X160','SS-RE-300X200','SS-RE-360X240','SS-RE-420X280']);assert.equal(ss.sizes.at(-1).key,'SS-R5-420X280');
 const svg=familyTemplate(ss,ee);assert.match(svg,/viewBox="-10 -10 230 160"/,'backing plate 10 mm around');assert.match(svg,/id="rueckplatte"[^>]*><path d="M14.8 0H215.2A14.8 14.8 0 0 0 230 14.8/,'backing with concave corners');assert.match(svg,/id="kontur"><path d="M13.5 0H196.5A13.5 13.5 0 0 0 210 13.5/,'plate with concave corners (sweep 0)');
 assert.match(familyTemplate(ss,ss.sizes.find(s=>s.key==='SS-R5-180X120')),/id="kontur"><path d="M5 0H175A5 5 0 0 1 180 5/,'rounded corners keep sweep 1');
 assert.ok(!familyGaps(ss).some(g=>/eingezogene Ecken/.test(g)),'acrylic concave shape uses the exact native contour');
 assert.equal(familyReady(ss).ready,false,'historic open catalogue prices still block generation');
 assert.throws(()=>validateFamily({...ss,backing:{...ss.backing,offsetMm:-1}}),/Rückplatte/);
 const bad=structuredClone(ss);bad.sizes.find(s=>s.groupKey==='OV').cornerRadiusMm=5;assert.throws(()=>validateFamily(bad),/Eckenradius/);
 const noBacking=structuredClone(load('aa'));noBacking.sizes.find(s=>s.groupKey==='EE').backingCornerRadiusMm=12;assert.throws(()=>validateFamily(noBacking),/Rückplatte/);
});

const contourFamily=()=>{
 const f=family();
 f.groups=[{key:'RT2',name:'Retro 2',shape:'contour',cornerRadiusMm:0}];
 f.mountingRules=[{id:'B02-KONTUR-D4',label:'Zwei Bohrungen aus Zeichnung',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'}];
 f.sizes=[{key:'GR-ES-RT2-90X60-T15',groupKey:'RT2',label:'9 × 6 cm',widthMm:90,heightMm:60,baseCents:1499,mounting:['B02-KONTUR-D4'],outlinePath:'M0 5C5 5 5 0 10 0H80C85 0 85 5 90 5V55C85 55 85 60 80 60H10C5 60 5 55 0 55Z',holesMm:[{x:7.995,y:30,diameterMm:4},{x:82.005,y:30,diameterMm:4}]}];
 f.designArea.marginMm=2;f.designArea.keepoutMm=3;return f;
};
test('contour family keeps exact outline and drawing holes independently of edge rules',()=>{
 const f=validateFamily(contourFamily()),s=f.sizes[0],g=geometryOf(f,s);
 assert.equal(g.shape,'contour');assert.equal(g.outlinePath,s.outlinePath);assert.deepEqual(g.holesMm,s.holesMm);
 const svg=familyTemplate(f,s);
 assert.ok(svg.includes('d="'+s.outlinePath+'"'));
 assert.ok(svg.includes('cx="7.995" cy="30" r="2"'));
 assert.ok(svg.includes('cx="82.005" cy="30" r="2"'));
 assert.ok(svg.includes('id="nutzflaeche-maske"'));
 assert.ok(!svg.includes('transform="translate(2 2)"'),'no false scaled contour margin');
 assert.ok(familyBriefing(f,1).includes('feste Lochpositionen aus Zeichnung'));
 assert.ok(!familyGaps(f).some(g=>g.includes('Kontur')));
 assert.ok(!familyGaps(f).some(g=>g.startsWith('Bohrbild')),'fixed drawing holes are complete');
 const c=familyProductConfig(f,s,1),p=selectedProfile(c,{mounting:'B02'});
 assert.equal(p.geometry.outlinePath,s.outlinePath);assert.equal(p.geometry.safeMarginMm,2);assert.equal(p.geometry.holeKeepoutMm,3);
 assert.equal(p.geometry.holesMm,undefined,'profile carries selected holes only');
 assert.deepEqual(p.geometry.holes,s.holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm})));
 assert.equal(p.optionGroups[0].values.find(v=>v.id==='B02').mountingRule.fixed,true);
 assert.equal(p.optionGroups[0].values.find(v=>v.id==='B02').mountingRule.edgeMm,undefined,'no invented edge rule');
 assert.equal(customerLayoutIssue({type:'motif',x:7.995,y:30,w:2,h:2,rotation:0},p),'','artwork crosses future drilling; physical hole stays in the profile');
 assert.equal(customerLayoutIssue({type:'motif',x:7.995,y:30,w:2,h:2,rotation:0},selectedProfile(c,{mounting:'K00'})),'');
 g.holesMm[0].x=999;assert.equal(s.holesMm[0].x,7.995,'geometry does not mutate drawing');
});
test('contour family validates physical bounds, fixed holes and form-only fields',()=>{
 const invalidChange=fn=>{const f=contourFamily();fn(f,f.sizes[0]);assert.throws(()=>validateFamily(f));};
 invalidChange((f,s)=>delete s.outlinePath);
 invalidChange((f,s)=>s.outlinePath='M0 0H90V60H0');
 invalidChange((f,s)=>s.widthMm=91);
 invalidChange((f,s)=>s.outlinePath='M1 0H91V60H1Z');
 invalidChange((f,s)=>delete s.holesMm);
 invalidChange((f,s)=>s.holesMm[0].x=NaN);
 invalidChange((f,s)=>s.holesMm[0].diameterMm=0);
 invalidChange((f,s)=>s.holesMm[0].x=1);
 invalidChange((f,s)=>s.holesMm[0].diameterMm=5);
 invalidChange((f,s)=>s.holesMm.pop());
 invalidChange((f,s)=>s.holesMm[1]={...s.holesMm[0]});
 invalidChange(f=>f.groups[0].cornerRadiusMm=5);
 invalidChange(f=>f.groups[0].shape='rect');
 invalidChange((f,s)=>s.holesMm[0].onload='unsafe');
 const f=contourFamily();f.mountingRules[0].diameterMm=null;assert.doesNotThrow(()=>validateFamily(f));
});
test('partially specified edge rules remain invalid for existing shapes',()=>{
 const f=family(),r=f.mountingRules.find(r=>r.layout!=='none');r.diameterMm=4;r.edgeMm=null;assert.throws(()=>validateFamily(f),/Durchmesser und Randabstand/);
});

test('contour backing stays storable and explicitly open without a false rectangle offset',()=>{
 const f=contourFamily();f.backing={label:'Rückplatte',offsetMm:5,thicknessMm:3};validateFamily(f);
 const svg=familyTemplate(f,f.sizes[0]);assert.ok(svg.includes('id="rueckplatte" data-status="offen"'));assert.ok(!svg.includes('stroke="#06c"'));assert.ok(familyBriefing(f,1).includes('bei Konturformen ist der Rückplattenversatz noch offen'));
});

test('M: outdoor suitability is optional, explicit and never inferred',()=>{
 const source=family(),plain=validateFamily(structuredClone(source));assert.equal(Object.hasOwn(plain,'outdoorSuitable'),false);for(const value of [null,true,false]){const f=validateFamily({...structuredClone(source),outdoorSuitable:value});assert.equal(f.outdoorSuitable,value);}for(const value of ['ja',1,{},[]])assert.throws(()=>validateFamily({...structuredClone(source),outdoorSuitable:value}),/außen geeignet/);
});


test('M: target preview option supports print and acrylic without enabling a production adapter',()=>{
 const steel=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url),'utf8'));
 for(const [kind,process] of [['steel','color-print'],['acrylic','acrylic-engraving'],['slate','color-print']]){const family=structuredClone(steel);family.material.kind=kind;family.material.processingProfileId=process;family.groups=family.groups.filter(g=>g.key==='RE');family.sizes=family.sizes.filter(s=>s.groupKey==='RE');family.sizes.forEach(s=>s.baseCents=0);
 const c=familyProductConfig(family,family.sizes[0],1,{previewOnly:true});assert.equal(c.profile.material.kind,kind);assert.equal(c.profile.processing.profileId,process);assert.equal(c.reviewOnly,true);assert.equal(c.profile.features.orderEnabled,false);assert.throws(()=>familyProductConfig(family,family.sizes[0],1));
 family.material.thicknessMm=null;assert.throws(()=>familyProductConfig(family,family.sizes[0],1,{previewOnly:true}),e=>e.status===422&&/Materialstärke/.test(e.message));}
});

// Hausnummern AA/AS/S/S (Chris 29.10.2026): Abstandshalter-Farbe je Halterset als zwei sich
// ausschließende Gruppen; die verdeckte Gruppe wird weder angezeigt noch berechnet.
test('family option groups: spacer colour per set, hidden group neither shown nor priced',async()=>{
 const {quote,resolvedOptions,variantCombinations}=await import('../configurator/variant-m/contract.mjs');
 const f=validateFamily(JSON.parse(fs.readFileSync(new URL('./fixtures/familien/acryl-ss-abstandshalter.json',import.meta.url),'utf8')));
 const size=key=>f.sizes.find(s=>s.key===key);
 for(const key of ['SS-RE-150X100','SS-RE-150X100-H']){
  const c=familyProductConfig(f,size(key),1,{previewOnly:true}),base=size(key).baseCents,price=o=>quote(c,[],'start',o).unitCents;
  assert.deepEqual(c.profile.optionGroups.map(g=>[g.id,g.defaultValueId,g.visibleIf?.valueIds]),[['mounting','AH02',undefined],['abstandshalter-farbe','ES',['AH02']],['abstandshalter-farbe-ah04','ES',['AH04']]]);
  assert.equal(price({mounting:'AH02'}),base+199);
  assert.equal(price({mounting:'AH02','abstandshalter-farbe':'SW'}),base+299);
  assert.equal(price({mounting:'AH04','abstandshalter-farbe-ah04':'WS'}),base+599);
  assert.equal(price({mounting:'AH04','abstandshalter-farbe-ah04':'ES'}),base+399);
  // Verdeckte Gruppe: ein mitgeschickter Wert wird verworfen und nicht berechnet.
  assert.equal(price({mounting:'AH04','abstandshalter-farbe':'SW'}),base+399);
  assert.deepEqual(Object.keys(resolvedOptions(c,{mounting:'AH04','abstandshalter-farbe':'SW'})),['mounting','abstandshalter-farbe-ah04']);
  assert.equal(variantCombinations(c).length,6);
  assert.equal(selectedProfile(c,{mounting:'AH04','abstandshalter-farbe-ah04':'SW'}).mountingPreview.finish,'black');
  assert.equal(selectedProfile(c,{mounting:'AH02','abstandshalter-farbe':'WS'}).mountingPreview.finish,'white');
  assert.equal(selectedProfile(c,{mounting:'AH02'}).mountingPreview.finish,'silver');
 }
 // Größe ohne 4er-Set: die 4er-Farbgruppe entfällt ganz.
 const r5=familyProductConfig(f,size('SS-R5-150X100'),1,{previewOnly:true});
 assert.deepEqual(r5.profile.optionGroups.map(g=>g.id),['mounting','abstandshalter-farbe']);
 // Der Acryl-Anschluss ergänzt jetzt auch die unveränderte konkave Quellkontur.
 const ee=f.sizes.find(s=>s.groupKey==='EE'),ec=familyProductConfig(f,ee,1,{previewOnly:true});
 assert.equal(ec.profile.geometry.shape,'contour');assert.match(ec.profile.geometry.outlinePath,/A[0-9.]+ [0-9.]+ 0 0 0/);
 assert.equal(familyProductConfig(f,size('SS-RE-150X100'),1).familyAcrylic.familyId,f.id);
});
