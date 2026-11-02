import {isLayeredDoorbell,selectedDoorbellProfile,switchDoorbellDesign} from './doorbell-selection.mjs';
import {updateProductViewport} from './product-viewport.mjs';

// The device-free rectangle is useful for first placement. Existing text may
// use the whole selected acrylic face; device/outer-edge validation stays separate.
export function doorbellTextSurface(profile){
 return profile.frames.find(frame=>frame.key===profile.doorbellSelection.frame).acrylic;
}

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
 updateProductViewport(el,geometry);
 for(const node of el.shadowRoot.querySelectorAll('[data-m-field="position"] option')){
  const labels=doorbellPositionLabels(geometry);
  if(labels[node.value])node.textContent=labels[node.value];
 }
}

