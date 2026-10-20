// Ladefolge nach dem Start (preload-queue.mjs) für den Kundeneditor: Optionsbilder → Schriften → Motive,
// erst wenn die Oberfläche fertig und das Szenenbild da ist. Kunde öffnet vorher einen Bereich → sofort.
import {createPreloadQueue,idleScheduler} from './preload-queue.mjs';
import {ACRYLIC_BASES,acrylicBaseImageUrl} from './acrylic-product.mjs';

// Bilder für Schritt 1 „Optionen“ des aktiven Produkts (Acryl: alle Sockelansichten; sonst Bild-URLs der Optionswerte).
export function optionImageUrls(config){
  const urls=new Set();
  if(config?.acrylic)for(const base of ACRYLIC_BASES){const url=acrylicBaseImageUrl(base.asset);if(url)urls.add(url);}
  for(const group of config?.profile?.optionGroups||[])for(const value of group.values||[])
    for(const url of [value.image,value.imageUrl,value.image?.url,value.media?.url])if(typeof url==='string'&&/^\/[^/]/.test(url)&&/\.(webp|png|jpe?g|svg)(\?|$)/i.test(url))urls.add(url);
  return [...urls];
}

// Welcher Bereich nach einer Kundenaktion sichtbar ist → welche Aufgabe vorgezogen wird.
export const PANEL_TASKS=[['#ux-panel-options','images'],['#ux-panel-text','fonts'],['#ux-panel-motif','motifs']];

export function installBackgroundLoading({el,r,config,win=window}){
  if(el.uxPreload)return el.uxPreload;
  const log=[];el.uxPreloadLog=log;
  const queue=createPreloadQueue({idle:idleScheduler(win),connection:win.navigator?.connection||null,onEvent:event=>log.push({...event,t:Math.round(win.performance?.now?.()??0)})});
  el.uxPreload=queue;
  // Bilder: ein Image je URL (bleibt in der Liste verfügbarer Bilder des Dokuments, die Szene nutzt es ohne neuen Abruf).
  const images=new Map();el.uxPreloadedImages=images;
  const loadImage=(url,priority)=>{
    if(images.has(url))return images.get(url).promise;
    const image=new win.Image();image.decoding='async';if(priority)image.fetchPriority=priority;
    const promise=new Promise(resolve=>{image.onload=()=>resolve(image);image.onerror=()=>{images.delete(url);resolve(null);};});
    image.src=url;images.set(url,{image,promise});return promise;
  };
  const urls=optionImageUrls(config);
  queue.add('images',{background:async()=>{for(const url of urls)await loadImage(url,'low');},now:()=>Promise.all(urls.map(url=>loadImage(url,'high')))});
  const ensureAllFonts=el.uxEnsureAllFonts,ensureLibrary=el.uxEnsureMotifLibrary;
  queue.add('fonts',{background:()=>el.uxPrefetchFonts?.({priority:'low'}),now:()=>ensureAllFonts?.()});
  queue.add('motifs',{background:()=>ensureLibrary?.({priority:'low'}),now:()=>ensureLibrary?.(),saveData:'skip'});
  // Bestehende Aufrufer (Reiter „Motive“, Schriftauswahl) laufen über die Warteschlange und ziehen vor.
  if(ensureAllFonts)el.uxEnsureAllFonts=()=>queue.request('fonts');
  if(ensureLibrary)el.uxEnsureMotifLibrary=(options={})=>options.priority==='low'?ensureLibrary(options):queue.request('motifs');
  // Kundenaktionen: Schritt/Reiter gewechselt, Schriftauswahl oder Optionsfeld angefasst.
  const promoteVisible=()=>{for(const [selector,key] of PANEL_TASKS){const panel=r.querySelector(selector);if(panel&&!panel.hidden&&panel.offsetParent!==null)queue.request(key).catch(()=>{});}};
  r.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const target=event.target;
    if(target.closest?.('[data-ux=fonts],[data-ux=add-text]'))queue.request('fonts').catch(()=>{});
    if(target.closest?.('[data-ux-tab],[data-ux=mobile-step],[data-ux=mobile-next],[data-ux=mobile-prev]'))win.setTimeout(promoteVisible,0);
  });
  for(const type of ['pointerdown','focusin'])r.addEventListener(type,event=>{if(event.isTrusted&&event.target.closest?.('select[data-m-option],[data-m-option]'))queue.request('images').catch(()=>{});});
  // Start erst, wenn die Seite steht: Oberfläche fertig (installUX ruft das am Ende) und Szenenbild geladen.
  const scene=r.querySelector('.acryl-backdrop');
  const start=()=>queue.start();
  if(scene&&!(scene.complete&&scene.naturalWidth>0)){scene.addEventListener('load',start,{once:true});scene.addEventListener('error',start,{once:true});}
  else start();
  return queue;
}
