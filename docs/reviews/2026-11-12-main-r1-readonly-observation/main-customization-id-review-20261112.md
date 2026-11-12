# Befund 3: historischer Main-Alias und neue cfg-IDs

12.11.2026 · enger rein lesender Review zu [Claude #1686828889696](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6828889696), Empfang `b0acb340`. Keine Tests, App-/Produkt-/Serveränderung oder GitHub-Schreibaktion.

**Ergebnis: Beide Werte sind mit dem belegten Einstieg vereinbar; kein Fix erforderlich.** Der Main-Alias wird im aktuellen belegten Shopify-Einstieg nicht zu einer cfg-ID aufgelöst. Das Metafeld schaltet dort nur den Einstieg sichtbar. Die eigentliche Zuordnung erfolgt ausschließlich über die Shopify-Produkt-/Varianten-ID und die native Registry. Main daher unverändert lassen; für sechs neue Produkte weiterhin die tatsächlich entstandene native cfg-ID verwenden. Keine pauschale Angleichung der Metafelder.

## Tatsächliche Quellen

- Aktueller Operatorbeleg `claude-b0acb340-r1/kompakt-serverwerte.json:14`: Main `16190784602492`, Vorlage `konfi`, Metafeld `katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a`. `ro-ausgang.mjs:57–61` liest es über den vorhandenen Main-Gateway aus `protectedProduct.customization.value`. Das ist dieselbe Zeichenfolge wie im unabhängigen Theme-/Produktlesebeleg vom 11.11.; keine neue Differenz zwischen diesen Beobachtungen.
- `work/restabschluss/main-shop-entry-theme-evidence.json`: Theme `190984126844`, Rolle MAIN, gelesen am 11.11. 20:38 UTC. Unter `sections/footer-group.json` (Belegzeilen 36–44) wird nur `customization_id.value != blank` geprüft. Das ausgegebene JSON enthält `productId`, `variantId`, `variants`, `back`; keinen Metafeldwert. Unter `templates/product.konfi.json` (48–58) wird für den allgemeinen Knopf ebenfalls nur Nichtleer geprüft; sein Link lautet `/apps/konfigurator/start?product=…&variant=…&back=…`.
- Die Vorlage enthält eine zusätzliche **ausschließlich für Stahlprodukt `16190784438652` und dessen exakten Stahlalias** geltende R15-Darstellungswahl. Sie betrifft weder das Hauptacrylprodukt noch sechs neue Kleinprodukte. Diese historische Ausnahme begründet keine Pflicht, den Acrylalias auf andere Produkte zu kopieren.

## Auflösung und Schutz im f853-Quellstand

Die folgenden drei Appdateien sind im gelesenen Integrationcheckout gegenüber `f85390b` unverändert:

1. `app/workshop/ui/shop-embed.mjs:83–101`: `pageConfig` übernimmt numerische Shopify-IDs, `startHref` erzeugt `product`/`variant`/`back`. Keine Alias-/cfg-Auflösung aus `customization_id`.
2. `app/workshop/shop-entry.mjs:299–321`: `startParams` liest die beiden Shopify-IDs; vor dem Registryzugriff läuft die native App-Proxy-Prüfung (`:313`, Verifier `:94`). `resolve` (`:114–123`) verlangt exakt einen Treffer über alle Stores und prüft Shop, Mandant, Store, Produkt- und Varianten-ID. `modelFor`/`checkedModel` (`:145–156`) prüfen cfg-ID/Revision des tatsächlich gebundenen Modells sowie die bestehende Katalogfreigabe (`:125–134`). Ein beliebiger nichtleerer Metafeldwert umgeht diese Prüfungen nicht. Der optionale Parameter `config` ist ein geschützter Bearbeitungsverweis auf eine Kundengestaltung, kein Metafeld-/Produktalias.
3. `app/workshop/shop-product-binding-store.mjs:89–92,330–333`: aktiven Variantenhead unter Mandant/Shop lesen und ausdrücklich passende Shopify-Produkt-ID verlangen. Fehlende oder fremde Zuordnung führt zu `shop_binding_active_not_found`. Die cfg-ID und feste Produktrevision stammen aus dem gespeicherten Binding.

## Schreibschutz der beiden Operatorwege

**Main:** `ops/issue230-main-shop-binding-20261112/gateways.mjs:8,31` liest und bewahrt das Metafeld als `protectedProduct.customization`. `main-operator.mjs:39,53–54` erhält den vollständigen Commerce-Stand; nur die vorgesehenen Variantenpreise/-labels und das getrennte Preisfeld werden geändert. Vor-/Nachvergleich und Abschluss (`:99–100,127–138,155`) enthalten weiter den unveränderten Alias. Keine Mainmutation schreibt `custom.customization_id`. „Geschützt“ bedeutet hier: nicht im Änderungsumfang, Drift wird vom vorhandenen Vergleich erkannt; keine zusätzliche serverweite Metafeldsperre behauptet.

**Sechs neue DRAFTs:** `six-drafts.mjs:37–55` übernimmt `record.id` erst aus dem tatsächlichen nativen execute-Ergebnis mit Plan-/Dokument-/Identitätsvergleich. `:118–126` prüft und persistiert native ID-Bindings, liest Preise und Katalogfreigabe zurück und ruft erst danach `ensureEntry` auf. `shopify-steps.mjs:37–48` setzt `templateSuffix:konfi` nur aus leerem Wert, das Metafeld nur aus fehlendem Wert mit `compareDigest:null`; ein vorhandener anderer Wert wird als Konflikt abgewiesen. Anschließend vollständiger Readback (`six-drafts.mjs:127–128`). Das entspricht außerdem der älteren nativen Vorlage `scripts/prepare-doorbell-shopify.mjs:106` (`valueFrom: verified-server-import.entry.id`, cfg-Pattern). Der Kopienlauf dokumentiert diese Reihenfolge synthetisch; er ist kein Live-Nachweis der noch nicht angelegten sechs Produkte.

## Beleggrenzen und Pins

Der Themeauszug ist der tatsächliche vorhandene Export vom 11.11., kein neuer Themeabruf. Der heutige Operatorbeleg bestätigt den Mainwert, exportiert aber nicht erneut alle Theme-Dateien. Keine neue Kontrolle allein wegen identischer Metafeldwerte erforderlich; unbekannte andere historische Verbraucher werden durch diesen engen Einstiegsreview nicht bewertet. Der volle private R1-Lesebeleg wurde hier nicht geliefert oder bytegeprüft.

- Themebeleg SHA256: `942927337524926294f28b51470871047c395bb92ed51c48671825d11226facb`.
- Empfang `kompakt-serverwerte.json`: `8842e6d7b4fb0fba7a453f5e09bff3cd9c4681dcfb9061467c979b8b5635d93e`.
- Empfang `ro-ausgang.mjs`: `9588a042df3d98c457c630a74862a75e2160a8eb342b5236c8c6da9bbab14fcb`.

Kein sachlicher Grund für eine Main-Metafeldänderung, eine zusätzliche Nutzerentscheidung oder eine neue Testsuite aus Befund 3.
