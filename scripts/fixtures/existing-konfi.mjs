// Existing acrylic configurator only, with a disposable synthetic workshop product.
import fs from 'node:fs';import path from 'node:path';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
const directory=path.resolve(process.argv[2]||'');if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-konfi-only'))||fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh marked fixture required.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0],workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const record=workshop.repository.copy(workshop.defaultId,{expectedRevision:1,name:'Konfi-Anbindung · Prüfmuster',kind:'product'}),design=record.document.config.profile.designs.find(d=>d.id===record.document.config.profile.defaultDesignId),text=design.objects.find(o=>o.type==='text'&&!o.technicalLocked);
const server=createPreviewServer({workshop,outputDirectory:directory});server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,id:record.id,designId:design.id,objectId:text.id,built})));
process.on('SIGTERM',()=>server.close(()=>{workshop.close();process.exit(0);}));
