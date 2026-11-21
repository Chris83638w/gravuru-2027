// Auftrag #265 (Chris: schneller Warenkorb, sämtliche Prüfungen bleiben): Das Sichern einer Kundengestaltung liest und prüft
// den unveränderlichen Produktstand nicht mehr bei jedem Klick neu. Maßstab: dieselben Ergebnisse und dasselbe Prüfpaket wie
// mit frisch gelesenem Dokument (Byte für Byte), dieselben Fehler, und nach jeder Änderung des Produktstands wird neu gelesen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {openBench,benchEntry,liveLikeFixture} from '../../scripts/customer-model-benchmark.mjs';
import {importEnvironment} from './design-assets.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {productDocumentSha} from './review-product.mjs';
import {nativeReviewConfig} from './native-review-resources.mjs';
import {workshopResources} from './catalog.mjs';
import {SUPPORTED_FONT_IDS} from '../platform/sources/app/shared/models/design-content.mjs';
import {resolveProduct,validateProductDesign,validateProductDocument,productDocumentWithFonts,holdProductDocument,isHeldProductDocument} from './product-model.mjs';
import {heldRevisionRecord,heldRevisionCount} from './revision-records.mjs';

const png=()=>png.bytes??=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(60,40),(200,200,200,255)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
// Live-naher Aufbau (Familie mit allen Größen, Design-Bank im Produktstand), klein gehalten.
function open(){
 const bench=openBench({designsPerSize:2,padKb:4});bench.live=liveLikeFixture(bench,{variants:20});
 const made=benchEntry(bench,{modelResponseCache:true,liveLike:true}),b=made.binding,w=bench.workshop;
 let reads=0;const repository={...w.repository,get:(...a)=>{reads++;return w.repository.get(...a);}};
 const config=w.model(b.productId,b.productRevision).universal,design=config.profile.designs.find(d=>d.id===config.profile.defaultDesignId)||config.profile.designs[0];
 const input=(change=o=>o)=>({productId:b.productId,productRevision:b.productRevision,designId:design.id,objects:structuredClone(design.objects).map(change),options:structuredClone(b.options||{}),quantity:1,media:[],preview:png()});
 return {bench,w,b,repository,config,design,input,reads:()=>reads};
}
const caught=work=>{try{work();}catch(error){return {status:error.status,code:error.code,message:error.message};}return null;};
// Dateien des Pakets ohne die drei Angaben, die je Lauf neu gewürfelt werden (Kennung, Zeitpunkt, Entwurfskennung).
function files(bundle){
 const out={};
 for(const [name,bytes] of readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files){
  if(name!=='manifest.json'){out[name]=bytes.toString('base64');continue;}
  const manifest=JSON.parse(bytes);manifest.id='-';manifest.createdAt='-';manifest.source.draftId='-';out[name]=JSON.stringify(manifest);
 }
 return out;
}

test('eine gehaltene Revision wird einmal gelesen, ist tief eingefroren und meldet dieselben Fehler wie die Ablage',()=>{
 const {bench,w,b,repository,reads}=open();
 try{
  const first=heldRevisionRecord(repository,b.productId,b.productRevision);
  assert.equal(reads(),1);
  assert.equal(heldRevisionRecord(repository,b.productId,b.productRevision),first,'dieselbe Aufzeichnung');
  assert.equal(reads(),1,'der zweite Abruf liest das Dokument nicht');
  assert.deepEqual(JSON.parse(JSON.stringify(first)),JSON.parse(JSON.stringify(w.repository.get(b.productId,{revision:b.productRevision}))),'Inhalt wie frisch gelesen');
  assert.ok(isHeldProductDocument(first.document));
  assert.ok(Object.isFrozen(first)&&Object.isFrozen(first.document)&&Object.isFrozen(first.document.config.profile.designs[0].objects[0])&&Object.isFrozen(first.metadata));
  assert.throws(()=>{first.document.name='anders';},TypeError);
  // Je Ablage getrennt: eine andere Ablage liest selbst.
  const other={...repository};assert.notEqual(heldRevisionRecord(other,b.productId,b.productRevision),first);assert.equal(reads(),2);
  // Dieselben Fehler wie repository.get.
  for(const [id,revision] of [['gibt-es-nicht',1],[b.productId,999],[b.productId,0],[b.productId,'1']]){
   const expected=caught(()=>w.repository.get(id,{revision}));
   assert.ok(expected,'die Ablage lehnt ab');
   assert.deepEqual(caught(()=>heldRevisionRecord(repository,id,revision)),expected);
  }
  // Ablage ohne Standabfrage (ältere Attrappe): wie bisher jedes Mal lesen, nichts halten.
  const plain={get:w.repository.get};
  assert.notEqual(heldRevisionRecord(plain,b.productId,b.productRevision),heldRevisionRecord(plain,b.productId,b.productRevision));
  assert.equal(heldRevisionCount(plain),0);
  assert.throws(()=>heldRevisionRecord(repository,b.productId,b.productRevision,{max:0}),RangeError);
 }finally{bench.close();}
});

test('nach jeder Änderung des Produktstands wird neu gelesen; gehalten werden höchstens so viele Revisionen wie erlaubt',()=>{
 const {bench,w,b,repository,reads}=open();
 try{
  const first=heldRevisionRecord(repository,b.productId,b.productRevision);
  assert.equal(reads(),1);
  // Neue Revision desselben Produkts: Der Stand der alten Revision ändert sich (aktueller Stand ist ein anderer).
  const head=w.repository.get(b.productId),changed=structuredClone(head.document);changed.seo.description='geändert';
  const saved=w.repository.save(b.productId,changed,head.revision);
  const again=heldRevisionRecord(repository,b.productId,b.productRevision);
  assert.equal(reads(),2,'anderer Produktstand: neu gelesen');
  assert.notEqual(again,first);assert.deepEqual(JSON.parse(JSON.stringify(again.document)),JSON.parse(JSON.stringify(first.document)),'die Revision selbst ist unverändert');
  assert.equal(heldRevisionRecord(repository,b.productId,b.productRevision),again);assert.equal(reads(),2);
  // Archivierung ändert den Stand ebenfalls.
  w.repository.setArchived(b.productId,{expectedRevision:saved.revision,archived:true});
  const archived=heldRevisionRecord(repository,b.productId,b.productRevision);
  assert.equal(reads(),3);assert.notEqual(archived,again);
  assert.equal(w.repository.revisionStatus(b.productId,{revision:b.productRevision}).headStatus,'archived','die Archivierung liest der Aufrufer frisch');
  // Verdrängung: mit max 1 hält die Ablage nur die zuletzt benutzte Revision.
  heldRevisionRecord(repository,b.productId,saved.revision,{max:1});
  assert.equal(heldRevisionCount(repository),1);
  heldRevisionRecord(repository,b.productId,b.productRevision,{max:1});assert.equal(reads(),5,'verdrängt: neu gelesen');
 }finally{bench.close();}
});

test('ein gehaltenes Dokument wird je Schriftfassung einmal geprüft und liefert dieselben Ergebnisse wie die volle Prüfung',()=>{
 const {bench,w,b,config,design}=open();
 try{
  const plain=w.repository.get(b.productId,{revision:b.productRevision}).document;
  const held=holdProductDocument(w.repository.get(b.productId,{revision:b.productRevision}).document);
  const options=structuredClone(b.options||{});
  // Auflösung: gleiches Ergebnis; das gehaltene Dokument wird nicht erneut geprüft (dieselbe geprüfte Fassung).
  const expected=resolveProduct(plain,{options,designId:design.id}),first=resolveProduct(held,{options,designId:design.id});
  assert.deepEqual(JSON.parse(JSON.stringify(first)),JSON.parse(JSON.stringify(expected)));
  assert.equal(resolveProduct(held,{options,designId:design.id}).config,first.config,'einmal geprüft');
  assert.notEqual(resolveProduct(plain,{options,designId:design.id}).config,expected.config,'ohne Halten wie bisher jedes Mal neu');
  assert.ok(Object.isFrozen(first.config)&&Object.isFrozen(first.config.profile.designs[0]));
  assert.throws(()=>{first.config.basePriceCents=1;},TypeError);
  // Was herausgegeben wird, bleibt eine eigene Kopie.
  assert.ok(!Object.isFrozen(first.design)&&!Object.isFrozen(first.elementRights));
  // Schriftfassung: dieselben Schriftobjekte → dieselbe geprüfte Fassung; andere Objekte (auch inhaltsgleich) → neu geprüft.
  const fonts=config.localResources.fonts,one=productDocumentWithFonts(held,fonts);
  assert.equal(productDocumentWithFonts(held,{...fonts}),one,'gleiche Namen, Reihenfolge und Objekte');
  const copy=structuredClone(fonts),two=productDocumentWithFonts(held,copy);
  assert.notEqual(two,one);assert.deepEqual(two,one);
  assert.equal(productDocumentWithFonts(held,fonts),one,'die frühere Fassung bleibt gemerkt');
  // Eine dritte Fassung verdrängt die am längsten nicht benutzte (hier die Kopie).
  const extra=SUPPORTED_FONT_IDS.find(id=>!Object.hasOwn(fonts,id)),library=workshopResources(config.localResources).fonts;
  assert.ok(extra&&library[extra],'eine Grundschrift, die das Produkt nicht mitbringt');
  const three=productDocumentWithFonts(held,{...fonts,[extra]:library[extra]});
  assert.ok(Object.hasOwn(three.config.localResources.fonts,extra)&&!Object.hasOwn(one.config.localResources.fonts,extra));
  assert.notEqual(productDocumentWithFonts(held,copy),two,'verdrängt: neu geprüft');
  // Ohne Halten: wie bisher ein zusammengesetztes, ungeprüftes Dokument.
  const merged=productDocumentWithFonts(plain,fonts);
  assert.ok(!Object.isFrozen(merged));assert.equal(merged.config.profile,plain.config.profile);
  // Prüfung der Kundengestaltung: gleiches Ergebnis über beide Wege, mit und ohne zusätzliche Schrift.
  const customer=font=>({...structuredClone(design),objects:structuredClone(design.objects).map(o=>o.type==='text'&&font?{...o,font}:o)});
  for(const [set,font] of [[fonts,null],[{...fonts,[extra]:library[extra]},extra]]){
   const a=validateProductDesign(productDocumentWithFonts(plain,set),customer(font),{options,fonts:set,motifs:config.localResources.motifs});
   const z=validateProductDesign(productDocumentWithFonts(held,set),customer(font),{options,fonts:set,motifs:config.localResources.motifs});
   assert.deepEqual(z,a);
  }
  // Ein ungültiges Dokument wird nie gemerkt: derselbe Fehler bei jedem Aufruf.
  const broken=structuredClone(plain);broken.kind='unbekannt';holdProductDocument(broken);
  const reason=caught(()=>validateProductDocument(structuredClone(broken)));
  assert.ok(reason,'die volle Prüfung lehnt ab');assert.deepEqual(caught(()=>resolveProduct(broken)),reason);assert.deepEqual(caught(()=>resolveProduct(broken)),reason);
  assert.deepEqual(caught(()=>productDocumentWithFonts(broken,fonts)),reason);
  assert.throws(()=>holdProductDocument(null),/Produktdokument/);
 }finally{bench.close();}
});

test('die Konfiguration für das Sichern teilt nur Schrift- und Motivdaten; alles andere bleibt eine eigene Kopie mit gleichem Inhalt',()=>{
 const {bench,config,input}=open();
 try{
  // Bisheriges Verhalten als Maßstab: vollständige Kopie, zusätzliche Bibliotheksschrift als Kopie.
  const extra=SUPPORTED_FONT_IDS.find(id=>!Object.hasOwn(config.localResources.fonts,id));
  const withFont=input(o=>o.type==='text'?{...o,font:extra}:o);
  const before=JSON.stringify(config);
  for(const data of [input(),withFont]){
   const made=nativeReviewConfig(config,data);
   const expected=structuredClone(config);
   for(const o of data.objects)if(o.type==='text'&&!Object.hasOwn(expected.localResources.fonts,o.font))expected.localResources.fonts[o.font]=structuredClone(workshopResources(config.localResources).fonts[o.font]);
   assert.equal(JSON.stringify(made),JSON.stringify(expected),'gleicher Inhalt, gleiche Reihenfolge der Schlüssel');
   for(const [name,font] of Object.entries(config.localResources.fonts))assert.equal(made.localResources.fonts[name],font,'Schriftdaten werden geteilt');
   config.localResources.motifs.forEach((motif,i)=>assert.equal(made.localResources.motifs[i],motif,'Motivdaten werden geteilt'));
   assert.notEqual(made.localResources,config.localResources);assert.notEqual(made.localResources.fonts,config.localResources.fonts);assert.notEqual(made.localResources.motifs,config.localResources.motifs);
   assert.notEqual(made.profile,config.profile);assert.notEqual(made.profile.designs[0],config.profile.designs[0]);
   // Änderungen an der Kopie erreichen das gemeinsame Modell nicht.
   made.profile.name='nur in der Kopie';made.localResources.fonts['nur-kopie']={};made.localResources.motifs.push({key:'nur-kopie'});
  }
  assert.equal(nativeReviewConfig(config,withFont).localResources.fonts[extra],workshopResources(config.localResources).fonts[extra],'Bibliotheksschrift als dasselbe Objekt');
  assert.equal(JSON.stringify(config),before,'das gemeinsame Modell bleibt unverändert');
  // Ohne lokale Ressourcen: wie bisher eine vollständige Kopie.
  const bare={...structuredClone(config)};delete bare.localResources;
  const copy=nativeReviewConfig(bare,{designId:'gibt-es-nicht'});assert.deepEqual(copy,bare);assert.notEqual(copy.profile,bare.profile);
 }finally{bench.close();}
});

test('das Prüfpaket aus der gehaltenen Revision ist Byte für Byte das Paket aus dem frisch gelesenen Dokument',async()=>{
 const {bench,w,b,repository,config,input,reads}=open();
 try{
  const extra=SUPPORTED_FONT_IDS.find(id=>!Object.hasOwn(config.localResources.fonts,id));
  const before=JSON.stringify(config);
  for(const change of [o=>o,o=>o.type==='text'?{...o,font:extra}:o]){
   const fresh=w.repository.get(b.productId,{revision:b.productRevision}),sha=productDocumentSha(fresh.document);
   for(const reference of [{productSha256:sha},{}]){
    const expected=await prepareAcrylicReview({record:fresh,config:structuredClone(config),input:input(change),...reference});
    // Zweimal über die gehaltene Revision: erster Aufruf prüft, zweiter findet die geprüfte Fassung.
    for(let i=0;i<2;i++){
     const held=heldRevisionRecord(repository,b.productId,b.productRevision);
     const made=await prepareAcrylicReview({record:held,config,input:input(change),...reference});
     assert.deepEqual(files(made),files(expected));
     assert.deepEqual({...made.manifest,id:'-',createdAt:'-',source:{...made.manifest.source,draftId:'-'},packageSha256:'-'},{...expected.manifest,id:'-',createdAt:'-',source:{...expected.manifest.source,draftId:'-'},packageSha256:'-'});
    }
   }
  }
  assert.equal(reads(),1,'alle Durchläufe lesen das Dokument einmal');
  assert.equal(JSON.stringify(config),before,'das gemeinsame Modell bleibt unverändert');
  // Dieselben Ablehnungen: fremdes Design, leeres Pflichtfeld bleibt Sache der Gestaltungsprüfung.
  const held=heldRevisionRecord(repository,b.productId,b.productRevision),fresh=w.repository.get(b.productId,{revision:b.productRevision});
  for(const bad of [{...input(),designId:'gibt-es-nicht'},{...input(),quantity:0},{...input(),objects:[{id:'fremd',type:'text',text:'x'}]},{...input(),productRevision:b.productRevision+1}]){
   const reason=async record=>{try{await prepareAcrylicReview({record,config,input:structuredClone(bad)});}catch(error){return {status:error.status,code:error.code,message:error.message};}return null;};
   const expected=await reason(fresh);assert.ok(expected,'die volle Prüfung lehnt ab');
   assert.deepEqual(await reason(held),expected);
  }
 }finally{bench.close();}
});
