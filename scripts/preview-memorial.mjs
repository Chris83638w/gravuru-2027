// Reproducible, loopback-only Master review. Reads originals; never writes a catalogue or database.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,parseDesignSvg} from '../app/workshop/katalog-convert.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {memorialReviewConfig} from '../app/workshop/memorial-review.mjs';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(0,i),a.slice(i+1)];}));
for(const k of ['--katalog','--surface','--out'])if(!args[k])throw Error(k+'=<Pfad> fehlt.');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),catalog=path.resolve(args['--katalog']),out=path.resolve(args['--out']),port=Number(args['--port']||8160);
const json=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=path.join(repo,'docs/handoffs/konfi-module-20261030/zubehoer');
const image=(file,mime)=>'data:image/'+(mime||(/\.jpg$/.test(file)?'jpeg':/\.webp$/.test(file)?'webp':'png'))+';base64,'+fs.readFileSync(file).toString('base64');
const ids=(args['--designs']||'204,213').split(',');
if(ids.some(n=>!/^\d+$/.test(n)))throw Error('Designnummern ungültig.');
const designs=ids.map(n=>readDesignFolder(path.join(catalog,'designs/gedenktafeln-22x14/GT-S-22x14-D'+n)));
const registry=json(path.join(catalog,'schriften/schriften.json')).fonts,names=[...new Set(designs.flatMap(d=>parseDesignSvg(d.svg()).layers.filter(l=>l.kind==='text').map(l=>l.font)))];
const fonts={},fontEvidence=[];
fs.mkdirSync(out,{recursive:true});
for(const name of names){
 const meta=registry.find(f=>f.name===name);if(!meta?.file)throw Error('Schrift fehlt: '+name);
 const bytes=fs.readFileSync(path.join(catalog,meta.file)),sha=hash(bytes),cache=path.join(out,'font-'+sha+'.json');
 const converted=fs.existsSync(cache)?json(cache):await convertFont(bytes.toString('base64'));
 fonts[name]=converted.font;if(!fs.existsSync(cache))fs.writeFileSync(cache,JSON.stringify(converted));fontEvidence.push({name,sha256:sha});
}
const family=json(path.join(catalog,'familien/schiefer/gedenktafel-22x14-schiefer-natur.json'));
const templates=[],motifs=[],rights={},photoExamples=[],exampleAssets=new Map();
for(const d of designs){
 const converted=katalogDesignToTemplate(d,family,null,{fonts});
 templates.push(converted.template);motifs.push(...converted.motifs);rights[converted.template.id]=converted.rights;
 for(const slot of converted.template.objects.filter(o=>o.type==='photoSlot')){
  const file=path.join(d.dir,slot.id+'.png');if(!fs.existsSync(file))continue;
  const bytes=fs.readFileSync(file),assetId=hash(bytes);photoExamples.push({designId:converted.template.id,slotId:slot.id,assetId});
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  exampleAssets.set('/api/workshop/design-assets/'+assetId+'/preview.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="data:image/png;base64,${bytes.toString('base64')}"/></svg>`);
 }
}
const asset=name=>image(path.join(assets,name));
const optionImages={'mounting:SIL':asset('silikonkleber.png'),'stand:clear':asset('acrylstaender-klar.jpg'),'stand:black':asset('acrylstaender-schwarz.jpg'),protector:asset('gedenktafel-protector.png')},spacerImages={};
for(const [id,file] of [['silver','edelstahl'],['gold','gold'],['bronze','bronze'],['white','weiss'],['black','schwarz']]){
 optionImages['spacer-color:'+id]=asset(id==='black'?'abstandshalter-schwarz-vierergruppe.jpg':'abstandshalter-'+file+'.png');
 if(id!=='black')spacerImages[id]=asset('abstandshalter-'+file+'-oben.png');
}
const config=memorialReviewConfig({family,drawings:json(path.join(repo,'docs/handoffs/design-start-mika/schiefer/konturen-und-loecher.json')),templates,fonts,motifs,rights,optionImages,spacerImages,materialSurface:image(path.resolve(args['--surface'])),photoExamples});
const site=path.join(out,'site');console.log(JSON.stringify(build({outputDirectory:site})));
const indexHtml=fs.readFileSync(path.join(repo,'app/configurator/variant-m/index.html'),'utf8').replaceAll('Dein Acrylglasbild','Deine Gedenktafel').replaceAll('Acrylglasbild gestalten','Gedenktafel gestalten').replace('Gestalte „Unser Anfang“ mit deinem Foto, deinen Worten und deinen Farben.','Gestalte deine Gedenktafel mit deinem Foto und deinen Worten.');
const model=json(path.join(site,'models.json'))[0];model.name=config.profile.name;model.universal=config;model.legacy.designs=config.profile.designs;
fs.writeFileSync(path.join(site,'models.json'),JSON.stringify([model]));
fs.writeFileSync(path.join(out,'source-evidence.json'),JSON.stringify({reviewOnly:true,designs:designs.map(d=>({id:d.id,jsonSha256:hash(fs.readFileSync(d.jsonFile)),svgSha256:hash(fs.readFileSync(d.svgFile))})),fonts:fontEvidence,geometrySource:'docs/handoffs/design-start-mika/schiefer/konturen-und-loecher.json',pricesHidden:true,shopWrites:0},null,2)+'\n');
const server=createPreviewServer({outputDirectory:site}),handler=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',(req,res)=>{if(!['127.0.0.1:'+port,'localhost:'+port].includes(req.headers.host))return res.writeHead(403).end();const origin='http://'+req.headers.host;if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site')return res.writeHead(403).end();const url=new URL(req.url,origin);if(req.method==='GET'&&url.pathname==='/')return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(indexHtml);if(req.method==='GET'&&exampleAssets.has(url.pathname))return res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'private, max-age=3600'}).end(exampleAssets.get(url.pathname));return handler(req,res);});
server.listen(port,'127.0.0.1',()=>console.log('Gedenktafel: http://127.0.0.1:'+port+'/?model=acryl'));
