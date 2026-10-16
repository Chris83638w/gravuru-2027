# Abnahmeprotokoll vom 16.10.2026

Entwicklungsbranch `task/amazon-sp-api-20261016`; lokaler Testbetrieb, statische Amazon-Sandbox und synthetische Daten. Die Entwicklung und lokale Abnahme sind abgeschlossen. Es bestätigt keine produktive Freigabe.

## Automatisierte Prüfungen

| Prüfumfang | Ergebnis | Einschränkung |
|---|---|---|
| Amazon-Module und Integration | **105 Tests erfolgreich** | Synthetische bzw. injizierte Antworten; keine echten Kundenbestellungen |
| Bestehende Regressionen | **72 Tests erfolgreich** | Zunächst 70 erfolgreich; zwei Tests scheiterten an einem Python-Alias-/`openpyxl`-Umgebungsproblem. Gezielter Wiederholungslauf mit `GRAVURU_PYTHON` auf gebündeltem Python: 2/2 erfolgreich |
| Dokumentationslinks und Sandboxbeleg | Relative Dateiverweise und JSON-Struktur geprüft | Kein automatischer Nachweis aller externen Quellenverfügbarkeiten |

Die Zahlen stammen aus dem koordinierenden Integrationslauf, nicht aus einem behaupteten einzigen fehlerfreien Erstlauf. Die vollständige Bestandstestsuite wurde nicht ausgeführt; die 72 gezielten Regressionen betreffen HTTP, Hostschutz, Repository, Shopify-Sitzungen und bisherigen Bestelleingang. Der GitHub-Branch und sein Commit dokumentieren den Quellstand.

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

Keine produktive Amazon-Abfrage, kein echter Custom-Download, keine Angebots-/Preis-/Bestelländerung, kein Carrierlabelkauf, kein produktives Deployment und keine Datenlöschung. Eine aktive gravuru-Cloudanwendung wurde nicht nachgewiesen: Die bekannte Domain zeigte eine Plesk-Standardseite.

## Abschließende Kontrollen

Erneuter echter Abruf aus dem Dashboard: 16.10.2026 12:24:49 UTC, HTTP 200, Request-ID ea524387-0516-41ed-8850-269dea3d3fd4. Siehe nachweise/dashboard-sandbox-2026-10-16.json. Nach Wiederholung weiterhin vier gespeicherte Testpositionen, keine Dublette. Zwei synthetische Positionen wurden im Browser storniert; die native Beispielzuordnung blieb erhalten.

Mobile Prüfung bei angeforderter Breite 390 px: Dokumentbreite 375 px, kein seitlicher Seitenüberlauf. Tabellen dürfen innerhalb ihres Bereichs scrollen. Browserprüfung erfolgte im lokalen App-Browser, nachdem Chrome den Loopbackaufruf mit ERR_BLOCKED_BY_CLIENT blockierte. Der angemeldete Amazon-Portalzugang wurde in Chrome geprüft.

Referenzintegrität: vier Quellarchive erfolgreich geprüft. Der Build des Sandboxlaunchers und git diff --check waren erfolgreich. Screenshots und Testlogs liegen in den lokalen Ausgabedateien. Keine Zugangsdaten oder Datenbanken im Branch.
