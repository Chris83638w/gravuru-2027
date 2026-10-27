import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopEntryClient,mapWorkshopPath,shopUrl} from './ui/shop-entry-client.mjs';

const token='gse1.'+Buffer.from('{"v":1}').toString('base64url')+'.'+'a'.repeat(43);
const sha='f'.repeat(64),konfig='konfig_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),adraft='adraft_'+'2'.repeat(8)+'-2222-2222-2222-'+'2'.repeat(12);

test('editor paths of both store flavours map to the narrow customer routes; everything else is refused',()=>{
 for(const prefix of ['/api/workshop/','/api/workshop/acryl/']){
  assert.equal(mapWorkshopPath(prefix+'acrylic-drafts'),'/api/shop-entry/acrylic-drafts');
  assert.equal(mapWorkshopPath(prefix+'acrylic-drafts/'+adraft),'/api/shop-entry/acrylic-drafts/'+adraft);
  assert.equal(mapWorkshopPath(prefix+'design-assets/'+sha+'/preview.svg'),'/api/shop-entry/design-assets/'+sha+'/preview.svg');
  assert.equal(mapWorkshopPath(prefix+'cart-configurations/'+konfig+'/3/photos/foto-1?edited=1'),'/api/shop-entry/cart-configurations/'+konfig+'/3/photos/foto-1?edited=1');
 }
 for(const bad of ['/api/workshop/session','/api/workshop/products','/api/workshop/merchant-test-cart','/api/workshop/design-assets/'+sha+'/original','/api/workshop/customer-drafts','/api/shop-entry/cart','/api/workshop/acrylic-drafts/draft_x','/api/workshop/cart-configurations/'+konfig+'/0',42,undefined])assert.throws(()=>mapWorkshopPath(bad));
});
test('return address stays inside the shop',()=>{
 assert.equal(shopUrl('gravuru-design.myshopify.com','/products/tuerschild?variant=1'),'https://gravuru-design.myshopify.com/products/tuerschild?variant=1');
 for(const bad of [null,'','//evil.example/x','https://evil.example/','/\\evil.example','javascript:alert(1)'])assert.equal(shopUrl('gravuru-design.myshopify.com',bad),'https://gravuru-design.myshopify.com/');
});
test('client sends the session only as a header, validates the model answer and the cart result',async()=>{
 const calls=[];
 const fetchImpl=async(url,options={})=>{
  calls.push({url,options});
  if(url==='/api/shop-entry/model')return Response.json({model:{key:'acryl',name:'Test',configuration:{id:'cfg_x',revision:3},universal:{profile:{designs:[{objects:[{photoMaskAssetId:sha}]}]},localResources:{}},legacy:{}},editorPath:'/_merchant-acryl-editor.html',shopDomain:'gravuru-design.myshopify.com',binding:{}});
  if(url.startsWith('/api/shop-entry/design-assets/'))return new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}});
  if(url==='/api/shop-entry/cart')return Response.json({cartId:'gid://shopify/Cart/x',checkoutUrl:'https://gravuru-design.myshopify.com/checkouts/cn/x',totalCents:1148,paymentConfirmed:false});
  return Response.json({error:{message:'nein'}},{status:404});
 };
 const client=createShopEntryClient({token,fetchImpl});
 const data=await client.loadModel();assert.equal(data.editorPath,'/_merchant-acryl-editor.html');
 const resources=await client.loadResources(data.model.universal,async blob=>'data:image/svg+xml;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64'));
 assert.deepEqual(Object.keys(resources).sort(),['/api/workshop/acryl/design-assets/'+sha+'/preview.svg','/api/workshop/design-assets/'+sha+'/preview.svg']);
 const result=await client.submitCart({draftId:adraft,expectedRevision:1,quantity:1},{draftToken:'b'.repeat(64)});assert.equal(result.totalCents,1148);
 for(const call of calls){assert.equal(call.options.headers['X-Gravuru-Shop-Session'],token);assert.equal(call.options.credentials,'omit');assert.ok(!call.url.includes(token));}
 await assert.rejects(client.submitCart({},{draftToken:'short'}),/Entwurfszugang/);
 await assert.rejects(client.request('/api/workshop/session'),/gehört nicht/);
 assert.throws(()=>createShopEntryClient({token:'',fetchImpl}),/Jetzt personalisieren/);
 const wrong=createShopEntryClient({token,fetchImpl:async()=>Response.json({model:{key:'form'},editorPath:'/_merchant-form-editor.html',shopDomain:'gravuru-design.myshopify.com'})});
 await assert.rejects(wrong.loadModel(),/nicht vorbereitet/);
 const foreign=createShopEntryClient({token,fetchImpl:async()=>Response.json({cartId:'gid://shopify/Cart/x',checkoutUrl:'https://evil.example/',totalCents:1,paymentConfirmed:false})});
 await assert.rejects(foreign.submitCart({},{draftToken:'b'.repeat(64)}),/nicht bestätigt/);
});

test('normal-cart preparation uses private headers and never treats a prepared URL as a confirmed payment',async()=>{
 const calls=[],response={mode:'theme',handoffUrl:'https://gravuru-design.myshopify.com/apps/konfigurator/cart#handoff='+'c'.repeat(64),totalCents:1499,paymentConfirmed:false};
 const c=createShopEntryClient({token,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json(response);}});
 const input={draftId:adraft,expectedRevision:3,quantity:1,configId:konfig,cartLineId:'theme',cartRevision:1};
 assert.deepEqual(await c.submitThemeCart(input,{draftToken:'b'.repeat(64)}),response);
 assert.equal(calls[0].url,'/api/shop-entry/theme-cart');assert.equal(calls[0].options.headers['X-Gravuru-Shop-Session'],token);assert.equal(calls[0].options.headers['X-Gravuru-Draft'],'b'.repeat(64));
 assert.deepEqual(JSON.parse(calls[0].options.body),input);assert.equal(calls[0].options.credentials,'omit');
 await assert.rejects(c.submitThemeCart(input,{draftToken:'bad'}));
 response.paymentConfirmed=true;await assert.rejects(c.submitThemeCart(input,{draftToken:'b'.repeat(64)}),/nicht vorbereitet/);
});

test('all three format resources load privately in bounded parallel batches',async()=>{
 const urls=Array.from({length:19},(_,i)=>'/api/workshop/design-assets/'+i.toString(16).padStart(64,'0')+'/preview.svg');
 let active=0,peak=0;const seen=[];
 const c=createShopEntryClient({token,fetchImpl:async(url,options)=>{
  active++;peak=Math.max(peak,active);seen.push(url);
  assert.equal(options.headers['X-Gravuru-Shop-Session'],token);assert.equal(options.credentials,'omit');
  await new Promise(resolve=>setTimeout(resolve,2));active--;return new Response('<svg/>');
 }});
 const model={profile:{designs:[]},doorbell:{formats:urls.map(url=>({profile:{resourceUrl:url}}))},localResources:{duplicate:urls[0]}};
 const resources=await c.loadResources(model,async()=> 'data:image/svg+xml;base64,PHN2Zy8+');
 assert.equal(seen.length,19);assert.equal(new Set(seen).size,19);assert.ok(peak>1&&peak<=6);
 for(const url of urls){assert.ok(resources[url]);assert.equal(resources[url],resources[url.replace('/api/workshop/','/api/workshop/acryl/')]);}
});

test('a failed private resource refuses the configurator before any cart can be offered',async()=>{
 const c=createShopEntryClient({token,fetchImpl:async()=>new Response('',{status:404})});
 await assert.rejects(c.loadResources({profile:{designs:[]},localResources:{url:'/api/workshop/design-assets/'+sha+'/preview.svg'}},async()=>''),/Designgrafik/);
});

