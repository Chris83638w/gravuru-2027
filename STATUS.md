## 29.10.2026 · Astra · Türschilder: Bestand und Plan, noch keine Anbindung

Nur lesend: Gesamtindex 1.324 Shopprodukte, Detailbestand 649 Produkte / 8.641 Varianten; eigener Branch dev/tuerschilder-anbindung-20261029-astra. 104 Edelstahl-Hauptprodukte vorhanden, 103 Startdesign-Freigaben offen; 410 Soll-Befestigungsvarianten fehlen. Acryl ohne Familien-/Hauptproduktzuordnung, aber 798 Serienvarianten (DRAFT). 15 von 29 Acryl-Shopmotiven weichen vom Original derselben Kennung ab. Preise, feste cfg-Revisionen und Preisvertrag vor Pilot klären. [Bericht mit Register, Motivvergleich, Belegen und Pilotplan](docs/handoffs/2026-10-29-tuerschilder-anbindung-bericht.md). Keine Shopify-Schreibaktion, Live-DB, Import/Bindung, Themewechsel oder Bereitstellung. Pilot erst nach Chris’ ausdrücklichem Satz.

## 28.10.2026 · Claude · Live: PR #41 Kunden-Konfigurator UX + iPhone-Absicherung (`main` `0643c70`)

- Chris (19:49): „Ja, Du darfst PR #41 (Stand 602a3ac) nach main übernehmen, bereitstellen und die App neu starten.“ → Merge `0643c70` (Baum = `602a3ac`, Linux 1775/1775), Plesk Pull + Bereitstellen, Ziel geprüft (`shop-embed` mit `editor-ready`/`loaded`, `shop-design-gallery.mjs`, `view-zoom.mjs`), App neu gestartet; `shop-design-switch.mjs` 200, `/api/workshop/session` 401.
- Live ohne Umleitung geprüft (D8): Desktop 1440 × 900, iPhone 13 390 × 664, iPhone SE 375 × 548 – Leiste über dem Schild, Griffe 19 px, Zoom, Vollbild, Handy 90 % Breite, 2 Finger auf Text = Ansichtszoom (10 mm bleibt), Preis 19,99 €, keine Seitenfehler.
- **Fehler live:** „Designs ansehen“ (Galerie aller Formen/Größen) → nach 30 s 502 „upstream request failed“ (Plesk-Proxy-Zeitlimit); Kunde sieht „Der Konfigurator konnte nicht geladen werden.“, Editor bleibt bedienbar, Server bleibt ansprechbar (Messung 0,4–0,9 s während der Anfrage). Ursache: Kaltaufbau über alle aktiven Bindungen (`modelFor` je Produktstand) dauert mit Echtdaten > 30 s, Zwischenspeicher nur 10 s. → Nachtrag 3 an Astra.
- Offen: echter iPhone-Test Chris; D8-Motivaufpreis (eigener Live-Schritt).

## 28.10.2026 – Astra: PR #41, Nachtrag 2 (S1/S2) und D8-Probelauf

Mobile Textleiste jetzt maximal zwei Zeilen (99 px, 44-px-Steuerflächen), Schrittleiste und Preis bei **375 × 548 / 390 × 664** frei; Platte weiterhin 90 % breit. Zwei gleichzeitige Touch-Kontakte über ausgewähltem Text übernehmen ausschließlich den Ansichtszoom, auch nach SVG-Neuzeichnen; Objektgröße, Fotoausschnitt und Druckdaten bleiben unverändert. Browserbeleg auf drei Größen: Ansicht 100 → 190 %, Schriftanzeige 10 → 10 mm. Vier neue Regressionen: alter Adapter 4/8, neuer 8/8.

**Prüfung:** gezielter Abschluss 67/67; Windows-Vollauf Editor **398/404**, Werkstatt **1207/1372**, dieselben 6 bzw. 158 bekannten Umgebungsfehler und 7 Werkstatt-Skips; Fehlersignaturen unverändert. Claudes **Linux 1771/1771** gilt für Vorgänger **7ac1505**; neuer Linux-/echter Safari-Gegencheck offen. **N7:** Claudes eingeschränkte DB/WAL-Bytesuche ohne D8-Preisvertrag dokumentiert. Lokales Probelaufskript (4/4), konkrete Schritte, Funktionsprüfung und Rückweg vorbereitet; aktuelle volle SQL-IDs und Funktionsbeleg fehlen noch. [Bericht](docs/handoffs/2026-10-28-konfi-ux-nachtrag2-astra-bericht.md) · [10 Bilder und Messwerte](docs/handoffs/konfi-ux-20261028-nachtrag2-astra/README.md) · [D8-Probelauf](docs/handoffs/2026-10-28-d8-preis-probelauf.md). **Entwurf, nichts live. Bereitstellung nur mit Chris' neuem Satz.**

## 28.10.2026 – Astra: PR #41, Nachtrag N1–N6; N7-Readback offen

Claude-Merge **87154ac** unverändert per Fast-Forward übernommen. Handyplatte in Optionen/Text/Motive bei **390 × 664 und 375 × 548 jeweils 90 % breit**; Zoomanzeige mobil erst über 100 %, Maßangaben frei. Galerie: kurzer LRU nach Zuordnungs-/Produktköpfen, ein Digest/Modell je Revision, kein doppeltes resolve, Prozesswarteschlange mit zwei Vorschauen. Defekte Galerieeinträge werden ohne Kundendaten protokolliert und ausgelassen; exakter Wechsel bleibt streng. Ungültiges/mehrfaches leiste fällt auf B zurück; Designwechsel verlängert Sitzungen nicht. Ausgeblendete Motive in Preis, Fertigung und SVG zusammen geprüft.

**Tests:** gezielt 96/96, isolierter Lasttest 1/1 (150 Bindungen: kalt 723,69 ms, warm 22,66 ms; Event-Loop max. 41,06/15,77 ms), Bundle/Zoom 10/10. Windows-Vollauf Editor 394/400 (6 bekannte Python-Fehler), Werkstatt 1207/1372 (158 bekannte Fehler mit gleicher Ursache, 7 Skips; einmaliges ECONNRESET in einem Zwischenlauf, Webhook-Nachlauf 5/5, im letzten Vollauf bestanden). Ein übernommener Windows-Importpfad im iOS-Test korrigiert, Assertions erhalten. Claudes Linux 1760/1760 beziehen sich auf den vorigen Auftrag-2-Stand. [Bericht und Grenzen](docs/handoffs/2026-10-28-konfi-ux-nachtrag-astra-bericht.md), [20 Bilder mit Maßen und Prüfsummen](docs/handoffs/konfi-ux-20261028-nachtrag-astra/README.md). **N7:** Plesk-Leseaufruf HTTP 500; aktuelle D8-Preisbindung nicht bestätigt, Rückfrage im PR. Entwurf, nichts live, kein Merge/Import/Freigabe.

## 28.10.2026 · Claude · PR #41 (`d472ba4`) + iPhone-Absicherung zusammengeführt (Branch `dev/konfi-ux-ios-zusammen-20261028-claude`)

- Merge von `dev/konfi-ios-sicherheit-20261028-claude` auf Astras Stand `d472ba4`. Konflikte `shop-embed.mjs`, `shop-entry-page.mjs`, STATUS gelöst: zwei getrennte Meldungen aus dem Fenster – `gravuru-shop-ready` (Seite geladen → Wächter aus) und Astras `gravuru-shop-editor-ready` (Editor bedienbar → Fensterleiste aus); bei `failed` bleibt die Leiste mit „Schließen“ sichtbar. Designwechsel-Koordinator und A/B-Weitergabe unverändert.
- Teststubs angepasst (Fenster-`postMessage`/`addEventListener`, neue Meldungsart). Gezielt 70/70 (Shop-Einstieg, Client, A/B-Weitergabe, Galerie, leere Zusatztexte, Workflow).
- Nicht live. Bereitstellung nur mit Chris' Satz.

## 28.10.2026 – Codex/Astra: PR #41, zweiter UX-Auftrag umgesetzt

Signierte Implementierungscommits `917ff907`, `d0b94899`, `37b9e624` (jeweils GitHub verified); Quellreadback **72/72 bytegleich, LF**. Auftrag `77fab45`, Fortsetzung auf `dev/konfi-ux-20261028-astra` ab `458f56b8`. Die neue Entscheidung ersetzt die frühere Preisregel: Vorlagenmotiv inklusive, nur zusätzliche/geänderte Motive je 169 Cent; bestehende Bestellstände unverändert. Standardleiste B über der Platte, A zum Vergleich, M2 auch im Handy-Vollbild, kleinere Pfeilgriffe, deutliche Auswahl, große Motivkacheln, kompakter Handykopf und echter Ansichtszoom. Produktübergreifende Galerie aus aktiven gebundenen Produktständen, neue Sitzung/Preis/Shopify-Variante beim Wechsel; vorherige Gestaltung bleibt erreichbar. Optionaler 50/50-Test bleibt aus.

Windows-Vollauf Editor: **393/399**, sechs bestehende Python-Startfehler; Werkstatt **1197/1362**, 158 Fehler, 7 übersprungen. Ergänzter PR-Head-Vergleich: **1149/1322**, 160 Fehler, 13 übersprungen; alle 158 aktuellen Fehler mit gleicher Ursache enthalten. Gezielte Wechsel-/Sicherheitsprüfung **93/93**, abschließend Zoom/Bundle **20/20**. Lokaler Browserweg: D8 19,99 €, mit Hausmotiv 21,68 €; 12×8 → 22×14 Schiefer 22,99 €, Rückweg mit unverändertem Testtext, richtiger Produkt-/Variantenbezug im lokalen Testwarenkorb. Historische Produktkopien und ausschließlich lokaler Warenkorbtransport, kein Live-Bestellnachweis.

[Bericht mit Grenzen und nächsten Schritten](docs/handoffs/2026-10-28-konfi-ux-auftrag2-astra-bericht.md) · [Vorher/Nachher Desktop und iPhone](docs/handoffs/konfi-ux-20261028-auftrag2-astra/README.md). Keine Freigaben, kein Import, kein Merge, kein Deploy. Nächster Schritt: Claude prüft Linux und Zusammenführung mit seinem iPhone-Branch; Chris nimmt die Bilder ab und gibt eine spätere Bereitstellung ausdrücklich frei.

## 28.10.2026 – Codex/Astra: Kunden-Konfigurator als Entwurf zur Prüfung

Branch `dev/konfi-ux-20261028-astra`, Basis `f200509`. Gemeinsames Desktop-/Handylayout, M2-Textleiste, Inline-Textoptionen, Konturbegrenzung, Motivsuche und Produkt-Erklärungen; 50 Zeichen je Zeile und jedes Motiv 169 Cent nur für neue Produktstände. SVG-/PDF-Mehrzeilentexte bleiben zusammen. Alle kompatiblen freigegebenen Ziel-Designs optional im Import; produktübergreifende Galerie noch offen in [Issue #40](https://github.com/Chris83638w/gravuru-2027/issues/40). Vollauf variant-m Windows vorher **329/342**, nachher **339/350**, dieselben elf Restfehler auf main (sechs Python-Startfehler, fünf bestehende andere Fälle). Gezielte Gruppen: 52/52, Import 33/33, PDF 11/11, Werkstatt 63/63, Vorschlagsplan 1/1, finale CSS/Build 8/8. Dry-run: 1 Produkt, 1 bereit, 0 gesperrt; kein Import. [Bericht und nächste Schritte](docs/handoffs/2026-10-28-konfi-ux-astra-bericht.md), [Screenshots](docs/handoffs/konfi-ux-20261028-astra/README.md). Kein Merge, kein Deploy, keine Live-Preisänderung. Nächster Schritt: Claude prüft Quellstand/Linux und klärt Issue #40; Chris nimmt Bilder ab.

## 28.10.2026 · Claude · iPhone-Absicherung + leere Zusatztexte (Branch `dev/konfi-ios-sicherheit-20261028-claude`)

- Chris (iPhone/Safari): „Jetzt personalisieren“ ausgegraut, Tippen tut nichts, Neuladen hilft nicht; „das muss allgemein funktionieren … der Kunde muss einen Hinweis erhalten“. Nachstellung mit WebKit (iPhone 13) und Chromium: Knopf grün, Fenster öffnet, Konfigurator lädt – Ursache auf seinem Gerät noch unbekannt (Screenshot erbeten; Verdacht ältere Theme-Vorschau/Designer-Knopf).
- `3928857` Absicherung (`shop-embed.mjs`, `shop-entry-page.mjs`): Theme-Sperren am eigenen Knopf werden entfernt (auch nachträglich per Attribut-Beobachter), Klick in der Einfangphase vor Theme-Skripten, bei Fehler normaler Link; Fenster meldet bereit/Fehler, nach 15 s ohne Rückmeldung oder bei Fehler Hinweis „Weiter warten / Neu laden / Ohne Fenster öffnen“; Schließen-Knopf über dem Hinweis. WebKit: normal, Theme-Sperre, Modellfehler, hängender Server geprüft.
- Chris (Desktop): hinzugefügte, nicht ausgefüllte Texte („Dein Text“) blockieren den Warenkorb. Live nachgestellt (Hinweis „Element ragt über die Gestaltungsfläche“). Fix: „Gestaltung fertig – weiter“ entfernt leere/„Dein Text“-Zusatztexte (`added-texts.mjs`, rückgängig machbar); mit lokalem Editor-Paket gegen den Live-Shop geprüft → Überblick mit „In den Warenkorb“.
- Tests: client 16/16, shop-entry 23/23, added-texts 1/1, workflow 9/9; ui-event-regressions nur die 2 bekannten Fehlschläge.
- Live erst mit Chris' Satz.

## 28.10.2026 · Claude · Live: Direktstart (`main` `8540800`)

- Chris (07:49): „Ja, Du darfst den Direktstart des Konfigurators bereitstellen und die App neu starten.“ → Merge `8540800` (STATUS-Konflikt zusammengeführt, gezielte Tests grün), Plesk Pull + Bereitstellen, Ziel geprüft (`input.ticket`, `createStartTickets`/`failedUntil`, `startResourceUrls`), App neu gestartet (grüner Hinweis).
- Live (D8, Fenster-Modus über den echten Knopf, 3 Läufe): Startkarte über den Shopify-App-Proxy 200, Fenster öffnet direkt `app-2027…/konfigurator/shop/`, Klick → bedienbar **3,3–3,9 s** (27.10. abends 6,6–6,9 s). Modell 1 Schrift, 37 bekannt, Lato lädt nach, Design 51 Pfade. Erster Aufruf nach Neustart wie erwartet noch ungekürzt.
- Offen: iPhone-Test Chris; danach bezahlte Testbestellung, Cloud-Server.

## 28.10.2026 · Claude · Live: Produktschriften bei Bedarf + paralleles Laden (`main` `7076fd0`)

- Chris (05:27): „Ja, Du darfst das Nachladen der Produktschriften und das parallele Laden des Konfigurators bereitstellen und die App neu starten.“ → Merge `7076fd0` (ohne Direktstart, der ist nicht freigegeben), Plesk Pull + Bereitstellen, Dateien im Ziel geprüft (`gravuru-warm`, `fontRoute`, `designFontNames`, `productFontIndex`; kein `format=json`), App neu gestartet (grüner Hinweis).
- Live gemessen (D8, `scripts/konfi-messen.cjs`, frischer Browser): erster Aufruf nach Neustart noch ungekürzt (Katalog lädt im Hintergrund), danach Modell **552 KB, 1 Schrift**, WebP; bedienbar Desktop **3,8–4,4 s** (vorher 6,6–6,9), Handy-Simulation **6,0 s** (vorher 11,1). Fenster-Modus: Einstiegsseite mit `gravuru-warm` + `modulepreload`, 6 Schriften im Nachlade-Index, 37 bekannt; „Lato Regular · c3d3cabdb582“ lädt über `/konfigurator/shop/schriften/<sha256>.json` (200, `immutable`, 1,3 MB nur bei Auswahl). Design unverändert (51 Pfade), Kaufknopf aus.
- Offen: Direktstart (`dev/konfi-direktstart-20261028-claude`, geprüft, braucht Chris' Satz), iPhone-Test Chris.
## 28.10.2026 · Claude · Direktstart ohne Shopify-Umweg + Startschriften vorwärmen (Branch `dev/konfi-direktstart-20261028-claude`, baut auf `dev/konfi-parallel-laden-…` auf)

- Chris: „mach weiter“ (04:31). Rest-Zeitleiste: Klick → App-Proxy-Start 0,5–1,1 s → Seite → Modell → Editor; Editor-CPU nur noch ~1,2 s (Profil), `localFontIds` 52 ms.
- Startkarte: `start?…&format=json` (signiert über den App-Proxy, eigenes Limit `ticket`, echte Starts unberührt) liefert dieselbe Zieladresse als JSON. `shop-embed.mjs` holt sie nach dem Laden der Produktseite im Leerlauf bzw. bei Absicht (`createStartTickets`, nur Adressen des Konfigurator-Hosts, 10 min vor Ablauf verworfen); der Klick öffnet das Fenster direkt auf dem Konfigurator-Host, sonst wie bisher über den Proxy. Gleicher Startschlüssel = gleiches Fenster (Schließen/Öffnen behält den Stand). Hinweis: Das Sitzungstoken ist damit für Skripte der Produktseite lesbar (gleiche Rechte wie ein Klick auf „Jetzt personalisieren“, kundengebunden).
- Startschriften/-motive: Einstiegsseite holt nach dem Modell die Katalogdateien der Startdesigns (`startResourceUrls`, gleiche Adressen wie der Editor).
- Unabhängiger Review: keine Blocker, Rechte der Startkarte = Klick (fremde Origins lesen sie nicht, API prüft Origin, Warenkorb prüft Kunde). Umgesetzt: Fehlschlag 60 s gemerkt (kein Abrufschwall), Karte höchstens 30 min alt (Sitzung ≥ 3,5 h nach Klick), nur zwischenspeicherbare Slug-Dateien vorab; Test gleicht Adressen mit `lazyUrls` und `acrylCacheControl` ab.
- Prüfungen: gezielt 78/78 (nach Review-Nacharbeit client 15/15, shop-entry 23/23) (shop-entry 23, client 15, flows 2, theme-cart 12, slim 5, routing 7, lazy-resources 14). Live-Shop D8 (Playwright, Fenster-Modus, 4 Paare alt/neu): Klick → bedienbar Ø 5,3 → 4,7 s; Fenster startet direkt auf `app-2027…/konfigurator/shop/`. Einstiegsseite mit Cache: Cinzel aus dem Zwischenspeicher, bedienbar 3,5 s (noch 3,8-MB-Modell).
- Live erst mit Chris' Satz.

## 28.10.2026 · Claude · Konfigurator lädt Editor parallel zu den Produktdaten (Branch `dev/konfi-parallel-laden-20261028-claude`)

- Zeitleiste vorher: Seite → zwei Skripte nacheinander → Modell → erst dann Editor-Seite (0,5 s) → Paket → Kernkatalog (0,9 s).
- `shop-entry.html`: `modulepreload` für `shop-entry-client.mjs`. Server setzt `<meta name="gravuru-warm">` (je storeId: Editor-Seite, beim Acryl-Bereich zusätzlich `katalog-kern.json`); `shop-entry-page.mjs` lädt diese parallel zum Modell mit niedriger Priorität in den Browser-Zwischenspeicher, aus der Editor-Seite auch das gehashte Paket (`warmTargets`/`warmEditor`, nur eigene absolute Pfade).
- `shop-embed.mjs`: `connectOnIntent` – bei Zeiger/Fokus/Berührung am eigenen Knopf einmal `preconnect` zum Konfigurator-Host.
- Prüfungen: gezielt 61/61 (shop-entry 22, client 13, flows 2, theme-cart 12, slim 5, routing 7). Gesamtsuite 1657/1664 – nur die 7 bekannten Editor-Fehlschläge von `main`. Browser (Playwright, Einstiegsseite per CDP mit lokalen Dateien, Cache aktiv, D8): Editor-Seite, Paket und Katalog im Fenster aus dem Zwischenspeicher; bedienbar Desktop 5,0–6,0 → 3,9–4,6 s, CPU 4x 9,6 → 8,0 s (noch mit 3,8-MB-Modell).
- Live erst mit Chris' Satz.

## 28.10.2026 · Claude · Eigene Produktschriften erst bei Bedarf (Branch `dev/konfi-produktschriften-nachladen-20261028-claude`)

- Chris: „setze alles um“ / „ne wir machen weiter“. Restliche 7 eigene Schriften (3,6 MB) im Kundenmodell: 6 davon nutzt beim Start kein Design.
- Server (`shop-model-slim.mjs`, `shop-entry.mjs`): Schriften, die das Modell nirgends als `font` nennt (Designs, Funkklingel-Formate, Vorgaben), kommen als inhaltsadressierte Datei `/konfigurator/shop/schriften/<sha256>.json` (`public, max-age=31536000, immutable`, nur GET/HEAD, gleicher Origin) und stehen im Modell nur als `localResources.lazyFonts`. Gleichnamige, aber abweichende Katalogschriften bleiben eingebettet. Speicher nach Bytes (96 MB) mit Auffrischen bei Abruf; Verdrängtes wird aus dem gespeicherten Modell nachgeliefert (Hash geprüft). Prüfung/Warenkorb nutzen weiter das vollständige Modell.
- Editor (`lazy-resources-model.mjs`, `lazy-resources.mjs`, `local-pilot.mjs`): `lazyFonts` (geprüftes URL-Muster, max. 64) kommt in den Schriftindex; Auswahl, Entwürfe und Warenkorb-Bearbeiten laden nach; Editor-Prüfung zählt sie als bekannte Schriften.
- Prüfungen: gezielt 43/43 (slim 5, shop-entry 22, flows 2, lazy-resources 14); Gesamtsuite 1655/1662 – die 7 Fehlschläge sind die bekannten Editor-Tests von `main`. Unabhängiger Review: Namensgleichheit mit Katalog, Speicherverdrängung (404) und Funkklingel-Formate gemeldet → behoben + Tests. Ende-zu-Ende gegen den Live-Shop (lokales Editor-Paket + simulierte Serverumwandlung, Playwright): Design gleich (51 Pfade), 37 bekannte Schriften, „Lato Regular · c3d3cabdb582“ lädt über die neue Route nach; Modell **3.781 → 563 KB**. Bedienbar in ruhigen Läufen Desktop ~6,9 → ~5,7 s, Handy-Simulation 12,4 → 10,2 s (Messungen schwanken stark).
- Live erst mit Chris' Satz (Deploy + Neustart; der Editor wird beim Start aus `main` gebaut).
- Danach: Start ohne Proxy-Umweg (Zeitleiste: Klick → Proxy-Start 0,7 s → Seite 0,5 s → zwei Skripte nacheinander 0,6 s → Modell), Katalogschriften parallel statt nacheinander, Editor-CPU.

## 27.10.2026 · Claude · Konfigurator-Start schlanker live (Messskript `scripts/konfi-messen.cjs`)

- Chris: „prüfe alles“ → Messung (Playwright, D8): 7,6 s bis bedienbar; Modell 11,2 MB (17 Schriften 9,3 MB, PNG-Grundplatte 1,9 MB); Editor-Seite/Nachlade-Schriften nie zwischengespeichert (Bundle bekam widersprüchlich `immutable` + `no-store`); CPU 0,7 s `localFontIds` (Pfadprüfung aller Schriften), 0,7 s `svgDocument`.
- `85ab2b6`: `shop-model-slim.mjs` (10 von 17 Schriften bytegleich im Katalog → entfallen; Grundplatte → Repo-WebP 97 KB), `acrylCacheControl` (Bundle immutable, Katalog/Schriften/Motive 1 h, Editor-Seite 5 min privat). Vorab am Live-Editor simuliert (gleiches Design, 37 bekannte Schriften, Schriftwechsel lädt nach). Tests 65/65 gezielt.
- `751c6de`: `node scripts/konfi-messen.cjs [URL] [--handy]` – Gegenprüfung im Terminal (nichts in den Warenkorb).
- Chris: „Ja, Du darfst den schlankeren Konfigurator-Start bereitstellen und die App neu starten.“ (Plesk war nach Update auf 18.0.82 abgemeldet, Chris angemeldet) → 23:35 bereitgestellt/neu gestartet. Messung danach: Modell **3.763 KB, 7 Schriften, image/webp**, Cache-Kopfzeilen korrekt; bedienbar Desktop 7,7 → 6,6–6,9 s (frischer Browser), Handy-Simulation (CPU 4x) 16,2 → 11,1 s.
- Befund: Der Editor wird beim App-Start aus `main` gebaut (`shopify-admin-test-server.mjs` → `build()` → `variant-m/.preview`); Editor-Änderungen gehen also mit Deploy + Neustart live (Übergabe-Notiz „kommt aus der Release“ ist überholt).
- Nächste Schritte: 7 eigene Schriften (3,6 MB) nachladbar machen (Editor `lazy-resources.mjs` + Schrift-Route), Start ohne Proxy-Umweg, CPU im Editor.

## 27.10.2026 · Claude · Vorladen versucht, gemessen, wieder aus

- Chris: „wenn die seite geladen ist, kann der konfi bereits laden“. Geprüft: war nicht aktiv (Fenster erst beim Klick). Gebaut `fb7e5f2` (unsichtbares Fenster nach `load` + Leerlauf, sobald Knopf sichtbar; Datensparmodus nur bei Absicht; Start-Limit 120 → 600/min). Chris' Satz → 22:58 bereitgestellt.
- Live-Messung (Chrome Desktop): Seite 1,8 s, Vorladen ab 2,0 s – nach 10 s war im unsichtbaren Fenster noch nicht einmal das Modell geladen; nach dem Klick ~5 s wie ohne Vorladen. Auch `opacity:0`/1-px-Streifen gebremst. Nutzen null, Kosten ~15 MB je Aufruf.
- `1a8951d` Vorladen-Auslöser entfernt (Schließen behält das Fenster, Start-Limit 600 bleibt). Chris: „Ja, Du darfst das Abschalten des Vorladens bereitstellen und die App neu starten.“ → 23:05 bereitgestellt/neu gestartet; live: kein Start-Abruf beim Seitenaufruf, Klick öffnet Fenster, Kaufknopf aus.
- Nächster Schritt: schlankes Modell (11 MB → Ziel 1–2 MB: nur genutzte Schriften, Materialbild als Datei statt data:-Adresse, Motive bei Bedarf), damit das Öffnen 1–2 s dauert.

## 27.10.2026 · Claude · Konfigurator global live: jede Vorlage, jedes Produkt mit Konfigurator-ID

- Chris: „bitte mach es jetzt universal global auch wenn ich ein neues produkt anlege“. `608ba91` (Merge `3ec1ad0`): `shop-embed.mjs` liest `#gravuru-konfi` (Produkt, Varianten, Rücksprung), setzt „Jetzt personalisieren“ hinter das Kaufformular, wenn die Vorlage keinen eigenen Knopf hat, blendet Kaufknöpfe/Express-Kauf genau dieses Produkts aus (Befund: D8 war bisher ohne Gestaltung kaufbar), übernimmt beim Klick die gewählte Variante. Tests 43/43 gezielt; Live-Simulation auf der Standardvorlage (Türklingel 9×4) inkl. Variantenwechsel.
- Chris: „Ja, Du darfst den globalen Konfigurator-Knopf bereitstellen und die App neu starten.“ → 22:24 Pull/Bereitstellen/Neustart.
- Theme `185833718140`, `sections/footer-group.json`: neuer Abschnitt `custom_liquid_xCyNJV` (Polsterung 0) mit `#gravuru-konfi`-JSON + `<script type="module" src="/apps/konfigurator/shop-embed.mjs">`, nur bei `request.page_type == 'product'` und `custom.customization_id`. Claude eingetragen, **Chris gespeichert 22:29**. Live geprüft: D8 → Daten (5 Varianten), Fenster installiert, 1 Knopf, „In den Warenkorb legen“ ausgeblendet, Klick öffnet Fenster; Türschild 8×2 (ohne Konfi-ID) und Startseite unverändert.
- Neue Produkte: Konfigurator-ID (`custom.customization_id` + Bindung) genügt, Vorlage egal. Die `?fenster=1`-Zeile in `custom_liquid_mTPWzc` ist jetzt überflüssig (harmlos, gleiche Datei).
- Mengenfeld: Chris „ja ausblenden“ → `9f9b3d8` (Mengen-Block `.product__block--quantity_selector` und Mengenfelder der eigenen Kaufformulare). Chris: „Ja, Du darfst das Ausblenden des Mengenfelds bereitstellen und die App neu starten.“ → 22:41 bereitgestellt/neu gestartet, live geprüft (D8: Block markiert, Kaufknopf aus, 1 Knopf; Türklingel ohne Konfi-ID unverändert). Hinweis: Skripte haben `max-age=300` – Änderungen erreichen Browser nach höchstens 5 min.
- Offen: iPhone-Test (Chris).

## 27.10.2026 · Claude · Fenster-Modus im Live-Theme hinter `?fenster=1`, Warenkorbbild mit Material

- Live-Theme `185833718140`, Block `custom_liquid_mTPWzc`: Zeile `<script>if(/[?&]fenster=1(&|$)/.test(location.search))import('/apps/konfigurator/shop-embed.mjs');</script>` (nur Konfi-Produkte). Claude eingetragen, **Chris gespeichert 21:44**. Geprüft: mit `?fenster=1` installiert, ohne nicht → Kunden unverändert.
- Chris (Handy): „im warenkorb ist das schild selbst nicht sichtbar“ – Warenkorbbild war die reine Gravur (schwarz auf transparent), nicht neu. Fix `d068d10` (Merge `8a53ab4`): Einstiegsseite rendert im Fenster-Modus `element.svg()` des Konfigurators (Platte + Material + Gravur wie im Überblick) mit verkleinertem Rohlingbild als JPEG (900 px, ~75 KB, ~0,15 s parallel zur Server-Vorbereitung) und schickt es mit der Übergabekennung; Shop-Seite nimmt nur JPEG/PNG ≤ 1,5 MB, sonst Gravurvorschau. Tests 45/45 gezielt.
- Chris: „Ja, Du darfst das Warenkorbbild mit Material bereitstellen und die App neu starten.“ → 22:03 Pull/Bereitstellen/Neustart. Desktop-Durchlauf: `_Entwurf` = JPEG 900×620 mit Edelstahl-Platte, im Warenkorb sichtbar; eigene Testposition danach entfernt (Chris' Position bleibt).
- Offen: iPhone-Test durch Chris; danach `?fenster=1`-Bedingung entfernen (Chris' OK). Nicht-Fenster-Weg zeigt weiter nur die Gravur.

## 27.10.2026 · Claude · Stufe 2 live auf dem Server (Fenster im Shop noch nicht eingeschaltet)

- Chris: „Ja, Du darfst Stufe 2 (Fenster-Modus) nach erfolgreicher Prüfung bereitstellen und die App neu starten.“ → 21:28 Plesk Pull (`6a3a8d8`), Bereitstellen, „App neu starten“. Prüfung: `/werkstatt/` 200, `/konfigurator/shop/` 200 mit `frame-ancestors https://gravuru-design.myshopify.com`, Model ohne Sitzung 403, `/apps/konfigurator/shop-embed.mjs` über den Shop 200 mit `public, max-age=300`.
- Test nur in Claudes Browser-Sitzung (Skript per Konsole geladen, Theme unverändert), D8 Leuchtturm 12×8: Fenster öffnet, Editor nach ~4–5 s; „In den Warenkorb“ → Nachricht 1,6 s, `data` 0,76 s, `claim` 0,63 s, `cart/add.js` (PNG-Upload) 1,20 s → `/cart` sichtbar nach **5,4 s** (vorher 8,7 s, heute Nachmittag 38,6 s). Position 19,99 € mit `_Entwurf`, `Bearbeiten`, Gravurtext. Testpositionen danach geleert.
- Nächste Hebel: `data`+`claim` zu einem Aufruf (−0,6 s), Warenkorb-Schublade statt Seitenwechsel (−1 s), schlankes Modell fürs Öffnen.

## 27.10.2026 · Claude · Stufe 2: Konfigurator als Fenster auf der Produktseite (geprüft)

- Branch `dev/konfi-schnell-stufe2-20261027-claude` → `main`: `5d54c24` Modell-Cache je fester Revision, `eb4f03b` Fenster-Modus (`/apps/konfigurator/shop-embed.mjs`, Warenkorb direkt per `cart/add.js` ohne Zwischenseite), `d6f6312` Skripte nicht aufs Warenkorb-Limit (Review-Befund R1), Übergabe aktualisiert.
- Prüfung: unabhängiger Review ohne Blocker; gezielte Tests 42/42; voller Lauf 1641/1648 – die 7 Fehlschläge (`editor-additions`, `hole-proximity`, `session-guard`, `ui-event-regressions`) scheitern identisch auf `main` 4a6b327, nicht durch diese Änderung.
- Ohne `embed=1`/Skript unverändertes Verhalten. Live-Editor erlaubt den Shop als Rahmen bereits. Aktivierung im Shop erst nach Test in eigener Browser-Sitzung und Chris' OK (eine Zeile in `custom_liquid_mTPWzc`). Details: [Übergabe](docs/handoffs/2026-10-27-konfi-geschwindigkeit.md).
- Nächster Schritt: Deploy nach Chris' Satz, dann Messung Klick → Warenkorb im Fenster-Modus.

## 27.10.2026 · Claude · Konfi-Geschwindigkeit: Server-Grenzen aufgehoben, Schnell-Korrektur

- Live gemessen D8: „In den Warenkorb“ 38,6 s, davon Server-Sichern 31,5 s. Ursache: CloudLinux-Benutzer `gravuru_werkstatt` auf 1 Kern / 1 GB / **1 MB/s IO** (heute 324 IO-, 135 CPU-, 4 Speicher-Treffer). Chris hat selbst angehoben (400 %, 4G, 50 MB/s, IOPS 4096, EP 50, NPROC 200) → Sichern **1,2 s**, Warenkorb nach 6,2 s.
- Branch `dev/schnelles-sichern-20261027-claude`: Prüfpaket nur mit Ressourcen des Designs (vorher ~12 MB je Klick), importierte Profilschriften beim Sichern zugelassen (vorher 422). Review-Befund (Freigabe ohne Profilauswahl) behoben.
- **Live 19:57–20:05:** `6f0fa2c` (inkl. PR #32) per Plesk Git bereitgestellt – dauerte nach der Limit-Anhebung **unter 30 s** statt ~20 min –, „App neu starten“, Prüfung: `/werkstatt/` 200, Session/Start 401, Webhook-GET 405. D8 mit Schrift „Lato Regular · c3d3cabdb582“ (vorher 422): gesichert in 1,5 s, Warenkorb 22,98 €, `/cart` nach 7,3 s.
- Befund/Plan: [Konfi-Geschwindigkeit](docs/handoffs/2026-10-27-konfi-geschwindigkeit.md). Nächster Schritt: Korrektur aufspielen (Chris' Satz), dann Stufe 2 (Editor-Fenster auf der Produktseite, direkter Warenkorb).

## 27.10.2026 · Claude · PR #32 gemergt (Repo = Live-Stand), Nachträge an Astra

- PR #32 geprüft (unabhängiger Review ohne Blocker) und als `cf13fd3` nach `main` übernommen. Konflikte mit der Funkklingel-Umstellung gelöst (`contract.mjs` beide Importe, `STATUS.md`). Voller Testvergleich in der Cloud (ohne Python/Druck): `main` 1609/1746, zusammengeführt 1634/1770, kein zusätzlicher Fehlschlag.
- Live bestätigt (nur lesend): vier Theme-Dateien im MAIN-Theme `185833718140` MD5-gleich mit dem Repo; Gedenktafel-Vorschau liefert den Bearbeiten-Patch (`parentOrigin` per Allowlist geprüft). Host-Code ist der Funkklingel-Stand von `main` (`shop-entry-client.mjs` = `3fa1c06`ff.). **Kein Deploy** mit diesem Merge.
- `7e4a55f`: 26 Dateien auf LF normalisiert (CRLF aus Codex-Commits trotz `.gitattributes`).
- Nachträge an Astra (eigener PR): Rabatt → doppelte Warenkorbzeile (`final_line_price`), klare Meldung bei Fehler nach Hinzufügen, Menge 2/3/5 end-to-end, Import-Test vor `--apply`.