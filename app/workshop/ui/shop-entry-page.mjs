// Kundenseite des öffentlichen Einstiegs (app/workshop/SHOP-ENTRY.txt). Die Sitzung steht nur im URL-Fragment
// (nie in Anfragen an fremde Hosts, nie im Referrer). Der Editor im iframe arbeitet wie in der Händler-
// Kundenansicht über window.parent: Modell, private Designressourcen, Anfragefunktion und der Warenkorbzugang
// (GravuruShopEntry, ausgewertet von shop-cart.mjs) liegen auf dieser Seite.
import {createShopEntryClient,shopUrl} from './shop-entry-client.mjs';
const status=document.querySelector('#status'),header=document.querySelector('header'),back=document.querySelector('#back'),title=document.querySelector('#title');
const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
const toDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
try{
  const client=createShopEntryClient({token:fragment.get('s')||''});
  const data=await client.loadModel(),model=data.model;
  window.GravuruPreviewResources=await client.loadResources(model.universal,toDataUrl);
  window.GravuruModelProfile=model.legacy;window.UniversalConfig=model.universal;
  window.GravuruWorkshopReview={productId:model.configuration.id,productRevision:model.configuration.revision};
  window.GravuruMerchantRequest=client.request;
  const backUrl=shopUrl(data.shopDomain,fragment.get('back'));
  window.GravuruShopEntry=Object.freeze({productId:model.configuration.id,productRevision:model.configuration.revision,shopDomain:data.shopDomain,shopifyProductId:data.binding?.shopifyProductId||null,shopifyVariantId:data.binding?.shopifyVariantId||null,expiresAt:data.expiresAt,csrfToken:'shop-entry',request:client.request,submitCart:client.submitThemeCart,cartMode:'theme',themeCartPath:data.themeCartPath,backUrl});
  title.textContent=model.name;document.title=model.name+' · Jetzt personalisieren';back.href=backUrl;header.hidden=false;
  // K8: Bearbeiten-Verweis aus dem Warenkorb (config, rev, line) unverändert an den Editor weiterreichen.
  const edit=new URLSearchParams();for(const key of ['config','rev','line'])if(fragment.has(key))edit.set(key,fragment.get(key));
  const frame=document.createElement('iframe');frame.title=model.name+' personalisieren';frame.src=data.editorPath+(edit.size?'?'+edit:'');
  document.querySelector('#editor').append(frame);status.hidden=true;
  window.addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='gravuru-fk-close')location.assign(backUrl);});
}catch(error){status.hidden=false;status.textContent=error.message;}
