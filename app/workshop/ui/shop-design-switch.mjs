import {copyProductSelection} from './shop-selection-transfer.mjs';
import {createShopEntryClient} from './shop-entry-client.mjs';

// A product switch starts a new customer session. Never carry the previous
// cart configuration/revision/line to the other product.
export function switchedEditorPath(data,fragment){
 const params=new URLSearchParams();
 if(fragment.get('embed')==='1'&&['a','b'].includes(fragment.get('leiste')))params.set('leiste',fragment.get('leiste'));
 return data.editorPath+(params.size?'?'+params:'');
}
export function switchedModel(data,result){
 const model=structuredClone(data.model),binding=data.binding;
 for(const key of ['productId','productRevision','shopifyProductId','shopifyVariantId'])if(binding?.[key]!==result.binding?.[key])throw Error('Die Produktzuordnung wurde geändert. Bitte die Designauswahl neu öffnen.');
 if(model.configuration.id!==binding.productId||model.configuration.revision!==binding.productRevision||!model.universal.profile.designs.some(d=>d.id===result.designId))throw Error('Dieses Design gehört nicht zum gewählten Produkt.');
 model.universal.profile.defaultDesignId=result.designId;
 if(model.legacy)model.legacy.defaultDesignId=result.designId;
 return {...data,model};
}

// Auftrag #265, Stufe 2 (Chris 20.11.2026): Der Server liefert für ein weiteres Design nur dessen Design-Teile
// (shop-start-model.mjs, shopDesignParts) samt Fingerabdruck des Rests. Hier werden sie in das eigene Startmodell
// eingesetzt. Heraus kommt dasselbe Modell, das `model?design=` geliefert hätte; die Übernahme im Editor
// (design-adoption.mjs) prüft es wie bisher. Preise, Größen, Materialien und Regeln stammen immer aus dem eigenen Modell.
const partsRefused=()=>Error('Dieses Design wird über den bisherigen Weg geladen.');
export function universalWithDesignParts(base,parts,designId){
 const f=base?.familyFormats,lists=parts?.designIds;
 if(typeof designId!=='string'||parts?.designId!==designId||!Array.isArray(parts.profileDesigns)||!parts.profileDesigns.some(d=>d?.id===designId)||
    !Array.isArray(parts.familyDesigns)||!Array.isArray(parts.motifs)||!Array.isArray(lists)||!Array.isArray(f?.formats)||lists.length!==f.formats.length||!base.profile)throw partsRefused();
 const formats=f.formats.map((format,i)=>{
  if(!Array.isArray(lists[i])||lists[i].length!==format.variants?.length||!lists[i].every(ids=>Array.isArray(ids)&&ids.every(id=>typeof id==='string')))throw partsRefused();
  return {...format,variants:format.variants.map((variant,j)=>({...variant,designIds:lists[i][j]}))};
 });
 const optional=(target,key,value)=>{if(value===null||value===undefined)delete target[key];else target[key]=value;return target;};
 const profile=optional({...base.profile,defaultDesignId:designId,designs:parts.profileDesigns},'themeId',parts.themeId);
 const shopProduct=optional(optional({...f.source?.shopProduct},'defaultDesignId',parts.shopProduct?.defaultDesignId),'themeId',parts.shopProduct?.themeId);
 const universal={...base,profile,familyFormats:{...f,designs:parts.familyDesigns,formats,source:{...f.source,shopProduct}}};
 optional(universal,'workshopElementRights',parts.rights);
 const own=base.localResources?.motifs;
 if(base.localResources)universal.localResources={...base.localResources,...(Array.isArray(own)||parts.motifs.length?{motifs:[...(own||[]).filter(m=>m?.embeddedOnly!==true),...parts.motifs]}:{})};
 else if(parts.motifs.length)throw partsRefused();
 return universal;
}

// Mehrere Designs als ein gemeinsamer Satz Teile, damit der Editor sie in einem Schritt aufnimmt (wie Variante C: alles im Gerät).
// Gleiche Kennung mit anderem Inhalt gibt es bei einem Produktstand nicht; kommt sie doch vor, wird nichts zusammengeführt.
export function mergeDesignParts(list){
 if(!Array.isArray(list)||!list.length||!list.every(p=>Array.isArray(p?.profileDesigns)&&Array.isArray(p.familyDesigns)&&Array.isArray(p.motifs)&&Array.isArray(p.designIds)))throw partsRefused();
 const unique=(items,key)=>{const seen=new Map();for(const item of items){const id=item?.[key];if(typeof id!=='string')throw partsRefused();
  if(!seen.has(id))seen.set(id,item);else if(seen.get(id)!==item&&JSON.stringify(seen.get(id))!==JSON.stringify(item))throw partsRefused();}return [...seen.values()];};
 const first=list[0],rights={};let hasRights=false;
 for(const parts of list)for(const [id,value] of Object.entries(parts.rights||{})){
  if(Object.hasOwn(rights,id)&&JSON.stringify(rights[id])!==JSON.stringify(value))throw partsRefused();rights[id]=value;hasRights=true;}
 return {...first,profileDesigns:unique(list.flatMap(p=>p.profileDesigns),'id'),familyDesigns:unique(list.flatMap(p=>p.familyDesigns),'id'),
  designIds:first.designIds.map((variants,i)=>{if(!Array.isArray(variants))throw partsRefused();return variants.map((_,j)=>[...new Set(list.flatMap(p=>{const ids=p.designIds[i]?.[j];if(!Array.isArray(ids))throw partsRefused();return ids;}))]);}),
  rights:hasRights||list.some(p=>p.rights)?rights:null,motifs:unique(list.flatMap(p=>p.motifs),'key')};
}

// Old frames remain alive (including the customer's selected photo File).
// A failed load restores the previous frame and its original private gateway.
// Only an explicit successful switch updates the fragment/session.
export function createDesignSwitch({initial,fragment,container,activate,toDataUrl,win=window,doc=document,clientFactory=createShopEntryClient,timeoutMs=60000,readyFallbackMs=20000}){
 let current={...initial,fragment:new URLSearchParams(fragment),pending:null},busy=false;
 const history=[];
 // Startzeit (Chris 13.11.2026, „Schnellerer Start“): Die Designauswahl rechnet auf dem Server alle Designs.
 // Läuft das parallel zum Start, warten die Dateien des Editors darauf. Deshalb fordert ein Editor seine
 // Designliste erst an, wenn er seine Fertigmeldung geschickt hat. Die Ladebild-Vorschau ist davon nicht betroffen.
 // Sicherheitsnetz: Bleibt die Fertigmeldung aus, lädt die Liste nach readyFallbackMs trotzdem.
 const known=new Set(),readiness=new WeakMap();
 const readyState=entry=>{let state=readiness.get(entry);if(!state){let resolve;const promise=new Promise(r=>{resolve=r;});state={ready:false,promise,resolve};readiness.set(entry,state);}return state;};
 const markReady=entry=>{const state=readyState(entry);if(!state.ready){state.ready=true;state.resolve();}};
 const whenReady=entry=>{const state=readyState(entry);if(state.ready)return state.promise;
  if(!state.fallback)state.fallback=win.setTimeout(()=>markReady(entry),readyFallbackMs);return state.promise;};
 win.addEventListener('message',event=>{
  const origin=win.location?.origin;if(!origin||event.origin!==origin||event.data?.type!=='gravuru-ux-ready')return;
  for(const entry of known)if(entry.frame?.contentWindow&&entry.frame.contentWindow===event.source)markReady(entry);
 });
 known.add(current);
 const previewListeners=new WeakMap(),previewActive=entry=>current===entry&&!busy;
 const notifyPreviews=entry=>{for(const listener of previewListeners.get(entry)||[])try{listener(previewActive(entry));}catch{/* Optional preloading cannot break the design transfer. */}};
 const checkRead=entry=>{if(current!==entry)throw Error('Diese Gestaltung ist nicht mehr aktiv.');};
 // Stufe 2: Design-Teile je Gestaltung. Der Editor fordert sie nach der Designliste in kleinen Gruppen an (loadDesigns);
 // ein Fehler oder ein anderer Fingerabdruck heißt nur: dieses Design nimmt den bisherigen Weg über das vollständige Modell.
 const cartEdit=entry=>['config','rev','line'].some(key=>entry.fragment.has(key));
 const partsFor=new WeakMap();
 function preloadParts(entry,ids,{background=false}={}){
  const base=entry.data?.designBase,data=entry.data;
  if(typeof entry.client?.loadDesignParts!=='function'||typeof base!=='string'||!base||cartEdit(entry))return;
  // Datensparmodus: nichts ungefragt holen. Ein angeklicktes Design lädt trotzdem die kleinen Teile statt des ganzen Modells.
  if(background&&win.navigator?.connection?.saveData===true)return;
  let map=partsFor.get(entry);if(!map){map=new Map();partsFor.set(entry,map);}
  const wanted=[...new Set(ids)].filter(id=>typeof id==='string'&&id&&id.length<=200&&!id.includes(',')&&!map.has(id)).slice(0,48);
  if(!wanted.length)return;
  const request=Promise.resolve().then(()=>entry.client.loadDesignParts(wanted)).then(loaded=>{
   for(const key of ['productId','productRevision','shopifyProductId','shopifyVariantId'])if(loaded.binding?.[key]===undefined||loaded.binding[key]!==data.binding?.[key])return new Map();
   if(loaded.configuration?.id!==data.model.configuration.id||loaded.configuration?.revision!==data.model.configuration.revision)return new Map();
   return new Map(loaded.designs.filter(d=>d?.base===base&&d.parts?.designId===d.id).map(d=>[d.id,d.parts]));
  });
  for(const id of wanted)map.set(id,request.then(found=>found.get(id)??null,()=>null));
 }
 const check=entry=>{if(current!==entry||busy)throw Error('Bitte warten, bis das Design vollständig geladen ist.');};
 const show=entry=>{entry.frame.hidden=false;entry.frame.inert=false;entry.frame.style.display='';entry.frame.style.visibility='';entry.frame.style.position='';entry.frame.style.inset='';};
 const setFragment=entry=>win.history.replaceState(win.history.state,'','#'+entry.fragment);
 function api(entry){return Object.freeze({
  load:(page,theme,options,q)=>{checkRead(entry);return whenReady(entry).then(()=>{checkRead(entry);return entry.client.loadDesignGallery(page,theme,options,q);});},
  preview:(target,url,signal)=>{checkRead(entry);if(!previewActive(entry))throw Object.assign(Error('Vorschauen warten auf den Designwechsel.'),{name:'AbortError'});return entry.client.loadDesignPreview(target,url,signal);},
  onPreviewActivity:listener=>{let listeners=previewListeners.get(entry);if(!listeners){listeners=new Set();previewListeners.set(entry,listeners);}listeners.add(listener);listener(previewActive(entry));return ()=>listeners.delete(listener);},
  hasPendingTransfer:()=>!!entry.pending,
  takeTransfer:()=>{const value=entry.pending;entry.pending=null;return value;},
  // Auftrag #265 (Weg A): Modell eines weiteren Designs derselben Sitzung nur lesen. Sitzung, Rahmen und Adresse bleiben unverändert.
  loadDesign:async designId=>{
   checkRead(entry);
   // Ein Entwurf aus dem Warenkorb ist fest an sein Design gebunden (acrylic_draft_identity). Dort bleibt der bisherige Wechsel.
   if(cartEdit(entry))throw Error('Beim Bearbeiten aus dem Warenkorb bleibt der bisherige Designwechsel.');
   // Stufe 2: zuerst die vorgeladenen Design-Teile; fehlen sie oder passen sie nicht, folgt das vollständige Modell wie in Stufe 1.
   preloadParts(entry,[designId]);
   const parts=await partsFor.get(entry)?.get(designId);checkRead(entry);
   if(parts){try{return {universal:universalWithDesignParts(entry.data.model.universal,parts,designId)};}catch{/* vollständiges Modell als Rückweg */}}
   const loaded=await entry.client.loadModel(designId);checkRead(entry);
   for(const key of ['productId','productRevision','shopifyProductId','shopifyVariantId'])if(loaded.binding?.[key]===undefined||loaded.binding[key]!==entry.data.binding?.[key])throw Error('Die Produktzuordnung wurde geändert. Bitte die Designauswahl neu öffnen.');
   if(loaded.model.configuration.id!==entry.data.model.configuration.id||loaded.model.configuration.revision!==entry.data.model.configuration.revision||!loaded.model.universal.profile.designs.some(d=>d.id===designId))throw Error('Dieses Design gehört nicht zum gewählten Produkt.');
   return {universal:loaded.model.universal};
  },
  // Stufe 2: die genannten Designs im Hintergrund holen und als EIN Modell liefern. Liefert null, wenn nichts vorliegt; holt nie ein vollständiges Modell.
  loadDesigns:async ids=>{
   checkRead(entry);if(cartEdit(entry)||!Array.isArray(ids))return null;
   preloadParts(entry,ids,{background:true});
   const map=partsFor.get(entry),found=[];if(!map)return null;
   for(const id of ids){const parts=await map.get(id);if(parts)found.push(parts);}
   checkRead(entry);if(!found.length)return null;
   try{return {universal:universalWithDesignParts(entry.data.model.universal,mergeDesignParts(found),found[0].designId),designIds:found.map(parts=>parts.designId)};}catch{return null;}
  },
  canGoBack:()=>history.length>0||!!entry.previous,
  back:()=>{check(entry);const previous=history.pop();if(!previous)return false;current=previous;notifyPreviews(entry);entry.frame.remove();activate(previous,api(previous));show(previous);setFragment(previous);notifyPreviews(previous);return true;},
  choose:async(target,transfer)=>{
   check(entry);busy=true;notifyPreviews(entry);let candidate=null,removeListener=()=>{};
   try{
    const result=await entry.client.switchDesign(target),client=clientFactory({token:result.token});
    const data=switchedModel(await client.loadModel(result.designId),result);
    const selection=copyProductSelection(transfer?.selection,data.model.universal);
    const resources=await client.loadResources(data.model.universal,toDataUrl);
    const nextFragment=new URLSearchParams(entry.fragment);for(const key of ['config','rev','line'])nextFragment.delete(key);nextFragment.set('s',result.token);nextFragment.set('design',result.designId);
    const frame=doc.createElement('iframe');frame.title=data.model.name+' personalisieren';frame.style.visibility='hidden';frame.style.position='absolute';frame.style.inset='0';
    candidate={client,data,resources,frame,fragment:nextFragment,pending:structuredClone({...transfer||{texts:[]},...(selection?{selection}:{})}),previous:entry};known.add(candidate);
    const ready=new Promise((resolve,reject)=>{
     const timer=win.setTimeout(()=>{removeListener();reject(Error('Das neue Design konnte nicht vollständig geladen werden. Deine vorherige Gestaltung bleibt erhalten.'));},timeoutMs);
     const listener=event=>{if(event.origin===win.location.origin&&event.source===frame.contentWindow&&['gravuru-ux-ready','gravuru-design-transfer-failed'].includes(event.data?.type)){removeListener();if(event.data.type==='gravuru-design-transfer-failed')reject(Error(event.data.message||'Die Gestaltung konnte nicht übernommen werden.'));else resolve();}};
     removeListener=()=>{win.clearTimeout(timer);win.removeEventListener('message',listener);};win.addEventListener('message',listener);
    });
    entry.frame.inert=true;current=candidate;activate(candidate,api(candidate));frame.src=switchedEditorPath(data,nextFragment);container.append(frame);
    await ready;entry.frame.hidden=true;entry.frame.style.display='none';history.push(entry);show(candidate);setFragment(candidate);return true;
   }catch(error){removeListener();candidate?.frame.remove();current=entry;activate(entry,api(entry));show(entry);throw error;}
   finally{busy=false;notifyPreviews(current);}
  }
 });}
 activate(current,api(current));return {current:()=>current};
}
