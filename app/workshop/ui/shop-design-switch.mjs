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

// Old frames remain alive (including the customer's selected photo File).
// A failed load restores the previous frame and its original private gateway.
// Only an explicit successful switch updates the fragment/session.
export function createDesignSwitch({initial,fragment,container,activate,toDataUrl,win=window,doc=document,clientFactory=createShopEntryClient,timeoutMs=60000}){
 let current={...initial,fragment:new URLSearchParams(fragment),pending:null},busy=false;
 const history=[];
 const previewListeners=new WeakMap(),previewActive=entry=>current===entry&&!busy;
 const notifyPreviews=entry=>{for(const listener of previewListeners.get(entry)||[])try{listener(previewActive(entry));}catch{/* Optional preloading cannot break the design transfer. */}};
 const checkRead=entry=>{if(current!==entry)throw Error('Diese Gestaltung ist nicht mehr aktiv.');};
 const check=entry=>{if(current!==entry||busy)throw Error('Bitte warten, bis das Design vollständig geladen ist.');};
 const show=entry=>{entry.frame.hidden=false;entry.frame.inert=false;entry.frame.style.display='';entry.frame.style.visibility='';entry.frame.style.position='';entry.frame.style.inset='';};
 const setFragment=entry=>win.history.replaceState(win.history.state,'','#'+entry.fragment);
 function api(entry){return Object.freeze({
  load:(page,theme,options)=>{checkRead(entry);return entry.client.loadDesignGallery(page,theme,options);},
  preview:(target,url,signal)=>{checkRead(entry);if(!previewActive(entry))throw Object.assign(Error('Vorschauen warten auf den Designwechsel.'),{name:'AbortError'});return entry.client.loadDesignPreview(target,url,signal);},
  onPreviewActivity:listener=>{let listeners=previewListeners.get(entry);if(!listeners){listeners=new Set();previewListeners.set(entry,listeners);}listeners.add(listener);listener(previewActive(entry));return ()=>listeners.delete(listener);},
  hasPendingTransfer:()=>!!entry.pending,
  takeTransfer:()=>{const value=entry.pending;entry.pending=null;return value;},
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
    candidate={client,data,resources,frame,fragment:nextFragment,pending:structuredClone({...transfer||{texts:[]},...(selection?{selection}:{})}),previous:entry};
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
