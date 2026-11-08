// Compact entry to the existing native fullscreen dialog, not a second viewer.
// Keep the live demo stylesheet intact: these rules only affect this new row.
export function installDemoPreviewAction({el, preview, trigger, plus}) {
  if (!preview || !trigger || !plus) return null;
  const doc = preview.ownerDocument || document;
  const row = doc.createElement('div'); row.className = 'md-preview-actions';
  const action = doc.createElement('button'); action.type = 'button';
  action.className = 'md-large-preview';
  action.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M3 3l6 6M16 3h5v5M21 3l-6 6M3 16v5h5M3 21l6-6M21 16v5h-5M21 21l-6-6"/></svg>';
  action.setAttribute('aria-label', 'Produkt vergrößern'); action.setAttribute('title', 'Produkt vergrößern'); action.setAttribute('aria-haspopup', 'dialog');
  const anchor = doc.createComment('Original Gestalten action'); plus.before(anchor);
  row.append(plus, action); preview.append(row);
  const style = doc.createElement('style');
  style.textContent = `
    :host([data-mobile-demo]) .ux-preview > .md-preview-actions {
      display:grid!important; grid-template-columns:1fr auto 1fr; align-items:center; gap:8px;
      box-sizing:border-box; flex:0 0 48px!important; height:48px!important; min-height:48px!important;
      margin:0!important; padding:2px 10px!important; z-index:66; pointer-events:none;
    }
    :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .ux-shell .md-preview-actions > button {
      position:static!important; inset:auto!important; transform:none!important;
      display:inline-flex!important; align-items:center; justify-content:center;
      box-sizing:border-box; width:44px!important; min-width:44px!important;
      height:44px!important; min-height:44px!important; margin:0!important; padding:10px!important;
      border:0!important; border-radius:50%!important; pointer-events:auto;
      font-weight:650!important; line-height:1!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-plus {
      grid-column:2; grid-row:1; font-size:30px!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-large-preview {
      grid-column:3; grid-row:1; justify-self:end;
      background:transparent!important; color:#626b73!important; box-shadow:none!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-large-preview svg {
      display:block; width:24px; height:24px; pointer-events:none;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-large-preview:hover {
      background:#e5e8eb!important; color:#30383e!important;
    }
    :host([data-mobile-demo]:not([data-demo-sheet="closed"])) .ux-shell .md-preview-actions > .md-plus {
      display:none!important;
    }
    :host([data-mobile-demo]) .md-preview-actions > button:focus-visible {
      outline:2px solid var(--md-petrol)!important; outline-offset:-3px;
    }
    @media (max-width:767px) {
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage .ux-design-reset {
        left:8px!important; right:auto!important; width:124px!important; transform:none!important;
      }
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage .ux-design-reset button {
        box-sizing:border-box; width:100%!important; min-width:0!important; height:44px!important;
        padding:4px 8px!important; font-size:12px!important; white-space:normal!important; line-height:1.2!important;
      }
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage .ux-view-zoom {
        left:auto!important; right:8px!important; width:calc(100% - 148px)!important; max-width:none!important;
      }
    }
  `;
  el.shadowRoot.append(style);
  const open = () => {
    if (!trigger.disabled && !trigger.hidden && trigger.getAttribute('aria-disabled') !== 'true') trigger.click();
  };
  action.addEventListener('click', open);
  return { dispose() { action.removeEventListener('click', open); anchor.replaceWith(plus); row.remove(); style.remove(); } };
}
