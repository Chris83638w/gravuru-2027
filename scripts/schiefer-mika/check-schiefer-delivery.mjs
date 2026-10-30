import fs from 'node:fs';import path from 'node:path';import {pathToFileURL,fileURLToPath} from 'node:url';
const workspace=process.env.GRAVURU_PROJECT_ROOT||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const root=path.join(workspace,'outputs/schiefer-alle-groessen');
const {parseDesignSvg}=await import(pathToFileURL(path.join(workspace,'Produkte-Design/gravuru-2027-neu/app/workshop/katalog-convert.mjs')));
const masters=JSON.parse(fs.readFileSync(path.join(root,'master-index.json'))),errors=[];
for(const m of masters){try{const svg=fs.readFileSync(path.join(m.path,'design.svg'),'utf8');const parsed=parseDesignSvg(svg);const layers=parsed.layers;if(layers.length>20)throw Error(layers.length+' Ebenen, höchstens 20');if(layers.some(l=>l.kind==='foto'))throw Error('Fotoebene');}catch(e){errors.push({id:m.designId,group:m.group,error:e.message});}}
fs.writeFileSync(path.join(root,'lieferform-pruefung.json'),JSON.stringify({checked:masters.length,errors},null,2));console.log('Lieferform2',masters.length,'Fehler',errors.length);for(const e of errors.slice(0,20))console.log(e);
