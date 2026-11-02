// Existing versioned model identifiers are the authority, never product titles.
// Server/merchant processes can handle several types; a native customer frame
// is bound to one validated product for its lifetime.
export const DOORBELL_SCHEMA='gravuru-doorbell/v1';
export const isLayeredDoorbell=c=>c?.doorbell?.schema===DOORBELL_SCHEMA;
export function needsDeviceModule(config,part='native'){
 if(!config)return true;
 if(part==='legacy')return config.profile?.kind==='layered-doorbell'&&!isLayeredDoorbell(config);
 return isLayeredDoorbell(config);
}
export function editorProduct(){
 if(typeof window==='undefined')return null;
 try{return window.parent?.UniversalConfig||null;}catch{return null;}
}
