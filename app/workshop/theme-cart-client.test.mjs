import test from 'node:test';
import assert from 'node:assert/strict';
import {createThemeCartClient,verifyThemeCartLine,validateThemeCartPayload,themeCartLines} from './ui/theme-cart-client.mjs';
const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
function payload(rev=1){const id='konfig_11111111-1111-4111-8111-111111111111';return {schema:'gravuru-theme-cart/v1',shopDomain:'test.myshopify.com',variantId:'11',productId:'1',quantity:2,unitCents:1999,totalCents:3998,currency:'EUR',configuration:{id,rev},mode:rev===1?'create':'update',previousRevision:rev===1?null:rev-1,properties:{_gravuru_offer:String(rev).repeat(64),_gravuru_config:id,_gravuru_rev:String(rev),Design:'Leuchtturm',Gravurtext:'Familie Müller',Format:'120 × 80 mm'},preview:{type:'image/png',base64:png},paymentConfirmed:false,productionReady:false};}
const line=p=>({key:p.variantId+':key'+p.configuration.rev,variant_id:Number(p.variantId),product_id:Number(p.productId),quantity:p.quantity,original_price:p.unitCents,original_line_price:p.totalCents,final_line_price:p.totalCents,properties:{...p.properties,_Entwurf:'https://cdn.shopify.com/s/files/1/uploads/design.png'}});
function fixture(p,{old,lost=false,miss=false,alter,removeFails=false,expectImage=null}={}){
 const foreign={key:'77:unrelated',variant_id:77,product_id:7,quantity:3,original_price:100,original_line_price:300,final_line_price:300,properties:{Hinweis:'unverändert'}};
 const cart={currency:'EUR',items:[foreign,...(old?[line(old)]:[])]},calls=[];let claims=0,upload=null,changes=0;
 const fetchImpl=async(url,options)=>{
  calls.push(url);assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
  if(url==='/de/cart.js')return Response.json(structuredClone(cart));
  if(url==='/de/cart/add.js'){
   assert.ok(options.body instanceof FormData);upload=options.body;
   assert.equal(upload.get('items[0][id]'),p.variantId);assert.equal(upload.get('items[0][quantity]'),String(p.quantity));
   const image=upload.get('items[0][properties][_Entwurf]');if(expectImage){assert.equal(image.type,expectImage.type);assert.equal(image.name,expectImage.type==='image/jpeg'?'gravuru-gestaltung.jpg':'gravuru-gestaltung.png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),Buffer.from(await expectImage.arrayBuffer()));}else{assert.equal(image.type,'image/png');assert.equal(image.name,'gravuru-gestaltung.png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),Buffer.from(png,'base64'));}
   if(!miss){const added=line(p);alter?.(added,cart);cart.items.push(added);}
   if(lost)throw Error('synthetic lost reply');
   return Response.json({items:cart.items.slice(-1)});
  }
  if(url==='/de/cart/change.js'){changes++;if(removeFails)throw Error('synthetic delete timeout');const body=JSON.parse(options.body);assert.equal(body.quantity,0);const at=cart.items.findIndex(l=>l.key===body.id);assert.ok(at>=0);cart.items.splice(at,1);return Response.json(structuredClone(cart));}
  assert.fail(url);
 };
 const client=createThemeCartClient({fetchImpl,root:'/de/',claim:async()=>{claims++;if(claims>1)throw Error('already claimed');}});
 return {client,cart,calls,foreign,claims:()=>claims,upload:()=>upload,changes:()=>changes};
}
test('normal cart receives preview, text, exact price and saved reference while unrelated items remain',async()=>{
 const p=payload(),f=fixture(p),before=structuredClone(f.foreign);const r=await f.client.submit(p);
 assert.equal(r.cartUrl,'/de/cart');assert.equal(r.paymentConfirmed,false);assert.equal(f.claims(),1);assert.deepEqual(f.cart.items[0],before);assert.equal(f.cart.items.length,2);
 assert.equal(f.upload().get('items[0][properties][Gravurtext]'),'Familie Müller');assert.ok(f.calls.indexOf('/de/cart.js')<f.calls.indexOf('/de/cart/add.js'));
});

test('real multipart line endings keep multiline engraving text verifiable without accepting changed content',async()=>{
 const p=payload();p.properties.Gravurtext='Spruch: Heimathafen\nvon · Nachname: Müller';p.properties['Gravurtext 2']='Straße 1\nBielefeld';
 const multipart=new FormData();multipart.set('Gravurtext',p.properties.Gravurtext);
 const transmitted=await new Response(multipart).formData();
 assert.equal(transmitted.get('Gravurtext'),'Spruch: Heimathafen\r\nvon · Nachname: Müller');
 const f=fixture(p,{alter:l=>{l.properties.Gravurtext=transmitted.get('Gravurtext');l.properties['Gravurtext 2']='Straße 1\r\nBielefeld';}});
 await f.client.submit(p);await f.client.submit(p);assert.equal(f.claims(),1);assert.equal(f.cart.items.length,2);
 for(const changed of ['Spruch: Heimathafen von · Nachname: Müller','Spruch: Heimathafen\n\nvon · Nachname: Müller','Spruch: Heimathafen\nvon · Nachname: Meier']){
  const cart={currency:'EUR',items:[line(p)]};cart.items[0].properties.Gravurtext=changed;assert.throws(()=>verifyThemeCartLine(cart,p),/stimmen nicht/);
 }
 for(const key of ['Format','_gravuru_rev','_gravuru_offer']){
  const cart={currency:'EUR',items:[line(p)]};cart.items[0].properties[key]+='\r\n';assert.throws(()=>verifyThemeCartLine(cart,p));
 }
});
test('repeat click and lost successful POST reply recover by read-back without duplicate upload',async()=>{
 for(const lost of [false,true]){const p=payload(),f=fixture(p,{lost});await f.client.submit(p);await f.client.submit(p);assert.equal(f.claims(),1);assert.equal(f.calls.filter(x=>x.endsWith('add.js')).length,1);assert.equal(f.cart.items.length,2);}
});
test('uncertain failed upload is never blindly retried',async()=>{
 const p=payload(),f=fixture(p,{lost:true,miss:true});await assert.rejects(f.client.submit(p));await assert.rejects(f.client.submit(p),/keine zweite Position/);assert.equal(f.claims(),1);assert.equal(f.calls.filter(x=>x.endsWith('add.js')).length,1);
});
test('editing uploads and verifies new preview before removing only the previous design line',async()=>{
 const p=payload(2),f=fixture(p,{old:payload(1)}),before=structuredClone(f.foreign);await f.client.submit(p);
 assert.equal(f.cart.items.length,2);assert.equal(f.cart.items[1].properties._gravuru_rev,'2');assert.deepEqual(f.cart.items[0],before);assert.equal(f.changes(),1);assert.ok(f.calls.indexOf('/de/cart/change.js')>f.calls.indexOf('/de/cart/add.js'));
});
test('bad new price or missing preview preserves the old design line',async()=>{
 for(const alter of [l=>l.original_price++,l=>delete l.properties._Entwurf,l=>l.properties.Gravurtext='falsch',l=>l.quantity++]){const p=payload(2),f=fixture(p,{old:payload(1),alter});await assert.rejects(f.client.submit(p),/stimmen nicht/);assert.equal(f.changes(),0);assert.ok(f.cart.items.some(l=>l.properties._gravuru_rev==='1'));}
});
test('a failed removal can be completed by read-back, without another upload',async()=>{
 const p=payload(2),f=fixture(p,{old:payload(1),removeFails:true});await assert.rejects(f.client.submit(p));await assert.rejects(f.client.submit(p));assert.equal(f.calls.filter(x=>x.endsWith('add.js')).length,1);assert.equal(f.cart.items.length,3);
});
test('missing, newer, or duplicate previous position blocks before upload',async()=>{
 for(const old of [undefined,payload(3)]){const p=payload(2),f=fixture(p,{old});await assert.rejects(f.client.submit(p),/fehlt oder wurde geändert/);assert.equal(f.claims(),0);}
 const p=payload(2),f=fixture(p,{old:payload(1)});f.cart.items.push(line(payload(1)));await assert.rejects(f.client.submit(p));assert.equal(f.claims(),0);
});
test('discounts may reduce final price; altered base price, currency or foreign preview are rejected',()=>{
 const p=payload(),cart={currency:'EUR',items:[line(p)]};cart.items[0].final_line_price-=100;assert.equal(verifyThemeCartLine(cart,p).quantity,2);
 for(const mutate of [c=>c.currency='USD',c=>c.items[0].original_line_price--,c=>c.items[0].properties._Entwurf='javascript:alert(1)',c=>c.items[0].properties._Entwurf='https://evil.example/image.png']){const c=structuredClone(cart);mutate(c);assert.throws(()=>verifyThemeCartLine(c,p));}
});
test('malformed transfer data cannot enter the cart',()=>{
 const p=payload();for(const mutate of [p=>p.variantId='../cart/clear',p=>p.quantity=0,p=>p.totalCents++,p=>p.properties._gravuru_config='foreign',p=>p.preview.base64='bad',p=>p.paymentConfirmed=true]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateThemeCartPayload(bad));}
});
test('concurrent clicks cannot run two cart writes',async()=>{
 const p=payload(),f=fixture(p);const first=f.client.submit(p);await assert.rejects(f.client.submit(p),/läuft bereits/);await first;assert.equal(f.claims(),1);
});

test('two personalizations of the same product remain separate, editing one preserves the other revision',async()=>{
 const p=payload(3);p.mode='create';p.previousRevision=null;
 const f=fixture(p,{old:payload(1)});const earlier=structuredClone(f.cart.items[1]);
 await f.client.submit(p);assert.equal(f.cart.items.length,3);assert.deepEqual(f.cart.items[1],earlier);assert.equal(f.changes(),0);
 const edit=payload(4);edit.previousRevision=1;const e=fixture(edit,{old:payload(1)}),otherDesign=line(payload(3));e.cart.items.push(otherDesign);
 await e.client.submit(edit);assert.equal(e.changes(),1);assert.deepEqual(e.cart.items.find(l=>l.properties._gravuru_rev==='3'),otherDesign);
 assert.equal(e.cart.items.length,3);assert.ok(!e.cart.items.some(l=>l.properties._gravuru_rev==='1'));
});

test('a ready plate picture replaces the flat engraving preview in the cart; anything else keeps the server preview',async()=>{
 const jpeg=new Blob([new Uint8Array([255,216,255,224,1,2,3])],{type:'image/jpeg'});
 {const p=payload(),f=fixture(p,{expectImage:jpeg});await f.client.submit(p,{image:jpeg});assert.equal(f.cart.items.length,2);}
 for(const bad of [new Blob(['x'],{type:'text/plain'}),new Blob([new Uint8Array(1536*1024+1)],{type:'image/jpeg'}),'x',null]){const p=payload(),f=fixture(p);await f.client.submit(p,{image:bad});assert.equal(f.cart.items.length,2);}
});

// Hosted preview (16.11.2026): the server already made a READY Shopify file, so the
// browser sends only text properties and never uploads or downloads the PNG itself.
const hostedUrl='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'d'.repeat(64)+'.png?v=1700000000';
function hostedPayload(rev=1){const p=payload(rev);delete p.preview;p.properties._gravuru_bild='https://app.example/gestaltung/x.png';p.properties._gravuru_checkout_image=hostedUrl;return p;}
function hostedFixture(p,{old,alter}={}){
 const cart={currency:'EUR',items:[...(old?[{...line(old),properties:{...line(old).properties,_Entwurf:hostedUrl}}]:[])]},bodies=[];
 const fetchImpl=async(url,options)=>{
  if(url==='/de/cart.js')return Response.json(structuredClone(cart));
  if(url==='/de/cart/add.js'){
   assert.equal(typeof options.body,'string');assert.equal(options.headers['Content-Type'],'application/json');bodies.push(options.body);
   const item=JSON.parse(options.body).items[0];assert.equal(item.id,Number(p.variantId));assert.equal(item.quantity,p.quantity);
   const added={...line(p),properties:item.properties};alter?.(added);cart.items.push(added);return Response.json({items:[added]});
  }
  if(url==='/de/cart/change.js'){const body=JSON.parse(options.body);const at=cart.items.findIndex(l=>l.key===body.id);cart.items.splice(at,1);return Response.json(structuredClone(cart));}
  assert.fail(url);
 };
 return {client:createThemeCartClient({fetchImpl,root:'/de/',claim:async()=>{}}),cart,bodies};
}
test('hosted preview: text-only cart write with the server-made Shopify file as _Entwurf',async()=>{
 const p=hostedPayload(),f=hostedFixture(p);const result=await f.client.submit(p,{image:new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'})});
 assert.equal(f.bodies.length,1);assert.ok(f.bodies[0].length<4096);assert.ok(!f.bodies[0].includes('iVBORw0KGgo'));
 const props=JSON.parse(f.bodies[0]).items[0].properties;assert.equal(props._Entwurf,hostedUrl);assert.equal(props.Gravurtext,'Familie Müller');
 assert.equal(result.line.properties._Entwurf,hostedUrl);
});
test('hosted preview: editing replaces only the previous revision',async()=>{
 const p=hostedPayload(2),f=hostedFixture(p,{old:hostedPayload(1)});await f.client.submit(p);
 assert.equal(f.cart.items.length,1);assert.equal(f.cart.items[0].properties._gravuru_rev,'2');
});
test('hosted preview: a different or missing preview in the cart is rejected',async()=>{
 for(const alter of [l=>{l.properties._Entwurf='https://cdn.shopify.com/s/files/1/uploads/other.png';},l=>{delete l.properties._Entwurf;}]){
  const p=hostedPayload(),f=hostedFixture(p,{alter});await assert.rejects(f.client.submit(p),/stimmen nicht überein/);
 }
});
test('hosted preview: no inline PNG requires a valid Shopify file address',()=>{
 for(const bad of [undefined,'','https://evil.example/files/gravuru-gestaltung-'+'d'.repeat(64)+'.png','https://cdn.shopify.com/s/files/1/uploads/x.png','https://cdn.shopify.com/s/files/1/0920/5550/3228/files/other.png','javascript:alert(1)']){
  const p=hostedPayload();if(bad===undefined)delete p.properties._gravuru_checkout_image;else p.properties._gravuru_checkout_image=bad;
  assert.throws(()=>validateThemeCartPayload(p),/Gestaltungsvorschau fehlt/);
 }
 assert.ok(validateThemeCartPayload(hostedPayload()));
 // With an inline PNG the legacy upload path stays in force, even if a checkout image is present.
 const both=hostedPayload();both.preview={type:'image/png',base64:png};assert.ok(validateThemeCartPayload(both));
});

// #265 Stufe A, Teil 4 („take“): Daten und Bestätigung in EINEM Proxy-Abruf. `takeFixture` bildet den Server nach dem
// Protokoll nach: Zeile liegt schon → nicht bestätigen; Bearbeiten ohne genau eine alte Zeile → nicht bestätigen; sonst je
// Angebot genau einmal bestätigen (danach der Fehler der bisherigen claim-Route). `images`: Server mit Kassenbild bei
// Shopify (take:false); `old`: älterer Server, der das Kennzeichen nicht kennt und nur bestätigt.
const ALREADY='Diese Übertragung wurde bereits begonnen. Bitte den Warenkorb prüfen; die Gestaltung wird nicht erneut hinzugefügt.';
const serverImage='https://app.example/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'e'.repeat(64)+'.png';
function textPayload(rev=1){const p=payload(rev);delete p.preview;p.properties._gravuru_bild=serverImage;return p;}
const cartLine=p=>p.preview?line(p):{...line(p),properties:{...p.properties}};
const reported=p=>({config:p.configuration.id,rev:String(p.configuration.rev),offer:p.properties._gravuru_offer});
function otherDesign(rev=1){const p=textPayload(rev),id='konfig_22222222-2222-4222-8222-222222222222';p.configuration.id=p.properties._gravuru_config=id;p.properties._gravuru_offer='9'.repeat(64);return p;}
function takeFixture(p,{items=[],server='take',lost=false,miss=false,answer,onPayload}={}){
 const foreign={key:'77:unrelated',variant_id:77,product_id:7,quantity:3,original_price:100,original_line_price:300,final_line_price:300,properties:{Hinweis:'unverändert'}};
 const cart={currency:'EUR',items:[foreign,...items]},log={calls:[],takes:[],data:0,claims:0,adds:0,changes:0,shown:0};let claimed=false;
 const fetchImpl=async(url,options)=>{
  log.calls.push(url);assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
  if(url==='/de/cart.js')return Response.json(structuredClone(cart));
  if(url==='/de/cart/add.js'){
   log.adds++;let added;
   if(options.body instanceof FormData){assert.ok(p.preview,'Multipart nur mit Vorschaubild');assert.equal(options.body.get('items[0][properties][_Entwurf]').type,'image/png');added=line(p);}
   else{assert.equal(options.headers['Content-Type'],'application/json');const item=JSON.parse(options.body).items[0];assert.equal(item.id,Number(p.variantId));assert.equal(item.quantity,p.quantity);assert.ok(!Object.hasOwn(item.properties,'_Entwurf'));added={...line(p),properties:item.properties};}
   if(!miss)cart.items.push(added);
   if(lost)throw Error('synthetic lost reply');
   return Response.json({items:[added]});
  }
  if(url==='/de/cart/change.js'){log.changes++;const body=JSON.parse(options.body);assert.equal(body.quantity,0);const at=cart.items.findIndex(l=>l.key===body.id);assert.ok(at>=0);cart.items.splice(at,1);return Response.json(structuredClone(cart));}
  assert.fail(url);
 };
 const once=()=>{if(claimed)throw Error(ALREADY);claimed=true;};
 const take=async lines=>{
  log.calls.push('take');log.takes.push(structuredClone(lines));
  if(answer)return answer(lines);
  if(server==='images')return {take:false};
  if(server==='old'){once();return {claimed:true};}
  const own=lines.filter(l=>l.config===p.configuration.id);
  if(own.some(l=>l.offer===p.properties._gravuru_offer))return {payload:structuredClone(p),claimed:false,present:true};
  if(p.mode==='update'&&own.filter(l=>l.rev===String(p.previousRevision)).length!==1)return {payload:structuredClone(p),claimed:false};
  once();return {payload:structuredClone(p),claimed:true};
 };
 const options={fetchImpl,root:'/de/',claim:async()=>{log.calls.push('claim');log.claims++;once();},take,load:async()=>{log.calls.push('data');log.data++;return structuredClone(p);},onPayload:onPayload||(()=>{log.shown++;})};
 return {client:()=>createThemeCartClient(options),cart,log,foreign,claimed:()=>claimed};
}
const adds=f=>f.log.calls.filter(x=>x==='/de/cart/add.js').length;

test('#265 take: one proxy call brings data and confirmation, no data call, exactly one cart write',async()=>{
 // Beide Arten des Einlegens: Multipart mit Vorschaubild und nur Text (Bild am eigenen Server).
 for(const make of [payload,textPayload]){
  const p=make(),other=otherDesign(),f=takeFixture(p,{items:[cartLine(other)]}),before=structuredClone(f.cart.items);
  const r=await f.client().transfer();
  assert.equal(r.cartUrl,'/de/cart');assert.equal(r.paymentConfirmed,false);assert.equal(r.line.properties._gravuru_offer,p.properties._gravuru_offer);
  // Der Warenkorb wird zuerst gelesen; gemeldet werden genau seine Gravuru-Zeilen (hier die einer anderen Gestaltung).
  assert.deepEqual(f.log.calls,['/de/cart.js','take','/de/cart/add.js','/de/cart.js']);
  assert.deepEqual(f.log.takes,[[reported(other)]]);assert.equal(f.log.data,0);assert.equal(f.log.claims,0);assert.equal(f.log.shown,1);
  assert.equal(f.claimed(),true);assert.equal(f.cart.items.length,3);assert.deepEqual(f.cart.items.slice(0,2),before,'fremde und andere Positionen bleiben unverändert');
 }
});
test('#265 take: a line that is already in the cart is only verified – no confirmation, no cart write',async()=>{
 const p=textPayload(),f=takeFixture(p,{items:[cartLine(p)]}),client=f.client();
 const r=await client.transfer();assert.equal(r.line.key,cartLine(p).key);
 assert.deepEqual(f.log.takes,[[reported(p)]]);assert.equal(adds(f),0);assert.equal(f.claimed(),false);assert.equal(f.log.data,0);assert.equal(f.log.claims,0);
 // Ohne Bestätigung fragt derselbe Client beim nächsten Mal wieder den Server (wie bisher: erneut prüfen, nie einlegen).
 await client.transfer();assert.equal(f.log.takes.length,2);assert.equal(adds(f),0);assert.equal(f.claimed(),false);assert.equal(f.cart.items.length,2);
});
test('#265 take: editing reports the previous line, adds once and removes only that line',async()=>{
 for(const make of [payload,textPayload]){
  const p=make(2),old=make(1),f=takeFixture(p,{items:[cartLine(old)]}),foreign=structuredClone(f.foreign);
  await f.client().transfer();
  assert.deepEqual(f.log.takes,[[reported(old)]]);assert.equal(adds(f),1);assert.equal(f.log.changes,1);assert.equal(f.log.data,0);assert.equal(f.log.claims,0);
  assert.equal(f.cart.items.length,2);assert.deepEqual(f.cart.items[0],foreign);assert.equal(f.cart.items[1].properties._gravuru_rev,'2');
  assert.ok(f.log.calls.indexOf('/de/cart/change.js')>f.log.calls.indexOf('/de/cart/add.js'));
 }
});
test('#265 take: editing without exactly one previous line fails as before, unconfirmed and without a cart write',async()=>{
 for(const items of [[],[cartLine(textPayload(3))],[cartLine(textPayload(1)),cartLine(textPayload(1))]]){
  const p=textPayload(2),f=takeFixture(p,{items});
  await assert.rejects(f.client().transfer(),/fehlt oder wurde geändert/);
  assert.equal(f.log.takes.length,1);assert.equal(adds(f),0);assert.equal(f.claimed(),false,'der Server bestätigt nicht');assert.equal(f.log.claims,0);assert.equal(f.cart.items.length,1+items.length);
 }
});
test('#265 take: without the confirmation of exactly this reply nothing enters the cart',async()=>{
 const unconfirmed=/noch nicht bestätigt.*keine zweite Position/;
 // claimed:false ohne vorhandene Zeile, present ohne Zeile im eigenen Warenkorb, claimed nicht genau true.
 for(const [answer,message] of [[p=>({payload:p,claimed:false}),unconfirmed],[p=>({payload:p,claimed:false,present:true}),unconfirmed],[p=>({payload:p}),unconfirmed],[p=>({payload:p,claimed:'true'}),unconfirmed],[p=>({payload:p,claimed:1}),unconfirmed],
   [()=>({}),/unvollständig/],[()=>null,/unvollständig/],[()=>({claimed:false}),/unvollständig/],[()=>({payload:'x',claimed:true}),/unvollständig/],
   // Daten, die der Client nicht annimmt, kommen trotz Bestätigung nie in den Warenkorb.
   [p=>({payload:{...p,totalCents:p.totalCents+1},claimed:true}),/unvollständig/],[p=>({payload:{...p,shopDomain:'evil.example'},claimed:true}),/unvollständig/]]){
  const p=textPayload(),f=takeFixture(p,{answer:()=>answer(structuredClone(p))});
  await assert.rejects(f.client().transfer(),message);assert.equal(adds(f),0);assert.equal(f.cart.items.length,1);assert.equal(f.log.claims,0);assert.equal(f.log.data,0);
 }
 // Die Prüfung der aufrufenden Seite (anderer Shop) läuft vor dem Einlegen.
 const p=textPayload(),f=takeFixture(p,{onPayload:()=>{throw Error('Diese Übergabe gehört zu einem anderen Shop.');}});
 await assert.rejects(f.client().transfer(),/anderen Shop/);assert.equal(adds(f),0);
 // Ein Client ohne die beiden Abrufe des neuen Wegs kann ihn nicht starten; der bisherige Weg bleibt ihm.
 await assert.rejects(createThemeCartClient({fetchImpl:async()=>assert.fail('kein Abruf'),claim:async()=>{}}).transfer(),/Shop-Verbindung ist ungültig/);
});
test('#265 take: repeat click, lost reply and uncertain upload never write twice',async()=>{
 for(const lost of [false,true]){
  const p=textPayload(),f=takeFixture(p,{lost}),client=f.client();await client.transfer();await client.transfer();
  // Nach der Bestätigung fragt derselbe Client den Server nicht erneut; er prüft nur noch den Warenkorb.
  assert.equal(f.log.takes.length,1);assert.equal(adds(f),1);assert.equal(f.cart.items.length,2);
  // Ein neuer Client (Produktseite: je Klick einer) meldet die vorhandene Zeile; der Server bestätigt nicht noch einmal.
  await f.client().transfer();assert.equal(f.log.takes.length,2);assert.deepEqual(f.log.takes[1],[reported(p)]);assert.equal(adds(f),1);
 }
 const p=textPayload(),f=takeFixture(p,{lost:true,miss:true}),client=f.client();
 await assert.rejects(client.transfer(),/synthetic lost reply/);
 await assert.rejects(client.transfer(),/noch nicht bestätigt.*keine zweite Position/);assert.equal(f.log.takes.length,1);assert.equal(adds(f),1);
 // Neuer Client, Zeile fehlt: Die dauerhafte Sperre des Servers lehnt ab (wie bisher der zweite claim).
 await assert.rejects(f.client().transfer(),/bereits begonnen/);assert.equal(adds(f),1);assert.equal(f.cart.items.length,1);
});
test('#265 take: concurrent clicks cannot run two transfers',async()=>{
 const p=textPayload(),f=takeFixture(p),client=f.client();const first=client.transfer();
 await assert.rejects(client.transfer(),/läuft bereits/);await assert.rejects(client.submit(p),/läuft bereits/);await first;assert.equal(f.log.takes.length,1);assert.equal(adds(f),1);
});
test('#265 take:false (server with checkout image at Shopify): the complete previous way – data, then claim',async()=>{
 const p=payload(),f=takeFixture(p,{server:'images'}),client=f.client();await client.transfer();
 assert.deepEqual(f.log.calls,['/de/cart.js','take','data','/de/cart.js','claim','/de/cart/add.js','/de/cart.js']);
 assert.deepEqual(f.log.takes,[[]]);assert.equal(f.log.data,1);assert.equal(f.log.claims,1);assert.equal(f.log.shown,1);assert.equal(f.cart.items.length,2);
 await client.transfer();assert.equal(f.log.claims,1);assert.equal(adds(f),1);
 // Bearbeiten ohne alte Zeile: wie bisher Fehler vor dem claim.
 const edit=payload(2),e=takeFixture(edit,{server:'images'});await assert.rejects(e.client().transfer(),/fehlt oder wurde geändert/);assert.equal(e.log.claims,0);assert.equal(e.claimed(),false);
});
test('#265 take: an older server only confirms – data is fetched afterwards, exactly one cart write, never a second',async()=>{
 const p=textPayload(),f=takeFixture(p,{server:'old'}),client=f.client();await client.transfer();
 assert.deepEqual(f.log.calls,['/de/cart.js','take','data','/de/cart/add.js','/de/cart.js']);assert.equal(f.log.claims,0,'kein zweiter claim-Abruf');assert.equal(f.log.shown,1);assert.equal(f.cart.items.length,2);
 // Zweiter Versuch im selben Client: nur Prüfung des Warenkorbs. Neuer Client: Der ältere Server lehnt den zweiten claim ab.
 await client.transfer();assert.equal(f.log.takes.length,1);assert.equal(adds(f),1);
 await assert.rejects(f.client().transfer(),/bereits begonnen/);assert.equal(adds(f),1);assert.equal(f.cart.items.length,2);
 // Unklare Übertragung beim älteren Server: kein zweites Einlegen, weder im selben noch in einem neuen Client.
 const u=takeFixture(p,{server:'old',lost:true,miss:true}),same=u.client();
 await assert.rejects(same.transfer());await assert.rejects(same.transfer(),/keine zweite Position/);await assert.rejects(u.client().transfer(),/bereits begonnen/);assert.equal(adds(u),1);assert.equal(u.log.data,1);
});
test('#265 take: a cart that cannot be reported completely takes the previous way instead of a shortened list',async()=>{
 const other=otherDesign();
 // Gravuru-Zeile ohne gültiges Angebot bzw. ohne gültigen Stand, und mehr Zeilen, als in 16 KB passen.
 const broken=[{...cartLine(other),properties:{_gravuru_config:other.configuration.id,_gravuru_rev:'1'}},{...cartLine(other),properties:{...other.properties,_gravuru_rev:1}},{...cartLine(other),properties:{...other.properties,_gravuru_offer:'x'}}];
 const many=Array.from({length:116},(_,i)=>({...cartLine(other),key:'many:'+i}));
 for(const items of [[broken[0]],[broken[1]],[broken[2]],many]){
  const p=textPayload(),f=takeFixture(p,{items});await f.client().transfer();
  assert.equal(f.log.takes.length,0,'kein take mit unvollständiger Liste');assert.equal(f.log.data,1);assert.equal(f.log.claims,1);assert.equal(adds(f),1);
 }
 const cart=items=>({currency:'EUR',items});
 assert.deepEqual(themeCartLines(cart([])),[]);
 assert.deepEqual(themeCartLines(cart([{key:'a',quantity:1,properties:null},{key:'b',quantity:1},{key:'c',quantity:1,properties:{_gravuru_config:'fremd',_gravuru_rev:'x'}},cartLine(other)])),[reported(other)],'nur Zeilen mit gültiger Konfigurationskennung');
 assert.equal(themeCartLines(cart(many.slice(0,115))).length,115);assert.ok(JSON.stringify({lines:themeCartLines(cart(many.slice(0,115)))}).length<=16*1024);
 assert.equal(themeCartLines(cart(many)),null);for(const line of broken)assert.equal(themeCartLines(cart([line])),null);
 assert.throws(()=>themeCartLines({currency:'USD',items:[]}),/Euro/);
});
