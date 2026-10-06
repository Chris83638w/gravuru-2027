// Isolated synthetic fixtures. Never open the application's existing database.
import fs from 'node:fs';import path from 'node:path';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {makeFormProduct} from '../../app/workshop/form-product.mjs';
import {addFormDesign} from '../../app/workshop/form-designs.mjs';
const directory=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-flow-only')))throw Error('Fresh synthetic test directory required.');
if(fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Refusing to reuse any database.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy}),masters=[];
for(const [width,height,material,name] of [[120,80,'acrylic-clear','Acryl-Master'],[160,100,'oak','Eichen-Master']]){
 const contour=await workshop.contours.import({name:'Testkontur.svg',bytes:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="5"/><circle cx="8" cy="${height/2}" r="2"/><circle cx="${width-8}" cy="${height/2}" r="2"/></svg>`).toString('base64')});
 const asset=await workshop.assets.import({name:'Testdesign.svg',bytes:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><path d="M25 45L${width/2} 15L${width-25} 45M35 45V${height-12}H${width-35}V45" fill="none" stroke="black" stroke-width="1"/></svg>`).toString('base64')});
 const d=addFormDesign(makeFormProduct(contour,name),asset,{name:'Unser Zuhause',designId:'home'});d.kind='master';d.material={id:material,thicknessMm:3,surfaceNotes:'Synthetische Prüfdaten'};d.basePriceCents=1499;d.processingMethod=material==='oak'?'engraving':'print';d.presentation={scene:'studio'};d.designs[0].sourcePrepared=true;
 d.designs[0].fields=[{id:'name',type:'text',label:'Dein Name',xMm:30,yMm:48,widthMm:60,heightMm:10,text:'Mustername',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:true,allowScale:true,allowDelete:true,allowColor:true}];
 const r=workshop.repository.create(d);masters.push({id:r.id,revision:r.revision,width,height,material,method:d.processingMethod});
}
const server=createPreviewServer({workshop,outputDirectory:directory});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,masters,built})));
process.on('SIGTERM',()=>server.close(()=>{workshop.close();process.exit(0);}));
