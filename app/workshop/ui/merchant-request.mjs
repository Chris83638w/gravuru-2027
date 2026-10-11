// App Bridge must be provided by the authenticated host. Tokens are requested
// immediately before use and are never written to storage or URLs.
export function createMerchantRequest({fetchImpl = globalThis.fetch, bridge = () => globalThis.shopify, bridgeWaitMs = 5000, tokenWaitMs = 15000, required = () => globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')?.content === 'required'} = {}) {
  return async (path, options = {}) => {
    if (typeof path !== 'string' || !/^\/api\/workshop\/[A-Za-z0-9/_?=&.%+-]+$/.test(path) || /%2f|%5c|%2e|\.\./i.test(path.split('?')[0])) throw Error('Unzulässiges Werkstattziel.');
    const headers = new Headers(options.headers);
    let appBridge = bridge();
    if(required() && !appBridge?.idToken){
      const deadline=Date.now()+bridgeWaitMs;
      while(!appBridge?.idToken && Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,50));appBridge=bridge();}
    }
    headers.delete('Authorization');
    if (appBridge === undefined && required()) throw Error('Shopify-Anmeldung nicht verfügbar. Bitte in Shopify öffnen oder neu laden.');
    if (appBridge !== undefined) {
      if (typeof appBridge?.idToken !== 'function') throw Error('Shopify-Anmeldung nicht verfügbar.');
      let token,timer; try {token = await Promise.race([appBridge.idToken(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),tokenWaitMs);})]);} catch {throw Error('Shopify-Anmeldung bitte erneuern.');} finally {clearTimeout(timer);}
      if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw Error('Shopify-Anmeldung nicht verfügbar.');
      headers.set('Authorization', 'Bearer ' + token);
    }
    return fetchImpl(path, {...options, headers, credentials: 'same-origin', redirect: 'error', cache: 'no-store'});
  };
}
const directRequest=createMerchantRequest();
export const merchantRequest=(path,options)=>{
 let parent;try{if(globalThis.window&&window.parent!==window)parent=window.parent.GravuruMerchantRequest;}catch{}
 return typeof parent==='function'?parent(path,options):directRequest(path,options);
};
