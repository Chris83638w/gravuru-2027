import fs from 'node:fs';
import {prepareConfig} from '../configurator/variant-m/contract.mjs';
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {workshopResources} from './catalog.mjs';
import {validateSteelFormats} from '../configurator/variant-m/steel-formats.mjs';

const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const original=read('../references/aosu-upgrade-2026-09-21/verification/profile-source.json');
const geometry={...original.geometry,shape:'rect',cornerRadiusMm:0,safeMarginMm:10,holes:[]};
const images=new Map();
const image=name=>images.get(name)||images.set(name,readImage(name)).get(name);
const readImage=name=>'data:image/png;base64,'+fs.readFileSync(new URL('../designs/aosu-labrador/runtime/images/'+name,import.meta.url)).toString('base64');
const fail=message=>{throw Error(message);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const validCents=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
export function nativeSpecimenConfig(input){
 const c=structuredClone(input),p=c.profile;
 if(c.reviewOnly!==true||p.binding?.kind!=='local-review'||p.features?.orderEnabled!==false||p.features?.productionConfirmed!==false)fail('Wiederhergestellte Muster bleiben ohne Shop- oder Fertigungsfreigabe.');
 if(c.acrylic||!validCents(c.basePriceCents)||!validCents(c.extraMotifCents)||!validCents(c.photo?.extraPriceCents)||!Number.isSafeInteger(c.photo?.includedCount)||c.photo.includedCount<0||c.photo.includedCount>4)fail('Vollständige Musterpreise fehlen.');
 if(c.doorbell){
  if(!equal(c.doorbell,{schema:'gravuru-aosu-specimen/v1'})||p.kind!=='layered-doorbell'||!equal(p.geometry,geometry)||p.material?.kind!=='acrylic'||p.material.thicknessMm!==3||p.processing?.profileId!=='acrylic-engraving')fail('Die erhaltene AOSU-Modellgeometrie darf nicht ersetzt werden.');
  for(const key of ['frames','materials','mounting','manufacturing'])if(!equal(p[key],original[key]))fail('AOSU: technische Originalzuordnung verändert: '+key);
  if(!equal(p.admin,{imageUrl:image('aosu-pro-v8p1ax11.png'),steelImageUrl:image('gravuru-edelstahl-feine-maserung-vorschau.png')}))fail('AOSU: Original-Vorschaubilder fehlen.');
  const choices={frame:p.frames.map(v=>v.key),color:p.materials.acrylic.colors.map(v=>v.key),mounting:p.mounting.options.map(v=>v.key)};
  if(p.optionGroups.length!==3||p.optionGroups.some(g=>!choices[g.id]||!equal(g.values.map(v=>v.id),choices[g.id])))fail('AOSU: Originalausführungen fehlen.');
 }else {
  if(p.kind!=='universal-product'||p.material?.kind!=='steel'||p.material.thicknessMm!==1.5||p.processing?.profileId!=='steel-engraving'||!['rect','ellipse','contour'].includes(p.geometry?.shape)||!Array.isArray(p.optionGroups)||p.optionGroups.length!==(c.steelFormats?2:1)||p.optionGroups.some(g=>!['mounting',...(c.steelFormats?['size']:[])].includes(g.id)))fail('Edelstahlschild benötigt eine native Kontur und vollständige Ausführungen.');
  validateSteelFormats(c);
 }
 if(!p.designs?.some(d=>d.id===p.defaultDesignId))fail('Das Standarddesign fehlt.');
 for(const d of p.designs)for(const o of d.objects)if(o.type==='text')measureText(o,c.localResources.fonts);
 const validated=prepareConfig(c);
 if(validated.profile.designs.length!==p.designs.length)fail('Eine Originalvorlage widerspricht der Fotofreigabe.');
 return validated;
}
// Shared neutral steel preview surface (preview only, never production data).
export const steelPreviewSurface=()=>image('gravuru-edelstahl-feine-maserung-vorschau.png');
function common(profile,resources){return {reviewOnly:true,basePriceCents:0,extraMotifCents:0,logo:{enabled:false},photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},localResources:resources,profile};}
async function importedMotif(assets,motif){
 if(!assets)fail('Musterübernahme benötigt die geschützte Ressourcenablage.');
 const [x,y,w,h]=motif.bounds;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="${x} ${y} ${w} ${h}">${motif.svgFragment}</svg>`;
 const asset=await assets.import({name:motif.key+'.svg',bytes:Buffer.from(svg).toString('base64')});
 return assets.resource(asset.assetId);
}
export async function aosuSpecimen(assets){
 const p=structuredClone(original),design=read('../designs/aosu-labrador/design.json'),fonts=read('../designs/aosu-labrador/assets/michroma-vectors.json'),motif=read('../designs/aosu-labrador/motif.json');
 p.name='AOSU-Klingelschild · Labrador';p.geometry=structuredClone(geometry);p.designs=[design];p.defaultDesignId=design.id;
 p.binding={kind:'local-review',productId:'local-aosu-labrador'};p.features={...p.features,orderEnabled:false,productionConfirmed:false};
 p.material={kind:'acrylic',color:'#17191b',thicknessMm:3};p.processing={profileId:'acrylic-engraving'};
 p.admin={imageUrl:image('aosu-pro-v8p1ax11.png'),steelImageUrl:image('gravuru-edelstahl-feine-maserung-vorschau.png')};
 for(const v of p.purchasing.variants)v.variantId=null;
 const value=(id,label,priceCents=0)=>({id,label,priceCents,currency:'EUR'});
 p.optionGroups=[{id:'frame',name:'Rahmen',required:true,defaultValueId:'FK-RUNDUM',values:p.frames.map(v=>value(v.key,v.name))},{id:'color',name:'Acrylglasfarbe',required:true,defaultValueId:'schwarz',values:p.materials.acrylic.colors.map(v=>value(v.key,v.name))},{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:p.mounting.options.map(v=>value(v.key,v.name,v.surchargeCents))}];
 const imported=await importedMotif(assets,motif);design.objects.find(o=>o.type==='motif').motif=imported.key;
 const c=common(p,{scope:'local-review-only',fonts,motifs:[imported]});c.doorbell={schema:'gravuru-aosu-specimen/v1'};c.basePriceCents=p.purchasing.basePriceCents;
 return nativeSpecimenConfig(c);
}
export async function steelSpecimen(assets){
 const source=read('../designs/steel-heimathafen/source.json'),g=source.product,all=workshopResources();
 const designs=source.designs.map(d=>({id:d.id,name:d.title,objects:structuredClone(d.state.objects),marks:[]}));
 const fonts=Object.fromEntries([...new Set(designs.flatMap(d=>d.objects.filter(o=>o.type==='text').map(o=>o.font)))].map(id=>[id,all.fonts[id]]));
 const motifs=[...new Set(designs.flatMap(d=>d.objects.filter(o=>o.type==='motif').map(o=>o.motif)))].map(id=>all.motifs.find(m=>m.key===id));
 if(motifs.some(m=>!m)||Object.values(fonts).some(f=>!f))fail('Ein erhaltenes Heimathafen-Motiv oder eine Schrift fehlt.');
 const profile={id:'steel-heimathafen',revision:'recovered-20261011',schemaVersion:1,kind:'universal-product',name:'Edelstahlschild · Heimathafen',binding:{kind:'local-review',productId:'local-steel-heimathafen'},geometry:{width:g.widthMm,height:g.heightMm,shape:g.shape,cornerRadiusMm:g.cornerRadiusMm,safeMarginMm:0,holes:[]},material:{kind:'steel',color:'#bac2c4',thicknessMm:1.5},processing:{profileId:'steel-engraving'},features:{orderEnabled:false,productionConfirmed:false,motifsAllowed:true},designs,defaultDesignId:designs[1].id,optionGroups:[{id:'mounting',name:'Befestigung',required:true,defaultValueId:'K00',values:[{id:'K00',label:'Ohne Befestigung',priceCents:0,currency:'EUR',holes:[]}]}]};
 const imported=[];for(const motif of motifs){const m=await importedMotif(assets,motif);imported.push(m);for(const d of designs)for(const o of d.objects)if(o.type==='motif'&&o.motif===motif.key)o.motif=m.key;}
 const c=common(profile,{scope:'local-review-only',fonts,motifs:imported});c.basePriceCents=g.baseCents;c.extraMotifCents=source.motifExtraCents;c.materialSurface=image('gravuru-edelstahl-feine-maserung-vorschau.png');
 return nativeSpecimenConfig(c);
}
