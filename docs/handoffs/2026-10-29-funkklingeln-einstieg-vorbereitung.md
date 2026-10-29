# Funkklingeln: Produktseiten-Einstiege und Veröffentlichung vorbereiten

29.10.2026 · Codex/Astra · Issue #46  
Auftrag: „Dann bereite die fehlenden Produktseiten-Einstiege und die Veröffentlichung der 84 Produkte vor. Stimme dich mit Claude in Issue 46 ab … Noch nichts live ändern.“

**Vorbereitung abgeschlossen, keine Live-Ausführung.** Eigener Branch `dev/funkklingeln-einstieg-vorbereitung-20261029-astra`, auf dem vorigen Gegencheck `672e289` und Codebasis `2468bd1`. PR #49 ist bereits live; dieses Paket veröffentlicht nichts.

## Konkreter Plan

Frische lesende Admin-Abfragen vom **29.10.2026, ca. 12:49 UTC** bestätigen:

| Änderung | Anzahl | Bestehendes Verhalten |
| --- | ---: | --- |
| Fehlendes `custom.customization_id` setzen | 42 | Jeweils tatsächliche `cfg_…`-ID aus geprüfter Bindung |
| Richtige vorhandene Metafelder behalten | 84 | Kein Überschreiben |
| Im Onlineshop veröffentlichen | 84 | 42 Querformate + 42 längliche Formate |
| Bereits veröffentlichte Produkte behalten | 42 | Kein Statuswechsel |
| Varianten / Preise / SKU / Optionen / Positionen ändern | 0 | Alle 15.120 Varianten bleiben erhalten |
| Theme / Produktvorlage / App / Bindung ändern | 0 | Vorhandenen Einstieg nutzen |

Zielkanal frisch gelesen: **Online Store**, `gid://shopify/Publication/291556688252`. Keine Veröffentlichung auf Shop, POS, Google oder Facebook. `ACTIVE` und `publishedOnPublication` wurden getrennt geprüft.

[Ausführbarer Offline-Probelauf mit allen 126 Zeilen und vorbereiteten API-Variablen](funkklingeln-einstieg-20261029/release-plan.json). Das ist ein Prüfartefakt, **keine Freigabe und kein Live-Aufruf**.

## Bestehender D8-Anschluss, ohne Themeumbau

MAIN-Theme `185833718140` (`gravuru-shopify-theme/production`) wurde erneut nur gelesen:

- `layout/theme.liquid` enthält die Footer-Section-Gruppe; MD5 `7319c1e110921b00f2b1483e643d8ed9`.
- `sections/footer-group.json → custom_liquid_xCyNJV` ist eingeschaltet und in der Reihenfolge enthalten; Datei-MD5 `b77cf71573dbcebf8d66d0c6d609cf08`.
- Der bestehende Guard `request.page_type == 'product' and product.metafields.custom.customization_id.value != blank` erzeugt `#gravuru-konfi` und lädt `/apps/konfigurator/shop-embed.mjs`.
- Das vorhandene Modul setzt den Personalisierungsbutton an das Kaufformular, übergibt die ausgewählte Shopify-Variante, schützt vor einem zweiten Button und blendet die direkten Kaufbuttons dieses Produkts aus. Der Server löst Produkt/Variante über die bestehende Registry auf.
- Die beiden tatsächlich verwendeten Vorlagen `product.json` und `product.funkklingeln-2027.json` besitzen aktive Kaufblöcke; kein Vorlagenwechsel nötig. MD5: `6dfa441f058120a62936bf9c231408b4` / `a48cafbf0684dccfdf1fba2e0358742e`.
- D8 ist weiterhin veröffentlicht, mit Metafeld `4100000` und Sondervorlage `test-temp-svenja-grid`. **Diesen Wert und diese Sondervorlage nicht kopieren.** D8s zusätzlicher statischer Liquid-Link muss nicht dupliziert werden.

Ein gefülltes Metafeld ist nur der Einstiegsschalter. Es ersetzt keine Bindungs-/Revisionsprüfung. Der vorhandene Embed-Code wird nicht neu entwickelt. Auch `stage-shop-entry.mjs` wird **nicht** erneut ausgeführt: App-Proxy und Theme-Anschluss existieren bereits.

Grenze: Die Standardvorlagen enthalten weiterhin ihre Variantenwahl. Dieses Paket ändert deren Darstellung nicht. Die Optionen im Konfigurator bleiben vollständig erhalten. Falls Claude die äußeren Optionsblöcke separat ändern soll, muss das als eigener überprüfter Theme-Schritt behandelt werden.

## Dateien und Wiederholung

- `scripts/prepare-doorbell-entry-release.mjs`: reiner Offline-Planer, ergänzt die bereits in `prepare-doorbell-shopify.mjs` vorgesehenen Schritte `activateAfterBinding` und `publishAfterVerification`. Kein Netzwerkclient, keine Zugangsdaten, kein `--apply`, kein neuer Bindingwriter.
- `scripts/prepare-doorbell-entry-release.test.mjs`: acht Tests.
- [catalog.json](funkklingeln-einstieg-20261029/catalog.json): 126 überprüfte Zuordnungen aus dem vollständigen Gegencheck. Herkunft: Server-Bindungsprüfung 12:29 UTC und Shopify-Vollabgleich 12:23–12:28 UTC; nicht als neue native Datenbankprüfung ausgegeben.
- [snapshot.json](funkklingeln-einstieg-20261029/snapshot.json): frischer Produkt-/Metafeld-/Publikationsstand, inklusive bestehender Metafeld-IDs und Compare-Digests.
- [theme.json](funkklingeln-einstieg-20261029/theme.json): auf die Einstiegsvoraussetzungen reduzierte lesende Theme-Belege.
- [release-plan.json](funkklingeln-einstieg-20261029/release-plan.json): Phasen, unveränderte Ausgangswerte, SHA-Referenzen, 42 Metafeldwerte, 84 Publikationsvariablen, Rückwegkandidaten.

Im Repository, Node 24:

```sh
node --test scripts/prepare-doorbell-entry-release.test.mjs
node scripts/prepare-doorbell-entry-release.mjs \
  --catalog docs/handoffs/funkklingeln-einstieg-20261029/catalog.json \
  --snapshot docs/handoffs/funkklingeln-einstieg-20261029/snapshot.json \
  --theme docs/handoffs/funkklingeln-einstieg-20261029/theme.json \
  --out doorbell-entry-preview.json
node --test --test-name-pattern='shop embed|start ticket' app/workshop/shop-entry-client.test.mjs
```

Ausgabedatei muss neu sein, bestehende Dateien werden nicht überschrieben. Erwartete Zähler: `createMarkers:42, keepMarkers:84, publish:84, keepPublished:42, liveWrites:0, readyForLive:false`.

## Späterer Ablauf – heute nicht ausführen

**Voraussetzungen:** Claudes Teil C / PR #54 samt Bestellübernahme und Fertigungsdateien abgenommen; sichtbarer Desktop-/Mobil-Editor bestätigt; Chris' ausdrückliche Live-Freigabe im ausführenden Chat. Unmittelbar davor Native-Revisionen/Dokument-SHA/120 Bindungen je Produkt über die vorhandenen `doorbell-shop-bind`-/Pilotwege nur lesend erneut prüfen, Shopify-Snapshot und Theme-Belege auffrischen und den Plan neu erzeugen. Geplante zukünftige Publikationen ebenfalls prüfen; die aktuelle Momentaufnahme allein erteilt keine Freigabe zum Überschreiben fremder Terminplanung.

1. **Genau ein veröffentlichtes Pilotprodukt:** AOSU Pro Hochformat `16124413084028`. Ein fehlendes Metafeld setzen, noch keine neue Veröffentlichung. Wert: `cfg_c3ee3fcf-bf87-42e3-af2a-98b680cdb576`; `compareDigest:null` schützt davor, ein inzwischen angelegtes Metafeld zu überschreiben.
2. **Anhalten und abnehmen:** genau ein Einstieg, korrekter Modell-/Formatstart, alle Optionen und Gegenposition, Preis, Desktop/Mobil, Screenshot, Warenkorb/Bearbeiten und Werkstatt-/Produktionsweg. Diese echten Tests wurden heute nicht ausgeführt.
3. **Zwei weitere Formate desselben Piloten:** `16182701621628` und `16182702211452`, vorhandene Metafelder behalten, beide im Onlineshop veröffentlichen. Formatstart, Wechsel und Rückweg prüfen.
4. **Übrige 41 Modelle:** 41 Metafelder (maximal 25 je Request, aktuell 25 + 16) und 82 Veröffentlichungen. Serienweise mit Erfolgseintrag je Aktion und sofortigem Readback, keine unkontrollierte Wiederholung.
5. **Abschluss:** 126 korrekte Metafelder, 126 im Onlineshop veröffentlichte Produkte, 126 Produktseiten mit neuem Einstieg; weiterhin dieselben 15.120 Varianten/Preise/SKU/Bindungen. Produktseiten dürfen nicht nur mit HTTP 200 auf der Startseite landen.

Die vorbereiteten GraphQL-Operationen liegen im Plan. Typen und Parameter wurden über das aktuelle Shopify-Schema gelesen. Der separate Connector-Validator meldete **„validation skipped“**; deshalb wird keine erfolgreich ausgeführte Mutationsvalidierung behauptet und keine Mutation zur Probe abgesendet. [Shopify: metafieldsSet](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet) unterstützt Compare-and-set sowie höchstens 25 Metafelder pro atomarem Request; [publishablePublish](https://shopify.dev/docs/api/admin-graphql/latest/mutations/publishablePublish) adressiert den ausgewählten Verkaufskanal.

## Rückweg

Nicht den gesamten Plan rückwärts ausführen. Vor jeder echten Aktion den Ausgangswert sichern und danach erfolgreiche Antwort, Metafeld-ID/-Digest bzw. Publikation im Ausführungsjournal festhalten.

- Zuerst nur die Produkte aus diesem Lauf im Onlineshop zurückziehen, die zuvor unveröffentlicht waren.
- Danach nur die Metafelder entfernen, die dieser Lauf neu angelegt hat. Vorher ID, aktuellen Wert und Digest gegen das Journal prüfen. Bei Abweichung stoppen.
- Bestehende 84 Metafelder und 42 Veröffentlichungen nie entfernen. Keine Produkte, Varianten, Bindungen oder Gestaltungen löschen.
- `metafieldsDelete` und Publikationsmutationen besitzen keinen gleichwertigen bedingten Digest-Schutz. Deshalb ein exklusives Operatorfenster vereinbaren; bei parallelen Änderungen nicht automatisch zurückrollen.
- Jeder GraphQL-Fehler oder `userErrors` stoppt den nächsten Schritt. Ein Request-Erfolg ohne Readback gilt nicht als Abschluss.

## Prüfungen und Grenzen

- **8/8 neue Tests bestanden:** kompletter Umfang, gestufter Pilot, Idempotenz, fehlendes Pilot-Geschwistermetafeld, fremde/leer existierende Metafelder, unvollständige Bindungen, falscher Shop/Kanal, deaktivierter Theme-Guard, fehlende Vorlage und verbotener Apply-Aufruf.
- **5/5 vorhandene Einstiegstests bestanden**, exakt aus `main 2468bd1`: eigener Button/Variante, kein Doppelbutton, Schutz direkter Kaufbuttons, Startticket und Fehler-/Seitenfallback.
- Zusätzlich die bestehenden `pageConfig`-/`startHref`-Funktionen offline mit allen **126 realen Produktdatensätzen / 15.120 Varianten-IDs** auf richtige Produkt-/Varianten-/Rücksprungzuordnung geprüft; 126 Fremdvarianten fallen auf die gültige Startvariante zurück.
- Kein neuer Full-Build erforderlich: keine Runtime-/Theme-Datei geändert. Kein Live-Render-/Bestellnachweis durch diese synthetischen Tests.
- Acht zusätzliche unidentifizierte Geräte/24 Größen-Zuordnungen bleiben außerhalb dieses vorbereiteten 126er-Umfangs gesperrt.

## Abstimmung mit Claude

[Vorbereitung in Issue #46 angekündigt](https://github.com/Chris83638w/gravuru-2027/issues/46#issuecomment-6497065778); nach Paralleländerungen, Teil C und manueller Sichtprüfung gefragt. Zum letzten Abruf noch keine Antwort auf diese neue Anfrage.

Issue #48 verweist inzwischen auf **PR #54**, Head `e1e796f9a3b75a6c2a6f4c8ae2a774732c846e5f`, offen als Entwurf, nicht gemergt. Teil C ist damit nicht als live/fertig behandelt. Zuständigkeit: Claude liefert C- und Sichtprüfungsnachweis; Codex liefert dieses überprüfbare Anschluss-/Veröffentlichungspaket. Die abschließende Übergabe wird direkt in Issue #46 gepostet. **Keine Shopify-, Theme-, App- oder Serveränderung durch dieses Paket.**
