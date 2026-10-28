import {captureProductTexts,transferProductTexts} from './product-design-transfer.mjs';

const money=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(cents/100);
export const productChoiceInfo=item=>`${item.widthMm/10} × ${item.heightMm/10} cm · ${money(item.unitCents)}`;
const shapeName=item=>item.shape==='ellipse'?(item.widthMm===item.heightMm?'Rund':'Oval'):item.shape==='contour'?'Kontur':item.widthMm===item.heightMm?'Quadrat':'Rechteck';

export async function installProductDesignGallery({el,r,config,say,dialog,esc}){
 let api;try{api=window.parent.GravuruShopEntry?.designGallery;}catch{}if(!api)return;
 el.uxHasProductDesignGallery=true;
 const profile=()=>el.uxSelectedProfile?.()||config.profile;
 const design=()=>profile().designs.find(d=>d.id===el.state.designId);
 const style=document.createElement('style');style.textContent=await fetch('/configurator/variant-m/product-design-gallery.css').then(r=>{if(!r.ok)throw Error('Designauswahl konnte nicht geladen werden.');return r.text();});r.append(style);
 const section=document.createElement('section');section.className='ux-product-designs';
 section.innerHTML='<button type="button" class="ux-product-back" hidden>← Zur vorherigen Gestaltung</button><h3>Alle Formen und Größen</h3><p>Wähle ein Design. Größe und Produktpreis stehen direkt dabei.</p><button type="button" class="ux-product-open">Designs ansehen</button><p class="ux-product-result" role="status" hidden></p>';
 r.querySelector('#ux-panel-design')?.prepend(section);
 const back=section.querySelector('.ux-product-back');back.hidden=!api.canGoBack();back.onclick=()=>{try{api.back();}catch(error){say(error.message);}};
 const pending=api.takeTransfer();
 if(pending){
  const result=transferProductTexts(pending.texts,el.state.objects,design(),config);el.state.selected=null;el.normalize();el.sync();
  const note=section.querySelector('.ux-product-result');note.hidden=false;
  const details=[`Neue Größe ${pending.sizeLabel||''}`,`${result.transferred.length} Text${result.transferred.length===1?'':'e'} übernommen.`];
  if(result.remaining.length)details.push('Bitte noch eintragen: '+result.remaining.map(t=>`${t.text} (${t.reason})`).join(' · '));
  if(pending.hasMedia)details.push('Dein Foto bleibt in der vorherigen Gestaltung. Hier kannst du es neu auswählen.');
  note.textContent=details.join(' ');say(details.join(' '));
 }
 const gallery=dialog('product-designs','Designs aller Formen und Größen','<p class="ux-product-status" role="status"></p><div class="ux-product-grid"></div><button type="button" class="ux-product-more" hidden>Weitere Designs</button>');
 const status=gallery.querySelector('.ux-product-status'),grid=gallery.querySelector('.ux-product-grid'),more=gallery.querySelector('.ux-product-more');
 const confirm=dialog('product-design-confirm','Design wechseln','<p class="ux-product-summary"></p><p>Deine passenden Texte werden übernommen. Fotos, Logos und zusätzlich gesetzte Motive bleiben in der vorherigen Gestaltung. Dorthin kannst du jederzeit zurück.</p><div class="ux-product-actions"><button type="button" data-product-cancel>Abbrechen</button><button type="button" data-product-confirm>Dieses Design wählen</button></div>');
 confirm.querySelector('[data-product-cancel]').onclick=()=>confirm.close();
 let next=0,loading=false,loaded=false,chosen=null;const urls=[];
 const queue=[];let active=0;
 const pump=()=>{while(active<2&&queue.length){const {item,img}=queue.shift();active++;Promise.resolve().then(()=>api.preview(item.target)).then(blob=>{const url=URL.createObjectURL(blob);urls.push(url);img.src=url;img.alt=item.designName;}).catch(()=>{img.alt='Vorschau nicht verfügbar';}).finally(()=>{active--;pump();});}};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target.previewRequest);pump();}},{root:gallery,rootMargin:'100px'}):null;
 async function load(){
  if(loading||next===null)return;loading=true;more.disabled=true;status.textContent='Designs werden geladen …';
  try{
   const result=await api.load(next);next=result.nextPage;loaded=true;
   for(const item of result.items){
    const card=document.createElement('button');card.type='button';card.className='ux-product-card ux-choice-tile';card.setAttribute('aria-pressed',String(item.current&&item.designId===el.state.designId));
    const img=document.createElement('img');img.alt='Vorschau wird geladen';img.width=240;img.height=160;card.append(img);
    const title=document.createElement('strong');title.textContent=item.designName;card.append(title);
    const info=document.createElement('span');info.textContent=shapeName(item)+' · '+productChoiceInfo(item);card.append(info);
    const name=document.createElement('small');name.textContent=item.productName;card.append(name);
    const check=document.createElement('span');check.className='completion-check';check.textContent='✓';check.setAttribute('aria-hidden','true');card.append(check);
    card.onclick=()=>{chosen=item;confirm.querySelector('.ux-product-summary').textContent=item.designName+' – Neue Größe '+productChoiceInfo(item);confirm.showModal();};grid.append(card);
    img.previewRequest={item,img};if(observer)observer.observe(img);else queue.push({item,img});
   }
   if(!observer)pump();status.textContent=result.total?`${result.total} verfügbare Designs`:'Für dieses Produkt sind noch keine weiteren Designs verfügbar.';more.hidden=next===null;
  }catch(error){status.textContent=error.message;}finally{loading=false;more.disabled=false;}
 }
 section.querySelector('.ux-product-open').onclick=()=>{gallery.showModal();if(!loaded)load();};more.onclick=load;
 confirm.querySelector('[data-product-confirm]').onclick=async()=>{
  if(!chosen)return;const button=confirm.querySelector('[data-product-confirm]');button.disabled=true;
  try{await api.choose(chosen.target,{texts:captureProductTexts(el.state.objects,design()),hasMedia:el.state.objects.some(o=>o.uxUploadId&&!o.uxHidden),sizeLabel:productChoiceInfo(chosen)});confirm.close();}
  catch(error){confirm.querySelector('.ux-product-summary').textContent=error.message;}finally{button.disabled=false;}
 };
 window.addEventListener('pagehide',()=>{observer?.disconnect();for(const url of urls)URL.revokeObjectURL(url);},{once:true});
 el.sync();
}
