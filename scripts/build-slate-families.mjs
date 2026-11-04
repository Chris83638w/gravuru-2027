// Issue #85 / decisions 4.57, 4.59, 4.60. No Shopify writes or legacy prices.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateFamily} from '../app/workshop/product-families.mjs';

export const SLATE_SOURCE='zeichnungen/schiefer-tafeln-2027/schiefer-tafeln.json';
export const SLATE_COMMIT='ff1ea99ef92f3cce7069e7c9d41cdaa3e781e546';
const prefixes={premium:'GT-SP',geschnitten:'GT-SG',natur:'GT-SN',kordel:'GT-SK'};
const forms={Rechteck:'RE',Quadrat:'QU',Rund:'R',Herz:'HR','Herz schief':'HS',Kreuz:'KR',Stern:'ST',Knochen:'KN'};
const names={premium:'Premium-Schiefer',geschnitten:'Schiefer geschnitten',natur:'Naturschiefer',kordel:'Schiefer mit Kordel'};
const mounting={b2:'B02',b2s:'B02S',b4:'B04',b4s:'B04S',ah2:'AH02',ah4:'AH04'};
const dim=n=>String(n).replace('.','P');
// Source curves already end at their start (floating-point noise < 1e-8 mm).
// Add only the explicit close command required by the native geometry contract.
export function closedSlatePath(path){
 if(/[zZ]\s*$/.test(path))return path;
 const n=path.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)?.map(Number);
 if(!/^M\s/.test(path)||/[^MLC,\s]/.test(path.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,''))||!n||Math.hypot(n[0]-n.at(-2),n[1]-n.at(-1))>1e-8)throw Error('Quellkontur ist nicht geschlossen.');
 return path+' Z';
}
export const slateSizeKey=t=>`${prefixes[t.familie]}-${forms[t.form]}-${dim(t.widthMm)}X${dim(t.heightMm)}`;
export function buildSlateFamilies(source,fonts,{sha256}={}){
 if(source.schema!=='gravuru-schiefer-tafeln/v1'||source.tafeln.length!==48)throw Error('Bestätigte Quelle mit 48 Tafeln erforderlich.');
 return Object.keys(prefixes).map(kind=>{
  const plates=source.tafeln.filter(t=>t.familie===kind),rules=new Map(),groups=new Map();
  const sizes=plates.map(t=>{
   const key=slateSizeKey(t),groupKey=forms[t.form];if(!groupKey)throw Error('Unbekannte Quellform '+t.form);
   groups.set(groupKey,{key:groupKey,name:t.form,shape:t.shape,cornerRadiusMm:0});
   const selected=[];
   for(const [option,suffix] of Object.entries(mounting)){
    if(!t.optionen[option])continue;
    const count=option.includes('4')?4:2,b=t.lochbilder?.[count+'er'];
    if(!b||b.diameterMm!==4)throw Error(t.id+': freigegebenes Lochbild fehlt.');
    const rid=`${suffix}-${b.layout}-E${dim(b.edgeMm)}`;
    rules.set(rid,{id:rid,label:source.optionen[option].name,layout:b.layout,count,diameterMm:b.diameterMm,edgeMm:b.edgeMm,priceCents:source.optionen[option].preisCents,skuSuffix:suffix,...(option.startsWith('ah')?{accessory:'standoffs'}:option.endsWith('s')?{accessory:'screws'}:{})});
    selected.push(rid);
   }
   if(kind==='kordel'){
    const count=t.kordelLoecher?.length;if(![1,2].includes(count)||!t.optionen.kordel)throw Error(t.id+': feste Kordellöcher fehlen.');
    const rid='KORDEL-'+count;
    rules.set(rid,{id:rid,label:source.optionen.kordel.name,layout:count===1?'top-center':'left-right',count,diameterMm:null,edgeMm:null,priceCents:source.optionen.kordel.preisCents,skuSuffix:'KORDEL'});selected.push(rid);
   }
   if(t.foto!==Number.isSafeInteger(t.preisMitFotoCents))throw Error(t.id+': Fotofreigabe und Fotopreis widersprechen sich.');
   return {key,groupKey,label:t.label,widthMm:t.widthMm,heightMm:t.heightMm,baseCents:t.grundpreisCents,...(t.foto?{photoDesignCents:t.preisMitFotoCents}:{}),mounting:selected,...(t.shape==='contour'?{outlinePath:closedSlatePath(t.outlinePath),holesMm:t.kordelLoecher??[]}:{}),previewImage:'zeichnungen/schiefer-tafeln-2027/'+t.rohlingWebp};
  });
  const options=[{id:'zubehoer',label:'Zubehör',kind:'accessory',selection:'multiple',choices:['silikon','staender-klar','staender-schwarz'].filter(id=>{
   if(plates.some(t=>t.optionen[id]!==plates[0].optionen[id]))throw Error(kind+': Zubehör ist größenabhängig.');return plates[0].optionen[id];
  }).map(id=>({id,label:source.optionen[id].name,priceCents:source.optionen[id].preisCents}))}];
  for(const count of [2,4]){
   const ids=[...rules.values()].filter(r=>r.accessory==='standoffs'&&r.count===count).map(r=>r.id);if(!ids.length)continue;
   options.push({id:'ah-farbe-'+count,label:'Abstandshalter-Farbe',kind:'variant',selection:'single',required:true,visibleIf:{groupId:'mounting',valueIds:ids},choices:[['edelstahl','Edelstahl'],['schwarz','Schwarz matt'],['bronze','Bronze'],['gold','Gold'],['weiss','Weiß']].map(([id,label])=>({id,label,priceCents:id==='edelstahl'?0:count*50,...(id==='edelstahl'?{default:true}:{})}))});
  }
  const f={schema:'gravuru-product-family/v2',id:'schiefer-tafeln-'+kind,name:names[kind],material:{kind:'slate',variant:kind,label:names[kind],thicknessMm:plates[0].staerkeMm,processingProfileId:'slate-engraving'},designArea:{marginMm:0,keepoutMm:0},groups:[...groups.values()],mountingRules:[...rules.values()],sizes,withoutMounting:kind!=='kordel',fonts,photo:{includedCount:1,extraPriceCents:source.optionen.foto.preisCents},options,briefingNotes:'Quelle: bestätigte 48 Tafeln, Issue #85 Kommentare 6618926268 und 6618993147. Gravur bis zum Rand (Register R3). Rohling nur Vorschau; Produktionskonturen blau als Haarlinie. Designs nach designs/DESIGN-MASTER.md. Hunde als Designgruppe innerhalb Naturschiefer.',source:{repository:'Chris83638w/gravuru-katalog.',commit:SLATE_COMMIT,path:SLATE_SOURCE,...(sha256?{sha256}:{}),note:'Automatisch erzeugt durch scripts/build-slate-families.mjs; keine Werte aus alten Familien.'}};
  return validateFamily(f);
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const index=process.argv.indexOf('--katalog');if(index<0)throw Error('--katalog fehlt.');const root=resolve(process.argv[index+1]),raw=readFileSync(join(root,SLATE_SOURCE)),source=JSON.parse(raw);
 const fonts=JSON.parse(readFileSync(join(root,'schriften/schriften.json'))).fonts.map(f=>f.name);
 const families=buildSlateFamilies(source,fonts,{sha256:createHash('sha256').update(raw).digest('hex')});
 mkdirSync(join(root,'familien/schiefer'),{recursive:true});
 for(const f of families)writeFileSync(join(root,'familien/schiefer',f.id+'.json'),JSON.stringify(f,null,2)+'\n');
 console.log(JSON.stringify({families:families.map(f=>({id:f.id,sizes:f.sizes.length,photoSizes:f.sizes.filter(s=>s.photoDesignCents!==undefined).length,rules:f.mountingRules.length})),total:families.reduce((n,f)=>n+f.sizes.length,0)}));
}
