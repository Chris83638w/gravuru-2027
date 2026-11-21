// Chris 21.11.2026, 15:22 Uhr: Die Zeilenangabe „Bearbeitbarer Entwurf“ soll für Kunden nicht mehr sichtbar sein.
// Folgefassung beider Funktionen: Sie lesen den Entwurfsnachweis unter dem privaten Schlüssel `_gravuru_entwurf` ODER unter
// dem bisherigen sichtbaren und prüfen ihn exakt wie bisher. Grundlage ist die aktive Fassung (einzelsperre-release) und die
// echte Eingabe aus dem Shopify-Funktionsprotokoll vom 15.11.2026 09:41.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cartTransformRun,cartTransformStrict,rejectedPricingLines} from './preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun} from './pruefung/src/cart_validation_run.mjs';
import * as active from '../einzelsperre-release/preis/src/master-release/cart_transform_run.mjs';
import {cartValidationsGenerateRun as activeValidation} from '../einzelsperre-release/pruefung/src/cart_validation_run.mjs';
import * as head from '../master-release/cart_transform_run.mjs';
import {DESIGN_REFERENCE_KEY,PRIVATE_DESIGN_REFERENCE_KEY} from '../../../app/workshop/cart-personalization.mjs';
import os from 'node:os';
import path from 'node:path';
import {run as checkWasm,cases as wasmCases,guardInput,INSTRUCTION_LIMIT} from './pruefe-wasm.mjs';

const real=()=>JSON.parse(fs.readFileSync(new URL('../master-release/fixtures/shopify-log-20261115-0941.json',import.meta.url),'utf8'));
const text=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');
const price=(result,lineId)=>result.operations.find(o=>o.lineUpdate?.cartLineId===lineId&&o.lineUpdate.price)?.lineUpdate.price.adjustment.fixedPricePerUnit.amount;
const guard=(run,input,step='CHECKOUT_COMPLETION')=>run({buyerJourney:{step},cart:{lines:input.cart.lines}}).operations[0]?.validationAdd.errors??[];
// Die aktive Eingabe kennt `designPrivate` nicht; Shopify liefert für einen Schlüssel, den die Zeile nicht trägt, `null`.
const withPrivate=(input,change)=>{const next=structuredClone(input);next.cart.lines.forEach((line,index)=>{line.designPrivate=null;change?.(line,index);});return next;};
const moved=line=>{line.designPrivate=line.designFile;line.designFile=null;};
const outcome=(run,rejected,input)=>({operations:run(structuredClone(input)).operations,rejected:rejected(structuredClone(input))});

test('Bestand unverändert: Warenkörbe mit dem sichtbaren Schlüssel ergeben genau das Ergebnis der aktiven Fassung',()=>{
 const cases=[real(),withPrivate(real())];
 const single=real();single.cart.lines=[single.cart.lines[0]];cases.push(single);
 for(const quantity of [1,3,5,10]){const v=structuredClone(single);v.cart.lines[0].quantity=quantity;cases.push(v);}
 const plain=real();for(const key of ['configuration','configRevision','offer','checkoutImage','motifs','uploads','logos','revision','designFile'])plain.cart.lines[0][key]=null;cases.push(plain);
 for(const input of cases){
  assert.deepEqual(outcome(cartTransformRun,rejectedPricingLines,input),outcome(active.cartTransformRun,active.rejectedPricingLines,input));
  for(const step of ['CART_INTERACTION','CHECKOUT_INTERACTION','CHECKOUT_COMPLETION'])assert.deepEqual(guard(cartValidationsGenerateRun,input,step),guard(activeValidation,input,step),step);
 }
 assert.equal(price(cartTransformRun(real()),real().cart.lines[0].id),'19.99');
 assert.throws(()=>cartTransformStrict(real()),/Personalization must be completed/);
});

test('neue Position: nur der private Schlüssel – gleicher Preis, gleiche Sperrliste, kein Hinweis an der Kasse',()=>{
 const visible=real(),hidden=withPrivate(real(),(line,index)=>{if(index===0)moved(line);}),fresh=visible.cart.lines[0];
 assert.equal(hidden.cart.lines[0].designFile,null);assert.match(hidden.cart.lines[0].designPrivate.value,/^gravuru:proof_/);
 assert.deepEqual(outcome(cartTransformRun,rejectedPricingLines,hidden),outcome(cartTransformRun,rejectedPricingLines,visible));
 assert.equal(price(cartTransformRun(structuredClone(hidden)),fresh.id),'19.99');
 const only=structuredClone(hidden);only.cart.lines=[only.cart.lines[0]];
 assert.deepEqual(rejectedPricingLines(structuredClone(only)),[]);assert.deepEqual(guard(cartValidationsGenerateRun,only),[]);
 assert.deepEqual(cartTransformStrict(structuredClone(only)),cartTransformRun(structuredClone(only)));
 for(const quantity of [1,3,5,10]){
  const a=structuredClone(only),b=real();b.cart.lines=[b.cart.lines[0]];a.cart.lines[0].quantity=b.cart.lines[0].quantity=quantity;
  assert.deepEqual(cartTransformRun(a),active.cartTransformRun(b),'Menge '+quantity);
 }
});

test('Reihenfolge der Veröffentlichung: die aktive Fassung gibt einer Position mit nur dem privaten Schlüssel keinen Preis und sperrt sie',()=>{
 const only=withPrivate(real(),(line,index)=>{if(index===0)moved(line);});only.cart.lines=[only.cart.lines[0]];
 assert.equal(price(active.cartTransformRun(structuredClone(only)),only.cart.lines[0].id),undefined);
 assert.equal(guard(activeValidation,only).length,1);assert.equal(guard(activeValidation,only,'CART_INTERACTION').length,0);
 // Verkauft wird sie damit nie zum Listenpreis – aber eben auch nicht bestellt. Deshalb erst die Funktionen, dann der Server-Schalter.
});

test('beide Schlüssel: gleicher Wert gilt, verschiedene Werte sind ungültig – nur diese Position wird abgewiesen und gesperrt',()=>{
 const same=withPrivate(real(),(line,index)=>{if(index===0)line.designPrivate={value:line.designFile.value};});
 assert.deepEqual(outcome(cartTransformRun,rejectedPricingLines,same),outcome(cartTransformRun,rejectedPricingLines,real()));
 const valid=real();valid.cart.lines=[valid.cart.lines[0],structuredClone(valid.cart.lines[0])];valid.cart.lines[1].id='gid://shopify/CartLine/zweite';
 for(const other of ['gravuru:proof_other:'+'a'.repeat(64),'','x']){
  const conflict=withPrivate(valid,(line,index)=>{if(index===1)line.designPrivate={value:other};});
  const result=cartTransformRun(structuredClone(conflict));
  assert.equal(price(result,valid.cart.lines[0].id),'19.99');assert.equal(price(result,'gid://shopify/CartLine/zweite'),undefined,JSON.stringify(other));
  assert.deepEqual(rejectedPricingLines(structuredClone(conflict)),[{index:1,lineId:'gid://shopify/CartLine/zweite',reason:'Conflicting design reference'}]);
  assert.equal(guard(cartValidationsGenerateRun,conflict).length,1);assert.equal(guard(cartValidationsGenerateRun,conflict,'CART_INTERACTION').length,0);
  assert.throws(()=>cartTransformStrict(structuredClone(conflict)),/Conflicting design reference/);
 }
});

test('keine Abschwächung: der private Schlüssel wird in jedem Fall genau wie der sichtbare behandelt',()=>{
 // Je Position der echten Eingabe und je Wert: einmal unter dem sichtbaren, einmal unter dem privaten Schlüssel – gleiches Ergebnis.
 const values=[null,{value:''},{value:'x'},{value:'gravuru:proof_a:'+'b'.repeat(64)}];
 const mutations=[()=>{},line=>{line.revision={value:'999'};},line=>{line.motifs={value:'-1'};},line=>{line.uploads=null;},line=>{line.merchandise.product.pricing=null;},line=>{line.merchandise.id='gid://shopify/ProductVariant/1';},line=>{line.quantity=3;}];
 let compared=0;
 for(let index=0;index<3;index++)for(const value of values)for(const mutate of mutations){
  const visible=withPrivate(real(),(line,i)=>{if(i===index){line.designFile=structuredClone(value);mutate(line);}});
  const hidden=withPrivate(real(),(line,i)=>{if(i===index){line.designFile=null;line.designPrivate=structuredClone(value);mutate(line);}});
  assert.deepEqual(outcome(cartTransformRun,rejectedPricingLines,hidden),outcome(cartTransformRun,rejectedPricingLines,visible),JSON.stringify({index,value,mutate:String(mutate)}));
  assert.deepEqual(guard(cartValidationsGenerateRun,hidden),guard(cartValidationsGenerateRun,visible));
  // … und der sichtbare Schlüssel ergibt weiter genau das Ergebnis der aktiven Fassung.
  assert.deepEqual(outcome(cartTransformRun,rejectedPricingLines,visible),outcome(active.cartTransformRun,active.rejectedPricingLines,visible));
  compared++;
 }
 assert.equal(compared,84);
 // Ohne jeden Nachweis bleibt die Position abgewiesen (der private Schlüssel ersetzt keine Pflichtangabe).
 const none=withPrivate(real(),(line,index)=>{if(index===0)line.designFile=null;});
 assert.deepEqual(rejectedPricingLines(structuredClone(none)).map(r=>[r.index,r.reason])[0],[0,'Personalization must be completed before checkout']);
});

test('normale Produkte ohne Konfigurator-Preis werden weiter nie gesperrt',()=>{
 const base=real().cart.lines[0];
 const plain=(id,pricing)=>({id,quantity:2,configuration:null,configRevision:null,offer:null,checkoutImage:null,motifs:null,uploads:null,logos:null,revision:null,designFile:null,designPrivate:null,merchandise:{__typename:'ProductVariant',id:'gid://shopify/ProductVariant/1',product:{id:'gid://shopify/Product/2',pricing}}});
 for(const line of [plain('ohne',null),plain('aus',{value:JSON.stringify({schema:'gravuru-personalization-pricing/v1',enabled:false})}),{id:'custom',quantity:1,merchandise:{__typename:'CustomProduct'}}]){
  const input={presentmentCurrencyRate:'1.0',cart:{lines:[{...base,designPrivate:null},line]}};
  assert.deepEqual(rejectedPricingLines(structuredClone(input)),[]);assert.deepEqual(guard(cartValidationsGenerateRun,input),[]);
  assert.equal(price(cartTransformRun(structuredClone(input)),base.id),'19.99');
 }
});

// Kosten einer Eingabeabfrage nach Shopifys Tabelle (Functions API, abgerufen 21.11.2026): `__typename` 0, ein Feld, das ein
// Metafeld liefert, 3, Felder am Metafeld 0, jedes andere Blatt 1, jeder andere Behälter 0. Grenze 30; höchstens 3000 Byte.
function inputQueryCost(query){
 const tokens=query.slice(query.indexOf('{')).match(/\.\.\.\s*on\s+\w+|\w+\s*:\s*\w+(?:\s*\([^)]*\))?|\w+(?:\s*\([^)]*\))?|[{}]/g),stack=[];let cost=0,last=null;
 tokens.forEach((token,i)=>{
  if(token==='{'){stack.push(last);return;}
  if(token==='}'){stack.pop();return;}
  const name=token.startsWith('...')?'...':(token.match(/^\w+\s*:\s*(\w+)/)||token.match(/^(\w+)/))[1],leaf=tokens[i+1]!=='{';last=name;
  if(name==='metafield')cost+=3;else if(leaf&&name!=='__typename'&&stack.at(-1)!=='metafield')cost+=1;
 });
 return cost;
}
test('Freigabe-Quelle: einzig die zweite Lesart kommt hinzu; Abfragen bleiben in Shopifys Grenzen und passen zu den Schlüsseln des Servers',()=>{
 const files=['cart_transform_run.graphql','master-release/cart_transform_run.mjs','master-release/price-v1.mjs','master-release/legacy-price.mjs','master-release/pricing-history.mjs','checkout-image/cart-image.mjs','index.js'];
 // Preisfunktion: nur Abfrage und die gemeinsame Einstiegsdatei weichen von der aktiven Fassung ab.
 assert.deepEqual(files.filter(f=>text('./preis/src/'+f)!==text('../einzelsperre-release/preis/src/'+f)),['cart_transform_run.graphql','master-release/cart_transform_run.mjs']);
 const guardFiles=['cart_validation_run.graphql','cart_validation_run.mjs','index.js',...files.slice(1,6)];
 assert.deepEqual(guardFiles.filter(f=>text('./pruefung/src/'+f)!==text('../einzelsperre-release/pruefung/src/'+f)),['cart_validation_run.graphql','master-release/cart_transform_run.mjs']);
 for(const f of ['shopify.extension.toml','package.json'])assert.equal(text('./pruefung/'+f),text('../einzelsperre-release/pruefung/'+f),f);
 // Beide Funktionen nutzen identische Preislogik (wie bisher).
 for(const f of files.slice(1,6))assert.equal(text('./pruefung/src/'+f),text('./preis/src/'+f),f);
 // In der Logik kommt nur `withDesignReference` hinzu und wird an genau einer Stelle vor die unveränderte Prüfung gesetzt.
 const before=text('../einzelsperre-release/preis/src/master-release/cart_transform_run.mjs').split('\n'),after=text('./preis/src/master-release/cart_transform_run.mjs').split('\n');
 assert.deepEqual(before.filter(line=>!after.includes(line)),['   const own=priceOne(line,pricingForLine,input);']);
 const added=after.filter(line=>!before.includes(line));
 assert.ok(added.includes('   const own=priceOne(withDesignReference(line),pricingForLine,input);'));
 assert.ok(added.every(line=>line.startsWith('//')||line.includes('withDesignReference')||/^ (const (hidden|visible)=|if\(|return )/.test(line)),JSON.stringify(added));
 for(const [file,aliases,cost] of [['./preis/src/cart_transform_run.graphql',10,18],['./pruefung/src/cart_validation_run.graphql',9,18]]){
  const query=text(file),keys=Object.fromEntries([...query.matchAll(/(\w+): attribute\(key: "([^"]+)"\)/g)].map(m=>[m[1],m[2]]));
  assert.equal(Object.keys(keys).length,aliases,file);
  // Dieselben Schlüssel, die der Server schreibt bzw. liest.
  assert.equal(keys.designFile,DESIGN_REFERENCE_KEY);assert.equal(keys.designPrivate,PRIVATE_DESIGN_REFERENCE_KEY);
  assert.equal(inputQueryCost(query),cost,file);assert.ok(inputQueryCost(query)<=30);assert.ok(Buffer.byteLength(query)<3000);
 }
 assert.equal(inputQueryCost(text('../einzelsperre-release/preis/src/cart_transform_run.graphql')),17,'Gegenprobe der Zählung an der aktiven Abfrage');
 // Keine Kennung und keine Binärdatei in diesem Ordner: Die Wasm-Dateien baut der Operator mit der Shopify-CLI.
 for(const dir of ['./preis/src/','./pruefung/src/'])for(const f of fs.readdirSync(new URL(dir,import.meta.url),{recursive:true}))assert.doesNotMatch(String(f),/\.wasm$/);
});

test('Entwicklungsstand (master-release) trägt dieselbe Lesart, damit eine spätere Fassung sie nicht wieder verliert',()=>{
 assert.match(text('../master-release/cart_validation_run.graphql'),/designPrivate: attribute\(key: "_gravuru_entwurf"\) \{ value \}/);
 const functionText=source=>source.slice(source.indexOf('function withDesignReference(line){'),source.indexOf('function priceOne('));
 assert.equal(functionText(text('../master-release/cart_transform_run.mjs')),functionText(text('./preis/src/master-release/cart_transform_run.mjs')));
 assert.ok(functionText(text('./preis/src/master-release/cart_transform_run.mjs')).length>200);
 const visible=withPrivate(real()),hidden=withPrivate(real(),(line,index)=>{if(index===0)moved(line);});
 assert.deepEqual(outcome(head.cartTransformRun,head.rejectedPricingLines,hidden),outcome(head.cartTransformRun,head.rejectedPricingLines,visible));
 assert.equal(price(head.cartTransformRun(structuredClone(hidden)),real().cart.lines[0].id),'19.99');
 const conflict=withPrivate(real(),(line,index)=>{if(index===0)line.designPrivate={value:'anders'};});
 assert.equal(head.rejectedPricingLines(structuredClone(conflict))[0].reason,'Conflicting design reference');
});

test('Prüfhilfe für die gebauten Wasm-Dateien: gleicht jede kompilierte Ausgabe mit der Quelle ab und meldet Abweichung oder Grenze',t=>{
 // Die CLI und die Wasm-Dateien gibt es hier nicht. Ein Stellvertreter in der Aufrufform der CLI (`app function run --path … --input …
 // --json`) führt die Quelle des jeweiligen Ordners aus – so ist die Hilfe selbst geprüft, nicht die Kompilierung.
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'entwurf-privat-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const here=new URL('.',import.meta.url).href;
 for(const name of ['preis','pruefung','preis-falsch']){fs.mkdirSync(path.join(dir,name,'dist'),{recursive:true});fs.writeFileSync(path.join(dir,name,'dist/function.wasm'),'stellvertreter-'+name);}
 const cli=path.join(dir,'cli.mjs');
 fs.writeFileSync(cli,`import fs from 'node:fs';import path from 'node:path';
const args=process.argv.slice(2),value=name=>args[args.indexOf(name)+1],part=path.basename(value('--path')),input=JSON.parse(fs.readFileSync(value('--input'),'utf8'));
if(args.slice(0,3).join(' ')!=='app function run'||!args.includes('--json')||!args.includes('--no-input'))process.exit(3);
const price=await import(${JSON.stringify(here)}+'preis/src/index.js'),guard=await import(${JSON.stringify(here)}+'pruefung/src/index.js');
let output=part==='pruefung'?guard.cartValidationsGenerateRun(input):price.cartTransformRun(input);
if(part==='preis-falsch')output={operations:output.operations.slice(1)};
console.log('Hinweis der CLI vor dem Ergebnis');console.log(JSON.stringify({success:true,instructions:Number(process.env.STELLVERTRETER_ANWEISUNGEN||123456),output}));`);
 const good=checkWasm({cli,priceDir:path.join(dir,'preis'),guardDir:path.join(dir,'pruefung')});
 assert.equal(good.ok,true,JSON.stringify(good.faelle));assert.equal(good.grenze,INSTRUCTION_LIMIT);
 assert.deepEqual(Object.keys(good.faelle),['sichtbar_echt_3','privat_1','privat_und_alt_3','beide_gleich_1','beide_verschieden_2','ohne_nachweis_1','privat_10','gemischt_16','privat_20']);
 for(const entry of Object.values(good.faelle))assert.deepEqual(entry,{preis:{gleichWieQuelle:true,anweisungen:123456,unterGrenze:true},pruefung:{gleichWieQuelle:true,anweisungen:123456,unterGrenze:true}});
 assert.deepEqual(good.wasm['gravuru-personalization-price'].bytes,'stellvertreter-preis'.length);assert.match(good.wasm['gravuru-checkout-guard'].sha256,/^[a-f0-9]{64}$/);
 // Eine abweichende kompilierte Ausgabe fällt auf – in jedem Fall, der eine Preisoperation enthält.
 const wrong=checkWasm({cli,priceDir:path.join(dir,'preis-falsch'),guardDir:path.join(dir,'pruefung')});
 assert.equal(wrong.ok,false);assert.equal(wrong.faelle.privat_1.preis.gleichWieQuelle,false);assert.equal(wrong.faelle.privat_1.pruefung.gleichWieQuelle,true);
 assert.equal(wrong.faelle.ohne_nachweis_1.preis.gleichWieQuelle,true,'ohne Preisoperation gibt es dort nichts zu verfälschen');
 // Über der Anweisungsgrenze oder ohne lesbares Ergebnis gilt der Lauf als nicht bestanden.
 process.env.STELLVERTRETER_ANWEISUNGEN=String(INSTRUCTION_LIMIT);t.after(()=>{delete process.env.STELLVERTRETER_ANWEISUNGEN;});
 const heavy=checkWasm({cli,priceDir:path.join(dir,'preis'),guardDir:path.join(dir,'pruefung')});assert.equal(heavy.ok,false);assert.equal(heavy.faelle.privat_1.preis.unterGrenze,false);assert.equal(heavy.faelle.privat_1.preis.gleichWieQuelle,true);
 delete process.env.STELLVERTRETER_ANWEISUNGEN;
 const broken=checkWasm({cli:path.join(dir,'fehlt.mjs'),priceDir:path.join(dir,'preis'),guardDir:path.join(dir,'pruefung')});assert.equal(broken.ok,false);assert.equal(broken.faelle.privat_1.preis.gleichWieQuelle,false);
 // Die Fälle decken beide Schlüssel, den Konflikt und die fehlende Angabe ab; die Kassenprüfung bekommt dieselben Zeilen.
 const all=wasmCases();
 assert.equal(all.privat_1.cart.lines[0].designFile,null);assert.match(all.privat_1.cart.lines[0].designPrivate.value,/^gravuru:proof_/);
 assert.equal(rejectedPricingLines(structuredClone(all.beide_verschieden_2))[0].reason,'Conflicting design reference');
 assert.equal(rejectedPricingLines(structuredClone(all.privat_20)).length,0);assert.equal(cartTransformRun(structuredClone(all.privat_20)).operations.length,20);
 assert.equal(guardInput(all.privat_1).buyerJourney.step,'CHECKOUT_COMPLETION');assert.deepEqual(guardInput(all.privat_1).cart.lines[0].designPrivate,all.privat_1.cart.lines[0].designPrivate);
});
