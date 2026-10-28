// Layout only: move the existing controls, retaining their events and cart state.
export async function installLayout({el,r,config}){
 const $=selector=>r.querySelector(selector);
 const css=await fetch('/configurator/variant-m/layout.css');if(!css.ok)throw Error('Konfigurator-Layout fehlt.');
 const style=document.createElement('style');style.textContent=await css.text();r.append(style);r.host.dataset.uxLayout='compact';
 const preview=$('.ux-preview'),stage=$('.stage'),full=$('.c-large-preview'),tools=$('.ux-preview-tools'),enlarge=$('.ux-enlarge');
 const toolbar=document.createElement('div');toolbar.className='ux-canvas-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Vorschauwerkzeuge');
 if(enlarge){enlarge.setAttribute('aria-label','Vollbild öffnen');toolbar.append(enlarge);}
 if(tools)toolbar.append(tools);preview.prepend(toolbar);
 const home=document.createComment('preview toolbar');toolbar.before(home);
 function placeToolbar(){if(full.open){const close=full.querySelector('.ux-preview-back');if(toolbar.parentNode!==full)close.after(toolbar);}else if(toolbar.parentNode!==preview)home.after(toolbar);}
 new MutationObserver(placeToolbar).observe(full,{attributes:true,attributeFilter:['open']});full.addEventListener('close',placeToolbar);
 const heading=$('.ux-heading'),name=document.createElement('span');name.className='ux-product-title';name.textContent=config?.profile.name||'Deine Gestaltung';name.title=name.textContent;
 heading.querySelector('[data-ux=back]').after(name);heading.append($('.ux-session-note'));
 const note=$('.ux-session-note'),restored=document.createElement('details'),summary=document.createElement('summary'),actions=document.createElement('div');
 restored.className='ux-restored';summary.setAttribute('aria-label','Stand wiederhergestellt – Optionen');summary.title='Dein letzter Stand wurde wiederhergestellt';summary.innerHTML='<span aria-hidden="true">✓</span><span class="ux-restored-label">Stand wiederhergestellt</span>';
 actions.className='ux-restored-actions';actions.append(...note.children);restored.append(summary,actions);note.append(restored);
 const qty=$('[data-fk-quantity]');if(qty){
  const group=document.createElement('span');group.className='ux-quantity-stepper';qty.before(group);
  const control=(direction,label)=>{const b=document.createElement('button');b.type='button';b.textContent=direction<0?'−':'+';b.setAttribute('aria-label',label);b.addEventListener('click',()=>{direction<0?qty.stepDown():qty.stepUp();qty.dispatchEvent(new Event('input',{bubbles:true}));qty.dispatchEvent(new Event('change',{bubbles:true}));el.sync();});return b;};
  const minus=control(-1,'Menge verringern'),plus=control(1,'Menge erhöhen');group.append(minus,qty,plus);
  const update=()=>{minus.disabled=Number(qty.value)<=Number(qty.min||1);plus.disabled=!!qty.max&&Number(qty.value)>=Number(qty.max);};qty.addEventListener('input',update);qty.addEventListener('change',update);update();
 }
 const tiers=$('[data-ux-tiers]');if(tiers)$('.ux-price-dialog').append(tiers);
 // The same safe return action closes the embedded shop window. Its outer header
 // is hidden only after this ready signal has reached the checked parent frame.
 if(window.parent.GravuruShopEntry){$('.ux-brand').hidden=true;$('[data-ux=back]').textContent='← Zum Produkt';$('.fk-order-status').hidden=true;}
 el.uxLayoutReady=true;
}
