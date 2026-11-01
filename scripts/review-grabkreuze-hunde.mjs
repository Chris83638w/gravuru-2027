// Nachauftrag #76: one color, one size. Intermediate SVGs never enter catalog.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {targetDesignPreview} from '../app/workshop/design-target-preview.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const cat=process.env.GRAVURU_KATALOG||path.resolve(root,'../grabkreuze-hunde-katalog');
const out=process.env.GRAVURU_DOG_REVIEW||path.resolve(root,'../../outputs/grabkreuze-hunde-nachauftrag');
const reihe='grabkreuze-hunde-11x20';
const list=JSON.parse(fs.readFileSync(path.join(cat,'designs',reihe,'index.json'))).designs;
fs.mkdirSync(path.join(out,'native'),{recursive:true});
const results=[];
for(const {id} of list){
 try{
  const r=await targetDesignPreview(cat,{reihe,id,familie:'grabkreuz-acryl-5mm-schwarz',size:'KZ-A-11x20'});
  if(r.svg)fs.writeFileSync(path.join(out,'native',id+'.svg'),r.svg);
  results.push({id,fit:r.fit,reviewFit:r.reviewFit,nativeGround:r.svg?.includes('data-ground-visible-height="150"')===true,svg:!!r.svg});
  console.log(id,r.fit.status,r.fit.issues.join(' | '));
 }catch(e){results.push({id,error:e.message});console.log(id,e.message);}
}
fs.writeFileSync(path.join(out,'native-pruefung.json'),JSON.stringify(results,null,2));
