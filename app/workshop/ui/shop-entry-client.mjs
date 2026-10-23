// Browserseitiger Zugang zum öffentlichen Einstieg (app/workshop/SHOP-ENTRY.txt). Die Sitzung bleibt in diesem
// Abschluss und geht nur als Kopfzeile an /api/shop-entry/…; Editor-Anfragen an die Werkstatt-API (auch die
// Acryl-Fassung /api/workshop/acryl/…) werden auf die schmalen Kundenrouten umgelegt, alles andere abgewiesen.
const API='/api/shop-entry/',WORKSHOP='/api/workshop/',ACRYL=WORKSHOP+'acryl/';
const ALLOWED=[/^acrylic-drafts(?:\/adraft_[a-f0-9-]{36})?$/,/^design-assets\/[a-f0-9]{64}\/preview\.svg$/,/^cart-configurations\/konfig_[a-f0-9-]{36}\/[1-9][0-9]{0,8}(?:\/photos\/[A-Za-z0-9_-]{1,100})?(?:\?edited=1)?$/];
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
async function json(response){
  let body;try{body=await response.json();}catch{body={};}
  if(!response.ok)fail(body.error?.message||'Der Konfigurator konnte nicht geladen werden.');
  return body;
}

export function createShopEntryClient({token,fetchImpl=globalThis.fetch}={}){
  if(typeof token!=='string'||!/^gse1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))fail('Bitte öffne den Konfigurator über „Jetzt personalisieren“ auf der Produktseite.');
  const headers=extra=>({...extra,'X-Gravuru-Shop-Session':token});
  const request=async(path,options={})=>fetchImpl(mapWorkshopPath(path),{...options,headers:headers(options.headers||{}),credentials:'omit',cache:'no-store'});
  async function loadModel(){
    const data=await json(await fetchImpl(API+'model',{credentials:'omit',cache:'no-store',headers:headers({})}));
    const model=data.model;
    if(model?.key!=='acryl'||!model.universal?.profile||!model.configuration?.id||!EDITORS.test(data.editorPath||'')||typeof data.shopDomain!=='string'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(data.shopDomain))fail('Das Produkt ist für diesen Konfigurator nicht vorbereitet.');
    return data;
  }
  // Private Designressourcen einmal laden; der Editor liest sie unter beiden Pfadfassungen (Acryl-Umschreibung).
  async function loadResources(universal,toDataUrl){
    const urls=new Set();
    for(const match of JSON.stringify(universal).matchAll(/\/api\/workshop\/design-assets\/[a-f0-9]{64}\/preview\.svg/g))urls.add(match[0]);
    for(const d of universal.profile.designs||[])for(const o of d.objects||[])if(/^[a-f0-9]{64}$/.test(o.photoMaskAssetId||''))urls.add(WORKSHOP+'design-assets/'+o.photoMaskAssetId+'/preview.svg');
    for(const item of universal.localResources?.photoExamples||[])if(/^[a-f0-9]{64}$/.test(item.assetId||''))urls.add(WORKSHOP+'design-assets/'+item.assetId+'/preview.svg');
    const resources=Object.create(null);
    for(const url of urls){
      const result=await request(url);if(!result.ok)fail('Eine Designgrafik konnte nicht geladen werden.');
      const dataUrl=await toDataUrl(await result.blob());
      resources[url]=dataUrl;resources[url.replace(WORKSHOP,ACRYL)]=dataUrl;
    }
    return resources;
  }
  async function submitCart(input,{draftToken}={}){
    if(typeof draftToken!=='string'||!/^[a-f0-9]{64}$/.test(draftToken))fail('Der private Entwurfszugang fehlt.');
    const result=await json(await fetchImpl(API+'cart',{method:'POST',credentials:'omit',cache:'no-store',headers:headers({'Content-Type':'application/json','X-Gravuru-Draft':draftToken}),body:JSON.stringify(input)}));
    let url;try{url=new URL(result.checkoutUrl);}catch{fail('Der Warenkorb wurde nicht bestätigt.');}
    if(url.protocol!=='https:'||!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(url.hostname)||url.port||url.username||url.password||result.paymentConfirmed!==false||!Number.isSafeInteger(result.totalCents))fail('Der Warenkorb wurde nicht bestätigt.');
    return result;
  }
  return Object.freeze({request,loadModel,loadResources,submitCart});
}
