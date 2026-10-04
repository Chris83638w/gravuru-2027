import {canEditElement,restoreElementRights,rightForProperty} from './element-rights.mjs';

// Install event guards before the legacy gesture handlers; finish after all
// presentation adapters, so their normalizers cannot undo a persisted restriction.
export function beginCustomerRights({el,r,config,selected,select,say}){
  if(!config?.workshopElementRights||config?.workbench?.embedded)return ()=>{};
  const $=selector=>r.querySelector(selector),all=selector=>[...r.querySelectorAll(selector)];
  const objectById=id=>el.state.objects.find(object=>object.id===id);
  const can=(object,right)=>canEditElement(config,el.state.designId,object,right);
  el.uxCanEdit=can;
  const uploadObject=()=>config.acrylic?el.state.objects.find(o=>o.type==='photoSlot'&&o.fieldKey==='photo-main'):el.state.objects.find(object=>object.type==='photoSlot'&&!object.uxUploadId);
  const actionRights={fonts:'content','font-apply':'content',bold:'content',
    smaller:'scale',bigger:'scale','fit-text':'scale','object-smaller':'scale','object-bigger':'scale',
    left:'move',center:'move',right:'move','object-center':'move','object-turn':'move','layer-front':'move','layer-back':'move',
    swatch:'color','original-colors':'color',delete:'delete','remove-content':'delete','object-delete':'delete',
    'replace-upload':'replace','fill-photo-slot':'replace','edit-upload':'replace','edit-photo':'replace','photo-apply':'replace'};
  const priorDisabled=new Map(),previous=new Map();let finalised=false,repairing=false,normalPreviewHelp='',replacedHelp=false,hasInteracted=false;
  for(const type of ['pointerdown','keydown','input','change','click','drop'])r.addEventListener(type,event=>{if(finalised&&event.isTrusted)hasInteracted=true;},true);
  function clearDisabled(){for(const [node,value]of priorDisabled)if(node.isConnected)node.disabled=value;priorDisabled.clear();}
  function restriction(node){
    let object=objectById(node.dataset.id)||selected(),right=actionRights[node.dataset.ux];
    if(node.matches('[data-ux-text]')){object=objectById(node.dataset.uxText);right='content';}
    if(node.matches('[data-ux-font],[data-font-target]')){object=node.dataset.fontTarget?objectById(node.dataset.fontTarget):selected();right='content';}
    if(node.matches('[data-align-id]')){object=objectById(node.dataset.alignId);right='move';}
    if(node.matches('[data-ux-visible]')){object=objectById(node.dataset.uxVisible);right='delete';}
    if(node.matches('[data-photo-background]')){object=objectById(node.dataset.photoBackground);right='replace';}
    if(node.matches('[data-free-color],[data-ux-color],[data-ux-content-color]'))right='color';
    if(node.id==='ux-size')right='scale';
    if(node.dataset.uxProp||node.dataset.uxContentProp||node.dataset.prop)right=rightForProperty(node.dataset.uxProp||node.dataset.uxContentProp||node.dataset.prop);
    if(node.dataset.uxHandle)right=node.dataset.uxHandle==='scale'?'scale':'move';
    if(['choose-upload','photo-upload'].includes(node.dataset.ux)){object=uploadObject();right=object?'replace':null;}
    return {object,right};
  }
  const denied=node=>{const {object,right}=restriction(node);return right&&object&&!can(object,right);};
  function blocked(event){event.preventDefault();event.stopImmediatePropagation();say('Diese Änderung ist für dieses Vorlagenelement nicht freigegeben.');}
  for(const type of ['click','input','change'])r.addEventListener(type,event=>{
    const node=event.target.closest('button,input,select,textarea');
    if(node&&denied(node)){blocked(event);if(finalised)el.sync();return;}
    if(type==='click'){
      const item=event.target.closest('[data-object]'),object=item&&objectById(item.dataset.object);
      if(object?.type==='photoSlot'&&!can(object,'replace')){blocked(event);select(object.id);return;}
      queueMicrotask(updateUI);
    }
  },true);
  r.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    const handle=event.target.closest('[data-ux-handle],[data-resize]'),item=event.target.closest('.scene [data-object]');
    const object=handle?objectById(handle.dataset.resize)||selected():item&&objectById(item.dataset.object);
    if(!object)return;
    const right=handle?(handle.dataset.uxHandle==='rotate'?'move':'scale'):'move';
    if(can(object,right)||!handle&&object.type==='photoSlot'&&can(object,'replace'))return;
    event.preventDefault();event.stopImmediatePropagation();select(object.id);
    if(object.type==='text'){el.revealEditor?.(object);if(can(object,'content'))el.uxTextTap?.(object.id);}
  },true);
  r.addEventListener('keydown',event=>{
    const handle=event.target.closest('[data-ux-handle]');
    if(!handle&&!event.target.closest('.scene'))return;
    const right=['Delete','Backspace'].includes(event.key)?'delete':['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)?(handle?.dataset.uxHandle==='scale'?'scale':'move'):null;
    if(right&&!(selected()?.type==='photoSlot'&&selected()?.uxUploadId&&right==='move'&&can(selected(),'replace'))&&!can(selected(),right))blocked(event);
  },true);
  r.addEventListener('dblclick',event=>{const item=event.target.closest('[data-object]'),object=item&&objectById(item.dataset.object);if(object?.type==='text'&&!can(object,'content'))blocked(event);},true);

  function repair(){
    if(repairing)return;repairing=true;
    try{
      const design=config.profile.designs.find(item=>item.id===el.state.designId);if(!design)return;
      const result=restoreElementRights(design.objects,el.state.objects,config.workshopElementRights[design.id]||{},previous.get(design.id));
      if(result.blockedIds.length){
        const current=new Map(el.state.objects.map(object=>[object.id,object]));
        el.state.objects=result.objects.map(object=>{const existing=current.get(object.id);if(!existing)return object;for(const key of Object.keys(existing))if(!Object.hasOwn(object,key))delete existing[key];Object.assign(existing,object);return existing;});
        if(hasInteracted)say('Eine nicht freigegebene Änderung wurde zurückgesetzt.');
      }
      previous.set(design.id,structuredClone(el.state.objects));
    }finally{repairing=false;}
  }
  function updateUI(){
    if(!finalised)return;
    clearDisabled();
    for(const node of all('button,input,select,textarea'))if(denied(node)){
      priorDisabled.set(node,node.disabled);node.disabled=true;
      if(node.matches('[data-align-id],[data-font-target]'))node.checked=false;
    }
    const object=selected();
    let notice=$('[data-element-rights-note]');
    if(!notice&&$('.ux-controls')){notice=document.createElement('p');notice.dataset.elementRightsNote='';notice.className='ux-small';$('.ux-controls').prepend(notice);}
    if(notice){
      const labels=[['content','Text und Schrift'],['color','Farbe'],['move','Position'],['scale','Größe'],['delete','Entfernen']];
      notice.hidden=!object||labels.every(([right])=>can(object,right));
      const available=labels.filter(([right])=>can(object,right)).map(([,label])=>label);
      notice.textContent=available.length?'Für dieses Element änderbar: '+available.join(', ')+'.':'Dieses Element gehört fest zum Design.';
    }
    for(const handle of all('[data-ux-handle]'))handle.hidden=!!object&&!can(object,handle.dataset.uxHandle==='scale'?'scale':'move');
    for(const handle of all('.ux-handle-delete'))handle.hidden=!!object&&!can(object,'delete');
    for(const handle of all('.ux-rotate-stem'))handle.hidden=!!object&&!can(object,'move');
    for(const handle of all('.scene [data-resize]'))handle.setAttribute('visibility',can(objectById(handle.dataset.resize),'scale')?'visible':'hidden');
    const photo=uploadObject(),drop=$('.ux-upload-drop');
    if(photo&&!can(photo,'replace')){
      drop?.querySelector('p')?.replaceChildren(document.createTextNode('Das Foto gehört fest zu diesem Design und kann nicht ersetzt werden.'));
      const copy=$('#ux-panel-upload > p');if(copy)copy.textContent='Das Foto ist Bestandteil dieser Vorlage und bleibt erhalten.';
      const help=$('.ux-preview-help');if(help){help.textContent='Freigegebene Texte und Farben rechts bearbeiten.';replacedHelp=true;}
    }else if(replacedHelp){const help=$('.ux-preview-help');if(help)help.textContent=normalPreviewHelp;replacedHelp=false;}
  }
  return function finish(){
    finalised=true;
    normalPreviewHelp=$('.ux-preview-help')?.textContent||'';
    for(const name of ['normalize','render','sync']){
      const original=el[name];el[name]=function(...args){clearDisabled();repair();const result=original.apply(this,args);repair();if(name!=='normalize')updateUI();return result;};
    }
    repair();updateUI();
  };
}
