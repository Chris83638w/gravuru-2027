import {motifCategories,filterFormMotifs} from '../../../app/configurator/variant-m/form-motif-library-model.mjs';
export const BESTSELLERS='__bestsellers';
export const categoriesFor=motifs=>[{id:BESTSELLERS,name:'Bestseller'},...motifCategories(motifs)];
export function visibleMotifs(motifs,category=BESTSELLERS,query=''){
 const selected=category===BESTSELLERS?motifs.filter(m=>m.bestseller).sort((a,b)=>a.bestsellerRank-b.bestsellerRank):motifs;
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
