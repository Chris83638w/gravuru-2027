import {canDeleteTemplateElement} from './element-rights.mjs';

export const UNDO_VISIBLE_MS=8000;
// Delete through the existing versioned permission, with ordinary undo.
// Explicit delete rights also apply to template texts marked as required.
export function installTemplateDeletion({el,r,config,selected,mutate,say}){
 if(!config||config.workbench?.embedded)return ()=>{};
 const source=o=>config.profile.designs.find(d=>d.id===el.state.designId)?.objects.find(s=>s.id===o?.id);
 const can=o=>!!o&&!o.uxLocked&&!o.technicalLocked&&(source(o)?canDeleteTemplateElement(config,el.state.designId,source(o)):el.uxCanEdit?.(o,'delete')!==false&&canDeleteTemplateElement(null,el.state.designId,o));
 const feedback=document.createElement('div');feedback.className='ux-delete-feedback';feedback.hidden=true;feedback.setAttribute('role','status');feedback.innerHTML='<span>Entfernt</span><button type="button" data-ux="undo">Rückgängig</button>';
 let hideTimer=0;
 function remove(o){
  if(!can(o)){say('Dieses geschützte Element kann nicht gelöscht werden.');return;}
  mutate(()=>{el.state.objects=el.state.objects.filter(v=>v.id!==o.id);el.state.selected=null;});say('Entfernt – Rückgängig stellt das Element wieder her.');feedback.hidden=false;
  // Chris 13.11.2026 (Video): Der Hinweis blieb dauerhaft stehen und nahm der Vorschau Platz. Nach 8 s ausblenden.
  clearTimeout(hideTimer);hideTimer=setTimeout(()=>{feedback.hidden=true;},UNDO_VISIBLE_MS);
 }
 el.uxCanDeleteTemplate=can;
 r.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.dataset.ux==='undo')feedback.hidden=true;
  const o=el.state.objects.find(o=>o.id===b.dataset.id)||selected();
  if(!o||!['delete','remove-content','object-delete'].includes(b.dataset.ux))return;
  if(o?.uxUploadId&&el.uxCanPositionPhoto?.(o))return;
  event.preventDefault();event.stopImmediatePropagation();remove(o);
 },true);
 r.addEventListener('keydown',event=>{
  if(!['Delete','Backspace'].includes(event.key)||!event.target.closest('.scene,.ux-selection-handles')||event.target.closest('input,textarea'))return;
  const o=selected();if(!o||o?.uxUploadId&&el.uxCanPositionPhoto?.(o))return;
  event.preventDefault();event.stopImmediatePropagation();remove(o);
 },true);
 function update(){
  const o=selected();for(const control of r.querySelectorAll('[data-ux=delete],[data-ux=object-delete]'))control.disabled=!can(o)&&!(o?.uxUploadId&&el.uxCanPositionPhoto?.(o));
  for(const row of r.querySelectorAll('.ux-content-row')){
   const id=row.querySelector('[data-ux=select-content]')?.dataset.id,item=el.state.objects.find(o=>o.id===id);
   const control=row.querySelector('[data-ux=remove-content]');if(control)control.disabled=!can(item);
  }
 }
 return ()=>{r.querySelector('.ux-preview').append(feedback);for(const name of ['sync','render']){const old=el[name];el[name]=function(...args){const result=old.apply(this,args);update();return result;};}update();};
}
