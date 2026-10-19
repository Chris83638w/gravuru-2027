// Request preparation only. No network calls, payment or shop mutation.
import {personalizationAttributes} from './cart-personalization.mjs';
import {CART_CONFIG_ID,CART_LINE_ID} from './cart-configuration.mjs';
const LINE_FIELDS="id\n          quantity\n          attributes { key value }\n          merchandise { ... on ProductVariant { id } }\n          cost { amountPerQuantity { amount currencyCode } totalAmount { amount currencyCode } }";
export const CART_CREATE = "mutation GravuruCartCreate($input: CartInput!) {\n  cartCreate(input: $input) {\n    cart {\n      id\n      checkoutUrl\n      lines(first: 2) {\n        nodes {\n          "+LINE_FIELDS+"\n        }\n        pageInfo { hasNextPage }\n      }\n    }\n    userErrors { field message code }\n    warnings { code message }\n  }\n}";
// K8 (Ü9.1): Bearbeiten ersetzt die bestehende Zeile; Menge und Ausführung kommen aus dem neuen Angebot, der Preis aus dem Shop.
export const CART_LINES_UPDATE = "mutation GravuruCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {\n  cartLinesUpdate(cartId: $cartId, lines: $lines) {\n    cart {\n      id\n      checkoutUrl\n      lines(first: 50) {\n        nodes {\n          "+LINE_FIELDS+"\n        }\n        pageInfo { hasNextPage }\n      }\n    }\n    userErrors { field message code }\n    warnings { code message }\n  }\n}";
const fail = message => { throw Object.assign(Error(message), {status:422, code:'cart_handoff'}); };
const cents = money => {
  if (money?.currencyCode !== 'EUR' || typeof money.amount !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(money.amount)) fail('Shoppreis oder Währung nicht bestätigt.');
  const [whole, fraction=''] = money.amount.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(n)) fail('Shoppreis nicht bestätigt.');
  return n;
};
// Sichtbare Bearbeiten-Adresse: nur HTTPS ohne Zugangsdaten; config/rev werden angehängt, nichts Privates.
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
    ...(configuration.editUrl === undefined ? [] : [{key:'Bearbeiten', value:editLink(configuration.editUrl, configuration)}])];
}
const target = t => {
  if (t === undefined || t === null) return null;
  if (!t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(k=>!['cartId','lineId'].includes(k)) ||
      typeof t.cartId !== 'string' || !t.cartId.startsWith('gid://shopify/Cart/') || t.cartId.length > 1024 ||
      typeof t.lineId !== 'string' || !CART_LINE_ID.test(t.lineId)) fail('Keine gültige Warenkorbzeile zum Ersetzen.');
  return {cartId:t.cartId, lineId:t.lineId};
};
function lineInput(offer) {
  if (offer?.scope !== 'test-checkout-only' || !/^[1-9][0-9]{0,19}$/.test(offer.variantId) ||
      !Number.isSafeInteger(offer.quantity) || offer.quantity < 1 || offer.quantity > 99 ||
      !Number.isSafeInteger(offer.unitCents) || offer.unitCents < 0 || offer.currency !== 'EUR' ||
      offer.property?.name !== '_gravuru_offer' || !/^[a-f0-9]{64}$/.test(offer.property?.value)) fail('Keine gültige gesicherte Checkout-Zuordnung.');
  return {
    merchandiseId:'gid://shopify/ProductVariant/'+offer.variantId,
    quantity:offer.quantity,
    attributes:[{key:offer.property.name, value:offer.property.value}, ...personalizationAttributes(offer.personalization), ...configurationAttributes(offer.configuration)]
  };
}
// `replace` = bestehende Zeile (cartId/lineId) durch den neuen Stand ersetzen statt neu anlegen.
export function prepareCartRequest(offer, replace) {
  const line = lineInput(offer), t = target(replace);
  if (!t) return {query:CART_CREATE, variables:{input:{lines:[line]}}};
  if (offer.configuration === undefined) fail('Ersetzen einer Warenkorbzeile braucht eine Konfigurations-Revision.');
  return {query:CART_LINES_UPDATE, variables:{cartId:t.cartId, lines:[{id:t.lineId, ...line}]}};
}
// A future transport must pass this check before presenting checkoutUrl.
// Never log responses or include their tokens/URLs in errors.
export function verifyCartResponse(response, offer, shopDomain, replace) {
  const t = target(replace), request = prepareCartRequest(offer, replace);
  const expected = t ? request.variables.lines[0] : request.variables.input.lines[0];
  if (typeof shopDomain !== 'string' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) fail('Shop nicht bestätigt.');
  const result = t ? response?.data?.cartLinesUpdate : response?.data?.cartCreate;
  if (response?.errors !== undefined && (!Array.isArray(response.errors) || response.errors.length) || !result || !Array.isArray(result.userErrors) || result.userErrors.length ||
      !Array.isArray(result.warnings) || result.warnings.length) fail('Shop-Warenkorb benötigt eine Prüfung; keine Weiterleitung.');
  const cart = result.cart, lines = cart?.lines?.nodes;
  if (typeof cart?.id !== 'string' || !cart.id.startsWith('gid://shopify/Cart/') || !Array.isArray(lines) || (t ? lines.length < 1 : lines.length !== 1) ||
      cart.lines.pageInfo?.hasNextPage !== false) fail('Shop-Warenkorb ist nicht vollständig bestätigt.');
  const attributesOf = (line, key) => Array.isArray(line?.attributes) ? line.attributes.filter(a=>a?.key===key) : [];
  let line = lines[0];
  if (t) {
    if (cart.id !== t.cartId) fail('Shop-Warenkorb gehört nicht zur bearbeiteten Warenkorbzeile.');
    const matches = lines.filter(l=>l?.id===t.lineId);
    if (matches.length !== 1) fail('Die bearbeitete Warenkorbzeile wurde vom Shop nicht bestätigt.');
    line = matches[0];
    // Keine Duplikate: genau eine Zeile trägt diese Konfiguration bzw. dieses Angebot.
    for (const key of ['_gravuru_config', '_gravuru_offer']) {
      const value = expected.attributes.find(a=>a.key===key).value;
      if (lines.filter(l=>attributesOf(l,key).some(a=>a.value===value)).length !== 1) fail('Shop-Warenkorb enthält die Konfiguration mehrfach; keine Weiterleitung.');
    }
  }
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
    ...(typeof line.id === 'string' && CART_LINE_ID.test(line.id) ? {lineId:line.id} : {}), mode:t ? 'update' : 'create'};
}
