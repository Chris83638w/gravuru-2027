import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {holesFor,ruleFromHoles,keepoutZones} from '../platform/sources/app/shared/models/mounting-rules.mjs';
import {createDesignAssetStore} from './design-assets.mjs';
import {createProductRepository} from './repository.mjs';
import {validateProductDocument,resolveProduct} from './product-model.mjs';
import {createProductFamilies,validateFamily} from './product-families.mjs';
import {createWorkshop} from './http.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';

const family=()=>JSON.parse(fs.readFileSync(new URL('../designs/steel-door-signs/family.json',import.meta.url)));
const OVAL='GR-ES-OV-90X60-T15',RECT='GR-ES-RE-120X80-T15',R5='GR-ES-AB-90X60-T15';
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
 const oval=f.sizes.find(s=>s.key===OVAL);assert.equal(oval.baseCents,1099);assert.deepEqual(oval.mounting,['B02-E6-D4']);
 assert.ok(f.mountingRules.every(r=>r.priceCents===0),'master data: drilling has no surcharge');
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
 assert.deepEqual(values.map(v=>v.id),['K00','B02']);assert.deepEqual(values[1].holes,[{x:6,y:30,diameter:4},{x:84,y:30,diameter:4}]);assert.equal(values[1].mountingRule.keepoutMm,1);
 for(const mounting of ['K00','B02'])assert.equal(resolveProduct(oval,{options:{mounting}}).price.totalCents,1099);
 const rect=repository.get(first.products[1].productId).document.config.profile.optionGroups[0].values[1];assert.deepEqual(rect.holes.map(h=>[h.x,h.y]),[[6,40],[114,40]]);
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
 const legacy=structuredClone(doc);delete legacy.config.profile.optionGroups[0].values[1].mountingRule;
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
 assert.equal(acryl.readiness.ready,false);assert.match(acryl.readiness.reason,/Acrylglas-Gravurplatten .* noch nicht/);
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
 const v1=family();assert.equal(v1.schema,'gravuru-product-family/v1');validateFamily(v1);
 assert.throws(()=>validateFamily({...memorial('acryl-schwarz'),schema:'gravuru-product-family/v1'}),/v1/);
});
