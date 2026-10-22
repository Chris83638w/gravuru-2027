import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {addedFieldDefinitions} from './form-additions.mjs';
// Opt-in to fit an edited text's box; field permissions and all normal validation still apply.
export function fitFormTextFrames(document,designId,input,fonts){
 const design=document.designs.find(d=>d.id===designId);if(!design||!Array.isArray(input?.fields))return input;
 const copy=structuredClone(input),defs=[...design.fields,...addedFieldDefinitions(design,copy)],g=document.form.geometry;
 for(const f of [...copy.fields,...(copy.additions||[])]){
  const source=defs.find(s=>s.id===f.id);if(source?.type!=='text'||!source.allowScale||typeof f.text!=='string'||!f.text.trim()||f.text.length>500||!fonts[f.font]||![f.sizeMm,f.xMm,f.yMm,f.widthMm,f.heightMm].every(Number.isFinite)||f.sizeMm<1||f.sizeMm>100||f.widthMm<=0||f.heightMm<=0||f.xMm<0||f.yMm<0)continue;
  const measured=measureText({...f,size:f.sizeMm},fonts),w=Math.max(f.widthMm,measured.w+.002),h=Math.max(f.heightMm,measured.h+.002);
  if(w>g.widthMm||h>g.heightMm)throw Object.assign(Error('Dieser Text ist größer als das Schild. Bitte eine kleinere Schriftgröße wählen oder den Text kürzen.'),{status:422,code:'text_larger_than_product'});
  if(!source.allowMove&&(f.xMm+w>g.widthMm||f.yMm+h>g.heightMm))continue;
  // Keep the text centered while its frame expands, clamping only at the product edge.
  f.xMm=source.allowMove?Math.max(0,Math.min(g.widthMm-w,f.xMm-(w-f.widthMm)/2)):f.xMm;
  f.yMm=source.allowMove?Math.max(0,Math.min(g.heightMm-h,f.yMm-(h-f.heightMm)/2)):f.yMm;f.widthMm=w;f.heightMm=h;
 }
 return copy;
}
