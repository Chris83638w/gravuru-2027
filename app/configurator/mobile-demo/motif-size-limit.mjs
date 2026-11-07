import {boundingSize} from '../variant-m/edge-clamp.mjs';
import {objectSurface} from '../variant-m/surfaces.mjs';

const installed = new WeakMap();
const dimensions = object => ({w:object.w,h:object.h,rotation:object.rotation});
const sameDimensions = (object,before) => ['w','h','rotation'].every(key => Object.is(object[key],before[key]));

// Only the rectangular demo surface is supported here. A contour's bounding
// rectangle is not proof that an enlarged motif fits its production surface.
function rectangularSurface(el) {
  const geometry = el.uxProfileGeometry?.();
  if (!geometry || geometry.shape !== 'rect' || geometry.cornerRadiusMm > 0 ||
      el.uxSelectedProfile?.()?.doorbellSchema ||
      ![geometry.width,geometry.height].every(value => Number.isFinite(value) && value > 0)) return null;
  return geometry;
}

// Mikail, 07.11.2026: a customer-enlarged motif must never exceed the plate.
// This opt-in hook does not resize designs when loading, resetting or undoing.
// Native gestures retain pointer capture, position clamping and undo ownership.
export function installDemoMotifSizeLimit(el) {
  if (installed.has(el)) return installed.get(el);
  if (!el?.shadowRoot || typeof el.normalize !== 'function' || typeof el.render !== 'function') return null;
  let gesture = null, pending = null, expiryTimer = null, disposed = false;
  const cleanups = [], originals = {normalize:el.normalize,render:el.render};
  const timerHost = el.ownerDocument?.defaultView || globalThis;
  const clearPending = () => {
    pending = null;
    if (expiryTimer !== null) timerHost.clearTimeout(expiryTimer);
    expiryTimer = null;
  };
  const selected = () => el.state?.objects?.find(object => object.id === el.state.selected);
  const eligible = object => object?.type === 'motif' && !object.uxUploadId && !object.uxUploadKind &&
    !object.uxVectorLogo && !object.uxHidden && !object.uxLocked && !object.locked &&
    !object.technicalLocked && !object.acrylicFixed && object.customerEditable !== false &&
    object.role !== 'guide' && el.uxCanEdit?.(object,'scale') !== false &&
    objectSurface(object) === (el.state.uxSurface === 'back' ? 'back' : 'front');
  const capture = () => {
    const object = selected();
    if (!eligible(object)) return null;
    return {object,designId:el.state.designId,surface:objectSurface(object),before:dimensions(object)};
  };
  const valid = attempt => !disposed && attempt && attempt.object === selected() && eligible(attempt.object) &&
    attempt.designId === el.state.designId && attempt.surface === objectSurface(attempt.object);
  const arm = () => {
    clearPending();
    const attempt = capture(); pending = attempt;
    // A disabled/unhandled control must not affect a later unrelated mutation.
    // Browser dispatch may run a microtask checkpoint between host capture and
    // the native target/shadow handler. Expire after that complete event task.
    if (attempt) expiryTimer = timerHost.setTimeout(() => {
      expiryTimer = null;
      if (pending === attempt) pending = null;
    },0);
  };
  function limitRequestedSize() {
    const attempt = pending;
    if (!valid(attempt)) { clearPending(); return; }
    const object = attempt.object;
    if (sameDimensions(object,attempt.before)) return;
    clearPending();
    const surface = rectangularSurface(el);
    if (!surface || ![object.w,object.h,object.rotation ?? 0].every(Number.isFinite) || object.w <= 0 || object.h <= 0) {
      // Unsupported surfaces keep their previous dimensions; never pretend
      // a rectangle-only calculation successfully fitted a curved plate.
      for (const key of ['w','h','rotation']) {
        if (attempt.before[key] === undefined) delete object[key];
        else object[key] = attempt.before[key];
      }
      return;
    }
    const bounds = boundingSize(object);
    const factor = Math.min(1,surface.width/bounds.w,surface.height/bounds.h);
    if (factor < 1) { object.w *= factor; object.h *= factor; }
  }
  const listen = (type,listener) => {
    el.addEventListener(type,listener,true);
    cleanups.push(() => el.removeEventListener(type,listener,true));
  };
  const targetOf = event => event.composedPath?.()[0] || event.target;
  const available = node => node && !node.hidden && !node.disabled;
  listen('pointerdown',event => {
    gesture = null; clearPending();
    const handle = targetOf(event)?.closest?.('[data-ux-handle]');
    if (event.button !== 0 || !available(handle) || !['scale','rotate'].includes(handle.dataset.uxHandle)) return;
    if (handle.dataset.uxHandle === 'rotate' && el.uxCanRotate?.(selected()) === false) return;
    const attempt = capture();
    if (attempt) gesture = {...attempt,pointerId:event.pointerId};
  });
  listen('pointermove',event => {
    if (gesture?.pointerId === event.pointerId && valid(gesture)) arm();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(type,event => {
    if (gesture?.pointerId === event.pointerId) { gesture = null; clearPending(); }
  });
  listen('keydown',event => {
    const handle = targetOf(event)?.closest?.('[data-ux-handle]');
    if (available(handle) && ['scale','rotate'].includes(handle.dataset.uxHandle) &&
        ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) arm();
  });
  listen('click',event => {
    const target = targetOf(event), direct = target?.closest?.('[data-direct-motif]'),
      turn = target?.closest?.('[data-direct-turn]'), action = target?.closest?.('[data-ux]');
    if (available(direct) && ['grow','shrink','rotate'].includes(direct.dataset.directMotif) ||
        available(turn) || available(action) && ['object-bigger','object-smaller','object-turn'].includes(action.dataset.ux)) arm();
  });
  const wrapped = {};
  for (const name of ['normalize','render']) {
    wrapped[name] = function(...args) { limitRequestedSize(); return originals[name].apply(this,args); };
    el[name] = wrapped[name];
  }
  const api = {dispose() {
    if (disposed) return;
    const active = !!gesture;
    disposed = true; gesture = null; clearPending();
    for (const cleanup of cleanups) cleanup();
    for (const name of ['normalize','render']) if (el[name] === wrapped[name]) el[name] = originals[name];
    installed.delete(el);
    if (active) el.uxCancelObjectGesture?.();
  }};
  installed.set(el,api);
  return api;
}
