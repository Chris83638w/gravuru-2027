# Übergabe Mika → Astra 1: #230 B/C und #233 Katalog

Stand: 11.11.2026. Nutzerauftrag in diesem Chat: **„dann gib die Arbeiten an Astra 1“**. Mika stellt die weitere Ausführung ein. Diese Datei ist eine Übergabe, keine Behauptung, dass Astra den Auftrag bereits gelesen oder angenommen hat.

## Zuständigkeit und Grenzen

- Aktueller Auftrag: #230 B (sieben Excel-/Produktplan-Paare lokal) und C (Designsuche als Plan und echte lokale Vorschau), zusätzlich ausdrücklich beauftragtes Katalog-Vorspulen aus #233.
- **A / Server-App-Code bleibt beim Operator Claude.** Keine App-Dateien installieren, keinen Neustart, keine Shopify-/DB-/Produktbindungsänderung aus diesem Auftrag ableiten.
- Freigegebener R15-Aufbau, Designs, Preise und bestehende Produktbindungen bleiben erhalten. Kein neuer Konfi je Produktgruppe.
- Keine fremden Änderungen zurücksetzen. Bei fehlenden tatsächlichen Voraussetzungen stoppen und diese konkret benennen.
- Aktueller Operatorstand und Installationsfenster: [#233, Ergebnis 6781907100](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6781907100). Mika hatte das Katalogfenster in [6791980087](https://github.com/Chris83638w/gravuru-2027/issues/233#issuecomment-6791980087) übernommen; mit dieser Übergabe erfolgt keine weitere parallele Mutation durch Mika. Vor Fortsetzung neu abgleichen.

## 1. #233: Paket übertragen, noch KEIN Fast-Forward

Serverroot: `/var/www/vhosts/gravuru-designwerkstatt.de/private/issue139-katalog-20261102`.
Branch: `issue139-catalog-20261102`.
Zuletzt tatsächlich zurückgelesener HEAD: `b5d8f28bc1b634412e628c2967fde587a92ff2fb`.
Beauftragtes Ziel: `8236b8bfab7322447ec46661c116fa526331af3d`.

Drei lokale Werkstattänderungen sind zwingend zu erhalten:

| Datei relativ zum Katalogroot | Gepinnter lokaler SHA256 |
|---|---|
| designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D20/design.json | 76f98afaf4b8517a4f6698513726967cd7f8f950868fe8448651f608f146e1a2 |
| designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D20/design.svg | e809e7b9c93614813e9c0188ea2b508b8890ee2a4eea62a6bb0dffd726c5c20d |
| designs/edelstahl-gravur-oval-90x60/_aenderungen.jsonl | 4ef0a817119ba8395a1fd9849ceb68b4d78d8cf1bbd1d26cc8a1b416ad1254b3 |

Das D20 enthält eine echte lokale Bearbeitung (Josef Leitner, Motivposition/Layer-IDs, Freigaben wieder offen). Nicht durch Git-Version ersetzen. Ziel fügt dort Mindestfläche/-größe hinzu. Audit-Ergänzungen beider Seiten müssen erhalten bleiben.

### Tatsächlich erledigt

- ZIP im authentifizierten Plesk-Profil **„Mein Chrome“** übertragen; sichtbare Meldung „1 Dateien wurden zu /private hochgeladen“.
- Serverdatei: `private/mika-catalog-ff-20261111-v1.zip`, **21.314.817 Bytes**.
- ZIP-SHA serverseitig exakt geprüft: `5875f5a93f4c704b25868b5e52cbc70f052e3a8c8faf79a9cffb8da587973a44`.
- Genau drei erlaubte Archivdateien in NEUEN Ordner `private/mika-catalog-ff-package-20261111-v1` entpackt und alle Datei-SHAs geprüft.
- Bundle `catalog-8236b8bfa.bundle`: `f8c43ef7977be31b6d50f6800c8f3f89a23b0762c5430dc67fafe6097d207a5a`.
- Manifest `manifest.json`: `5cca0332016c40d99ecbf2aaf93e9897c81d4e4fbaa39df83dc2635b5b414b3f`.
- Alter Runner `catalog-ff.cjs`: `5a2a5e9893eb0bf4870c2541062a1a6f8bfdc21df265dc8fe2b213442ab569ff`.
- **Nur --inspect ausgeführt. Dieser ist vor jeder Katalogmutation fehlgeschlagen. Kein --apply, kein FF, kein Backup des Runner-Anwendungsmodus, keine Appänderung, kein Neustart.**
- Lesen von sichtbaren Prozessmetadaten am **11.11.2026 14:23:33 UTC**: keine gefundenen Git-/Katalog-/Import-Schreiber, keine vier geprüften Git-/Werkstattlocks, ca. 132.479.324 KB verfügbar. Das ist eine Momentaufnahme und vor einem Apply zu erneuern.

### Gefundener und korrigierter Prüferfehler

`git check-attr -z --stdin` erhielt newline-getrennte statt NUL-getrennter Pfade. Bei 552 Dateien wurde daraus ein falscher langer Pfad; Git-Warnungen führten zu `spawnSync git ENOBUFS`. Dies ist ein Fehler im Übernahmeprüfer, kein beobachteter Katalogkonflikt.

**Nicht den alten Server-Runner erneut anwenden.**

Korrigierter, separat gesicherter Runner: `catalog-ff-v2.cjs`, 15.887 Bytes.
SHA256: `7104c52f22138ffae40d1f1a774674fe3ab7bc44a5d82c167955198a47001935`.
Genau eine fachliche Änderung: Eingabepfade für den genannten Git-Aufruf mit NUL trennen.
**8/8 lokale Tests grün**, einschließlich tatsächlicher Multi-Datei-Attributausgabe sowie bestehendem FF-/Rollbacktest.
V2 ist **noch nicht auf den Server übertragen oder ausgeführt**. Bundle, Manifest, ursprünglicher Runner und ZIP bleiben unverändert.

[Geprüfte Paketübergabe und V2 im Commit 8ab147140f305ea1f6a47b4e106b7af3367bc76d](https://github.com/Chris83638w/gravuru-2027/blob/8ab147140f305ea1f6a47b4e106b7af3367bc76d/docs/handoffs/2026-11-11-issue233-catalog-ff-package.md).
Branch: `docs/mika-issue233-catalog-ff-20261111`.
Runner, Tests, Manifest und Proof: `ops/proofs/issue233-catalog-ff-20261111/`.

### Nächster Schritt Astra 1

1. Aktuelle #233-Kommentare und Server-HEAD/Status lesen; Operatorfenster abstimmen.
2. Nur V2 unter eigenem Namen neben das vorhandene Manifest/Bundle übertragen und Hash vergleichen; vorhandenes ZIP nicht erneut hochladen.
3. V2 **--inspect**; bei neuer Abweichung untersuchen, keine Pins blind anpassen.
4. Nur bei grünem Inspect und nachweislich keinen fremden Schreibern: gesichertes **--apply --writers-stopped** nach Runner-Anleitung.
5. Erfolg erfordert `success.json`, HEAD exakt 8236…, alle 552 Zieländerungen und die drei erhaltenen lokalen Änderungen. Runner sichert 553 betroffene Pfade plus Index/HEAD in eigenem neuen privaten Backupordner. Bei Fehler den dokumentierten Rollback prüfen, niemals blind wiederholen.
6. Ergebnis mit Belegen in #233. Danach übernimmt **Claude** die Freigabe der 1.298 Designs. Cachewirkung/Neustart nicht eigenmächtig bearbeiten.

## 2. #230 B: sieben Excel-Akten geprüft, echte Produktpläne fehlen

[Bericht und Reproduktion, Commit 411188db5777d7fb0ec06c6fab2f6faf85270fc9](https://github.com/Chris83638w/gravuru-2027/blob/411188db5777d7fb0ec06c6fab2f6faf85270fc9/docs/handoffs/2026-11-11-issue230-b-local-plan-readiness.md).
Branch: `dev/mika-product-plans-230b-20261110`.
[Operator-Rückmeldung #230](https://github.com/Chris83638w/gravuru-2027/issues/230#issuecomment-6794075359).

- Sieben XLSX exakt gegen Quellstand bf8824c8 geprüft.
- **823 rechnerische Kombinationen, aber 0 echte native Planpaare**. Alle sieben `planId`/`planHash` bleiben ehrlich null.
- **4/4 gezielte Tests grün**. Nativer Planservice nur mit isolierter synthetischer Testquelle getestet; kein Nachweis echter registrierter Produktpläne.
- Echte Quellrevisionen, Vorlagen-, Registry- und Modulprofilreferenzen fehlen. Kein echtes Registrierungsergebnis erfunden.
- Bestehender reiner Vorgänger `planFamilyFormats` kann `{config, report}` vorbereiten; danach benötigt der native ProductGroupTemplate-Service eine echte Quellenregistrierung. Operator wurde um zuständigen vorhandenen Registerpfad/Quellenexport gebeten; bislang keine Antwort belegt.
- **164 Acryl-Schraubenabweichungen:** bestätigte XLSX 269/329 Cent, alter Katalog 299/339 Cent. Excelpreise übernehmen; keine bereits bestätigten Preise erneut erfragen.
- Noch offene Modulentscheidungen betreffen u.a. Logo Hauptacryl sowie Foto/Logo kleiner Formate; aktuelle Akten sind maßgeblich. Start-/Designreferenzen ergänzen.
- 13-Motive-Entscheidung/1.298 Originale getrennt von historischen XLSX-Angaben dokumentiert.
- Stahl 80→77 Größen / 404→389 Varianten ist nur ein historischer Änderungsvergleich; nichts entfernt, angelegt, gebunden oder veröffentlicht.
- Unabhängiger Review: [plan-runner-review.md](https://github.com/Chris83638w/gravuru-2027/blob/4682065aeec43a0046bdff2de0b5a4daf210cbec/docs/reviews/2026-11-10-seven-product-excel/plan-runner-review.md).

**B ist nicht fertig als sieben freigabefähige native Importpläne.** Nächster Schritt: vorhandenen Quellenregistrierungsweg mit Operator klären, echte IDs/Revisionen beschaffen, sieben native Pläne lokal vorbereiten. Ausführen/Bestätigen/Shopify nicht Teil der bisherigen lokalen B-Beauftragung.

## 3. #230 C: Plan und sichtbare lokale Vorschau fertig

[Plan, Commit 6c9b2d98](https://github.com/Chris83638w/gravuru-2027/blob/docs/mika-design-search-catalog-plan-20261110/docs/handoffs/2026-11-10-design-search-and-catalog-plan.md).
[Desktop-/Mobil-Screenshots und Grenzen, Commit 4682065aeec43a0046bdff2de0b5a4daf210cbec](https://github.com/Chris83638w/gravuru-2027/blob/4682065aeec43a0046bdff2de0b5a4daf210cbec/docs/reviews/2026-11-11-design-search-preview/README.md).

- Echter lokaler R15, 251 Designs geladen, 21 zum aktuellen Format passend.
- Screenshots 1440×900 und 390×844.
- **Suchfeld ist visuelle Vorschau, keine fertig implementierte Suche oder Serverabnahme.** Vorschau auf historischem lokalem R15; keine Behauptung Pixelgleichheit zum aktuellen Server.
- Lokaler Vorschauhost `http://127.0.0.1:8240/steel` zuletzt laufend; beim Öffnen prüfen. Fehlenden lokalen WorkshopReview-Sitzungsverweis ergänzt, native Validierung beibehalten.
- Berechtigungen/Form/Größe vor Suche/Sortierung/Seitenauswahl filtern. Keine unzulässigen Designs über Suche sichtbar machen.
- Grobe Aufwandsschätzung nach Freigabe: **11–16 Stunden**, ohne redaktionelle Verschlagwortung und Liveabnahme.
- Keine Kundenseite geändert. Nicht ohne Abnahme in Prio-Konfi übernehmen.

## 4. Verbindlicher gemeinsamer Produkt-/Modulweg

[Workflow auf main](https://github.com/Chris83638w/gravuru-2027/blob/main/docs/handoffs/2026-11-09-produktanlage-module-excel-workflow.md) und aktuelle #230-Entscheidungen zuerst lesen.

- Ein Prio-Konfi, versionierte Produktgruppenprofile und ein-/ausschaltbare Module. Bei nicht erlaubtem Foto/Bohrung entsprechende Auswahl nicht anzeigen; keine neue Editor-Kopie.
- Vor neuer Produktanlage Module, zulässige Formen/Größen, Befestigung/Zubehör, Standardwerte, Preise/Aufpreise und zusätzliche Modulwünsche von Mikail bestätigen lassen. Bereits bestätigte Werte nicht wiederholt abfragen.
- Je Produkt eine versionierte Excel als nachvollziehbare Quelle, stabile IDs und echte Plan-/Quellrevisionen.
- Bekannte Produktart: Datenpaket, eine Stapelfreigabe, ein nachvollziehbarer Importlauf. Neue Art: erst ein Pilot vollständig bis Warenkorb prüfen.
- Gemeinsame Grundplatten/Schriften referenzieren, Designs nicht duplizieren/verändern. Shop-Produktbild bestimmt Startdesign innerhalb der freigegebenen Designgruppe.
- Auflistung alter Nutzerwünsche im Chat ist kein Beleg, dass eine Funktion heute noch offen ist. Vor jedem neuen Fix aktuellen Code und Livezustand prüfen.

## 5. Lokale Arbeitsorte und Nachweise

Workspace: `C:/Users/Mikail Erdem/Documents/Codex/2026-11-04/lie`.

- `outputs/issue233-catalog-ff-20261111/`: ZIP, Bundle, ursprünglicher Runner, V2, Manifest, Tests/Proof und `plesk-upload-handoff.jpg`.
- `work/product-plans-230b-20261110/`: B-Branch/Prüfer.
- `outputs/issue230-search-preview-20261110/screenshots/`: `designsuche-desktop-1440x900.jpg`, `designsuche-mobil-390x844.jpg`.
- `work/issue230-bc-20261110/`: diese zusammenfassende Übergabe.
- `work/gravuru-katalog` nur für Git-Objektlesen benutzt; Arbeitsbaum enthält viele fehlende Dateien. **Dort keinen Checkout/Reset als „Reparatur“ ausführen.**
- Plesk-Konsole und Dateiverwaltung im tatsächlich angemeldeten Chrome-Profil offen gehalten. Sitzungen können ablaufen; kein Passwort/Token in Übergaben übernehmen.

## Abschlussstatus

Mika hat **keinen Katalog-Fast-Forward ausgeführt** und beendet mit der Übergabe seine Ausführung. Alle drei Unteragenten haben ihre Ergebnisse gesichert und sind beendet. Keine Aussage „alles fertig“, keine fingierten Produktplan-IDs, kein exakter Gesamtprozentsatz. Astra 1 kann mit den oben priorisierten konkreten Schritten fortfahren; A bleibt beim Operator.
