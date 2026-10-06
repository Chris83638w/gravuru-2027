import {merchantRequest} from './merchant-request.mjs';
const required = () => globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')?.content === 'required';
const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function merchantImageAttribute(url, svg=false, authenticated=required()) {
  return `${authenticated?'data-merchant-src':svg?'href':'src'}="${escape(url)}"`;
}
export function setMerchantImage(element,url,authenticated=required()) {
  const attr=element.localName==='image'?'href':'src';
  if(authenticated){element.removeAttribute(attr);element.setAttribute('data-merchant-src',url);}
  else element.setAttribute(attr,url);
}
const validPath = path => /^\/api\/workshop\/(?:products\/cfg_[a-f0-9-]+|contours\/[a-f0-9]{64}|design-assets\/[a-f0-9]{64})\/preview\.svg(?:\?[A-Za-z0-9_=&.%+-]+)?$/.test(path) && !/%2f|%5c|%2e|\.\./i.test(path);

export function createMerchantMediaLoader({request=merchantRequest,createURL=URL.createObjectURL,revokeURL=URL.revokeObjectURL}={}) {
  const active=new Map();
  function release(element){
    const state=active.get(element);if(!state)return;
    active.delete(element);state.controller.abort();
    if(state.url){if(element.getAttribute(state.attr)===state.url)element.removeAttribute(state.attr);revokeURL(state.url);}
    element.removeAttribute('aria-busy');
  }
  function load(element,path){
    const old=active.get(element);if(old?.path===path)return old.promise;
    release(element);
    if(!['img','image'].includes(element.localName)||!validPath(path))return Promise.reject(Error('Unzulässige private Bildquelle.'));
    const state={path,attr:element.localName==='image'?'href':'src',controller:new AbortController(),url:null,promise:null};active.set(element,state);
    element.removeAttribute('data-media-error');element.setAttribute('aria-busy','true');
    state.promise=(async()=>{
      try{
        const response=await request(path,{signal:state.controller.signal});
        if(!response.ok||!/^image\/svg\+xml(?:;|$)/i.test(response.headers.get('content-type')||''))throw Error('preview');
        const blob=await response.blob();
        if(active.get(element)!==state||state.controller.signal.aborted||!element.isConnected)return false;
        state.url=createURL(blob);element.setAttribute(state.attr,state.url);return true;
      }catch{
        if(active.get(element)===state&&!state.controller.signal.aborted){element.setAttribute('data-media-error','Vorschau nicht verfügbar. Bitte Anmeldung prüfen.');element.dispatchEvent(new Event('error'));}
        return false;
      }finally{if(active.get(element)===state)element.removeAttribute('aria-busy');}
    })();return state.promise;
  }
  return {load,release,prune(){for(const element of active.keys())if(!element.isConnected)release(element);},dispose(){for(const element of active.keys())release(element);}};
}
export function installMerchantMedia(doc=globalThis.document) {
  if(!doc?.querySelector('meta[name=gravuru-merchant-auth]'))return;
  const loader=createMerchantMediaLoader(),waiting=new Set();
  const load=element=>loader.load(element,element.getAttribute('data-merchant-src')).catch(()=>element.setAttribute('data-media-error','Bildquelle nicht verfügbar.'));
  const visibility=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){waiting.delete(entry.target);visibility.unobserve(entry.target);load(entry.target);}},{rootMargin:'240px'});
  const seen=new WeakSet();
  const scan=()=>{
    loader.prune();for(const element of waiting)if(!element.isConnected){visibility.unobserve(element);waiting.delete(element);}
    for(const element of doc.querySelectorAll('img[data-merchant-src],image[data-merchant-src]')){
      if(visibility&&element.getAttribute('loading')==='lazy'&&!seen.has(element)){seen.add(element);waiting.add(element);visibility.observe(element);}
      else if(!waiting.has(element))load(element);
    }
  };
  const observer=new MutationObserver(scan);observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-merchant-src']});scan();
  globalThis.addEventListener('pagehide',()=>{observer.disconnect();visibility?.disconnect();loader.dispose();},{once:true});
}
if(typeof document!=='undefined'){
  installMerchantMedia();
  globalThis.addEventListener('pageshow',e=>{if(e.persisted)installMerchantMedia();});
}
