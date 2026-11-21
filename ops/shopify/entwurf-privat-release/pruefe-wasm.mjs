// Chris 21.11.2026: Entwurfsnachweis unter dem privaten Schlüssel. Prüft die mit der Shopify-CLI gebauten Wasm-Dateien beider
// Funktionen gegen die geprüfte Quelle dieses Ordners – nach dem Muster von einzelsperre-release/messung/anweisungen.mjs.
// Kein Netz, kein Deploy, keine Freigabe; die Eingaben sind die echte Protokoll-Eingabe vom 15.11.2026 und Abwandlungen davon.
//
// Aufruf: node pruefe-wasm.mjs <shopify-cli run.js> <ext-dir preis> <ext-dir pruefung> <ausgabe.json>
// Jede ext-dir ist ein gebautes Funktionsprojekt (src/ aus diesem Ordner, dist/function.wasm aus `shopify app function build`).
// Ende mit Code 0 nur, wenn jede kompilierte Ausgabe der Quelle gleicht und jeder Lauf unter Shopifys Anweisungsgrenze bleibt.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {cartTransformRun} from './preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun} from './pruefung/src/cart_validation_run.mjs';
export const INSTRUCTION_LIMIT=11000000;
const real=()=>JSON.parse(fs.readFileSync(new URL('../master-release/fixtures/shopify-log-20261115-0941.json',import.meta.url),'utf8'));
// Die Zeile `designPrivate` gehört zur neuen Abfrage; Shopify liefert `null`, wenn die Position den Schlüssel nicht trägt.
const line=(source,id,change)=>{const next={...structuredClone(source),id,designPrivate:null};change?.(next);return next;};
const moved=l=>{l.designPrivate=l.designFile;l.designFile=null;};
export function cases(){
 const [fresh,stale]=real().cart.lines,mk=lines=>({presentmentCurrencyRate:'1.0',cart:{lines}}),id=i=>'gid://shopify/CartLine/pruefung-'+i;
 const many=(n,change)=>mk(Array.from({length:n},(_,i)=>line(fresh,id(i),l=>change?.(l,i))));
 return {
  sichtbar_echt_3:mk(real().cart.lines.map((l,i)=>line(l,l.id))),
  privat_1:mk([line(fresh,id(0),moved)]),
  privat_und_alt_3:mk([line(fresh,id(0),moved),line(stale,id(1)),line(fresh,id(2))]),
  beide_gleich_1:mk([line(fresh,id(0),l=>{l.designPrivate={value:l.designFile.value};})]),
  beide_verschieden_2:mk([line(fresh,id(0)),line(fresh,id(1),l=>{l.designPrivate={value:'gravuru:proof_other:'+'a'.repeat(64)};})]),
  ohne_nachweis_1:mk([line(fresh,id(0),l=>{l.designFile=null;})]),
  privat_10:many(10,moved),gemischt_16:many(16,(l,i)=>{if(i%2)moved(l);}),privat_20:many(20,moved)
 };
}
// Eingabe der Kassenprüfung aus derselben Zeilenliste (ohne Kassenbild, mit Produkttitel), wie am 16.11. gemessen.
export const guardInput=input=>({buyerJourney:{step:'CHECKOUT_COMPLETION'},cart:{lines:input.cart.lines.map(l=>{const c=structuredClone(l);delete c.checkoutImage;c.merchandise.product.title='Türschild';return c;})}});
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const digest=v=>createHash('sha256').update(JSON.stringify(canonical(v??null))).digest('hex');
export function run({cli,priceDir,guardDir}){
 const tmp=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'entwurf-privat-')),'in.json');
 const execute=(dir,input)=>{
  fs.writeFileSync(tmp,JSON.stringify(input));
  const r=spawnSync(process.execPath,[cli,'app','function','run','--path',dir,'--input',tmp,'--json','--no-input'],{encoding:'utf8',timeout:180000,env:{...process.env,SHOPIFY_CLI_NO_ANALYTICS:'1'}});
  const s=r.stdout||'';
  try{const j=JSON.parse(s.slice(s.indexOf('{'),s.lastIndexOf('}')+1));return {success:j.success!==false,instructions:j.instructions??j.instructionsConsumed??null,output:j.output??null};}
  catch{return {success:false,instructions:null,output:null,error:(r.stderr||s).slice(0,200)};}
 };
 const wasm=dir=>{const bytes=fs.readFileSync(path.join(dir,'dist/function.wasm'));return {bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
 const result={erstellt:new Date().toISOString(),grenze:INSTRUCTION_LIMIT,wasm:{'gravuru-personalization-price':wasm(priceDir),'gravuru-checkout-guard':wasm(guardDir)},faelle:{},ok:true};
 for(const [name,input] of Object.entries(cases())){
  const checks={preis:[priceDir,input,cartTransformRun(structuredClone(input))],pruefung:[guardDir,guardInput(input),cartValidationsGenerateRun(guardInput(input))]};
  result.faelle[name]=Object.fromEntries(Object.entries(checks).map(([part,[dir,value,expected]])=>{
   const actual=execute(dir,value),gleich=actual.success&&digest(actual.output)===digest(expected),imRahmen=Number.isSafeInteger(actual.instructions)&&actual.instructions>0&&actual.instructions<INSTRUCTION_LIMIT;
   if(!gleich||!imRahmen)result.ok=false;
   return [part,{gleichWieQuelle:gleich,anweisungen:actual.instructions,unterGrenze:imRahmen,...(actual.error?{fehler:actual.error}:{})}];
  }));
 }
 return result;
}
if(import.meta.url===new URL('file://'+path.resolve(process.argv[1]||'')).href){
 const [cli,priceDir,guardDir,target]=process.argv.slice(2);
 if(!cli||!priceDir||!guardDir||!target){console.error('Aufruf: node pruefe-wasm.mjs <shopify-cli run.js> <ext-dir preis> <ext-dir pruefung> <ausgabe.json>');process.exit(2);}
 const result=run({cli,priceDir,guardDir});fs.writeFileSync(target,JSON.stringify(result,null,1)+'\n');
 console.log(JSON.stringify({ok:result.ok,wasm:result.wasm,faelle:Object.keys(result.faelle).length}));process.exit(result.ok?0:1);
}
