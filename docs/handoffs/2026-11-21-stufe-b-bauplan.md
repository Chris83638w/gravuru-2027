# Stufe B – Bestelleingang baut die Fertigungsdateien von selbst (Bauplan)

Claude als Operator, 21.11.2026. Grundlage: ENTSCHEIDUNGEN 3.48, 3.51, 3.53 (Chris). Der Plan stammt aus einer reinen Lesedurchsicht des Stands `5b573f57` (Zweig `dev/claude-warenkorb3-20261121`) durch einen Unteragenten; nichts davon ist gebaut oder am echten Shop geprüft. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; an Designs wird nichts geändert.

## Ist-Ablauf (Fundstellen)

1. Eingang: `POST /webhooks/shopify/orders-paid` (`app/workshop/shopify-order-webhook.mjs:3`, `13–39`; Verdrahtung `configurator-integration.mjs:59–63`).
2. Prüfung: HMAC über die Rohbytes, Shop, Thema, Ereignis-ID, `paid`, EUR (`order-intake.mjs:48–63`).
3. Zuordnung: `_gravuru_offer` → `form_order_offers` → Bindung, Prüfstand, Paket-Prüfsumme (`order-intake.mjs:405–408`); `_gravuru_config`/`_gravuru_rev` müssen zum Angebot passen (`:386–392`).
4. Preisvergleich im selben Schritt: Variante, Menge, `line.price`, Aufpreise, Staffel, abgelaufenes Angebot (`:411–413`, `:420–426`, `:442–450`).
5. Abweichung heute: nur diese Position wird abgelehnt (`form_order_line_errors`, Status „fehler“ mit Grund; `:376–380`), Antwort bleibt 200; Anzeige „Fehlerhafte Positionen“ (`ui/orders-ui.mjs:14–22`) ohne Verweis auf die Gestaltung.
6. Annahme: unveränderliche Zeile in `form_order_lines` (`:451–452`). Danach geschieht nichts; der Handler schließt Dateierzeugung ausdrücklich aus (`shopify-order-webhook.mjs:34–35`).
7. Fertigung nur von Hand: Prüfstände → Ausgabe → `POST /api/workshop/export-jobs` (`http.mjs:824–826`) → `enqueueOutput` (`http.mjs:229–230`) → Warteschlange (`export-jobs.mjs:26–31`) → Arbeiter im selben Prozess, 1-s-Takt, ein Auftrag zur Zeit, übersteht Neustart (`export-jobs.mjs:33–48`).
8. Bau: `createAcrylicEngravingProof` / `createAcrylicPrintProof` → `acrylicArtwork` prüft die Gestaltung gegen die feste Produktrevision (`acrylic-artwork.mjs:46–60`).
9. Ablage: SQLite `form_print_proofs`; Download nur auf „Ausgaben“: `pdf | white-pdf | zip` (`http.mjs:853–857`; `print-delivery.mjs:17–30`).
10. Bestellansicht: `/werkstatt/bestellungen/` (`ui/orders.html`, `ui/orders-ui.mjs`; `cross-store-orders.mjs:6–34`); je Position nur Verweise auf Ausgabeaufträge, kein direkter Download.
11. Shopify: Kein Code schreibt an Bestellungen. Rechte laut letztem Beleg (11./13.10.): `read_orders` ja, `write_orders` nein.

## Vier Downloads, Bestand

| | Gravur | Druck |
| --- | --- | --- |
| PDF | vorhanden | fehlt: jede Druck-PDF trägt die Schnittkontur |
| PDF mit Kontur | fehlt: Kontur nur als getrennte Datei | vorhanden |
| SVG | vorhanden, nur im ZIP | vorhanden, nur im ZIP, ungespiegelt |
| SVG mit Kontur | fehlt | fehlt |

## Bauplan

**Lieferung 1 – Dateien entstehen von selbst (beauftragt, Zweig `dev/claude-bestellung1-20261121`)**

1. `order-intake.mjs`, `createOrderIntake`: Option `onPaid`; in `receive` nach dem Commit mit den angenommenen Zeilen aufrufen, auch bei erneuter Zustellung; ein Fehler darin ändert die Antwort nicht.
2. `http.mjs` neben `enqueueOutput`: `ensureOrderOutput(line)` reiht mit denselben Einstellungen ein, die der Knopf „Ausgabe“ heute verwendet; der Arbeiter startet im 1-s-Takt, also nach der Antwort an Shopify. Je Prüfstand und Rezept höchstens ein Auftrag.
3. „Bitte prüfen“ als abgeleitetes Kennzeichen, kein neuer Zustand: Die Bestellansicht zeigt je Position `fertig | wird erstellt | bitte prüfen` mit Grund. Abgelehnte Positionen (Preisabweichung) merken den Prüfstand, damit das Büro die Gestaltung öffnen kann. Fehlende Aufträge (Bestellungen vor dem Aufspielen, Absturz) werden beim Öffnen der Ausgaben nachgeholt.

**Lieferung 2 – vier Downloads (wartet auf drei Antworten von Chris)**

4. Gravur: zusätzlich „PDF mit Kontur“ und „SVG mit Kontur“ aus dem Gravur-Worker; Druck: „SVG mit Kontur“ und „PDF ohne Kontur“.
5. `print-delivery.mjs`: Formate `pdf-contour`, `svg`, `svg-contour`.
6. Bestellansicht: vier Knöpfe je Position.

**Lieferung 3 – Links an der Shopify-Zeile, ohne neue Berechtigung (wartet auf eine Antwort von Chris)**

7. Zwei weitere Texteigenschaften beim Einlegen: „Gestaltung ansehen“ (vorhandene Bildadresse des gesicherten Stands) und „Fertigungsdatei“ (Bestellansicht der Werkstatt zur Position; vor der Zahlung gibt es dort nichts).

## Risiken

- Der Bau läuft im Prozess der Kundenabrufe; die Gestaltungsprüfung rechnet synchron rund 1 s und kann in dieser Zeit einen Kundenklick aufhalten. Bauzeit am Server ist nicht gemessen (Hinweise aus Tests: 10 bis 26 s je Auftrag samt Aufbau).
- Fehlschläge möglich bei Funkklingeln alter Art, nicht lesbarem Produktstand, fehlender Schrift-, Motiv- oder Bildquelle, Vektormodus mit Foto. Alle landen als „bitte prüfen“.
- Von Astra am echten Shop abzulesen, bevor Lieferung 3 beauftragt wird: ob der Shopify-Admin Adressen in Zeileneigenschaften anklickbar zeigt und was Kasse und E-Mail aus neuen Eigenschaften machen.

## Offene Fragen an Chris (mit Empfehlung)

1. „Fertigungsdatei“ nur für angemeldete Mitarbeiter öffnen (nicht ohne Anmeldung wie bei Fancy)? Empfehlung: ja, nur angemeldet.
2. „Bitte prüfen“ zuerst nur in der Werkstatt anzeigen, nicht an der Shopify-Bestellung (das bräuchte eine neue Berechtigung und App-Version)? Empfehlung: ja.
3. Funkklingel: Gehört in „mit Kontur“ die Kontur der Acrylauflage, der Edelstahlträger bleibt getrennt? Empfehlung: ja.
4. Druck: Enthält „PDF“ ohne Kontur Farbe und Weiß, nur ohne Schnittlinie? Empfehlung: ja.
5. Gravur ohne Fertigungsprofil: PDF als Vektor, wenn kein Foto enthalten ist, sonst Raster 300 dpi? Empfehlung: ja (heute ist der Standard Raster).

## Nicht gefunden

- Die September-Fassung der vier Downloads („PDF 1:1 · mit Kontur“) liegt nicht in diesem Repo, sondern in `gravuru-shopify`.
- Aktuelle Berechtigungen der Shopify-App: jüngster Beleg vom 11./13.10.
