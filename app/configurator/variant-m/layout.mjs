import {uiIcon} from './ui-icons.mjs';
import {installToolbarPlacementUi} from './toolbar-placement-ui.mjs';
import {placePreviewToolbar} from './toolbar-hosts.mjs';
import {customerHeading,customerSelectionHeading} from './customer-heading.mjs';
// Layout only: move the existing controls, retaining their events and cart state.
export async function installLayout({el,r,config}){
 let shopEntry=null,storage=null;try{shopEntry=window.parent.GravuruShopEntry;storage=window.localStorage;}catch{}
 installToolbarPlacementUi(el,{config,embedded:shopEntry?.embedded===true,search:location.search,storage});
 const $=selector=>r.querySelector(selector);
 const css=await fetch('/configurator/variant-m/layout.css');if(!css.ok)throw Error('Konfigurator-Layout fehlt.');
 const style=document.createElement('style');style.textContent=await css.text();r.append(style);r.host.dataset.uxLayout='compact';
 const preview=$('.ux-preview'),stage=$('.stage'),full=$('.c-large-preview'),tools=$('.ux-preview-tools'),enlarge=$('.ux-enlarge');
 const close=full.querySelector('.ux-preview-back');close.title='Zurück zur Konfiguration';close.textContent='Zurück zur Konfiguration';close.setAttribute('aria-label','Zurück zur Konfiguration');
 const moveHint=document.createElement('p');moveHint.className='ux-fullscreen-hint';moveHint.textContent='Wähle einen Text oder ein Element aus und ziehe es an die gewünschte Stelle.';close.before(moveHint);
 // Retain the legacy filter hook, which its gallery synchronisation still reads.
 const designSearch=$('[data-c-search]');if(designSearch){designSearch.value='';designSearch.hidden=true;}
 const toolbar=document.createElement('div');toolbar.className='ux-canvas-toolbar';toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Vorschauwerkzeuge');
 if(enlarge){enlarge.setAttribute('aria-label','Vollbild öffnen');toolbar.append(enlarge);}
 if(tools)toolbar.append(tools);preview.prepend(toolbar);
 const workbench=document.createElement('div');workbench.className='ux-workbench-toolbar';$('.ux-layout').before(workbench);
 // Remove only this editor's legacy page gutters, not surrounding shop/admin UI.
 if(!document.querySelector('style[data-ux-workbench-frame]')){const frame=document.createElement('style');frame.dataset.uxWorkbenchFrame='';frame.textContent='@media(min-width:768px){main:has(>gravuru-configurator[data-ux-layout="compact"]),main.c-main:has(gravuru-configurator[data-ux-layout="compact"]){padding:0!important}}';document.head.append(frame);}
 const media=matchMedia('(max-width:767px)');
 function placeToolbar(){placePreviewToolbar({toolbar,workbench,preview,heading:$('.ux-heading'),full,mobile:media.matches});el.uxRefreshTextToolbar?.();}
 media.addEventListener('change',placeToolbar);placeToolbar();
 new MutationObserver(placeToolbar).observe(full,{attributes:true,attributeFilter:['open']});full.addEventListener('close',placeToolbar);
 const heading=$('.ux-heading'),name=document.createElement('span');name.className='ux-product-title';
 const title=document.createElement('strong'),features=document.createElement('span');features.className='ux-product-features';name.append(title,features);
 function updateHeading(){const current=config?customerSelectionHeading(config,el.state):customerHeading({},el.uxProfileGeometry?.());title.textContent=current.title;features.textContent=current.features;document.title=current.title+' · Gravuru';if(!config?.workbench?.embedded)try{window.parent.document.title=document.title;if(window.frameElement)window.frameElement.title=current.title;window.parent.document.querySelector('#editor')?.setAttribute('aria-label',current.title);}catch{}}
 const headingSync=el.sync;el.sync=function(...args){const result=headingSync.apply(this,args);updateHeading();return result;};updateHeading();
 heading.querySelector('[data-ux=back]').after(name);heading.append($('.ux-session-note'));
 const contents=$('[data-ux=contents]');if(contents){contents.classList.remove('ux-contents-bottom');toolbar.append(contents);}
 for(const [node,label,symbol] of [[$('[data-ux=back]'),'Zum Produkt','back'],[$('[data-ux=account]'),'Entwurf speichern','save'],[$('.ux-canvas-help'),'Hilfe','help']])if(node){node.setAttribute('aria-label',label);node.title=label;node.innerHTML=uiIcon(symbol)+'<span class="ux-tool-label">'+label+'</span>';}
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
 if(window.parent.GravuruShopEntry){$('.ux-brand').hidden=true; $('.fk-order-status').hidden=true;}
 // Reserve the actual toolbar and checkout heights, including their wrapped
 // states. The dimension below the plate belongs inside this remaining space.
 let roomFrame=0;
 function fitStageRoom(){roomFrame=0;if(media.matches||full.open)return;const top=stage.getBoundingClientRect().top,dock=$('.fk-buy-dock'),height=dock&&!dock.hidden?dock.getBoundingClientRect().height:0;const room=Math.max(140,window.innerHeight-top-height-6);preview.style.setProperty('--ux-stage-room',Math.floor(room)+'px');}
 const scheduleRoom=()=>{if(!roomFrame)roomFrame=requestAnimationFrame(fitStageRoom);};
 const roomSync=el.sync;el.sync=function(...args){const result=roomSync.apply(this,args);scheduleRoom();return result;};
 const roomObserver=new ResizeObserver(scheduleRoom);for(const node of [heading,toolbar,preview,$('.fk-buy-dock')])if(node)roomObserver.observe(node);
 window.addEventListener('resize',scheduleRoom);full.addEventListener('close',scheduleRoom);scheduleRoom();
 window.addEventListener('pagehide',()=>{roomObserver.disconnect();if(roomFrame)cancelAnimationFrame(roomFrame);},{once:true});
 el.uxLayoutReady=true;el.uxRefreshTextToolbar?.();
}
