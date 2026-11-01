// Native target renderer, including the shared customer ground restriction.
// Local review artifacts; no live deployment or product approval.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {targetDesignPreview} from '../app/workshop/design-target-preview.mjs';
import {validateFamily} from '../app/workshop/product-families.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cat=path.resolve(root,'../grabkreuze-hunde-katalog');
const reihe='grabkreuze-hunde-11x20',out=path.join(cat,'auftraege/2026-11-01-grabkreuze-hunde/vorschau');
fs.mkdirSync(out,{recursive:true});
const ids=fs.readdirSync(path.join(cat,'designs',reihe)).filter(id=>fs.existsSync(path.join(cat,'designs',reihe,id,'design.json')));
const result=[];
for(const color of ['schwarz','anthrazit']){
 const fid='grabkreuz-acryl-5mm-'+color;
 const family=validateFamily(JSON.parse(fs.readFileSync(path.join(cat,'familien/acryl',fid+'.json'))));
 for(const size of family.sizes){
  const dir=path.join(out,color+'-'+size.key);fs.mkdirSync(dir,{recursive:true});
  for(const id of ids){
   const r=await targetDesignPreview(cat,{reihe,id,familie:fid,size:size.key});
   if(!r.svg||r.fit.status==='passt nicht')throw Error(id+': '+JSON.stringify(r.fit));
   const h=size.heightMm-family.groundInsertion.depthMm;
   if(!r.svg.includes(`data-ground-visible-height="${h}"`))throw Error('Native Erdteilansicht fehlt.');
   fs.writeFileSync(path.join(dir,id+'.svg'),r.svg);
   result.push({id,color,size:size.key,status:r.fit.status,issues:r.fit.issues,visibleHeightMm:h,viewportCropOnly:false});
  }
 }
}
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify({renderer:'targetDesignPreview',customerGroundExclusionImplemented:true,liveDeployment:false,previews:result},null,2));
console.log(`${result.length} native Vorschauen mit gemeinsamer Erdteilsperre; keine Live-Veröffentlichung.`);
