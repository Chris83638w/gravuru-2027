import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {familyProductConfig} from './product-families.mjs';
const runtime=process.env.GRAVURU_GALLERY_RUNTIME;
const load=file=>import(runtime?pathToFileURL(path.join(runtime,file)):new URL('../'+file.replace(/^app\//,''),import.meta.url));
const {createShopEntry}=await load('app/workshop/shop-entry.mjs');
const {appProxySignature}=await load('app/workshop/shopify-app-proxy.mjs');
const {switchedModel}=await load('app/workshop/ui/shop-design-switch.mjs');
const {selectedProfile,quote}=await load('app/configurator/variant-m/contract.mjs');
const {familyFormatOptions}=await load('app/configurator/variant-m/family-formats.mjs');
function configFixture(){
 if(process.env.GRAVURU_GALLERY_CANDIDATE)return JSON.parse(fs.readFileSync(process.env.GRAVURU_GALLERY_CANDIDATE)).config;
 const source=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),sizes=source.sizes.filter(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||s.groupKey==='RE'&&s.widthMm===150&&s.heightMm===100),formats=[],designs=[];let config;
 for(const size of sizes){const view={...source,groups:source.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:source.mountingRules.filter(r=>size.mounting.includes(r.id))},c=familyProductConfig(view,size,1),d={id:'test-'+size.groupKey,name:'Template '+size.groupKey,themes:['family'],objects:[],katalog:{designId:'TEST-'+size.groupKey+'-D'+(size.groupKey==='AB'?1:3),plateMm:[size.widthMm,size.heightMm]}};config??=c;designs.push(d);formats.push({key:size.key,form:size.groupKey,label:size.label,geometry:c.profile.geometry,variants:[{color:'steel',familyId:source.id,sizeKey:size.key,basePriceCents:size.baseCents,material:c.profile.material,mounting:c.profile.optionGroups[0].values,designIds:[d.id]}]});}
 config.familyFormats={schema:'gravuru-family-formats/v1',defaultSize:formats[0].key,defaultColor:'steel',colors:[{id:'steel',label:'Edelstahl'}],formats,designs,source:{shopProduct:{groessenWahl:'alle'}}};delete config.familyAcrylic;config.profile.designs=[structuredClone(designs[0])];config.profile.defaultDesignId=designs[0].id;return config;
}
test('HTTP gallery → signed switch → model → unchanged client guard keeps a different form design',async()=>{
 const config=configFixture(),sourceSnapshot=JSON.stringify(config),sourceSize=config.familyFormats.formats.find(f=>f.form==='AB'&&f.geometry.width===120&&f.geometry.height===80).key,targetSize=config.familyFormats.formats.find(f=>f.form==='RE'&&f.geometry.width===150&&f.geometry.height===100).key;
 const origin='https://app.example',shopDomain='test.myshopify.com',secret='synthetic-app-secret-value',proxyPath='/apps/konfigurator',options=[familyFormatOptions(config,{size:sourceSize,mounting:'K00'}),familyFormatOptions(config,{size:targetSize,mounting:'KGL'})];
 const bindings=options.map((o,i)=>({storeId:'acryl',tenantId:'gravuru',shopDomain,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(101+i),productId:'cfg_00000000-0000-4000-8000-000000000001',productRevision:4,bindingId:'binding_'+String(i+1).padStart(8,'0')+'-0000-4000-8000-000000000000',assignmentRevision:4,options:o,unitCents:quote(config,[],selectedProfile(config,o).designs[0].id,o).unitCents}));
 const model={key:'acryl',name:'Door sign',configuration:{id:'cfg_00000000-0000-4000-8000-000000000001',revision:4},legacy:{designs:structuredClone(config.profile.designs)},universal:config};
 let approved=true,paused=false;
 const workshop={tenantId:'gravuru',sessionContext:{shopDomain},model:()=>model,galleryModel:()=>model,repository:{get:()=>({id:'cfg_00000000-0000-4000-8000-000000000001',revision:4,document:{config}})},assets:{read(){throw Error('No asset read required');}},konfis:{paused:()=>paused},customerDrafts:{acrylicDrafts:{get(){},create(){},save(){}},review(){},cartConfigurations:{forDraft(){}}},orderIntake:{tenantId:'gravuru',catalogLiveApproval:()=>approved,bindings:()=>bindings.map(b=>({shopDomain,productId:b.productId,productRevision:b.productRevision,variantId:b.shopifyVariantId.split('/').at(-1),options:b.options}))}};
 const store={storeId:'acryl',workshop,catalogLiveOrders:true,nativeEditorPath:'/_merchant-acryl-editor.html',cart(){throw Error('No cart writes');},registry:{resolve(ids){const b=bindings.find(b=>b.shopifyProductId===ids.shopifyProductId&&b.shopifyVariantId===ids.shopifyVariantId);if(!b)throw Object.assign(Error('Inactive'),{status:404,code:'shop_binding_active_not_found'});return structuredClone(b);},listActive(){throw Error('No global scan');}}};
 const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,modelSlimmer:null,logger:()=>{}}),server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));server.listen(0,'127.0.0.1');await once(server,'listening');
 const request=(url,{token,body}={})=>new Promise((resolve,reject)=>{const bytes=body?Buffer.from(JSON.stringify(body)):null,req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method:body?'POST':'GET',headers:{Host:'app.example','X-Forwarded-Proto':'https',...(token?{'X-Gravuru-Shop-Session':token}:{}),...(bytes?{Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length}:{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{const text=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,data,text});});});req.on('error',reject);req.end(bytes);});
 try{
  const params=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),product:'1',variant:'101'});params.set('signature',appProxySignature(params,secret));
  const opened=await request(proxyPath+'/start?'+params);assert.equal(opened.status,302,opened.text);const token=new URLSearchParams(new URL(opened.headers.location).hash.slice(1)).get('s');
  const initial=await request('/api/shop-entry/model',{token});assert.equal(initial.status,200,initial.text);assert.equal(initial.data.model.universal.familyFormats.defaultSize,sourceSize);
  const listing=await request('/api/shop-entry/design-gallery?'+new URLSearchParams({page:'0',...options[1]}),{token});assert.equal(listing.status,200,listing.text);
  const wanted=config.familyFormats.designs.find(d=>/-D3$/.test(d.katalog?.designId||'')&&config.familyFormats.formats.find(f=>f.key===targetSize).variants[0].designIds.includes(d.id));assert.ok(wanted,'target D3 exists');
  assert.ok(!config.profile.designs.some(d=>d.id===wanted.id),'native root must reproduce a different-form design');const card=listing.data.items.find(c=>c.designId===wanted.id);assert.ok(card);
  const chosen=await request('/api/shop-entry/design-switch',{token,body:{target:card.target}});assert.equal(chosen.status,200,chosen.text);assert.deepEqual(chosen.data.binding.options,options[1]);
  const loaded=await request('/api/shop-entry/model?design='+encodeURIComponent(chosen.data.designId),{token:chosen.data.token});assert.equal(loaded.status,200,loaded.text);
  const accepted=switchedModel(loaded.data,chosen.data),p=selectedProfile(accepted.model.universal,options[1]);assert.equal(p.defaultDesignId,wanted.id);assert.equal(p.geometry.width,150);assert.equal(p.geometry.height,100);assert.equal(quote(accepted.model.universal,[],wanted.id,options[1]).unitCents,bindings[1].unitCents);
  assert.deepEqual(accepted.model.legacy.designs,accepted.model.universal.profile.designs);assert.ok(accepted.model.universal.profile.designs.some(d=>d.id===wanted.id));
  const foreign=await request('/api/shop-entry/model?design='+encodeURIComponent(initial.data.model.universal.profile.defaultDesignId),{token:chosen.data.token});assert.equal(foreign.status,404,'foreign form design remains rejected');
  approved=false;assert.equal((await request('/api/shop-entry/model?design='+encodeURIComponent(wanted.id),{token:chosen.data.token})).status,404);approved=true;paused=true;assert.equal((await request('/api/shop-entry/design-gallery',{token:chosen.data.token})).status,423);
  assert.equal(JSON.stringify(config),sourceSnapshot,'stored 251-design bank is untouched');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
