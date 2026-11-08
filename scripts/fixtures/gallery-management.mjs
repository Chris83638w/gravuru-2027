// Isolated application fixture: real native repository, catalogue, gallery and
// HTTP routes. These products and option labels are test data, not offers.
import fs from 'node:fs';
import path from 'node:path';
import {build,OUTPUT} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {galleryEditorDocument} from './gallery-editor.mjs';
import {createSlateGalleryHandler} from '../lib/slate-review-gallery.mjs';
export async function createGalleryManagementFixture(root,{syncFactory,extraDocument,managementFactory}={}){
 if(!fs.existsSync(path.join(OUTPUT,'models.json')))build();
 fs.mkdirSync(root,{recursive:true});
 const catalog=path.join(root,'catalogue'),pack=path.join(root,'package'),filename=path.join(root,'workshop.sqlite');
 if(fs.existsSync(filename)||fs.existsSync(catalog))throw Error('Fixture needs a new empty directory');
 fs.cpSync(new URL('../../app/workshop/fixtures/katalog/',import.meta.url),catalog,{recursive:true});
 const familyFile=path.join(catalog,'familien','edelstahl','test-schilder.json'),testFamily=JSON.parse(fs.readFileSync(familyFile));
 testFamily.name='Test-Schieferschilder (Fixture)';testFamily.material={kind:'slate',label:'Schiefer',thicknessMm:5,processingProfileId:'slate-engraving'};
 fs.writeFileSync(familyFile,JSON.stringify(testFamily));
 fs.mkdirSync(pack,{recursive:true});
 const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
 const workshop=createWorkshop({filename,katalogDir:catalog,seedConfig:seed.universal,legacy:seed.legacy});
 const products=[];
 for(const [width,height]of [[220,140],[300,200]]){
  const d=galleryEditorDocument({width,height}),p=d.config.profile;
  d.config.basePriceCents=width===300?2499:1999;
  d.name=`Testgruppe · ${width/10} × ${height/10} cm`;p.designs=p.designs.slice(0,1);
  delete d.elementRights['source-b'];
  p.designs[0].katalog.target.familyId='test-schilder';
  p.optionGroups.push({id:'test-accessory',name:'Test-Zubehör',required:true,defaultValueId:'none',values:[{id:'none',label:'Kein Testextra',priceCents:0,currency:'EUR'},{id:'extra',label:'Testextra',priceCents:250,currency:'EUR'}]});
  p.optionFields=[{id:'test-note',kind:'text',label:'Testangabe',required:false,maxLength:80,priceCents:0}];
  const record=workshop.repository.create(d),key=`fixture-${width}x${height}`;
  products.push({key,sizeKey:`TEST-${width}X${height}`,mm:[width,height],record});
 }
 const originalId='TRE-V2A-8x3,5-D1';
 const rows=products.map(p=>({key:p.key,productId:p.record.id,designIds:[originalId],reviewOnly:true}));
 const originals=[{id:originalId,group:'Tiere',subcategory:'Hund',process:'Gravur',photoSlots:0,files:[],targets:products.map(p=>({productKey:p.key,nativeDesignId:'source-a',sizeKey:p.sizeKey,mm:p.mm,status:'prepared'}))}];
 let extraSource=null;
 if(extraDocument){
  extraSource=workshop.repository.create(extraDocument);
  const p=extraSource.document.config.profile,d=p.designs.find(d=>d.id===p.defaultDesignId),original=d.katalog?.designId||d.id;
  rows.push({key:'fixture-extra',productId:extraSource.id,designIds:[original],reviewOnly:true});
  originals.push({id:original,group:'Menschen',subcategory:'Allgemein',process:'Gravur',photoSlots:0,files:[],reviewMaterial:{key:'steel',kind:'steel',label:'Edelstahl'},targets:[{productKey:'fixture-extra',nativeDesignId:d.id,sizeKey:'TEST-EXTRA',mm:[p.geometry.width,p.geometry.height],status:'prepared'}]});
 }
 const manifest={schema:'gravuru-design-original-review/v1',reviewOnly:true,released:false,
  originals,
  products:rows.map(({productId,...p})=>p)};
 fs.writeFileSync(path.join(pack,'manifest.json'),JSON.stringify(manifest));
 const importsFile=path.join(root,'local-review-import.json');
 fs.writeFileSync(importsFile,JSON.stringify({localOnly:true,published:false,shopifyWrites:0,products:rows}));
 const sync=syncFactory?await syncFactory({root,workshop,source:products[0].record,extraSource,originalId}):null;
 const configured=managementFactory?await managementFactory({workshop,filename,root,galleryDirectory:pack,importsFile,extraSource}):{};
 const gallery=createSlateGalleryHandler(pack,importsFile,{workshop,management:{filename,...(sync?{synchronizer:({sourceApproval})=>sync.service(sourceApproval)}:{}),...configured}});
 const server=createPreviewServer({workshop}),handlers=server.listeners('request');server.removeAllListeners('request');
 server.on('request',(req,res)=>{if(!gallery(req,res))for(const handle of handlers)handle.call(server,req,res);});
 return {root,filename,workshop,products,originalId,sync,server,
  async listen(port=0){await new Promise(r=>server.listen(port,'127.0.0.1',r));return 'http://127.0.0.1:'+server.address().port;},
  async close(){server.closeAllConnections();await new Promise(r=>server.close(r));gallery.close();sync?.close?.();workshop.close();}};
}
