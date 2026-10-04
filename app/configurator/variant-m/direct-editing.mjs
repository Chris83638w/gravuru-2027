// Reuse the editor's state, rights, text-size controls and photo editor at the selection.
export function installDirectEditing({el,r,selected,editPhoto}) {
  const stage=r.querySelector('.stage');
  const panel=document.createElement('section');
  panel.className='ux-direct-edit';panel.hidden=true;panel.setAttribute('aria-label','Ausgewähltes Element bearbeiten');
  panel.innerHTML='<div class="ux-direct-actions"><button type="button" data-direct-open>Bearbeiten</button><label data-direct-size-label>Schriftgröße <input type="number" min="4" max="100" step="1" data-direct-size aria-label="Schriftgröße direkt in Millimetern"> mm</label></div><div data-direct-text hidden><textarea rows="2" aria-label="Text direkt im Design bearbeiten"></textarea><div class="ux-direct-actions"><button type="button" data-direct-done>Fertig</button><button type="button" data-direct-cancel>Abbrechen</button></div></div>';
  stage.append(panel);
  const openButton=panel.querySelector('[data-direct-open]'),box=panel.querySelector('[data-direct-text]'),field=panel.querySelector('textarea'),size=panel.querySelector('[data-direct-size]');
  const style=document.createElement('style');style.textContent='.ux-direct-edit{position:absolute;z-index:40;box-sizing:border-box;width:280px;max-width:calc(100% - 16px);padding:8px;border:1px solid #c4cbc6;border-radius:10px;background:#fff;box-shadow:0 3px 15px #152b2430;color:#28352f;pointer-events:auto}.ux-direct-edit[hidden],.ux-direct-edit [hidden]{display:none!important}.ux-direct-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ux-direct-edit button{padding:7px 10px;border:1px solid #bbc7c0;border-radius:6px;background:#fff;color:#28352f;font:inherit;cursor:pointer}.ux-direct-edit label{font-size:12px}.ux-direct-edit input{width:54px;font:inherit;padding:5px;border:1px solid #bbc7c0;border-radius:4px}.ux-direct-edit textarea{display:block;box-sizing:border-box;width:100%;min-height:62px;margin:8px 0;padding:8px;font:18px/1.35 sans-serif;color:#28352f;border:1px solid #17614f;border-radius:6px;resize:vertical}.ux-direct-edit [data-direct-done]{background:#17614f;color:white}';r.append(style);
  let editing=null;
  const can=(o,right)=>o&&!o.uxLocked&&!o.uxHidden&&el.uxCanEdit?.(o,right)!==false;
  function close(cancel=false){
    if(!editing)return;
    const old=editing;editing=null;box.hidden=true;
    if(cancel){const o=el.state.objects.find(o=>o.id===old.id);if(o){o.text=old.text;o.size=old.size;o.uxCustomerText=old.customerText;el.normalize();el.sync();}}
    update();
  }
  function update(){
    const o=selected();if(editing&&o?.id!==editing.id)close();
    const text=o?.type==='text',photo=!!o?.uxUploadId;
    panel.hidden=!(text&&can(o,'content')||photo&&can(o,'replace'));
    if(panel.hidden){if(editing)close();return;}
    openButton.textContent=text?'Text bearbeiten':'Foto bearbeiten';
    panel.querySelector('[data-direct-size-label]').hidden=!text;
    size.disabled=!can(o,'scale');
    if(r.activeElement!==size)size.value=r.querySelector('#ux-size')?.value||Math.round(o.size||4);
    const scene=r.querySelector('.scene'),bounds=scene?.getBoundingClientRect(),parent=stage.getBoundingClientRect();
    if(!bounds)return;
    const center=bounds.left-parent.left+o.x*bounds.width/el.state.width;
    const top=bounds.top-parent.top+(o.y-o.h/2)*bounds.height/el.state.height;
    const bottom=bounds.top-parent.top+(o.y+o.h/2)*bounds.height/el.state.height;
    panel.style.left=Math.max(8,Math.min(parent.width-panel.offsetWidth-8,center-panel.offsetWidth/2))+'px';
    panel.style.top=Math.max(8,Math.min(parent.height-panel.offsetHeight-8,top-panel.offsetHeight-28>=8?top-panel.offsetHeight-28:bottom+22))+'px';
  }
  function openText(id){
    const o=el.state.objects.find(o=>o.id===id&&o.type==='text');if(!can(o,'content'))return;
    if(editing?.id===id){field.focus({preventScroll:true});return;}
    close();el.state.selected=id;el.sync();editing={id,text:o.text,size:o.size,customerText:o.uxCustomerText,recorded:false};
    field.value=o.text;box.hidden=false;update();field.focus({preventScroll:true});field.select();
  }
  el.uxEditText=openText;
  let photoTap=null,openingPhoto=false;
  async function openPhoto(o){if(openingPhoto||r.querySelector('.ux-photo-edit-dialog')?.open)return;openingPhoto=true;try{await editPhoto(o);}finally{openingPhoto=false;}}
  el.uxPhotoTap=id=>{const now=performance.now();if(photoTap?.id===id&&now-photoTap.time<500){photoTap=null;const o=selected();if(o?.id===id&&can(o,'replace'))openPhoto(o);}else photoTap={id,time:now};};
  // Do not let the stage's drag/shortcut handlers consume editing gestures.
  for(const type of ['pointerdown','pointerup','click','dblclick','keydown'])panel.addEventListener(type,e=>e.stopPropagation());
  field.addEventListener('input',()=>{
    const o=selected();if(!editing||o?.id!==editing.id||!can(o,'content'))return;
    if(!editing.recorded){el.record();editing.recorded=true;}
    o.text=field.value;o.uxCustomerText=true;el.normalize();el.sync();
  });
  field.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();close();}});
  openButton.addEventListener('click',()=>{const o=selected();if(o?.type==='text')openText(o.id);else if(o?.uxUploadId&&can(o,'replace'))openPhoto(o);});
  panel.querySelector('[data-direct-done]').addEventListener('click',()=>close());
  panel.querySelector('[data-direct-cancel]').addEventListener('click',()=>close(true));
  size.addEventListener('change',()=>{
    const o=selected();if(o?.type!=='text'||!can(o,'scale')||!Number.isFinite(size.valueAsNumber))return;
    const input=r.querySelector('#ux-size');input.value=Math.max(4,Math.min(100,Math.round(size.valueAsNumber)));
    input.dispatchEvent(new Event('change',{bubbles:true}));size.value=input.value;update();
  });
  r.addEventListener('dblclick',e=>{
    if(!e.target.closest('.stage,.c-large-preview')||e.target.closest('.ux-direct-edit'))return;
    const id=e.target.closest('[data-object]')?.dataset.object;
    const o=id?el.state.objects.find(o=>o.id===id):selected();
    if(o?.uxUploadId&&can(o,'replace')){e.preventDefault();el.state.selected=o.id;el.sync();openPhoto(o);}
  },true);
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);update();return result;};}
  window.addEventListener('resize',update);new ResizeObserver(update).observe(stage);update();
}
