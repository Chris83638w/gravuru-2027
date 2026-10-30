// K11 (Ü13.1, Entscheidung A6): Unter 768 px wird der Kundeneditor als geführte Schritte
// gezeigt – Platte oben fest, ein Schritt je Bildschirm, Werkzeugleiste unten.
// Der Desktop (≥ 768 px) behält die Reiter aus ux.mjs unverändert; dieses Modul
// bildet die vorhandenen Reiter nur auf Schritte ab und verschiebt keine Logik.

import {pricesHidden} from './option-images.mjs';
import {customerTextLine} from './text-summary.mjs';
import {visibleBy,optionFields,fieldValue,fieldDisplay} from './option-fields.mjs';

export const MOBILE_MAX_WIDTH=767;
export const MOBILE_QUERY='(max-width:'+MOBILE_MAX_WIDTH+'px)';
export const PREVIEW_FRACTION=.4;
export const PREVIEW_FRACTION_KEYBOARD=.25;
export const PREVIEW_MIN_PX=120;
// Safari mit sichtbarer Browserleiste: auch auf kurzen Displays genügend Höhe
// für 90 % Plattenbreite; der Bearbeitungsbereich bleibt separat scrollbar.
export const PREVIEW_FRACTION_SMALL=.5;
export const SMALL_VIEWPORT_PX=760;

// Reihenfolge der geführten Schritte. `tabs` sind die Desktop-Reiter (`data-ux-tab`),
// die der Schritt gemeinsam zeigt; „Prüfen“ hat keinen Reiter.
export const STEPS=Object.freeze([
  {id:'options',label:'Optionen',tabs:['options']},
  {id:'design',label:'Design',tabs:['design']},
  {id:'text',label:'Text',tabs:['text']},
  // Foto und Motiv sind getrennte Schritte (Chris 20.10.2026: „Foto und Motiv dürfen nicht zusammen sein“).
  {id:'media',label:'Foto',tabs:['upload']},
  {id:'motif',label:'Motive',tabs:['motif']},
  {id:'review',label:'Prüfen',tabs:[]}
]);

// Verfügbare Schritte aus dem Reiterzustand (`{tab:true|false}`; versteckte Reiter fehlen).
// Beschriftung von Foto/Motiv folgt den tatsächlich vorhandenen Reitern.
export function availableSteps(tabs={},labels={}){
  const steps=[];
  for(const step of STEPS){
    const present=step.tabs.filter(tab=>tabs[tab]);
    if(step.tabs.length&&!present.length)continue;
    let label=step.label;
    if(step.id==='media')label=labels.upload||'Foto';
    steps.push({id:step.id,label,tabs:present});
  }
  return steps;
}

export function stepIndex(steps,id){return steps.findIndex(step=>step.id===id);}
export function stepForTab(steps,tab){return steps.find(step=>step.tabs.includes(tab))?.id||null;}
export function neighbourStep(steps,current,delta){
  const i=stepIndex(steps,current);if(i<0)return steps[0]?.id||null;
  const next=steps[i+delta];return next?next.id:null;
}
export function progress(steps,current){
  const count=steps.length,index=Math.max(0,stepIndex(steps,current));
  return {index,count,percent:count?Math.round((index+1)/count*100):0};
}

// Höhe der festen Vorschau: 40 % des sichtbaren Bereichs, bei Texteingabe 25 %.
export function previewHeight({viewportHeight,keyboardOpen=false}){
  const fraction=keyboardOpen?PREVIEW_FRACTION_KEYBOARD:Number(viewportHeight||0)<SMALL_VIEWPORT_PX?PREVIEW_FRACTION_SMALL:PREVIEW_FRACTION;
  return Math.max(PREVIEW_MIN_PX,Math.round(Number(viewportHeight||0)*fraction));
}

// Scroll the input list, never the parent preview/step shell.
export function revealEditorField(field,editor){
 const f=field.getBoundingClientRect(),e=editor.getBoundingClientRect();
 editor.scrollTo({top:Math.max(0,editor.scrollTop+f.top-e.top-(editor.clientHeight-f.height)/2),behavior:'smooth'});
}

const MATERIAL_NAMES={acrylic:'Acrylglas',acryl:'Acrylglas',steel:'Edelstahl',stainless:'Edelstahl',slate:'Schiefer',aluminium:'Alu-Dibond',alu:'Alu-Dibond',wood:'Holz',glass:'Glas'};
export function materialLabel(material){
  if(!material)return '';
  const kind=typeof material==='string'?material:material.kind||material.name||'';
  const name=material.label||MATERIAL_NAMES[String(kind).toLowerCase()]||kind;
  const thickness=typeof material==='object'&&Number.isFinite(material.thicknessMm)?' · '+String(material.thicknessMm).replace('.',',')+' mm':'';
  return name?name+thickness:'';
}
const sizeLabel=geometry=>geometry&&Number.isFinite(geometry.width)&&Number.isFinite(geometry.height)?geometry.width+' × '+geometry.height+' mm':'';

// Zusammenfassung für den Schritt „Prüfen“: Größe, Material, Optionen, Preis.
// Reine Funktion über dem Produktstand – keine zweite Preislogik, der Preis kommt als Text.
export function summaryRows({profile,legacy,state,quantity=1,totalText='',designName=''}){
  const rows=[];
  const groups=profile?.optionGroups||[];
  const chosen=group=>group.values?.find(v=>v.id===(state?.mOptions?.[group.id]||group.defaultValueId));
  // K14 / Ü12.1: unsichtbare Gruppen (visibleIf) und Felder erscheinen nicht in der Zusammenfassung.
  const picked={};for(const g of groups)if(visibleBy(g.visibleIf,picked)){const v=chosen(g);if(v)picked[g.id]=v.id;}
  const fieldRows=[];for(const f of optionFields(profile)){if(!visibleBy(f.visibleIf,picked))continue;let v;try{v=fieldValue(f,state?.mOptions?.[f.id]);}catch{v=undefined;}if(v===undefined)continue;if(f.kind==='select')picked[f.id]=v;fieldRows.push([f.label,fieldDisplay(f,v)]);}
  const sizeGroup=groups.find(g=>g.id==='size'||/größe|groesse|format/i.test(g.name||g.label||''));
  const size=sizeGroup?chosen(sizeGroup)?.label:sizeLabel(profile?.geometry);
  if(size)rows.push(['Größe',size]);
  const material=materialLabel(profile?.material)||(state?.fkColor?'Acrylglas · '+(state.fkColor==='anthrazit'?'Anthrazit':'Schwarz'):'');
  if(material)rows.push(['Material',material]);
  const options=groups.filter(g=>g!==sizeGroup&&picked[g.id]!==undefined).map(g=>chosen(g)?.label).filter(Boolean);
  if(options.length)rows.push(['Optionen',options.join(' · ')]);
  else if(legacy?.mounting&&state?.fkMounting){const m=legacy.mounting.options?.find(v=>v.key===state.fkMounting);if(m)rows.push(['Befestigung',m.name]);}
  rows.push(...fieldRows);
  if(designName)rows.push(['Design',designName]);
  const objects=(state?.objects||[]).filter(o=>!o.uxHidden);
  const texts=customerTextLine(objects,profile?.designs?.find(d=>d.id===state?.designId));
  rows.push(['Texte',texts||'Keine']);
  const photos=objects.filter(o=>o.uxUploadId).length;
  if(photos)rows.push(['Fotos / Logos',String(photos)]);
  rows.push(['Menge',String(Math.max(1,Number(quantity)||1))]);
  if(totalText)rows.push(['Preis',totalText]);
  return rows;
}

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Beide Ansichten benutzen dieselben Steuerelemente und damit denselben geprüften
// Speicher-/Warenkorbweg. Insbesondere darf der deaktivierte lokale Knopf den
// verbundenen Shop-Knopf nicht verdecken. Statusmeldungen bleiben auch ohne sync sichtbar.
export function moveMobileCheckout(root,cartSlot,statusSlot){
  const shop=root.querySelector('[data-shop-cart]');
  const button=shop||root.querySelector('.fk-buy-button');
  const status=root.querySelector(shop?'[data-shop-cart-status]':'.fk-order-status');
  const places=[];
  for(const [node,target] of [[button,cartSlot],[status,statusSlot]]){
    if(!node||!target)continue;
    places.push({node,parent:node.parentNode,next:node.nextSibling,hidden:node.hidden});
    target.append(node);
  }
  if(button)button.hidden=false;
  return ()=>{for(const {node,parent,next,hidden} of [...places].reverse()){
    if(node===button)node.hidden=hidden;
    // Den laufenden Speicherzustand (disabled, Text, Status-Sichtbarkeit) erhalten.
    if(parent)parent.insertBefore(node,next?.parentNode===parent?next:null);
  }};
}

export async function installMobileSteps(api){
  const {el,r,profile,config,legacy,showTab,say,button}=api;
  const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
  const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/mobile.css').then(res=>{if(!res.ok)throw Error('Mobile Oberfläche fehlt.');return res.text();});r.append(style);
  const shell=$('.ux-shell'),editor=$('.ux-editor');
  // Werkzeugleiste unten (Daumenzone): Fortschritt, Schritte, Zurück/Weiter, Preis, Warenkorb.
  const bar=document.createElement('nav');bar.className='ux-mobile-bar';bar.setAttribute('aria-label','Schritte der Gestaltung');bar.hidden=true;
  bar.innerHTML=`<div class="ux-mobile-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Fortschritt"><span></span></div><ol class="ux-mobile-steps"></ol><div class="ux-mobile-nav">${button('mobile-prev','‹ Zurück','class="ux-mobile-prev"')}${button('price','<strong data-ux-mobile-total aria-live="polite"></strong><small>Preisdetails</small>','class="ux-mobile-price" aria-label="Preisdetails anzeigen"')}${button('mobile-next','Weiter ›','class="ux-mobile-next ux-primary"')}<span class="ux-mobile-cart" data-ux-mobile-cart hidden></span></div>`;
  shell.append(bar);
  const review=document.createElement('section');review.className='ux-panel ux-mobile-review';review.id='ux-panel-review';review.setAttribute('aria-label','Prüfen und bestellen');review.hidden=true;
  review.innerHTML='<h2>Prüfen & bestellen</h2><p>Deine Auswahl im Überblick. Jeder Schritt bleibt frei erreichbar.</p><section class="ux-mobile-issues" data-ux-mobile-issues hidden></section><dl class="ux-mobile-summary" data-ux-mobile-summary></dl><div class="ux-mobile-quantity" data-ux-mobile-quantity></div><div class="ux-mobile-order-status" data-ux-mobile-status></div>';
  $('#ux-panel-upload').after(review);
  const stepsList=bar.querySelector('.ux-mobile-steps'),progressBar=bar.querySelector('.ux-mobile-progress'),prev=bar.querySelector('[data-ux=mobile-prev]'),next=bar.querySelector('[data-ux=mobile-next]'),cartSlot=bar.querySelector('[data-ux-mobile-cart]');
  const media=matchMedia(MOBILE_QUERY);
  let active=false,current='options',steps=[],signature='',applying=false,restoreCheckout=null;
  const tabLabel=tab=>$('#ux-tab-'+tab)?.textContent.trim()||'';
  const tabState=()=>Object.fromEntries(all('[data-ux-tab]').map(b=>[b.dataset.uxTab,!b.hidden&&!b.disabled]));
  const selectedTab=()=>all('[data-ux-tab]').find(b=>b.getAttribute('aria-selected')==='true')?.dataset.uxTab||'options';
  // Elemente, die auf Mobile an anderer Stelle sitzen; beim Wechsel zurück an den Ursprung.
  const moved=new Map();
  function relocate(node,target){if(!node||moved.has(node))return;moved.set(node,{parent:node.parentNode,next:node.nextSibling,hidden:node.hidden});target.append(node);}
  function restoreAll(){for(const [node,place] of moved){node.hidden=place.hidden;if(place.parent)place.parent.insertBefore(node,place.next&&place.next.parentNode===place.parent?place.next:null);}moved.clear();}
  function renderSteps(){
    const list=availableSteps(tabState(),{upload:tabLabel('upload')||'Foto'});
    const key=JSON.stringify(list);
    if(key!==signature){signature=key;steps=list;stepsList.innerHTML=steps.map((step,i)=>`<li>${button('mobile-step',`<span class="ux-mobile-step-no" aria-hidden="true">${i+1}</span><span class="ux-mobile-step-label">${esc(step.label)}</span>`,`data-step="${esc(step.id)}"`)}</li>`).join('');}
    if(stepIndex(steps,current)<0)current=stepForTab(steps,selectedTab())||steps[0]?.id||'options';
    const state=progress(steps,current);
    progressBar.setAttribute('aria-valuenow',String(state.percent));progressBar.setAttribute('aria-valuetext','Schritt '+(state.index+1)+' von '+state.count);progressBar.firstElementChild.style.width=state.percent+'%';
    for(const b of all('[data-ux=mobile-step]')){const is=b.dataset.step===current;if(is)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.classList.toggle('is-done',stepIndex(steps,b.dataset.step)<state.index);}
    prev.hidden=state.index===0;next.hidden=current==='review';
    cartSlot.hidden=current!=='review';
    const upcoming=steps[state.index+1];if(!next.dataset.loading)next.textContent=upcoming?.id==='review'?'Zur Prüfung ›':'Weiter ›';
  }
  function applyPanels(){
    const step=steps.find(s=>s.id===current);
    for(const panel of all('.ux-editor > .ux-panel')){
      const show=panel===review?current==='review':!!step&&step.tabs.some(tab=>panel.id==='ux-panel-'+tab);
      if(panel.hidden!==!show)panel.hidden=!show;
    }
  }
  function renderReview(){
    if(!active||current!=='review')return;
    const designName=profile?.designs?.find(d=>d.id===el.state.designId)?.name||'';
    const quantity=$('[data-fk-quantity]')?.value||1,totalText=pricesHidden(config)?'':$('[data-fk-total]')?.textContent.trim()||'';
    const rows=summaryRows({profile,legacy,state:el.state,quantity,totalText,designName});
    review.querySelector('[data-ux-mobile-summary]').innerHTML=rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('');
    // K1-Hinweise (Pflichtfeld, Limit) und fehlendes Pflichtfoto sichtbar vor dem Warenkorb.
    let issues=[];try{issues=el.uxTextIssues?.()||[];}catch{}
    const missingPhoto=el.state.objects.filter(o=>!o.uxHidden&&o.type==='photoSlot'&&o.required&&!o.uxUploadId);
    const box=review.querySelector('[data-ux-mobile-issues]');
    box.hidden=!issues.length&&!missingPhoto.length;
    box.innerHTML=(issues.length||missingPhoto.length?'<h3>Bitte noch prüfen</h3>':'')+issues.map(issue=>`<p>${esc(issue.message)} ${button('mobile-issue','Zum Feld',`data-id="${esc(issue.id)}"`)}</p>`).join('')+missingPhoto.map(()=>`<p>Bitte dein Foto hochladen. ${button('mobile-goto','Zum Foto','data-step="media"')}</p>`).join('');
  }
  function showStep(id,{scroll=true}={}){
    if(!active)return;
    const step=steps.find(s=>s.id===id);if(!step)return;
    const changed=current!==id;current=id;r.host.dataset.uxStep=id;
    if(step.tabs.length&&!step.tabs.includes(selectedTab())){applying=true;try{showTab(step.tabs[0]);}finally{applying=false;}}
    renderSteps();applyPanels();renderReview();
    if(changed&&scroll){editor.scrollTop=0;const stepButton=all('[data-ux=mobile-step]').find(b=>b.dataset.step===id);stepButton?.scrollIntoView?.({block:'nearest',inline:'center'});}
  }
  // Reiterwechsel aus ux.mjs (Hilfe, Fotoupload, Pflichtfeld-Sprung) landen im passenden Schritt.
  new MutationObserver(records=>{
    if(!active||applying)return;
    const tab=records.map(rec=>rec.target).find(node=>node.getAttribute?.('aria-selected')==='true')?.dataset.uxTab;
    if(!tab)return;const id=stepForTab(steps,tab);if(id&&id!==current)showStep(id);else applyPanels();
  }).observe($('.ux-tabs'),{attributes:true,subtree:true,attributeFilter:['aria-selected']});
  // Sichtbarer Bereich (visualViewport): Shell folgt der Tastatur, Platte bleibt im Bild.
  const vv=window.visualViewport;
  const fieldFocused=()=>{const node=r.activeElement;return !!node&&!!node.closest('.ux-editor,.ux-direct-input,.ux-direct-edit')&&node.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=color]):not([type=button])');};
  let viewportOverride=null;
  function applyViewport(){
    if(!active)return;
    const height=viewportOverride?.height??(vv?vv.height:window.innerHeight),top=viewportOverride?.top??(vv?vv.offsetTop:0);
    const keyboardOpen=(fieldFocused()&&height<window.innerHeight*.75)||(viewportOverride?.keyboardOpen===true);
    r.host.style.setProperty('--ux-vv-height',Math.round(height)+'px');
    r.host.style.setProperty('--ux-vv-top',Math.round(top)+'px');
    r.host.style.setProperty('--ux-mobile-preview-h',previewHeight({viewportHeight:height,keyboardOpen})+'px');
    r.host.dataset.uxKeyboard=String(keyboardOpen);el.uxRefreshTextToolbar?.();if(keyboardOpen){const layout=$('.ux-layout');if(layout)layout.scrollTop=0;}
  }
  el.uxMobileSteps={get active(){return active;},get current(){return current;},get steps(){return steps.map(s=>s.id);},show:showStep,applyViewport:(override=null)=>{viewportOverride=override;applyViewport();}};
  const notes=new Map();
  // Die Altvorschau (.mobile-preview) zeichnet das ganze Schild bei jedem sync neu; im Handy-Zustand ist
  // die Platte immer sichtbar und die Altvorschau ausgeblendet – dort nichts zeichnen (Leistung 20.10.2026).
  if(typeof el.updateMobilePreview==='function'&&!el.updateMobilePreview.uxMobileGuard){const original=el.updateMobilePreview;el.updateMobilePreview=function(...args){if(active)return;return original.apply(this,args);};el.updateMobilePreview.uxMobileGuard=true;}
  function enter(){
    if(active)return;active=true;r.host.dataset.uxMobile='true';
    restoreCheckout=moveMobileCheckout(r,cartSlot,review.querySelector('[data-ux-mobile-status]'));
    relocate($('label.fk-quantity'),review.querySelector('[data-ux-mobile-quantity]'));
    // Hinweise (Stand wiederhergestellt, Überlagerung …) nicht über/in der Platte, sondern oben im
    // Bearbeitungsbereich – sonst schrumpft die feste Platte auf einen Streifen (Fehler 20.10.2026).
    const editor=$('.ux-editor');
    for(const node of [$('.ux-conflict-hints')])if(node&&editor&&!notes.has(node)){notes.set(node,{parent:node.parentNode,next:node.nextSibling});editor.prepend(node);}
    bar.hidden=false;renderSteps();current=stepForTab(steps,selectedTab())||steps[0]?.id||'options';
    showStep(current,{scroll:false});applyViewport();updateTotal();
  }
  function leave(){
    if(!active)return;active=false;delete r.host.dataset.uxMobile;delete r.host.dataset.uxKeyboard;delete r.host.dataset.uxStep;
    for(const name of ['--ux-vv-height','--ux-vv-top','--ux-mobile-preview-h'])r.host.style.removeProperty(name);
    bar.hidden=true;review.hidden=true;restoreCheckout?.();restoreCheckout=null;restoreAll();
    for(const [node,place] of notes){if(place.parent)place.parent.insertBefore(node,place.next&&place.next.parentNode===place.parent?place.next:null);}notes.clear();
    const tab=selectedTab();applying=true;try{showTab(tab);}finally{applying=false;}
  }
  function updateTotal(){const total=$('[data-fk-total]')?.textContent.trim()||'';const node=bar.querySelector('[data-ux-mobile-total]');if(node&&node.textContent!==total)node.textContent=total;}
  const apply=()=>{if(media.matches)enter();else leave();};
  media.addEventListener('change',apply);
  for(const type of ['resize','scroll'])vv?.addEventListener(type,applyViewport);
  window.addEventListener('resize',applyViewport);
  r.addEventListener('focusin',e=>{if(!active)return;applyViewport();const field=e.target;
    // Direktbearbeitung auf der Platte (uxTextTap → uxEditText) gehört zum Schritt Text.
    if(field.closest('.ux-direct-input')&&!['text','media','motif'].includes(current))showStep('text',{scroll:false});
    if(field.closest('.ux-editor')&&fieldFocused())setTimeout(()=>{if(r.activeElement===field)revealEditorField(field,editor);},280);});
  r.addEventListener('focusout',()=>{if(active)setTimeout(applyViewport,0);});
  r.addEventListener('click',e=>{
    if(!active)return;const b=e.target.closest('[data-ux]');if(!b||b.disabled)return;const key=b.dataset.ux;
    // Schrittwechsel über die Leiste: Auswahl auf der Platte nur in Text/Foto/Motiv behalten.
    const go=async id=>{if(!id)return;if(['review'].includes(id)&&el.uxCheckLayout&&!await el.uxCheckLayout())return;if(!['text','media','motif'].includes(id)&&el.state.selected){el.state.selected=null;el.sync();}showStep(id);};
    if(key==='mobile-step'||key==='mobile-goto'){go(b.dataset.step);return;}
    if(key==='mobile-prev'||key==='mobile-next'){
     const target=neighbourStep(steps,current,key==='mobile-next'?1:-1);
     if(key==='mobile-prev'){go(target);return;}
     if(b.dataset.loading)return;b.dataset.loading='true';b.disabled=true;b.setAttribute('aria-busy','true');b.textContent='Lädt…';
     requestAnimationFrame(async()=>{try{if(!el.uxCheckLayout||await el.uxCheckLayout())await go(target);}catch(error){say(error.message||'Bitte die Gestaltung prüfen.');}finally{delete b.dataset.loading;b.disabled=false;b.removeAttribute('aria-busy');renderSteps();}});
     return;
    }
    if(key==='mobile-issue'){el.uxRevealTextIssue?.(b.dataset.id);return;}
  });
  const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args);if(active){renderSteps();applyPanels();renderReview();updateTotal();}return result;};
  apply();
  return {show:showStep,isActive:()=>active};
}
