// Existing master configurator and workshop routes, local review database only.
import fs from 'node:fs';
import path from 'node:path';
import {build,OUTPUT} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {createSlateGalleryHandler} from './lib/slate-review-gallery.mjs';
const args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
if(!args.includes('--data'))throw Error('--data fehlt.');
const data=path.resolve(value('--data')),port=Number(args.includes('--port')?value('--port'):8978);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Port.');
build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
const workshop=createWorkshop({filename:path.join(data,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const server=createPreviewServer({workshop});server.on('close',()=>workshop.close());
if(args.includes('--gallery')){
 const gallery=createSlateGalleryHandler(path.resolve(value('--gallery')),path.join(data,'local-review-import.json'),{workshop});
 server.on('close',()=>gallery.close());
 const handlers=server.listeners('request');server.removeAllListeners('request');
 server.on('request',(req,res)=>{if(!gallery(req,res))for(const handle of handlers)handle.call(server,req,res);});
}
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/werkstatt`,live:false})));
