const reject = () => {throw Object.assign(Error('Shopify-Händlerhost ist nicht vollständig eingerichtet.'), {status:503});};
const shopPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
const bridgeURL = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';

// Explicit, single-shop test host. This does not enable customer/storefront routes.
export function createShopifyAdminHost(config, sessionContext) {
  let origin;
  try {origin = new URL(config?.origin);} catch {reject();}
  if (config.mode !== 'embedded-test' || origin.protocol !== 'https:' || origin.origin !== config.origin ||
      origin.username || origin.password || !/^[a-z0-9.-]+$/.test(origin.hostname) ||
      origin.hostname === 'localhost' || /^[0-9.]+$/.test(origin.hostname) ||
      !shopPattern.test(config.shopDomain || '') || !/^[a-zA-Z0-9_-]{1,128}$/.test(config.clientId || '') ||
      sessionContext?.mode !== 'test-only' || sessionContext.shopDomain !== config.shopDomain || sessionContext.clientId !== config.clientId) reject();
  const appOrigin = origin.origin, host = origin.host, shopOrigin = 'https://' + config.shopDomain;
  const csp = `default-src 'self'; script-src 'self' ${bridgeURL}; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${shopOrigin} https://admin.shopify.com`;
  const bootstrap = `<meta name="shopify-api-key" content="${config.clientId}"><meta name="gravuru-merchant-auth" content="required"><meta name="shopify-disabled-features" content="fetch"><script src="${bridgeURL}"></script><script type="module" src="/workshop-ui/merchant-media.mjs"></script><script type="module" src="/workshop-ui/merchant-downloads.mjs"></script>`;
  const merchantPage = pathname => pathname === '/werkstatt' || pathname.startsWith('/werkstatt/');
  return Object.freeze({origin:appOrigin, csp,
    authorize(req, pathname) {
      if (req.headers.host !== host) return false;
      const navigation = ['GET','HEAD'].includes(req.method) && merchantPage(pathname) && req.headers['sec-fetch-mode'] === 'navigate' && ['iframe','document'].includes(req.headers['sec-fetch-dest']);
      const requestOrigin = req.headers.origin, site = req.headers['sec-fetch-site'];
      if (requestOrigin && requestOrigin !== appOrigin && !(navigation && [shopOrigin,'https://admin.shopify.com'].includes(requestOrigin))) return false;
      if (site && !['same-origin','none'].includes(site) && !navigation) return false;
      // URL host/shop parameters and forwarded headers never select a trust target.
      return true;
    },
    allows(pathname) {return pathname==='/_runtime/images/gravuru-edelstahl-feine-maserung-vorschau.png' || merchantPage(pathname) || pathname.startsWith('/api/workshop/') || pathname.startsWith('/workshop-ui/') || pathname.startsWith('/platform/sources/app/shared/');},
    html(bytes, pathname) {
      if (!merchantPage(pathname)) reject();
      const text = bytes.toString('utf8'); if (!/<head(?:\s[^>]*)?>/i.test(text)) reject();
      return Buffer.from(text.replace(/<head(?:\s[^>]*)?>/i, match => match + bootstrap));
    }
  });
}
