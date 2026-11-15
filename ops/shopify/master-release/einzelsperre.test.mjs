// Chris 15.11.2026: Eine ungültige Position darf nicht den ganzen Warenkorb sperren („Beim Kunden darf es
// nicht so sein“). Grundlage ist die echte, abgewiesene Eingabe aus dem Shopify-Funktionsprotokoll vom
// 15.11.2026 09:41 (neue Edelstahl-Gestaltung + zwei alte Leuchtturm-Testpositionen ohne Preisstand).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cartTransformRun,cartTransformStrict,rejectedPricingLines} from './cart_transform_run.mjs';
import {cartValidationsGenerateRun} from './cart_validation_run.mjs';

const real=()=>JSON.parse(fs.readFileSync(new URL('./fixtures/shopify-log-20261115-0941.json',import.meta.url),'utf8'));
const price=(result,lineId)=>result.operations.find(o=>o.lineUpdate?.cartLineId===lineId&&o.lineUpdate.price)?.lineUpdate.price.adjustment.fixedPricePerUnit.amount;
const validate=(input,step,titles=[])=>cartValidationsGenerateRun({buyerJourney:{step},cart:{lines:input.cart.lines.map((l,i)=>({...l,merchandise:{...l.merchandise,product:{...l.merchandise.product,title:titles[i]}}}))}}).operations[0].validationAdd.errors;

test('echte Eingabe 15.11.: bisher ganzer Warenkorb gesperrt, jetzt nur die alten Positionen',()=>{
 const input=real(),[fresh,old1,old2]=input.cart.lines;
 assert.throws(()=>cartTransformStrict(real()),/Personalization must be completed/,'so lehnte die aktive Version alles ab');
 const result=cartTransformRun(input);
 assert.equal(price(result,fresh.id),'19.99','neue Gestaltung wird normal bepreist');
 assert.equal(price(result,old1.id),undefined);assert.equal(price(result,old2.id),undefined);
 assert.deepEqual(rejectedPricingLines(real()).map(r=>r.index),[1,2]);
});

test('Checkout-Prüfung sperrt nur beim Checkout und nennt die Position; im Warenkorb bleibt alles bedienbar',()=>{
 const titles=['Türschild Edelstahl – Form und Größe selbst wählen','Türschild Leuchtturm aus Edelstahl – 12 × 8 cm personalisiert','Türschild Leuchtturm aus Edelstahl – 12 × 8 cm personalisiert'];
 for(const step of ['CHECKOUT_INTERACTION','CHECKOUT_COMPLETION']){
  const errors=validate(real(),step,titles);assert.equal(errors.length,2,step);
  for(const e of errors){assert.equal(e.target,'$.cart');assert.match(e.message,/^„Türschild Leuchtturm .*“: Diese Gestaltung ist nicht mehr bestellbar\./);}
 }
 assert.deepEqual(validate(real(),'CART_INTERACTION',titles),[],'Hinzufügen/Entfernen wird nicht blockiert');
 const valid=real();valid.cart.lines=[valid.cart.lines[0]];
 assert.deepEqual(validate(valid,'CHECKOUT_COMPLETION'),[],'gültiger Warenkorb kommt ohne Hinweis durch');
});

test('Größe nicht mehr in der Preisliste: nur diese Position wird abgewiesen und am Checkout gesperrt',()=>{
 const input=real();input.cart.lines=[input.cart.lines[0],structuredClone(input.cart.lines[0])];
 const gone=input.cart.lines[1];gone.id='gid://shopify/CartLine/entfernte-groesse';gone.merchandise.id='gid://shopify/ProductVariant/58104601117052';// eine Stelle vor der ersten Variante der Preisliste
 const result=cartTransformRun(structuredClone(input));
 assert.equal(price(result,input.cart.lines[0].id),'19.99');assert.equal(price(result,gone.id),undefined);
 assert.deepEqual(rejectedPricingLines(structuredClone(input)).map(r=>r.index),[1]);
 assert.equal(validate(input,'CHECKOUT_COMPLETION').length,1);
});

test('Position ohne Konfigurator-Angaben (am Konfigurator vorbei) wird nie zum Listenpreis verkauft',()=>{
 const input=real(),plain=structuredClone(input.cart.lines[0]);
 for(const key of ['configuration','configRevision','offer','checkoutImage','motifs','uploads','logos','revision','designFile'])plain[key]=null;
 plain.id='gid://shopify/CartLine/ohne-konfig';input.cart.lines=[input.cart.lines[0],plain];
 assert.equal(price(cartTransformRun(structuredClone(input)),plain.id),undefined);
 assert.equal(validate(input,'CHECKOUT_COMPLETION').length,1);assert.equal(validate(input,'CART_INTERACTION').length,0);
});

test('gültige Warenkörbe: identisches Ergebnis wie die bisherige Preisfunktion',()=>{
 const input=real();input.cart.lines=[input.cart.lines[0]];
 assert.deepEqual(cartTransformRun(structuredClone(input)),cartTransformStrict(structuredClone(input)));
 for(const quantity of [1,3,5,10]){const v=structuredClone(input);v.cart.lines[0].quantity=quantity;assert.deepEqual(cartTransformRun(structuredClone(v)),cartTransformStrict(v));}
});
