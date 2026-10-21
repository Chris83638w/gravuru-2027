import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const runtime=fileURLToPath(new URL('../designs/aosu-labrador/runtime/',import.meta.url));
let loaded,resources;
export function workshopCatalog(localResources={}){
  if(!loaded){
    const manifest=JSON.parse(fs.readFileSync(path.join(runtime,'gravuru-catalog-51fa7e857d52.json'),'utf8'));
    const catalog=JSON.parse(manifest.parts.map(name=>fs.readFileSync(path.join(runtime,name),'utf8')).join(''));
    const decode=kind=>JSON.parse(gunzipSync(Buffer.from(fs.readdirSync(runtime).filter(name=>new RegExp('^gravuru-entwurf-'+kind+'-[0-9]+\\.txt$').test(name)).sort().map(name=>fs.readFileSync(path.join(runtime,name),'utf8')).join(''),'base64')).toString('utf8'));
    const extraFonts=decode('fonts'),motifs=decode('motive');
    resources={fonts:{...catalog.fonts,...extraFonts},motifs:[...Object.entries(catalog.motifs).map(([key,svgFragment])=>({key,svgFragment,bounds:catalog.motif_bounds[key]})),...motifs]};
    loaded={fonts:[...new Set([...Object.keys(catalog.fonts),...Object.keys(extraFonts)])].map(id=>({id,name:id})),motifs:[...Object.keys(catalog.motifs).map(id=>({id,name:({paw:'Pfote',dog:'Hund',heart:'Herz',rainbow:'Regenbogen',star:'Stern',house:'Haus'})[id]||id})),...motifs.map(m=>({id:m.key,name:m.name}))]};
  }
  const unique=items=>[...new Map(items.map(item=>[item.id,item])).values()];
  return {fonts:unique([...loaded.fonts,...Object.keys(localResources.fonts||{}).map(id=>({id,name:id}))]),motifs:unique([...loaded.motifs,...(localResources.motifs||[]).filter(m=>!m.embeddedOnly&&localResources.motive_in_bibliothek!==false).map(m=>({id:m.key,name:m.name}))])};
}
export function workshopResources(local={}){workshopCatalog();return {fonts:{...resources.fonts,...local.fonts},motifs:[...resources.motifs,...(local.motifs||[])]};}
