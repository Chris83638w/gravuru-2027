import {editorProduct,needsDeviceModule} from '../../../../../configurator/variant-m/product-module-context.mjs';
const validation=needsDeviceModule(editorProduct(),'legacy')?await import('./doorbell-profile-validation.mjs'):null;
export const validateProfile=(...args)=>validation.validateProfile(...args);
