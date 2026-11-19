// Ladezeit: Schriften und Motivbibliothek des Kundeneditors nach Bedarf laden (Regeln in
// lazy-resources-model.mjs, Dateien aus lazy-resources-build.mjs unter /_runtime/lazy/).
// Ein Objekt erhält nur eine bereits geladene Schrift bzw. ein geladenes Motiv; Vorschau,
// Entwurfsprüfung und Export rechnen deshalb immer mit vorhandenen Konturen.
import {LAZY_BASE,startNeeds,draftNeeds,lazyUrls,motifLibraryUrl,coreCatalogUrl,libraryEntries,fontFileName,resourceNeeds,productFontIndex} from './lazy-resources-model.mjs';
import {observeVisibleResources} from './visible-resource-loader.mjs';

// `priority` (fetch-Priorität, Chromium): 'low' beim Vorladen im Hintergrund (preload-queue.mjs).
const fetchJSON=async(url,{priority}={})=>{
  let shared;
  try{shared=globalThis.window?.parent?.GravuruLoadEditorJson;}catch{/* Merchant previews can have a different parent origin. */}
  const pending=shared?.(url,{priority});
  if(pending)return pending;
  const response=await fetch(url,{credentials:'same-origin',...(priority?{priority}:{})});
  if(!response.ok)throw Error('Laden fehlgeschlagen: '+url.split('/').pop());
  return response.json();
};
const fonts=new Map(),motifs=new Map();let library=null;
const once=(cache,key,load)=>{if(!cache.has(key))cache.set(key,load().catch(error=>{cache.delete(key);throw error;}));return cache.get(key);};
const loadFont=(entry,get)=>once(fonts,entry.name+'|'+entry.url,()=>get(entry.url));
const loadMotif=(entry,get)=>once(motifs,entry.key,()=>get(entry.url));
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
// Hintergrund: Motivgeometrie nur im Leerlauf aufbereiten, damit Eingaben flüssig bleiben.
const idlePause=()=>new Promise(resolve=>typeof requestIdleCallback==='function'?requestIdleCallback(()=>resolve(),{timeout:500}):setTimeout(resolve,0));

// Precise contour validation needs the real glyph outlines before prepareConfig.
// A multi-size product can switch sizes synchronously, so include its source
// templates as well. Reuse the same font promises as the ordinary start loader.
export async function hydrateContourFonts(config,{get=fetchJSON}={}){
 if(config?.profile?.geometry?.shape!=='contour')return;
 const designs=config.familyFormats?.designs||config.profile.designs||[];
 const needed=new Set(resourceNeeds(designs.flatMap(d=>d.objects||[]),{localFonts:Object.keys(config.localResources?.fonts||{})}).fonts);
 const entries=productFontIndex(config).filter(f=>needed.has(f.name));
 const data=await Promise.all(entries.map(f=>loadFont(f,get)));
 if(entries.length){config.localResources.fonts??={};entries.forEach((f,i)=>{config.localResources.fonts[f.name]=data[i];});}
}

// Start: Kernkatalog und – parallel – nur die Schriften/Motive, die Designs des Produkts verwenden.
// Schriftdateinamen sind aus dem Namen ableitbar und laden parallel zum Kern; Bibliotheksmotive
// erst nach dem Kern (er unterscheidet Grundmotive von Bibliotheksmotiven). Der Index prüft danach.
export async function loadStart(config,{get=fetchJSON,base=LAZY_BASE}={}){
  const guess=startNeeds(config);
  const product=productFontIndex(config),byName=new Map(product.map(f=>[f.name,f]));
  const early=lazyUrls({fonts:guess.fonts},{fontIndex:guess.fonts.map(name=>byName.get(name)||({name,file:fontFileName(name)}))},base).fonts.map(f=>loadFont(f,get).catch(()=>null));
  // Each editor owns the mutable catalog; the public response can be shared across frames.
  const catalog=structuredClone(await get(coreCatalogUrl(base)));await Promise.all(early);
  // Produktschriften gehören in denselben Index: Schriftauswahl, Entwürfe und Warenkorb-Bearbeiten laden sie nach.
  if(product.length)catalog.font_index=[...(catalog.font_index||[]).filter(f=>!byName.has(f.name)),...product];
  const needs=startNeeds(config,{baseMotifs:Object.keys(catalog.motifs||{})});
  const urls=lazyUrls(needs,{fontIndex:catalog.font_index,motifIndex:catalog.motif_index},base);
  const [fontData,motifData]=await Promise.all([Promise.all(urls.fonts.map(f=>loadFont(f,get))),Promise.all(urls.motifs.map(m=>loadMotif(m,get)))]);
  urls.fonts.forEach((f,i)=>{catalog.fonts[f.name]=fontData[i];});
  return {catalog,entries:libraryEntries(catalog.motif_index,motifData.map(m=>structuredClone(m)))};
}

const LIBRARY_STYLE='[data-lazy-library-status]{margin:6px 0 10px;font-size:14px}';

// Hängt die Nachlader an einen montierten gravuru-configurator. `catalog`/`entries` sind die
// gemeinsamen Objekte des Editors (für erneutes Montieren), `prepare` = prepareMotifGeometry.
export function attach(el,{catalog,entries,prepare,get=fetchJSON,base=LAZY_BASE,previewGlyphs}={}){
  const fontIndex=catalog.font_index||[],motifIndex=catalog.motif_index||[],byKey=new Map(entries.map(e=>[e.key,e]));
  const addFont=(name,data)=>{catalog.fonts[name]=data;el.fontData[name]=data;if(Array.isArray(el.fontList)&&!el.fontList.includes(name))el.fontList.push(name);};
  const addMotif=m=>{const entry=byKey.get(m.key);if(entry&&entry!==m)Object.assign(entry,{svgFragment:m.svgFragment,bounds:m.bounds});const e=entry||m;
    el.motifs[e.key]=e.svgFragment;el.catalog.motifs[e.key]=e.svgFragment;el.catalog.motif_bounds[e.key]=e.bounds;if(el.labels)el.labels[e.key]=e.name;};
  async function prepared(list,{background=()=>false}={}){const copy=list.map(m=>structuredClone(m));for(let i=0;i<copy.length;i+=40){prepare(copy.slice(i,i+40));if(copy.length>40)await (background()?idlePause:pause)();}return copy;}
  el.uxKnownFonts=()=>[...new Set([...fontIndex.map(f=>f.name),...Object.keys(el.fontData)])];
  el.uxEnsureFonts=async(names=[],{priority}={})=>{
    const urls=lazyUrls({fonts:[...new Set(names)].filter(n=>!el.fontData[n])},{fontIndex},base).fonts;if(!urls.length)return;
    const data=await Promise.all(urls.map(f=>loadFont(f,url=>get(url,priority?{priority}:undefined))));
    urls.forEach((f,i)=>addFont(f.name,data[i]));el.uxFontChoicesRefresh?.();
  };
  el.uxEnsureAllFonts=()=>el.uxEnsureFonts(fontIndex.map(f=>f.name));
  // Hintergrund (preload-queue.mjs): Schriften einzeln nacheinander mit niedriger Priorität. Eine laufende
  // Schrift teilt sich die Anfrage mit uxEnsureFonts (Merker `fonts`), nichts wird doppelt geladen.
  el.uxPrefetchFonts=async({priority='low',names=null}={})=>{
    let added=0;
    const wanted=names?fontIndex.map(f=>f.name).filter(n=>names.includes(n)):fontIndex.map(f=>f.name);
    for(const font of lazyUrls({fonts:wanted},{fontIndex},base).fonts){
      if(el.fontData[font.name])continue;
      const data=await loadFont(font,url=>get(url,{priority}));
      if(!el.fontData[font.name]){addFont(font.name,data);added++;}
    }
    if(added)el.uxFontChoicesRefresh?.();
    return added;
  };
  el.uxEnsureMotifs=async(keys=[],{priority}={})=>{
    const urls=lazyUrls({motifs:[...new Set(keys)].filter(k=>el.motifs[k]===undefined)},{motifIndex},base).motifs;if(!urls.length)return;
    for(const m of await prepared(await Promise.all(urls.map(m=>loadMotif(m,url=>get(url,priority?{priority}:undefined))))))addMotif(m);
  };
  // Warm only the actual initial allowed cards, even while their tab is hidden.
  // Native per-item promises are shared with subsequent visible loading.
  el.uxPrefetchInitialMotifs=async()=>{
    const keys=[...new Set(el.uxInitialMotifKeys||[])].slice(0,6);let next=0;
    async function worker(){while(next<keys.length){const key=keys[next++];try{await el.uxEnsureMotifs([key],{priority:'low'});}catch{/* Optional warming never prevents opening the panel. */}}}
    await Promise.all([worker(),worker()]);el.uxLibraryRefresh?.();
  };
  // The full index already supplies search/category metadata. Only the real
  // contours of visible cards load now; an unrelated slow card blocks no other.
  if(el.shadowRoot?.querySelectorAll){
    const visible=observeVisibleResources({root:el.shadowRoot,selector:'[data-motif]',key:row=>row.dataset.motif,
      ready:key=>typeof el.motifs[key]==='string',load:key=>el.uxEnsureMotifs([key]),
      changed:()=>{el.uxLibraryRefresh?.();el.dispatchEvent(new CustomEvent('gravuru-motif-library',{detail:{partial:true}}));}});
    el.uxEnsureVisibleMotifs=()=>visible.refresh({retry:true});
  }
  el.uxPreviewFonts=Object.create(null);
  let settlePack=()=>{};
  el.uxPreviewGlyphsReady=new Promise(resolve=>{settlePack=resolve;});
  let packUrl=previewGlyphs||'';
  if(!packUrl){try{packUrl=globalThis.window?.parent?.UniversalConfig?.localResources?.previewGlyphs||'';}catch{packUrl='';}}
  const accept=pack=>{
   if(pack?.schema!=='gravuru-preview-glyphs/v1'||!pack.fonts||typeof pack.fonts!=='object')return;
   const next=Object.create(null);
   for(const [name,font] of Object.entries(pack.fonts))if(font?.regular?.glyphs)next[name]={regular:font.regular,...(font.bold?{bold:font.bold}:{}),previewSubset:true};
   el.uxPreviewFonts=next;el.uxRefreshThumbnails?.();
  };
  if(typeof packUrl==='string'&&/^\/_acryl-runtime\/lazy\/vorschau-glyphen\/[a-f0-9]{64}\.json$/.test(packUrl)){
   get(packUrl,{priority:'high'}).then(accept).catch(()=>{}).finally(settlePack);
  }else settlePack();
  el.uxEnsureDesignResources=async(design,options)=>{const needs=resourceNeeds(design?.objects,{localFonts:Object.keys(el.fontData),localMotifs:Object.keys(el.motifs)});await Promise.all([el.uxEnsureFonts(needs.fonts,options),el.uxEnsureMotifs(needs.motifs,options)]);};
  // Entwurf (Sitzungsschutz, Kundenkonto, Warenkorb, Datei): genau seine Schriften und Motive vor readDraft.
  el.uxEnsureDraftResources=async draft=>{
    const needs=draftNeeds(draft,{localFonts:Object.keys(el.fontData),localMotifs:Object.keys(el.motifs)});
    await Promise.all([el.uxEnsureFonts(needs.fonts),el.uxEnsureMotifs(needs.motifs)]);
  };
  let loading=null,urgent=false;
  el.uxMotifLibraryLoaded=()=>entries.every(e=>typeof e.svgFragment==='string');
  el.uxEnsureMotifLibrary=({priority}={})=>{
    if(el.uxMotifLibraryLoaded())return Promise.resolve();
    // Kunde öffnet den Motivbereich, während der Hintergrund lädt: dieselbe Anfrage, Aufbereitung ohne Leerlaufpausen.
    if(loading){if(priority!=='low')urgent=true;return loading;}
    urgent=priority!=='low';
    const r=el.shadowRoot,panel=r.querySelector('#panel-motif');
    if(!r.querySelector('style[data-lazy-library-style]')){const style=document.createElement('style');style.dataset.lazyLibraryStyle='';style.textContent=LIBRARY_STYLE;r.append(style);}
    let status=r.querySelector('[data-lazy-library-status]');
    if(!status&&panel){status=document.createElement('p');status.dataset.lazyLibraryStatus='';status.setAttribute('role','status');panel.prepend(status);}
    el.dataset.lazyLibrary='loading';if(status){status.hidden=false;status.textContent='Motive werden geladen …';}
    loading=(async()=>{
      library??=get(motifLibraryUrl(base),priority?{priority}:undefined).catch(error=>{library=null;throw error;});
      const fresh=(await library).filter(m=>el.motifs[m.key]===undefined);
      for(const m of await prepared(fresh,{background:()=>!urgent}))addMotif(m);
      el.uxLibraryRefresh?.();
      el.dataset.lazyLibrary='ready';if(status){status.hidden=true;status.textContent='';}
      el.dispatchEvent(new CustomEvent('gravuru-motif-library',{detail:{count:entries.length}}));
    })().catch(error=>{el.dataset.lazyLibrary='failed';if(status)status.textContent='Die Motive konnten nicht geladen werden. Bitte den Reiter „Motive“ erneut öffnen.';throw error;}).finally(()=>{loading=null;});
    return loading;
  };
}

