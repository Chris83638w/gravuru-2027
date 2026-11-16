import test from 'node:test';
import assert from 'node:assert/strict';
import {createThemeCartClient,verifyThemeCartLine,validateThemeCartPayload} from './ui/theme-cart-client.mjs';
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
