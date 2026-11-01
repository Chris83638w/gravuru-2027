import {captureDesignContent,carryDesignContent,capturePhotoFiles} from './design-content-transfer.mjs';
import {preserveProductSelection} from './product-design-transfer.mjs';
import {designGalleryCount} from './product-design-gallery-label.mjs';
import {isLayeredDoorbell} from './doorbell-selection.mjs';
import {isFamilyFormats} from './family-formats.mjs';

const money=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export const productChoiceInfo=item=>`${item.widthMm/10} × ${item.heightMm/10} cm · ${money(item.unitCents)}`;

export async function installProductDesignGallery({el,r,config,files,say,dialog,esc}){
 // These products already include their complete, format-specific design set.
 // Use the native gallery without repeating it across three main products.
 if(isLayeredDoorbell(config)||isFamilyFormats(config))return;
 let api;try{api=window.parent.GravuruShopEntry?.designGallery;}catch{}if(!api)return;
 el.uxHasProductDesignGallery=true;
 const profile=()=>el.uxSelectedProfile?.()||config.profile;
 const design=()=>profile().designs.find(d=>d.id===el.state.designId);
 const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/product-design-gallery.css').then(r=>{if(!r.ok)throw Error('Designauswahl konnte nicht geladen werden.');return r.text();});r.append(style);
 const section=document.createElement('section');section.className='ux-product-designs';
 section.innerHTML='<button type="button" class="ux-product-back" hidden>← Zur vorherigen Gestaltung</button><h3>Design auswählen</h3><button type="button" class="ux-product-open">Designs ansehen</button><p class="ux-product-result" role="status" hidden></p>';
 r.querySelector('#ux-panel-design')?.prepend(section);
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
 const gallery=dialog('product-designs','Designs deiner Produktlinie','<label class="ux-product-themes" hidden>Themen <select aria-label="Themen"><option value="preferred">Passende Themen zuerst</option><option value="all">Alle Themen</option></select></label><p class="ux-product-status" role="status"></p><div class="ux-product-grid"></div><button type="button" class="ux-product-more" hidden>Weitere Designs</button>');
 const status=gallery.querySelector('.ux-product-status'),grid=gallery.querySelector('.ux-product-grid'),more=gallery.querySelector('.ux-product-more');
 const confirm=dialog('product-design-confirm','Design wechseln','<p class="ux-product-summary"></p><p>Deine eigenen Texte und Fotos werden übernommen. Anordnung und Motive kommen von der neuen Vorlage. Zur vorherigen Gestaltung kannst du jederzeit zurück.</p><div class="ux-product-actions"><button type="button" data-product-cancel>Abbrechen</button><button type="button" data-product-confirm>Dieses Design wählen</button></div>');
 confirm.querySelector('[data-product-cancel]').onclick=()=>confirm.close();
 const themeLabel=gallery.querySelector('.ux-product-themes'),themes=themeLabel.querySelector('select');
 let next=0,loading=false,loaded=false,chosen=null;const urls=[];
 const queue=[];let active=0;
 const pump=()=>{while(active<2&&queue.length){const {item,img}=queue.shift();active++;Promise.resolve().then(()=>api.preview(item.target)).then(blob=>{const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.alt=item.designName;}).catch(()=>{img.alt='Vorschau nicht verfügbar';}).finally(()=>{active--;pump();});}};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target.previewRequest);pump();}},{root:gallery,rootMargin:'100px'}):null;
 async function load(){
  if(loading||next===null)return;loading=true;more.disabled=true;themes.disabled=true;status.textContent='Designs werden geladen …';
  try{
   const result=await api.load(next,themes.value);
   if(result.status==='preparing'){
    status.textContent='Designs werden vorbereitet – bitte gleich noch einmal versuchen.';
    more.textContent='Erneut versuchen';more.hidden=false;return;
   }
   themeLabel.hidden=!result.hasTheme;next=result.nextPage;loaded=true;more.textContent='Weitere Designs';
   for(const item of result.items){
    const card=document.createElement('button');card.type='button';card.className='ux-product-card ux-choice-tile';card.setAttribute('aria-pressed',String(item.current&&item.designId===el.state.designId));
    const img=document.createElement('img');img.alt='Vorschau wird geladen';img.width=240;img.height=160;card.append(img);
    card.setAttribute('aria-label','Design '+item.designName);
    const check=document.createElement('span');check.className='completion-check';check.textContent='✓';check.setAttribute('aria-hidden','true');card.append(check);
    card.onclick=()=>{if(item.current){gallery.close();if(item.designId!==el.state.designId)el.chooseDesign(item.designId);return;}chosen=item;confirm.querySelector('.ux-product-summary').textContent=item.designName+' – Neue Größe '+productChoiceInfo(item);confirm.showModal();};grid.append(card);
    img.previewRequest={item,img};if(observer)observer.observe(img);else queue.push({item,img});
   }
   if(!observer)pump();status.textContent=result.total?designGalleryCount(result.total):'Für dieses Produkt sind noch keine weiteren Designs verfügbar.';more.hidden=next===null;
  }catch(error){status.textContent=error.message||'Die Designauswahl ist gerade nicht erreichbar. Bitte erneut versuchen.';more.textContent='Erneut versuchen';more.hidden=false;}finally{loading=false;more.disabled=false;themes.disabled=false;}
 }
 themes.onchange=()=>{observer?.disconnect();queue.length=0;grid.replaceChildren();for(const url of urls)URL.revokeObjectURL(url);urls.length=0;next=0;loaded=false;load();};
 section.querySelector('.ux-product-open').onclick=()=>{gallery.showModal();if(!loaded)load();};more.onclick=load;
 confirm.querySelector('[data-product-confirm]').onclick=async()=>{
  if(!chosen)return;const button=confirm.querySelector('[data-product-confirm]');button.disabled=true;
  try{const content=captureDesignContent(el.state.objects,design());await api.choose(chosen.target,{selection:{options:structuredClone(el.state.mOptions||{}),quantity:Number(r.querySelector('[data-fk-quantity]')?.value||1)},content,photoFiles:capturePhotoFiles(content,files),sizeLabel:productChoiceInfo(chosen)});confirm.close();}
  catch(error){confirm.querySelector('.ux-product-summary').textContent=error.message;}finally{button.disabled=false;}
 };
 window.addEventListener('pagehide',()=>{observer?.disconnect();for(const url of urls)URL.revokeObjectURL(url);},{once:true});
 el.sync();
}
