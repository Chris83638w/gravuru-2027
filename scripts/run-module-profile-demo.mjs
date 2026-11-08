// Isolated, loopback-only acceptance environment. Never reads live databases.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {moduleProfileTestSource} from '../app/workshop/test-fixtures/module-profile-source.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),directory=path.join(root,'.local-data','module-profile-demo');
const outputDirectory=path.join(directory,'preview'),port=Number(process.env.GRAVURU_MODULE_DEMO_PORT||8218);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local demo port');
build({outputDirectory});
const seed=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json'),'utf8'))[0];
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:null});
if(!workshop.repository.moduleSources().length)workshop.repository.create(moduleProfileTestSource());
const server=createPreviewServer({outputDirectory,workshop});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${port}/werkstatt/module/`,scope:'isolated-local-test',shopifyWrites:0})));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{workshop.close();process.exit(0);}));
