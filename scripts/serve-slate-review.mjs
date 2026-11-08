// Existing master configurator and workshop routes, local review database only.
import fs from 'node:fs';
import path from 'node:path';
import {build,OUTPUT} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {createSlateGalleryHandler} from './lib/slate-review-gallery.mjs';
import {loadSlateManagementConfig} from './lib/slate-management-config.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--data'))throw Error('--data fehlt.');
if(args.includes('--management-config')&&(!args.includes('--gallery')||args.filter(a=>a==='--management-config').length!==1||!value('--management-config')||value('--management-config').startsWith('--')))throw Error('--management-config requires --gallery and one explicit local configuration file.');
const data=path.resolve(value('--data')),port=Number(args.includes('--port')?value('--port'):8978);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Port.');
build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
const workshop=createWorkshop({filename:path.join(data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,...(args.includes('--katalog')?{katalogDir:path.resolve(value('--katalog'))}:{})});
const server=createPreviewServer({workshop});server.on('close',()=>workshop.close());
if(args.includes('--gallery')){
 const galleryDirectory=path.resolve(value('--gallery')),importsFile=path.join(data,'local-review-import.json');
 let gallery;
 try{
  const management=await loadSlateManagementConfig(args.includes('--management-config')?value('--management-config'):undefined,{workshop,filename:path.join(data,'workshop.sqlite'),dataDirectory:data,galleryDirectory,importsFile});
  gallery=createSlateGalleryHandler(galleryDirectory,importsFile,{workshop,management});
 }catch(error){workshop.close();throw error;}
 server.on('close',()=>gallery.close());
 const handlers=server.listeners('request');server.removeAllListeners('request');
 server.on('request',(req,res)=>{if(!gallery(req,res))for(const handle of handlers)handle.call(server,req,res);});
}
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/werkstatt`,live:false})));
