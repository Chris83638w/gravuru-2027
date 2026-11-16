import {clampToPlate,clampToContour,clampToAcrylic} from '../variant-m/edge-clamp.mjs';
import {measureText} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {objectSurface} from '../variant-m/surfaces.mjs';

const installed = new WeakMap();

function placeBeforeFit(el,object,position) {
  let bounds = null;
  if (object.type === 'text') {
    // Shared font geometry, including multiline leading and glyph overhang;
    // never approximate text by a separate demo bounding box.
    if (typeof el.uxTextBounds !== 'function') return;
    measureText(object,el.fontData);
    bounds = el.uxTextBounds(object);
    if (!bounds) return;
  }
  const profile = el.uxSelectedProfile?.(), geometry = el.uxProfileGeometry?.();
  if (profile?.doorbellSchema === 'gravuru-doorbell/v1') clampToAcrylic(object,profile,bounds);
  else if (geometry && (geometry.shape === 'contour' || geometry.shape === 'ellipse' || geometry.cornerRadiusMm > 0)) {
    const active = el.state.uxSurface === 'back' ? 'back' : 'front';
    if (objectSurface(object) === active) clampToContour(object,geometry,bounds,position,el.fontData);
  } else clampToPlate(object,el.state.width,el.state.height,0,bounds);
}

// Demo only: the native corner gesture still calculates size, captures the
// pointer, validates photo identity and owns the single undo transaction.
// Put its enlarged object inside the existing surface BEFORE native text-fit
// examines its position. The normal render clamp otherwise runs too late and
// text touching an edge is shrunk straight back to its starting size.
export function installDemoEdgeResize(el) {
  if (installed.has(el)) return installed.get(el);
  if (!el?.shadowRoot || typeof el.normalize !== 'function') return null;
  let gesture = null, moving = false, disposed = false;
  const cleanups = [], normalize = el.normalize;
  const selected = () => el.state?.objects?.find(object => object.id === el.state.selected);
  const eligible = object => !!object && !object.uxHidden && !object.uxLocked && !object.locked &&
    !object.technicalLocked && !object.acrylicFixed && object.customerEditable !== false &&
    el.uxCanEdit?.(object,'scale') !== false && !el.uxPhotoPositionActive?.(object);
  const valid = object => gesture && eligible(object) && object.id === gesture.id &&
    el.state.designId === gesture.designId && object.uxUploadId === gesture.uploadId &&
    objectSurface(object) === gesture.surface;
  const clear = () => { gesture = null; moving = false; };
  const listen = (type,listener) => {
    el.addEventListener(type,listener,true);
    cleanups.push(() => el.removeEventListener(type,listener,true));
  };
  // Host capture observes the event before the unchanged shadow-root gesture.
  // No event is cancelled, re-dispatched, or translated into synthetic points.
  listen('pointerdown',event => {
    clear();
    const target = event.composedPath?.()[0] || event.target;
    const handle = target.closest?.('[data-ux-handle="scale"]');
    const object = selected();
    if (event.button !== 0 || !handle || handle.hidden || handle.disabled || !eligible(object)) return;
    gesture = {pointerId:event.pointerId,id:object.id,designId:el.state.designId,
      uploadId:object.uxUploadId,surface:objectSurface(object),position:{x:object.x,y:object.y}};
  });
  listen('pointermove',event => { moving = !!gesture && gesture.pointerId === event.pointerId; });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(type,event => {
    if (gesture?.pointerId === event.pointerId) clear();
  });
  const wrapped = function(...args) {
    const object = selected(), adjust = moving && valid(object);
    moving = false;
    if (adjust) {
      try {
        placeBeforeFit(this,object,gesture.position);
      } catch {
        // Missing font/geometry resources keep the existing native validation;
        // do not grant editing rights or invent a successful fit.
      }
    }
    return normalize.apply(this,args);
  };
  el.normalize = wrapped;
  const api = {dispose() {
    if (disposed) return;
    disposed = true;
    const pending = !!gesture; clear();
    for (const cleanup of cleanups) cleanup();
    if (el.normalize === wrapped) el.normalize = normalize;
    installed.delete(el);
    if (pending) el.uxCancelObjectGesture?.();
  }};
  installed.set(el,api);
  return api;
}
