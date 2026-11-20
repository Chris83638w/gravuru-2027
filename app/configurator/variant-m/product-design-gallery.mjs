import {saveDataActive,idleScheduler} from './preload-queue.mjs';
import {createGalleryPager} from './gallery-pager.mjs';
import {captureDesignContent,carryDesignContent,capturePhotoFiles} from './design-content-transfer.mjs';
import {isPhotoUnsupported,createPhotoDropConfirm} from './photo-drop-confirm.mjs';
import {preserveProductSelection} from './product-design-transfer.mjs';
import {designGalleryCount} from './product-design-gallery-label.mjs';
import {isLayeredDoorbell} from './product-model-module.mjs';
import {isFamilyFormats,isAllSizesFamily} from './family-formats.mjs';
import {installDesignSearchControl} from './design-search-control.mjs';
import {installNativeDesignSearch} from './native-design-search.mjs';
import {planDesignAdoption} from './design-adoption.mjs';

const money=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export const productChoiceInfo=item=>`${item.widthMm/10} × ${item.heightMm/10} cm · ${money(item.unitCents)}`;

export async function installProductDesignGallery({el,r,config,files,say,dialog,esc}){
 // These products already include their complete, format-specific design set.
 // Use the native gallery without repeating it across three main products.
 // Türschild-Konfi mit allen Größen lädt nur das Startdesign; weitere Designs kommen über diese Auswahl.
 if(isLayeredDoorbell(config)||(isFamilyFormats(config)&&!config.familyFormats.fixedSize&&!isAllSizesFamily(config)))return installNativeDesignSearch({el,r,config});
 const allSizes=isAllSizesFamily(config),galleryOptions=()=>allSizes?structuredClone(el.state.mOptions||{}):undefined;
 let api;try{api=window.parent.GravuruShopEntry?.designGallery;}catch{}if(!api)return installNativeDesignSearch({el,r,config});
 el.uxHasProductDesignGallery=true;
 const profile=()=>el.uxSelectedProfile?.()||config.profile;
 const design=()=>profile().designs.find(d=>d.id===el.state.designId);
 const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/product-design-gallery.css').then(r=>{if(!r.ok)throw Error('Designauswahl konnte nicht geladen werden.');return r.text();});r.append(style);
 const section=document.createElement('section');section.className='ux-product-designs';
 section.innerHTML='<button type="button" class="ux-product-back" hidden>← Zur vorherigen Gestaltung</button><h2>Wähle dein Design</h2><p class="ux-product-result" role="status" hidden></p><label class="ux-product-themes" hidden>Themen <select aria-label="Themen"><option value="preferred">Passende Themen zuerst</option><option value="all">Alle Themen</option></select></label><p class="ux-product-status" role="status"></p><div class="ux-product-grid"></div><button type="button" class="ux-product-more" hidden>Weitere Designs</button>';
 r.querySelector('#ux-panel-design')?.prepend(section);
 r.querySelector('#ux-panel-design')?.setAttribute('data-inline-product-designs','true');
 const back=section.querySelector('.ux-product-back');back.hidden=!api.canGoBack();back.onclick=()=>{try{api.back();}catch(error){say(error.message);}};
 const pending=api.takeTransfer();
 if(pending){try{
  const selection=preserveProductSelection(pending.selection,config);
  if(selection){el.state.mOptions=selection.options;const quantity=r.querySelector('[data-fk-quantity]');if(quantity)quantity.value=String(selection.quantity);}
  const result=carryDesignContent(pending.content||{texts:pending.texts||[],photos:[]},design(),config,{id:()=>el.id(),geometry:el.uxProfileGeometry?.()||profile().geometry});
  for(const photo of pending.content?.photos||[])if(!pending.photoFiles?.some(f=>f.id===photo.uxUploadId&&f.asset?.file))throw Error('Eine Fotodatei fehlt. Deine bisherige Gestaltung bleibt erhalten.');
  for(const item of pending.photoFiles||[]){const asset=item.asset;files.set(item.id,{...asset,url:URL.createObjectURL(asset.blob||asset.file)});}
  el.state.objects=result.objects;el.state.selected=null;
  // Nicht zuordenbare Texte und frei mitgenommene Fotos: freie Fläche statt über dem ersten Feld (Chris 13.11.2026).
  for(const key of result.added){const o=el.state.objects.find(o=>o.id===key);if(o)el.uxPlaceObject?.(o);}
  el.normalize();el.sync();
  const note=section.querySelector('.ux-product-result');note.hidden=false;note.textContent='Deine Texte und Fotos wurden übernommen. Bitte die neue Anordnung prüfen.';say(note.textContent);
  r.querySelector('#ux-tab-design')?.click();el.uxMobileSteps?.show('design',{scroll:false});
 }catch(error){window.parent.postMessage({type:'gravuru-design-transfer-failed',message:error.message},location.origin);throw error;}}
 const gallery=section;
 const status=gallery.querySelector('.ux-product-status'),grid=gallery.querySelector('.ux-product-grid'),more=gallery.querySelector('.ux-product-more');
 const themeLabel=gallery.querySelector('.ux-product-themes'),themes=themeLabel.querySelector('select');
 grid.id='ux-design-search-results';
 const pager=createGalleryPager((page,theme,options,q)=>api.load(page,theme,options,q));
 let epoch=0,previewEpoch=0,previewsActive=true,switching=false,retryTimer,prepareRetries=0;const urls=[],queue=[],active=new Set(),requests=new Set();
 const cancelPreviews=()=>{previewEpoch++;queue.length=0;for(const controller of active)controller.abort();active.clear();for(const {img} of requests)if(!img.src)img.previewStarted=false;};
 const pump=()=>{while(previewsActive&&active.size<2&&queue.length){const request=queue.shift(),{item,img,version}=request;
  if(version!==epoch||img.previewStarted)continue;img.previewStarted=true;const controller=new AbortController(),generation=previewEpoch;active.add(controller);
  Promise.resolve().then(()=>{if(!controller.signal.aborted)return api.preview(item.target,item.previewUrl,controller.signal);}).then(blob=>{
   if(version!==epoch||generation!==previewEpoch||controller.signal.aborted)return;const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.alt=item.designName;
  }).catch(()=>{if(version===epoch&&generation===previewEpoch&&!controller.signal.aborted){img.alt='Vorschau nicht verfügbar';img.previewStarted=false;}
  }).finally(()=>{if(active.delete(controller))pump();});}};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(!previewsActive)return;for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target.previewRequest);pump();}},{rootMargin:'150px'}):null;
 function warmPreviews(){
  if(!observer||!previewsActive||saveDataActive(window.navigator?.connection))return;
  const version=epoch,generation=previewEpoch,warmRequests=[...requests].filter(request=>request.warm&&!request.img.src);
  idleScheduler(window,{timeout:600})(()=>{if(previewsActive&&version===epoch&&generation===previewEpoch){queue.push(...warmRequests);pump();}});
 }
 function setPreviewActivity(value){
  if(previewsActive===value)return;previewsActive=value;
  if(!value){observer?.disconnect();cancelPreviews();return;}
  for(const request of requests)if(!request.img.src){if(observer)observer.observe(request.img);else queue.push(request);}
  warmPreviews();pump();
 }
 const unsubscribePreviews=api.onPreviewActivity?.(setPreviewActivity);
 const confirmPhotoDrop=createPhotoDropConfirm(dialog);
 const search=installDesignSearchControl({container:section,before:themeLabel,onChange:()=>load(),onInvalidate:()=>invalidate()});
 async function choose(item){
  if(switching)return;
  const known=()=>item.current?profile().designs.find(d=>d.id===item.designId):undefined;
  // Auftrag #265 (Weg A): Ein weiteres Design desselben Produktstands wird nachgeholt und im laufenden Editor
  // gewählt. Sitzung, Produktzuordnung und Preis bleiben dieselben. Scheitert das Nachholen, greift der bisherige Wechsel.
  if(item.current&&!known()&&allSizes&&api.loadDesign&&el.uxAdoptDesignModel){
   const note=status.textContent;switching=true;grid.inert=true;status.textContent='Design wird übernommen …';
   try{
    const loaded=structuredClone((await api.loadDesign(item.designId)).universal);
    const updateGallery=planDesignAdoption(config,loaded,item.designId);
    el.uxAdoptDesignModel(loaded,item.designId);
    updateGallery();
   }
   catch{/* Der bisherige Wechsel über den Server bleibt der Rückweg. */}
   finally{switching=false;grid.inert=false;status.textContent=note;}
  }
  const template=known();
  if(template){
   if(item.designId===el.state.designId)return;
   try{await el.uxEnsureDesignResources?.(template);el.chooseDesign(item.designId);}
   catch(error){status.textContent=error.message;say(error.message);}
   return;
  }
  switching=true;if(!api.onPreviewActivity)setPreviewActivity(false);grid.inert=true;back.disabled=true;status.textContent='Design wird übernommen …';
  const send=content=>api.choose(item.target,{selection:{options:structuredClone(el.state.mOptions||{}),quantity:Number(r.querySelector('[data-fk-quantity]')?.value||1)},content,photoFiles:capturePhotoFiles(content,files),sizeLabel:productChoiceInfo(item)});
  try{const content=captureDesignContent(el.state.objects,design());
   try{await send(content);}
   catch(error){
    // Neues Produkt ohne Fotofunktion: erst nach dem Hinweis ohne Foto wechseln (Chris 13.11.2026).
    if(!isPhotoUnsupported(error)||!content.photos.length)throw error;
    status.textContent='';if(!await confirmPhotoDrop()){status.textContent='Design nicht gewechselt. Dein Foto bleibt erhalten.';return;}
    status.textContent='Design wird übernommen …';await send({...content,photos:[]});
   }
   status.textContent='';}
  catch(error){status.textContent=error.message;say(error.message);status.scrollIntoView?.({block:'nearest'});}
  finally{switching=false;if(!api.onPreviewActivity)setPreviewActivity(true);grid.inert=false;back.disabled=false;}
 }
 async function load(){
  if(pager.loading||pager.next===null)return;const version=epoch;more.disabled=true;themes.disabled=true;status.textContent='Designs werden geladen …';
  try{
   const firstPage=pager.next===0,query=search.query;
   const result=await pager.load(themes.value,galleryOptions(),query);if(!result||version!==epoch)return;
   if(result.status==='preparing'){
    status.textContent='Designs werden vorbereitet …';more.textContent='Erneut versuchen';more.hidden=false;
    if(prepareRetries++<4)retryTimer=setTimeout(load,1200);return;
   }
   prepareRetries=0;themeLabel.hidden=!result.hasTheme;more.textContent='Weitere Designs';
   const initial=grid.children.length===0;let warmCount=0;
   for(const item of result.items){
    const card=document.createElement('div');card.className='ux-product-card ux-choice-tile';
    const select=document.createElement('button');select.type='button';select.className='ux-product-choose';select.setAttribute('aria-pressed',String(item.current&&item.designId===el.state.designId));select.setAttribute('aria-label','Design '+item.designName);
    if(item.current)select.dataset.productDesignId=item.designId;
    const img=document.createElement('img');img.alt='Vorschau wird geladen';img.width=240;img.height=160;select.append(img);
    const check=document.createElement('span');check.className='completion-check';check.textContent='✓';check.setAttribute('aria-hidden','true');select.append(check);select.onclick=()=>choose(item);
    card.append(select);grid.append(card);
    img.previewRequest={item,img,version,warm:initial&&warmCount++<3};requests.add(img.previewRequest);
    if(previewsActive){if(observer)observer.observe(img);else queue.push(img.previewRequest);}
   }
   warmPreviews();
   if(!observer)pump();status.textContent=query?(result.total===1?'1 Design gefunden':result.total?result.total+' Designs gefunden':'Keine passenden Designs gefunden. Versuche einen anderen Begriff oder leere die Suche.'):(result.total?designGalleryCount(result.total):'Für dieses Produkt sind noch keine weiteren Designs verfügbar.');more.hidden=pager.next===null;
   if(firstPage&&query)el.uxReportDesignSearch?.(query,result.total);
  }catch(error){status.textContent=error.message||'Die Designauswahl ist gerade nicht erreichbar. Bitte erneut versuchen.';more.textContent='Erneut versuchen';more.hidden=false;}
  finally{if(version===epoch){more.disabled=false;themes.disabled=false;}}
 }
 function invalidate(){epoch++;pager.reset();clearTimeout(retryTimer);prepareRetries=0;observer?.disconnect();cancelPreviews();requests.clear();grid.replaceChildren();for(const url of urls)URL.revokeObjectURL(url);urls.length=0;more.hidden=true;el.uxReportDesignSearch?.('',0);status.textContent='Designs werden gesucht …';}
 function reset(){invalidate();load();}
 themes.onchange=reset;
 // Invalidate stale pages even if size/mounting changes during a pending request.
 let shownFor=JSON.stringify(galleryOptions()??null);
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args),now=JSON.stringify(galleryOptions()??null);if(now!==shownFor){shownFor=now;reset();}for(const card of grid.querySelectorAll('.ux-product-choose'))card.setAttribute('aria-pressed',String(card.dataset.productDesignId===el.state.designId));return result;};more.onclick=()=>{clearTimeout(retryTimer);load();};
 window.addEventListener('pagehide',()=>{search.dispose();previewsActive=false;epoch++;pager.reset();clearTimeout(retryTimer);unsubscribePreviews?.();observer?.disconnect();cancelPreviews();for(const url of urls)URL.revokeObjectURL(url);},{once:true});
 el.sync();
 // Begin loading immediately; the editor itself does not wait for thumbnails.
 load();
}
