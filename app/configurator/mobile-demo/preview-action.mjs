// An additional entry to the existing native fullscreen dialog, not a viewer.
// Keep the live demo stylesheet intact: these rules only affect this new row.
export function installDemoPreviewAction({el, preview, trigger, plus}) {
  if (!preview || !trigger || !plus) return null;
  const doc = preview.ownerDocument || document;
  const row = doc.createElement('div'); row.className = 'md-preview-actions';
  const action = doc.createElement('button'); action.type = 'button';
  action.className = 'md-large-preview'; action.textContent = 'Große Vorschau';
  action.setAttribute('aria-label', 'Große Vorschau'); action.setAttribute('aria-haspopup', 'dialog');
  const anchor = doc.createComment('Original Gestalten action'); plus.before(anchor);
  row.append(plus, action); preview.append(row);
  const style = doc.createElement('style');
  style.textContent = `
    :host([data-mobile-demo]) .ux-preview > .md-preview-actions {
      display:flex!important; align-items:center; justify-content:center; gap:8px;
      box-sizing:border-box; flex:0 0 44px!important; height:44px!important; min-height:44px!important;
      margin:0!important; padding:0 8px!important; z-index:66;
    }
    :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .ux-shell .md-preview-actions > button {
      position:static!important; inset:auto!important; transform:none!important;
      display:inline-flex!important; align-items:center; justify-content:center;
      box-sizing:border-box; width:auto!important; min-width:0!important;
      height:44px!important; min-height:44px!important; margin:0!important; padding:8px 12px!important;
      border:1px solid var(--md-petrol)!important; border-radius:10px!important;
      font-size:14px!important; font-weight:650!important; line-height:1.2!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-large-preview {
      background:var(--md-petrol-soft)!important; color:var(--md-petrol-dark)!important;
    }
    :host([data-mobile-demo]:not([data-demo-sheet="closed"])) .ux-shell .md-preview-actions > .md-plus {
      display:none!important;
    }
    :host([data-mobile-demo]) .md-preview-actions > button:focus-visible {
      outline:2px solid var(--md-petrol)!important; outline-offset:-3px;
    }
  `;
  el.shadowRoot.append(style);
  const open = () => {
    if (!trigger.disabled && !trigger.hidden && trigger.getAttribute('aria-disabled') !== 'true') trigger.click();
  };
  action.addEventListener('click', open);
  return { dispose() { action.removeEventListener('click', open); anchor.replaceWith(plus); row.remove(); style.remove(); } };
}
