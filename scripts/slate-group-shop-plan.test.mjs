import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {makeProductDocument,validateProductDocument} from '../app/workshop/product-model.mjs';
import {slateProductGroups,slateGroupDocument,slateGroupVariants,slateGroupMainImage} from '../app/workshop/slate-product-groups.mjs';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {BUNDLE_SCHEMA,digest,importBundle} from './slate-group-import.mjs';
import {ALL_STATUSES,planSlateShop,readNativeRecords,slateBindingSelections,run} from './slate-group-shop-plan.mjs';
import {slateVariantSku} from './slate-draft-plan.mjs';
const runtime=fileURLToPath(new URL('..',import.meta.url));
const shopId='gid://shopify/Product/100';
function fixture(){
 const f=JSON.parse(fs.readFileSync(new URL('../app/designs/steel-door-signs/family.json',import.meta.url)));
 f.id='schiefer-tafeln-natur';f.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 f.photo={includedCount:1,extraPriceCents:999};f.sizes=f.sizes.slice(0,1);
 f.mountingRules=[{id:'ah2-test',label:'2 Abstandshalter',layout:'left-right',count:2,diameterMm:4,edgeMm:17,priceCents:599,skuSuffix:'AH02',accessory:'standoffs'}];
 Object.assign(f.sizes[0],{key:'TEST-220X140',widthMm:220,heightMm:140,baseCents:2199,photoDesignCents:2899,mounting:['ah2-test']});
 f.options=[{id:'ah-farbe-2',label:'Abstandshalter-Farbe',kind:'variant',selection:'single',required:true,visibleIf:{groupId:'mounting',valueIds:['ah2-test']},choices:[{id:'edelstahl',label:'Edelstahl',priceCents:0,default:true},{id:'schwarz',label:'Schwarz matt',priceCents:100}]}];
 const c=familyProductConfig(f,f.sizes[0],1),seed=c.profile.designs[0];
 c.profile.designs=[{...seed,id:'katalog-M1',name:'M1',themes:['monogramme'],katalog:{designId:'M1',target:{familyId:f.id,explicit:true,released:true}}}];c.profile.defaultDesignId='katalog-M1';
 const source=makeProductDocument(c),group=slateProductGroups(source,{familyId:f.id,sizeKey:f.sizes[0].key,masters:[{id:'M1',themes:['monogramme'],json:{katalog:{zielgruppe:'Allgemein'}}}],themes:[{id:'monogramme',name:'Monogramme'}]}).groups[0];
 const document=slateGroupDocument(source,group),image=slateGroupMainImage(document);
 const p={key:group.key,handle:'monogramm-test',title:'Monogrammschild',family:f.id,productId:'cfg_prepared',revision:1,sourceDesignId:'M1',defaultDesignId:document.config.profile.defaultDesignId,designIds:['M1'],document,fingerprint:digest(document),variants:slateGroupVariants(document),mainImage:{designId:image.designId,sha256:image.sha256},imageSvg:Buffer.from(image.svg).toString('base64')};
 const bundle={schema:BUNDLE_SCHEMA,tenantId:'gravuru',products:[p],assets:{design_sources:[],design_assets:[],material_surfaces:[],photo_example_sources:[]}};
 const inventory={shopDomain:'gravuru-design.myshopify.com',currency:'EUR',complete:true,coverage:{kind:'full-shop',statuses:ALL_STATUSES},products:[]};
 return {bundle,p,inventory,mapping:{[p.key]:{skuBase:'MG-TEST',source:'Explizite Testzuordnung'}},records:{[p.key]:{id:'cfg_server',revision:3,fingerprint:p.fingerprint}}};
}
function shopProduct(entry){
 const input=entry.operation.variables.input;
 return {id:shopId,handle:input.handle,title:input.title,status:'DRAFT',
  options:input.productOptions.map((o,i)=>({id:'gid://shopify/ProductOption/'+(i+1),name:o.name,values:o.values.map(v=>v.name)})),
  variants:{nodes:input.variants.map((v,i)=>({id:'gid://shopify/ProductVariant/'+(100+i),sku:v.sku,price:v.price,inventoryItem:{tracked:false},selectedOptions:v.optionValues.map(o=>({name:o.optionName,value:o.name}))})),pageInfo:{hasNextPage:false}}};
}
test('native conditional colours retain distinct SKUs, prices and complete binding options',()=>{
 const f=fixture(),before=structuredClone(f),plan=planSlateShop(f.bundle,f.inventory,f),e=plan.entries[0];
 assert.equal(e.action,'create');assert.equal(e.variants.length,3);
 assert.deepEqual(e.variants.map(v=>v.sku),['MG-TEST','MG-TEST-AH02-EDELSTAHL','MG-TEST-AH02-SCHWARZ']);
 assert.deepEqual(e.variants.map(v=>v.priceCents),[2199,2798,2898]);
 assert.equal(e.operation.variables.input.status,'DRAFT');assert.equal(e.operation.variables.input.metafields,undefined);
 assert.deepEqual(f,before,'planning never changes sources');
 f.inventory.products=[shopProduct(e)];
 const matching=planSlateShop(f.bundle,f.inventory,f);assert.equal(matching.entries[0].action,'unchanged');
 const selections=slateBindingSelections(matching);assert.equal(selections.length,3);
 assert.deepEqual(selections[2].options,{mounting:'AH02','ah-farbe-2':'schwarz'});assert.equal(selections[2].productId,'cfg_server');assert.equal(selections[2].productRevision,3);
 assert.equal(slateVariantSku('OLD',{mounting:'B02'}),'OLD-B02');
});
test('draft creation is independent of server import; partial inventory and missing SKU sources still block',()=>{
 const draft=fixture();delete draft.records[draft.p.key];
 const ready=planSlateShop(draft.bundle,draft.inventory,draft);assert.equal(ready.entries[0].action,'create');assert.equal(ready.entries[0].bindingPending.length,1);assert.equal(ready.entries[0].operation.variables.input.status,'DRAFT');
 draft.inventory.products=[shopProduct(ready.entries[0])];
 const reread=planSlateShop(draft.bundle,draft.inventory,draft);assert.equal(reread.entries[0].action,'unchanged');assert.deepEqual(slateBindingSelections(reread),[],'no invented server binding');
 for(const change of [f=>delete f.mapping[f.p.key],f=>{f.inventory.complete=false;},f=>{f.inventory.coverage.statuses=['ACTIVE'];}]){
  const f=fixture();change(f);const p=planSlateShop(f.bundle,f.inventory,f);assert.equal(p.entries[0].action,'pending');assert.equal(p.entries[0].operation,null);assert.deepEqual(slateBindingSelections(p),[]);
 }
 const f=fixture();f.bundle.products[0].variants[0].priceCents++;assert.throws(()=>planSlateShop(f.bundle,f.inventory,f),/Preis/);
 assert.throws(()=>run(['--apply']),/plant nur/);
});
test('48 legacy variants and extra options block without creating an alternate product',()=>{
 const f=fixture(),p=shopProduct(planSlateShop(f.bundle,f.inventory,f).entries[0]);
 p.options.push({name:'Ständer',values:['Ohne','Klar']});
 p.variants.nodes=Array.from({length:48},(_,i)=>({id:'gid://shopify/ProductVariant/'+(1000+i),sku:'OLD-'+i,price:'25.99',selectedOptions:[{name:'Befestigung',value:'Ohne'}],inventoryItem:{tracked:false}}));
 f.inventory.products=[p];f.mapping[f.p.key].shopifyProductId=shopId;
 const e=planSlateShop(f.bundle,f.inventory,f).entries[0];assert.equal(e.action,'conflict');assert.equal(e.operation,null);assert.equal(e.shopify.id,shopId);assert.ok(e.conflicts.some(r=>/gelöscht/.test(r)));assert.equal(p.variants.nodes.length,48);
 f.inventory.products=[];f.inventory.complete=false;const missing=planSlateShop(f.bundle,f.inventory,f).entries[0];assert.equal(missing.action,'pending');assert.ok(missing.pending.some(r=>/keine Ersatzanlage/.test(r)));
});
test('duplicate SKUs, conflicting product identities and active products cannot be overwritten',()=>{
 const f=fixture(),p=shopProduct(planSlateShop(f.bundle,f.inventory,f).entries[0]);f.inventory.products=[p];
 p.status='ACTIVE';assert.equal(planSlateShop(f.bundle,f.inventory,f).entries[0].action,'conflict');p.status='DRAFT';
 const other=structuredClone(p);other.id='gid://shopify/Product/200';other.handle='other';f.inventory.products.push(other);
 const e=planSlateShop(f.bundle,f.inventory,f).entries[0];assert.equal(e.action,'conflict');assert.ok(e.conflicts.some(r=>/mehrfach/.test(r)));assert.equal(e.operation,null);
 other.variants.nodes=[];f.mapping[f.p.key].shopifyProductId=other.id;assert.equal(planSlateShop(f.bundle,f.inventory,f).entries[0].action,'conflict');
});
test('updates retain every variant ID and omit unrelated metafields, media and collections',()=>{
 const f=fixture(),p=shopProduct(planSlateShop(f.bundle,f.inventory,f).entries[0]);f.inventory.products=[p];p.variants.nodes[1].price='99.00';
 const e=planSlateShop(f.bundle,f.inventory,f).entries[0];assert.equal(e.action,'update');
 const {input,identifier}=e.operation.variables;assert.deepEqual(identifier,{id:shopId});assert.equal(input.id,undefined);
 assert.deepEqual(input.variants.map(v=>v.id),p.variants.nodes.map(v=>v.id));
 assert.ok(input.variants.every(v=>v.inventoryItem.requiresShipping===undefined),'existing shipping settings remain unchanged');
 for(const key of ['status','title','handle','metafields','files','collections'])assert.equal(input[key],undefined);
});
test('target IDs are read without writes and changed native documents are rejected',async t=>{
 const f=fixture(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'slate-shop-plan-')),filename=path.join(dir,'workshop.sqlite');
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 createDesignAssetStore({filename:path.join(dir,'design-assets.sqlite'),tenantId:'gravuru'}).close();
 createProductRepository({filename,tenantId:'gravuru',validateDocument:validateProductDocument}).close();
 const saved=await importBundle(f.bundle,dir,{apply:true,runtime});const before=fs.readFileSync(filename);
 const records=readNativeRecords(f.bundle,filename);assert.equal(records[f.p.key].id,saved.products[0].id);assert.notEqual(records[f.p.key].id,f.p.productId);assert.deepEqual(fs.readFileSync(filename),before);
 const repo=createProductRepository({filename,tenantId:'gravuru',validateDocument:validateProductDocument});
 const changed=structuredClone(f.p.document);changed.name='Manuell';repo.save(records[f.p.key].id,changed,records[f.p.key].revision);repo.close();assert.throws(()=>readNativeRecords(f.bundle,filename),/verändert/);
 const absent=path.join(dir,'absent.sqlite');assert.throws(()=>readNativeRecords(f.bundle,absent));assert.equal(fs.existsSync(absent),false);
});
