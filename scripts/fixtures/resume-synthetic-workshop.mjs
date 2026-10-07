// Resume only the marked, temporary database of the Excel browser fixture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';

const directory=fs.realpathSync(process.argv[2]||'.');
if(path.dirname(directory)!==fs.realpathSync(os.tmpdir())||!path.basename(directory).startsWith('g27-saved-excel-')||!fs.existsSync(path.join(directory,'synthetic-flow-only')))throw Error('Marked temporary Excel fixture required.');
const previous=JSON.parse(fs.readFileSync(path.join(directory,'ready.json')));
const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const server=createPreviewServer({workshop,outputDirectory:directory});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'resumed.json'),JSON.stringify({...previous,url:'http://127.0.0.1:'+server.address().port})));
process.on('SIGTERM',()=>server.close(()=>{workshop.close();process.exit(0);}));
