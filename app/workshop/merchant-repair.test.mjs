import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {makeAcrylicConfig} from '../configurator/variant-m/acrylic-product.mjs';
import {syntheticSlate} from '../../scripts/fixtures/slate-config.mjs';
import {createWorkshop} from './http.mjs';
import {makeProductDocument} from './product-model.mjs';
import {planDesignImport,applyDesignImport} from './design-import.mjs';
import {createMerchantRequest} from './ui/merchant-request.mjs';
import {merchantNavigation} from './ui/merchant-navigation.mjs';
import {createFontLibrary} from './font-library.mjs';
const resources=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-unser-anfang/resources.json',import.meta.url)));
const seed=()=>makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
test('slate import fits the actual 220 x 140 mm plate and preserves other designs, prices and history',async t=>{
 const workshop=createWorkshop({filename:':memory:',seedConfig:seed()});t.after(()=>workshop.close());
 const config=syntheticSlate(seed()),copy=structuredClone(config.profile.designs[0]);copy.id='keep';config.profile.designs.push(copy);
 const record=workshop.repository.create(makeProductDocument(config,{name:'Schiefertest',kind:'product'}));
 const asset=await workshop.assets.import({name:'portrait.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="200mm"><path d="M0 0H100V200H0Z"/></svg>').toString('base64')});
 const input={expectedRevision:1,designId:'slate-test',assetId:asset.assetId,fit:'visible',originalName:'portrait.svg'};
 const plan=planDesignImport(workshop.repository,workshop.assets,record.id,input);
 assert.equal(plan.placement.x,110);assert.equal(plan.placement.y,70);assert.equal(plan.placement.heightMm,136);assert.equal(plan.placement.widthMm,68);
 const saved=applyDesignImport(workshop.repository,workshop.assets,record.id,{...input,token:plan.token});
 assert.equal(saved.document.config.basePriceCents,2299);assert.deepEqual(saved.document.config.profile.designs[1],record.document.config.profile.designs[1]);
 assert.deepEqual(workshop.repository.get(record.id,{revision:1}).document,record.document);
 assert.throws(()=>planDesignImport(workshop.repository,workshop.assets,record.id,{...input,expectedRevision:2,fit:'original'}),/Originalmaß/);
});
test('embedding context survives navigation and new tabs open through Shopify without tokens',()=>{
 const current='https://merchant.example/werkstatt/?shop=gravuru-design.myshopify.com&host=YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvZ3JhdnVydS1kZXNpZ24=&embedded=1&id_token=SECRET';
 const next=new URL(merchantNavigation('/werkstatt/profile/',current));assert.equal(next.searchParams.get('shop'),'gravuru-design.myshopify.com');assert.equal(next.searchParams.get('embedded'),'1');assert.ok(!next.href.includes('SECRET'));
 const tab=new URL(merchantNavigation('/werkstatt/fertigung/?configuration=cfg_123',current,{newTab:true,apiKey:'app123',shop:'gravuru-design.myshopify.com'}));
 assert.equal(tab.origin,'https://gravuru-design.myshopify.com');assert.equal(tab.pathname,'/admin/apps/app123/werkstatt/fertigung/');assert.equal(tab.searchParams.get('configuration'),'cfg_123');
 assert.equal(merchantNavigation('https://other.example/',current),'https://other.example/');
});
test('delayed bridge initialization is awaited; a hung token request never writes anonymously',async()=>{
 let bridge,calls=0;setTimeout(()=>{bridge={idToken:async()=>'synthetic'};},20);
 const request=createMerchantRequest({bridge:()=>bridge,required:()=>true,bridgeWaitMs:150,fetchImpl:async()=>{calls++;return Response.json({});}});
 await request('/api/workshop/session');assert.equal(calls,1);
 const stuck=createMerchantRequest({bridge:()=>({idToken:()=>new Promise(()=>{})}),required:()=>true,tokenWaitMs:20,fetchImpl:()=>{calls++;}});
 await assert.rejects(stuck('/api/workshop/products',{method:'POST'}),/erneuern/);assert.equal(calls,1);
});
test('uploaded fonts survive restart, deduplicate originals and reject invalid input without changing the catalog',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'font-library-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const filename=path.join(dir,'assets.sqlite');let conversions=0;
 const converter=async()=>{conversions++;return {name:'Synthetic',glyphCount:1,font:{regular:{units:1000,glyphs:{A:{a:500,d:'M0 0L200 400'}}}}};};
 let library=createFontLibrary({filename,converter});const input={name:'Test.ttf',bytes:Buffer.from('synthetic-font').toString('base64')};
 const font=await library.import(input);assert.deepEqual(await library.import(input),font);assert.equal(conversions,1);library.close();
 library=createFontLibrary({filename,converter});assert.equal(library.list()[0].id,font.id);assert.equal(library.resources()[font.id].regular.glyphs.A.a,500);
 await assert.rejects(library.import({...input,name:'font.exe'}),/TTF/);assert.equal(library.list().length,1);library.close();
});

test('font labels in query values cannot change the authenticated API path',async()=>{
 let called;
 const request=createMerchantRequest({bridge:()=>({idToken:async()=>'synthetic'}),fetchImpl:async(path)=>{called=path;return Response.json({});}});
 await request('/api/workshop/font-library?id=Font%2FRegular%20v1.0');assert.equal(called,'/api/workshop/font-library?id=Font%2FRegular%20v1.0');
 await assert.rejects(request('/api/workshop/%2e%2e/other?id=Font'),/Werkstattziel/);
});
