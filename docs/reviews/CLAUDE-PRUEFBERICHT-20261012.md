# Claude-Prüfbericht · Gravuru 2027

Datum: 12.10.2026 · Prüfer: Claude (unabhängig von Codex) · Art: Code- und Testprüfung in isolierter Umgebung. **Keine Live-Abnahme, keine Maschinenabnahme.**

---

## 1. Geprüfter Stand und Umfang

| Gegenstand | Festgestellt |
| --- | --- |
| Repository | `Chris83638w/gravuru-2027` (privat, über die GitHub-Anbindung der Sitzung geklont) |
| Branch | `task/claude-overview-20261012` |
| Geprüfter HEAD | **`4e2713bff6e66b404531e011b14c56c8370a66c5`** – bestätigt |
| Installierter Anwendungscode | `7a168bc66adc…` ist Vorfahr von HEAD. `git diff 7a168bc HEAD -- app ops` ist **leer**: die geprüfte Anwendung ist byteidentisch mit dem installierten Code. Die drei Folgecommits ändern nur Doku/Nachweise. |
| Installationspaket | `gravuru-merchant-steel-ink-tabs-20261011.zip`, 28.666.379 Byte, SHA-256 `bbe80f53…ca51` **nachgerechnet und bestätigt**. 425 Manifestdateien + Manifest, 0 Größen-/Hash-Abweichungen. 421 Dateien bytegleich zu `7a168bc`; Abweichungen nur erzeugte Dateien (`package.json`, `app.cjs`, `INSTALLATION.md`, `robots.txt`). |
| `main` | nicht geprüft (wie vorgegeben) |

**Umfang:** Projektüberblick, AGENTS, START_HERE/STATUS (jüngste Abschnitte), UMSETZUNGSPAKETE, NEUE-WERKSTATT-PLAN (Gliederung), MATERIALREFERENZEN, Release-Berichte 10./11.10.; Quellcode unter `app/` und `ops/` in fünf Fachbereichen; vollständige Testsuiten; gezielte Reproduktionsskripte; lokaler Server mit frischen Testdaten und Headless-Browser (Chromium/Playwright) für den Händler-Editor.

**Nicht geprüft / nicht erreichbar:** Live-Host, echte Shopify-Anmeldung, aktuelle private Datenbanken, OpenAI, reale Maschinen/RIP. Nicht vorhanden: `GT1E86_1.PDF`, `GT-S-2_2.PDF` (im Repo nur in Berichten erwähnt), native Charlotte-Groner-v4-Quelle, reine Schiefer-Rohlingreferenz, Google Drive.

**Kennzeichnung in diesem Bericht:**
**[C]** Code vorhanden · **[L]** lokal mit echten Komponenten getestet · **[S]** synthetisch/gemockt · **[Live]** live belegt (nur laut Codex-Bericht, von mir nicht nachprüfbar) · **[N]** nur Nutzerbestätigung · **[O]** offen/fehlt. Bei Befunden: **„selbst verifiziert"** = von mir im Code bzw. per Ausführung bestätigt; **„reproduziert"** = durch Teilprüfung per Skript/Browser nachgestellt.

---

## 2. Gesamtbewertung

Der Entwicklungsstand ist **solide und weiterbaubar**. Eine Neuentwicklung ist nicht begründet. Die Grundarchitektur ist sauber: Revisionen mit Konfliktprüfung in SQLite-Transaktionen, unveränderliche Originale und Bestellstände per Datenbank-Trigger, saubere Shopify-Sitzungsprüfung, CSRF/Origin-Schutz, Webhook-HMAC über den Rohinhalt, Preise ausschließlich serverseitig, kein Pfad setzt ein Shopify-Produkt öffentlich. Alle **769 vorhandenen Tests bestehen**.

Aber: **Die Tests bestätigen überwiegend die Implementierung, nicht den Nutzerablauf.** Mehrere vom Nutzer wiederholt gemeldete Bedienfehler sind im aktuellen Code weiterhin nachweisbar, und keiner der Tests deckt sie ab:

- Überlagerte Elemente sind auf der Arbeitsfläche nicht anklickbar (erklärt „nach PDF-Import nicht auswählbar").
- Edelstahl-Vektorgravur ist nur in der Händlervorschau schwarz; in der **Kundenansicht grau**, in der **Gravur-Fertigungsdatei werden weiße Flächen und Fotos schwarz**.
- „Ragt über die Gestaltungsfläche hinaus" tritt beim Weg über vorbereitete Designpakete auf Stahl weiterhin auf.
- Ein versteckter Standardrand (2 mm, bei Acryl 4/10 mm) existiert außerhalb des Stahl-Importdialogs weiter.

Außerdem unterscheiden sich die drei Produktpfade (nativ, Formprodukt, AOSU) stärker, als die Dokumentation erkennen lässt. Hilfslinien, Musterfoto, Rückgängig/Wiederholen und Aufbereitung in Bestandteile gibt es **nur im nativen Pfad**. AOSU hat **keine** Fertigungsausgabe.

**Kurz:** Händlerwerkstatt für native Produkte = gut nutzbar mit bekannten Bedienfehlern. Fertigung, öffentliche Verkaufsstrecke, AOSU und Formprodukt-Gestaltung = **nicht freigabefähig**.

---

## 3. Soll-/Ist-Matrix

| # | Anforderung | Ist | Status |
| --- | --- | --- | --- |
| 1 | Produkt/Master: anlegen, kopieren, speichern, wiederöffnen, Verlauf, Wiederherstellen, Archiv; nichts überschreiben | Vollständig vorhanden. Revisionsprüfung bei allen Mutationen innerhalb `BEGIN IMMEDIATE`; Kopie aus Master unabhängig. Kein Überschreibfehler gefunden. | [C][L] ✅ · kleine Mängel (A-1, A-6) |
| 2 | Übersicht für Tausende Produkte | Serverseitige Paginierung, Filter, Suche (injektionssicher), stabile Sortierung. 3.000 synthetische Produkte getestet. Mängel: Auswahl nur je Seite, Umlaut-Sortierung, Filterzähler, „Aus Master" und Profilvorschau laden den ganzen Bestand. | [C][L] ⚠️ |
| 3 | Editor: Tabs, Elemente, Hilfslinien, Einrasten, mm, Undo/Redo, Maus/Touch/Tastatur | Nativ weitgehend vorhanden. **Überlagerte Elemente nicht greifbar (B-1)**, Undo erfasst Designverwaltung nicht, Entf-Taste ohne Wirkung, Neuladen verliert Entwurf, keine Hilfslinien beim Skalieren. Touch nur im Code. Formprodukt-Händlereditor nur Dialog ohne Fläche/Undo/Hilfslinien. | [C][L] ⚠️ · Touch [C] · Form [O] |
| 4 | PDF/SVG-Import | Originale bytegleich erhalten. Einheiten korrekt. Aufbereitung in Bestandteile nur nativ. **Mängel:** Einpassung nach Seitenrahmen statt Inhalt, Rechteck-in-Oval-Logik (70,7 %), versteckter 2-mm-Standard, vorbereitete Pakete auf Stahl mit Acrylbereich. Kein ausdrücklicher Hinweis auf PDF-Teilschriften; Hinweis zu flachen Bildern vorhanden. | [C][L] ⚠️ |
| 5 | Fotos: Musterfoto + Hinweis, Maske/Ausschnitt erhalten | Nativ: Musterfoto mit Hinweis, Originalmaske serverseitig geschützt. **Ausschnitt wird beim Ersatz nicht übernommen** (immer mittig). **Formprodukte: graue leere Fotobox.** | nativ [C][L] ⚠️ · Form [O] |
| 6 | Schriften/Motive, Kundenrechte | TTF/OTF-Upload, Profile, Zuordnung vorhanden. **Upload prüft keine Umlaute/ß/€.** Händler wird durch Kundensperren nicht blockiert ✅. Server prüft Kundenrechte für Ändern/Verschieben/Löschen/Maske ✅, **aber nicht neue Elemente und Reihenfolge**. | [C][L] ⚠️ |
| 7 | Geometrie/Darstellung | Rohling/Szene getrennt (Rohling nur Stahl/Schiefer). Stahlgröße/Form, Varianten-Geometrie und -Preise aus einem Stand ✅. **Schwarz nur in Händlervorschau**; Kunde grau, Formprodukt tonwertabhängig, Fertigungsdatei überschwärzt. Auswahlrahmen/Hilfslinien nicht im Export ✅. | [C][L] ❌ beim Schwarz |
| 8 | Vorhandene Muster | Acryl, Schiefer, AOSU, Stahl als Master/Produkt angelegt. Stahl-Heimathafen ≠ Charlotte-Groner-Referenz (bewusst, dokumentiert). Siehe Abschnitt 7. | [C] · Live laut Codex · [N] teilweise |
| 9 | Produkttypen getrennt | Nativ = Hauptpfad. Formprodukte = eigener, deutlich ärmerer Editor. AOSU = nativer Editor, **keine Fertigungsausgabe** (gesperrt mit 422). | ⚠️ / [O] |
| 10 | Shopify | JWT-Prüfung korrekt (aud, iss/dest, Signatur, 10 s Toleranz). CSRF/Origin ✅. Entwurf fest `DRAFT`, kein ACTIVE-Pfad ✅. Preise serverseitig ✅. Webhook HMAC, Duplikate, Testfilter ✅. **Fehler:** Storno/Erstattung nicht empfangbar; eine fehlerhafte Position verwirft ganze Bestellung; Übertragung kann dauerhaft hängen. Medien, Update bestehender Entwürfe, öffentlicher Checkout fehlen. Statische Quellen ohne Anmeldung abrufbar. | [C][L] Auth · Shopify-Netz [S] · Testkauf [Live] |
| 11 | Bestellungen/Fertigung | Unveränderliche Stände mit Medienkopie und Profilrevision ✅. RDG_WHITE/CutContour, Textpfade ✅. **Gravurdatei schwärzt Weiß/Fotos (P1).** Spiegelung nicht serverseitig erzwungen. Foto < 300 dpi nur Warnung. `productionReady` ist überall fest `false`, ein Freigabeprozess fehlt. **AOSU-Ausgabe fehlt.** | [C][L] ❌ |
| 12 | Excel/Stapel | Vorlagen, Dry-run, Fehler je Zeile, Wiederaufnahme, `expected_revision`, `import_key`, ZIP-Sicherheit (Slip, Bomb, Symlink) – Fall 100/3 → 97/3 getestet ✅. Duplikate nur über gleichen Schlüssel verhindert. | [C][L][S] ✅ |
| 13 | KI | Reservierung vor Aufruf, atomar; feste Preistabelle, 2 €/USD vorsichtig; Whitelist schützt Preise/Geometrie/Rechte; ausdrückliche Übernahme ✅. **Fehler:** Reserven bei Fehler/Abbruch werden nie freigegeben; ein `cost_review` sperrt die KI dauerhaft. Kein Plugin-Bezug in der Laufzeit ✅. | [C][S] · echte Aufrufe [Live] laut Codex |
| 14 | Sicherung/Installation | Paket/Prüfsummen bestätigt; Staging mit Zip-Slip-Schutz; Aktivierung mit Sperre, Backup, atomarem Tausch ✅. Keine Geheimnisse/Datenbanken im Repo gefunden. **Fehlen:** Restore- und Rollback-Skript, Tests für Staging/Snapshot, Drive, nachgewiesene externe Regelsicherung. | [C][L] ⚠️ |

---

## 4. Bestätigte Fehler nach Priorität

### P1 – vor weiterer Nutzung bzw. vor jeder Fertigung beheben

**P1-1 · Gravur-Fertigungsdatei graviert weiße Flächen und Fotos vollflächig schwarz** — *selbst verifiziert (Code), reproduziert (Pixelmessung)*
- **Ort:** `app/workshop/acrylic-artwork.mjs:53` setzt bei Gravur `data-native-tint`; `app/workshop/form-print-worker.py` → `tint_imported_artwork()`: neue Fläche in voller Farbe, nur der Alphakanal der Quelle bleibt.
- **Reproduktion:** SVG mit weißem Hintergrund und grauem Rechteck durch `tint_imported_artwork` → Ecke und Mitte jeweils RGBA (0,0,0,255).
- **Auswirkung:** Ein PDF mit weißem Seitenhintergrund wird als schwarze Vollfläche graviert; Fotos werden Silhouetten. Die Vorschau (`studio-svg.mjs`) zeigt dagegen Weiß als Aussparung. **Vorschau und Fertigung widersprechen sich.**
- **Kleinste Korrektur:** Alpha aus Helligkeit bilden, `alpha·(1−lum)` wie im selben Worker bei Logos (`nativeTint`). Für reine Vektorquellen dieselbe Schwelle wie die Vorschau nutzen. Pixeltest „weiß bleibt frei" ergänzen.

**P1-2 · Überlagerte Elemente sind auf der Arbeitsfläche nicht auswählbar** — *selbst verifiziert (Code), reproduziert (Browser)*
- **Ort:** `app/platform/sources/app/shared/models/studio-svg.mjs:88` legt je Element ein transparentes Rechteck in voller Größe an; `ui/editor.css` setzt `#editor-preview [data-object]{pointer-events:all}`.
- **Reproduktion:** PDF mit Text und seitengroßem Rahmen importieren → Klick auf den Text wählt den Rahmen, Ziehen verschiebt den Rahmen.
- **Auswirkung:** Genau der gemeldete Fehler „Elemente nach PDF-Import nicht auswählbar/verschiebbar". Nur über die Elementliste umgehbar.
- **Kleinste Korrektur:** Transparentes Trefferrechteck nur für das ausgewählte Element aktiv; sonst `pointer-events:visiblePainted` auf den Inhalt. Optional: erneuter Klick wählt das darunterliegende Element.

**P1-3 · Kundenansicht zeigt Edelstahl-Vektorgravur grau statt schwarz** — *selbst verifiziert (Code)*
- **Ort:** `app/configurator/variant-m/adapter.mjs:22` – `motifs()` übernimmt `vectorOnly` nicht; `studio-svg.mjs:48` setzt Schwarz nur bei `vectorOnly===true`.
- **Auswirkung:** Händler sieht Schwarz, Kunde sieht Grau – der gemeldete Fehler „grau statt schwarz" ist für Kunden nicht behoben.
- **Kleinste Korrektur:** `vectorOnly: local.get(key)?.vectorOnly===true` in `motifs()` übernehmen; Test für die Kundenansicht ergänzen.

**P1-4 · Vorbereitete Designpakete benutzen auf Stahl den Acryl-Gestaltungsbereich** — *selbst verifiziert (Code), reproduziert (Skript)*
- **Ort:** `app/workshop/prepared-design.mjs:22` – alles außer Schiefer nutzt `ACRYLIC_SAFE_AREA` (4–146 × 4–190 mm).
- **Reproduktion:** Stahl 90 × 60 mm, Paket 150 × 200 mm → „Element ragt über die Gestaltungsfläche hinaus."
- **Auswirkung:** Der gemeldete Fehler besteht auf diesem Weg fort. Der normale SVG/PDF-Import ist korrekt.
- **Kleinste Korrektur:** `designArea(config)` aus `design-area.mjs` wiederverwenden.

### P2 – wichtig, als nächste Pakete

| ID | Befund | Ort | Nachweis | Kleinste Korrektur |
| --- | --- | --- | --- | --- |
| P2-1 | **Versteckter Standardrand:** `safeMarginMm??2` an ≥8 Stellen; neue Universalprodukte mit 2 mm angelegt; Randfeld nur bei Stahl, Schiefer/Universal lehnen `marginMm` ab. Acryl fest 4/4/4/**10 mm unten** auch ohne Sockel. | `design-area.mjs:8`, `studio-products.mjs:6/30`, `design-import.mjs:13`, `acrylic-product.mjs:21` | gelesen, gezählt | Standard 0, Randfeld für alle nativen Platten; Acrylbereich je Sockeloption |
| P2-2 | **Einpassung nach Seitenrahmen**, nicht nach sichtbarem Inhalt → Weißraum wirkt wie Sicherheitsrand | `design-converter.py:407` | reproduziert | Inhaltsgrenzen (schon in `editable_parts` berechnet) optional für Gesamteinpassung |
| P2-3 | **Ovales Motiv auf ovalem Schild nur 70,7 %** – Rechteck der Grafik gegen Ellipse geprüft | `fittedArtwork`/`objectIssue` | reproduziert | Tatsächliche Außenkontur der Grafik prüfen bzw. Einpassmodus wählbar |
| P2-4 | **Formprodukte: leere graue Fotobox**, kein Musterfoto, kein Hinweis, kein Fotoersatz | `form-designs.mjs:61` | selbst verifiziert | Musterfoto-Mechanik des nativen Pfads anbinden |
| P2-5 | **Ungespeicherte Änderungen gehen beim Neuladen verloren** (nur `beforeunload`) | `ui/app.mjs:355` | reproduziert (Browser) | Entwurf je Produkt/Revision in `sessionStorage`, Wiederherstellung anbieten |
| P2-6 | **Rückgängig nimmt Designverwaltung still mit** (Kopieren/Löschen/Sortieren/Standard/Rechte ohne `remember()`) | `ui/app.mjs` `changeDesign` ab 168 | reproduziert (Browser) | `remember()` bzw. `resetHistory()` in diesen Pfaden |
| P2-7 | **Server lässt neue Kundenelemente und geänderte Reihenfolge zu** (native Produkte); gesperrte Inhalte überdeckbar | `product-model.mjs:132–155` | reproduziert (HTTP 200) | Ergänzungsregel je Design wie `additions` bei Formprodukten; Vorlagenreihenfolge erzwingen |
| P2-8 | **Storno/Erstattung erreichen den Bestand nie**; Kundendownloads bleiben nach Erstattung offen | `shopify-order-webhook.mjs:33` ruft immer `verifyPaidWebhook`; Registrierung nur `ORDERS_PAID` | selbst verifiziert, reproduziert (422) | Nach Topic verzweigen; `ORDERS_UPDATED/CANCELLED` registrieren |
| P2-9 | **Eine ungültige Position lehnt die ganze Bestellung ab** (422) → gültige Positionen verloren, Shopify-Wiederholungen, Abo-Risiko | `order-intake.mjs:162–172` | reproduziert | 200 bestätigen, Bestellung als „Prüfung nötig" protokollieren |
| P2-10 | **Shopify-Entwurfsübertragung hängt dauerhaft**, wenn schon der erste Lookup scheitert (Zustand `unknown`, Create und Reconcile je 409) | `shop-draft-transfer.mjs:125–137` | Zustandsfolge reproduziert | Zustand „vor Mutation fehlgeschlagen" mit erlaubtem Neuversuch |
| P2-11 | **KI-Reserven werden nie freigegeben** (Fehler, 429, Abbruch, Neustart): 23 Fehlversuche sperren das Monatsbudget bei 0 € Kosten | `ai-design-jobs.mjs:18/23/46/76` | selbst verifiziert, reproduziert | Bei HTTP-Fehlerantwort/Abbruch vor `fetch` `charged_cents=0`; Betreiberwerkzeug zur Kostenklärung |
| P2-12 | **Ein `cost_review` sperrt die KI für immer**, monatsübergreifend, ohne Auflösungsweg | `ai-design-jobs.mjs:27` | selbst verifiziert | wie P2-11 (Kostenklärung setzt Status/Kosten) |
| P2-13 | **Schriftupload prüft keine Umlaute/ß/€** – Schrift ohne Umlaute wird angenommen | `font-import.py:21` | reproduziert | Pflichtzeichen prüfen oder Warnung + gespeicherte Abdeckung |
| P2-14 | **Fehlerhaftes Produkt blockiert Start** beim Katalog-Neuaufbau; Index ohne Logik-Version | `product-catalog.mjs:12–14`, `repository.mjs:82` | reproduziert | Fehler je Produkt abfangen; Indexversion einführen |
| P2-15 | **„Aus Master erstellen" und Profilvorschau laden den gesamten Bestand mit vollen Dokumenten** | `ui/app.mjs:323`, `repository.mjs:253`, `profile-impact.mjs:4` | gelesen | `catalog=1&kind=master` seitenweise; SQL-Projektion ohne Dokument |

### P3 – klein, bei Gelegenheit

- **Sammelauswahl** geht beim Blättern still verloren (`product-overview-ui.mjs:38`); Kategorie-Dialog zeigt nur die Anzahl und meldet danach fälschlich „zwischenzeitlich geändert" (`catalog-ui.mjs:112`).
- **Sortierung** Umlaute hinter Z (`product-catalog.mjs:26`); **NFD-Suche** findet „Müller" nicht; **Filterzähler** ignorieren andere Filter.
- **Entf/Rücktaste** löschen auf der Fläche nichts (`product-editor-ui.mjs:346`); ungültiges Panelfeld blockiert Auswahl/Ziehen; keine Hilfslinien beim Skalieren; „+ Fotofeld" erbt Beispielfoto eines beliebigen Designs (`:239`).
- **Importvorschau** immer Rechteck mit 2 mm Radius (`design-import-ui.mjs:119`); Randabstand wächst mit Größenvariante (`steel-formats.mjs:23`).
- **Statische Quellen** (`/workshop-ui/*.mjs`, Server-Quelltext, 20-MB-Katalog, Lizenzdaten) ohne Anmeldung abrufbar – keine Geheimnisse gefunden, aber unnötige Offenlegung.
- **Kunden-Downloads** im ausgerollten Runtime durch Händler-JWT-Pflicht unerreichbar (`merchant-runtime.mjs:335`).
- **Aktivierungsskript:** Abbruch lässt `app.cjs.<commit>.new` liegen, nächster Lauf scheitert; `STAGE-RECEIPT.activated` wird nie gesetzt (`activate-merchant-release.py:184`).
- **Testumgebung:** Einzelne Tests nutzen `python3` bzw. relative Pfade statt `GRAVURU_PYTHON`; Ops-Tests brauchen `GRAVURU_MERCHANT_TEST_PYTHON`. Nicht im Startdokument erklärt.

---

## 5. Risiken, fehlende Funktionen, fehlende Nachweise

**Risiken (nicht als Fehler bewiesen)**
- Spiegelung ist serverseitig standardmäßig `false` und hängt am Fertigungsprofil bzw. der Client-Einstellung → Fehlbedienung ergibt seitenverkehrten Acryldruck.
- Ein Musterfoto gelangt in die Fertigungsdatei, wenn kein Kundenfoto hochgeladen wurde, auch bei Pflicht-Fotofeldern.
- Schwelle für Stahl-Schwarz macht auch sehr helles Grau voll schwarz.
- Händler darf Acryl im Sockelbereich (y=196 mm) speichern, Kundenbereich ist 4–190 mm. Wechselwirkung mit Kundenrechten ist ungeklärt.
- Shopify-Varianten-IDs werden ohne Pflicht-Abgleich gebunden; Fehler fallen erst bei Warenkorb/Webhook auf. Ein Warenkorb-Journal kann nach Absturz bis zur nächsten Entwurfsänderung sperren.
- Jeder Shop-Mitarbeiter mit App-Zugang hat vollen Werkstattzugriff.
- Doppelte Stapelanlage, wenn dieselben Zeilen mit neuen `import_key` erneut importiert werden.
- Bildmodell-Preise (`gpt-image-1.5`) nicht gegen Quelle geprüft; Wechselkurs fest 2 €/USD (bewusst vorsichtig). Tarifprüfung läuft **10.11.2026** ab.
- Betrieb mit exklusiver Datensperre, kein Mehrprozessbetrieb.
- PyMuPDF steht unter AGPL bzw. kommerzieller Lizenz; Schrift- und Bildrechte sind nicht vollständig belegt.

**Fehlende Funktionen**
- AOSU-Fertigungsausgabe (Stahlträger + Acryl getrennt).
- Echter Produktionsfreigabeprozess (`productionReady` nie `true`).
- Shopify: Medienübertragung, Aktualisierung bestehender Entwürfe, öffentliche Verkaufsbindung/Checkout, Storno-/Erstattungsempfang.
- Formprodukte: Flächeneditor, Undo, Hilfslinien, Musterfoto, Aufbereitung importierter PDFs.
- Fotoausschnitt beim Händler-Fotoersatz.
- Auswahl über Seiten hinweg; Kategorieverwaltung.
- Restore-/Rollback-Skript; KI-Kostenklärungswerkzeug; Google-Drive-Anbindung.

**Fehlende Nachweise**
- Echter angemeldeter Klickablauf im Shopify-Rahmen. Alle Browserprüfungen von Codex nutzen eine **gemockte App Bridge** mit synthetischem Token.
- Touch-Bedienung auf realem Gerät.
- Vertragstest gegen das echte Shopify-Schema (alle Shopify-Netzpfade nur mit `fetch`-Mocks).
- Physische Gravur-/Druck-/RIP-/ICC-Proben.
- Lasttest mit Tausenden realen großen Produkten.
- Aktuelle Live-Datenbank und tatsächlich aktive Version auf dem Host (Release-Bericht: OpenAI-Aktivierung bei 060a10b; aktueller Host laut Codex 7a168bc – von mir nicht prüfbar).
- Originaldateien `GT1E86_1.PDF`, `GT-S-2_2.PDF`, Charlotte-Groner-Quelle, Schiefer-Rohling.

---

## 6. Tatsächlich ausgeführte Tests

Umgebung: eigene Arbeitskopie, Node **24.21.0** (wie Server), Python 3.13 in eigener venv mit den gepinnten Abhängigkeiten, eigenes `HOME`/`TMPDIR`, frische Datenverzeichnisse, keine Netzzugriffe auf Shopify/OpenAI/Live-Host. Arbeitskopie danach unverändert (`git status` leer).

| Lauf | Ergebnis |
| --- | --- |
| `npm test` (variant-m + workshop) | **701/701 bestanden**, 0 Fehler, 910 s. Ein erster Lauf brach wegen fest eingetragenem `python3` ab; das ist ein Umgebungsproblem, kein App-Fehler. |
| `ops/plesk` + `ops/shopify` Node-Tests | **55/55** (nach Setzen von `GRAVURU_MERCHANT_TEST_PYTHON`) |
| `activate-merchant-release.test.py` | 5/5 |
| `verify-extension-release.test.py` | 8/8 |
| **Summe** | **769 Tests, alle grün.** Codex nannte 727; die Zählweise ist abweichend, aber kein Widerspruch zum Ergebnis. |
| Gezielte Einzelläufe durch Teilprüfungen | u. a. repository/catalog 38, editor/rights 17, Import/Stahl 32, Shopify/Bestellung ~130, Stapel/KI 116 – alle grün |
| Reproduktionsskripte | Revisions-Randfälle, Katalog-Umlaute/Filter, Index-Neuaufbau, Fertigungs-Pixel (P1-1), vorbereitetes Paket auf Stahl (P1-4), Oval-Einpassung, Schrift ohne Umlaute, gefälschte JWTs (aud/dest/alg none/Zeit ±), Webhook (Duplikat, anderer Body, neu serialisiert, Preis, `test:false`, Erstattung), Path-Traversal (alle 404 ✅), KI-Budget mit 429-Provider |
| Headless-Browser gegen lokalen Server | Auswahl/Ziehen/Überlagerung, Tabwechsel, Neuladen, Undo nach Designverwaltung, Entf-Taste, ungültiges Feld, Hilfslinien beim Verschieben/Skalieren |

**Bewertung der Tests:** Gut auf Repository-, Sicherheits- und Webhook-Ebene. Schwach beim tatsächlichen Nutzerablauf: Keiner der P1-Fehler wird von einem Test erfasst. Es gibt keine Tests für Kundenansicht-Farbe, Weiß in der Gravurdatei, vorbereitete Pakete auf Stahl, überlagerte Elemente, Neuladen, Formprodukt-Fotos, Umlaute oder kombinierte Filter. Der Testdatensatz für 3.000 Produkte nutzt nur ASCII-Namen.

---

## 7. Vorlagentreue und Bedienbarkeit

| Muster | Abgleich | Bewertung |
| --- | --- | --- |
| Acryl „Unser Anfang" | Sockelbilder und Referenzarchiv vorhanden; Preise 1499/1999 + Sockel/Wandhalter laut Tests korrekt (28 Kombinationen) | Funktional treu. Offene Schrift-/Lichtabweichungen laut `design-qa.md` bestehen weiter (nicht neu geprüft). |
| Schiefer-Gedenktafel mit Foto | Original-PDF `GT-S-2_2.PDF` **nicht im Repo**; nur Berichte/Screenshots | Nicht unabhängig vergleichbar. Bewusste Abweichung: Cormorant Garamond statt Edwardian-Teilmenge (Nutzerentscheidung, dokumentiert). |
| AOSU/Labrador | Quelle `app/designs/aosu-labrador` mit Inventar/Provenienz; Editor-Screenshot vorhanden | Gestaltung editierbar. Screenshot zeigt noch die **alte horizontale Designleiste** (vor den Tabs) – der Nachweis ist älter als 7a168bc. Fertigung fehlt. |
| Edelstahl/Heimathafen | Zwei native Designs aus `gravuru-shopify` (Commit d345359, SHA im JSON) vs. Referenzbild Charlotte Groner v4 | **Deutliche Abweichung:** Referenz mit gerundeten Ecken, anderem gestreiften Leuchtturm, Text „Heimathafen von …". Native Muster 90 × 60 mm, Ecken 0 mm, anderes Leuchtturm-/Ankermotiv. Ist korrekt als „keine identische Rekonstruktion" dokumentiert. Die Kundenansicht zeigt das Leuchtturmmotiv im Screenshot schwarz; bei grauen Vektorimporten greift P1-3. |

**Bedienbarkeit:** Die Händleroberfläche ist klar gegliedert (Produkt / Designs & Elemente / Optionen / Schriften / Hintergrund / Fertigung / Shopify), Freigaben je Element verständlich beschriftet, mm-Felder vorhanden. Die wiederholt gemeldeten Probleme sind teilweise echt und noch vorhanden (P1-2, P1-3, P1-4, P2-1, P2-5). Ein **dicker weißer Auswahlrahmen** war im aktuellen Code **nicht reproduzierbar** (blauer 1,5-px-Rahmen, weiße Griffe). Formprodukte sind für den Händler deutlich schwerer zu gestalten (nur Dialoge).

---

## 8. Nächste Arbeitsschritte (Reihenfolge)

1. **Fertigungsfarbe korrigieren (P1-1)** + Pixeltest „Weiß bleibt frei / Foto behält Tonwerte" in der Gravurdatei. Bis dahin keine Gravurdatei aus importierten Designs verwenden.
2. **Stahl-Schwarz in Kundenansicht (P1-3)** und **Acrylbereich bei vorbereiteten Paketen (P1-4)** – je eine Zeile plus Test.
3. **Treffer-Logik auf der Arbeitsfläche (P1-2)** + Browsertest mit überlagerten PDF-Elementen.
4. **Randlogik vereinheitlichen (P2-1/2/3):** Standard 0 mm, Randfeld für alle nativen Platten, Acrylbereich je Sockel, Option „nach Inhalt einpassen".
5. **Editor-Robustheit (P2-5/6, P3 Entf):** Entwurfssicherung bei Neuladen, vollständiger Undo-Verlauf.
6. **Kundenrechte serverseitig vervollständigen (P2-7).**
7. **Bestelleingang absichern (P2-8/9/10):** Topic-Verzweigung, Teilannahme statt 422, Neuversuch der Übertragung.
8. **KI-Betrieb (P2-11/12):** Reservefreigabe bei Fehlern, Kostenklärungswerkzeug; Tarifprüfung vor dem 10.11.2026 erneuern.
9. **Schriftabdeckung (P2-13)**, Katalog-Start/Last (P2-14/15), P3-Sammelpunkte.
10. **Echte Bedienabnahme im Shopify-Rahmen** durch den Nutzer mit einer festen Checkliste je Produktpfad (nativ, Form, AOSU), danach erst Formprodukt-Fotos (P2-4) und AOSU-Ausgabe.
11. **Restore-/Rollback-Skript** mit Probe-Wiederherstellung in getrennter Umgebung; Drive-Anbindung.
12. **Produktionsabnahme** mit realen Proben, danach ein ausdrücklicher Freigabeprozess (`productionReady`).

Jeder Schritt sollte einen Test enthalten, der den **Nutzerablauf** prüft, nicht nur die Funktion.

---

## 9. Freigabe

**Kann freigegeben werden (für die weitere Arbeit der Händlerwerkstatt):**
- Produkt-/Masterverwaltung, Revisionen, Wiederherstellung, Archiv und Konfliktschutz.
- Sitzungsprüfung, CSRF/Origin-Schutz und Sperre privater APIs.
- Shopify-Entwurfsanlage als `DRAFT` (kein Veröffentlichungspfad).
- Signierter Eingang bezahlter Testbestellungen samt Duplikatschutz; unveränderliche Bestellstände.
- Excel-/Stapelimport.
- Installationspaket und Aktivierungsablauf.
- Native Gestaltung mit den bekannten Einschränkungen (Elementliste statt Klick bei Überlagerung nutzen; vor Neuladen speichern).

**Noch nicht freigeben:**
- **Fertigungsdateien für Gravur aus importierten Designs** (P1-1) und generell jede Maschinen-/RIP-Nutzung ohne reale Probe.
- **Öffentliche Verkaufsstrecke/Checkout** (nicht vorhanden; Storno/Erstattung nicht empfangbar).
- **Stahlprodukte in der Kundenansicht** (P1-3).
- **AOSU-Fertigung** (nicht vorhanden).
- **Formprodukte für Kunden mit Fotofeld** (leere Fotobox).
- **KI im Dauerbetrieb** ohne Reservefreigabe (Budget kann durch Störungen blockieren).
- **Wiederherstellung im Notfall** gilt als unbewiesen, bis eine Probe-Wiederherstellung dokumentiert ist.
