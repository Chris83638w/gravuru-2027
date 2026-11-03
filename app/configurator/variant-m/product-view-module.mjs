import {editorProduct,needsDeviceModule} from './product-module-context.mjs';

const enabled=needsDeviceModule(editorProduct());
const ui=enabled?await import('./doorbell-ui.mjs'):null;
const presentation=enabled?await import('./doorbell-presentation.mjs'):null;
const designs=enabled?await import('./doorbell-lazy-designs.mjs'):null;
export const doorbellOptionState=(...args)=>ui.doorbellOptionState(...args);
export const updateDoorbellViewport=(...args)=>ui.updateDoorbellViewport(...args);
export const doorbellTextSurface=(...args)=>ui.doorbellTextSurface(...args);
export const designResourcesReady=(...args)=>designs.designResourcesReady(...args);
export const installDoorbellPresentation=(...args)=>presentation?.installDoorbellPresentation(...args)||null;
export const installDoorbellDesignLoading=(...args)=>designs?.installDoorbellDesignLoading(...args)||null;
