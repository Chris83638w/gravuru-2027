// Browserseitiger Zugang zum öffentlichen Einstieg (app/workshop/SHOP-ENTRY.txt). Die Sitzung bleibt in diesem
// Abschluss und geht nur als Kopfzeile an /api/shop-entry/…; Editor-Anfragen an die Werkstatt-API (auch die
// Acryl-Fassung /api/workshop/acryl/…) werden auf die schmalen Kundenrouten umgelegt, alles andere abgewiesen.
const API='/api/shop-entry/',WORKSHOP='/api/workshop/',ACRYL=WORKSHOP+'acryl/';
const ALLOWED=[/^acrylic-drafts(?:\/adraft_[a-f0-9-]{36})?$/,/^customer-vector-logo\/preview$/,/^design-assets\/[a-f0-9]{64}\/preview\.svg$/,/^cart-configurations\/konfig_[a-f0-9-]{36}\/[1-9][0-9]{0,8}(?:\/photos\/[A-Za-z0-9_-]{1,100})?(?:\?edited=1)?$/];
const EDITORS=/^\/_merchant(?:-acryl)?-editor\.html$/;
const fail=message=>{throw Error(message);};

export function mapWorkshopPath(path){
  if(typeof path!=='string')fail('Ungültige Anfrage.');
  const relative=path.startsWith(ACRYL)?path.slice(ACRYL.length):path.startsWith(WORKSHOP)?path.slice(WORKSHOP.length):null;
  if(relative===null||!ALLOWED.some(pattern=>pattern.test(relative)))fail('Diese Anfrage gehört nicht zum Konfigurator.');
  return API+relative;
}
// Rücksprung nur in den Shop (Pfad aus dem signierten Start), nie eine fremde Adresse.
export function shopUrl(shopDomain,path){
  const base=new URL('https://'+shopDomain+'/');
  if(typeof path==='string'&&/^\/(?!\/)/.test(path))try{const target=new URL(path,base);if(target.origin===base.origin)return target.href;}catch{}
  return base.href;
}
// Im Fenster über der Produktseite: Der Server bereitet die Übergabe wie bisher vor; statt die ganze Seite zur
// Zwischenseite zu schicken, erhält nur die Shop-Seite (genau dieser Origin) die einmalige Übergabekennung.
// Erfolg: Die Shop-Seite wechselt selbst zum Warenkorb (das Versprechen bleibt offen, kein zweiter Seitenwechsel).
// Fehler: Die Shop-Seite meldet ihn zurück; der Editor zeigt ihn und gibt den Knopf wieder frei.
// image: liefert das Warenkorbbild (Platte mit Material) – parallel zur Server-Vorbereitung, Fehler ohne Wirkung.
export function embeddedCart(submitThemeCart,shopOrigin,{target=globalThis.parent,listen=globalThis,image=null}={}){
  if(!/^https:\/\/[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopOrigin))fail('Die Shop-Verbindung ist ungültig.');
  return async(input,options)=>{
    const picture=typeof image==='function'?Promise.resolve().then(image).catch(()=>null):Promise.resolve(null);
    const result=await submitThemeCart(input,options);
    let token=null;try{token=new URL(result.handoffUrl).hash.match(/^#handoff=([a-f0-9]{64})$/)?.[1]||null;}catch{}
    if(!token)fail('Die Warenkorbübergabe wurde nicht vorbereitet.');
    const cartImage=await picture;
    return new Promise((resolve,reject)=>{
      const onMessage=event=>{
        if(event.origin!==shopOrigin||event.source!==target||event.data?.type!=='gravuru-shop-handoff-result'||event.data.token!==token)return;
        if(event.data.ok===false){listen.removeEventListener('message',onMessage);reject(Error(String(event.data.message||'Die Übertragung konnte nicht bestätigt werden.').slice(0,300)));}
      };
      listen.addEventListener('message',onMessage);
      target.postMessage({type:'gravuru-shop-handoff',token,...(typeof Blob!=='undefined'&&cartImage instanceof Blob?{cartImage}:{})},shopOrigin);
    });
  };
}
const SURFACE=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;
// Das Rohlingbild (Material) steht als ~2 MB data:-Adresse im Modell. Fürs Warenkorbbild genügt eine kleine
// JPEG-Fassung; einmal je Seite berechnet (vorab im Leerlauf), danach ~0,15 s je Warenkorbbild statt ~1–3 s.
export function surfaceThumbnail(surface,{maxEdge=700,quality=.82,doc=globalThis.document}={}){
  let pending=null;
  return ()=>pending??=(async()=>{
    const match=typeof surface==='string'?SURFACE.exec(surface):null;if(!match)return null;
    const bin=atob(match[2]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    const bitmap=await createImageBitmap(new Blob([bytes],{type:match[1]}));
    try{
      const scale=Math.min(1,maxEdge/Math.max(bitmap.width,bitmap.height)),canvas=doc.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
      const small=canvas.toDataURL('image/jpeg',quality);return SURFACE.test(small)?small:null;
    }finally{bitmap.close?.();}
  })().catch(()=>null);
}
// Ersetzt im Vorschau-SVG nur genau das bekannte Rohlingbild; ohne kleine Fassung bleibt das Original.
export function cartPreviewSvg(svg,surface,small){
  if(typeof svg!=='string'||!svg.startsWith('<svg'))return null;
  return surface&&small&&SURFACE.test(surface)&&SURFACE.test(small)?svg.split('href="'+surface+'"').join('href="'+small+'"'):svg;
}
export function viewBoxSize(svg){
  const box=/viewBox="([^"]+)"/.exec(svg)?.[1]?.trim().split(/[\s,]+/).map(Number);
  return box?.length===4&&box.every(Number.isFinite)&&box[2]>0&&box[3]>0?{width:box[2],height:box[3]}:null;
}
// Warenkorbbild aus der Materialvorschau des Konfigurators (element.svg(): Platte mit Material und Gravur, wie im
// Überblick), auf weißem Grund als JPEG – klein für den Upload in den Warenkorb.
export async function previewJpeg(element,{surface=null,small=null,maxEdge=900,quality=.86,doc=globalThis.document}={}){
  if(typeof element?.svg!=='function')return null;
  const svg=cartPreviewSvg(element.svg(),surface,await small?.()),size=svg&&viewBoxSize(svg);if(!size)return null;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
    const image=new Image();image.src=url;await image.decode();
    const scale=maxEdge/Math.max(size.width,size.height),canvas=doc.createElement('canvas');
    canvas.width=Math.max(1,Math.round(size.width*scale));canvas.height=Math.max(1,Math.round(size.height*scale));
    const g=canvas.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,canvas.width,canvas.height);g.drawImage(image,0,0,canvas.width,canvas.height);
    return await new Promise(resolve=>canvas.toBlob(blob=>resolve(blob&&blob.type==='image/jpeg'?blob:null),'image/jpeg',quality));
  }finally{URL.revokeObjectURL(url);}
}
async function json(response){
  let body;try{body=await response.json();}catch{body={};}
  if(!response.ok)fail(body.error?.message||'Der Konfigurator konnte nicht geladen werden.');
  return body;
}

// Vorwärmen: Ziele aus `<meta name="gravuru-warm">` für den Datenbereich (`st`) des Sitzungstokens.
// Nur eigene, absolute Pfade; Fehler bedeuten einfach kein Vorwärmen.
export function warmTargets(doc,token){
 try{
  const map=JSON.parse(doc.querySelector('meta[name="gravuru-warm"]')?.getAttribute('content')||'{}');
  const body=String(token).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const list=map[JSON.parse(atob(body+'='.repeat((4-body.length%4)%4))).st];
  return Array.isArray(list)?list.filter(p=>typeof p==='string'&&/^\/[A-Za-z0-9_][A-Za-z0-9_\/.-]*$/.test(p)&&!p.includes('..')).slice(0,4):[];
 }catch{return [];}
}
// Lädt die Ziele mit niedriger Priorität in den Browser-Zwischenspeicher (Editor-Seite 5 min, Paket/Katalog länger),
// aus der Editor-Seite zusätzlich ihr gehashtes Editor-Paket. Das Fenster findet sie danach ohne Netzwartezeit.
// Ergebnis: `catalog` = Promise auf den Kernkatalog (oder null), für startResourceUrls.
export function warmEditor(targets,{fetchImpl=globalThis.fetch}={}){
 const get=path=>fetchImpl(path,{credentials:'same-origin',priority:'low'});
 let catalog=Promise.resolve(null),catalogPath=null;
 for(const path of targets){
  const request=get(path);
  if(/\/katalog-kern\.json$/.test(path)){catalogPath=path;catalog=request.then(response=>response.ok?response.json():null).catch(()=>null);continue;}
  request.then(async response=>{
   if(!response.ok||!/\.html$/.test(path))return;
   for(const bundle of new Set((await response.text()).match(/\/_[a-z-]*bundle\/[A-Za-z0-9_.-]+-[a-f0-9]{16}\.m?js/g)||[]))get(bundle).catch(()=>{});
  }).catch(()=>{});
 }
 return {catalog,catalogPath};
}
// Schriften und Bibliotheksmotive, die die Startdesigns aus dem Katalog brauchen – gleiche Adressen wie der Editor
// (lazy-resources-model: Kerndesigns, ohne Produktressourcen und Grundmotive; Funkklingel nur Startdesign).
export function startResourceUrls(universal,catalog,catalogPath){
 if(!catalog||typeof catalogPath!=='string'||!/\/katalog-kern\.json$/.test(catalogPath))return [];
 const base=catalogPath.replace(/katalog-kern\.json$/,''),local=universal?.localResources||{};
 const localFonts=new Set(Object.keys(local.fonts||{})),skipMotifs=new Set([...(local.motifs||[]).map(m=>m?.key),...Object.keys(catalog.motifs||{})]);
 // Nur Dateien, die der Host zwischenspeichern darf (acrylCacheControl: Slug-Namen); sonst wäre es ein Doppelabruf.
 const files=new Map((catalog.font_index||[]).filter(f=>typeof f?.name==='string'&&f.url===undefined&&/^[a-z0-9-]{1,80}\.json$/.test(f.file||'')).map(f=>[f.name,f.file])),motifKeys=new Set((catalog.motif_index||[]).map(m=>m?.key));
 const designs=Array.isArray(universal?.profile?.designs)?universal.profile.designs:[];
 const initial=universal?.doorbell?[designs.find(d=>d?.id===universal.profile.defaultDesignId)||designs[0]].filter(Boolean):designs;
 const urls=new Set();
 for(const o of initial.flatMap(d=>Array.isArray(d?.objects)?d.objects:[])){
  if(o?.type==='text'&&files.has(o.font)&&!localFonts.has(o.font))urls.add(base+'schriften/'+encodeURIComponent(files.get(o.font)));
  if(o?.type==='motif'&&typeof o.motif==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(o.motif)&&motifKeys.has(o.motif)&&!skipMotifs.has(o.motif))urls.add(base+'motive/'+o.motif+'.json');
 }
 return [...urls].slice(0,24);
}
export function createShopEntryClient({token,fetchImpl=globalThis.fetch}={}){
  if(typeof token!=='string'||!/^gse1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))fail('Bitte öffne den Konfigurator über „Jetzt personalisieren“ auf der Produktseite.');
  const headers=extra=>({...extra,'X-Gravuru-Shop-Session':token});
  const request=async(path,options={})=>fetchImpl(mapWorkshopPath(path),{...options,headers:headers(options.headers||{}),credentials:'omit',cache:'no-store'});
  async function loadModel(designId=null){
    const data=await json(await fetchImpl(API+'model'+(designId?'?design='+encodeURIComponent(designId):''),{credentials:'omit',cache:'no-store',headers:headers({})}));
    const model=data.model;
    if(model?.key!=='acryl'||!model.universal?.profile||!model.configuration?.id||!EDITORS.test(data.editorPath||'')||typeof data.shopDomain!=='string'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(data.shopDomain))fail('Das Produkt ist für diesen Konfigurator nicht vorbereitet.');
    return data;
  }
  async function loadInitialModel(fragment,storage){
    const config=fragment.get('config'),rev=fragment.get('rev');
    if(!/^konfig_[a-f0-9-]{36}$/.test(config||'')||! /^[1-9][0-9]{0,8}$/.test(rev||''))return loadModel(fragment.get('design'));
    // The same private token gate as cart-edit.mjs. Select the saved template
    // before mounting; the editor still restores and verifies the full draft.
    const tokens=new Set();
    try{for(let i=0;i<storage.length;i++){const key=storage.key(i);if(!['gravuru-acrylic-private:','gravuru-form-draft:'].some(p=>key?.startsWith(p)))continue;const value=JSON.parse(storage.getItem(key)||'null');if(/^[a-f0-9]{64}$/.test(value?.token||''))tokens.add(value.token);}}catch{}
    for(const token of tokens){
      const response=await request(WORKSHOP+'cart-configurations/'+config+'/'+rev,{headers:{'X-Gravuru-Draft':token}});
      if(response.status===404)continue;
      const loaded=await json(response);
      const id=loaded.document?.design?.id;
      if(typeof id!=='string')fail('Die gespeicherte Gestaltung konnte nicht geladen werden.');
      return loadModel(id);
    }
    fail('Diese Gestaltung ist auf diesem Gerät nicht mehr zugänglich. Die Warenkorbzeile bleibt unverändert.');
  }
  // Private Designressourcen einmal laden; der Editor liest sie unter beiden Pfadfassungen (Acryl-Umschreibung).
  async function loadResources(universal,toDataUrl){
    const urls=new Set();
    for(const match of JSON.stringify(universal).matchAll(/\/api\/workshop\/design-assets\/[a-f0-9]{64}\/preview\.svg/g))urls.add(match[0]);
    for(const d of universal.profile.designs||[])for(const o of d.objects||[])if(/^[a-f0-9]{64}$/.test(o.photoMaskAssetId||''))urls.add(WORKSHOP+'design-assets/'+o.photoMaskAssetId+'/preview.svg');
    for(const item of universal.localResources?.photoExamples||[])if(/^[a-f0-9]{64}$/.test(item.assetId||''))urls.add(WORKSHOP+'design-assets/'+item.assetId+'/preview.svg');
    const resources=Object.create(null);
    // A model can carry decoration resources for three formats. Bound parallelism
    // avoids serial network roundtrips while preserving the same private routes.
    const pending=[...urls];
    await Promise.all(Array.from({length:Math.min(6,pending.length)},async()=>{
      for(let url;(url=pending.shift());){
        const result=await request(url);if(!result.ok)fail('Eine Designgrafik konnte nicht geladen werden.');
        const dataUrl=await toDataUrl(await result.blob());
        resources[url]=dataUrl;resources[url.replace(WORKSHOP,ACRYL)]=dataUrl;
      }
    }));
    return resources;
  }
  async function submitCart(input,{draftToken}={}){
    if(typeof draftToken!=='string'||!/^[a-f0-9]{64}$/.test(draftToken))fail('Der private Entwurfszugang fehlt.');
    const result=await json(await fetchImpl(API+'cart',{method:'POST',credentials:'omit',cache:'no-store',headers:headers({'Content-Type':'application/json','X-Gravuru-Draft':draftToken}),body:JSON.stringify(input)}));
    let url;try{url=new URL(result.checkoutUrl);}catch{fail('Der Warenkorb wurde nicht bestätigt.');}
    if(url.protocol!=='https:'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname)||url.port||url.username||url.password||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))fail('Der Warenkorb wurde nicht bestätigt.');
    return result;
  }

  async function submitThemeCart(input,{draftToken}={}){
    if(typeof draftToken!=='string'||!/^[a-f0-9]{64}$/.test(draftToken))fail('Der private Entwurfszugang fehlt.');
    const result=await json(await fetchImpl(API+'theme-cart',{method:'POST',credentials:'omit',cache:'no-store',headers:headers({'Content-Type':'application/json','X-Gravuru-Draft':draftToken}),body:JSON.stringify(input)}));
    if(result.mode!=='theme'||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents)||typeof result.handoffUrl!=='string')fail('Die Warenkorbübergabe wurde nicht vorbereitet.');
    return result;
  }
  async function loadDesignGallery(page=0,theme='preferred'){
    if(!['preferred','all'].includes(theme))fail('Dieses Thema gibt es nicht.');
    if(!Number.isSafeInteger(page)||page<0||page>10000)fail('Diese Seite der Designauswahl gibt es nicht.');
    const controller=new AbortController();let timer;
    const retry='Die Designauswahl ist gerade nicht erreichbar. Deine Gestaltung bleibt erhalten. Bitte erneut versuchen.';
    try{
      // A proxy can return HTML/502; do not route gallery failures through the
      // configurator's generic model-loading error or leave the modal waiting.
      const response=await Promise.race([
        fetchImpl(API+'design-gallery?page='+page+(theme==='all'?'&theme=all':''),{credentials:'omit',cache:'no-store',headers:headers({}),signal:controller.signal}),
        new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error(retry));},5000);})
      ]);
      let data;try{data=await response.json();}catch{throw Error(retry);}
      if(!response.ok)throw Error(response.status<500&&data?.error?.message?data.error.message:retry);
      if(!Array.isArray(data?.items))throw Error(retry);
      return data;
    }catch(error){if(error instanceof TypeError||controller.signal.aborted)throw Error(retry);throw error;}
    finally{clearTimeout(timer);}
  }
  async function designRequest(action,target){
    if(typeof target!=='string'||target.length>4096)fail('Bitte ein Design aus der Auswahl wählen.');
    return fetchImpl(API+action,{method:'POST',credentials:'omit',cache:'no-store',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify({target})});
  }
  async function loadDesignPreview(target,previewUrl){
    if(typeof previewUrl==='string'&&/^\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\/vorschauen\/[a-f0-9]{64}\.svg$/.test(previewUrl)){
      const cached=await fetchImpl(previewUrl,{credentials:'omit',cache:'force-cache'});if(cached.ok)return cached.blob();
    }
    const response=await designRequest('design-gallery-preview',target);if(!response.ok)await json(response);return response.blob();
  }
  async function switchDesign(target){return json(await designRequest('design-switch',target));}
  return Object.freeze({request,loadModel,loadInitialModel,loadResources,submitCart,submitThemeCart,loadDesignGallery,loadDesignPreview,switchDesign});
}

