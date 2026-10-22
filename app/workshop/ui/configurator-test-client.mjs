const ROOT = '/api/configurator-test/';
const WORKSHOP = '/api/' + 'workshop/';
const ACRYL = WORKSHOP + 'acryl/';
const PRODUCT = /^gid:\/\/shopify\/Product\/[1-9][0-9]{0,19}$/;
const VARIANT = /^gid:\/\/shopify\/ProductVariant\/[1-9][0-9]{0,19}$/;
const CFG = /^cfg_[a-f0-9-]{36}$/;
const fail = message => { throw Error(message); };
async function json(response) {
  const body = await response.json();
  if (!response.ok) fail(body.error?.message || 'Die Testanbindung konnte nicht bestätigt werden.');
  return body;
}

// Access remains in this closure. URLs contain only explicit product IDs.
export async function openConfiguratorTest({request, search, now = Date.now}) {
  const params = new URLSearchParams(search);
  const shopifyProductId = params.get('shopifyProductId'), shopifyVariantId = params.get('shopifyVariantId');
  if (shopifyProductId === null && shopifyVariantId === null) return null;
  if (!PRODUCT.test(shopifyProductId || '') || !VARIANT.test(shopifyVariantId || ''))
    fail('Für den Produkttest sind die genaue Shopify-Produkt-ID und Varianten-ID erforderlich.');
  const bootstrap = await json(await request(ROOT + 'session'));
  if (bootstrap.mode !== 'merchant-test-only' || bootstrap.publicAccess !== false || bootstrap.productionReady !== false ||
      typeof bootstrap.csrfToken !== 'string' || !bootstrap.csrfToken || /[\r\n]/.test(bootstrap.csrfToken))
    fail('Die geschützte Testsitzung ist nicht bestätigt.');
  const session = await json(await request(ROOT + 'sessions', {method:'POST',
    headers:{'Content-Type':'application/json','X-Gravuru-CSRF':bootstrap.csrfToken},
    body:JSON.stringify({shopifyProductId,shopifyVariantId})}));
  const b = session.binding;
  if (!b || b.shopifyProductId !== shopifyProductId || b.shopifyVariantId !== shopifyVariantId || !CFG.test(b.productId || '') ||
      !Number.isSafeInteger(b.productRevision) || b.productRevision < 1 || !['native','form'].includes(session.editorKind) ||
      ![WORKSHOP,ACRYL].includes(session.apiPrefix) ||
      !['/_merchant-editor.html','/_merchant-form-editor.html','/_merchant-acryl-editor.html','/_merchant-acryl-form-editor.html'].includes(session.editorPath) ||
      session.testOnly !== true || session.productionReady !== false ||
      typeof session.token !== 'string' || !session.token || session.token.length > 4096 || /[\r\n]/.test(session.token) ||
      !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= now())
    fail('Produkt, Datenspeicher oder Testsitzung stimmen nicht überein.');
  const binding = Object.freeze(structuredClone(b));
  const headers = () => {
    if (Date.parse(session.expiresAt) <= now()) fail('Die Testsitzung ist abgelaufen. Bitte diese Ansicht erneut öffnen; die gespeicherte Gestaltung bleibt erhalten.');
    return {'X-Gravuru-Configurator':session.token,'X-Gravuru-CSRF':bootstrap.csrfToken};
  };
  const editorRequest = (path, options) => {
    if (typeof path !== 'string' || !path.startsWith(WORKSHOP) || path.startsWith(ACRYL) && session.apiPrefix !== ACRYL)
      fail('Die Anfrage gehört nicht zu diesem Produktdatenspeicher.');
    const relative = path.startsWith(ACRYL) ? path.slice(ACRYL.length) : path.slice(WORKSHOP.length);
    return request(session.apiPrefix + relative, options);
  };
  return Object.freeze({binding,productId:b.productId,productRevision:b.productRevision,
    editorKind:session.editorKind,editorPath:session.editorPath,request:editorRequest,
    model:async()=>json(await request(ROOT+'model',{headers:headers()})),
    submitCart:async(input,{draftToken}={})=>{
      if(typeof draftToken!=='string'||!draftToken||/[\r\n]/.test(draftToken))fail('Der private Entwurfszugang fehlt.');
      return json(await request(ROOT+'cart',{method:'POST',headers:{...headers(),'Content-Type':'application/json','X-Gravuru-Draft':draftToken},body:JSON.stringify(input)}));
    }
  });
}
