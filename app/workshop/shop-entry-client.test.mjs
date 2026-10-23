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
