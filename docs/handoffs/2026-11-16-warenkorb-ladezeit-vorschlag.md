# Warenkorb-Übergabe: Ladezeit – Messung und Vorschlag (16.11.2026)

Account: Claude (Operator, nur lesend). **Vorschlag, keine Runtime-Änderung.** Nach `PRIO-KONFI.md` / `AGENTS.md` ist Checkout-Verhalten des gemeinsamen Konfis Sache von Mika in Abstimmung mit Mikail; dieses Dokument legt den Vorschlag vor.

Anlass: Chris 16.11.2026 – „der Konfi lädt zu langsam und bis das Produkt im Warenkorb ist, wird der Kunde abspringen“.

## Geprüfter Stand

- Live = `main` / Go-live `1c5f8062` (#239). Byte-Vergleich der sieben ausgelieferten Dateien `app/workshop/ui/{shop-entry-page,shop-entry-client,shop-design-switch,shop-selection-transfer,shop-warm,theme-cart-client,shop-embed}.mjs` gegen `app-2027.gravuru-designwerkstatt.de` bzw. `/apps/konfigurator/`: **alle identisch** (shop-embed nach Ersetzen von `__EDITOR_ORIGIN__`/`__PROXY_PATH__`).
- Testprodukt: `tuerschild-edelstahl-form-und-groesse-selbst-waehlen` (Template `konfi`, `ui=prio-r15`).

## Messung (Headless Chrome, kalter Cache)

Handy-Profil: 390×844, 4G-Drosselung (150 ms, 1,6 Mbit/s runter, 750 kbit/s hoch), CPU ×4. Ablauf wie Kunde: Produktseite → Cookies akzeptieren → „Jetzt personalisieren“ → Pflichtfeld Name ersetzen („Testkunde“) → „Warenkorb“ → `/cart.js` enthält die Position.

| Abschnitt | Desktop | Handy |
| --- | ---: | ---: |
| Produktseite LCP | 1,1–2,0 s | 5,0–7,3 s |
| Klick „Jetzt personalisieren“ → Editor bereit | 2,4–8,0 s | 8,5–13,7 s |
| **Klick „Warenkorb“ → Position im Warenkorb** | **≈ 39 s** | **≈ 113 s** |

Aufschlüsselung des Warenkorbschritts (ms ab Klick, Desktop / Handy):

| Anfrage | Dauer Desktop | Dauer Handy | Inhalt |
| --- | ---: | ---: | --- |
| Vorbereitung im Browser („Bitte warten …“) | ≈ 5,7 s | ≈ 8 s | Rendern vor dem ersten Request |
| `POST /api/shop-entry/acrylic-drafts` | 6,0 s | **36,6 s** | Entwurf sichern (Requestgröße nicht gemessen – offen) |
| `POST /api/shop-entry/theme-cart` | 1,1 s | 1,0 s | |
| `GET /apps/konfigurator/cart/data` | **11,0 s** | **17,5 s** | Antwort **2,44 MB**: `preview.base64` (PNG) + serverseitig `checkoutImage()` (Shopify `fileCreate` + Polling bis 9 s) |
| `POST /apps/konfigurator/cart/claim` | 1,4 s | 1,5 s | |
| `POST /cart/add.js` | **12,2 s** | **45,7 s** | FormData mit PNG-Datei `_Entwurf` (Upload über Mobilfunk) |

Rohdaten/Skripte: lokal beim Operator (Scratchpad der Sitzung), keine Kundendaten. Nebenwirkung: Testentwürfe „Testkunde“ auf dem Server angelegt; Warenkörbe nur in Wegwerf-Browsern, keine Bestellung.

## Befund

Das Vorschaubild wandert dreimal: (1) Server → Shopify Files (`shopify-checkout-image.mjs`, Ergebnis `_gravuru_checkout_image`, MediaImage-CDN-URL), (2) Server → Kundengerät als Base64 in `cart/data`, (3) Kundengerät → Shopify als Ajax-Upload `_Entwurf`. (2) und (3) sind für die Anzeige nicht nötig:

- Theme-Snippet `gravuru-warenkorb-bearbeiten.liquid` zeigt bei nativen Positionen bereits `_gravuru_bild` (App-URL) statt `_Entwurf`.
- Checkout-Bild nutzt `_gravuru_checkout_image` (siehe `ops/shopify/einzelsperre-release/*/src/cart_transform_run.graphql`); laut `shopify-checkout-image.mjs` werden Ajax-`/uploads/`-URLs von `lineUpdate.image` ohnehin abgelehnt.
- `previewUrl()` in `theme-cart-client.mjs` akzeptiert bereits `cdn.shopify.com`-URLs als `_Entwurf`.
- Produktion/Bestellung binden an den privaten Prüfstand (`productionReady:false` in der Übergabe), nicht an `_Entwurf`.

## Vorschlag (zur Entscheidung Mika/Mikail, Freigabe Chris)

**V1 – Bild nicht mehr über das Kundengerät schicken** (größter Effekt, erwartet Handy −60 s, Desktop −20 s):
1. `theme-cart.mjs`: `preview.base64` nur noch liefern, wenn kein `_gravuru_checkout_image` vorliegt (Altpfad), sonst weglassen.
2. `theme-cart-client.mjs` `submit()`: Ist `_gravuru_checkout_image` eine gültige `cdn.shopify.com`-URL, `_Entwurf` als **Text-Eigenschaft** mit dieser URL setzen statt Datei-Upload; `cart/add.js` als JSON statt Multipart. Rückleseprüfung (`previewUrl`) bleibt unverändert gültig.
3. Altpfad (kein Checkout-Bild) unverändert lassen.
4. Prüfen vor Freigabe: Warenkorb-/Drawer-Anzeige, Checkout-Bild, Bestellbestätigung (`gravuru-bestellbestaetigung-bild.liquid`), Bestelleingang/Werkstatt, Bearbeiten-Rundlauf (K8), Tests `theme-cart-client.test.mjs`, `theme-cart-flow.test.mjs`, `shop-entry*.test.mjs`.

**V2 – Checkout-Bild früher erzeugen:** `checkoutImage()` direkt nach erfolgreicher Entwurfssicherung im Hintergrund starten (Cache existiert bereits), damit `cart/data` nicht auf Shopify-`fileCreate`-Polling wartet.

**V3 – Entwurfssicherung messen:** Requestgröße von `acrylic-drafts` am Handy erfassen (36,6 s); falls Renderbilder enthalten sind, verkleinern oder während des Gestaltens vorab sichern.

**V4 – Fortschrittsanzeige:** Statt nur „Bitte warten …“ die vorhandenen `onProgress`-Texte sichtbar machen; Button bis Abschluss deaktiviert lassen.

Nicht Teil dieses Vorschlags, aber gemessen (separat entscheiden): Produktseite 1,4 MB HTML (Estimator-App ≈ 230 KB, JSON-LD mit 250 Varianten ≈ 193 KB, ungenutzte FPD-Einstellungen ≈ 26 KB); Consentmo-Cookiebanner überdeckt am Handy den Konfi-Warenkorbbutton; in 2 von 5 Desktop-Läufen öffnete „Jetzt personalisieren“ ganzseitig statt im Fenster.

## Umsetzung V1 (Chris 16.11.2026: „B, setz V1 selbst um“)

Ausdrückliche Ausnahme von der Prio-Konfi-Zuständigkeit durch Chris für **V1**; V2–V4 bleiben Vorschlag. Branch `dev/claude-warenkorb-bild-url-20261116`.

- `app/workshop/shop-entry.mjs`: `/cart/data` entfernt `preview`, sobald `checkoutImage` die READY-Shopify-Datei geliefert hat.
- `app/workshop/ui/theme-cart-client.mjs`: neuer Export `hostedPreview()`; ohne Inline-PNG nur gültig mit `cdn.shopify.com/…/files/gravuru-gestaltung-<64 hex>.png`. `submit()` schreibt dann JSON (`items[0].properties._Entwurf` = diese Adresse); Rückleseprüfung verlangt exakt diese Adresse. Mit Inline-PNG unverändert alter Weg (FormData).
- `app/workshop/ui/theme-cart-ui.mjs` (Ausweichseite): Vorschau aus der Shopify-Adresse, falls kein PNG (CSP `img-src https://cdn.shopify.com` war bereits erlaubt).
- Tests: `theme-cart-client.test.mjs` +4 (Textschreiben, Bearbeiten, falsche/fehlende Vorschau, Adressprüfung); `theme-cart-flow.test.mjs` auf neues Verhalten (kein PNG im Payload, JSON-Add mit `_Entwurf` = Checkout-Bild). Vorbestehende, unabhängige Fehler auf main unverändert: `shop-entry` „customer logo conversion…“, `konfis` „Werkstatt einheitlich…“.
- Live-Theme gelesen (Theme `190984126844`): `snippets/gravuru-warenkorb-bearbeiten.liquid` zeigt `_Entwurf` bei Präfix `https://cdn.shopify.com/` als Bild; `_`-Eigenschaften werden in `main-cart`/`cart-drawer` ausgeblendet → kompatibel ohne Theme-Änderung.
- Grenzen: Synthetische Tests, kein echter Shopify-Warenkorbtest mit dem neuen Code (erst nach Deploy möglich). `checkoutImage` (Shopify `fileCreate` + Polling) liegt weiter im kritischen Pfad (V2).

## Offene Freigaben

- Deploy des Branches auf `app-2027` nur nach Freigabe Chris, danach Handy-Messung wiederholen.
- V2–V4: Entscheidung Chris/Mikail.
