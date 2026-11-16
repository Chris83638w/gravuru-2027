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
function configFixture({acrylic=false}={}){
 if(!acrylic&&process.env.GRAVURU_GALLERY_CANDIDATE)return JSON.parse(fs.readFileSync(process.env.GRAVURU_GALLERY_CANDIDATE)).config;
 const material=acrylic?'schwarz':'steel',label=acrylic?'Acrylglas schwarz':'Edelstahl';
 const source=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/'+material+'.json',import.meta.url)));
 const wanted=acrylic?['RE-80X20','QU-80X80','R-85X85']:['AB-120X80','RE-150X100'];
 const sizes=source.sizes.filter(s=>wanted.includes(s.groupKey+'-'+s.widthMm+'X'+s.heightMm)),formats=[],designs=[];let config;
 for(const size of sizes){
  const view={...source,groups:source.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:source.mountingRules.filter(r=>size.mounting.includes(r.id))};
  const c=familyProductConfig(view,size,1),d={id:'test-'+size.groupKey,name:'Template '+size.groupKey,themes:['family'],
   objects:acrylic?structuredClone(c.profile.designs[0].objects):[],katalog:{designId:'TEST-'+size.groupKey+'-D'+(size.groupKey==='AB'?1:3),plateMm:[size.widthMm,size.heightMm]}};
  config??=c;designs.push(d);formats.push({key:size.key,form:size.groupKey,label:size.label,geometry:c.profile.geometry,
   variants:[{color:material,familyId:source.id,sizeKey:size.key,basePriceCents:size.baseCents,material:c.profile.material,mounting:c.profile.optionGroups[0].values,designIds:[d.id]}]});
 }
 config.familyFormats={schema:'gravuru-family-formats/v1',defaultSize:formats[0].key,defaultColor:material,colors:[{id:material,label}],formats,designs,source:{lineId:acrylic?'acryl-tuerschilder':'edelstahl-tuerschilder',subcategoryId:'familienschilder',shopProduct:{groessenWahl:'alle'}}};delete config.familyAcrylic;config.profile.designs=[structuredClone(designs[0])];config.profile.defaultDesignId=designs[0].id;return config;
}

async function galleryHttp(t,{origin,shopDomain,secret,proxyPath,store}){
 const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath,modelSlimmer:null,logger:()=>{}});
 const server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const appHost=new URL(origin).host;
 const request=(url,{token,body}={})=>new Promise((resolve,reject)=>{
  const bytes=body?Buffer.from(JSON.stringify(body)):null;
  const req=http.request({host:'127.0.0.1',port:server.address().port,path:url,method:bytes?'POST':'GET',
   headers:{Host:appHost,'X-Forwarded-Proto':'https',...(token?{'X-Gravuru-Shop-Session':token}:{}),
    ...(bytes?{Origin:origin,'Content-Type':'application/json','Content-Length':bytes.length}:{})}},res=>{
    const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>{
     const text=Buffer.concat(chunks).toString();let data;try{data=JSON.parse(text);}catch{}
     resolve({status:res.statusCode,headers:res.headers,data,text});
    });
   });
  req.on('error',reject);req.end(bytes);
 });
 async function start(variant='101'){
  const params=new URLSearchParams({shop:shopDomain,path_prefix:proxyPath,timestamp:String(Math.floor(Date.now()/1000)),product:'1',variant});
  params.set('signature',appProxySignature(params,secret));
  const opened=await request(proxyPath+'/start?'+params);assert.equal(opened.status,302,opened.text);
  return new URLSearchParams(new URL(opened.headers.location).hash.slice(1)).get('s');
 }
 return {request,start};
}
test('HTTP gallery → signed switch → model → unchanged client guard keeps a different form design',async t=>{
 const config=configFixture(),sourceSnapshot=JSON.stringify(config),sourceSize=config.familyFormats.formats.find(f=>f.form==='AB'&&f.geometry.width===120&&f.geometry.height===80).key,targetSize=config.familyFormats.formats.find(f=>f.form==='RE'&&f.geometry.width===150&&f.geometry.height===100).key;
 const origin='https://app.example',shopDomain='test.myshopify.com',secret='synthetic-app-secret-value',proxyPath='/apps/konfigurator',options=[familyFormatOptions(config,{size:sourceSize,mounting:'K00'}),familyFormatOptions(config,{size:targetSize,mounting:'KGL'})];
 const bindings=options.map((o,i)=>({storeId:'acryl',tenantId:'gravuru',shopDomain,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/'+(101+i),productId:'cfg_00000000-0000-4000-8000-000000000001',productRevision:4,bindingId:'binding_'+String(i+1).padStart(8,'0')+'-0000-4000-8000-000000000000',assignmentRevision:4,options:o,unitCents:quote(config,[],selectedProfile(config,o).designs[0].id,o).unitCents}));
 const model={key:'acryl',name:'Door sign',configuration:{id:'cfg_00000000-0000-4000-8000-000000000001',revision:4},legacy:{designs:structuredClone(config.profile.designs)},universal:config};
 let approved=true,paused=false;
 const workshop={tenantId:'gravuru',sessionContext:{shopDomain},model:()=>model,galleryModel:()=>model,repository:{get:()=>({id:'cfg_00000000-0000-4000-8000-000000000001',revision:4,document:{config}})},assets:{read(){throw Error('No asset read required');}},konfis:{paused:()=>paused},customerDrafts:{acrylicDrafts:{get(){},create(){},save(){}},review(){},cartConfigurations:{forDraft(){}}},orderIntake:{tenantId:'gravuru',catalogLiveApproval:()=>approved,bindings:()=>bindings.map(b=>({shopDomain,productId:b.productId,productRevision:b.productRevision,variantId:b.shopifyVariantId.split('/').at(-1),options:b.options}))}};
 const store={storeId:'acryl',workshop,catalogLiveOrders:true,nativeEditorPath:'/_merchant-acryl-editor.html',cart(){throw Error('No cart writes');},registry:{resolve(ids){const b=bindings.find(b=>b.shopifyProductId===ids.shopifyProductId&&b.shopifyVariantId===ids.shopifyVariantId);if(!b)throw Object.assign(Error('Inactive'),{status:404,code:'shop_binding_active_not_found'});return structuredClone(b);},listActive(){throw Error('No global scan');}}};
 const {request,start}=await galleryHttp(t,{origin,shopDomain,secret,proxyPath,store});
 const token=await start();
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
});

test('Acryl square and round use the exact active revision when historical bindings share the same selection',async t=>{
 const first=configFixture({acrylic:true}),second=structuredClone(first);
 for(const format of second.familyFormats.formats.filter(f=>['QU','R'].includes(f.form))){
  const variant=format.variants[0],design=second.familyFormats.designs.find(d=>d.id===variant.designIds[0]);
  design.id+='-neuer-stand';
  variant.designIds=[design.id];
  variant.basePriceCents+=137;
 }
 const origin='https://app.example',shopDomain='test.myshopify.com',secret='synthetic-acryl-revisions',proxyPath='/apps/konfigurator';
 const productId='cfg_00000000-0000-4000-8000-000000000001',shopifyProductId='gid://shopify/Product/1';
 const models=[first,second].map((config,index)=>({key:'acryl',name:'Türschild Acrylglas',
  configuration:{id:productId,revision:index+1},legacy:{designs:structuredClone(config.profile.designs)},universal:config}));
 const makeBinding=(format,index,revision)=>{
  const config=models[revision-1].universal,options=familyFormatOptions(config,{size:format.key,mounting:'K00'});
  return {storeId:'acryl',tenantId:'gravuru',shopDomain,shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+(101+index),
   productId,productRevision:revision,bindingId:'binding_'+String(10*revision+index).padStart(8,'0')+'-0000-4000-8000-000000000000',
   assignmentRevision:revision,options,unitCents:quote(config,[],selectedProfile(config,options).designs[0].id,options).unitCents};
 };
 const history=first.familyFormats.formats.map((format,i)=>makeBinding(format,i,1));
 const active=first.familyFormats.formats.map((format,i)=>makeBinding(format,i,format.form==='RE'?1:2));
 const known=[...history,...active.filter(binding=>binding.productRevision===2)];
 let approvedRevision2=true;
 const workshop={tenantId:'gravuru',sessionContext:{shopDomain},
  model:(_id,revision)=>models[revision-1],galleryModel:(_id,revision)=>models[revision-1],
  repository:{get:(_id,{revision})=>({id:productId,revision,document:{config:models[revision-1].universal}})},
  assets:{read(){throw Error('No file needed for the sample templates');}},konfis:{paused:()=>false},
  customerDrafts:{acrylicDrafts:{get(){},create(){},save(){}},review(){},cartConfigurations:{forDraft(){}}},
  orderIntake:{tenantId:'gravuru',catalogLiveApproval:binding=>binding.productRevision===1||approvedRevision2,
   bindings:()=>known.map(b=>({shopDomain,productId,variantId:b.shopifyVariantId.split('/').at(-1),productRevision:b.productRevision,options:b.options}))}};
 const store={storeId:'acryl',workshop,catalogLiveOrders:true,nativeEditorPath:'/_merchant-acryl-editor.html',
  cart(){throw Error('No cart writes');},registry:{resolve:ids=>{
   const match=active.find(b=>b.shopifyProductId===ids.shopifyProductId&&b.shopifyVariantId===ids.shopifyVariantId);
   if(!match)throw Object.assign(Error('Inactive'),{status:404,code:'shop_binding_active_not_found'});
   return structuredClone(match);
  },listActive(){throw Error('No global scan');}}};
 const {start,request}=await galleryHttp(t,{origin,shopDomain,secret,proxyPath,store});
 const initial=active.find(b=>b.productRevision===1),token=await start(initial.shopifyVariantId.split('/').at(-1));
 for(const expected of active.filter(b=>b.productRevision===2)){
  const list='/api/shop-entry/design-gallery?'+new URLSearchParams(expected.options);
  const result=await request(list,{token});
  assert.equal(result.status,200,result.text);
  assert.equal(result.data.total,1);
  const [card]=result.data.items;
  assert.equal(card.productRevision,2);
  assert.equal(card.shopifyVariantId,expected.shopifyVariantId);
  assert.equal(card.unitCents,expected.unitCents);
  assert.equal(card.current,false);
  assert.match(card.designId,/-neuer-stand$/);
  const body={target:card.target};
  const preview=await request('/api/shop-entry/design-gallery-preview',{token,body});
  assert.equal(preview.status,200,preview.text);
  assert.match(preview.text,/<svg\b/);
  const chosen=await request('/api/shop-entry/design-switch',{token,body});
  assert.equal(chosen.status,200,chosen.text);
  assert.deepEqual(chosen.data.binding.options,expected.options);
  const loaded=await request('/api/shop-entry/model?design='+encodeURIComponent(card.designId),{token:chosen.data.token});
  assert.equal(loaded.status,200,loaded.text);
  assert.equal(switchedModel(loaded.data,chosen.data).model.configuration.revision,2);
  const reverse=await request('/api/shop-entry/design-gallery?'+new URLSearchParams(initial.options),{token:chosen.data.token});
  assert.equal(reverse.status,200,reverse.text);
  assert.equal(reverse.data.items[0].productRevision,1);
  approvedRevision2=false;
  assert.equal((await request(list,{token})).status,404);
  assert.equal((await request('/api/shop-entry/design-switch',{token,body})).status,404);
  approvedRevision2=true;
 }
 second.familyFormats.source.subcategoryId='andere-galerie';
 const other=active.find(b=>b.productRevision===2);
 const mismatch=await request('/api/shop-entry/design-gallery?'+new URLSearchParams(other.options),{token});
 assert.equal(mismatch.status,409);
 assert.equal(mismatch.data.error.code,'shop_gallery_changed');
});
