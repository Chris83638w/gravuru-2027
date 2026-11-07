// Availability adapter only. The original native button/message handler owns
// returning to the bound product; this module never invents a URL or navigates.
const installed = new WeakMap();
const unavailableTitle = 'In dieser Demo ist noch keine Produktseite verknüpft.';

export function installDemoProductReturn(el, {button, nativeAvailable} = {}) {
  if (button && installed.has(button)) return installed.get(button);
  const root = el?.shadowRoot, doc = el?.ownerDocument, view = doc?.defaultView;
  if (!root || !doc || !view || !button || !root.contains(button)) return null;
  const prior = {disabled:button.disabled, title:button.getAttribute('title'), marker:button.getAttribute('data-demo-return-unavailable')};
  let disposed = false;
  function available() {
    try {
      if (typeof nativeAvailable === 'function') return nativeAvailable() === true;
      // ux.mjs posts to parent at this exact origin. The authenticated shop
      // entry/gallery/preview parent already owns its corresponding listener.
      // A standalone GravuruShopEntry value alone does not create that listener.
      return !!view.parent && view.parent !== view && view.parent.location.origin === view.location.origin;
    } catch { return false; }
  }
  const restoreAttribute = (name, value) => value === null ? button.removeAttribute(name) : button.setAttribute(name,value);
  function refresh() {
    if (disposed) return;
    const ready = available();
    button.disabled = prior.disabled || !ready;
    if (ready) {
      restoreAttribute('title',prior.title);
      restoreAttribute('data-demo-return-unavailable',prior.marker);
    } else {
      button.setAttribute('title',unavailableTitle);
      button.setAttribute('data-demo-return-unavailable','');
    }
  }
  function guard(event) {
    if (disposed) return;
    const ready = available();
    if (!ready || button.disabled) {
      if (!ready) refresh();
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    // Deliberately no click forwarding, postMessage or alternate navigation.
    // An available button continues through its unchanged native listener.
  }
  button.addEventListener('click',guard,true);
  refresh();
  const api = {refresh,dispose() {
    if (disposed) return;
    disposed = true;
    button.removeEventListener('click',guard,true);
    button.disabled = prior.disabled;
    restoreAttribute('title',prior.title);
    restoreAttribute('data-demo-return-unavailable',prior.marker);
    installed.delete(button);
  }};
  installed.set(button,api);
  return api;
}
