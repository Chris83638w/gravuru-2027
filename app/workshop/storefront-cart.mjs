// Request preparation only. No network calls, payment or shop mutation.
import {personalizationAttributes} from './cart-personalization.mjs';
import {CART_CONFIG_ID,CART_LINE_ID} from './cart-configuration.mjs';
const LINE_FIELDS="id\n          quantity\n          attributes { key value }\n          merchandise { ... on ProductVariant { id } }\n          cost { amountPerQuantity { amount currencyCode } totalAmount { amount currencyCode } }";
export const CART_CREATE = "mutation GravuruCartCreate($input: CartInput!) {\n  cartCreate(input: $input) {\n    cart {\n      id\n      checkoutUrl\n      lines(first: 2) {\n        nodes {\n          "+LINE_FIELDS+"\n        }\n        pageInfo { hasNextPage }\n      }\n    }\n    userErrors { field message code }\n    warnings { code message }\n  }\n}";
// K8 (Ü9.1): Bearbeiten ersetzt die bestehende Zeile; Menge und Ausführung kommen aus dem neuen Angebot, der Preis aus dem Shop.
export const CART_LINES_UPDATE = "mutation GravuruCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n  cartLinesUpdate(cartId: $cartId, lines: $lines) {\n    cart {\n      id\n      checkoutUrl\n      lines(first: 50) {\n        nodes {\n          "+LINE_FIELDS+"\n        }\n        pageInfo { hasNextPage }\n      }\n    }\n    userErrors { field message code }\n    warnings { code message }\n  }\n}";
export const CART_LINES_ADD = CART_LINES_UPDATE.replaceAll('GravuruCartLinesUpdate','GravuruCartLinesAdd').replaceAll('CartLineUpdateInput','CartLineInput').replaceAll('cartLinesUpdate','cartLinesAdd');
export const CART_READ = 'query GravuruCartRead($cartId: ID!, $after: String) { cart(id: $cartId) { id checkoutUrl lines(first: 100, after: $after) { nodes { '+LINE_FIELDS+' } pageInfo { hasNextPage endCursor } } } }';
const fail = message => { throw Object.assign(Error(message), {status:422, code:'cart_handoff'}); };
const cents = money => {
  if (money?.currencyCode !== 'EUR' || typeof money.amount !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(money.amount)) fail('Shoppreis oder Währung nicht bestätigt.');
  const [whole, fraction=''] = money.amount.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(n)) fail('Shoppreis nicht bestätigt.');
  return n;
};
// Private Bearbeiten-Adresse: nur HTTPS ohne Zugangsdaten; config/rev werden angehängt, nichts Privates.
export function editLink(editUrl, {id, rev}) {
  let url; try { url = new URL(editUrl); } catch { fail('Bearbeiten-Adresse ist ungültig.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || editUrl.length > 1024) fail('Bearbeiten-Adresse ist ungültig.');
  url.searchParams.set('config', id); url.searchParams.set('rev', String(rev));
  return url.href;
}
export function configurationAttributes(configuration) {
  if (configuration === undefined) return [];
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration) ||
      Object.keys(configuration).some(k=>!['id','rev','editUrl'].includes(k)) ||
      typeof configuration.id !== 'string' || !CART_CONFIG_ID.test(configuration.id) ||
      !Number.isSafeInteger(configuration.rev) || configuration.rev < 1 ||
      (configuration.editUrl !== undefined && typeof configuration.editUrl !== 'string')) fail('Keine gültige Konfigurations-Revision.');
  return [{key:'_gravuru_config', value:configuration.id}, {key:'_gravuru_rev', value:String(configuration.rev)},
    ...(configuration.editUrl === undefined ? [] : [{key:'_gravuru_bearbeiten', value:editLink(configuration.editUrl, configuration)}])];
}
// K14 / Ü12.1: sichtbare Zusatzfelder (ohne Unterstrich), nie technische oder reservierte Schlüssel.
const RESERVED = ['Bearbeiten', 'Bearbeitbarer Entwurf'];
export function fieldAttributes(fields) {
  if (fields === undefined) return [];
  if (!Array.isArray(fields) || fields.length > 20) fail('Ungültige Zusatzangaben.');
  const seen = new Set();
  return fields.map(f => {
    if (!f || typeof f !== 'object' || Array.isArray(f) || Object.keys(f).some(k => !['label','value'].includes(k)) ||
        typeof f.label !== 'string' || !f.label.trim() || f.label.length > 80 || f.label.startsWith('_') || RESERVED.includes(f.label) || seen.has(f.label) ||
        typeof f.value !== 'string' || !f.value || f.value.length > 500 || /[\x00-\x1f\x7f]/.test(f.label + f.value)) fail('Ungültige Zusatzangaben.');
    seen.add(f.label);
    return {key: f.label, value: f.value};
  });
}
const target = t => {
  if (t === undefined || t === null) return null;
  if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(k=>!['cartId','lineId'].includes(k)) ||
      typeof t.cartId !== 'string' || !/^gid:\/\/shopify\/Cart\/[^\s"'<>]{1,1000}$/.test(t.cartId) ||
      typeof t.lineId !== 'string' || !CART_LINE_ID.test(t.lineId)) fail('Keine gültige Warenkorbzeile zum Ersetzen.');
  return {cartId:t.cartId, lineId:t.lineId};
};
const addTarget = t => {
  if (t === undefined || t === null) return null;
  if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).length !== 1 || typeof t.cartId !== 'string' ||
      !/^gid:\/\/shopify\/Cart\/[^\s"'<>]{1,1000}$/.test(t.cartId)) fail('Kein gültiger bestehender Warenkorb.');
  return {cartId:t.cartId};
};
function lineInput(offer) {
  if (offer?.scope !== 'test-checkout-only' || !/^[1-9][0-9]{0,19}$/.test(offer.variantId) ||
      !Number.isSafeInteger(offer.quantity) || offer.quantity < 1 || offer.quantity > 99 ||
      !Number.isSafeInteger(offer.unitCents) || offer.unitCents < 0 || offer.unitCents > 100000000 || !Number.isSafeInteger(offer.unitCents*offer.quantity) || offer.currency !== 'EUR' ||
      offer.property?.name !== '_gravuru_offer' || !/^[a-f0-9]{64}$/.test(offer.property?.value)) fail('Keine gültige gesicherte Checkout-Zuordnung.');
  return {
    merchandiseId:'gid://shopify/ProductVariant/'+offer.variantId,
    quantity:offer.quantity,
    attributes:[{key:offer.property.name, value:offer.property.value}, ...personalizationAttributes(offer.personalization), ...configurationAttributes(offer.configuration), ...fieldAttributes(offer.fields)]
  };
}
// `replace` = bestehende Zeile (cartId/lineId) durch den neuen Stand ersetzen statt neu anlegen.
export function prepareCartRequest(offer, replace, addTo) {
  const line = lineInput(offer), t = target(replace), a = addTarget(addTo);
  if (t && a) fail('Ersetzen und Ergänzen sind getrennte Warenkorbaktionen.');
  if (a) {if (!offer.configuration) fail('Ergänzen braucht eine Konfigurations-Revision.');return {query:CART_LINES_ADD,variables:{cartId:a.cartId,lines:[line]}};}
  if (!t) return {query:CART_CREATE, variables:{input:{lines:[line]}}};
  if (offer.configuration === undefined) fail('Ersetzen einer Warenkorbzeile braucht eine Konfigurations-Revision.');
  return {query:CART_LINES_UPDATE, variables:{cartId:t.cartId, lines:[{id:t.lineId, ...line}]}};
}
// A future transport must pass this check before presenting checkoutUrl.
// Never log responses or include their tokens/URLs in errors.
export function verifyCartResponse(response, offer, shopDomain, replace, addTo, before) {
  const t = target(replace), a = addTarget(addTo), request = prepareCartRequest(offer, replace, addTo);
  const expected = t || a ? request.variables.lines[0] : request.variables.input.lines[0];
  if (typeof shopDomain !== 'string' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) fail('Shop nicht bestätigt.');
  const result = t ? response?.data?.cartLinesUpdate : a ? response?.data?.cartLinesAdd : response?.data?.cartCreate;
  if (response?.errors !== undefined && (!Array.isArray(response.errors) || response.errors.length) || !result || !Array.isArray(result.userErrors) || result.userErrors.length ||
      !Array.isArray(result.warnings) || result.warnings.length) fail('Shop-Warenkorb benötigt eine Prüfung; keine Weiterleitung.');
  const cart = result.cart, lines = cart?.lines?.nodes;
  if (typeof cart?.id !== 'string' || !cart.id.startsWith('gid://shopify/Cart/') || !Array.isArray(lines) || (t || a ? lines.length < 1 : lines.length !== 1) ||
      cart.lines.pageInfo?.hasNextPage !== false) fail('Shop-Warenkorb ist nicht vollständig bestätigt.');
  const attributesOf = (line, key) => Array.isArray(line?.attributes) ? line.attributes.filter(a=>a?.key===key) : [];
  let line = lines[0];
  if (t || a) {
    if (cart.id !== (t || a).cartId) fail('Shop-Warenkorb gehört nicht zur bearbeiteten Warenkorbzeile.');
    const matches = lines.filter(l=>attributesOf(l,'_gravuru_config').some(v=>v.value===offer.configuration.id));
    if (matches.length !== 1) fail('Die bearbeitete Warenkorbzeile wurde vom Shop nicht bestätigt.');
    line = matches[0];
    // A new Shopify line id is only accepted after the trusted pre-read proves
    // which existing configuration was replaced.
    if(t && line.id!==t.lineId && !before) fail('Die bearbeitete Warenkorbzeile wurde vom Shop nicht bestätigt.');
    // Keine Duplikate: genau eine Zeile trägt diese Konfiguration bzw. dieses Angebot.
    for (const key of ['_gravuru_config', '_gravuru_offer']) {
      const value = expected.attributes.find(a=>a.key===key).value;
      if (lines.filter(l=>attributesOf(l,key).some(a=>a.value===value)).length !== 1) fail('Shop-Warenkorb enthält die Konfiguration mehrfach; keine Weiterleitung.');
    }
  }
  if (before) verifyPreservedCart(before, cart, offer, t, a);
  const attributes = attributesOf(line, '_gravuru_offer');
  for (const expectedAttribute of expected.attributes) {
    const actual = attributesOf(line, expectedAttribute.key);
    if (actual.length !== 1 || actual[0].value !== expectedAttribute.value) fail('Shop-Warenkorb hat die gesicherte Entwurfs- oder Preiszuordnung verändert.');
  }
  if (line?.merchandise?.id !== expected.merchandiseId || line.quantity !== offer.quantity ||
      attributes?.length !== 1 || attributes[0].value !== offer.property.value ||
      cents(line?.cost?.amountPerQuantity) !== offer.unitCents ||
      cents(line?.cost?.totalAmount) !== offer.unitCents * offer.quantity) fail('Shop-Warenkorb weicht bei Gestaltung, Variante, Menge oder Preis ab.');
  // Mit Konfigurations-Revision muss der Shop die Zeilenkennung liefern; sie ist der Anker für „Bearbeiten“.
  if (offer.configuration !== undefined && (typeof line.id !== 'string' || !CART_LINE_ID.test(line.id))) fail('Shop-Warenkorb hat die Zeilenkennung nicht bestätigt.');
  let url; try { url = new URL(cart.checkoutUrl); } catch { fail('Checkout-Adresse nicht bestätigt.'); }
  if (url.protocol !== 'https:' || url.hostname !== shopDomain || url.port || url.username || url.password) fail('Checkout-Adresse gehört nicht zum bestätigten Shop.');
  return {cartId:cart.id, checkoutUrl:url.href, quantity:offer.quantity,
    unitCents:offer.unitCents, totalCents:offer.unitCents*offer.quantity, currency:'EUR', paymentConfirmed:false,
    ...(typeof line.id === 'string' && CART_LINE_ID.test(line.id) ? {lineId:line.id} : {}),
    ...(t&&line.id!==t.lineId?{previousLineId:t.lineId}:{}), mode:t ? 'update' : a ? 'add' : 'create'};
}

// Full server-read cart only; a browser cannot supply evidence of ownership or of
// preserved lines. Treat concurrent cart changes as a review case, never retry.
export function verifyCartBefore(cart, offer, replace, addTo) {
  const t=target(replace),a=addTarget(addTo);prepareCartRequest(offer,t,a);
  if (!(t||a) || cart?.id!==(t||a).cartId || cart.lines?.pageInfo?.hasNextPage!==false || !Array.isArray(cart.lines?.nodes)) fail('Bestehender Warenkorb nicht vollständig gelesen.');
  const ids=new Set();for(const line of cart.lines.nodes){if(!CART_LINE_ID.test(line?.id)||ids.has(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||!Array.isArray(line.attributes))fail('Warenkorbzeilen nicht eindeutig.');ids.add(line.id);}
  const own=cart.lines.nodes.filter(l=>l.attributes.some(v=>v.key==='_gravuru_config'&&v.value===offer.configuration.id));
  if(t ? own.length!==1||own[0].id!==t.lineId : own.length!==0)fail('Konfiguration ist im bestehenden Warenkorb nicht eindeutig.');
  if(cart.lines.nodes.some(l=>l.attributes.some(v=>v.key==='_gravuru_offer'&&v.value===offer.property.value)))fail('Dieses Angebot ist im Warenkorb bereits enthalten.');
  return cart;
}
function verifyPreservedCart(before,after,offer,t,a){
  verifyCartBefore(before,offer,t,a);
  const signature=line=>JSON.stringify([line.quantity,line.merchandise?.id,[...line.attributes].map(v=>[v.key,v.value]).sort(),line.cost]);
  const old=before.lines.nodes.filter(l=>!t||l.id!==t.lineId).map(signature).sort();
  const rest=after.lines.nodes.filter(l=>!l.attributes?.some(v=>v.key==='_gravuru_config'&&v.value===offer.configuration.id)).map(signature).sort();
  if(JSON.stringify(old)!==JSON.stringify(rest)||after.lines.nodes.length!==before.lines.nodes.length+(a?1:0))fail('Andere Warenkorbpositionen haben sich verändert; Warenkorb prüfen.');
}

// Shared server-derived attributes for the theme-cart handoff.
export {lineInput as cartLineInput};
