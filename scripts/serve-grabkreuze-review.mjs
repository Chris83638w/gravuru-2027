// Isolated local customer editor with catalogue examples. No shop or database writes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createPreviewServer} from '../app/configurator/variant-m/server.mjs';
import {katalogFor} from '../app/workshop/design-dashboard.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {katalogDesignToTemplate,parseDesignSvg,scaleTemplate,scaleEmbeddedMotifs} from '../app/workshop/katalog-convert.mjs';
import {prepareConfig} from '../app/configurator/variant-m/contract.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),cat=path.resolve(root,'../grabkreuze-hunde-katalog');
const outputDirectory=path.resolve(root,'../../outputs/grabkreuze-hunde-20261101/kundeneditor');
build({outputDirectory});
const seed=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json')))[0],katalog=katalogFor(cat,{maxAgeMs:0});
const masters=katalog.designs.masters.filter(d=>d.seriesFolder==='grabkreuze-hunde-11x20');
const names=[...new Set(masters.flatMap(d=>parseDesignSvg(d.svg()).layers.filter(l=>l.kind==='text').map(l=>l.font)))];
const {fonts,missing}=await katalog.fontResources(names,{converter:convertFont});if(missing.length)throw Error('Schriften fehlen: '+missing.join(', '));
const models=new Map();
for(const color of ['schwarz','anthrazit']){
 const family=katalog.families.get('grabkreuz-acryl-5mm-'+color);
 for(const size of family.sizes){
  const c=familyProductConfig(family,size,1),designs=[],motifs=[];
  for(const master of masters){
   const converted=katalogDesignToTemplate(master,family,katalog.theme(master.themes?.[0]),{fonts});
   const d=scaleTemplate(converted.template,master.plateMm,[size.widthMm,size.heightMm],fonts,{contain:true});
   designs.push(d);motifs.push(...scaleEmbeddedMotifs(converted.motifs,d.katalog.scale));
  }
  c.profile.designs=designs;c.profile.defaultDesignId=designs.find(d=>d.id.endsWith('-d100'))?.id||designs[0].id;
  c.localResources={...c.localResources,fonts,motifs};c.extraMotifCents=169;
  models.set(color+'-'+size.key,{...seed,name:family.name+' · '+size.label,universal:prepareConfig(c)});
 }
}
fs.writeFileSync(path.join(outputDirectory,'models.json'),JSON.stringify([models.values().next().value]));
const workshop={defaultId:'schwarz-KZ-A-11x20',model:id=>{const m=models.get(id);if(!m)throw Error('Unbekannte Prüfgröße.');return m;},handle:(_req,res)=>res.writeHead(404).end()};
const server=createPreviewServer({outputDirectory,workshop});
if(process.env.REVIEW_HTTP_DEBUG==='1')server.prependListener('request',req=>console.log(JSON.stringify({path:req.url,host:req.headers.host,origin:req.headers.origin,site:req.headers['sec-fetch-site']})));
server.listen(Number(process.env.PORT||8736),'127.0.0.1',()=>console.log('Lokale Hunde-Prüfung: http://127.0.0.1:'+server.address().port+'/?configuration=schwarz-KZ-A-11x20'));
