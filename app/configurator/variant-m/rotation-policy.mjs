export function rotationAllowed(config,designId,object,enabled=new Set()){
 if(config?.workbench?.embedded)return true;
 return !config?.profile?.designs?.find(d=>d.id===designId)?.objects.some(o=>o.id===object?.id)||enabled.has(object?.id);
}
export function installRotationPolicy({el,r,config,selected}){
 const enabled=new Set();el.uxCanRotate=o=>rotationAllowed(config,el.state.designId,o,enabled);
 const label=document.createElement('label');label.className='ux-rotation-opt-in';
 const box=document.createElement('input');box.type='checkbox';label.append(box,document.createTextNode('Drehen erlauben'));
 r.querySelector('.ux-precise').prepend(label);
 box.addEventListener('change',()=>{const o=selected();if(!o)return;if(box.checked)enabled.add(o.id);else enabled.delete(o.id);el.sync();});
 const update=()=>{const o=selected(),can=el.uxCanRotate(o);label.hidden=!o||rotationAllowed(config,el.state.designId,o);box.checked=enabled.has(o?.id);
  for(const node of r.querySelectorAll('[data-ux-handle=rotate],[data-direct-turn],[data-direct-motif=rotate]'))node.hidden=!can;
  for(const node of r.querySelectorAll('[data-ux-prop=rotation],[data-ux-content-prop=rotation]'))node.disabled=!can;
 };
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);update();return result;};update();
}
