import {customerFieldLabel} from './text-fields.mjs';
// Physical reading order, with original labels and a stable tie-breaker.
export function customerTextSummary(objects,design){
 const texts=objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.role!=='guide'&&o.text?.trim());
 return [...texts].sort((a,b)=>(a.y-b.y)||(a.x-b.x)||String(a.id).localeCompare(String(b.id))).map(o=>({id:o.id,label:customerFieldLabel(o,texts.indexOf(o),design),text:o.text}));
}
export const customerTextLine=(objects,design)=>customerTextSummary(objects,design).map(o=>o.label+': '+o.text).join(' · ');
