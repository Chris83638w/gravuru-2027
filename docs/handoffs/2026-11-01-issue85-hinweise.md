# Issue 85 · Hinweisschilder · 01.11.2026 · Codex

## Auftrag und verbindliche Quellen

[Issue 85](https://github.com/Chris83638w/gravuru-2027/issues/85), [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md), Lieferform 2 und aktuelle Familien-JSON gelten. Nutzer im Chat: „Mach weiter mit den Hinweisschildern … alles bearbeitbar im Konfigurator und keine PNGs.“ Fehlende Fonts ausdrücklich freigegeben: „Ja, passende feine Ersatzschriften wählen“ (01.11.2026).

Regeln mit Quellen vor der Umsetzung: Issue 85 verlangt V2A-bevorzugte Dublettenbereinigung ohne Löschen, kleinste gültige Mastergröße, identische Designziele für Edelstahl und beide Acryl-3-mm-Farben, Start K00 und `freigabe:null`. Familien bestimmen ausschließlich Formen und Größen. Design-Master verlangt Originalmotive und echte Texte; Nutzer verlangt feine Schriften. Keine neuen Familien, Preise, Lochabstände oder Produktregeln eingeführt.

## Lieferstand

Eigener Branch `dev/issue85-hinweise-20261101` in Code und Katalog. Code basiert auf `4f802ee` (Rund-PR 86, einschließlich Rebase auf main `304420b`); Katalog auf `20dc4bef6`. Code-PR gegen `dev/issue85-design-transfer-20261031`, Katalog-PR gegen main. Codeabhängigkeit nicht erneut als eigener Funktionsumfang zählen.

- 453 vorhandene Quelldatensätze erfasst (Issue nannte historischen Zähler 460); 452 zugeordnet, eine beschädigte Quelle offen.
- 181 Master: 178 aus Bestand und drei neue, zurückhaltende Praxis-/Behandlungs-/Zimmer-Entwürfe. 14 technische Format-/Quellreihen, 1.163 proportionale Größenableitungen. Keine Raster-Designs, keine Bestandslöschung.
- 543 Materialziele: dieselben Master für Edelstahl, Acryl Schwarz und Anthrazit. Alle Freigaben `null`.
- 20 vorhandene Katalogschriften; Ersatzentscheidungen und Abweichungen je Design dokumentiert. Keine neuen Fontdateien.
- Originalkonturen bleiben einzelne bearbeitbare Motive. Umrissbeschriftungen wieder als Text; STOP als integraler Bestandteil eines Piktogramms bleibt Motivkontur. Texte und Motive lassen sich getrennt verschieben, skalieren und entfernen. Der bestehende Katalogeditor bietet hier keinen eigenen Motiv-Austauschdialog; keine zusätzliche Austauschoberfläche in diesem Datenpaket behauptet.

Die früheren 200×150-mm-Schieferkompositionen wurden bewusst für gültige 3:2-Rechtecke neu gesetzt. Dense Strichlisten bleiben vollständig, mit größerem Titel und geordneten Textzeilen. HP-Konturmotive 39/51/52: Originalgeometrie, dokumentiert 0,5-mm-Kontur. Außerhalb der Platte liegende Produktionsnummern und Bohrmarkierungen sind nicht Bestandteil des neuen Designs.

## Reproduktion

Python benötigt fontTools und die bereits verwendeten Layout-Helfer. Aus dem Code-Repo mit passenden lokalen Pfaden:

```text
python scripts/design-pruefung/hinweise-inventory.py --katalog <Katalog> --out <Quellenansicht>
python scripts/design-pruefung/hinweise-transfer.py --katalog <Katalog>
python scripts/design-pruefung/hinweise-derive.py --katalog <Katalog>
python scripts/design-pruefung/hinweise-check.py --katalog <Katalog>
node app/configurator/variant-m/server.mjs --port=8977 --katalog=<Katalog>
node scripts/design-pruefung/hinweise-proof.mjs --katalog=<Katalog> --out=<Nachweise> --url=http://127.0.0.1:8977
python scripts/build-katalog.py --katalog <Katalog>
```

Transfer ist ein Neubau eigener Reihen; nach manuellen Änderungen nicht unbesehen erneut ausführen. D54 wurde im echten Editor gespeichert (PRAXIS geometrisch auf X=60 mm), nach Neuladen bestätigt und im Transfer nachvollzogen. Audit `_aenderungen.jsonl` bleibt erhalten. Der Editor setzt Freigaben beim Speichern auf „offen“; anschließend gemäß Issue explizit auf `null` zurückgesetzt. Größen danach neu abgeleitet. Auch die optionale native `sizeMm`-Angabe wird proportional skaliert.

Native Prüfvorschauen werden unverändert über `/api/workshop/designs/target-preview` erzeugt; Textur-Deduplizierung und gzip sind verlustlos mit Rückvergleich geprüft. Lokalen `.cache` bei Änderungen am Renderer löschen, denn der Cache erfasst Daten/Fonts/Familien, nicht die Codeversion. Kontaktbogen enthält alle Vorschauen selbst; Bearbeitungslinks erwarten die lokale Werkstatt auf Port 8977. Gzip-Anzeige im Browser geprüft.

## Prüfungen und Grenzen

60 vorhandene gezielte Tests bestanden: `katalog-convert`, `katalog-editor-ui`, `katalog-photo-assets`, `design-target-preview`. Datenprüfung: 181/1.163/543, vollständige 453er-Zuordnung, echte Text-/Motiv-Ebenen, keine Rasterbilder, nur gültige Größen, keine ID-Kollisionen. Native Prüfung: 4.032 Größen, 316 Ziele „passt“, 227 „prüfen“, **0 „passt nicht“**. Alle 181 Edelstahlansichten neben Original gesichtet, korrigierte Ansichten erneut geprüft, beide Acrylfarben stichprobenweise gesichtet.

Echte Bedienprüfung: PRAXIS geändert und zurückgesetzt, Zentrierung gespeichert, nach Neuladen erhalten. Küchenmotiv proportional skaliert (25,14 → 24 mm; Höhe folgt), danach rückgängig. Vollständiger Katalogbau nach Dashboard-Speicherung: 13 Familien erfolgreich. Keine Familienänderungen; KATALOG und erzeugte Familienartefakte ohne fachlichen Paketinhalt auf Ausgangsstand belassen.

Offen: `HSHO-KS-D1` liefert nur eine schwarze Fläche, kein identifizierbares Hundeporträt. Ersatz nicht erfunden. 182 Textfelder haben am kleinsten Master eine tatsächliche Versalhöhe unter 3 mm; separate Prüfliste. Feine Originaldetails, optionale Bohrungen und Kleinschrift benötigen Sicht-/Gravurprüfung, keine Produktionsfreigabe aus bloßer Passung. Linke Originalansicht kann fehlende Quellfonts nur als Browserersatz darstellen; rechte Vorschau nutzt echte Katalogfonts.

Nächster Schritt: Operator prüft den Katalog-Kontaktbogen und die markierten Details einzeln; beschädigte Quelle ersetzen. Runde Firmenschilder und ihre sieben Reviewpunkte bleiben separates Paket. Kein Merge, kein Import, kein Live-Deploy.
