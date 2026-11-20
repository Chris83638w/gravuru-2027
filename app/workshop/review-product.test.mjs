// Auftrag #265, ENTSCHEIDUNGEN 3.47 (Chris 20.11.2026: „wie Zakeke und Fancy“). Ein Prüfpaket mit Verweis auf den Produktstand
// muss dieselbe Fertigung ergeben wie das bisherige Paket mit eingebettetem Produktstand: gleiche Fertigungsdatei, gleiche
// Geometrie, gleiche Felder. Und es muss scheitern, sobald der Produktstand fehlt oder nicht zur Prüfsumme passt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {importEnvironment} from './design-assets.mjs';
import {validateFamily,familyProductConfig} from './product-families.mjs';
import {makeProductDocument} from './product-model.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {readReviewPackage} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {NATIVE_INPUT_EMBEDDED,NATIVE_INPUT_REFERENCE,PRODUCT_DOCUMENT_FILE,productDocumentSha,productDocumentJson,createProductShaMemo,savedProductDocument} from './review-product.mjs';

const load=k=>validateFamily(JSON.parse(fs.readFileSync(new URL('./test-fixtures/acrylic-families/'+k+'.json',import.meta.url))));
const preview=()=>execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
// Familienprodukt wie in family-acrylic-product.test.mjs: echte Katalogvorlage, eine Gestaltung, beide Paketarten.
async function pair(k='aa'){
 const f=load(k),s=f.sizes.find(s=>s.key===k.toUpperCase()+'-RE-180X120'),document=makeProductDocument(familyProductConfig(f,s,1)),record={id:document.config.profile.id,revision:1,document},config=document.config,d=config.profile.designs[0];
 const input=()=>({productId:record.id,productRevision:1,designId:d.id,objects:structuredClone(d.objects),options:{mounting:'AH04','abstandshalter-farbe-ah04':'WS'},quantity:1,media:[],preview:pair.preview??=preview()});
 const embedded=await prepareAcrylicReview({record,config,input:input()}),sha256=productDocumentSha(record.document);
 const reference=await prepareAcrylicReview({record,config,input:input(),productSha256:sha256});
 // Wie die Werkstatt: das Dokument kommt als frisch gelesenes JSON aus der Ablage.
 const resolve=({id,revision})=>{assert.equal(id,record.id);assert.equal(revision,1);return JSON.parse(JSON.stringify(record.document));};
 return {record,embedded,reference,sha256,resolve};
}
const saved=bundle=>JSON.parse(readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('produkt-und-gestaltung.json'));

test('das Paket mit Verweis ist klein und nennt genau den Produktstand; das bisherige Paket bleibt, wie es war',async()=>{
 const {record,embedded,reference,sha256}=await pair();
 const old=saved(embedded),slim=saved(reference);
 assert.equal(old.schema,NATIVE_INPUT_EMBEDDED);assert.deepEqual(old.product,JSON.parse(JSON.stringify(record.document)));assert.equal(old.productRef,undefined);
 assert.equal(slim.schema,NATIVE_INPUT_REFERENCE);assert.equal(slim.product,undefined);assert.deepEqual(slim.productRef,{id:record.id,revision:1,sha256});
 // Kundenwerte, Preis und Profilstand sind in beiden gleich.
 assert.deepEqual(slim.state,old.state);assert.equal(slim.profileRevision,old.profileRevision);assert.deepEqual(slim.profileSelections,old.profileSelections);
 assert.ok(reference.package.length<embedded.package.length-productDocumentJson(record.document).length*0.9,'kleiner um rund das Produktdokument: '+reference.package.length+' statt '+embedded.package.length);
 // Preis, Maße und Auswahl im Manifest sind gleich (Kennungen, Zeit und Dateiliste unterscheiden sich naturgemäß).
 for(const key of ['schema','product','selection','price','capabilities','productionReady'])assert.deepEqual(reference.manifest[key],embedded.manifest[key],key);
 // Eine ungültige Prüfsumme wird nicht geschrieben.
 await assert.rejects(()=>prepareAcrylicReview({record,config:record.document.config,input:{productId:record.id,productRevision:1,designId:record.document.config.profile.designs[0].id,objects:[],options:{},quantity:1,media:[],preview:pair.preview},productSha256:'abc'}),/Prüfsumme des Produktstands/);
});

test('die Fertigungsdatei aus dem Paket mit Verweis ist dieselbe wie aus dem bisherigen Paket',async()=>{
 for(const k of ['aa','ss']){
  const {embedded,reference,resolve}=await pair(k);
  for(const options of [{engraving:true},{}]){
   const a=await acrylicArtwork(embedded.package,embedded.manifest.packageSha256,options),b=await acrylicArtwork(reference.package,reference.manifest.packageSha256,{...options,productDocument:resolve});
   assert.equal(b.svg,a.svg,k+' '+JSON.stringify(options)+': Fertigungsdatei');assert.deepEqual(b.geometry,a.geometry);assert.equal(b.geometrySha256,a.geometrySha256);
   assert.deepEqual(b.textFields,a.textFields);assert.deepEqual(b.photoFields,a.photoFields);assert.deepEqual(b.surfaces,a.surfaces);
   assert.equal(a.productDocument,undefined,'bisheriges Paket: kein geholter Produktstand');assert.ok(b.productDocument&&b.productReference);
  }
 }
});

test('ohne Produktstand, mit falschem Produktstand oder falschem Verweis entsteht keine Fertigungsdatei',async()=>{
 const {record,reference,resolve}=await pair();
 const art=productDocument=>acrylicArtwork(reference.package,reference.manifest.packageSha256,{engraving:true,productDocument});
 await assert.rejects(()=>art(null),/Produktstand der Werkstatt gebraucht/);
 await assert.rejects(()=>art(()=>{throw Error('fehlt');}),/nicht lesbar/);
 await assert.rejects(()=>art(()=>null),/passt nicht zur gesicherten Prüfsumme/);
 const changed=JSON.parse(JSON.stringify(record.document));changed.name=(changed.name||'')+' geändert';
 await assert.rejects(()=>art(()=>changed),/passt nicht zur gesicherten Prüfsumme/);
 await art(resolve);
 // Der Verweis selbst: nur Kennung, Revision und Prüfsumme, passend zum Manifest; kein eingebettetes Produkt daneben.
 const manifest={product:{id:record.id,revision:1}},ref={id:record.id,revision:1,sha256:productDocumentSha(record.document)},ok={schema:NATIVE_INPUT_REFERENCE,productRef:ref};
 assert.deepEqual(savedProductDocument(ok,manifest,resolve).reference,ref);
 for(const bad of [{...ok,productRef:{...ref,revision:2}},{...ok,productRef:{...ref,id:'anderes'}},{...ok,productRef:{...ref,sha256:'x'}},{...ok,productRef:{...ref,extra:1}},{...ok,product:{}},{schema:NATIVE_INPUT_REFERENCE}])assert.throws(()=>savedProductDocument(bad,manifest,resolve),/nicht eindeutig/);
 // Bisherige Art: das eingebettete Produkt, ohne Zugriff auf die Werkstatt.
 assert.deepEqual(savedProductDocument({schema:NATIVE_INPUT_EMBEDDED,product:{a:1}},manifest,null),{document:{a:1},reference:null});
});

test('das Fertigungspaket bleibt vollständig: Der geholte Produktstand liegt als eigene Datei darin, mit der gesicherten Prüfsumme',async()=>{
 const {record,embedded,reference,resolve,sha256}=await pair('ss');
 const names=async(bundle,context)=>{const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'},context);const files=readZip(proof.package??proof.archive??proof.output);return files;};
 const withRef=await names(reference,{productDocument:resolve}),old=await names(embedded,{});
 assert.ok(withRef.has(PRODUCT_DOCUMENT_FILE));assert.equal(old.has(PRODUCT_DOCUMENT_FILE),false);
 assert.equal(productDocumentSha(JSON.parse(withRef.get(PRODUCT_DOCUMENT_FILE))),sha256);assert.equal(withRef.get(PRODUCT_DOCUMENT_FILE).toString(),productDocumentJson(JSON.parse(JSON.stringify(record.document))));
 // Alle übrigen Fertigungsdateien heißen gleich.
 assert.deepEqual([...withRef.keys()].filter(n=>n!==PRODUCT_DOCUMENT_FILE).sort(),[...old.keys()].sort());
});
// Ungepacktes Archiv lesen (wie zip-stored.mjs schreibt): Name und Inhalt je Datei.
function readZip(buffer){
 const bytes=Buffer.from(buffer),files=new Map();let at=0;
 while(bytes.readUInt32LE(at)===0x04034b50){const size=bytes.readUInt32LE(at+18),nameLength=bytes.readUInt16LE(at+26),extra=bytes.readUInt16LE(at+28),name=bytes.subarray(at+30,at+30+nameLength).toString(),start=at+30+nameLength+extra;files.set(name,bytes.subarray(start,start+size));at=start+size;}
 return files;
}

test('die Prüfsumme je Produktstand wird je Ablage gemerkt und nie zwischen Ablagen vermischt',()=>{
 const memo=createProductShaMemo({max:2}),a={},b={};let reads=0;
 const record=(id,revision,value)=>({id,revision,get document(){reads++;return {value};}});
 const first=memo(a,record('p',1,'x'));assert.equal(first,productDocumentSha({value:'x'}));assert.equal(reads,1);
 assert.equal(memo(a,record('p',1,'x')),first);assert.equal(reads,1,'zweiter Abruf liest das Dokument nicht');
 assert.equal(memo(b,record('p',1,'y')),productDocumentSha({value:'y'}),'andere Ablage, gleiche Kennung: eigene Prüfsumme');
 assert.notEqual(memo(a,record('p',2,'z')),first);memo(a,record('q',1,'w'));
 reads=0;memo(a,record('p',1,'x'));assert.equal(reads,1,'über der Grenze verdrängt: wird neu gerechnet');
});
