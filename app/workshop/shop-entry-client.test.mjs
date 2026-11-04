import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createShopEntryClient,mapWorkshopPath,shopUrl} from './ui/shop-entry-client.mjs';

const token='gse1.'+Buffer.from('{"v":1}').toString('base64url')+'.'+'a'.repeat(43);
const sha='f'.repeat(64),konfig='konfig_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),adraft='adraft_'+'2'.repeat(8)+'-2222-2222-2222-'+'2'.repeat(12);

test('editor paths of both store flavours map to the narrow customer routes; everything else is refused',()=>{
 for(const prefix of ['/api/workshop/','/api/workshop/acryl/']){
  assert.equal(mapWorkshopPath(prefix+'acrylic-drafts'),'/api/shop-entry/acrylic-drafts');
  assert.equal(mapWorkshopPath(prefix+'customer-vector-logo/preview'),'/api/shop-entry/customer-vector-logo/preview');
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

test('product gallery uses private session headers and keeps signed choices out of URLs',async()=>{
 const calls=[],target='sgt1.synthetic.signature';
 const client=createShopEntryClient({token,fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith('design-gallery-preview')?new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}):Response.json({items:[],token:'gse1.new.signature'});}});
 await client.loadDesignGallery(2);assert.equal(await (await client.loadDesignPreview(target)).text(),'<svg/>');await client.switchDesign(target);
 assert.deepEqual(calls.map(c=>c.url),['/api/shop-entry/design-gallery?page=2','/api/shop-entry/design-gallery-preview','/api/shop-entry/design-switch']);
 for(const {url,options} of calls){assert.equal(options.headers['X-Gravuru-Shop-Session'],token);assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.ok(!url.includes(target));}
 for(const c of calls.slice(1)){assert.equal(c.options.method,'POST');assert.deepEqual(JSON.parse(c.options.body),{target});}
 await assert.rejects(client.loadDesignGallery(-1));await assert.rejects(client.switchDesign(null));
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


test('embedded cart hands only the one-time token to the exact shop origin and surfaces its error answer',async()=>{
 const {embeddedCart}=await import('./ui/shop-entry-client.mjs');
 const shop='https://gravuru-design.myshopify.com',token='a'.repeat(64),sent=[],listeners=new Set();
 const target={postMessage:(data,origin)=>sent.push({data,origin})};
 const listen={addEventListener:(t,fn)=>listeners.add(fn),removeEventListener:(t,fn)=>listeners.delete(fn)};
 const submit=async()=>({mode:'theme',handoffUrl:shop+'/apps/konfigurator/cart#handoff='+token});
 const cart=embeddedCart(submit,shop,{target,listen});
 const pending=cart({draftId:'x'},{draftToken:'b'.repeat(64)});
 await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(sent,[{data:{type:'gravuru-shop-handoff',token},origin:shop}]);
 let settled=false;pending.then(()=>{settled=true;},()=>{settled=true;});
 // Fremde Herkunft, fremde Quelle oder anderes Token werden ignoriert.
 for(const fn of listeners){fn({origin:'https://evil.example',source:target,data:{type:'gravuru-shop-handoff-result',token,ok:false,message:'x'}});fn({origin:shop,source:{},data:{type:'gravuru-shop-handoff-result',token,ok:false,message:'x'}});fn({origin:shop,source:target,data:{type:'gravuru-shop-handoff-result',token:'c'.repeat(64),ok:false,message:'x'}});}
 await new Promise(r=>setTimeout(r,0));assert.equal(settled,false);
 for(const fn of [...listeners])fn({origin:shop,source:target,data:{type:'gravuru-shop-handoff-result',token,ok:false,message:'Warenkorb geändert'}});
 await assert.rejects(pending,/Warenkorb geändert/);assert.equal(listeners.size,0);
 await assert.rejects(embeddedCart(async()=>({handoffUrl:shop+'/apps/konfigurator/cart'}),shop,{target,listen})({}),/nicht vorbereitet/);
 assert.throws(()=>embeddedCart(submit,'https://evil.example'),/ungültig/);
});
test('embedded cart sends the plate picture along with the token; a failing picture never blocks the cart',async()=>{
 const {embeddedCart}=await import('./ui/shop-entry-client.mjs');
 const shop='https://gravuru-design.myshopify.com',token='d'.repeat(64),sent=[];
 const target={postMessage:(data,origin)=>sent.push({data,origin})},listen={addEventListener(){},removeEventListener(){}};
 const submit=async()=>({mode:'theme',handoffUrl:shop+'/apps/konfigurator/cart#handoff='+token});
 const picture=new Blob([new Uint8Array(4)],{type:'image/jpeg'});
 embeddedCart(submit,shop,{target,listen,image:async()=>picture})({});
 embeddedCart(submit,shop,{target,listen,image:async()=>{throw Error('kein Bild');}})({});
 embeddedCart(submit,shop,{target,listen,image:()=>'kein Blob'})({});
 await new Promise(r=>setTimeout(r,5));
 assert.equal(sent.length,3);const withPicture=sent.filter(s=>s.data.cartImage);
 assert.equal(withPicture.length,1);assert.equal(withPicture[0].data.cartImage,picture);
 for(const s of sent.filter(s=>!s.data.cartImage))assert.deepEqual(s.data,{type:'gravuru-shop-handoff',token});
});
test('cart picture swaps only the known material image for its small copy and needs a valid view box',async()=>{
 const {cartPreviewSvg,viewBoxSize}=await import('./ui/shop-entry-client.mjs');
 const surface='data:image/png;base64,'+'A'.repeat(40),small='data:image/jpeg;base64,BBBB';
 const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4.2 -4.2 128.4 88.4"><image href="'+surface+'"/><image href="data:image/png;base64,CCCC"/></svg>';
 const out=cartPreviewSvg(svg,surface,small);
 assert.ok(out.includes('href="'+small+'"'));assert.ok(!out.includes(surface));assert.ok(out.includes('data:image/png;base64,CCCC'));
 assert.equal(cartPreviewSvg(svg,surface,null),svg);assert.equal(cartPreviewSvg(svg,surface,'javascript:x'),svg);assert.equal(cartPreviewSvg('<html>',surface,small),null);
 assert.deepEqual(viewBoxSize(svg),{width:128.4,height:88.4});assert.equal(viewBoxSize('<svg viewBox="0 0 0 5">'),null);assert.equal(viewBoxSize('<svg>'),null);
});

test('shop embed accepts messages only from the editor host and this frame, and only rewrites the own start link',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-embed-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,'shop-embed.mjs'),source);fs.copyFileSync(new URL('./ui/theme-cart-client.mjs',import.meta.url),path.join(dir,'theme-cart-client.mjs'));
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;
 const savedLocation=globalThis.location;globalThis.location={href:'https://gravuru-design.myshopify.com/products/x',origin:'https://gravuru-design.myshopify.com'};
 t.after(()=>{globalThis.location=savedLocation;delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const {acceptedMessage,startUrl}=await import(pathToFileURL(path.join(dir,'shop-embed.mjs')).href);
 const frame={contentWindow:{}},token='f'.repeat(64);
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-handoff',token}},frame),{type:'handoff',token,image:null});
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-editor-ready'}},frame),{type:'ready'});
 for(const event of [{origin:'https://foreign.example',source:frame.contentWindow},{origin:'https://app.example',source:{}}])assert.equal(acceptedMessage({...event,data:{type:'gravuru-shop-editor-ready'}},frame),null);
 // Warenkorbbild: nur JPEG/PNG bis 1,5 MB, sonst still verworfen (dann gilt die Gravurvorschau des Servers).
 const jpeg=new Blob([new Uint8Array(10)],{type:'image/jpeg'});
 assert.equal(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-handoff',token,cartImage:jpeg}},frame).image,jpeg);
 for(const bad of [new Blob(['<svg/>'],{type:'image/svg+xml'}),new Blob([],{type:'image/png'}),new Blob([new Uint8Array(1536*1024+1)],{type:'image/jpeg'}),'data:image/png;base64,AAAA'])
  assert.equal(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-handoff',token,cartImage:bad}},frame).image,null);
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-close'}},frame),{type:'close'});
 assert.equal(acceptedMessage({origin:'https://evil.example',source:frame.contentWindow,data:{type:'gravuru-shop-close'}},frame),null);
 assert.equal(acceptedMessage({origin:'https://app.example',source:{},data:{type:'gravuru-shop-close'}},frame),null);
 assert.equal(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-handoff',token:'x'}},frame),null);
 assert.equal(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-close'}},null),null);
 assert.equal(startUrl({href:'/apps/konfigurator/start?product=1&variant=2&back=%2Fproducts%2Fx'}),'https://gravuru-design.myshopify.com/apps/konfigurator/start?product=1&variant=2&back=%2Fproducts%2Fx&embed=1');
 assert.equal(startUrl({href:'https://evil.example/apps/konfigurator/start?product=1'}),null);
 assert.equal(startUrl({href:'/apps/other/start?product=1'}),null);
 const preview='https://test-92055503228.shopifypreview.com';
 globalThis.location={href:preview+'/products_preview?preview_key=test',origin:preview};
 assert.equal(startUrl({href:'/apps/konfigurator/start?product=1&variant=2'}),null,'Entwurf öffnet den normalen Seitenlink, kein gesperrtes iframe');
 globalThis.location={href:'https://gravuru-design.myshopify.com/products/x',origin:'https://gravuru-design.myshopify.com'};
 assert.match(startUrl({href:'/apps/konfigurator/start?product=1&variant=2'}),/&embed=1$/,'Der normale Shop behält die Einbettung');
});

test('global shop embed: product data from the theme block, own start link, buy buttons of exactly this product hidden',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-embed-global-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,'shop-embed.mjs'),source);fs.copyFileSync(new URL('./ui/theme-cart-client.mjs',import.meta.url),path.join(dir,'theme-cart-client.mjs'));
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;t.after(()=>{delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const {pageConfig,startHref,productForms,prepareProductPage}=await import(pathToFileURL(path.join(dir,'shop-embed.mjs')).href);
 // Kleine Seiten-Nachbildung: nur was die Funktionen brauchen.
 const el=(tag,attrs={},children=[])=>{const node={tag,attrs:{...attrs},children,parent:null,style:{},textContent:attrs.text||'',
  setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}},
  after(n){const list=this.parent.children;n.parent=this.parent;list.splice(list.indexOf(this)+1,0,n);},
  closest(sel){let n=this;while(n){if(sel.includes('sticky')&&/sticky/.test(n.attrs.class||''))return n;n=n.parent;}return null;},
  get value(){return this.attrs.value;},set href(v){this.attrs.href=v;},get href(){return this.attrs.href;},set className(v){this.attrs.class=v;},set rel(v){this.attrs.rel=v;}};
  for(const c of children)c.parent=node;return node;};
 const all=n=>[n,...n.children.flatMap(all)];
 const match=(n,sel)=>sel.split(',').some(s=>{s=s.trim();
  if(s==='form[action*="/cart/add"]')return n.tag==='form'&&(n.attrs.action||'').includes('/cart/add');
  if(s==='[name="id"]')return n.attrs.name==='id';if(s==='[type="submit"]')return n.attrs.type==='submit';if(s==='[name="add"]')return n.attrs.name==='add';
  if(s==='.shopify-payment-button')return (n.attrs.class||'').includes('shopify-payment-button');if(s==='.product__block--quantity_selector')return (n.attrs.class||'').includes('product__block--quantity_selector');
  if(s==='[name="quantity"]')return n.attrs.name==='quantity';if(s==='[name="quantity"][form]')return n.attrs.name==='quantity'&&!!n.attrs.form;if(s==='[data-gravuru-personalisieren]')return 'data-gravuru-personalisieren' in n.attrs;return false;});
 const addQuery=n=>{n.querySelectorAll=sel=>all(n).slice(1).filter(x=>match(x,sel));n.querySelector=sel=>n.querySelectorAll(sel)[0]||null;n.children.forEach(addQuery);return n;};
 const form=(variant,cls='')=>el('form',{action:'/cart/add',class:cls},[el('input',{name:'id',value:variant}),el('button',{type:'submit',name:'add'}),el('div',{class:'shopify-payment-button'}),el('input',{name:'quantity',value:'1'})]);
 const qtyBlock=el('div',{class:'product__block product__block--quantity_selector'}),qtyOther=el('input',{name:'quantity',form:'fremd'});
 const main=form('11'),sticky=el('div',{class:'sticky-atc'},[form('11')]),other=form('99');
 const installment=el('form',{action:'/cart/add',class:'installment'},[el('input',{name:'id',value:'11'})]);
 const body=el('body',{},[el('script',{id:'gravuru-konfi',text:JSON.stringify({productId:5,variantId:12,variants:[11,12,'x'],back:'/products/schild'})}),installment,qtyBlock,qtyOther,sticky,main,other]);
 const doc={body,getElementById:id=>all(body).find(n=>n.attrs.id===id)||null,createElement:tag=>addQuery(el(tag))};
 addQuery(body);doc.querySelectorAll=body.querySelectorAll;doc.querySelector=body.querySelector;
 const config=pageConfig(doc);
 assert.deepEqual(config,{productId:'5',variantId:'12',variants:['11','12'],back:'/products/schild'});
 assert.equal(startHref(config),'/apps/konfigurator/start?product=5&variant=12&back=%2Fproducts%2Fschild');
 assert.equal(startHref(config,'99'),'/apps/konfigurator/start?product=5&variant=12&back=%2Fproducts%2Fschild','fremde Variante nie übernommen');
 assert.deepEqual(productForms(config,doc),[installment,sticky.children[0],main]);
 const box=prepareProductPage(config,doc);
 assert.ok(box&&'data-gravuru-personalisieren' in box.attrs);
 assert.equal(body.children[body.children.indexOf(main)+1],box,'Knopf direkt nach dem Hauptformular, nicht in der Kaufleiste');
 assert.equal(box.children[0].href,'/apps/konfigurator/start?product=5&variant=11&back=%2Fproducts%2Fschild','aktuell gewählte Variante');
 for(const f of [main,sticky.children[0]])for(const n of f.children.slice(1))assert.ok('data-gravuru-hidden-buy' in n.attrs);
 for(const n of other.children)assert.ok(!('data-gravuru-hidden-buy' in n.attrs),'Kaufknöpfe anderer Produkte bleiben');
 assert.ok('data-gravuru-hidden-buy' in qtyBlock.attrs,'Mengen-Block des Themes ausgeblendet');assert.ok(!('data-gravuru-hidden-buy' in qtyOther.attrs),'Mengenfeld eines fremden Formulars bleibt');
 assert.equal(prepareProductPage(config,doc),null,'kein zweiter Knopf');
 // Ohne/mit kaputten Daten: nichts tun.
 for(const text of ['','{',JSON.stringify({productId:'x',variants:[1]}),JSON.stringify({productId:5,variants:[]}),JSON.stringify({productId:5,variants:[1],back:'//evil.example'})]){
  const d={getElementById:()=>({textContent:text})};const c=pageConfig(d);
  if(text.includes('evil'))assert.equal(c.back,'/');else assert.equal(c,null);
 }
 assert.equal(pageConfig({getElementById:()=>null}),null);
});

test('warm-up: targets come only from the page hint for the token store; editor page, then its hashed bundle, all low priority',async()=>{
 const {warmTargets,warmEditor}=await import('./ui/shop-entry-client.mjs');
 const token=st=>'gse1.'+Buffer.from(JSON.stringify({v:1,st})).toString('base64url')+'.sig';
 const doc=content=>({querySelector:sel=>sel==='meta[name="gravuru-warm"]'&&content!==null?{getAttribute:()=>content}:null});
 const hint=JSON.stringify({acryl:['/_merchant-acryl-editor.html','/_acryl-runtime/lazy/katalog-kern.json'],legacy:['/_merchant-editor.html','https://evil.example/x','//evil.example/x','/a/../b',5]});
 assert.deepEqual(warmTargets(doc(hint),token('acryl')),['/_merchant-acryl-editor.html','/_acryl-runtime/lazy/katalog-kern.json']);
 assert.deepEqual(warmTargets(doc(hint),token('legacy')),['/_merchant-editor.html'],'nur eigene absolute Pfade');
 for(const bad of [token('fremd'),'gse1.%%%.x','',null])assert.deepEqual(warmTargets(doc(hint),bad),[]);
 assert.deepEqual(warmTargets(doc(null),token('acryl')),[]);assert.deepEqual(warmTargets(doc('{'),token('acryl')),[]);
 const calls=[];const html='<script type="module" src="/_acryl-bundle/editor-0123456789abcdef.mjs"></script><link href="/_acryl-bundle/editor-0123456789abcdef.mjs">';
 const fetchImpl=async(url,options)=>{calls.push([url,options.priority,options.credentials]);if(url.endsWith('katalog-kern.json'))throw Error('offline');return {ok:true,text:async()=>html};};
 warmEditor(['/_merchant-acryl-editor.html','/_acryl-runtime/lazy/katalog-kern.json'],{fetchImpl});
 await new Promise(resolve=>setTimeout(resolve,10));
 assert.deepEqual(calls,[['/_merchant-acryl-editor.html','low','same-origin'],['/_acryl-runtime/lazy/katalog-kern.json','low','same-origin'],['/_acryl-bundle/editor-0123456789abcdef.mjs','low','same-origin']],'Paket einmal, Fehler still');
 const failed=[];warmEditor(['/_merchant-acryl-editor.html'],{fetchImpl:async url=>{failed.push(url);return {ok:false,text:async()=>html};}});
 await new Promise(resolve=>setTimeout(resolve,10));assert.deepEqual(failed,['/_merchant-acryl-editor.html'],'Fehlerantwort: kein Paketabruf');
});
test('shop embed opens a connection to the editor host once, only on intent toward the own start link',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-embed-intent-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,'shop-embed.mjs'),source);fs.copyFileSync(new URL('./ui/theme-cart-client.mjs',import.meta.url),path.join(dir,'theme-cart-client.mjs'));
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;t.after(()=>{delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const {connectOnIntent}=await import(pathToFileURL(path.join(dir,'shop-embed.mjs')).href);
 const listeners=[],head=[];const doc={addEventListener:(type,fn,options)=>listeners.push([type,options]),createElement:tag=>({tag}),head:{append:n=>head.push(n)}};
 const handler=connectOnIntent(doc);
 assert.deepEqual(listeners.map(([type])=>type),['pointerover','focusin','touchstart']);assert.ok(listeners.every(([,o])=>o.passive&&o.capture));
 const on=sel=>({target:{closest:s=>s===sel?{}:null}});
 handler(on('irgendwas'));handler({target:null});assert.equal(head.length,0,'fremde Elemente: nichts');
 handler(on('[data-gravuru-personalisieren] a[data-gravuru-start]'));handler(on('[data-gravuru-personalisieren] a[data-gravuru-start]'));
 assert.deepEqual(head,[{tag:'link',rel:'preconnect',href:'https://app.example'}],'genau ein Verbindungshinweis');
});

test('start resources: catalog fonts and library motifs of the start designs at the editor addresses; doorbell only its start design',async()=>{
 const {startResourceUrls,warmEditor}=await import('./ui/shop-entry-client.mjs');
 const catalog={motifs:{grund:'<g/>'},font_index:[{name:'Cinzel',file:'cinzel.json'},{name:'Raleway',file:'raleway.json'},{name:'Eigen',file:'eigen.json'},{name:'Böse',file:'a b.json'}],motif_index:[{key:'herz'},{key:'grund'},{key:'stern'}]};
 const universal={profile:{defaultDesignId:'d2',designs:[{id:'d1',objects:[{type:'text',font:'Cinzel'},{type:'motif',motif:'herz'},{type:'motif',motif:'grund'},{type:'motif',motif:'../x'}]},{id:'d2',objects:[{type:'text',font:'Raleway'},{type:'text',font:'Eigen'},{type:'text',font:'Unbekannt'},{type:'text',font:'Böse'},{type:'motif',motif:'stern'}]}]},localResources:{fonts:{Eigen:{}},motifs:[{key:'stern'}]}};
 const path='/_acryl-runtime/lazy/katalog-kern.json';
 assert.deepEqual(startResourceUrls(universal,catalog,path),['/_acryl-runtime/lazy/schriften/cinzel.json','/_acryl-runtime/lazy/motive/herz.json','/_acryl-runtime/lazy/schriften/raleway.json'],'Böse (kein Slug, nicht zwischenspeicherbar) nicht vorab');
 assert.deepEqual(startResourceUrls({...universal,doorbell:{}},catalog,path),['/_acryl-runtime/lazy/schriften/raleway.json'],'Funkklingel: nur Startdesign');
 // Gleiche Adressen wie der Editor (lazyUrls) – sonst kein Treffer im Zwischenspeicher.
 const {lazyUrls}=await import('../configurator/variant-m/lazy-resources-model.mjs');
 assert.deepEqual(lazyUrls({fonts:['Cinzel','Raleway'],motifs:['herz']},{fontIndex:catalog.font_index,motifIndex:catalog.motif_index},'/_acryl-runtime/lazy/'),{fonts:[{name:'Cinzel',url:'/_acryl-runtime/lazy/schriften/cinzel.json'},{name:'Raleway',url:'/_acryl-runtime/lazy/schriften/raleway.json'}],motifs:[{key:'herz',url:'/_acryl-runtime/lazy/motive/herz.json'}]});
 const {acrylCacheControl}=await import('./acryl-employee-host.mjs');
 for(const url of startResourceUrls(universal,catalog,path))assert.equal(acrylCacheControl(url,200),'public, max-age=3600',url);
 assert.deepEqual(startResourceUrls(universal,null,path),[]);assert.deepEqual(startResourceUrls(universal,catalog,'/x.json'),[]);
 const warm=warmEditor(['/_merchant-acryl-editor.html',path],{fetchImpl:async url=>({ok:true,text:async()=>'',json:async()=>url===path?catalog:null})});
 assert.equal(warm.catalogPath,path);assert.deepEqual(await warm.catalog,catalog);
 assert.equal(await warmEditor([]).catalog,null);
 const own='/konfigurator/shop/schriften/'+'a'.repeat(64)+'.json';
 const deferred={...universal,localResources:{...universal.localResources,lazyFonts:[{name:'Cinzel',url:own},{name:'Unbekannt',url:'https://foreign.example/font.json'}]}};
 assert.deepEqual(startResourceUrls(deferred,null,null),[own],'product font warms before the catalog, never a foreign URL');
 assert.deepEqual(startResourceUrls(deferred,catalog,path),[own,'/_acryl-runtime/lazy/motive/herz.json','/_acryl-runtime/lazy/schriften/raleway.json'],'own font wins over a same-named catalog font');
});
test('start ticket: fetched once per start address through the proxy, only editor-host addresses, dropped before expiry or on failure',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-embed-ticket-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,'shop-embed.mjs'),source);fs.copyFileSync(new URL('./ui/theme-cart-client.mjs',import.meta.url),path.join(dir,'theme-cart-client.mjs'));
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;t.after(()=>{delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const {createStartTickets}=await import(pathToFileURL(path.join(dir,'shop-embed.mjs')).href);
 let time=Date.parse('2026-10-28T10:00:00Z');const calls=[];let answer=()=>({ok:true,json:async()=>({url:'https://app.example/konfigurator/shop/#s=gse1.x&embed=1',expiresAt:'2026-10-28T14:00:00.000Z'})});
 const tickets=createStartTickets({fetchImpl:async(url,options)=>{calls.push([url,options.credentials,options.cache]);return answer();},now:()=>time});
 const key='https://shop.example/apps/konfigurator/start?product=5&variant=11&embed=1';
 assert.equal(tickets.get(key),null);
 const [a,b]=await Promise.all([tickets.load(key),tickets.load(key)]);
 assert.equal(a,'https://app.example/konfigurator/shop/#s=gse1.x&embed=1');assert.equal(b,a);
 assert.deepEqual(calls,[['https://shop.example/apps/konfigurator/start?product=5&variant=11&embed=1&format=json','same-origin','no-store']],'einmal, über den App-Proxy');
 assert.equal(tickets.get(key),a);assert.equal(await tickets.load(key),a);assert.equal(calls.length,1);
 time=Date.parse('2026-10-28T10:29:00Z');assert.equal(tickets.get(key),a);
 time=Date.parse('2026-10-28T10:31:00Z');assert.equal(tickets.get(key),null,'höchstens 30 min nach Abruf (Sitzung läuft ab Ausstellung)');
 const late=createStartTickets({fetchImpl:async()=>answer(),now:()=>Date.parse('2026-10-28T13:52:00Z')});assert.equal(await late.load(key),null,'in den letzten 10 min der Sitzung nicht verwendet');
 for(const bad of [()=>({ok:false,json:async()=>({})}),()=>({ok:true,json:async()=>({url:'https://evil.example/x',expiresAt:'2026-10-28T18:00:00Z'})}),()=>({ok:true,json:async()=>({url:'https://app.example/x',expiresAt:'kaputt'})}),()=>{throw Error('offline');}]){
  answer=bad;const other=key+'&n='+calls.length;assert.equal(await tickets.load(other),null);assert.equal(tickets.get(other),null);
 }
 // Fehlschlag 60 s gemerkt: kein Abrufschwall beim Überfahren; danach neuer Versuch.
 answer=()=>({ok:false,json:async()=>({})});const failing=key+'&f=1',before=calls.length;
 await tickets.load(failing);await tickets.load(failing);await tickets.load(failing);assert.equal(calls.length,before+1);
 time+=61*1000;answer=()=>({ok:true,json:async()=>({url:'https://app.example/y',expiresAt:new Date(time+4*3600e3).toISOString()})});assert.equal(await tickets.load(failing),'https://app.example/y');assert.equal(calls.length,before+2);
 assert.equal(await tickets.load(null),null);
});

test('shop embed safety net: own start link is always usable, ready/failed messages only from the frame, page fallback without window',async t=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-embed-safe-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const source=fs.readFileSync(new URL('./ui/shop-embed.mjs',import.meta.url),'utf8').replaceAll('__EDITOR_ORIGIN__','https://app.example').replaceAll('__PROXY_PATH__','/apps/konfigurator');
 fs.writeFileSync(path.join(dir,'shop-embed.mjs'),source);fs.copyFileSync(new URL('./ui/theme-cart-client.mjs',import.meta.url),path.join(dir,'theme-cart-client.mjs'));
 globalThis.GRAVURU_SHOP_EMBED_NO_AUTO=true;t.after(()=>{delete globalThis.GRAVURU_SHOP_EMBED_NO_AUTO;});
 const {unlockStartLink,pageStartUrl,acceptedMessage}=await import(pathToFileURL(path.join(dir,'shop-embed.mjs')).href);
 const attrs=new Map([['disabled',''],['aria-disabled','true'],['tabindex','-1'],['href','/x']]),classes=new Set(['btn','disabled','btn--loading']);
 const link={getAttribute:n=>attrs.has(n)?attrs.get(n):null,removeAttribute:n=>attrs.delete(n),classList:{contains:n=>classes.has(n),remove:n=>{if(!classes.has(n))throw Error('remove nur bei vorhandener Klasse (sonst Beobachter-Schleife)');classes.delete(n);}},style:{pointerEvents:'none',opacity:'.4'}};
 unlockStartLink(link);
 assert.deepEqual([...attrs.keys()],['href']);assert.deepEqual([...classes],['btn']);
 assert.deepEqual(link.style,{pointerEvents:'auto',opacity:'1',touchAction:'manipulation',cursor:'pointer'});
 assert.equal(pageStartUrl('https://shop.example/apps/konfigurator/start?product=5&variant=11&embed=1&format=json'),'https://shop.example/apps/konfigurator/start?product=5&variant=11');
 assert.equal(pageStartUrl('kaputt'),null);
 const frame={contentWindow:{}};
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-ready'}},frame),{type:'loaded'});
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-editor-ready'}},frame),{type:'ready'});
 assert.deepEqual(acceptedMessage({origin:'https://app.example',source:frame.contentWindow,data:{type:'gravuru-shop-failed',message:'x'.repeat(400)}},frame),{type:'failed',message:'x'.repeat(300)});
 assert.equal(acceptedMessage({origin:'https://evil.example',source:frame.contentWindow,data:{type:'gravuru-shop-failed'}},frame),null);
 assert.equal(acceptedMessage({origin:'https://app.example',source:{},data:{type:'gravuru-shop-ready'}},frame),null);
});


test('gallery replaces HTML 502, malformed JSON and network errors with its own recoverable message',async()=>{
 for(const fetchImpl of [async()=>new Response('<html>upstream request failed</html>',{status:502}),async()=>Response.json({error:{message:'internal path secret'}},{status:500}),async()=>new Response('bad'),async()=>{throw new TypeError('Failed to fetch');}]){
  const client=createShopEntryClient({token,fetchImpl});
  await assert.rejects(client.loadDesignGallery(),e=>/Designauswahl.*erneut versuchen/.test(e.message)&&!e.message.includes('Der Konfigurator')&&!e.message.includes('secret'));
 }
 const expired=createShopEntryClient({token,fetchImpl:async()=>Response.json({error:{message:'Bitte die Produktseite neu öffnen.'}},{status:403})});
 await assert.rejects(expired.loadDesignGallery(),/Produktseite neu öffnen/);
});

test('gallery client aborts a hanging proxy request at five seconds and a retry can succeed',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal,calls=0;
 const client=createShopEntryClient({token,fetchImpl:async(_url,options)=>{signal=options.signal;if(++calls===1)return new Promise(()=>{});return Response.json({items:[],total:0,nextPage:null});}});
 const first=client.loadDesignGallery();const rejected=assert.rejects(first,/Designauswahl/);t.mock.timers.tick(4999);assert.equal(signal.aborted,false);t.mock.timers.tick(1);await rejected;assert.equal(signal.aborted,true);t.mock.timers.reset();
 assert.deepEqual(await client.loadDesignGallery(),{items:[],total:0,nextPage:null});
});

test('cart bootstrap chooses the private saved design before loading the small model',async()=>{
 const calls=[],secret='e'.repeat(64),storage={length:1,key:()=> 'gravuru-acrylic-private:test',getItem:()=>JSON.stringify({token:secret})};
 const client=createShopEntryClient({token,fetchImpl:async(url,options)=>{calls.push({url,options});if(url.includes('cart-configurations/'))return Response.json({document:{design:{id:'D207'}}});return Response.json({model:{key:'acryl',universal:{profile:{}},configuration:{id:'p'}},editorPath:'/_merchant-acryl-editor.html',shopDomain:'gravuru-design.myshopify.com'});}});
 await client.loadInitialModel(new URLSearchParams({config:konfig,rev:'2'}),storage);
 assert.equal(calls[0].options.headers['X-Gravuru-Draft'],secret);assert.equal(calls[1].url,'/api/shop-entry/model?design=D207');
 assert.ok(calls.every(c=>!c.url.includes(secret)));assert.equal(calls[1].options.headers['X-Gravuru-Draft'],undefined);
 await assert.rejects(client.loadInitialModel(new URLSearchParams({config:konfig,rev:'2'}),{length:0}),/nicht mehr zugänglich/);
});

test('hashed gallery previews use browser caching; unavailable cache falls back to the authenticated preview',async()=>{
 const calls=[],url='/konfigurator/shop/vorschauen/'+'a'.repeat(64)+'.svg';let found=true;
 const client=createShopEntryClient({token,fetchImpl:async(path,options)=>{calls.push({path,options});return path===url?(found?new Response('<svg/>',{headers:{'Content-Type':'image/svg+xml'}}):new Response('',{status:404})):new Response('<svg/>');}});
 await client.loadDesignPreview('signed-choice',url);assert.equal(calls[0].options.cache,'force-cache');assert.equal(calls[0].options.headers,undefined);
 found=false;await client.loadDesignPreview('signed-choice',url);assert.equal(calls.at(-1).options.headers['X-Gravuru-Shop-Session'],token);
 await client.loadDesignPreview('signed-choice','https://foreign.example/x.svg');assert.ok(calls.every(c=>!c.path.includes('foreign.example')));
});
