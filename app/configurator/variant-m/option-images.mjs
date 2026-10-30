import {validSurface,previewSurfaceUrl} from './material-surface.mjs';

// Presentation resources refer to existing option IDs; they never create choices or prices.
export function validateOptionImages(config){
 const groups=config.profile.optionGroups||[],fields=config.profile.optionFields||[];
 const known=new Set([...groups.flatMap(g=>g.values.map(v=>g.id+':'+v.id)),...fields.flatMap(f=>f.kind==='select'?f.choices.map(v=>f.id+':'+v.id):[f.id])]);
 for(const [key,url] of Object.entries(config.optionImages||{}))if(!known.has(key)||typeof url!=='string'||url.length>3_000_000||!validSurface(url))throw Error('Optionsbild ohne gültige Zuordnung: '+key);
 for(const [finish,url] of Object.entries(config.spacerImages||{}))if(!['silver','gold','bronze','white','black'].includes(finish)||typeof url!=='string'||url.length>3_000_000||!validSurface(url))throw Error('Abstandshalterbild ohne gültige Zuordnung: '+finish);
}
export const optionImage=(config,key)=>config.optionImages?.[key]?previewSurfaceUrl(config.optionImages[key]):'';
export const pricesHidden=config=>config?.reviewOnly===true&&config?.basePriceCents===null;
