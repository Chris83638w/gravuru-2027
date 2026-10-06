// Disposable synthetic products. Does not open or migrate an existing database.
import fs from 'node:fs';import path from 'node:path';import {randomBytes} from 'node:crypto';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {makeFormProduct} from '../../app/workshop/form-product.mjs';
import {addFormDesign} from '../../app/workshop/form-designs.mjs';
const directory=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-completion-only'))||fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh marked test directory required.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const webhook={shopDomain:'gravuru-synthetic.myshopify.com',apiVersion:'2026-07',secret:randomBytes(32).toString('hex')};
const w=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:webhook}),products=[];
for(const [width,material,method,price] of [[120,'acrylic-clear','print',1499],[160,'oak','engraving',2499]]){
 const contour=await w.contours.import({name:'Testkontur.svg',bytes:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="80mm" viewBox="0 0 ${width} 80"><path d="M5 0H${width-5}L${width} 5V75L${width-5} 80H5L0 75V5Z"/><circle cx="8" cy="40" r="2"/></svg>`).toString('base64')});
 const asset=await w.assets.import({name:'Farbdesign.svg',bytes:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="80mm" viewBox="0 0 ${width} 80"><path d="M15 10H${width-15}" stroke="#b56a42" stroke-width="2"/></svg>`).toString('base64')});
 let d=addFormDesign(makeFormProduct(contour,material==='oak'?'Eiche · Zuhause':'Acryl · Zuhause'),asset,{name:'Erinnerung',designId:'memory'});d.kind='product';d.material={id:material,thicknessMm:3,surfaceNotes:'Synthetisches Prüfmuster'};d.basePriceCents=price;d.processingMethod=method;d.presentation={scene:'studio'};d.designs[0].sourcePrepared=true;d.designs[0].additions={text:true,motifs:true,maxElements:8};
 d.designs[0].fields=[{id:'name',type:'text',label:'Dein Name',xMm:20,yMm:18,widthMm:75,heightMm:12,text:'Unser Zuhause',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:true,allowScale:true,allowDelete:true,allowColor:true},...(method==='print'?[{id:'photo',type:'photo',label:'Dein Foto',xMm:40,yMm:40,widthMm:40,heightMm:25,shape:'rect',required:true,allowMove:false,allowScale:false,allowDelete:false}]:[])];
 if(method==='print'){d=addFormDesign(d,asset,{name:'Pur',designId:'plain'});d.designs[1].sourcePrepared=true;}
 const r=w.repository.create(d);products.push({id:r.id,revision:r.revision,material,method,price,width});
}
const group=w.variants.create({name:'Zuhause · Materialauswahl',defaultVariantId:'acryl',archived:false,variants:products.map((r,i)=>({id:i?'oak':'acryl',label:i?'Eiche · 160 × 80 mm':'Acryl · 120 × 80 mm',productId:r.id,productRevision:r.revision}))});
const server=createPreviewServer({workshop:w,outputDirectory:directory});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,products,group:{id:group.id,revision:group.revision},built,webhook}),{mode:0o600}));
process.on('SIGTERM',()=>server.close(()=>{w.close();process.exit(0);}));
