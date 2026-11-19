// Kundenseite des öffentlichen Einstiegs (app/workshop/SHOP-ENTRY.txt). Die Sitzung steht nur im URL-Fragment
// (nie in Anfragen an fremde Hosts, nie im Referrer). Der Editor im iframe arbeitet wie in der Händler-
// Kundenansicht über window.parent: Modell, private Designressourcen, Anfragefunktion und der Warenkorbzugang
// (GravuruShopEntry, ausgewertet von shop-cart.mjs) liegen auf dieser Seite.
import {createShopEntryClient,createShopResourceLoader,shopUrl,embeddedCart,previewJpeg,surfaceThumbnail,warmTargets,warmEditor,startResourceUrls} from './shop-entry-client.mjs';
import {createDesignSwitch} from './shop-design-switch.mjs';
const status=document.querySelector('#status'),header=document.querySelector('header'),back=document.querySelector('#back'),title=document.querySelector('#title');
const loading=document.querySelector('#loading-screen'),progress=document.querySelector('#progress'),preview=document.querySelector('#start-preview'),editor=document.querySelector('#editor');
const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
const toDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
try{
  const client=createShopEntryClient({token:fragment.get('s')||''});
  const loadJson=createShopResourceLoader();
  window.GravuruLoadEditorJson=loadJson;
  const warm=warmEditor(warmTargets(document,fragment.get('s')||''),{loadJson});
  let storage=null;
  try{storage=window.sessionStorage;}catch{/* The cart edit can retry as a standalone page. */}
  const data=await client.loadInitialModel(fragment,storage),model=data.model;
  title.textContent=model.name;progress.value=1;status.textContent='Deine Gestaltung wird vorbereitet …';
  // Same signed design target and renderer as the gallery; no separate artwork logic.
  if(data.startPreview)client.loadDesignPreview(data.startPreview.target,data.startPreview.previewUrl).then(toDataUrl).then(url=>{preview.src=url;preview.hidden=false;}).catch(()=>{});
  // Das Editorfenster übernimmt laufende Abrufe von Startschriften und Motiven.
  const warmStart=catalog=>{for(const url of startResourceUrls(model.universal,catalog,warm.catalogPath))loadJson(url,{priority:'high'})?.catch(()=>{});};
  warmStart(null);warm.catalog.then(warmStart);
  const doorbellResources=client.prepareDoorbellResources(model.universal,toDataUrl);
  const resources=doorbellResources?.resources??await client.loadResources(model.universal,toDataUrl);
  progress.value=2;
  const backUrl=shopUrl(data.shopDomain,fragment.get('back'));
  // Fenster über der Produktseite (shop-embed.mjs): Übergabe und Schließen gehen an die Shop-Seite, kein Seitenwechsel.
  const embedded=fragment.get('embed')==='1'&&window.parent!==window,shopOrigin='https://'+data.shopDomain;
  // Warenkorbbild: die Platte mit Material aus dem Konfigurator selbst (gleiches Fenster, gleicher Origin).
  let frame=null;
  const leave=()=>embedded?window.parent.postMessage({type:'gravuru-shop-close'},shopOrigin):location.assign(backUrl);
  if(embedded)back.addEventListener('click',event=>{event.preventDefault();leave();});
  function activate(entry,designGallery){
    const {client,data,resources}=entry,model=data.model;frame=entry.frame;
    window.GravuruLoadPreviewResources=entry.loadRemaining;
    window.GravuruPreviewResources=resources;window.GravuruModelProfile=model.legacy;window.UniversalConfig=model.universal;
    window.GravuruWorkshopReview={productId:model.configuration.id,productRevision:model.configuration.revision};window.GravuruMerchantRequest=client.request;
    const surface=model.universal?.materialSurface||null;
    const needsBrowserImage=embedded && data.savedCartImage!==true;
    const small=needsBrowserImage?surfaceThumbnail(surface):null;
    const image=needsBrowserImage?()=>previewJpeg(entry.frame?.contentDocument?.querySelector('gravuru-configurator'),{surface,small}):null;
    const submitCart=embedded?embeddedCart(client.submitThemeCart,shopOrigin,{image}):client.submitThemeCart;
    window.GravuruShopEntry=Object.freeze({productId:model.configuration.id,productRevision:model.configuration.revision,shopDomain:data.shopDomain,shopifyProductId:data.binding?.shopifyProductId||null,shopifyVariantId:data.binding?.shopifyVariantId||null,expiresAt:data.expiresAt,csrfToken:'shop-entry',request:client.request,cartRevision:client.cartRevision,submitCart,cartMode:'theme',themeCartPath:data.themeCartPath,backUrl,embedded,designGallery,productName:model.name,preSaveOnReview:data.preSaveOnReview===true,...(fragment.getAll('ui').length===1&&fragment.get('ui')==='prio-r15'?{presentation:'prio-r15'}:{})});
    title.textContent=model.name;document.title=model.name+' · Jetzt personalisieren';back.href=backUrl;
    if(small&&surface)setTimeout(small,4000);
  }
  // K8: Bearbeiten-Verweis aus dem Warenkorb (config, rev, line) unverändert an den Editor weiterreichen.
  const edit=new URLSearchParams();for(const key of ['config','rev','line'])if(fragment.has(key))edit.set(key,fragment.get(key));
  const toolbar=fragment.getAll('leiste');if(embedded&&toolbar.length===1&&['a','b'].includes(toolbar[0]))edit.set('leiste',toolbar[0]);
  frame=document.createElement('iframe');frame.title=model.name+' personalisieren';frame.src=data.editorPath+(edit.size?'?'+edit:'');
  createDesignSwitch({initial:{client,data,resources,frame,loadRemaining:doorbellResources?.loadRemaining},fragment,container:document.querySelector('#editor'),activate,toDataUrl});header.hidden=false;
  // Fenster-Modus: der Produktseite melden, dass die Seite da ist (sonst zeigt sie nach einer Weile einen Hinweis mit Ausweg).
  if(embedded)frame.addEventListener('load',()=>window.parent.postMessage({type:'gravuru-shop-ready'},shopOrigin),{once:true});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==='gravuru-fk-close')leave();
    if(event.data?.type==='gravuru-ux-ready'){progress.value=3;header.hidden=true;loading.hidden=true;status.hidden=true;editor.inert=false;frame.contentWindow.dispatchEvent(new Event('resize'));if(embedded)window.parent.postMessage({type:'gravuru-shop-editor-ready'},shopOrigin);}
    if(event.data?.type==='gravuru-ux-failed'){progress.hidden=true;status.textContent=event.data.message||'Die Gestaltung konnte nicht geladen werden. Bitte erneut öffnen.';if(embedded)window.parent.postMessage({type:'gravuru-shop-failed',message:status.textContent},shopOrigin);}
  });
  // Das iframe braucht beim Start seine echte Größe. Die Ladekarte deckt es ab;
  // bis zur Fertigmeldung bleibt es unbedienbar, aber nicht per display:none verborgen.
  editor.hidden=false;editor.inert=true;editor.append(frame);
}catch(error){status.hidden=false;progress.hidden=true;status.textContent=error.message;
  // Fenster-Modus: Fehler auch der Produktseite melden (nur Typ und Text, keine Sitzungsdaten); sie bietet den Ausweg an.
  if(fragment.get('embed')==='1'&&window.parent!==window)window.parent.postMessage({type:'gravuru-shop-failed',message:String(error?.message||'').slice(0,300),...(error?.code==='cart_edit_access_missing'?{cartAccessMissing:true}:{})},'*');
}
