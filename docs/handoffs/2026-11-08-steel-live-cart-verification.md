# Übergabe: Edelstahl-Türschilder – Warenkorbprüfung bestanden

08.11.2026, Mika/Codex. Branch `dev/mika-stahl-shopify-preflight-20261108`, [PR #196](https://github.com/Chris83638w/gravuru-2027/pull/196). Verbindlicher Konfi-Schutz: [PRIO-KONFI.md](../../PRIO-KONFI.md). Designs bleiben unverändert und folgen dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Aktueller Stand

Der Nutzer hat das Theme selbst veröffentlicht und echte Warenkorbtests mit Größen, Befestigungen und SVG-Logo beauftragt. Der Konfi-Aufbau bleibt unverändert. Bestätigt sind acht Katalogformen, 80 Größen, 404 Kombinationen, genaue Maße, kein Foto und SVG-Logos für 12,99 € je Logo. Sieben sichtbare Formschaltflächen fassen EL/OV als Oval zusammen; keine Form entfernt.

Theme `190984126844` ist MAIN, Produkt `16190784438652` ACTIVE und im Onlineshop veröffentlicht. Aktive App-Version: `gravuru-2027-steel-pricing-input-20261108-v2`, ID `1199363391489`. Keine Produktduplikate.

## Echte Warenkorbabnahme

| Test | Tatsächlich geprüft |
| --- | ---: |
| Abgerundetes Rechteck, 12 × 8 cm, ohne Bohrung, Test Eins | 19,99 € |
| Rechteck, 15 × 10 cm, selbstklebend für glatte Flächen, Test Zwei | 26,98 € |
| Retro 2, 9 × 6 cm, 2 Bohrlöcher und SVG-Logo, Test Drei | 30,47 € |
| Gesamt, jeweils ein Stück | **77,44 €** |
| Logo-Position auf zwei Stück / Gesamt | 60,94 € / 107,91 € |
| Wieder ein Stück, danach Neuladen | **77,44 €** |

Die vollständigen Namen und der zweite Text „Familie“ bleiben beim Formwechsel erhalten. Alle drei eigenen Testpositionen gezielt entfernt; leerer Warenkorb sichtbar. Keine Bestellung ausgelöst oder bezahlt. [Ergebnis](../reviews/2026-11-08-steel-shopify/cart-retest-result.json), [Screenshot](../reviews/2026-11-08-steel-shopify/cart-retest-final-viewport.png), [Bereinigung](../reviews/2026-11-08-steel-shopify/cart-retest-cleanup-sanitized.json).

## Gezielte Reparaturen und Sicherung

- Textzuordnung: [PR #199](https://github.com/Chris83638w/gravuru-2027/pull/199), Code `32b81163e42dcddc239d700973d7aa9a6deac158`. 65 Tests und Live-Formwechsel bestanden; gezielte Sicherung vor Übernahme. Kein Layoutumbau.
- Logo-Aufpreis: [PR #200](https://github.com/Chris83638w/gravuru-2027/pull/200), Code `2abfd92ff8b12b5f8ff300cbc2bdf23788f1d54b`, finale Dokumentation `4d2f5bec14e685c7e39c29befc28bf757aba00a9`. Preisvertrag verlustfrei 18.557 → 2.318 Bytes; alle 404 aktuellen Preise und 94 historischen Preisabweichungen erhalten. 14.140 Preisvergleiche bestanden. Nach vollständiger privater Vertragsicherung genau eine Mutation mit Versionsvergleich und Rückleseprüfung.
- Alle acht App-Module geprüft, sieben unverändert. Alle 21 Theme-Dateien bytegleich. Nur Function-WASM und Preisabfrage `jsonValue` → `value` geändert; Scopes, Proxy und URLs unverändert.
- Finales WASM: 20.977 Bytes, SHA-256 `a5c59354755dcf73bdeca8006134847549d8712f70277634fab405db93532da2`.
- Vollständige ursprüngliche Sicherung `/private/mika-steel-shopify-backup-20261108-v1` erhalten. Zusätzlicher Vollsicherungsversuch `cart-fixes` bleibt **unvollständig**. Gezielte Textdatei-, App-Asset- und Preisvertragssicherungen abgeschlossen. Letztere liegt unter `/private/mika-steel-price-repair-20261108`; Sicherungs-SHA-256 `5a6a393bd5a3f9a7130c0d55e2b35a8f1ef63ef5d49dc4e22d5772585fd5809a`.
- Keine Zugangsdaten, Preisrohdateien, Sitzungen, Datenbanken oder echten Kundendaten im Repository. Nur synthetische Testdaten.

[Ausführlicher Anschlussbericht mit Sicherungs- und Versionsnachweisen](../reviews/2026-11-08-steel-shopify/integration-progress.md). Rücknahme muss Preisvertrag und passende Function gemeinsam berücksichtigen; die alte Function versteht den kompakten Vertrag nicht. Altes inaktives Function-only-Artefakt `1199344418817` niemals veröffentlichen.

## Offene Grenzen und nächster Schritt

- Zehn gemischte Positionen bestehen lokal mit 8.937.352 Instruktionen. **20 unterschiedliche Positionen überschreiten das Shopify-Function-Budget von 11 Millionen.** Bei noch größeren Warenkörben ist auch die Eingabegröße zu hoch. Keine allgemeine Freigabe für große gemischte Warenkörbe; keine neue Kundenbegrenzung eingebaut.
- Mengen 20/50/99 derselben Konfiguration in einer Position sind lokal bestanden; Menge 2 live bestanden. Stückzahl ist nicht Zeilenzahl.
- SVG-Upload, Vorschau und Abrechnung funktionieren im direkten Konfi-Einstieg. Die automatisierte Dateiauswahl im doppelt eingebetteten Shopify-Fenster lief in einen Tool-Timeout; kein erwiesener Kundenfehler. Dieser Einbettungsfall bleibt getrennt zu prüfen.
- Warenkorb-/Preisabnahme bestanden. Checkout, Zahlung, Bestellverarbeitung und Werkstatt-/Produktionsfreigabe sind damit **nicht** vollständig abgenommen.

Nächster Schritt: Einbettungsprüfung und Bestell-/Produktionsstrecke getrennt abnehmen; große gemischte Warenkörbe gezielt optimieren. Den bestätigten Konfi-Aufbau nicht ändern. Der frühere Zwischenstand mit 17,48 € statt 30,47 €, App-v1, 9.944-Byte-Entwurf und nötiger Plesk-Neuanmeldung ist überholt; Git-Historie bleibt erhalten.

Abschlussmeldung: [Issue #168](https://github.com/Chris83638w/gravuru-2027/issues/168#issuecomment-6718967521).
