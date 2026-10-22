// App Bridge must be provided by the authenticated host. Tokens are requested
// immediately before use and are never written to storage or URLs.
export function createMerchantRequest({fetchImpl = globalThis.fetch, bridge = () => globalThis.shopify, bridgeWaitMs = 5000, tokenWaitMs = 15000, required = () => globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')?.content === 'required'} = {}) {
  return async (path, options = {}) => {
    if (typeof path !== 'string' || !(/^\/api\/workshop\/[A-Za-z0-9/_?=&.%+-]+$/.test(path) || /^\/api\/configurator-test\/(session|sessions|model|cart)$/.test(path)) || /%2f|%5c|%2e|\.\./i.test(path.split('?')[0])) throw Error('Unzulässiges Werkstattziel.');
    const headers = new Headers(options.headers);
    let appBridge = bridge();
    if(required() && !appBridge?.idToken){
      const deadline=Date.now()+bridgeWaitMs;
      while(!appBridge?.idToken && Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,50));appBridge=bridge();}
    }
    headers.delete('Authorization');
    if (appBridge === undefined && required()) throw Error('Shopify-Anmeldung nicht verfügbar. Bitte in Shopify öffnen oder neu laden.');
    async function tokenForRequest(){
      if (typeof appBridge?.idToken !== 'function') throw Error('Shopify-Anmeldung nicht verfügbar.');
      let token,timer; try {token = await Promise.race([appBridge.idToken(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),tokenWaitMs);})]);} catch {throw Error('Shopify-Anmeldung bitte erneuern.');} finally {clearTimeout(timer);}
      if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw Error('Shopify-Anmeldung nicht verfügbar.');
      return token;
    }
    let token;
    if(appBridge!==undefined){token=await tokenForRequest();headers.set('Authorization','Bearer '+token);}
    const send=()=>fetchImpl(path, {...options, headers, credentials: 'same-origin', redirect: 'error', cache: 'no-store'});
    let response=await send();
    // Retry only a rejected read, only once, and only with a different token.
    // Writes and unknown network outcomes are never replayed automatically.
    if(response.status===401&&appBridge&&['GET','HEAD'].includes((options.method||'GET').toUpperCase())){
      const refreshed=await tokenForRequest();
      if(refreshed!==token){await response.body?.cancel();headers.set('Authorization','Bearer '+refreshed);response=await send();}
    }
    if(response.status===401)throw Object.assign(Error('Shopify-Anmeldung nicht bestätigt. Klicke oben auf „Verbindung prüfen“. Deine Eingaben bleiben erhalten.'),{status:401,code:'shopify_session'});
    return response;
  };
}
const directRequest=createMerchantRequest();
export const merchantRequest=(path,options)=>{
 let parent;try{if(globalThis.window&&window.parent!==window)parent=window.parent.GravuruMerchantRequest;}catch{}
 const result=typeof parent==='function'?parent(path,options):directRequest(path,options);
 return result.catch(error=>{if(error.status===401)globalThis.document?.dispatchEvent(new Event('workshop-session-failed'));throw error;});
};
