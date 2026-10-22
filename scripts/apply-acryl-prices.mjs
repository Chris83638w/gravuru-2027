import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createWorkshop} from '../app/workshop/http.mjs';
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=path.resolve(CODE,'../..'),OUT=path.join(ROOT,'outputs/Acryl-Serie-2027');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)),sha=v=>createHash('sha256').update(v).digest('hex');
const input=await read(path.join(ROOT,'work/acryl-price-import.json'));
assert.deepEqual(input.errors,[]);assert.equal(input.variants.length,798);assert.equal(input.basePrices.length,79);
assert.equal(sha(await fs.readFile(input.sourcePath)),input.sourceSha256,'Preisdatei wurde seit Prüfung geändert');
const BEFORE=path.join(ROOT,'work/Preise-vor-Uebernahme',input.sourceSha256),manifest=await read(path.join(BEFORE,'Anlageregister.json'));
const seed=(await read(path.join(CODE,'app/configurator/variant-m/.preview/models.json')))[0];
const w=createWorkshop({filename:path.join(CODE,'.local-data/acryl-serie/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
try {
 const groupBefore=w.variants.get(manifest.group.id,manifest.group.revision),currentGroup=w.variants.get(manifest.group.id),records=new Map(manifest.records.map(r=>[r.sku,r])),expected=new Map(),entries=[];
 assert.equal(records.size,798);assert.equal(groupBefore.document.variants.length,798);
 for(const p of input.variants){
  const r=records.get(p.sku);assert.ok(r);assert.equal(p.productId,r.id);assert.equal(p.expectedRevision,r.revision);
  assert.equal(p.previousCents,r.priceCents);assert.equal(p.priceCents,p.baseCents+p.surchargeCents);assert.ok(Number.isSafeInteger(p.priceCents)&&p.priceCents>0);
  const old=w.repository.get(r.id,{revision:r.revision}),current=w.repository.get(r.id);assert.equal(old.document.basePriceCents,p.previousCents);assert.equal(current.status,'draft');
  assert.ok(old.document.categoryIds.includes(p.sku));assert.equal(old.document.material.thicknessMm,3);
  const document=structuredClone(old.document);document.basePriceCents=p.priceCents;document.material.surfaceNotes='Acryl 3 mm · Farbe ohne Aufpreis. Lokaler Entwurf. Preise aus der von Chris ausgefüllten Acryl-Excel übernommen (21.10.2026).';
  w.repository.validate(document);
  const key='acryl-price:'+input.sourceSha256.slice(0,16)+':'+p.sku,fingerprint=sha(JSON.stringify(document)),prior=w.repository.importItem(key);
  if(prior){assert.equal(prior.id,r.id);assert.equal(prior.fingerprint,fingerprint);assert.equal(current.revision,r.revision+1);assert.deepEqual(current.document,document);}else{assert.equal(current.revision,r.revision);assert.deepEqual(current.document,old.document);}
  expected.set(p.sku,{document,r,p});entries.push({key,fingerprint,action:'update',productId:r.id,expectedRevision:r.revision,document});
 }
 const desiredGroup=structuredClone(groupBefore.document);
 for(const v of desiredGroup.variants){const e=expected.get(v.id);assert.ok(e);assert.equal(v.productId,e.r.id);assert.equal(v.productRevision,e.r.revision);v.productRevision=e.r.revision+1;}
 if(currentGroup.revision!==groupBefore.revision){assert.equal(currentGroup.revision,groupBefore.revision+1);assert.deepEqual(currentGroup.document,desiredGroup);}
 w.variants.validate(groupBefore.document);
 console.log(JSON.stringify({stage:'preflight',products:entries.length,sourceSha256:input.sourceSha256}));
 for(let i=0;i<entries.length;i+=50){w.repository.importBatch(entries.slice(i,i+50));console.log(JSON.stringify({stage:'prices-saved',count:Math.min(i+50,entries.length)}));}
 for(const {document,r,p} of expected.values()){const actual=w.repository.get(r.id);assert.equal(actual.revision,r.revision+1);assert.deepEqual(actual.document,document);assert.equal(actual.status,'draft');const previous=w.repository.get(r.id,{revision:r.revision}).document;const compare=structuredClone(actual.document);compare.basePriceCents=previous.basePriceCents;compare.material.surfaceNotes=previous.material.surfaceNotes;assert.deepEqual(compare,previous);}
 const group=currentGroup.revision===groupBefore.revision?w.variants.save(groupBefore.id,desiredGroup,groupBefore.revision):currentGroup;
 assert.deepEqual(w.variants.get(groupBefore.id,groupBefore.revision).document,groupBefore.document);
 const options=w.variants.options(group.id,group.revision);assert.equal(options.variants.length,798);
 let colorPairs=0;const outputRecords=[];
 for(const {document,r,p} of expected.values()){
  const selected=w.variants.select(group.id,group.revision,p.sku);assert.equal(selected.basePriceCents,p.priceCents);assert.equal(selected.productId,r.id);assert.equal(selected.productRevision,r.revision+1);
  if(r.color==='SW'){const counterpart=expected.get(r.sku.replace('-SW-','-AN-'));assert.ok(counterpart);assert.equal(counterpart.document.basePriceCents,document.basePriceCents);colorPairs++;}
  await write(path.join(OUT,'Produktdaten',r.sku+'.json'),document);outputRecords.push({...r,revision:r.revision+1,priceCents:p.priceCents});
 }
 assert.equal(colorPairs,399);assert.equal(sha(await fs.readFile(input.sourcePath)),input.sourceSha256);
 const appliedAt=new Date().toISOString(),priceSource={file:path.basename(input.sourcePath),sha256:input.sourceSha256,confirmedBy:'Chris: preise sind hinterlegt',appliedAt};
 const updated={...manifest,updatedAt:appliedAt,priceStatus:'user-entered-confirmed',basePricesConfirmed:true,priceSource,group:{id:group.id,revision:group.revision},url:manifest.url.replace(/revision=\d+/,'revision='+group.revision),records:outputRecords};
 await write(path.join(OUT,'Anlageregister.json'),updated);await write(path.join(OUT,'Auswahlgruppe.json'),group);
 const plan=await read(path.join(BEFORE,'serienplan.json')),bases=new Map(input.basePrices.map(p=>[p.skuRoot,p.priceCents]));
 for(const row of plan.rows){assert.ok(bases.has(row.skuRoot));row.baseCents=bases.get(row.skuRoot);}
 for(const option of plan.options){const price=input.options.find(p=>p.code===option.code);assert.ok(price);option.priceCents=price.priceCents;}
 plan.status='lokale-entwuerfe-mit-bestaetigten-preisen';plan.pricing={...plan.pricing,basePriceStatus:'aus-aktualisierter-acryl-excel-uebernommen',basePricesConfirmed:true,source:priceSource};await write(path.join(OUT,'serienplan.json'),plan);
 const report={schema:'gravuru-acryl-price-readback/v1',appliedAt,source:priceSource,basePrices:79,changedBasePrices:input.changes.length,updatedProducts:798,changedProductPrices:input.changedVariants,verifiedColorPairs:colorPairs,colorSurchargeCents:0,allDraft:true,allExistingIdsPreserved:true,allOtherProductFieldsPreserved:true,previousRevisionsPreserved:true,variantSelectionVerified:798,group:updated.group,productRevision:2,userWorkbookUnchanged:true,checks:'Excel-Formelergebnisse = Grundpreis + Befestigung; alle 798 Artikel und Auswahlreferenzen zurückgelesen',basePriceRangeCents:[Math.min(...bases.values()),Math.max(...bases.values())],basePriceChanges:input.changes,optionPrices:input.options,sourceWorkbook:input.sourcePath,preUpdateBackup:BEFORE};
 await write(path.join(OUT,'Preisuebernahme.json'),report);
 const check=await read(path.join(OUT,'Anlagepruefung.json'));check.priceReadback={verifiedAt:appliedAt,sourceSha256:input.sourceSha256,products:798,colorPairs:399,groupRevision:group.revision};await write(path.join(OUT,'Anlagepruefung.json'),check);
 console.log(JSON.stringify({stage:'complete',products:798,basePrices:79,colorPairs,group:updated.group,url:updated.url}));
}finally{w.close();}
