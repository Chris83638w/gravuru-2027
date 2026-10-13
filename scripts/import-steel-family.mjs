// Converts the existing steel master data (gravuru-shopify workshop seed) into
// a product family document. Every drill pattern is turned into a rule and only
// accepted if the rule reproduces the original coordinates exactly.
// Usage: node scripts/import-steel-family.mjs --seed /PRIVATE/import.json --commit <sha> --output app/designs/steel-door-signs/family.json
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {ruleFromHoles} from '../app/platform/sources/app/shared/models/mounting-rules.mjs';
import {validateFamily,FAMILY_SCHEMA} from '../app/workshop/product-families.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';

const arg=name=>{const i=process.argv.indexOf('--'+name);return i>0?process.argv[i+1]:undefined;};
const seedPath=arg('seed'),output=arg('output'),commit=arg('commit')||'unbekannt';
if(!seedPath||!output)throw Error('--seed und --output angeben.');
const raw=fs.readFileSync(seedPath),seed=JSON.parse(raw),steel=seed.products.filter(p=>p.material==='Edelstahl');
const groups=new Map(),rules=new Map(),sizes=[];
for(const p of steel){
 const g=groups.get(p.groupKey)||{key:p.groupKey,name:p.groupName,shape:p.shape,cornerRadiusMm:p.cornerRadiusMm};
 if(g.shape!==p.shape||g.cornerRadiusMm!==p.cornerRadiusMm)throw Error('Formgruppe uneinheitlich: '+p.key);
 groups.set(p.groupKey,g);
 const mounting=[];
 for(const o of p.holeOptions){
  const geometry={width:p.widthMm,height:p.heightMm,shape:p.shape,cornerRadiusMm:p.cornerRadiusMm};
  const r=ruleFromHoles(geometry,o.holes);
  if(!r||r.edgeMm!==o.edgeMm||r.count!==o.count)throw Error('Bohrbild nicht als Regel darstellbar: '+o.sku);
  const suffix=o.sku.slice(p.key.length+1),rid=suffix+'-E'+String(r.edgeMm).replace('.','P')+'-D'+r.diameterMm;
  if(!rules.has(rid))rules.set(rid,{id:rid,label:`${r.count} Bohrlöcher Ø ${r.diameterMm} mm`,layout:r.layout,count:r.count,diameterMm:r.diameterMm,edgeMm:r.edgeMm,priceCents:0,skuSuffix:suffix});
  mounting.push(rid);
 }
 sizes.push({key:p.key,groupKey:p.groupKey,label:p.label,widthMm:p.widthMm,heightMm:p.heightMm,baseCents:p.baseCents,mounting,...(p.holeOptions[0]?.netWeightG?{netWeightG:p.holeOptions[0].netWeightG}:{})});
}
const available=workshopResources().fonts,used=[...new Set(seed.designs.flatMap(d=>d.state.objects.filter(o=>o.type==='text').map(o=>o.font)))];
const fonts=used.filter(f=>available[f]);
const family={schema:FAMILY_SCHEMA,id:'steel-door-signs',name:'Edelstahl-Türschilder',
 material:{kind:'steel',label:'Edelstahl gebürstet',thicknessMm:1.5,processingProfileId:'steel-engraving'},
 designArea:{marginMm:0,keepoutMm:1},groups:[...groups.values()],mountingRules:[...rules.values()],sizes,withoutMounting:true,fonts,
 briefingNotes:'Klare, gut lesbare Gestaltung für Haus- und Türschilder. Namen und Hausnummern groß; dekorative Motive dezent. Gravur erscheint schwarz auf gebürstetem Edelstahl.',
 source:{repository:'Chris83638w/gravuru-shopify',commit,path:'platform/sources/workshop-seed/import.json',sha256:createHash('sha256').update(raw).digest('hex'),note:'Bohrung laut Stammdaten ohne Aufpreis (eigene SKU-Endung). Nicht verfügbare Schriften weggelassen: '+(used.filter(f=>!available[f]).join(', ')||'keine')}};
validateFamily(family);
fs.mkdirSync(output.replace(/\/[^/]+$/,''),{recursive:true});
fs.writeFileSync(output,JSON.stringify(family,null,1)+'\n');
console.log(JSON.stringify({groups:family.groups.length,sizes:family.sizes.length,rules:family.mountingRules.map(r=>r.id),fonts:fonts.length}));
