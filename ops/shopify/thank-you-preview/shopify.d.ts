// Form wie von der Shopify-CLI erzeugt: jedes Modul bekommt die Schnittstelle seines eigenen Ziels.
// Gegen @shopify/ui-extensions 2026.10.2 geprüft (`npm install && npm run check`). `preact` steht nur wegen der Typen hier:
// die Bausteintypen des Kundenkontos im Shopify-Paket verweisen darauf; der Code selbst nutzt es nicht.
import '@shopify/ui-extensions';
import 'preact';
//@ts-ignore
declare module './src/ThankYou.js' {
  const shopify: import('@shopify/ui-extensions/purchase.thank-you.cart-line-item.render-after').Api;
  const globalThis: {shopify: typeof shopify};
}
//@ts-ignore
declare module './src/OrderStatus.js' {
  const shopify: import('@shopify/ui-extensions/customer-account.order-status.cart-line-item.render-after').Api;
  const globalThis: {shopify: typeof shopify};
}
