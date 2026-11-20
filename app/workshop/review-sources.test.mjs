// Auftrag #265, ENTSCHEIDUNGEN 3.47 und 3.49 (Chris 20.11.2026): Beim Klick wird nur die Gestaltung gesichert. Die gesicherte
// Konfiguration eines Pakets mit Verweis behält in den großen Design-Listen nur das gewählte Design; die Fertigung stellt die
// vollständige Datei aus dem unveränderlichen Produktstand wieder her. Maßstab: dieselbe Fertigungsdatei, dieselbe Datei im
// Fertigungspaket (Byte für Byte), und nie eine Fertigungsdatei, wenn Produktstand und Prüfsumme nicht zusammenpassen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {openBench,benchEntry,liveLikeFixture} from '../../scripts/customer-model-benchmark.mjs';
import {importEnvironment} from './design-assets.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {productDocumentSha,slimReviewSources,savedReviewSources,reviewSourcesJson,SOURCES_REFERENCE,REVIEW_SOURCES_FILE} from './review-product.mjs';

const png=()=>png.bytes??=execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(60,40),(200,200,200,255)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
// Live-naher Aufbau (Familie mit allen Größen, Design-Bank im Produktstand), klein gehalten.
async function pair(){
 const bench=openBench({designsPerSize:2,padKb:4});bench.live=liveLikeFixture(bench,{variants:20});
 const made=benchEntry(bench,{modelResponseCache:true,liveLike:true}),b=made.binding,w=bench.workshop;
 const record=w.repository.get(b.productId,{revision:b.productRevision}),config=w.model(b.productId,b.productRevision).universal;
 const design=config.profile.designs.find(d=>d.id===config.profile.defaultDesignId)||config.profile.designs[0];
 const input=()=>({productId:record.id,productRevision:record.revision,designId:design.id,objects:structuredClone(design.objects),options:structuredClone(b.options||{}),quantity:1,media:[],preview:png()});
 const embedded=await prepareAcrylicReview({record,config,input:input()});
 const reference=await prepareAcrylicReview({record,config,input:input(),productSha256:productDocumentSha(record.document)});
 const resolve=()=>JSON.parse(JSON.stringify(record.document));
 return {bench,record,config,design,embedded,reference,resolve};
}
const file=(bundle,name=REVIEW_SOURCES_FILE)=>readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get(name);

test('die gesicherte Konfiguration des Pakets mit Verweis behält nur das gewählte Design und nennt Anzahl und Prüfsumme der Listen',async t=>{
 const {bench,record,design,embedded,reference}=await pair();t.after(()=>bench.close());
 const old=JSON.parse(file(embedded)),slim=JSON.parse(file(reference));
 assert.equal(old.sourcesRef,undefined);assert.ok(old.familyFormats.designs.length>2);
 assert.equal(slim.sourcesRef.schema,SOURCES_REFERENCE);assert.equal(slim.sourcesRef.designId,design.id);
 assert.deepEqual(Object.keys(slim.sourcesRef.lists).sort(),['familyFormats.designs','profile.designs']);
 assert.equal(slim.sourcesRef.lists['familyFormats.designs'].count,record.document.config.familyFormats.designs.length);
 assert.deepEqual(slim.familyFormats.designs.map(d=>d.id),[design.id]);assert.deepEqual(slim.profile.designs.map(d=>d.id),[design.id]);
 // Das gewählte Design ist unverändert enthalten (Warenkorbtext und „Bearbeiten“ lesen es ohne Produktstand).
 assert.deepEqual(slim.profile.designs[0],old.profile.designs.find(d=>d.id===design.id));
 // Alles außer den beiden Listen und dem Verweis ist gleich, in derselben Reihenfolge.
 const strip=c=>{const {sourcesRef,...rest}=c;return JSON.stringify({...rest,profile:{...rest.profile,designs:null},familyFormats:{...rest.familyFormats,designs:null}});};
 assert.equal(strip(slim),strip(old));
 assert.ok(reference.package.length<embedded.package.length/3,'Paket mit Verweis: '+reference.package.length+' Byte, bisher '+embedded.package.length);
});

test('die Fertigung stellt die Konfiguration Byte für Byte wieder her und liefert dieselbe Fertigungsdatei',async t=>{
 const {bench,embedded,reference,resolve}=await pair();t.after(()=>bench.close());
 for(const engraving of [false,true]){
  const a=await acrylicArtwork(embedded.package,embedded.manifest.packageSha256,{engraving}),b=await acrylicArtwork(reference.package,reference.manifest.packageSha256,{engraving,productDocument:resolve});
  assert.equal(b.svg,a.svg);assert.deepEqual(b.geometry,a.geometry);
  // Was Fertigungs-Zusammenfassung und Fertigungspaket lesen, ist dieselbe Datei wie bisher.
  assert.ok(b.files.get(REVIEW_SOURCES_FILE).equals(a.files.get(REVIEW_SOURCES_FILE)));
  assert.ok(a.files.get(REVIEW_SOURCES_FILE).equals(file(embedded)));
 }
});

test('ohne passenden Produktstand entsteht aus der gekürzten Konfiguration keine Fertigungsdatei',async t=>{
 const {bench,record,design,reference}=await pair();t.after(()=>bench.close());
 const hash=reference.manifest.packageSha256,slim=JSON.parse(file(reference)),document=JSON.parse(JSON.stringify(record.document));
 await assert.rejects(acrylicArtwork(reference.package,hash),/Produktstand der Werkstatt gebraucht/);
 const other=structuredClone(document);other.config.familyFormats.designs[0].name+=' geändert';
 await assert.rejects(acrylicArtwork(reference.package,hash,{productDocument:()=>other}),/passt nicht zur gesicherten Prüfsumme/);
 // Die Wiederherstellung prüft jede Liste für sich, auch wenn ihr ein anderes Dokument gereicht würde.
 assert.throws(()=>savedReviewSources(slim,other),/passt nicht zur gesicherten Konfiguration/);
 assert.throws(()=>savedReviewSources(slim,null),/Produktstand der Werkstatt gebraucht/);
 const shorter=structuredClone(document);shorter.config.profile.designs.pop();
 assert.throws(()=>savedReviewSources(slim,shorter),/passt nicht zur gesicherten Konfiguration/);
 for(const broken of [{...slim,sourcesRef:{...slim.sourcesRef,schema:'x'}},{...slim,sourcesRef:{...slim.sourcesRef,lists:{}}},{...slim,sourcesRef:{...slim.sourcesRef,lists:{'profile.motifs':{count:2,sha256:'0'.repeat(64)}}}},
  {...slim,sourcesRef:{...slim.sourcesRef,lists:{'profile.designs':{count:1,sha256:slim.sourcesRef.lists['profile.designs'].sha256}}}},
  {...slim,profile:{...slim.profile,designs:[...slim.profile.designs,{id:'fremd'}]}},{...slim,sourcesRef:{...slim.sourcesRef,designId:design.id+'x'}}])
  assert.throws(()=>savedReviewSources(broken,document),/nicht eindeutig/);
 // Pakete der bisherigen Art gehen unverändert durch.
 const {sourcesRef,...plain}=slim;assert.deepEqual(savedReviewSources(plain,null),{config:plain,restored:false});
});

test('gekürzt wird nur, was Zeichen für Zeichen im Produktstand steht; alles andere bleibt eingebettet',async t=>{
 const {bench,record,design,embedded}=await pair();t.after(()=>bench.close());
 const frozen=JSON.parse(file(embedded)),document=JSON.parse(JSON.stringify(record.document));
 const both=slimReviewSources(frozen,document,design.id);
 assert.deepEqual(Object.keys(both.sourcesRef.lists).sort(),['familyFormats.designs','profile.designs']);
 assert.deepEqual(Object.keys(both),[...Object.keys(frozen),'sourcesRef']);
 // Hin und zurück: dieselbe Datei.
 assert.ok(reviewSourcesJson(savedReviewSources(both,document).config).equals(file(embedded)));
 // Eine Liste weicht vom Produktstand ab (zum Beispiel für die gewählte Größe umgerechnet): Sie bleibt vollständig.
 const changed=structuredClone(frozen);changed.profile.designs[0].name+=' umgerechnet';
 const one=slimReviewSources(changed,document,design.id);
 assert.deepEqual(Object.keys(one.sourcesRef.lists),['familyFormats.designs']);assert.equal(one.profile.designs.length,frozen.profile.designs.length);
 assert.deepEqual(savedReviewSources(one,document).config,changed);
 const none=structuredClone(changed);none.familyFormats.designs.reverse();
 assert.equal(slimReviewSources(none,document,design.id),none);
 assert.equal(slimReviewSources(frozen,document,''),frozen);assert.equal(slimReviewSources(both,document,design.id),both);
});
