import {isLayeredDoorbell,selectedDoorbellProfile,switchDoorbellDesign} from './doorbell-selection.mjs';

// An explicit choice transforms once. Undo/import restore the serialized objects
// directly and only refresh the selected geometry; they must never transform twice.
export function doorbellOptionState(config,state,nextOptions){
 const next={...(state.mOptions||{}),...nextOptions};
 if(!isLayeredDoorbell(config))return {...state,mOptions:next};
 const before=state.mOptions||{},p=selectedDoorbellProfile(config,next);
 const moved=switchDoorbellDesign(config,{id:state.designId,objects:state.objects||[],marks:[]},before,next);
 return {...state,objects:moved.objects,mOptions:next,width:p.geometry.width,height:p.geometry.height};
}

export function doorbellPositionLabels(geometry){
 return geometry.width>geometry.height
  ? {standard:'Klingel rechts',opposite:'Klingel links'}
  : {standard:'Klingel unten',opposite:'Klingel oben'};
}

export function updateDoorbellViewport(el,geometry){
 const {width,height}=geometry,r=el.shadowRoot;
 el.style.setProperty('--m-plate-width',String(width));
 el.style.setProperty('--m-plate-height',String(height));
 el.style.setProperty('--m-plate-ratio',width+'/'+height);
 el.style.setProperty('--ux-ratio',width+'/'+height);
 for(const node of r.querySelectorAll('.ux-preview'))node.style.setProperty('--ux-ratio',width+'/'+height);
 // usability.mjs sets these on the stage at mount/resize. A format change does
 // not resize that container, so update the actual sizing inputs here as well.
 for(const node of r.querySelectorAll('.stage')){
  node.style.setProperty('--ux-preview-ratio',width+'/'+height);
  node.style.setProperty('--ux-product-width',String(width));
  node.style.setProperty('--ux-product-height',String(height));
 }
 const label=new Intl.NumberFormat('de-DE',{maximumFractionDigits:3});
 for(const [selector,value]of [['.dimension-x span',width],['.dimension-y span',height]]){
  for(const node of r.querySelectorAll(selector))node.textContent=label.format(value)+' mm';
 }
 for(const node of r.querySelectorAll('[data-m-field="position"] option')){
  const labels=doorbellPositionLabels(geometry);
  if(labels[node.value])node.textContent=labels[node.value];
 }
}


