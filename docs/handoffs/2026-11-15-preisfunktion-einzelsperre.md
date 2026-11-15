# Preisfunktion: Einzelsperre statt Warenkorb-Sperre (15.11.2026)

Claude als Operator. Branch `dev/claude-preisfunktion-einzelsperre-20261115`. Design-Master/Konfi unberührt.

## Anlass

Chris konnte am 15.11. am PC nichts in den Warenkorb legen. Shopify-Funktionsprotokoll (Dev Dashboard,
Gravuru Konfigurator → Logs, 15.11. 09:41 CET): `gravuru-personalization-price` RuntimeError
„Personalization must be completed before checkout“. Ursache: zwei alte Leuchtturm-Testpositionen ohne
`_gravuru_revision`/`Bearbeitbarer Entwurf` im Warenkorb. Weil die aktive Funktion beim ersten Fehler
wirft (`blockOnFailure: true`), lehnt Shopify jede Warenkorbänderung ab – für alle Produkte.
Akut behoben (Chris' Freigabe: „Ja, entfernen“): nur diese zwei Testpositionen entfernt, danach echter
Konfi → Warenkorb-Test bestanden (19,99 €).

Chris 15.11.: „Beim Kunden darf es nicht so sein“ → Umbau freigegeben („ja“). Veröffentlichung braucht
eine eigene Freigabe von Chris im Chat.

## Kundenrelevante Fälle

- Größe/Variante fliegt aus der Preisliste, liegt aber bei jemandem im Warenkorb (geplant beim Go-live:
  30 R1-Kleinformate im Hauptprodukt) → heute ganzer Warenkorb gesperrt.
- Preisvertrag fehlt/kaputt, Position am Konfigurator vorbei, manipulierte Angaben → dito.
- Alte Testformate betreffen echte Kunden nicht (aktuelle Positionen tragen den Preisstand; die
  Preishistorie deckt Preisänderungen ab).

## Änderung

1. `ops/shopify/master-release/cart_transform_run.mjs`: jede Position wird einzeln mit den unveränderten,
   strengen Regeln bepreist. Eine abgewiesene Position bekommt von hier keinen Preis (bleibt beim
   Shopify-Listenpreis), alle anderen werden normal bepreist. `cartTransformStrict` = bisheriges Verhalten
   (für Vergleichstests), `rejectedPricingLines` = Sperrliste.
2. Neue Checkout-Prüfung `gravuru-checkout-guard` (`cart_validation_run.mjs/.graphql`,
   `ops/shopify/checkout-guard/`): sperrt bei `CHECKOUT_INTERACTION`/`CHECKOUT_COMPLETION` genau die
   abgewiesenen Positionen mit „„<Produkt>“: Diese Gestaltung ist nicht mehr bestellbar. Bitte aus dem
   Warenkorb entfernen und im Konfigurator neu gestalten.“ Beim Hinzufügen/Ändern/Entfernen
   (`CART_INTERACTION`) keine Sperre. Gleiche Prüflogik wie die Preisfunktion → nichts wird ohne gültigen
   Preis verkauft.

Gültige Warenkörbe: Ergebnis identisch zur bisherigen Funktion (bestehende V1/V2/V3-Vergleichstests).

## Prüfungen

- `node --test ops/shopify/master-release/*.test.mjs ops/shopify/*.test.mjs app/workshop/cart-priced-options.test.mjs app/workshop/customer-vector-logo-pricing.test.mjs app/workshop/checkout-design-image.test.mjs` → 75/76; der eine Fehler (`cart-edit-r15-theme.test.mjs`) fehlt `.local-data/liquidjs` und schlägt ohne die Änderung genauso fehl.
- Neu `einzelsperre.test.mjs` (5 Tests) mit der **echten** Eingabe aus dem Protokoll
  (`fixtures/shopify-log-20261115-0941.json`, Preisverträge per SHA-256 gegen das Protokoll geprüft;
  Vorschau-URL entfernt): bisher Abbruch, jetzt neue Position 19,99 €, alte zwei auf der Sperrliste;
  Checkout gesperrt (2 Hinweise), Warenkorb nicht; entfernte Größe; Position ohne Konfigurator-Angaben;
  gültige Warenkörbe identisch.
- Bestehende Sicherheitsprüfungen (manipulierte Optionen, Logos, Altangebote, Währung, kaputter Vertrag)
  bleiben streng: `cartTransformStrict` wirft wie bisher, die Position bekommt keinen Preis und steht auf
  der Sperrliste.
- **Offen (Release-Umgebung):** WASM-Build mit offizieller CLI und Anweisungszähler der echten 3-Positionen-
  Eingabe für beide Funktionen (Grenze 11 Mio.; aktiv 1,39 Mio. für diesen Aufruf). Kein Livenachweis.

## Veröffentlichung (Upload-Konto/Hauptagent, nach Freigabe von Chris)

Reihenfolge ist Pflicht, sonst wäre kurz ein Kauf zum Listenpreis möglich:

1. App-Version A: vollständiges Projekt (wie 08.11.), **nur** neue Erweiterung `gravuru-checkout-guard`
   hinzu; Preisfunktion unverändert. Kandidat ohne Release → Modulvergleich → Release.
2. Prüfung aktivieren (Checkout-Regeln oder `validationCreate` mit `blockOnFailure: true`), Readback.
   Test: Warenkorb mit gültiger Position → Checkout normal.
3. App-Version B: Preisfunktion mit Einzelsperre (Funktions-UID und Cart-Transform-Zuordnung bleiben).
   Test im Shop: Testposition „ohne Preis“ + gültige Position → Hinzufügen klappt, Checkout zeigt den
   Hinweis nur für die alte Position; nach Entfernen Checkout normal.
4. Rückweg: Version B → vorherige Version freigeben (bisheriges Verhalten). Prüfung kann aktiv bleiben.

## Go-live-Regel (bis B live ist)

Eine Größe kommt erst aus der Preisliste, wenn ihre Variante in Shopify gelöscht ist (Shopify nimmt sie
dann selbst aus allen Warenkörben).

## Nebenbefund

Checkout-Einstellungen zeigen auch bei `copy-line-item-from-bundles` (Fancy Product Designer, aktiv)
„Ab dem 30. April 2026 traten Fehler beim Checkout auf“. Nicht untersucht; vor Go-live prüfen, ob diese
FPD-Transformation noch gebraucht wird.
