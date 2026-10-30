# Gedenktafeln im Master – erste lokale Ausführung

Stand 30.10.2026, Codex/Astra. Branch `dev/gedenktafeln-master-20261030-astra`, Grundlage `26fbe80` mit Anwendung aus [PR #77](https://github.com/Chris83638w/gravuru-2027/pull/77), `261532e`. PR #77 ist noch offen. Der neue Entwurfs-PR baut deshalb auf dessen Branch auf; nach dessen Merge auf `main` umstellen. Keine andere Konfigurator-Oberfläche eingemischt.

**Nur lokale Bedienvorschau, kein Shop-Import, kein Merge und nichts live.** Erste Ausführung: Naturschiefer **22 × 14 cm**, Originaldesigns **GT-S-22x14-D204** und **GT-S-22x14-D213**. Keine Aussage über die Freigabe aller Gedenktafeln oder die Bestell-/Fertigungsstrecke.

## Auftrag und Quellen

- Chris, Chat 30.10.: „dann machen wir jetzt den konfi für gedenktafeln“. Befestigung einschließlich Silikon; zusätzlich ein optionaler Ständer in Klar oder Schwarz; Spray unabhängig zusätzlich.
- Chris: „Ja, längere Gedenksprüche erlauben“. Die Türschildregel von 80 Zeichen gilt hier nicht. Die vorhandene Textregel unterstützt bis 500 Zeichen pro Feld; diese technische Grenze wird genutzt, Zeilenumbrüche sind innerhalb dieses Budgets frei. Keine pauschale Änderung bestehender Produkte.
- [Issue #48, Nachrichten 16–19](https://github.com/Chris83638w/gravuru-2027/issues/48), [Bestandsaufnahme und offene Regeln](2026-10-30-konfi-module-bestandsaufnahme.md), [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).
- Geometrie: [konturen-und-loecher.json](design-start-mika/schiefer/konturen-und-loecher.json), Schiefer-Excel aus main `59f2f83` wie in der Bestandsaufnahme geprüft. Zwei unterschiedliche Original-Bohrbilder bleiben getrennt: Ø 4 mm mit x=17/203 und y=16,9/69,9/122,9; Ø 8 mm für Abstandshalter mit x=17,1/203,1 und y=17/70/123. Zwei Löcher = mittleres Paar, vier = Ecken. Abstandshalterkopf 12 mm, keine Schraubenausführung und kein altes Ø-5-mm-Bohrbild übernommen.
- Designs, vier echte Katalogschriften, Beispiel-PNGs und Schieferoberfläche aus der vorhandenen lokalen Quellenkopie. Diese Kopie hat keine verifizierte aktuelle Katalog-main-Revision. [Prüfsummen der tatsächlich verwendeten Dateien](gedenktafeln-master-20261030/quellen-pruefsummen.json) statt einer erfundenen Aktualitäts-/Freigabeaussage. Originale nicht verändert; keine Schriftdateien eingecheckt. D204 enthält den runden „Foto-Upload“-Hinweis bereits im Original-PNG.
- Zubehörbilder aus Chris' Anhängen, unverändert in [Bildübersicht](konfi-module-20261030/zubehoer/README.md). Kein aus den Bildern abgeleiteter Preis oder erfundenes Maß.

## Umsetzung

Die bestehende Master-Oberfläche erhält Optionen über das vorhandene Profil und `optionFields`: Ohne Befestigung, 2/4 Bohrlöcher, 2/4 Abstandshalter oder Silikonkleber. Klarer/schwarzer Ständer sind eine separate Einzelauswahl, Imprägnierspray eine separate Checkbox. Die Zusammenfassung nennt beide zusätzlich zur Befestigung. Verdeckte Abstandshalterfarben erscheinen dort nicht.

`optionImages` ordnet echte Produktbilder ausschließlich vorhandenen Auswahlkennungen zu. Vier originale Draufsichten erscheinen als 12-mm-Abstandshalter auf der Platte; Vorschauhardware gehört nicht zur Gravurgeometrie. Bildschirmbilder werden zwischengespeichert, damit große PNGs beim Bewegen nicht immer erneut in das SVG kopiert werden. Für Schwarz fehlt die Original-Draufsicht: dort bleibt ausdrücklich die vorhandene schematische Darstellung.

Fotofelder sind für dieses Schieferprofil ausdrücklich auch auf Designs ohne mitgelieferten Fotoslot möglich. Der neue Schalter ist produktgebunden; ohne ihn bleibt die bisherige Beschränkung erhalten, Edelstahlgravur wird weiterhin ausgeschlossen. Kunden-Uploads starten im vorhandenen Graustufenweg, Original wiederherstellbar. Katalog-Beispielfotos werden nicht nachbearbeitet.

Der Textvertrag reicht die explizite, vom Profil vorgegebene Grenze durch Eingabe, Validierung und Entwurf. Längere Sprüche werden nicht mehr von der bisherigen allgemeinen 180-Zeichen-Prüfung abgeschnitten/abgelehnt. Ohne diese Profilregel bleiben alte Grenzen erhalten.

Die relevante Korrektur aus PR #72 wurde gezielt abgeglichen: ungefüllte Pfade, Striche, `evenodd` und Deckkraft bleiben beim Gravurimport erhalten; eine volle Hüllbox reicht nicht mehr zum Verwerfen als Plattenfläche. Neuere Master-Rechte für Motive und ganze Druckdesigns bleiben erhalten.

`memorial-review.mjs` und `preview-memorial.mjs` sind ein ausdrücklich lokaler Prüfadapter, kein zweiter Katalog und keine Importvorlage. Er liest die Quellen, generiert ein lokales Modell und startet nur auf Loopback. Offene Preise bleiben `null`, werden nicht als 0 EUR ausgegeben; zahlbare Angebote werden abgelehnt. Warenkorb-/Gesamtpreisanzeige bleibt in dieser Vorschau verborgen.

## Nachweise

Gezielte Abschlussprüfung: **168/168 bestanden**, 0 Fehler/Skips, 17 Dateien (Textvertrag, Elementrechte, Zusatzfelder, Foto-Upload/-Bearbeitung/-Position, Designtransfer, mobile Schritte, Material-/Beschlagvorschau, UI-Ereignisse, Bundle, Katalogumwandlung, Themenlimits und neue Gedenktafelprüfungen). Nach der abschließenden Radio-Fokuskorrektur nochmals betroffene **30/30** bestanden, 0 Fehler/Skips. Diese Läufe überschneiden sich und werden nicht addiert. `git diff --check` sauber, Textdateien LF.

Breiter Windows-Lauf über alle **264 Testdateien** unter `app/configurator/variant-m` und `app/workshop`: **1943 Tests, 1845 bestanden, 89 fehlgeschlagen, 2 abgebrochen, 7 übersprungen**, Laufzeit 933 s. Die 89 Fehler teilen sich anhand der Fehlerausgaben auf in **73× `python3 EACCES`** (Tests starten fest `python3`, obwohl der verfügbare Interpreter über `GRAVURU_PYTHON` gesetzt ist) und **16× fehlende Logo-Python-Abhängigkeiten** (`requirements-logo.txt`). Die zwei Abbrüche sind 60-s-Zeitüberschreitungen in `contour-production.test.mjs` und `contours.test.mjs`. Das ist ausdrücklich **kein grüner Vollauf**. Keine Tests gestrichen oder Assertions abgeschwächt; kein kontrollierter Vollauf des unveränderten Basisstands und kein Linux-Nachweis in dieser Runde. [Zähler und betroffene Dateien](gedenktafeln-master-20261030/tests.json).

Der erste Lauf mit dem standardmäßigen eingeschränkten Windows-Temp-Verzeichnis hatte 1652 bestanden / 283 Fehler / 2 Abbrüche / 6 Skips bei ebenfalls 1943 Zählern. Der oben genannte zweite Lauf nutzt `TEMP`/`TMP` im privaten Arbeitsordner und `NODE_OPTIONS=--experimental-vm-modules`; dadurch fallen die dortigen Rename-Zugriffsfehler weg. Ein echter isolierter UI-Testfehler (`tileIcon` fehlte in der Testumgebung) wurde behoben, der Test samt bestehenden Assertions bleibt bestehen. Standardfarben-Markierung nach Einblenden einer bedingten Gruppe und Radio-Fokus wurden nach dem Start des Vollaufs abschließend korrigiert; die gezielten Abschlussläufe enthalten diese Änderungen.

Vollauf: `node --max-old-space-size=2048 --test --test-concurrency=2 --test-timeout=60000 <alle *.test.mjs beider Verzeichnisse>`. Browserkonsole ohne Fehler. Zusätzlich direkt im Eingabefeld **239 Zeichen über sechs Zeilen** vollständig zurückgelesen, danach Originalspruch wiederhergestellt.

Im lokalen Browser geprüft: Silikon + schwarzer Ständer + Spray; Wechsel Klar/Schwarz; 4 Abstandshalter mit Farbwechsel; Name „Mika“ und tatsächlicher Foto-Upload bleiben beim Wechsel D204 → D213 erhalten; Fotobearbeitung zeigt Graustufen und Wiederherstellen des Originals; Zusammenfassung enthält Befestigung, Ständer, Spray und den vollständigen mehrzeiligen Spruch. Kein Live-Warenkorb angefasst.

Desktop und emulierte Handy-Viewports (kein echtes Safari/iPhone):

| Ansicht | Bild |
|---|---|
| Desktop 1440 × 1050 | [Ausführungen](gedenktafeln-master-20261030/desktop-ausfuehrungen.png) |
| Desktop 1440 × 900 | [Zusammenfassung](gedenktafeln-master-20261030/desktop-zusammenfassung.png) |
| Desktop 1440 × 1050 | [Vier goldene Abstandshalter](gedenktafeln-master-20261030/desktop-abstandshalter-gold.png) |
| iPhone 13, 390 × 664 | [Befestigung](gedenktafeln-master-20261030/iphone13-befestigung.png) |
| iPhone SE, 375 × 548 | [Befestigung](gedenktafeln-master-20261030/iphone-se-befestigung.png) |

## Lokal reproduzieren

Node 24, Python mit den Projektabhängigkeiten und Katalogschriften bereitstellen. `GRAVURU_PYTHON` auf diesen Interpreter setzen. Aus dem Repository:

```text
node scripts/preview-memorial.mjs --katalog=<lokale-Katalogkopie> --surface=<Schiefer-Grundplatte-kompakt.webp> --out=<privater-Ausgabeordner> --port=8160
```

Dann `http://127.0.0.1:8160/?model=acryl` öffnen. Der interne Modellparameter stammt von der bestehenden Master-Hülle; die sichtbare Oberfläche nennt Gedenktafel. Font-Cache, Modellbündel und Test-Uploads bleiben im privaten Ausgabeordner/Browser, außerhalb von Git. Nach Neuladen müssen private Upload-Dateien wie im Master erneut gewählt werden; der geprüfte Designwechsel innerhalb der Sitzung erhält sie.

## Offen vor Einbau/Veröffentlichung

1. Chris prüft diese konkrete Ausführung. Danach weitere Größen/Materialien einzeln aus ihren Excel-Vorgaben übernehmen.
2. Zubehörpreise/-kennungen und Zuordnung bis zur Bestellung/Fertigung vervollständigen. Ständermaße nicht aus Fotos schätzen. Silikon ist jetzt Befestigung, nicht eine zweite unabhängige Zubehör-Checkbox.
3. Foto-Preisregel je Design: erstes Foto eines Fotodesigns inklusive; neues Foto 9,99 EUR dokumentiert, weiteres Foto bisher 8,99/9,99 EUR noch offen. Hier keine Preisfreigabe. Verbindliche Motiv-/Logo-Masterpreise nicht verändert; Logos bei dieser Schiefer-Vorschau nicht eingeschaltet.
4. Abstandshalter: vorhandene 5,90/9,90 EUR als Quellwerte, Farbaufschläge je 2er-/4er-Set noch durchgängig aus Excel zu binden. Hier alle Preise verborgen, kein pauschaler Ersatzpreis. Schwarze Draufsicht nachreichen.
5. Aktuellen Katalogstand/Freigaben, Linux und echtes iPhone/Safari prüfen. Familien-/Excel-Rundlauf, Shop-Verkauf, Foto-Persistenz nach Warenkorb/Wiederbearbeitung und Produktionsdateien benötigen eigene Abnahme. Keine dieser Abnahmen wird aus den lokalen Screenshots abgeleitet.

Rückweg: Entwurfsbranch nicht übernehmen; bestehender Master und Live-Systeme wurden durch dieses Paket nicht verändert. Für Übernahme nur nach Prüfung dieses Diffs und der offenen Fachregeln.
