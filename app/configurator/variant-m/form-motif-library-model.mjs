import {motifScore,normalized} from './customer-tools-model.mjs';
export function motifCategories(motifs){
 const grouped=new Map();for(const motif of motifs){const name=motif.category||'Grundmotive';if(!grouped.has(name))grouped.set(name,[]);grouped.get(name).push(motif);}
 return [{id:'',name:'Alle Kategorien',count:motifs.length,example:motifs[0]},...[...grouped].sort(([a],[b])=>a==='Grundmotive'?-1:b==='Grundmotive'?1:a.localeCompare(b,'de')).map(([name,items])=>({id:name,name,count:items.length,example:items[0]}))];
}
export function filterFormMotifs(motifs,category,query=''){
 return motifs.filter(m=>!category||(m.category||'Grundmotive')===category).map((m,index)=>({m,index,score:motifScore({...m,tags:[...(m.tags||[]),m.key]},query)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(x=>x.m);
}
export {normalized};
