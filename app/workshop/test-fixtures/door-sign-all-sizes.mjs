// Gemeinsame Testvorlage (Auftrag #265): Türschild Edelstahl als ein Produkt mit allen Größen.
// Echte Katalogmaße und -preise aus steel.json, drei Formate, je zwei Designs. Keine Kundendaten.
import fs from 'node:fs';
import {familyProductConfig} from '../product-families.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {prepareConfig} from '../../configurator/variant-m/contract.mjs';
import {FAMILY_FORMATS_SCHEMA} from '../../configurator/variant-m/family-formats.mjs';

// Gleiche Vorlage wie shop-design-gallery-alle.test.mjs: echte Katalogmaße und -preise, drei Formate, je zwei Designs.
export function doorSignConfig(){
 const f=JSON.parse(fs.readFileSync(new URL('./acryl3-rear/steel.json',import.meta.url))),formats=[],designs=[];let c;
 const chosen=f.sizes.filter((s,i,list)=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80||list.findIndex(a=>a.groupKey===s.groupKey)===i).slice(0,3);
 for(const s of chosen){
  const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},n=familyProductConfig(view,s,1),p=n.profile;
  if(!c||s.groupKey==='AB'&&s.widthMm===120)c=n;
  const ids=[];
  for(const k of [1,2]){const d=structuredClone(p.designs[0]);d.id='ts-'+s.key+'-'+k;d.name='Design '+k;d.themes=['familienschilder'];d.katalog={designId:'TS-'+s.groupKey+'-D'+k,plateMm:[s.widthMm,s.heightMm]};const o=d.objects[0];Object.assign(o,{text:'Name '+k,fieldKey:'name',size:3.2,x:s.widthMm/2,y:s.heightMm/2});measureText(o,n.localResources.fonts);designs.push(d);ids.push(d.id);}
  formats.push({key:s.key,form:s.groupKey,label:s.label,geometry:structuredClone(p.geometry),variants:[{color:'steel',familyId:f.id,sizeKey:s.key,basePriceCents:s.baseCents,material:p.material,mounting:p.optionGroups[0].values,designIds:ids}]});
 }
 const start=formats.find(s=>s.form==='AB')||formats[0];
 c.familyFormats={schema:FAMILY_FORMATS_SCHEMA,defaultSize:start.key,defaultColor:'steel',colors:[{id:'steel',label:'steel'}],formats,designs,source:{shopProduct:{sizeKey:start.key,themeId:'familienschilder',defaultDesignId:designs.find(d=>start.variants[0].designIds.includes(d.id)).katalog.designId,groessenWahl:'alle'}}};
 c.profile.themeId='familienschilder';c.profile.defaultDesignId=start.variants[0].designIds[0];
 c.profile.optionGroups=[{id:'size',name:'Form & Größe',required:true,defaultValueId:start.key,values:formats.map(s=>({id:s.key,label:s.label,priceCents:0,currency:'EUR'}))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne',priceCents:0,currency:'EUR'}]}];
 c.workshopElementRights=Object.fromEntries(designs.map(d=>[d.id,{[d.objects[0].id]:{content:true,move:true,scale:true,delete:true}}]));
 delete c.familyAcrylic;return prepareConfig(c);
}
// Servermodell wie in der Werkstatt: Produktstand, Universalmodell und das alte Profil.
export function doorSignModel(){
 const full=doorSignConfig();
 return {key:'acryl',name:'Türschild Edelstahl',configuration:{id:'cfg_ts',revision:1},universal:full,legacy:{designs:structuredClone(full.profile.designs),defaultDesignId:full.profile.defaultDesignId}};
}

// Familie mit fester Größe (Auftrag #265, 20.11.2026): ein Format, `count` freigegebene Designs, wie das Acrylglas-Schild
// 12 × 8 cm im Shop. Aus derselben Katalogvorlage wie oben abgeleitet, damit Maße, Preis und Befestigung echt bleiben.
export function fixedSignConfig(count=4){
 const c=structuredClone(doorSignConfig()),f=c.familyFormats,format=f.formats.find(s=>s.key===f.defaultSize),variant=format.variants[0];
 const template=f.designs.find(d=>d.id===variant.designIds[0]),designs=[];
 for(let k=1;k<=count;k++){const d=structuredClone(template);d.id='fs-'+k;d.name='Design '+k;d.katalog={...d.katalog,designId:'FS-D'+k};d.objects[0].text='Name '+k;measureText(d.objects[0],c.localResources?.fonts||{});designs.push(d);}
 variant.designIds=designs.map(d=>d.id);
 c.familyFormats={...f,fixedSize:format.key,defaultSize:format.key,formats:[format],designs,source:{shopProduct:{sizeKey:variant.sizeKey,themeId:'familienschilder',defaultDesignId:'FS-D1'}}};
 c.profile.designs=structuredClone(designs);c.profile.defaultDesignId='fs-1';c.profile.themeId='familienschilder';
 c.profile.optionGroups=c.profile.optionGroups.filter(g=>g.id!=='size');
 c.workshopElementRights=Object.fromEntries(designs.map(d=>[d.id,{[d.objects[0].id]:{content:true,move:true,scale:true,delete:true}}]));
 return prepareConfig(c);
}
export function fixedSignModel(count=4){
 const full=fixedSignConfig(count);
 return {key:'acryl',name:'Familienschild feste Größe',configuration:{id:'cfg_fs',revision:1},universal:full,legacy:{designs:structuredClone(full.profile.designs),defaultDesignId:full.profile.defaultDesignId}};
}
