// Simuliert die Zahlung des Test-Shop-Warenkorbs: schickt dem Server eine unterschriebene Testbestellung,
// so wie Shopify es bei „orders/paid“ tut. Der Server muss mit SHOPIFY_WEBHOOK_SCHLUESSEL=dev laufen.
//   node dev/bestellung-simulieren.mjs [basis] [bestellnummer]
import {createHmac} from 'node:crypto';
const basis = process.argv[2] || 'http://127.0.0.1:8970';
const nummer = process.argv[3] || String(Date.now()).slice(-6);
const korb = await (await fetch(basis + '/cart.js')).json();
const body = JSON.stringify({
  id: Number(nummer), name: '#T' + nummer, test: true,
  line_items: korb.items.map((z, index) => ({id: index + 1, variant_id: z.id, sku: z.sku, quantity: z.quantity, price: (z.price / 100).toFixed(2), properties: Object.entries(z.properties).map(([name, value]) => ({name, value}))})),
});
const antwort = await fetch(basis + '/webhooks/shopify/orders-paid', {method: 'POST', body, headers: {
  'x-shopify-hmac-sha256': createHmac('sha256', 'dev').update(body).digest('base64'), 'x-shopify-shop-domain': 'testshop', 'x-shopify-webhook-id': 'sim-' + nummer}});
console.log(antwort.status, JSON.stringify(await antwort.json()));
