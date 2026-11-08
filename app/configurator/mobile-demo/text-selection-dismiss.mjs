// Opt-in demo behavior only. Keep native text input, clipboard/composition and
// selection gestures intact; do not clear the document's unrelated selection.
const installed = new WeakMap();
const protectedRegions = '[data-ux-text],.ux-text-row,.ux-controls,.ux-direct-edit,.ux-direct-input,.md-text-picker,.md-text-size-control,[data-text-options],dialog,[role="dialog"]';

export function installDemoTextSelectionDismiss(el, {enabled = () => true} = {}) {
  if (installed.has(el)) return installed.get(el);
  const root = el?.shadowRoot, doc = el?.ownerDocument;
  if (!root || !doc) return null;
  const cleanups = [], pointers = new Set();
  let field = null, gesture = null, epoch = 0, disposed = false;
  const targetOf = event => {
    const node = event.composedPath?.()[0] || event.target;
    return node?.nodeType === 3 ? node.parentElement : node;
  };
  const ownedField = node => {
    const candidate = node?.closest?.('[data-ux-text]');
    return candidate && root.contains(candidate) && typeof candidate.setSelectionRange === 'function' ? candidate : null;
  };
  const protectedTarget = target => !!target?.closest?.(protectedRegions);
  const listen = (node,type,listener,options = true) => {
    node.addEventListener(type,listener,options);
    cleanups.push(() => node.removeEventListener(type,listener,options));
  };
  const cancel = () => { gesture = null; };
  function collapse(candidate) {
    if (disposed || !enabled() || !candidate || ownedField(candidate) !== candidate) return;
    // selectionDirection identifies the current end of a backwards selection.
    // Moving only that native caret preserves value, input events and undo.
    try {
      const start = candidate.selectionStart, end = candidate.selectionEnd;
      const caret = candidate.selectionDirection === 'backward' ? start : end;
      if (Number.isInteger(caret) && start !== end) candidate.setSelectionRange(caret,caret,'none');
    } catch { /* Some input modes do not expose a range; blur still belongs to this field only. */ }
    if (root.activeElement === candidate) candidate.blur();
    if (field === candidate) field = null;
    epoch++;
  }
  function dismiss() {
    if (disposed || !enabled()) return;
    cancel();
    collapse(ownedField(root.activeElement) || field);
  }
  listen(root,'focusin',event => {
    const focused = ownedField(targetOf(event));
    if (focused) { field = focused; epoch++; cancel(); }
  });
  field = ownedField(root.activeElement);
  listen(doc,'pointerdown',event => {
    if (el.isConnected === false) { api.dispose(); return; }
    pointers.add(event.pointerId); cancel();
    const target = targetOf(event);
    if (!enabled() || event.button !== 0 || event.isPrimary === false || pointers.size !== 1 ||
        !ownedField(field) || protectedTarget(target)) return;
    gesture = {id:event.pointerId,x:event.clientX,y:event.clientY,field,epoch};
  });
  listen(doc,'pointermove',event => {
    if (gesture?.id === event.pointerId && Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y) > 8) cancel();
  });
  listen(doc,'pointerup',event => {
    pointers.delete(event.pointerId);
    if (gesture?.id !== event.pointerId) return;
    const tap = gesture; cancel();
    if (!enabled() || pointers.size || protectedTarget(targetOf(event)) ||
        Math.hypot(event.clientX-tap.x,event.clientY-tap.y) > 8) return;
    // Native pointerup must finish first (including canvas selection/undo).
    // A new field focus before this microtask invalidates the old dismissal.
    queueMicrotask(() => { if (!disposed && epoch === tap.epoch && field === tap.field) collapse(tap.field); });
  });
  listen(doc,'pointercancel',event => { pointers.delete(event.pointerId); cancel(); });
  for (const type of ['scroll','touchmove','wheel','contextmenu','dragstart']) listen(doc,type,cancel,{capture:true,passive:true});
  // Scroll events inside an open shadow tree need their own capture listener.
  listen(root,'scroll',cancel,{capture:true,passive:true});
  const api = {dismiss,dispose() {
    if (disposed) return;
    disposed = true; field = null; cancel(); pointers.clear(); epoch++;
    for (const cleanup of cleanups) cleanup();
    installed.delete(el);
  }};
  installed.set(el,api);
  return api;
}
