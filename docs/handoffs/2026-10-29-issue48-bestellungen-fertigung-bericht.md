# Issue #48 · Teil C · Bestellungen, Fertigung und Kundenbild

Stand: Codex/Astra, 29.10.2026, Branch dev/konfi-bestellungen-fertigung-20261029-astra, [Entwurfs-PR #54](https://github.com/Chris83638w/gravuru-2027/pull/54). Lokal geprüft, nicht installiert. Auftrag: Issue #48 Nachrichten 4–5; aktuelle Reihenfolge nach Nachrichten 6–11: C → D → E. Teil B liegt fertig als Entwurfs-PR #55 vor.

## Ursachen und Korrektur

Die bezahlten Testbestellungen #1027/#1028 sind im Acryl-Speicher angenommen (test-paid-event-recorded), ohne abgelehnte Positionen; der alte Bestellindex las ausschließlich Legacy. Beide Stände haben kein Fertigungsprofil. Das bleibt eine fehlende Produktionsfreigabe, verhindert aber nicht den getrennten technischen Prüfexport.

Die Originalpakete scheiterten zusätzlich in acrylicArtwork → validateProductDesign mit „Bitte eine vorhandene Schriftart auswählen“. Die vorhandene Profilschrift ist in den eingefrorenen Konfiguratorquellen enthalten, fehlt aber in der ursprünglichen Produkt-Schriftliste. Die zweite Validierung berücksichtigt jetzt ausschließlich diese hashgeprüften gespeicherten Quellen. Unbekannte Schriften und falsche Pakethashes bleiben gesperrt.

Der neue gemeinsame Bestellindex hält Stores, Sitzung/CSRF und alle Aktionen getrennt. Die bestehende Begrenzung auf die letzten 200 Positionen je Store bleibt; keine Vollhistorien-Paginierung behauptet. Die abschließende Browserprüfung fand außerdem einen fehlenden statischen Modulpfad für order-store-context.mjs. Die Server-Freigabeliste ist korrigiert; ein echter HTTP-Test lädt nun den gesamten Importgraphen der Bestelloberfläche.

## Originalbestellungen: sichtbare lokale Prüfung

Die beiden Originalpakete und ihre gespeicherten Metadaten wurden ausschließlich lesend aus dem bestehenden Speicher bezogen und privat außerhalb des Repos abgelegt. Keine Live-DB, Bestellung, Freigabe oder Datei verändert. Die Pakethashes wurden vor der Verarbeitung geprüft:

| Bestellung | SHA-256 des Originalpakets | Ergebnis |
| --- | --- | --- |
| #1027 | 7ab5758f72b25e8823e24b03404455b1972e56b21810a45f1f48d38dd21cfc1e | Originaldateien im UI-Download bytegleich |
| #1028 | b0ad306fa51f264afb7471d15c37bde09b5257134fb593c410f1a6612983accf | Originaldateien im UI-Download bytegleich |

Die echte lokale Bestelloberfläche zeigt beide Kopien. Je Bestellung wurde der Prüfstand geöffnet, die Vektorausgabe erzeugt und „Alle Daten“ über den normalen Downloadknopf geladen. Die tatsächlich heruntergeladenen ZIPs wurden erneut geöffnet: Gravur-PDF und Kontur-PDF jeweils **120 × 80 mm**, zwei Löcher Ø 4 mm bei **(6,40)/(114,40)**. Gravur-PDF: #1027 55, #1028 32 Vektorzeichnungen; **keine eingebetteten Rasterbilder und keine Fontobjekte**. SVG: 59 bzw. 35 Pfade, keine Text-/Bildknoten. Die Originalquellen enthalten Leuchtturm und Haus als Vektoren. Die technische Ausgabe ist weiterhin **nicht zur Fertigung freigegeben**.

Nachweise: [Prüfwerte](issue48-bestellungen-20261029/originalbestellungen-pruefung.json), [Bestellansicht](issue48-bestellungen-20261029/bestellungen-originalkopie.png), [#1027 Ausgabe](issue48-bestellungen-20261029/1027-ausgabe-erfolgreich.png), [#1028 Ausgabe](issue48-bestellungen-20261029/1028-ausgabe-erfolgreich.png), [#1027 PDF](issue48-bestellungen-20261029/1027-gravur-pdf-1zu1.png), [#1028 PDF](issue48-bestellungen-20261029/1028-gravur-pdf-1zu1.png). Nur die ausdrücklich angeforderten Testbestellungsnachweise liegen im Repo; keine Originalpakete, Datenbanken, Schriftdateien oder Zugriffstoken.

Die spätere Entscheidung aus Nachricht 10 (vollständiges Motiv auch im Bohrloch exportieren) gehört zur nachfolgenden Änderung D. Die C-Nachweise sind kein Beleg, dass diese neue Exportregel schon umgesetzt wäre.

## Kundenbild, E-Mail und Checkout

Das bestehende verlustfreie 1600-Pixel-PNG wird am gespeicherten Offer gebunden. _gravuru_bild ist eine stabile HMAC-Bildadresse mit Shop-/Store-/Offer-Bindung und Hashprüfung; ausschließlich das PNG ist zugänglich, keine Originalmedien, Prüfpakete oder Editoranmeldung. Ältere Browser und eingefrorene Legacy-Stores behalten den kompatiblen Rückfall. Der neue PNG-Upload wird nicht durch einen späteren optionalen JPG-Render ersetzt.

_gravuru_bearbeiten ersetzt die öffentliche Eigenschaft Bearbeiten; der normale Link unter dem Warenkorbbild bleibt. Historische Shopify-Positionen unverändert.

Der tatsächliche [Liquid-Bildbaustein](../../ops/shopify/notifications/gravuru-bestellbestaetigung-bild.liquid) wurde lokal mit LiquidJS 10.21.1 gerendert: gültiges PNG sowie fehlender, fremder und JPG-Bildwert **4/4 geprüft**. [E-Mail-Vorschau #1028](issue48-bestellungen-20261029/1028-email-bildbaustein.png): Bild aus der eingefrorenen Originalgestaltung rekonstruiert, nur in der lokalen Vorschau als neue PNG-Eigenschaft eingesetzt. Die historische Bestellung enthält weiterhin nur ihr altes JPG. Kein Mailversand und keine geänderte Shopify-Benachrichtigung.

Checkout-Zusatz ergänzt den gelesenen Preisprogramm-Blob a1a5146136c6d1f11ea93b07b5c8f64a3f5ab7d7 (gravuru-shopify) ausschließlich um eine Bildoperation. **Lokaler WASM-Build erfolgreich**, Shopify CLI 4.9.3 / Function-Paket 2.0.1 / API-Schema 2026-07. 5301 Bytes, SHA-256 1d064be2e70acac229970e77299797c356740d564de7a2d6e45d4246776afd68. Echter Function-Runner: ohne Preisvertrag nur Bild; gültiger Preisvertrag unverändert und genau ein lineUpdate; fremdes Bild abgewiesen. [Maschinenlesbarer Nachweis](../../ops/shopify/checkout-image/local-wasm-proof.json). Keine Function installiert oder aktiviert, kein D8-Preisvertrag verändert.

## Tests und Grenzen

Windows-Vollauf vor den letzten kleinen Abschlusskorrekturen: **1824 gesamt / 1819 bestanden / 0 Fehler / 5 übersprungen**, 1167,934 s. Aufruf: node --import ./scripts/test-portability/full-tests-python-windows.mjs --test --test-concurrency=4 mit allen Tests unter app/configurator/variant-m und app/workshop, vorhandene private Windows-Python-Umgebung.

Abschließend **52/52 gezielte Tests grün**, inklusive echtem HTTP-Modulgraph, eingefrorener Profilschrift bis Vektorpfad, PNG-Bytegleichheit nach Entwurfsänderung, falschem Hash/Shop/Origin, getrennten Stores/CSRF, Legacy-Kompatibilität, sicherer Warenkorb-Ersetzung und unverändertem Preisvertrag. Build erfolgreich. Diese Abschlusszahl wird nicht als erneuter Vollauf ausgegeben.

Noch offen:
1. Aktive Cart-Transform-/Function-ID und Quellversion über den berechtigten App-Zugang lesen und mit der kompilierten Quelle abgleichen. Der verbundene Shopify-Zugang verweigerte read_cart_transforms; das beweist nicht, dass keine Function aktiv ist. Keine Berechtigungen geändert.
2. Linux-Vollauf des finalen Branches durch Claude.
3. Nach ausdrücklicher Live-Freigabe: tatsächlichen Shopify-Checkout und Kontrollmail mit gespeichertem PNG abnehmen. Der lokale Nachweis ersetzt das nicht.
4. Beim Zusammenführen mit B beide Änderungen in acrylic-artwork.mjs bewahren: B-Familienerkennung und C-Fontvalidierung.

Nächster Schritt: D in eigenem Branch, zuerst D1/D2/D7; danach E ausschließlich als Vorschlag. Nichts live ohne Chris' ausdrücklichen Satz.
