// Opt-in demo navigation only. The native canvas owns selection, gestures,
// permissions and undo; this observer opens a panel after a completed tap.
const installed = new WeakMap();
const excluded = '[data-ux-handle],.ux-direct-edit,.ux-direct-input,button,input,textarea,select';

function sectionFor(object) {
  if (object?.type === 'text') return 'text';
  if (object?.type === 'photoSlot' || object?.uxUploadId ||
      object?.uxUploadKind === 'photo' || object?.uxUploadKind === 'logo') return 'upload';
  if (object?.type === 'motif') return 'motif';
  return null;
}

export function installDemoDesktopSelection(el, {
  onSelect,
  enabled = () => (el?.ownerDocument?.defaultView?.innerWidth ?? 0) >= 1000
} = {}) {
  if (installed.has(el)) return installed.get(el);
  const root = el?.shadowRoot, doc = el?.ownerDocument;
  if (!root || !doc || typeof onSelect !== 'function') return null;
  const cleanups = [], pointers = new Set();
  let gesture = null, epoch = 0, disposed = false;
  const targetOf = event => {
    const node = event.composedPath?.()[0] || event.target;
    return node?.nodeType === 3 ? node.parentElement : node;
  };
  const fullscreenOrDialog = () => !!(doc.fullscreenElement || root.fullscreenElement ||
    root.querySelector('.c-large-preview')?.open || root.querySelector('dialog[open]'));
  const multiText = object => object?.type === 'text' &&
    root.querySelector('[data-ux=multi-texts]')?.getAttribute('aria-pressed') === 'true';
  const available = () => !disposed && el.isConnected !== false && enabled() && !fullscreenOrDialog();
  const cancel = () => { gesture = null; epoch++; };
  const listen = (node,type,listener,options = true) => {
    node.addEventListener(type,listener,options);
    cleanups.push(() => node.removeEventListener(type,listener,options));
  };

  // Capture outside the shadow root: native canvas handlers deliberately stop
  // propagation there, including pointerup when a drag has finished.
  listen(doc,'pointerdown',event => {
    pointers.add(event.pointerId); cancel();
    if (!available() || event.button !== 0 || event.isPrimary === false || pointers.size !== 1) return;
    const target = targetOf(event), item = target?.closest?.('.scene [data-object]');
    if (!item || !root.contains(item) || target.closest?.(excluded)) return;
    const object = el.state?.objects?.find(object => object.id === item.dataset.object);
    if (!sectionFor(object) || multiText(object)) return;
    gesture = {
      pointerId:event.pointerId, x:event.clientX, y:event.clientY, epoch, down:event,
      id:object.id, type:object.type, uploadId:object.uxUploadId, uploadKind:object.uxUploadKind,
      designId:el.state.designId, history:el.history,
      historyLength:el.history?.length, historyTail:el.history?.at(-1)
    };
  });
  listen(doc,'pointermove',event => {
    if (gesture?.pointerId === event.pointerId &&
        Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y) > 8) cancel();
  });
  listen(doc,'pointerup',event => {
    pointers.delete(event.pointerId);
    if (gesture?.pointerId !== event.pointerId) return;
    const tap = gesture; gesture = null;
    if (!available() || pointers.size || Math.hypot(event.clientX-tap.x,event.clientY-tap.y) > 8) return;
    queueMicrotask(() => {
      if (!available() || epoch !== tap.epoch || !tap.down.defaultPrevented ||
          el.state?.designId !== tap.designId || el.state?.selected !== tap.id) return;
      // Native gestures start moving at 0.3 mm, which can be less than the
      // screen tap tolerance. A recorded move must never trigger navigation.
      if (el.history !== tap.history || el.history?.length !== tap.historyLength ||
          el.history?.at(-1) !== tap.historyTail) return;
      const object = el.state.objects?.find(object => object.id === tap.id);
      if (!object || object.type !== tap.type || object.uxUploadId !== tap.uploadId ||
          object.uxUploadKind !== tap.uploadKind || multiText(object)) return;
      const section = sectionFor(object), tab = section && root.querySelector('#ux-tab-'+section);
      if (!tab || tab.hidden || tab.disabled) return;
      onSelect(section);
    });
  });
  listen(doc,'pointercancel',event => { pointers.delete(event.pointerId); cancel(); });
  listen(doc,'lostpointercapture',event => {
    // A normal pointerup releases native capture after our capture listener.
    // Only a loss during an unfinished gesture cancels that gesture.
    if (gesture?.pointerId === event.pointerId) { pointers.delete(event.pointerId); cancel(); }
  });
  for (const type of ['scroll','touchmove','wheel','contextmenu','dragstart']) {
    listen(doc,type,cancel,{capture:true,passive:true});
  }
  listen(root,'scroll',cancel,{capture:true,passive:true});
  const api = {dispose() {
    if (disposed) return;
    disposed = true; cancel(); pointers.clear();
    for (const cleanup of cleanups) cleanup();
    installed.delete(el);
  }};
  installed.set(el,api);
  return api;
}
