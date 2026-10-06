// App Bridge must be provided by the authenticated host. Tokens are requested
// immediately before use and are never written to storage or URLs.
export function createMerchantRequest({fetchImpl = globalThis.fetch, bridge = () => globalThis.shopify, required = () => globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')?.content === 'required'} = {}) {
  return async (path, options = {}) => {
    if (typeof path !== 'string' || !/^\/api\/workshop\/[A-Za-z0-9/_?=&.%+-]+$/.test(path) || /%2f|%5c|%2e|\.\./i.test(path)) throw Error('Unzulässiges Werkstattziel.');
    const headers = new Headers(options.headers), appBridge = bridge();
    headers.delete('Authorization');
    if (appBridge === undefined && required()) throw Error('Shopify-Anmeldung nicht verfügbar. Bitte in Shopify öffnen oder neu laden.');
    if (appBridge !== undefined) {
      if (typeof appBridge?.idToken !== 'function') throw Error('Shopify-Anmeldung nicht verfügbar.');
      let token; try {token = await appBridge.idToken();} catch {throw Error('Shopify-Anmeldung bitte erneuern.');}
      if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw Error('Shopify-Anmeldung nicht verfügbar.');
      headers.set('Authorization', 'Bearer ' + token);
    }
    return fetchImpl(path, {...options, headers, credentials: 'same-origin', redirect: 'error', cache: 'no-store'});
  };
}
export const merchantRequest = createMerchantRequest();
