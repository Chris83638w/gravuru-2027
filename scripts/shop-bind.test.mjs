import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {katalogFamilyToProduct} from '../app/workshop/katalog-convert.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {targetsForLine,planShopSync} from './shop-sync.mjs';
import {bindSelections,resolveRecords,exportReader,openWorkshopDb,checkSelections,priceMismatches,applyChecks,formatBind,run,BIND_SCHEMA} from './shop-bind.mjs';

const FIXTURE=fileURLToPath(new URL('./fixtures/shop-sync/',import.meta.url));
const KATALOG=path.join(FIXTURE,'katalog'),EXPORT=path.join(FIXTURE,'export-7x2.json');
const HANDOFF=JSON.parse(fs.readFileSync(new URL('../docs/handoffs/2026-10-22-shopify-7x2-hauptprodukte.json',import.meta.url),'utf8'));
const sha=v=>createHash('sha256').update(v).digest('hex');
const exportDoc=()=>JSON.parse(fs.readFileSync(EXPORT,'utf8'));
const syncPlan=(doc=exportDoc())=>planShopSync(targetsForLine(openKatalog(KATALOG),'edelstahl-tuerschilder',{allDesigns:true}),doc,{generatedAt:'2026-10-23T12:00:00.000Z'});
const STORE='fixture-store',SHOP=HANDOFF.shopDomain;

// Temporäre Werkstatt-DB mit den drei 7x2-Hauptprodukten aus dem Fixture-Katalog (Import-Journal wie katalog-import).
function workshopDb(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-shop-bind-')),filename=path.join(dir,'workshop.sqlite'),connections=[];
 const k=openKatalog(KATALOG),line=k.lines.get('edelstahl-tuerschilder'),{_file,_material,...doc}=k.families.get('steel-door-signs');
 const sub=line.subcategories.find(s=>s.id==='familienschilder'),size=doc.sizes.find(s=>s.key==='GR-ES-RE-70X23P3-T15');
 const repository=createProductRepository({filename,tenantId:'gravuru'});
 const entries=sub.mainProducts.filter(m=>['3100000','3200000','3300000'].includes(m.id)).map(main=>{
  const product=katalogFamilyToProduct(doc,line,{...sub,startDesign:main.startDesign,sizesOffered:main.sizesOffered},{size,mainProduct:main});
  const key='katalog:edelstahl-tuerschilder:familienschilder:GR-ES-RE-70X23P3-T15:'+main.id;
  return {key,fingerprint:sha(key),document:product.document};
 });
 const created=repository.importBatch(entries);
 repository.close();
 t.after(()=>{for(const connection of connections.reverse())connection.close();fs.rmSync(dir,{recursive:true,force:true});});
 return {dir,filename,created,closeBeforeCleanup:connection=>connections.push(connection)};
}
const clockAt=iso=>{let now=Date.parse(iso);return ()=>now+=5;};

test('Auswahl aus dem shop-sync-Plan: nur „unverändert“, jede Variante mit Werkstatt-Option {mounting:<Schlüssel>} und Soll-Preis',()=>{
 const b=bindSelections(syncPlan());
 assert.equal(b.shopDomain,SHOP);assert.equal(b.selections.length,15);
 assert.deepEqual(b.pending.map(p=>[p.konfiProductId.split('-').at(-1)+'/'+p.konfiProductId.split('-').at(-2),p.action]),[['9900000/t15','update'],['9900000/t15','offen'],['9910000/t15','offen'],['9920000/t15','konflikt']]);
 assert.match(b.pending[0].reason,/erst shop-sync --apply/);
 for(const h of HANDOFF.products)for(const v of h.variants){
  const s=b.selections.find(s=>s.shopifyVariantId===v.shopifyVariantId);
  assert.deepEqual([s.konfiProductId,s.shopifyProductId,s.sku,s.mountingKey,s.options,s.expectedUnitCents],[h.konfiProductId,h.shopifyProductId,v.sku,v.mountingKey,{mounting:v.mountingKey},v.priceCents]);
 }
 assert.throws(()=>bindSelections({schema:'x'}),{code:'plan_schema'});
 const dup=syncPlan();dup.entries[1].variants[0].shopifyVariantId=dup.entries[0].variants[0].shopifyVariantId;assert.throws(()=>bindSelections(dup),{code:'ids'});
});

test('Werkstatt-DB: Konfi-Produkte über Import-Journal oder profile.id auflösen; Prüfung id-plan-ready mit Shop-Preisen aus dem Export',async t=>{
 const {filename,closeBeforeCleanup}=workshopDb(t),clock=clockAt('2026-10-23T12:00:00Z');
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',shopDomain:SHOP,storeId:STORE,clock});closeBeforeCleanup(ws);
 const selections=resolveRecords(bindSelections(syncPlan()).selections,ws.repository);
 assert.ok(selections.every(s=>/^cfg_[a-f0-9-]{36}$/.test(s.productId)&&s.productRevision===1&&s.resolution==='import-journal'));
 assert.equal(new Set(selections.map(s=>s.productId)).size,3);
 // Ohne Journal: genau ein Produkt mit dieser profile.id; unbekannt → offen.
 const noJournal=resolveRecords(selections.map(s=>({...s,importKey:null})),ws.repository);
 assert.ok(noJournal.every((s,i)=>s.productId===selections[i].productId&&s.resolution==='profile-id'));
 const unknown=resolveRecords([{...selections[0],importKey:null,konfiProductId:'katalog-fremd'}],ws.repository)[0];
 assert.equal(unknown.productId,null);assert.match(unknown.open,/nicht in der Werkstatt-DB/);
 const reader=exportReader(exportDoc(),{shopDomain:SHOP});
 const blocks=await checkSelections(selections,{adapter:ws.adapter,reader,clock});
 assert.equal(blocks.length,1);assert.equal(blocks[0].error,null);
 const r=blocks[0].result;
 assert.equal(r.status,'id-plan-ready');assert.equal(r.productionStatus,'profile-assignment-pending');assert.equal(r.written,false);assert.equal(r.shopifyWrites,false);
 assert.equal(r.entries.length,15);assert.ok(r.entries.every(e=>e.shopifyStatus==='ACTIVE'&&e.readiness.sourceReady===true&&e.readiness.bindingBlockers.length===0));
 assert.deepEqual(priceMismatches(blocks[0]),[]);
 assert.deepEqual(r.entries.map(e=>e.baseUnitCents),selections.map(s=>s.expectedUnitCents));
 assert.ok(r.plan&&r.plan.purpose==='id-binding'&&r.plan.entries.length===15);
 assert.deepEqual(r.plan.entries[1].options,{mounting:'KGL'});assert.equal(r.plan.entries[1].binding.mode,'bind-required');
 // Shop-Preis weicht ab → Prüfung lehnt den Block ab (kein Teilplan).
 const off=exportDoc();off.products.find(p=>p.id===HANDOFF.products[0].shopifyProductId).variants.nodes[1].price='9.99';
 const failed=await checkSelections(selections,{adapter:ws.adapter,reader:exportReader(off,{shopDomain:SHOP}),clock});
 assert.equal(failed[0].result,null);assert.equal(failed[0].error.code,'shop_binding_price');
 // Variante im Export unbekannt → Zugehörigkeit nicht bestätigt.
 const missing=exportDoc();missing.products=missing.products.filter(p=>p.id!==HANDOFF.products[2].shopifyProductId);
 assert.equal((await checkSelections(selections,{adapter:ws.adapter,reader:exportReader(missing,{shopDomain:SHOP}),clock}))[0].error.code,'shop_binding_ownership');
 assert.throws(()=>openWorkshopDb(filename,{shopDomain:SHOP}),{code:'store_id'});
 assert.throws(()=>openWorkshopDb(path.join(path.dirname(filename),'fehlt.sqlite'),{shopDomain:SHOP,storeId:STORE}),{code:'db_missing'});
 assert.throws(()=>exportReader({...exportDoc(),shopDomain:'fremd.myshopify.com'},{shopDomain:SHOP}),{code:'shop_mismatch'});
});

test('Aktivierung: 15 Zuordnungen über den bestehenden Store, Wiederholung ohne neue Bindungen, Auflösung je Shopify-ID-Paar',async t=>{
 const {filename,closeBeforeCleanup}=workshopDb(t),clock=clockAt('2026-10-23T12:00:00Z');
 const ws=openWorkshopDb(filename,{tenantId:'gravuru',shopDomain:SHOP,storeId:STORE,clock});closeBeforeCleanup(ws);
 const selections=resolveRecords(bindSelections(syncPlan()).selections,ws.repository),reader=exportReader(exportDoc(),{shopDomain:SHOP});
 const blocks=await checkSelections(selections,{adapter:ws.adapter,reader,clock});
 const applied=applyChecks(blocks,{orderIntake:ws.orderIntake,storeId:STORE,shopDomain:SHOP,adapter:ws.adapter});
 assert.deepEqual(applied.map(a=>[a.written,a.createdBindings,a.changedAssignments,a.assignments.length]),[[true,15,15,15]]);
 const registry=ws.orderIntake.idBindings({storeId:STORE,shopDomain:SHOP,adapter:ws.adapter});
 for(const h of HANDOFF.products)for(const v of h.variants){
  const active=registry.resolve({shopifyProductId:h.shopifyProductId,shopifyVariantId:v.shopifyVariantId});
  const s=selections.find(s=>s.shopifyVariantId===v.shopifyVariantId);
  assert.equal(active.productId,s.productId);assert.equal(active.productRevision,1);assert.deepEqual(active.options,{mounting:v.mountingKey});assert.equal(active.unitCents,v.priceCents);
  assert.equal(active.assignmentRevision,1);assert.equal(active.productionReady,false);assert.equal(active.checkoutEnabled,false);
 }
 assert.equal(ws.orderIntake.bindings().length,15);
 // Zweiter Lauf: bestehende Bindungen werden wiederverwendet, nichts Neues geschrieben.
 const again=applyChecks(await checkSelections(selections,{adapter:ws.adapter,reader,clock}),{orderIntake:ws.orderIntake,storeId:STORE,shopDomain:SHOP,adapter:ws.adapter});
 assert.deepEqual(again.map(a=>[a.written,a.createdBindings,a.changedAssignments]),[[false,0,0]]);
 assert.equal(ws.orderIntake.bindings().length,15);assert.equal(registry.history({shopifyProductId:HANDOFF.products[0].shopifyProductId,shopifyVariantId:HANDOFF.products[0].variants[0].shopifyVariantId}).length,1);
 // Block mit Prüffehler wird nicht geschrieben.
 const off=exportDoc();off.products.find(p=>p.id===HANDOFF.products[0].shopifyProductId).variants.nodes[1].price='9.99';
 const skipped=applyChecks(await checkSelections(selections,{adapter:ws.adapter,reader:exportReader(off,{shopDomain:SHOP}),clock}),{orderIntake:ws.orderIntake,storeId:STORE,shopDomain:SHOP,adapter:ws.adapter});
 assert.equal(skipped[0].written,false);assert.match(skipped[0].reason,/Shopify-Grundpreis/);
 // Anderer Store-Name auf derselben DB wird abgewiesen (Spiegel der Store-Prüfung).
 const other=openWorkshopDb(filename,{tenantId:'gravuru',shopDomain:SHOP,storeId:'anderer-store',clock});closeBeforeCleanup(other);
 const otherBlocks=await checkSelections(selections,{adapter:other.adapter,reader,clock});assert.equal(otherBlocks[0].result.status,'id-plan-ready');
 assert.throws(()=>applyChecks(otherBlocks,{orderIntake:other.orderIntake,storeId:'anderer-store',shopDomain:SHOP,adapter:other.adapter}),{code:'shop_binding_store_scope'});
});

test('run(): Dry-run ohne DB (nur Auswahl), mit DB (Prüfung), --apply nur mit --live oder --trust-export',async t=>{
 const {filename,closeBeforeCleanup}=workshopDb(t),dir=path.dirname(filename),quiet={write(){}};
 const planFile=path.join(dir,'sync-plan.json');fs.writeFileSync(planFile,JSON.stringify(syncPlan()));
 let out='';const dry=await run(['--plan',planFile,'--out',path.join(dir,'bind.json')],{stdout:{write:s=>out+=s},stderr:quiet});
 assert.equal(dry.schema,BIND_SCHEMA);assert.equal(dry.mode,'dry-run');assert.equal(dry.selections.length,15);assert.equal(dry.check,null);assert.equal(dry.selections[0].productId,undefined);
 assert.match(out,/15 Varianten aus 3 Konfi-Produkten, 4 ausstehend/);assert.match(out,/Dry-run: nichts geschrieben/);
 const checked=await run(['--katalog',KATALOG,'--linie','edelstahl-tuerschilder','--export',EXPORT,'--out',path.join(dir,'bind2.json'),'--alle-designs','--db',filename,'--store-id',STORE],{stdout:quiet,stderr:quiet});
 assert.equal(checked.mode,'dry-run');assert.equal(checked.evidence,'export:2026-10-23T00:33:00.000Z');assert.equal(checked.check[0].result.status,'id-plan-ready');assert.equal(checked.check[0].result.entries.length,15);assert.equal(checked.applied,null);
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'bind2.json'),'utf8')).check[0].result.status,'id-plan-ready');
 assert.match(formatBind(checked),/Prüfung Block 0\+15: id-plan-ready/);
 await assert.rejects(run(['--plan',planFile,'--export',EXPORT,'--out',path.join(dir,'b3.json'),'--db',filename,'--store-id',STORE,'--apply'],{stdout:quiet,stderr:quiet}),/--live|--trust-export/);
 await assert.rejects(run(['--plan',planFile,'--out',path.join(dir,'b4.json'),'--apply'],{stdout:quiet,stderr:quiet}),/--apply braucht --db/);
 await assert.rejects(run(['--plan',planFile,'--out',path.join(dir,'b5.json'),'--db',filename,'--store-id',STORE,'--live'],{env:{},stdout:quiet,stderr:quiet}),{code:'credentials_missing'});
 const applied=await run(['--plan',planFile,'--export',EXPORT,'--out',path.join(dir,'b6.json'),'--db',filename,'--store-id',STORE,'--apply','--trust-export'],{stdout:quiet,stderr:quiet});
 assert.equal(applied.mode,'apply');assert.deepEqual(applied.applied.map(a=>[a.written,a.createdBindings]),[[true,15]]);
 const ws=openWorkshopDb(filename,{shopDomain:SHOP,storeId:STORE});closeBeforeCleanup(ws);
 assert.equal(ws.orderIntake.bindings().length,15);
 await assert.rejects(run([],{stdout:quiet}),/Aufruf/);
});
