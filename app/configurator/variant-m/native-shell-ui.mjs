// Shared DOM hooks consumed by UX/commerce. Product options, prices and device
// imagery are installed by the native adapter; no reference-device defaults.
export function finishNativeShell(el){
 const r=el.shadowRoot,$=selector=>r.querySelector(selector);
 const options=document.createElement('section');options.className='fk-options';
 options.innerHTML='<h2>Deine Ausführung</h2>';
 $('.c-design-section').before(options);
 const material=document.createElement('p');material.className='fk-material-note';$('.c-design-section').append(material);
 const hint=document.createElement('p');hint.className='fk-scroll-hint';$('.c-gallery').before(hint);
 const fonts=document.createElement('section');fonts.className='fk-font-section';options.after(fonts);
 const dock=document.createElement('div');dock.className='fk-buy-dock';
 dock.innerHTML='<div class="fk-buy-inner"><div class="fk-price-area"><strong data-fk-total aria-live="polite">Preis wird geladen …</strong><span data-fk-breakdown></span><small>Inkl. MwSt. · <a href="/policies/shipping-policy" target="_blank" rel="noopener">zzgl. Versand</a></small></div><label class="fk-quantity">Menge<input data-fk-quantity type="number" min="1" max="99" step="1" value="1" inputmode="numeric" aria-label="Bestellmenge"></label><button class="fk-buy-button" type="button" disabled>In den Warenkorb</button><p class="fk-order-status" role="status" aria-live="polite"></p></div>';
 const shop=window.parent.GravuruShopEntry?.shopDomain;
 if(typeof shop==='string'&&/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))dock.querySelector('a').href='https://'+shop+'/policies/shipping-policy';
 r.append(dock);
 const style=document.createElement('style');style.textContent='.fk-buy-dock{position:fixed;inset:auto 0 0;z-index:10000}.fk-buy-inner{margin:auto}.fk-options{padding:20px}.c-large-preview[open]{display:flex;flex-direction:column}.c-large-preview .fk-live-preview{position:relative;overflow:auto;display:flex;flex-direction:column}.c-large-preview .fk-live-preview>.stage{flex:1}.fk-large-hint{font-size:12px;text-align:center}';r.append(style);
 // Retain the existing editable fullscreen stage behaviour without a device
 // renderer. The same nodes and handlers move into the dialog and back.
 const dialog=$('.c-large-preview'),show=dialog.showModal.bind(dialog);
 const nodes=['.stage-top','.stage','.stage-bottom'].map($).filter(Boolean);
 let parked=[];
 dialog.showModal=function(){
  if(dialog.open)return;
  const content=dialog.querySelector(':scope>div');content.replaceChildren();content.classList.add('fk-live-preview');
  parked=[...nodes,dock].map(node=>{const placeholder=document.createComment('preview-position');node.before(placeholder);content.append(node);return {node,placeholder};});
  const hint=document.createElement('p');hint.className='fk-large-hint';hint.textContent='Text anklicken und verschieben · Größe und Ausrichtung direkt am Element ändern';content.prepend(hint);
  show();el.render();el.outputs();
 };
 dialog.addEventListener('close',()=>{for(const {node,placeholder} of parked)placeholder.replaceWith(node);parked=[];el.sync();});
 const reveal=el.revealEditor;
 el.revealEditor=function(...args){if(dialog.open){this.render();this.outputs();return;}return reveal.apply(this,args);};
}
