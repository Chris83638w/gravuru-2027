import {motifCategories,filterFormMotifs} from '../../../app/configurator/variant-m/form-motif-library-model.mjs';
export const BESTSELLERS='__bestsellers';
export const categoriesFor=motifs=>[{id:BESTSELLERS,name:'Bestseller'},...motifCategories(motifs)];
export function themedMotifs(motifs,theme){
 if(!theme)return []; // An unassigned product must not inherit another topic.
 const byKey=new Map(motifs.map(m=>[m.key,m])),seen=new Set(),selected=[];
 const add=m=>{if(m&&!seen.has(m.key)){seen.add(m.key);selected.push(m)}};
 for(const key of theme.featured)add(byKey.get(key));
 const groups=theme.categories.map(category=>motifs.filter(m=>m.category===category));
 for(let i=0;i<Math.max(0,...groups.map(g=>g.length));i++)for(const group of groups)add(group[i]);
 return selected;
}
export function visibleMotifs(motifs,category=BESTSELLERS,query='',theme){
 const selected=category===BESTSELLERS?themedMotifs(motifs,theme):motifs;
 return filterFormMotifs(selected,category===BESTSELLERS?'':category,query);
}
// The fit is derived from the actual remaining canvas, including text tools.
// Zoom applies equally to the plate, selection handles and dimension lines.
export function canvasLayout(width,height,aspect,zoom=100){
 const base=Math.max(1,Math.min(width-60,(height-62)*aspect)*.98);
 const scale=zoom/100, w=base*scale,h=w/aspect;
 const marginScale=Math.max(1,scale);
 return {base,scale,width:Math.max(width,w+60*marginScale),height:Math.max(height,h+62*marginScale),plateWidth:w,plateHeight:h};
}
