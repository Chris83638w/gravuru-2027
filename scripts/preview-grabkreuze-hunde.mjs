// Review artifacts only: real target renderer, with an explicit viewport crop.
// Does NOT claim to install ground exclusion in the live customer editor.
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
   fs.writeFileSync(path.join(dir,id+'-voll.svg'),r.svg);
   const pad=4,h=size.heightMm-50,w=size.widthMm;
   const inner=r.svg.replace(/^<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w+2*pad} ${h+2*pad}" data-review-viewport="ground-50mm"><defs><clipPath id="ground-review-clip"><rect x="${-pad}" y="${-pad}" width="${w+2*pad}" height="${h+pad}"/></clipPath></defs><g clip-path="url(#ground-review-clip)">${inner}</g></svg>`;
   fs.writeFileSync(path.join(dir,id+'.svg'),svg);
   result.push({id,color,size:size.key,status:r.fit.status,issues:r.fit.issues,visibleHeightMm:h,viewportCropOnly:true});
  }
 }
}
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify({renderer:'targetDesignPreview',customerGroundExclusionImplemented:false,previews:result},null,2));
console.log(`${result.length} native Vorschauen; Erdteil nur im Prüf-Viewport ausgeblendet.`);
