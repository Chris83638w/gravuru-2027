import {canDeleteTemplateElement} from './element-rights.mjs';

// Unlock is a deliberate, session-only delete guard. The source stays immutable.
export function installTemplateDeletion({el,r,config,selected,mutate,say}){
 if(!config||config.workbench?.embedded)return ()=>{};
 const unlocked=new Set(),source=o=>config.profile.designs.find(d=>d.id===el.state.designId)?.objects.find(s=>s.id===o?.id);
 const key=o=>el.state.designId+'\0'+o.id,can=o=>canDeleteTemplateElement(config,el.state.designId,source(o));
 const panel=document.createElement('div');panel.className='ux-template-delete';panel.hidden=true;
 panel.innerHTML='<span data-template-note></span><button type="button" data-template-toggle>Zum Löschen entsperren</button><button type="button" data-template-delete>Löschen</button>';
 const css=document.createElement('style');css.textContent='.ux-template-delete{scroll-margin-top:160px;scroll-margin-bottom:120px;display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin:10px 0;font-size:13px}.ux-template-delete[hidden]{display:none!important}.ux-template-delete button{scroll-margin:190px 0 140px;font-size:13px!important;min-height:40px!important}.ux-template-delete [data-template-delete]{color:#9d3434!important}';r.append(css);
 const armed=o=>can(o)&&unlocked.has(key(o));
 function remove(o){if(!armed(o)){say('Dieses Vorlagenelement zuerst zum Löschen entsperren.');return;}mutate(()=>{el.state.objects=el.state.objects.filter(v=>v.id!==o.id);el.state.selected=null;});unlocked.delete(key(o));say('Element aus deiner Gestaltung entfernt. Rückgängig stellt es wieder her; die Originalvorlage bleibt erhalten.');}
 r.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const o=el.state.objects.find(o=>o.id===b.dataset.id)||selected();
  if(b.hasAttribute('data-template-toggle')||b.hasAttribute('data-template-delete')){
   e.preventDefault();e.stopImmediatePropagation();if(!can(o))return say('Das Backend gibt dieses Element nicht zum Löschen frei.');
   if(b.hasAttribute('data-template-toggle')){const k=key(o);unlocked.has(k)?unlocked.delete(k):unlocked.add(k);el.sync();}else remove(o);return;
  }
  if(source(o)&&['delete','remove-content','object-delete'].includes(b.dataset.ux)){
   // Removing an uploaded replacement restores its photo slot; it does not delete the template.
   if(o?.uxUploadId&&el.uxCanPositionPhoto?.(o))return;
   e.preventDefault();e.stopImmediatePropagation();remove(o);
  }
 },true);
 r.addEventListener('keydown',e=>{if(!['Delete','Backspace'].includes(e.key)||!e.target.closest('.scene,.ux-selection-handles')||e.target.closest('input,textarea'))return;const o=selected();if(!source(o)||o?.uxUploadId&&el.uxCanPositionPhoto?.(o))return;e.preventDefault();e.stopImmediatePropagation();remove(o);},true);
 function update(){
  const o=selected();panel.hidden=!source(o)||!can(o);
  if(!panel.hidden){panel.querySelector('[data-template-note]').textContent=armed(o)?'Löschen für dieses Element freigegeben':'Vorlagenelement geschützt';panel.querySelector('[data-template-toggle]').textContent=armed(o)?'Wieder sperren':'Zum Löschen entsperren';panel.querySelector('[data-template-toggle]').setAttribute('aria-pressed',String(armed(o)));panel.querySelector('[data-template-delete]').disabled=!armed(o);}
  for(const row of r.querySelectorAll('.ux-content-row')){
   const id=row.querySelector('[data-ux=select-content]')?.dataset.id,item=el.state.objects.find(o=>o.id===id);if(!source(item)||!can(item))continue;
   const lock=row.querySelector('[data-ux=lock],[data-template-toggle]'),del=row.querySelector('[data-ux=remove-content],[data-template-delete]');
   if(lock){lock.removeAttribute('data-ux');lock.setAttribute('data-template-toggle','');lock.dataset.id=id;lock.disabled=false;lock.textContent=armed(item)?'🔓':'🔒';lock.setAttribute('aria-label',armed(item)?'Löschen wieder sperren':'Zum Löschen entsperren');lock.setAttribute('aria-pressed',String(armed(item)));}
   if(del){del.removeAttribute('data-ux');del.setAttribute('data-template-delete','');del.dataset.id=id;del.disabled=!armed(item);}
  }
 }
 return ()=>{r.querySelector('.ux-editor').prepend(panel);for(const name of ['sync','render']){const old=el[name];el[name]=function(...args){const v=old.apply(this,args);update();return v;};}update();};
}
