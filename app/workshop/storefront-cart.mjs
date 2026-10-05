// Request preparation only. No network calls, payment or shop mutation.
export const CART_CREATE = "mutation GravuruCartCreate($input: CartInput!) {\n  cartCreate(input: $input) {\n    cart {\n      id\n      checkoutUrl\n      lines(first: 2) {\n        nodes {\n          id\n          quantity\n          attributes { key value }\n          merchandise { ... on ProductVariant { id } }\n          cost { amountPerQuantity { amount currencyCode } totalAmount { amount currencyCode } }\n        }\n        pageInfo { hasNextPage }\n      }\n    }\n    userErrors { field message code }\n    warnings { code message }\n  }\n}";
const fail = message => { throw Object.assign(Error(message), {status:422, code:'cart_handoff'}); };
const cents = money => {
  if (money?.currencyCode !== 'EUR' || typeof money.amount !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(money.amount)) fail('Shoppreis oder Währung nicht bestätigt.');
  const [whole, fraction=''] = money.amount.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(n)) fail('Shoppreis nicht bestätigt.');
  return n;
};
export function prepareCartRequest(offer) {
  if (offer?.scope !== 'test-checkout-only' || !/^[1-9][0-9]{0,19}$/.test(offer.variantId) ||
      !Number.isSafeInteger(offer.quantity) || offer.quantity < 1 || offer.quantity > 99 ||
      !Number.isSafeInteger(offer.unitCents) || offer.unitCents < 0 || offer.currency !== 'EUR' ||
      offer.property?.name !== '_gravuru_offer' || !/^[a-f0-9]{64}$/.test(offer.property?.value)) fail('Keine gültige gesicherte Checkout-Zuordnung.');
  return {query:CART_CREATE, variables:{input:{lines:[{
    merchandiseId:'gid://shopify/ProductVariant/'+offer.variantId,
    quantity:offer.quantity,
    attributes:[{key:offer.property.name, value:offer.property.value}]
  }]}}};
}
// A future transport must pass this check before presenting checkoutUrl.
// Never log responses or include their tokens/URLs in errors.
export function verifyCartResponse(response, offer, shopDomain) {
  const expected = prepareCartRequest(offer).variables.input.lines[0];
  if (typeof shopDomain !== 'string' || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) fail('Shop nicht bestätigt.');
  const result = response?.data?.cartCreate;
  if (response?.errors?.length || !result || !Array.isArray(result.userErrors) || result.userErrors.length ||
      !Array.isArray(result.warnings) || result.warnings.length) fail('Shop-Warenkorb benötigt eine Prüfung; keine Weiterleitung.');
  const cart = result.cart, lines = cart?.lines?.nodes;
  if (typeof cart?.id !== 'string' || !cart.id.startsWith('gid://shopify/Cart/') || !Array.isArray(lines) || lines.length !== 1 ||
      cart.lines.pageInfo?.hasNextPage !== false) fail('Shop-Warenkorb ist nicht vollständig bestätigt.');
  const line = lines[0], attributes = Array.isArray(line?.attributes) ? line.attributes.filter(a=>a?.key==='_gravuru_offer') : [];
  if (line?.merchandise?.id !== expected.merchandiseId || line.quantity !== offer.quantity ||
      attributes?.length !== 1 || attributes[0].value !== offer.property.value ||
      cents(line.cost?.amountPerQuantity) !== offer.unitCents ||
      cents(line.cost?.totalAmount) !== offer.unitCents * offer.quantity) fail('Shop-Warenkorb weicht bei Gestaltung, Variante, Menge oder Preis ab.');
  let url; try { url = new URL(cart.checkoutUrl); } catch { fail('Checkout-Adresse nicht bestätigt.'); }
  if (url.protocol !== 'https:' || url.hostname !== shopDomain || url.port || url.username || url.password) fail('Checkout-Adresse gehört nicht zum bestätigten Shop.');
  return {cartId:cart.id, checkoutUrl:url.href, quantity:offer.quantity,
    unitCents:offer.unitCents, totalCents:offer.unitCents*offer.quantity, currency:'EUR', paymentConfirmed:false};
}
