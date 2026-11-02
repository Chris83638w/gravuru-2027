import {editorProduct,needsDeviceModule} from './product-module-context.mjs';
export {DOORBELL_SCHEMA,isLayeredDoorbell} from './product-module-context.mjs';

const model=needsDeviceModule(editorProduct())?await import('./doorbell-selection.mjs'):null;
const invoke=(name,args)=>{
 if(!model)throw Error('Die Gerätefunktion gehört nicht zu diesem Produkt.');
 return model[name](...args);
};
export const validateDoorbellDefinition=(...args)=>invoke('validateDoorbellDefinition',args);
export const selectedDoorbellProfile=(...args)=>invoke('selectedDoorbellProfile',args);
export const selectedDoorbellDesign=(...args)=>invoke('selectedDoorbellDesign',args);
export const doorbellPriceBase=(...args)=>invoke('doorbellPriceBase',args);
export const doorbellLayoutIssue=(...args)=>invoke('doorbellLayoutIssue',args);
