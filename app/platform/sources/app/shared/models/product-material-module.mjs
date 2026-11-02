import {editorProduct,needsDeviceModule} from '../../../../../configurator/variant-m/product-module-context.mjs';
const material=needsDeviceModule(editorProduct())?await import('./doorbell-material-preview.mjs'):null;
export const doorbellMaterialPreview=(...args)=>material.doorbellMaterialPreview(...args);
