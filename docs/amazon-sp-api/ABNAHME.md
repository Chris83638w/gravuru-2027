# Abnahmeprotokoll vom 16.10.2026

Entwicklungsbranch `task/amazon-sp-api-20261016`; lokaler Testbetrieb, statische Amazon-Sandbox und synthetische Daten. Die Entwicklung und lokale Abnahme sind abgeschlossen. Es bestätigt keine produktive Freigabe.

## Automatisierte Prüfungen

| Prüfumfang | Ergebnis | Einschränkung |
|---|---|---|
| Amazon-Module und Integration einschließlich Custom-Dateiimport/PDF/Scan | **138/138 Tests erfolgreich**, keine übersprungen | Synthetische bzw. injizierte Antworten; keine echten Kundenbestellungen |
| Bestehende Kunden-, Prüfstand-, HTTP-, Shopify- und Druckabläufe nach Erweiterung | **29/29 Tests erfolgreich**, keine übersprungen | Sieben gezielte Testdateien; lokale Python-Laufzeit und deren fehlende Kontur-/Druckabhängigkeiten eingerichtet |
| Bestehende Regressionen | **72 Tests erfolgreich** | Zunächst 70 erfolgreich; zwei Tests scheiterten an einem Python-Alias-/`openpyxl`-Umgebungsproblem. Gezielter Wiederholungslauf mit `GRAVURU_PYTHON` auf gebündeltem Python: 2/2 erfolgreich |
| Dokumentationslinks und Sandboxbeleg | Relative Dateiverweise und JSON-Struktur geprüft | Kein automatischer Nachweis aller externen Quellenverfügbarkeiten |

Die Zahlen stammen aus dem koordinierenden Integrationslauf, nicht aus einem behaupteten einzigen fehlerfreien Erstlauf. Die vollständige Bestandstestsuite wurde nicht ausgeführt; die 72 gezielten Regressionen betreffen HTTP, Hostschutz, Repository, Shopify-Sitzungen und bisherigen Bestelleingang. Der GitHub-Branch und sein Commit dokumentieren den Quellstand.

Der Erweiterungslauf umfasst 138 Amazon-Tests mit verpflichtendem unabhängigem Barcode-Decoder (`GRAVURU_BARCODE_DECODE_REQUIRED=1`). Der bestehende isolierte UI-Kontexttest erhielt Testdoubles für die zwei neuen UI-Module; danach bestand er, zuletzt separat 11/11. Diese elf Tests sind in den 138 enthalten. Die 29 anschließenden Regressionen wurden mit gebündeltem Python und einem lokalen Windows-Testadapter ausgeführt, der lediglich das fest kodierte `python3` auf `GRAVURU_PYTHON` abbildet und die `promisify`-Semantik erhält. Fehlende `svgpathtools`, `shapely`, `svgwrite` und `scipy` wurden nur im ignorierten lokalen Python-Verzeichnis ergänzt. Anwendungscode und Sollwerte der Bestandstests blieben dafür unverändert. Keine Summe überschneidender Regressionen wird als eindeutige Gesamtzahl ausgegeben.

## Erweiterungsabnahme: Custom-Datei, Begleitschein und Scan

- Original-JSON/ZIP unveränderlich mit SHA-256, Bestell-/Positions-/SKU-Zuordnung und Versionsschutz. Falsche Zuordnung, unbekannte Eingaben, ungültige Archive, fehlende Testfreigabe und konkurrierende Bestätigung werden abgewehrt.
- Browserimport des synthetischen 212-Byte-Musters: Dateistand 1 geprüft, `Gravurtext: GRAVURU TEST` und `Design: Synthetische Gestaltungswahl` bewusst ausgewählt und als Dateistand 2 bestätigt. Bildpositionen und vollständige Gestaltung wurden nicht übernommen oder erfunden.
- A4-Begleitschein automatisch nach Import; A4/A5-Einzel-/Stapel-PDFs, reproduzierbare Ausgaben, Warteschlange, Dubletten- und Stornoschutz automatisiert geprüft. Druckbestätigung ist vom PDF-Download getrennt und an genau dessen Ausgabe gebunden.
- Unabhängige Prüfung mit PyMuPDF, Pillow und ZXing-C++: vollständige Bestell- und Positionsbarcodes aller A4-/A5-Testseiten bei 203 und 300 dpi korrekt decodiert; Seitenmaße, Ruhezonen und Mindestmodulbreite geprüft. Keine Bestellnummer wird gekürzt.
- Tatsächlicher A5-Download aus dem Browser: eine Seite, beide ausgewählten Custom-Werte vorhanden; Decoder liest `TEST-AMAZON-DESIGN-20261016` und `G27P-B899CECB3FE7A48B`. PDF und maschinenlesbarer Nachweis liegen in den lokalen Ergebnissen.
- Tastatur-/Enter-Eingabe beider Codes öffnet die richtige native Testposition und ihren vorhandenen Gestaltungslink. Die drei ausdrücklich gewählten Schritte Produktion → Qualitätskontrolle → Versandvorbereitung wurden im Browser gespeichert und angezeigt; keine Amazon-Rückmeldung.
- Unabhängige Abschlussprüfung der Auth-/CSRF-/Testgrenzen und geänderten Dateien fand keine erkennbaren Geheimnisse oder Kundendaten im Commitumfang.

**Offen:** physischer Ausdruck und Handscanner; echte Amazon-Custom-Muster; Foto-/Logo-/Layoutparität; Unicode außerhalb WinAnsi; verlässliche Erkennung alter Papierkopien allein durch stabile Positionscodes; ein Freigabeverfahren für einen nach Datenänderung gesperrten bereits begonnenen Testzyklus. Alle PDFs bleiben deutlich als Test gekennzeichnet. Es wurde kein tatsächlicher Ausdruck behauptet.

## Echter Amazon-Netzwerknachweis

Der [sanitisierte Beleg](nachweise/sandbox-probe-2026-10-16.json) wurde am **16.10.2026 um 12:06:16.925 UTC** nach Verschlüsselung des lokalen Zugangsspeichers erzeugt:

| Operation | Ergebnis | Amazon-Request-ID |
|---|---|---|
| LWA-Tokenabruf | HTTP 200 | `fb18fe03-83ac-4a92-b12e-974a54bcf6ac` |
| Orders `getOrder` an `sandbox.sellingpartnerapi-eu.amazon.com` | HTTP 200 | `249e610c-c9db-4b0d-af4b-de313a70671c` |

Zwei Netzwerkanfragen in diesem Lauf. Das öffentliche statische Beispiel hat die Bestellnummer `171-9876543-2109876`, Marktplatz Brasilien und BRL 299,90. Der Beleg enthält keine Zugangsdaten, Käufer-/Empfängerinformationen oder Custom-URLs. `productionPermissionVerified` ist ausdrücklich `false`.

SHA-256 der gespeicherten JSON-Datei:

```text
17d04fa939e54d06616125a5cd07bd219ab6c93c029d61f19a6f7e884ba29610
```

## Lokale Browserprüfung

Im Browser der lokalen Werkstatt wurden folgende Ergebnisse beobachtet:

- Echte statische Sandboxprüfung mit Import; die Währung BRL blieb sichtbar.
- Zwei synthetische Beispielartikel wurden angezeigt.
- Wirtschaftlichkeitsbeispiel: 40 EUR Nettoerlös minus 6 EUR Amazongebühren, 3 EUR Werbung, 4 EUR Versand, 5 EUR Material, 8 EUR Produktion und 0 EUR Retouren ergibt **14 EUR**.
- Fehlende Werbekosten führten zu einer **unvollständigen** Rechnung; bekannte Kosten betrugen **23 EUR**. Fehlende Kosten wurden nicht still als null gerechnet.

Zusätzlich wurde der Custom-Inspektor lokal mit einem synthetischen JSON von 212 Byte geprüft: sechs mögliche Felder, vier unbekannte Felder und weiterhin keine Produktionsfreigabe. Muster-SHA-256: `96aa56642b548eba5de46fa067b70fd99d9ba8b753e1e320683e494b95943a2d`. Die Dateiprüfung wurde auch über den Dateidialog der Amazon-Oberfläche mit ausdrücklicher Testklassifikation erfolgreich bedient.

Die vollständige native Zuordnung ist geprüft: echtes Produkt aus dem vorhandenen Werkstatt-Seed, prepareAcrylicReview, gerenderte native Testgestaltung, SQLite-Prüfstand, Mengenprüfung, feste Revision und Prüfpaket-Hash. Bindung und Zuordnung wurden über HTTP sowie im Browser ausgeführt. Spätere Produktrevision und Storno lassen den gesicherten Auftrag unverändert. Der Prüfstand zeigt den Amazon-Testauftragskontext und blendet den Shopify-Warenkorb aus. Elf zusätzliche DOM-Verhaltenstests prüfen gültige, widersprüchliche und veraltete Kontexte sowie erhaltene Shopify-/Standalone-Abläufe. Das ist keine echte Fertigungs- oder Custom-Abnahme.

## Nicht ausgeführt oder nicht bestätigt

Keine produktive Amazon-Abfrage, kein echter Custom-Download, keine Angebots-/Preis-/Bestelländerung, kein Carrierlabelkauf, kein produktives Deployment und keine Datenlöschung. Die spätere gezielte Prüfung von `https://app-2027.gravuru-designwerkstatt.de/werkstatt/` lieferte HTTP 200, 16.336 Byte und den Titel „Gravuru 2027 · Werkstatt“. Damit ist die bestehende Webanwendung erreichbar; die Plesk-Standardseite der Rootadresse widerlegt dies nicht. Cloudinternals, Sicherheitskonfiguration und produktiver Amazon-Betrieb bleiben ungeprüft.

## Abschließende Kontrollen

Erneuter echter Abruf aus dem Dashboard: 16.10.2026 12:24:49 UTC, HTTP 200, Request-ID ea524387-0516-41ed-8850-269dea3d3fd4. Siehe nachweise/dashboard-sandbox-2026-10-16.json. Nach Wiederholung weiterhin vier gespeicherte Testpositionen, keine Dublette. Zwei synthetische Positionen wurden im Browser storniert; die native Beispielzuordnung blieb erhalten.

Mobile Prüfung bei angeforderter Breite 390 px: Dokumentbreite 375 px, kein seitlicher Seitenüberlauf. Tabellen dürfen innerhalb ihres Bereichs scrollen. Browserprüfung erfolgte im lokalen App-Browser, nachdem Chrome den Loopbackaufruf mit ERR_BLOCKED_BY_CLIENT blockierte. Der angemeldete Amazon-Portalzugang wurde in Chrome geprüft.

Referenzintegrität: vier Quellarchive erfolgreich geprüft. Der Build des Sandboxlaunchers und git diff --check waren erfolgreich. Screenshots und Testlogs liegen in den lokalen Ausgabedateien. Keine Zugangsdaten oder Datenbanken im Branch.
