// Isolated local demonstration only. It uses the real existing management,
// native products, price guards and binding database, with an in-memory fake
// Shopify response. No network credentials, live store or catalogue writes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createGallerySyncTestFixture,GALLERY_SYNC_TEST_SHOP as shopDomain,GALLERY_SYNC_TEST_PRODUCT as productId} from '../../app/workshop/gallery-shop-sync-test-fixture.mjs';
import {createGalleryModuleManagementHost} from '../lib/gallery-module-management-host.mjs';
import {createGalleryManagementHandler} from '../lib/gallery-management-http.mjs';

export async function createGalleryModuleManagementDemo(){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-module-demo-'));
 let fixture,host;
 try{
  fixture=await createGallerySyncTestFixture({directory});
  const {sourceWorkshop,targetWorkshop,mapping,source,target,variants}=fixture;
  let release=null,profile=null,writes=0,reads=0;
  const config=target.document.config,pricing={schema:'gravuru-personalization-pricing/v2',enabled:true,productId,revision:2,currency:'EUR',
   variants:Object.fromEntries(variants.map(v=>[v.id.split('/').at(-1),v.priceCents])),extraMotifCents:config.extraMotifCents,extraPhotoCents:config.photo.extraPriceCents,extraLogoCents:1299};
  const graphql=async(query,input)=>{
   if(query.startsWith('query GallerySyncProduct')){reads++;return {data:{shop:{myshopifyDomain:shopDomain,currencyCode:'EUR'},product:{id:productId,title:'Isolierter Edelstahl-Test',handle:'isolierter-test',status:'ACTIVE',descriptionHtml:'',seo:{title:'Unverändert',description:''},options:[],
    variants:{nodes:variants.map(v=>({id:v.id,price:(v.priceCents/100).toFixed(2),compareAtPrice:null,sku:v.id,selectedOptions:[],inventoryItem:{id:'gid://shopify/InventoryItem/1',tracked:true}})),pageInfo:{hasNextPage:false}},media:{nodes:[],pageInfo:{hasNextPage:false}},metafield:release,pricing:{jsonValue:pricing}}}};}
   if(query.startsWith('mutation GallerySyncRelease')){
    if(input.metafields.length!==1||input.metafields[0].compareDigest!==(release?.compareDigest??null))throw Error('Isolated release compare-and-swap failed');
    writes++;release={value:input.metafields[0].value,compareDigest:'synthetic-release-'+writes};return {data:{metafieldsSet:{metafields:[release],userErrors:[]}}};
   }
   throw Error('No external request allowed in module demo');
  };
  const sourceRegistry={targets:()=>[{key:'existing-demo-source',productId:source.id,familyId:'demo-steel',sizeKey:'demo-size'}],
   scopes:()=>[{lineId:'demo',subcategoryId:'steel',label:'Isoliertes vorhandenes Türschild',sourceKeys:['existing-demo-source']}],
   offeringFor:scope=>scope?.lineId==='demo'&&scope?.subcategoryId==='steel'?{familyIds:['demo-steel'],fingerprint:'synthetic-scoped-registry-v1'}:null};
  const csrfToken=randomBytes(24).toString('hex');
  host=createGalleryModuleManagementHost({sourceWorkshop,targetWorkshop,filename:path.join(directory,'source','workshop.sqlite'),sourceRegistry,
   sourceApproval:()=>({approved:true,reason:'Synthetische Testfreigabe, keine Artwork-Abnahme'}),
   targets:()=>profile?[{...mapping,label:'Demo: vorhandenes Türschild – Logo ausschalten',media:[],mediaRequired:false,moduleUpdate:{id:profile.id,revision:profile.revision,sourceRevision:1}}]:[],
   csrfToken,shopDomain,journalFilename:path.join(directory,'mounted-sync.sqlite'),graphql,executionEnabled:true,writesEnabled:true});
  profile=host.management.profiles.create({name:'Demo Türschild ohne Logo',modules:{options:true,designs:true,text:true,motifs:true,photo:false,logo:false,colors:false}});
  const privateHandler=createGalleryManagementHandler({workshop:sourceWorkshop,templates:host.management.groups,csrfToken,
   synchronizer:{...host.synchronizer,status:input=>({...host.synchronizer.status(input),mode:'test'})}});
  return {directory,host,fixture,profile,csrfToken,counts:()=>({reads,writes}),
   // Existing HTTP surface, explicitly labelled as a local simulated shop.
   handle(req,res,url=new URL(req.url,'http://127.0.0.1')){
    if(url.pathname==='/') {res.writeHead(302,{Location:'/originale/verwaltung#synchronisieren'}).end();return true;}
    return privateHandler(req,res,url);
   },
   close(){host.close();fixture.close();if(path.dirname(directory)!==os.tmpdir()||!path.basename(directory).startsWith('gravuru-module-demo-'))throw Error('Unsafe temporary demo path');fs.rmSync(directory,{recursive:true,force:true});}
  };
 }catch(error){host?.close();fixture?.close();if(path.dirname(directory)===os.tmpdir()&&path.basename(directory).startsWith('gravuru-module-demo-'))fs.rmSync(directory,{recursive:true,force:true});throw error;}
}
