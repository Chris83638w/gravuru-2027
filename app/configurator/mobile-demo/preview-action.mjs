// Compact entry to the existing native fullscreen dialog, not a second viewer.
// Keep the live demo stylesheet intact; no full-width preview strip.
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
      display:contents!important;
    }
    :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .ux-shell .ux-layout > .ux-preview{background:#fff!important}
    /* Chris 13.11.2026: Platz unter dem Produkt nur für den „+“-Knopf (geschlossenes Menü). Bei offenem
       Menü ist er ausgeblendet; das Produkt bekommt die Fläche, das Vergrößern-Symbol sitzt rechts daneben. */
    :host([data-mobile-demo][data-demo-sheet="closed"][data-ux-layout][data-ux-neutral][data-ux-modern]) .ux-shell .ux-layout > .ux-preview .stage:not(.acryl-scene){padding-bottom:60px!important}
    :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .ux-shell .md-preview-actions > button {
      position:absolute!important; transform:none!important; z-index:66;
      display:inline-flex!important; align-items:center; justify-content:center;
      box-sizing:border-box; width:44px!important; min-width:44px!important;
      height:44px!important; min-height:44px!important; margin:0!important; padding:10px!important;
      border:0!important; border-radius:50%!important; pointer-events:auto;
      font-weight:650!important; line-height:1!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-plus {
      left:calc(50% - 22px)!important; bottom:4px!important; top:auto!important; font-size:30px!important;
    }
    :host([data-mobile-demo]) .ux-shell .md-preview-actions > .md-large-preview {
      left:var(--md-preview-action-x,calc(100% - 48px))!important; top:var(--md-preview-action-y,calc(100% - 48px))!important; bottom:auto!important; right:auto!important;
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
      /* Chris 20.11.2026, 17:52 Uhr (Handy, Acrylglas 12 × 8 cm): Nach „Vergrößern“ verrutschte die Vorschau, das Schild war
         links abgeschnitten. Ursache: Der Knopf „Gestaltung zurücksetzen“ kommt im Vollbild in die Bühne (design-reset.mjs)
         und stand dort als zweites Element neben dem Schild, weil ihm die feste Lage fehlte. Die Regeln unten rechnen
         schon mit einer Zeile am unteren Rand (Knopf links 124 px, Regler „Ansicht“ rechts daneben); hier bekommt er sie. */
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage .ux-design-reset {
        position:absolute!important; top:auto!important; bottom:5px!important; z-index:35; margin:0!important; padding:0!important;
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
    /* Derselbe Fehler zwischen 768 und 999 px (Tablet hochkant, am echten Shop bei 820 px nachgestellt: Schild 59 px links
       abgeschnitten). Ab 1000 px ist der Knopf im Vollbild ausgeblendet (compact-controls.mjs). Unten links in der Zeile
       des Reglers „Ansicht“; steht dort der Regler für die Fotogröße, eine Zeile darüber. */
    @media (min-width:768px) and (max-width:999px) {
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern]) .c-large-preview .stage .ux-design-reset {
        position:absolute!important; top:auto!important; bottom:5px!important; left:12px!important; right:auto!important;
        width:auto!important; z-index:35; margin:0!important; padding:0!important; transform:none!important;
      }
      :host([data-mobile-demo][data-ux-layout][data-ux-neutral][data-ux-modern][data-ux-photo-sizing="true"]) .c-large-preview .stage .ux-design-reset {
        bottom:54px!important;
      }
    }
  `;
  el.shadowRoot.append(style);
  const open = () => {
    if (!trigger.disabled && !trigger.hidden && trigger.getAttribute('aria-disabled') !== 'true') trigger.click();
  };
  action.addEventListener('click', open);
  let frame=0,disposed=false;
  const place=()=>{frame=0;if(disposed)return;const plate=preview.querySelector('.plate-holder'),pr=preview.getBoundingClientRect?.(),br=plate?.getBoundingClientRect?.();if(!pr||!br||!pr.width||!pr.height)return;const side=br.right-pr.left+6,middle=br.top-pr.top+br.height/2-22;let x,y;
    // Rechts neben dem Produkt, mittig zur Höhe; nur ein sehr breites Schild (kein Platz rechts) behält den Platz darunter.
    if(side+44<=pr.width-4&&middle>=0&&middle+44<=pr.height){x=side;y=middle;}else{x=Math.max(4,Math.min(pr.width-48,br.right-pr.left-44));y=br.bottom-pr.top+8;}
    if(y+44<=pr.height){action.style.setProperty('--md-preview-action-x',Math.round(x)+'px');action.style.setProperty('--md-preview-action-y',Math.round(y)+'px');}};
  const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(place);};
  const oldSync=el.sync;if(typeof oldSync==='function')el.sync=function(...args){const result=oldSync.apply(this,args);schedule();return result;};
  const view=doc.defaultView||window;view.addEventListener('resize',schedule);el.shadowRoot.addEventListener('input',schedule);
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;observer?.observe(preview);const plate=preview.querySelector('.plate-holder');if(plate)observer?.observe(plate);schedule();
  return { dispose() { disposed=true;if(frame)cancelAnimationFrame(frame);observer?.disconnect();view.removeEventListener('resize',schedule);el.shadowRoot.removeEventListener('input',schedule);if(typeof oldSync==='function')el.sync=oldSync;action.removeEventListener('click', open); anchor.replaceWith(plus); row.remove(); style.remove(); } };
}
