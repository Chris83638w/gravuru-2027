import {createGalleryPager} from './gallery-pager.mjs';
import {uiIcon} from './ui-icons.mjs';
import {captureDesignContent,carryDesignContent,capturePhotoFiles} from './design-content-transfer.mjs';
import {preserveProductSelection} from './product-design-transfer.mjs';
import {designGalleryCount} from './product-design-gallery-label.mjs';
import {isLayeredDoorbell} from './product-model-module.mjs';
import {isFamilyFormats,isAllSizesFamily} from './family-formats.mjs';

const money=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export const productChoiceInfo=item=>`${item.widthMm/10} × ${item.heightMm/10} cm · ${money(item.unitCents)}`;

export async function installProductDesignGallery({el,r,config,files,say,dialog,esc}){
 // These products already include their complete, format-specific design set.
 // Use the native gallery without repeating it across three main products.
 // Türschild-Konfi mit allen Größen lädt nur das Startdesign; weitere Designs kommen über diese Auswahl.
 if(isLayeredDoorbell(config)||(isFamilyFormats(config)&&!config.familyFormats.fixedSize&&!isAllSizesFamily(config)))return;
 const allSizes=isAllSizesFamily(config),galleryOptions=()=>allSizes?structuredClone(el.state.mOptions||{}):undefined;
 let api;try{api=window.parent.GravuruShopEntry?.designGallery;}catch{}if(!api)return;
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
  const result=carryDesignContent(pending.content||{texts:pending.texts||[],photos:[]},design(),config,{id:()=>el.id()});
  for(const photo of pending.content?.photos||[])if(!pending.photoFiles?.some(f=>f.id===photo.uxUploadId&&f.asset?.file))throw Error('Eine Fotodatei fehlt. Deine bisherige Gestaltung bleibt erhalten.');
  for(const item of pending.photoFiles||[]){const asset=item.asset;files.set(item.id,{...asset,url:URL.createObjectURL(asset.blob||asset.file)});}
  el.state.objects=result.objects;el.state.selected=null;el.normalize();el.sync();
  const note=section.querySelector('.ux-product-result');note.hidden=false;note.textContent='Deine Texte und Fotos wurden übernommen. Bitte die neue Anordnung prüfen.';say(note.textContent);
  r.querySelector('#ux-tab-design')?.click();el.uxMobileSteps?.show('design',{scroll:false});
 }catch(error){window.parent.postMessage({type:'gravuru-design-transfer-failed',message:error.message},location.origin);throw error;}}
 const gallery=section;
 const status=gallery.querySelector('.ux-product-status'),grid=gallery.querySelector('.ux-product-grid'),more=gallery.querySelector('.ux-product-more');
 const preview=dialog('product-design-preview','Designvorschau','<p data-preview-status role="status"></p><img data-product-preview alt="" hidden>');
 const previewImage=preview.querySelector('[data-product-preview]'),previewStatus=preview.querySelector('[data-preview-status]');
 const themeLabel=gallery.querySelector('.ux-product-themes'),themes=themeLabel.querySelector('select');
 const pager=createGalleryPager((page,theme,options)=>api.load(page,theme,options));
 let epoch=0,switching=false,previewSource=null,retryTimer,prepareRetries=0;const urls=[],queue=[];let active=0;
 const pump=()=>{while(active<2&&queue.length){const request=queue.shift(),{item,img,version}=request;
  if(version!==epoch||img.previewStarted)continue;img.previewStarted=true;active++;
  Promise.resolve().then(()=>api.preview(item.target,item.previewUrl)).then(blob=>{
   if(version!==epoch)return;const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.alt=item.designName;
   if(previewSource===img){previewImage.src=url;previewImage.hidden=false;previewStatus.textContent='';}
  }).catch(()=>{img.alt='Vorschau nicht verfügbar';if(previewSource===img)previewStatus.textContent='Die Vorschau ist gerade nicht erreichbar. Bitte erneut versuchen.';img.previewStarted=false;
  }).finally(()=>{active--;pump();});}};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target.previewRequest);pump();}},{rootMargin:'150px'}):null;
 async function choose(item){
  if(switching)return;
  if(item.current&&profile().designs.some(d=>d.id===item.designId)){if(item.designId!==el.state.designId)el.chooseDesign(item.designId);return;}
  switching=true;grid.inert=true;back.disabled=true;status.textContent='Design wird übernommen …';
  try{const content=captureDesignContent(el.state.objects,design());await api.choose(item.target,{selection:{options:structuredClone(el.state.mOptions||{}),quantity:Number(r.querySelector('[data-fk-quantity]')?.value||1)},content,photoFiles:capturePhotoFiles(content,files),sizeLabel:productChoiceInfo(item)});status.textContent='';}
  catch(error){status.textContent=error.message;}
  finally{switching=false;grid.inert=false;back.disabled=false;}
 }
 async function load(){
  if(pager.loading||pager.next===null)return;const version=epoch;more.disabled=true;themes.disabled=true;status.textContent='Designs werden geladen …';
  try{
   const result=await pager.load(themes.value,galleryOptions());if(!result)return;
   if(result.status==='preparing'){
    status.textContent='Designs werden vorbereitet …';more.textContent='Erneut versuchen';more.hidden=false;
    if(prepareRetries++<4)retryTimer=setTimeout(load,1200);return;
   }
   prepareRetries=0;themeLabel.hidden=!result.hasTheme;more.textContent='Weitere Designs';
   for(const item of result.items){
    const card=document.createElement('div');card.className='ux-product-card ux-choice-tile';
    const select=document.createElement('button');select.type='button';select.className='ux-product-choose';select.setAttribute('aria-pressed',String(item.current&&item.designId===el.state.designId));select.setAttribute('aria-label','Design '+item.designName);
    if(item.current)select.dataset.productDesignId=item.designId;
    const img=document.createElement('img');img.alt='Vorschau wird geladen';img.width=240;img.height=160;select.append(img);
    const check=document.createElement('span');check.className='completion-check';check.textContent='✓';check.setAttribute('aria-hidden','true');select.append(check);select.onclick=()=>choose(item);
    const zoom=document.createElement('button');zoom.type='button';zoom.className='ux-product-enlarge';zoom.innerHTML=uiIcon('zoom');zoom.setAttribute('aria-label','Designvorschau vergrößern: '+item.designName);zoom.title='Design vergrößern';
    zoom.onclick=()=>{previewSource=img;previewImage.alt=item.designName;previewImage.hidden=!img.getAttribute('src');previewStatus.textContent=previewImage.hidden?'Vorschau wird geladen …':'';if(!previewImage.hidden)previewImage.src=img.src;else{queue.unshift(img.previewRequest);pump();}preview.showModal();};
    card.append(select,zoom);grid.append(card);
    img.previewRequest={item,img,version};if(observer)observer.observe(img);else queue.push(img.previewRequest);
   }
   if(!observer)pump();status.textContent=result.total?designGalleryCount(result.total):'Für dieses Produkt sind noch keine weiteren Designs verfügbar.';more.hidden=pager.next===null;
  }catch(error){status.textContent=error.message||'Die Designauswahl ist gerade nicht erreichbar. Bitte erneut versuchen.';more.textContent='Erneut versuchen';more.hidden=false;}
  finally{if(version===epoch){more.disabled=false;themes.disabled=false;}}
 }
 function reset(){epoch++;pager.reset();clearTimeout(retryTimer);prepareRetries=0;observer?.disconnect();queue.length=0;previewSource=null;if(preview.open)preview.close();grid.replaceChildren();for(const url of urls)URL.revokeObjectURL(url);urls.length=0;load();}
 themes.onchange=reset;
 // Invalidate stale pages even if size/mounting changes during a pending request.
 let shownFor=JSON.stringify(galleryOptions()??null);
 const sync=el.sync;el.sync=function(...args){const result=sync.apply(this,args),now=JSON.stringify(galleryOptions()??null);if(now!==shownFor){shownFor=now;reset();}for(const card of grid.querySelectorAll('.ux-product-choose'))card.setAttribute('aria-pressed',String(card.dataset.productDesignId===el.state.designId));return result;};more.onclick=()=>{clearTimeout(retryTimer);load();};
 window.addEventListener('pagehide',()=>{epoch++;pager.reset();clearTimeout(retryTimer);observer?.disconnect();for(const url of urls)URL.revokeObjectURL(url);},{once:true});
 el.sync();
 // Begin loading immediately; the editor itself does not wait for thumbnails.
 load();
}
