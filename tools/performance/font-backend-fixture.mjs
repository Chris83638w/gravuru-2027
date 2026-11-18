// Local disposable catalogue copy. No production connection or publishing.
import fs from 'node:fs';
import path from 'node:path';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
const [catalogArg,portArg='8981']=process.argv.slice(2),port=Number(portArg);
const directory=path.resolve('work/font-backend-browser-'+port),catalog=path.join(directory,'catalog');
const fresh=!fs.existsSync(directory);
if(!fresh&&process.env.GRAVURU_FIXTURE_REUSE!=='1')throw Error('Use a fresh local fixture directory/port, or explicitly reuse this disposable fixture.');
if(fresh){
fs.mkdirSync(directory,{recursive:true});fs.cpSync(new URL('../../app/workshop/fixtures/katalog/',import.meta.url),catalog,{recursive:true});
const metadataFile=path.join(catalog,'schriften/schriften.json'),metadata=JSON.parse(fs.readFileSync(metadataFile)),source=JSON.parse(fs.readFileSync(path.join(catalogArg,'schriften/schriften.json')));
for(const font of metadata.fonts){const real=source.fonts.find(f=>f.name===font.name);if(!real?.file)throw Error('Missing real font '+font.name);const target=path.join(catalog,real.file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(catalogArg,real.file),target);font.file=real.file;}
fs.writeFileSync(metadataFile,JSON.stringify(metadata));
}
build({outputDirectory:path.join(directory,'build')});const seed=JSON.parse(fs.readFileSync(path.join(directory,'build/models.json')))[0];
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,katalogDir:catalog});
const server=createPreviewServer({outputDirectory:path.join(directory,'build'),workshop});
if(process.env.GRAVURU_FIXTURE_TRACE==='1')server.prependListener('request',(req,res)=>res.on('finish',()=>{if(res.statusCode>=400)console.log(JSON.stringify({path:req.url,host:req.headers.host,origin:req.headers.origin,site:req.headers['sec-fetch-site'],status:res.statusCode}));}));
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+port+'/werkstatt/schriftgruppen/',directory,catalog})));
process.on('SIGINT',()=>server.close(()=>{workshop.close();process.exit(0);}));
