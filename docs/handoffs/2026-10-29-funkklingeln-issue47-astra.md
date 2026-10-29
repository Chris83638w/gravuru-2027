# Issue 47: Designressourcen und vollständige Modell-/Größenabdeckung

29.10.2026 · Codex/Astra · Vorbereitung auf eigenem Branch, keine Bereitstellung.

## Auftrag und Stand

Chris hat den Auftrag von Issue 46 auf [Issue 47](https://github.com/Chris83638w/gravuru-2027/issues/47) umgelenkt und ausdrücklich ergänzt: **alle Modelle in den verschiedenen Größen vorbereiten**. Daher ist AOSU nur der spätere erste Pilot, nicht die Grenze dieses Pakets.

- Branch: `dev/funkklingeln-issue47-ressourcen-20261029-astra`
- Basis: `main e48b7f3a281a8ae44be756a7f22776aedbb3184d`, einschließlich bereits integriertem Galerie-Linien-/Modellfilter.
- Codekorrektur: `7765162e9d399795341961dfc910a114b8572b77`; Regressionstest: `2f357f736f30083802eb5f68fd552dc7764e5184`.
- Nur die zwei Ressourcendateien aus dem älteren Ansatz übernommen. Keine Rückübernahme des alten Galerie-Filters und keine Änderung der Preis-/Positionslogik.
- Kein Main-Merge, keine Shopify-/Theme-/Metafeld-/Webhook-Schreibzugriffe, kein Neustart, kein Live-Schalter geändert. Linux-Testausgaben liegen ausschließlich in einem neuen privaten Prüfverzeichnis.
- GitHub meldet die über den Connector erstellten Commits als unsigned. Keine signierten Commits behauptet.

## Korrektur

Der Acryl-Host ersetzt Transportpfade im ausgelieferten JavaScript. Der wörtliche Pfad `/api/workshop/design-assets/` in `artworkFragment()` wurde dabei mit verändert. Dadurch passte das generierte Vergleichsfragment nicht mehr zum unveränderlichen Produktdokument.

Der kanonische Datenpfad wird jetzt aus festen Segmenten zusammengesetzt. Einzelmodule und Editor-Bündel liefern weiterhin exakt denselben Descriptor wie das gespeicherte Produkt. Der vorhandene authentifizierte Elternrahmen löst die Ressourcen auf. SHA-, Maße-, Seitennummern-, Bounds-, embeddedOnly- und Fragmentprüfungen bleiben streng; fremde URLs, veränderte IDs und eingeschleustes Markup werden weiter abgewiesen.

Der bereits in main vorhandene Filter (`shop-gallery-scope.mjs`) bleibt unverändert: gleiche Kataloglinie und exaktes Funkklingelmodell, keine Vermischung verschiedener Geräte. Alle drei Formate eines Modells bleiben erreichbar.

## Nachweise für alle bestehenden Modelle

| Prüfung | Ergebnis |
|---|---:|
| Modellgruppen | 42 |
| Hauptprodukte (je Hochformat, Querformat, länglich) | 126 |
| Varianten je Hauptprodukt | 120 |
| Shopify-Varianten / Preis- und Optionsabgleich | 15.120, keine Abweichungen |
| Konfigurator-Bindungen / Revisionen | 15.120 / 15.120 passend |
| Passende Importstände / Produktfreigaben | 126 / 126 |
| Ressourcen durch tatsächlich umgeschriebenes neues Bündel geprüft | 2.268 gültig, 0 ungültig |
| Variantenvergleich Original ↔ Galerieprojektion | 15.120, Preise und Geometrie identisch |
| Beide Positionen auf allen 126 Importdokumenten | 30.240 aufgelöste Geometrien |
| Geräteabbildung, gerätelokale Ausschnitte und Montagelöcher | aufrecht, passend verschoben |
| Eingabedokumente | unverändert |

Die drei Hauptprodukte haben bewusst eigene Profil-IDs, Namen und Startfarben/-formate. Die Prüfung vergleicht ihre Größen-, Preis-, Rahmen-, Befestigungs- und Ausschnittdefinitionen und prüft danach jedes Dokument einzeln. Eine anfängliche Gleichheitsprüfung des gesamten Profils wurde deshalb fachlich eingegrenzt; keine Produktdaten oder Sollgeometrien wurden angepasst.

Größen für diese 42 Modelle: **16×28 cm (49,99 €), 24×20 cm (59,99 €), 35×18 cm (69,99 €)**. Zwei Farben, vier Rahmen, fünf Befestigungen bleiben erhalten. Gegenposition ist Konfiguratorzustand und keine zusätzliche Shopify-Variante.

[42 Modelle mit ihren drei Shopify-Produkt-IDs](issue47-20261029/models-formats-42.csv) · [Alle 126 Produkte mit Handle, Status, Varianten, Konfigurator-ID, Revision und SHA](issue47-20261029/products-126.json).

### Zeitbezug und Grenzen

- Shopify-Gesamtlesung: **29.10., 09:44:42–09:50:12 UTC**, alle 126 Produkte und alle 15.120 Varianten ohne weitere Variantenseiten gelesen.
- Native lesende SQLite-Prüfung: **09:50:33–09:50:35 UTC**, aktuelle Heads/Revisionen, Auswahl, Preis, kanonischer Dokument-SHA, Freigabe und Importjournal geprüft. Keine Repository-Initialisierung/Migration.
- Rohmanifest auf dem Host SHA-256: `b5f592ee14419af648ee420e569badbe1ef9ca5099874b8c79809fdf5b1838d3`.
- Der aktuelle Katalog enthält exakt diese 42 Modelle / 126 Einträge; innerhalb dieses Katalogs fehlt kein Produkt. Die Zusatzgeräte unten sind separat.
- Gegenüber dem damaligen Issue-46-Zwischenstand ist „0 Bindungen“ überholt.
- ACTIVE bedeutet nicht veröffentlicht: **42 sind veröffentlicht, aber ohne customization_id; 84 sind noch unveröffentlicht und haben den passenden Marker.** Auf den geprüften 126 öffentlichen URLs kein neuer Konfi-Start; 84 leiten zur Startseite um. D8 zeigt den neuen Einstieg.
- Diese Code-/Datenprüfungen sind keine Kunden-, Warenkorb-, echte iPhone- oder Fertigungsabnahme.

## Zusätzliche Modelle und weitere Größen nicht ausgelassen

Die acht gelieferten Zusatz-PDFs wurden erneut gelesen und ihre Bilder/Geometrien separat extrahiert. Neben den bekannten Querformaten enthalten sie **acht weitere Gerätequellen**, die über identische Bildpixel-SHAs jeweils drei Größen verbinden:

| Gerätequellen | Hochformat | Querformat | Länglich |
|---|---|---|---|
| 3 | 17×30 cm / 59,99 € | 26×22 cm / 59,99 € | 38×20 cm / 76,99 € |
| 5 | 18×32 cm / 64,99 € | 34×24 cm / 69,99 € | 42×24 cm / 79,99 € |

[Vorbereitung aller acht Geräte mit 24 Größenzuordnungen](issue47-20261029/additional-models-8-size-plan.json) enthält Quelldatei und SHA, Originalmaße, Bildpositionen, äußere/innere Plattenkontur, alle roten Ausschnittkandidaten, freigegebenen Grundpreis und die Gegenpositionsregel.

**Noch nicht katalog-/verkaufsfertig:** genaue Marken/Modellcodes und eindeutige Zuordnung von Gerätebild zu Ausschnittgruppe dieser acht Quellen. Es wurden keine erfundenen Namen, SKUs, Shopify-IDs oder kompatiblen Ausschnitte eingetragen. Die Rohkonturen sind absichtlich als Kandidaten markiert, nicht als bestätigte Fertigungskonturen. In diesen PDFs ist kein extrahierbarer Modelltext vorhanden; die einzige benannte PDF-Ebene heißt „Ebene 1“. Die zwei Hochformatseiten wurden zusätzlich gerendert und angesehen; die Geräte liegen übereinander, die Standardansicht zeigt jeweils nur das zuletzt gezeichnete Gerät. Eine einzelne Seitenansicht zählt daher nicht als vollständige Modellliste.

Die 24 zusätzlichen Größenvorbereitungen dürfen nicht in die bereits vorhandenen 126 Produkte hineingezählt werden. Nach belegter Identität und Ausschnittzuordnung wären das weitere modellbezogene Hauptprodukte. Es wurde auch nicht pauschal jedes Gerät für alle neun Größen freigeschaltet.

## Tests und Linux

Gezielte Tests unter Windows **47/47**, 0 Fehler/Skips; Editor-Build erfolgreich. Danach dieselben Tests in einer neuen isolierten Linux-Kopie **47/47**, 0 Fehler/Skips; Build erfolgreich.

Linux: Node **v24.22.1**, Ergebnis **2026-10-29T10:04:37.357Z**. **871 versionierte App-/package-Dateien** zunächst gegen die Git-Blob-SHAs der Basis e48b7f3 geprüft und kopiert, danach ausschließlich Ressourcenkorrektur und neuer Test eingesetzt. Keine Live-Datenbank, kein Shopify-Token, kein Händlerprozess für diese Tests geöffnet.

Linux-Bündel: `editor-962b863bb5c25ce4.mjs`, 110 Module / 14 Styles, 1.175.001 Bytes, gzip 384.397 Bytes. Windows-Bündel: `editor-6dcbdabd8353dfd1.mjs`, 1.175.003 Bytes; kleine Quelldatei-Zeilenendeabweichung, kein Gleichheitsnachweis der Buildbytes behauptet. Der vollständige 126-Dokument-Ressourcen-/Preisvergleich und die 30.240 Positionsgeometrien wurden unter Windows mit diesem neuen Bündel ausgeführt.

Kein Volltestlauf behauptet. Die älteren Linux-1809-Ergebnisse anderer PRs werden nicht als Test dieser Änderung gezählt.

```sh
node --test app/configurator/variant-m/artwork-host-path.test.mjs app/configurator/variant-m/preview-resource.test.mjs app/workshop/shop-gallery-model.test.mjs app/workshop/shop-design-gallery.test.mjs app/configurator/variant-m/doorbell-selection.test.mjs app/configurator/variant-m/doorbell-state.test.mjs app/configurator/variant-m/doorbell-ui.test.mjs
node app/configurator/variant-m/build.mjs
```

[Prüfergebnisse](issue47-20261029/verification.json). Private vollständige Importdokumente und Datenbanken sind nicht im PR.

## Nächster Schritt und Rückweg

1. Claude prüft diesen gezielten Branch gegen den aktuellen main; der neue Linienfilter bleibt erhalten. Ein Merge/Deployment wird durch diesen Bericht nicht ausgeführt.
2. Bereitstellung nur mit Chris' ausdrücklichem Satz für den konkret geprüften Stand. Das in STATUS gemeldete Deployment von PR 42/43 ist eine frühere Freigabe, keine Freigabe dieser Korrektur.
3. Danach zunächst **ein** Pilotprodukt: AOSU Pro Hochformat 16124413084028. Vorher Zustand sichern; nur seinen fehlenden Marker auf die bestehende Konfigurator-ID setzen. Vorhandene 120 Bindungen und Preise nicht neu schreiben.
4. Desktop und echtes iPhone: Einstieg, korrekte Modellgalerie, alle drei Größen, beide Positionen, Farben/Rahmen/Befestigung, Ressourcen, Preis sowie Warenkorb mit Screenshot prüfen. Kein bezahlter Auftrag aus diesem Prüfschritt.
5. Erst nach bestandener Abnahme zwei weitere Pro-Formate (240 Varianten), danach übrige **123 Hauptprodukte / 14.760 Varianten** aus der vollständigen Matrix. Die bereits veröffentlichten 42 und unveröffentlichten 84 unterschiedlich behandeln. Zusatzgeräte separat nach belegter Identität.

App-Rückweg: vorherige App-Version wieder bereitstellen; keine Datenmigration erforderlich. Marker nur auf seinen exakt gesicherten Vorzustand zurücksetzen, zuvor Konflikte mit zwischenzeitlichen Änderungen prüfen. Neu veröffentlichte Produkte nur dann zurücknehmen, wenn sie durch diesen freigegebenen Schritt veröffentlicht wurden; bestehende 42 nicht pauschal deaktivieren. Keine Bindungen/Freigaben löschen oder globale Datenbank zurückspielen.

**Aktuell: vorbereitet und getestet, kein Livegang.**
