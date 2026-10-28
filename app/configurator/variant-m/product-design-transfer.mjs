import {textLimits,textLimitIssue} from '../../workshop/theme-limits.mjs';
import {designElementRights} from './element-rights.mjs';

// Only customer-entered text crosses a product boundary. Artwork, coordinates,
// fonts, uploads, cart IDs and permissions always come from the new product.
export function captureProductTexts(objects,design){
 const originals=new Map((design?.objects||[]).map(o=>[o.id,o]));
 return objects.filter(o=>o.type==='text'&&!o.uxHidden&&typeof o.text==='string'&&o.text.trim()&&o.text!==originals.get(o.id)?.text)
  .map(o=>({fieldKey:typeof o.fieldKey==='string'?o.fieldKey:null,text:o.text}));
}
export function transferProductTexts(texts,objects,design,config){
 const rights=designElementRights(config,design.id,design.objects),transferred=[],remaining=[];
 for(const source of texts||[]){
  const matches=objects.filter(o=>o.type==='text'&&!o.uxHidden&&source.fieldKey&&o.fieldKey===source.fieldKey);
  const duplicate=texts.filter(t=>t.fieldKey===source.fieldKey).length!==1;
  const target=matches[0],original=target&&design.objects.find(o=>o.id===target.id);
  let reason='Kein eindeutiges passendes Textfeld.';
  if(!duplicate&&matches.length===1&&original&&rights[original.id]?.content){
   reason=textLimitIssue(source.text,textLimits(original,design,config.profile,config));
   if(!reason){target.text=source.text;target.uxCustomerText=true;transferred.push(source.fieldKey);continue;}
  }
  remaining.push({...source,reason});
 }
 return {transferred,remaining};
}
