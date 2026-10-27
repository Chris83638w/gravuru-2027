import {isDoorbellImagePath} from './doorbell-image-resource.mjs';
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
  const bootstrap = `<meta name="shopify-api-key" content="${config.clientId}"><meta name="shopify-shop" content="${config.shopDomain}"><meta name="gravuru-merchant-auth" content="required"><meta name="shopify-disabled-features" content="fetch"><script src="${bridgeURL}"></script><script type="module" src="/workshop-ui/merchant-navigation.mjs"></script><script type="module" src="/workshop-ui/merchant-media.mjs"></script><script type="module" src="/workshop-ui/merchant-downloads.mjs"></script>`;
  const merchantPage = pathname => pathname === '/werkstatt' || pathname.startsWith('/werkstatt/');
  const catalogueEditorPage=pathname=>/^\/werkstatt\/designs\/bearbeiten\/?$/.test(pathname);
  const rendererPage=pathname=>pathname==='/_merchant-editor.html'||pathname==='/_merchant-form-editor.html';
  // Only the historical static renderer needs inline scripts/eval. Merchant
  // pages keep their strict policy and product APIs retain their JWT gate.
  const rendererCsp=csp.replace("script-src 'self' "+bridgeURL,"script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:").replace("default-src 'self'","default-src 'self' data: blob:").replace('frame-ancestors ',"frame-ancestors 'self' ");
  return Object.freeze({origin:appOrigin, csp,
    cspFor:pathname=>pathname==='/_merchant-editor.html'?rendererCsp:(rendererPage(pathname)||catalogueEditorPage(pathname))?csp.replace('frame-ancestors ',"frame-ancestors 'self' "):csp,
    authorize(req, pathname) {
      if (req.headers.host !== host) return false;
      const navigation = ['GET','HEAD'].includes(req.method) && merchantPage(pathname) && req.headers['sec-fetch-mode'] === 'navigate' && ['iframe','document'].includes(req.headers['sec-fetch-dest']);
      const requestOrigin = req.headers.origin, site = req.headers['sec-fetch-site'];
      if (requestOrigin && requestOrigin !== appOrigin && !(navigation && [shopOrigin,'https://admin.shopify.com'].includes(requestOrigin))) return false;
      if (site && !['same-origin','none'].includes(site) && !navigation) return false;
      // URL host/shop parameters and forwarded headers never select a trust target.
      return true;
    },
    allows(pathname) {return isDoorbellImagePath(pathname) || pathname==='/assistant.js' || /^\/acrylic-assets\/[a-z0-9-]+\.(png|webp)$/.test(pathname) || rendererPage(pathname) || pathname==='/api/guides' || pathname.startsWith('/_runtime/') || /^\/_bundle\/editor-[a-f0-9]{16}\.mjs$/.test(pathname) || pathname.startsWith('/configurator/variant-m/') || pathname==='/workshop/theme-limits.mjs' || pathname==='/workshop/process-profiles.mjs' || merchantPage(pathname) || pathname.startsWith('/api/workshop/') || pathname.startsWith('/workshop-ui/') || pathname.startsWith('/platform/sources/app/shared/');},
    html(bytes, pathname, search='') {
      if(rendererPage(pathname))return bytes;
      if (!merchantPage(pathname)) reject();
      const text = bytes.toString('utf8'); if (!/<head(?:\s[^>]*)?>/i.test(text)) reject();
      // Nested catalogue pages use the dashboard's per-request token bridge. The
      // public channel selects presentation only; every API keeps its JWT gate.
      const overlay=catalogueEditorPage(pathname)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(new URLSearchParams(search).get('katalogOverlay')||'');
      const injected=overlay?'<meta name="gravuru-merchant-auth" content="required">':bootstrap;
      return Buffer.from(text.replace(/<head(?:\s[^>]*)?>/i, match => match + injected));
    }
  });
}
