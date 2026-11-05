// Explicit table-backed size profiles. Resources and the editor are shared;
// these are derived mm layouts, never copies of original artwork assets.
export const SCALABLE_SIZES_SCHEMA='gravuru-scalable-sizes/v1';
export const isScalableSizes=config=>config?.scalableSizes?.schema===SCALABLE_SIZES_SCHEMA;
const clone=v=>structuredClone(v);
export function validateScalableSizes(config){
 const sizes=config.scalableSizes;
 if(!isScalableSizes(config)||!Array.isArray(sizes.sizes)||sizes.sizes.length<2||sizes.sizes.length>48||config.familyFormats||config.steelFormats||config.acrylic||config.doorbell)throw Error('Ungültige skalierbare Größen.');
 const ids=new Set(),designIds=config.profile.designs.map(d=>d.id).sort().join('\0');
 const groupIds=(config.profile.optionGroups||[]).filter(g=>g.id!=='size').map(g=>[g.id,g.values.map(v=>v.id)]);
 for(const size of sizes.sizes){
  if(typeof size.id!=='string'||!size.id||ids.has(size.id)||typeof size.label!=='string'||!size.label||!Number.isSafeInteger(size.basePriceCents)||size.basePriceCents<0||!size.profile)throw Error('Größe, Grundpreis und Profil ausdrücklich hinterlegen.');
  ids.add(size.id);
  if(JSON.stringify(size.profile.material)!==JSON.stringify(config.profile.material)||size.profile.designs?.map(d=>d.id).sort().join('\0')!==designIds||JSON.stringify((size.profile.optionGroups||[]).map(g=>[g.id,g.values.map(v=>v.id)]))!==JSON.stringify(groupIds))throw Error('Skalierbare Größen benötigen dasselbe Material, dieselben Designs und Optionskennungen.');
 }
 if(!ids.has(sizes.defaultSizeId))throw Error('Standardgröße fehlt.');
}
export function sizeConfiguration(config,values={}){
 if(!isScalableSizes(config))return config;
 const definition=config.scalableSizes,id=values.size??definition.defaultSizeId;
 const size=definition.sizes.find(s=>s.id===id);if(!size)throw Error('Ungültige Größe.');
 const base=Math.min(...definition.sizes.map(s=>s.basePriceCents));
 const group={id:'size',name:'Größe',required:true,defaultValueId:id,values:definition.sizes.map(s=>({id:s.id,label:s.label,priceCents:s.basePriceCents-base,currency:'EUR'}))};
 const result={...config,basePriceCents:base,profile:{...config.profile,...clone(size.profile),id:config.profile.id,revision:config.profile.revision,binding:config.profile.binding,optionGroups:[group,...clone(size.profile.optionGroups||[])]}};
 delete result.scalableSizes;
 return result;
}
// Join already validated projections. No option/price/geometry is guessed here.
export function combineScalableSizes(entries,defaultSizeId){
 const chosen=entries.find(e=>e.id===defaultSizeId);if(!chosen)throw Error('Standardgröße fehlt.');
 const config=clone(chosen.config);
 config.scalableSizes={schema:SCALABLE_SIZES_SCHEMA,defaultSizeId,sizes:entries.map(({id,label,config:c})=>({id,label,basePriceCents:c.basePriceCents,profile:clone(c.profile)}))};
 validateScalableSizes(config);
 const current=sizeConfiguration(config,{size:defaultSizeId});
 return {...current,scalableSizes:config.scalableSizes};
}
