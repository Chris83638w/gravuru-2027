import {canEditElement,legacyElementRights} from './element-rights.mjs';

export function rotationAllowed(config,designId,object){
 if(!object||object.uxLocked)return false;
 if(config?.workbench?.embedded)return true;
 // Rotation belongs to the persisted move permission, just like dragging.
 return legacyElementRights(object).move&&canEditElement(config,designId,object,'move');
}
export function installRotationPolicy({el,r,config,selected}){
 el.uxCanRotate=o=>rotationAllowed(config,el.state.designId,o);
 const update=()=>{const can=el.uxCanRotate(selected());
  for(const node of r.querySelectorAll('[data-ux-handle=rotate],[data-direct-turn],[data-direct-motif=rotate]'))node.hidden=!can;
  for(const node of r.querySelectorAll('[data-ux-prop=rotation],[data-ux-content-prop=rotation]'))node.disabled=!can;
 };
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);update();return result;};update();
}
