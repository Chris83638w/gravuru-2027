#!/usr/bin/env bash
# F05 (#239): Gleichwertigkeit Einzelsperre (live B) gegen die vorherige aktive Logik.
# Fuehrt die Preistests vom Stand 2abfd92 aus. Jede Eingabe laeuft durch beide Fassungen:
# gueltig -> identische Ausgabe; abgewiesen -> gleiche Meldung, nur die betroffenen Positionen ohne Preis.
# Erwartet: nur der Test "V3 checkout rejects tampered selections" schlaegt fehl (V3 ist nicht live; scheitert auch an der aktiven Fassung).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
T=$(mktemp -d); mkdir -p "$T/master-release" "$T/checkout-image"
for f in price-v1 legacy-price pricing-history pricing-storage cart_transform_run.test pricing-storage.test; do git show 2abfd92:ops/shopify/master-release/$f.mjs > "$T/master-release/$f.mjs"; done
git show 2abfd92:ops/shopify/checkout-image/cart-image.mjs > "$T/checkout-image/cart-image.mjs"
cp ops/shopify/einzelsperre-release/aktiv/src/master-release/cart_transform_run.mjs "$T/master-release/aktiv_ctr.mjs"
cp ops/shopify/einzelsperre-release/preis/src/master-release/cart_transform_run.mjs "$T/master-release/neu_ctr.mjs"
cp ops/shopify/einzelsperre-release/messung/aequivalenz-shim.mjs "$T/master-release/cart_transform_run.mjs"
cd "$T" && node --test master-release/cart_transform_run.test.mjs master-release/pricing-storage.test.mjs 2>&1 | grep -E "^# (tests|pass|fail)|^not ok|VERGLEICH" || true
