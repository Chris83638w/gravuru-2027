import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {build} from '../../../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../../../app/configurator/variant-m/server.mjs';
const dir=path.resolve(process.argv[2]),output=path.join(dir,'native-preview');
build({outputDirectory:output});const seed=JSON.parse(fs.readFileSync(path.join(output,'models.json')))[0];
const configs=JSON.parse(fs.readFileSync(path.join(dir,'visual-configs.json')));
const workshop={model:id=>{const universal=configs[id]||Object.values(configs)[0],legacy=structuredClone(seed.legacy);legacy.designs=universal.profile.designs;return {key:'acryl',name:universal.profile.name,legacy,universal};},handle:(_req,res)=>res.writeHead(404).end()};
createPreviewServer({outputDirectory:output,workshop}).listen(8192,'127.0.0.1',()=>console.log('http://127.0.0.1:8192/'));
