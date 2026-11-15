# Checkout-Sperre `gravuru-checkout-guard` (15.11.2026)

Gegenstück zur Einzelsperre in `master-release/cart_transform_run.mjs`. Quelltext liegt in
`../master-release/cart_validation_run.mjs`, Eingabe in `../master-release/cart_validation_run.graphql`.

Einbau in das vollständige App-Projekt (wie beim Release vom 08.11.):
- `extensions/gravuru-checkout-guard/shopify.extension.toml` = diese Datei
- `src/` = `master-release/` (gleiche Module wie die Preisfunktion: cart_transform_run, price-v1,
  legacy-price, pricing-history, priced-options, ../checkout-image/cart-image) + `cart_validation_run.mjs`
  + `cart_validation_run.graphql`
- `src/index.js`: `export {cartValidationsGenerateRun} from './master-release/cart_validation_run.mjs';`

Sperrt nur bei `CHECKOUT_INTERACTION`/`CHECKOUT_COMPLETION`, nie beim Hinzufügen/Entfernen im Warenkorb.
Nach der Freigabe aktivieren (Shopify → Einstellungen → Checkout → Checkout-Regeln, „Fehler blockieren“
an), erst danach die Preisfunktion mit Einzelsperre freigeben. Ablauf: `docs/handoffs/2026-11-15-preisfunktion-einzelsperre.md`.
