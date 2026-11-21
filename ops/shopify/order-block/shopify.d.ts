// Form wie von der Shopify-CLI erzeugt: das Modul bekommt die Schnittstelle seines Ziels. Das Admin-Paket deklariert –
// anders als das Kassen-Paket – kein globales `shopify`; ohne diese Datei kennt die Typprüfung den Namen nicht.
// Gegen @shopify/ui-extensions 2026.10.2 geprüft (`npm install && npm run check`).
import '@shopify/ui-extensions';
//@ts-ignore
declare module './src/OrderBlock.js' {
  const shopify: import('@shopify/ui-extensions/admin.order-details.block.render').Api;
  const globalThis: {shopify: typeof shopify};
}
