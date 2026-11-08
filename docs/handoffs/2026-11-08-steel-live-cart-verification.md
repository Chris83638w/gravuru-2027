# Übergabe: Edelstahl-Türschilder, echter Shopify-Warenkorb

08.11.2026, Mika/Codex. Dauerhaft gesicherter Zwischenstand auf `dev/mika-stahl-shopify-preflight-20261108` / [PR #196](https://github.com/Chris83638w/gravuru-2027/pull/196); ein abschließender Logo-/Warenkorbnachweis folgt erst nach erfolgreicher tatsächlicher Prüfung. Verbindlicher Konfi-Schutz: [PRIO-KONFI.md](../../PRIO-KONFI.md). Designs bleiben unverändert und folgen dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Auftrag und bestätigter Live-Stand

Der Nutzer hat die Theme-Kopie selbst veröffentlicht und den echten Warenkorbtest mit verschiedenen Größen, Befestigungen und SVG-Logo beauftragt. **Keine Änderung am freigegebenen Konfi-Aufbau.** Produktoptionen sind bereits bestätigt: acht Katalogformen, 80 Größen, 404 zulässige Kombinationen, präzise Maßbezeichnungen, kein Foto, SVG-Logo 12,99 € je Logo, normale Türschilder als Startdesigngruppe. Es werden keine Produktduplikate angelegt.

Theme `190984126844` ist `MAIN`; Produkt `16190784438652` ist `ACTIVE`, ausschließlich Onlineshop-Publikation `291556688252`. [Veröffentlichungsbeleg](../reviews/2026-11-08-steel-shopify/live-cart-product-release.json). Ältere `DRAFT`-/Vorschau-Nachweise sind historisch und beschreiben nicht mehr den aktuellen Veröffentlichungsstatus.

## Nachgewiesen und offen

| Prüfung | Beobachtung | Status |
| --- | --- | --- |
| AB 12 × 8 cm / K00 | 19,99 € im echten Shopify-Warenkorb | Bestanden |
| RE 15 × 10 cm / KGL | 26,98 € im echten Shopify-Warenkorb | Preis bestanden; Textzuordnung inzwischen korrigiert und AB → RE live bestanden |
| Retro 2 / 9 × 6 cm / B02 / ein Logo | 17,48 € statt 30,47 € | Nicht bestanden; 12,99 € Logo-Aufpreis fehlen |
| Vollständiger Testwarenkorb | Drei synthetische Positionen; 64,45 € statt 77,44 € mit Logo-Aufpreis | Noch nicht bereinigt |
| Checkout / Bestellung | Keine bezahlte oder abgeschlossene Bestellung | Noch kein vollständiger Abnahmenachweis |

Echte Warenkorbbelege, Screenshots und Grenzen stehen im [Anschlussbericht](../reviews/2026-11-08-steel-shopify/integration-progress.md). Die Kundenansicht/Konfi-Bestellübersicht allein ist kein Preisnachweis für Shopify.

## Anschlussfehler und getrennte Korrekturen

**Text – erledigt:** Der Name „Test Eins“ wurde beim Formwechsel AB → RE in verschiedene Felder zerlegt. [PR #199](https://github.com/Chris83638w/gravuru-2027/pull/199), finaler Stand `32b81163e42dcddc239d700973d7aa9a6deac158`, korrigiert ausschließlich die semantische Textzuordnung. 65 gezielte Tests bestanden; Formwechsel hin/zurück und vorhandene Ein-/Mehrfeldregeln sind abgedeckt. Kein CSS-/Layoutumbau. Serverübernahme mit vorheriger gezielter Sicherung ist abgeschlossen; vorhandene Serverabweichungen erhalten, neuer Baustein `editor-1bea892b2cd23111.mjs`, alter Baustein behalten. [Serverbeleg](../reviews/2026-11-08-steel-shopify/text-fix-server-receipt.json). Der echte Nachtest über die Shopify-Produktseite bestätigt AB → RE mit vollständigem „Test Eins“ und unverändertem „Familie“: [Prüfbeleg](../reviews/2026-11-08-steel-shopify/text-switch-live-proof.json), [Screenshot](../reviews/2026-11-08-steel-shopify/text-switch-live-proof.png).

**Logo – noch offen, keine Korrektur veröffentlicht:** Der aktive Preisvertrag hat gemessene 18.557 Bytes, SHA-256 `76012d418f5c82b8f7c0c8339a0441f3fe41286aa903d287d84f00d169daf1ed`. Er enthält V2/Revision 2 mit 404 Varianten und V1/Revision 1 mit erneut 404 Varianten. [Authentischer Servermessbeleg](../reviews/2026-11-08-steel-shopify/pricing-function-input-diagnostic.json). Damit liegt der Vertrag oberhalb der [Shopify-Functions-Grenze von 10.000 Bytes](https://shopify.dev/docs/apps/build/metafields/metafield-limits); größere Werte erscheinen dort als `null`.

- Erster Erhaltungs-/Stagingversuch fehlgeschlagen: WASM-Asset fehlt, Theme-Bundle-Verzeichnisse ungültig. **Keine Veröffentlichung; aktive App-Version v1 unverändert. Altes inaktives Function-Artefakt `1199344418817` niemals veröffentlichen.**
- Aktueller und historischer Preisvertrag unterscheiden sich in **94 Preisen**. Erster rein lesender Plan mit bloß gemeinsam referenzierter Variantenliste hat wegen der 10.000-Byte-Grenze korrekt gestoppt; **keine Metafield-Mutation**.
- Neuer verlustfreier Plan erhält unveränderliche Revisionen und gruppiert nur die Preisabweichungen: echter Vertrag **18.557 → 9.944 Bytes**, **8.484 Preisvergleiche bestanden**. Neues passendes WASM noch ausstehend; Plan ist kein Nachweis für eine veröffentlichte Function oder korrekten Live-Warenkorb.
- Erhaltungsplan: acht App-Module, sieben unverändert. Veröffentlichten Ausgangsstand erhalten, keine pauschale App-/Theme-Ersetzung. Keine Preisänderungen oder gelöschte Historie als Abkürzung.
- Plesk-Sitzung abgelaufen; erneute Anmeldung wurde angefragt. Textkorrektur bleibt sicher übernommen und live bestanden.

## Sicherungen und Grenzen

- Vollständige ursprüngliche private Sicherung `/private/mika-steel-shopify-backup-20261108-v1` abgeschlossen und weiterhin erhalten: sechs SQLite-Sicherungen, Laufzeitarchiv und Einstiegspunkt. [Beleg](../reviews/2026-11-08-steel-shopify/server-backup-receipt.json).
- Zusätzlicher umfassender Sicherungsversuch `/private/mika-steel-shopify-backup-20261108-cart-fixes`: nach 120 Sekunden abgebrochen, **unvollständig**. Nicht als vollständige Sicherung behandeln und die ursprüngliche Sicherung nicht ersetzen.
- Gezielte Sicherung der Textdateien vor der Textkorrektur unter `/private/mika-steel-shopify-backup-20261108-cart-text-patch` bestätigt; [Sicherungs-/Übernahmebeleg mit Dateiprüfsummen](../reviews/2026-11-08-steel-shopify/text-fix-server-receipt.json). Diese gezielte Sicherung macht den zusätzlichen umfassenden Sicherungsversuch nicht nachträglich vollständig.
- Gesicherte veröffentlichte App-Ressourcen: `/private/mika-steel-theme-assets-20261108.json.gz`, **4.133.788 Bytes**, SHA-256 `07897a1e5b1662ad7bae901333783aae27e7b745199d24030baf4edfbcf31f24`. Enthält 14 exakt veröffentlichte Assets; 15. Asset aus dem Repository stimmt mit LF-Zeilenenden überein. Gezielte Asset-Sicherung, keine vollständige neue Serversicherung.
- Keine Datenbanken, Zugangsdaten, Sitzungsdaten oder echten Kundendaten im Repository. Warenkorbtexte enthalten ausschließlich synthetische Testnamen.
- PR #196 dokumentiert Optionen/Anschluss, PR #197 isoliert die Runtime, PR #198 den produktspezifischen Einstieg, PR #199 die Textzuordnung. Keine pauschale Zusammenführung fremder Galerie-Vorgeschichte; keine parallelen Schreibläufe auf die 404 Bindungen.

## Genau nächster Schritt

Textkorrektur und AB → RE sind live nachgewiesen. Nach erneuter Serveranmeldung neues WASM für den verlustfreien 9.944-Byte-Vertrag bauen, sämtliche Assets/Module im Staging prüfen und ausschließlich den neuen geprüften Stand kontrolliert freigeben. Altes Artefakt `1199344418817` niemals veröffentlichen. Danach Vertrag übernehmen und echten Retro-2-Warenkorb mit einem Logo auf **30,47 €** kontrollieren. Anschließend Checkout-Übergabe prüfen, eigene Testpositionen entfernen und Bericht abschließen. Der gemeinsame Konfi-Aufbau bleibt unverändert. Aktueller Zwischenstand: **veröffentlichtes Produkt, unveränderte aktive App-v1, noch keine vollständig nachgewiesene Verkaufsbereitschaft**.
