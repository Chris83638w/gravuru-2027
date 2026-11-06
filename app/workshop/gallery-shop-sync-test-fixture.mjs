// Explicitly synthetic, isolated acceptance fixture. Never mount this on a live
// database. Both sides use the real createWorkshop factory and native renderer.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {build,OUTPUT} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {planFamilyFormats} from './katalog-family-formats.mjs';
import {workshopResources} from './catalog.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {checkSelections,applyChecks} from '../../scripts/shop-bind.mjs';
import {createShopBindingReadAdapter} from './shop-product-binding-adapter.mjs';
import {createGalleryShopSync} from './gallery-shop-sync.mjs';
import {createGallerySyncActivation} from './gallery-shop-sync-activation.mjs';
import {createGallerySyncTestTransport} from './gallery-shop-sync-transport.mjs';
import {syncHash} from './gallery-shop-sync-native.mjs';

export const GALLERY_SYNC_TEST_SHOP='isolated-gallery-sync.myshopify.com';
export const GALLERY_SYNC_TEST_PRODUCT='gid://shopify/Product/168001';
export async function createGallerySyncTestFixture({directory,transportOptions={},serviceOptions={}}={}){
 const tenantId='gravuru',shopDomain=GALLERY_SYNC_TEST_SHOP,PRODUCT=GALLERY_SYNC_TEST_PRODUCT;
 if(!path.isAbsolute(directory)||fs.existsSync(path.join(directory,'source'))||fs.existsSync(path.join(directory,'target')))throw Error('Use a fresh, explicitly isolated test directory.');
 fs.mkdirSync(directory,{recursive:true});
 if(!fs.existsSync(path.join(OUTPUT,'models.json')))build();
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
 const sourceWorkshop=createWorkshop({filename:path.join(directory,'source','workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const targetWorkshop=createWorkshop({filename:path.join(directory,'target','workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const journal=new DatabaseSync(path.join(directory,'journal.sqlite'));
 const close=()=>{journal.close();targetWorkshop.close();sourceWorkshop.close();};
 try{
  const adapter=createShopBindingReadAdapter({storeId:'acryl',tenantId,shopDomain,workshop:{...targetWorkshop,sessionContext:{shopDomain}},productionProfileScope:{storeId:'acryl',tenantId}});
  const family=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=family.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
  const master={id:'TEST-AB-D168',name:'Testgestaltung',themes:['familie'],fonts:['Montserrat'],plateMm:[120,80],fields:{},json:{form:'Rechteck abgerundete Ecken',sizes:[size.key],ziele:[{familie:family.id,freigabe:{status:'freigegeben',von:'Synthetischer Test',am:'2026-11-01'}}]},svg:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><text id="text-1" x="60" y="40" text-anchor="middle" font-family="Montserrat" font-size="8">Alter Name</text></svg>',source:'synthetic-test'};
  const fonts=workshopResources().fonts,katalog={families:new Map([[family.id,family]]),lines:new Map([['test',{id:'test',name:'Test',families:[family.id],subcategories:[{id:'familie',name:'Familie',themeId:'familie'}]}]]),designs:{masters:[master]},theme:()=>null,fontResources:async()=>({fonts:{Montserrat:fonts.Montserrat},missing:[]})};
  const {config}=await planFamilyFormats(katalog,'test','familie',{shopProduct:{sizeKey:size.key,themeId:'familie',defaultDesignId:master.id}});
  const document=makeProductDocument(config,{name:'Isoliertes Shopprodukt'}),target=targetWorkshop.repository.create(document),sourceDocument=structuredClone(document);
  sourceDocument.config.reviewOnly=true;
  for(const d of [sourceDocument.config.profile.designs[0],sourceDocument.config.familyFormats.designs[0]])d.objects[0].text='Neu aus Galerie';
  const source=sourceWorkshop.repository.create(sourceDocument),designId=source.document.config.profile.designs[0].id;
  const variants=prepareShopProduct(target).variants.map((v,i)=>({...v,id:'gid://shopify/ProductVariant/'+(168100+i)}));
  const selections=variants.map(v=>({shopifyProductId:PRODUCT,shopifyVariantId:v.id,productId:target.id,productRevision:1,options:v.options,expectedUnitCents:v.priceCents}));
  const reader={async inspectVariants(ids){return {installation:{shopDomain,currency:'EUR',scope:'admin-readonly'},variants:ids.map(id=>{const v=variants.find(v=>v.id===id);return {id,found:true,productId:PRODUCT,status:'ACTIVE',priceCents:v.priceCents,options:Object.entries(v.options).map(([name,value])=>({name,value}))};})};}};
  const checks=await checkSelections(selections,{adapter,reader});applyChecks(checks,{orderIntake:targetWorkshop.orderIntake,storeId:'acryl',shopDomain,adapter});
  const registry=targetWorkshop.orderIntake.idBindings({storeId:'acryl',shopDomain,adapter});
  targetWorkshop.orderIntake.approveCatalogLiveProducts({shopDomain,approvalId:'synthetic-original',registry,products:[{productId:target.id,productRevision:1,shopifyProductId:PRODUCT}]});
  const mapping={id:'test-mapping',label:'Türschild Test',source:{productId:source.id,designId,originalId:master.id},target:{productId:target.id,designId},shopifyProductId:PRODUCT,shopifyVariantIds:variants.map(v=>v.id),media:[{id:'gid://shopify/MediaImage/168'}]};
  const transport=createGallerySyncTestTransport({shopDomain,products:[{id:PRODUCT,variants:variants.map(v=>({id:v.id,priceCents:v.priceCents})),commerce:{title:'Shop-Titel',seo:{title:'Beibehalten'},inventory:17},media:[{id:mapping.media[0].id,sha256:'a'.repeat(64),url:'https://synthetic.invalid/old.png'}]}],...transportOptions});
  const activation=createGallerySyncActivation({workshop:targetWorkshop,tenantId,shopDomain});
  const args={database:journal,tenantId,shopDomain,sourceWorkshop,targetWorkshop,targets:[mapping],transport,activation,executionEnabled:true,sourceApproval:()=>({approved:true}),prepareImage:({afterSvg})=>[{id:mapping.media[0].id,sha256:syncHash(Buffer.from(afterSvg)),url:'https://synthetic.invalid/new.png'}],...serviceOptions};
  return {dir:directory,journal,args,service:createGalleryShopSync(args),sourceWorkshop,targetWorkshop,source,target,mapping,transport,activation,registry,variants,close};
 }catch(error){close();throw error;}
}
