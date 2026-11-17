// F02 (#239, Chris 17.11.2026 über Codex/Astra): Aufpreise vor der Zahlung verlässlich an Gestaltung,
// Variante und Preisstand binden. Befund auf be163c5d: Motivzähler 1 → 0 ergab 21,68 → 19,99 €, Logozähler
// 1 → 0 ergab 32,98 → 19,99 €, jeweils ohne Checkout-Fehler; beliebiger Entwurfswert ohne Konfiguration,
// Revision und Angebot lief ebenfalls durch. Grundlage ist die echte Shopify-Eingabe vom 15.11.2026.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {cartTransformRun} from './preis/src/master-release/cart_transform_run.mjs';
import {tierPrice} from './preis/src/master-release/price-v1.mjs';
import {cartValidationsGenerateRun,MAX_PERSONALIZED_LINES,LIMIT_MESSAGE} from './pruefung/src/cart_validation_run.mjs';
import {proofKey,proofTag,proofWords,lineProofValid} from './pruefung/src/checkout-proof.mjs';
import {createCheckoutProofSigner,checkoutProofKeyHex} from '../../../app/workshop/checkout-proof-signer.mjs';

const real=()=>JSON.parse(fs.readFileSync(new URL('../master-release/fixtures/shopify-log-20261115-0941.json',import.meta.url),'utf8'));
const KEY=randomBytes(16).toString('hex'),FOREIGN=randomBytes(16).toString('hex');
const fields=l=>({offer:l.offer?.value,designFile:l.designFile?.value,variantId:l.merchandise?.id,revision:l.revision?.value,motifs:l.motifs?.value,uploads:l.uploads?.value,logos:l.logos?.value});
const signed=(line,key=KEY)=>({...line,proof:{value:proofTag(proofKey(key),proofWords(fields(line)))}});
const attr=v=>v==null?null:{value:String(v)};
// Gültige, vom Server ausgestellte Position (Edelstahl 12 × 8, Preisstand 2).
function line(id,{motifs=0,uploads=0,logos=0,quantity=1,offer,design,photoCents}={}){
 const l=structuredClone(real().cart.lines[0]);l.id='gid://shopify/CartLine/'+id;l.quantity=quantity;delete l.checkoutImage;
 l.motifs=attr(motifs);l.uploads=attr(uploads);l.logos=attr(logos);
 if(offer)l.offer={value:offer};if(design)l.designFile={value:'gravuru:proof_'+id+':'+design};
 if(photoCents!==undefined){const p=JSON.parse(l.merchandise.product.pricing.value);p.extraPhotoCents=photoCents;l.merchandise.product.pricing.value=JSON.stringify(p);}
 l.merchandise.product.title='Türschild '+id;
 return signed(l);
}
const run=(lines,{key=KEY,step='CHECKOUT_COMPLETION'}={})=>cartValidationsGenerateRun({buyerJourney:{step},validation:{metafield:key==null?null:{value:key}},cart:{lines}}).operations[0]?.validationAdd.errors??[];
const price=(lines,id)=>cartTransformRun({presentmentCurrencyRate:'1.0',cart:{lines:structuredClone(lines)}}).operations.find(o=>o.lineUpdate?.cartLineId==='gid://shopify/CartLine/'+id)?.lineUpdate.price.adjustment.fixedPricePerUnit.amount;
const blocked=(errors,id)=>errors.some(e=>e.message.startsWith('„Türschild '+id+'“: Diese Gestaltung ist nicht mehr bestellbar.'));
const hex64=()=>randomBytes(32).toString('hex');

test('F02: unveränderte Motiv-, Logo- und Foto-Aufpreise gehen mit Nachweis zum vollen Preis durch',()=>{
 const lines=[line('motiv',{motifs:1}),line('logo',{logos:1}),line('foto',{uploads:1,photoCents:999}),line('alles',{motifs:2,logos:1,uploads:1,photoCents:999})];
 assert.deepEqual(run(lines),[]);
 assert.equal(price(lines,'motiv'),'21.68');assert.equal(price(lines,'logo'),'32.98');
 assert.equal(price(lines,'foto'),'29.98');assert.equal(price(lines,'alles'),'46.35');
});

test('F02: Zähler heruntersetzen oder entfernen sperrt die Kasse (Befund 21,68 → 19,99 € und 32,98 → 19,99 €)',()=>{
 const cases={motiv_0:l=>{l.motifs={value:'0'};},logo_0:l=>{l.logos={value:'0'};},foto_0:l=>{l.uploads={value:'0'};},
  motiv_weg:l=>{l.motifs=null;},logo_weg:l=>{l.logos=null;},alle_weg:l=>{l.motifs=l.uploads=l.logos=null;}};
 for(const [name,change] of Object.entries(cases)){
  const ok=line('ok',{motifs:1,logos:1,uploads:1,photoCents:999}),bad=structuredClone(ok);bad.id='gid://shopify/CartLine/x';bad.merchandise.product.title='Türschild x';change(bad);
  const errors=run([ok,bad]);assert.equal(errors.length,1,name);assert.ok(blocked(errors,'x'),name);
 }
 // Gegenprobe zum Befund: Ohne Nachweisprüfung hätte die Preisfunktion den niedrigeren Preis berechnet.
 const before=line('m',{motifs:1}),after={...structuredClone(before),motifs:{value:'0'}};
 assert.equal(price([before],'m'),'21.68');assert.equal(price([after],'m'),'19.99');assert.ok(blocked(run([after]),'m'));
 const logo=line('l',{logos:1}),noLogo={...structuredClone(logo),logos:{value:'0'}};
 assert.equal(price([logo],'l'),'32.98');assert.equal(price([noLogo],'l'),'19.99');assert.ok(blocked(run([noLogo]),'l'));
});

test('F02: fehlender, fremder oder wiederverwendeter Nachweis sperrt die Kasse',()=>{
 const a=line('a',{motifs:1}),b=line('b',{motifs:3,offer:hex64(),design:hex64()});
 const missing={...structuredClone(a),proof:null},foreign=signed(structuredClone(a),FOREIGN),borrowed={...structuredClone(a),proof:b.proof};
 const garbage={...structuredClone(a),proof:{value:'zz'}};
 for(const [name,l] of Object.entries({missing,foreign,borrowed,garbage}))assert.ok(blocked(run([l]),'a'),name);
 // Schlüssel fehlt in der Prüfregel: jede Position mit Aufpreis-Angaben ist gesperrt (fail closed).
 assert.ok(blocked(run([a],{key:null}),'a'));assert.ok(blocked(run([a],{key:'nicht-hex'}),'a'));
});

test('F02: Entwurfstausch, beliebiger Entwurfswert und Kopie eines günstigeren Angebots scheitern',()=>{
 const cheap=line('billig',{motifs:0,offer:hex64(),design:hex64()}),dear=line('teuer',{motifs:4,logos:1,offer:hex64(),design:hex64()});
 assert.deepEqual(run([cheap,dear]),[]);
 // Entwurf der teuren Gestaltung, Angebot/Zähler/Nachweis der günstigen.
 const swapped={...structuredClone(cheap),designFile:dear.designFile};assert.ok(blocked(run([swapped]),'billig'));
 // Teure Gestaltung behält ihren Entwurf, übernimmt aber Angebot, Zähler und Nachweis der günstigen.
 const copied={...structuredClone(dear),offer:cheap.offer,motifs:cheap.motifs,logos:cheap.logos,uploads:cheap.uploads,proof:cheap.proof};assert.ok(blocked(run([copied]),'teuer'));
 // Günstiges Angebot vollständig auf eine andere Variante kopiert.
 const otherVariant=structuredClone(cheap);otherVariant.merchandise.id='gid://shopify/ProductVariant/58104606556541';assert.ok(blocked(run([otherVariant]),'billig'));
 // Preisstand gewechselt.
 const otherRevision={...structuredClone(cheap),revision:{value:'1'}};assert.ok(blocked(run([otherRevision]),'billig'));
 // Befund: beliebiger Entwurfswert, Konfiguration/Revision/Angebot entfernt.
 const arbitrary={...structuredClone(cheap),designFile:{value:'irgendwas'},configuration:null,configRevision:null,offer:null};assert.ok(blocked(run([arbitrary]),'billig'));
 const noOffer={...structuredClone(cheap),offer:null};assert.ok(blocked(run([noOffer]),'billig'));
});

test('F02: Menge 1 → 4 bleibt gültig und kostet exakt den Staffelpreis; gewöhnliche Artikel bleiben unberührt',()=>{
 const one=line('menge',{motifs:1}),four={...structuredClone(one),quantity:4};
 const tiers=JSON.parse(one.merchandise.product.pricing.value).quantityTiers;
 assert.deepEqual(run([four]),[]);
 assert.equal(price([four],'menge'),(tierPrice(1999+169,tiers,4)/100).toFixed(2));assert.equal(price([four],'menge'),'20.60');
 for(const q of [1,3,5,10])assert.equal(price([{...structuredClone(one),quantity:q}],'menge'),(tierPrice(2168,tiers,q)/100).toFixed(2));
 const plain={id:'gid://shopify/CartLine/zubehoer',quantity:2,configuration:null,configRevision:null,offer:null,motifs:null,uploads:null,logos:null,revision:null,designFile:null,proof:null,
  merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/1',product:{id:'gid://shopify/Product/2',title:'Schrauben',pricing:null}}};
 assert.deepEqual(run([one,plain]),[]);assert.deepEqual(run([plain],{key:null}),[],'ohne Schlüssel bleiben gewöhnliche Artikel kaufbar');
 assert.deepEqual(run([{...structuredClone(one),motifs:{value:'0'}},plain]).length,1,'nur die manipulierte Position wird genannt');
});

test('F02: Warenkorb wird im Warenkorb nie gesperrt, nur in der Kasse',()=>{
 const bad={...line('w',{motifs:1}),motifs:{value:'0'}};
 assert.deepEqual(run([bad],{step:'CART_INTERACTION'}),[]);assert.equal(run([bad],{step:'CHECKOUT_INTERACTION'}).length,1);
});

test('F02: mehr als '+MAX_PERSONALIZED_LINES+' personalisierte Positionen → klarer Hinweis statt Anweisungslimit',()=>{
 const many=n=>Array.from({length:n},(_,i)=>line('p'+i,{motifs:i%3,offer:hex64(),design:hex64()}));
 assert.deepEqual(run(many(MAX_PERSONALIZED_LINES)),[]);
 assert.deepEqual(run(many(MAX_PERSONALIZED_LINES+1)).map(e=>e.message),[LIMIT_MESSAGE]);
});

test('F02: Server-Nachweis und Kassen-Prüfung passen zusammen; Schlüssel je Shop verschieden und nie im Warenkorb',()=>{
 const secret=randomBytes(24).toString('hex'),shop='gravuru-f02-test.myshopify.com',sign=createCheckoutProofSigner({secret,shopDomain:shop});
 const l=line('server',{motifs:2,logos:1});l.proof={value:sign(fields(l))};
 assert.deepEqual(run([l],{key:checkoutProofKeyHex({secret,shopDomain:shop})}),[]);
 assert.ok(blocked(run([l],{key:checkoutProofKeyHex({secret,shopDomain:'gravuru-design.myshopify.com'})}),'server'),'anderer Shop, anderer Schlüssel');
 assert.ok(!JSON.stringify(l).includes(checkoutProofKeyHex({secret,shopDomain:shop})));
 assert.equal(sign({...fields(l),motifs:'201'}),null);assert.equal(sign({...fields(l),logos:'3',uploads:'2'}),null);assert.equal(sign({...fields(l),designFile:'x'}),null);
 assert.equal(lineProofValid(proofKey(KEY),{...l,proof:{value:l.proof.value.toUpperCase()}}),false);
});

test('F02: SipHash-2-4 nach Referenzwerten; Kassen- und Serverquelle identisch',()=>{
 const k=proofKey('000102030405060708090a0b0c0d0e0f'.match(/../g).map((b,i,a)=>i%4===0?a.slice(i,i+4).reverse().join(''):'').join(''));
 const le=hex=>hex.match(/.{8}/g).map(w=>w.match(/../g).reverse().join('')).join('');
 assert.equal(le(proofTag(k,[])),'310e0edd47db6f72');assert.equal(le(proofTag(k,[0x03020100,0x07060504])),'6224939a79f5f593');
 const q=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
 assert.equal(q('./pruefung/src/checkout-proof.mjs'),q('../master-release/checkout-proof.mjs'));
 assert.match(q('./pruefung/src/cart_validation_run.graphql'),/validation \{ metafield\(namespace: "\$app", key: "checkout-proof-key"\) \{ value \} \}/);
 assert.match(q('./pruefung/src/cart_validation_run.graphql'),/proof: attribute\(key: "_gravuru_proof"\) \{ value \}/);
});
