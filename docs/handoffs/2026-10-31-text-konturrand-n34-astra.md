# Issue #48, Nachricht 34 – Text an ovalen und Kontur-Rändern

Auftrag: Chris „nur 1“. Basis Code `06f1fead1b43548c876394e1c4d951ce25e2343c`, Branch `dev/text-konturrand-20261031-astra`. Nur diese Randprüfung; #78, Funkklingel und Materialpool bleiben außerhalb dieses PRs. Kein Merge, Import oder Live-Eingriff.

## Verbindliche Quellen und Regeln

- [Claude, Nachricht 34](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6542713507): Ein Text darf bei Oval/Kontur nicht allein wegen seiner rechteckigen Textbox scheitern. Sichtbare Glyphen entscheiden, echter Überstand bleibt gesperrt. Gemeinsame Prüfung für Werkstatt und Kunden-Konfigurator.
- Bestehende Randregel aus `artworkMargin`: Gravur ohne expliziten Rand 0 mm, explizite Abstände und Druck-Abstand bleiben wirksam. Keine Änderung an Bohrloch-Hinweisen oder physischer Bohrbildprüfung.
- Originalfall: Katalog `2e308ce`, `designs/edelstahl-gravur-oval-90x60/TO-V2A-9x6-D57/design.json` und `design.svg`. „Pielstädt“, Italianno, 22,23 mm; SVG-Grundlinie x=15,59/y=47,22 mm, Platte 90×60 mm. Die JSON-Fixture enthält nur den Textauszug, keine Motive oder Schriftdaten.
- Originalschrift `schriften/dateien/Italianno/Italianno-Regular.ttf`, Git-Blob `7b4182a068009d2ff53053f2b9fc63c353910180`. Lokale Datei gegen den aktuellen GitHub-Blob geprüft. Keine Schriftdatei ins Code-Repo aufgenommen.

## Änderung

`surfaceObjectIssue` behält die schnelle Boxprüfung. Nur bei einem geometrischen Randfehler darf `textOutlineFits` diesen durch nachweislich passende Glyphenpfade aufheben. Die Pfadpositionen stammen aus `textGlyphLayout`, derselben Funktion wie die unveränderte SVG-Ausgabe von `textPaths`. Rotation, Schriftschnitt, Schrägstellung, Textanker, Zeichen- und Zeilenabstand werden berücksichtigt. Kurven werden mit maximal 0,0005 mm Abweichung angenähert, diese Abweichung einschließlich Schrägstellung wird zur sicheren Seite reserviert; die bestehende Konturreserve bleibt erhalten. Bei konkaven Konturen werden auch die ganzen Segmente geprüft.

Fehlende Schriften/Glyphen, ungültige oder nicht unterstützte Pfade liefern keine Freigabe. Der Fallback unterstützt die absoluten M-Unterpfade der katalogeigenen Schriftkonvertierung; unbekannte relative Unterpfad-Ursprünge behalten den bisherigen Fehler. Bohrlöcher werden wie bisher getrennt als Hinweis behandelt. Klingelbereiche, Doorbell-Schema und ungültige Maße werden nicht überstimmt.

Schriften werden durch Katalog-Zielprüfung, Produkt-/Kundenvalidierung, Werkstatt-Bearbeitung und Layout-Prüfung weitergereicht. Einpassen und Randbegrenzung nutzen denselben Fallback, damit ein korrekt passender Text nicht trotzdem schrumpft oder springt. Keine Änderungen an CSS, Bedienoberfläche, Katalog, Kennungen oder Preisen.

## Nachweise

- **131/131 gezielte Tests bestanden, 0 Fehler, 0 übersprungen**: neue 8 Randregressionen, Master-Geometrie, Vertrag, Kontur/Rückseite, Randbegrenzung, Vorlagenposition, Workflow, Zeilenabstand, UI-Handler, Katalogkonvertierung, Zielregeln, KI-Designprüfung sowie gemeinsame Kontur-/Motivpfadprüfung. Keine bestehende Assertion entfernt oder gelockert.
- **Original-Italianno-Replay erfolgreich**: Original-Textbox vorher abgelehnt, Glyphenprüfung danach `passt`; derselbe Text 12 mm tiefer `passt nicht`. Katalog-Templateprüfung, Produktaufbereitung und Kunden-/Bestellvalidierung geprüft. Kein Live-Warenkorbtest. Position, Größe und SVG bleiben unverändert.
- **1.116 SVG-Vergleiche über 31 Schriften** gegen die Renderer-Funktion aus Basis `06f1fea` bytegleich (u. a. fett, kursiv, drei Textanker, mehrere/Leerzeilen und Zeichenabstand).
- Build erfolgreich, `git diff --check` sauber, geänderte Dateien LF.
- Ergänzender Vollauf **abgebrochen, nicht vollständig grün**: 1.525 abgeschlossene Testfälle, davon 1.335 bestanden und 190 fehlgeschlagen. Im eingeschränkten Windows-Lauf u. a. fehlende Python-Pakete (`requirements-contours.txt`, `requirements-logo.txt`), `python3 EACCES`, gesperrte localhost-Verbindungen, außerdem beim ersten Teillauf `EPERM` bei temporären Dateiumbenennungen. Diese Zahlen sind **kein** vollständiges Vorher/Nachher-Ergebnis; nicht alle 190 Fehler wurden einzeln gegen main abgeglichen.
- Lokale SVG-Prüfansicht erzeugt; Browser-Sichtprüfung nicht abgeschlossen, weil die Browser-URL-Regel lokale `file:`-Seiten blockiert. Keine optische Browser-Abnahme behauptet. Der bytegleiche SVG-Vergleich ist unabhängig davon erfolgreich.

## Reproduktion des Originalfalls

```sh
# Python mit fontTools verwenden (GRAVURU_PYTHON/PYTHONPATH ggf. passend setzen).
node ops/check-oval-text-contours.mjs /pfad/zum/katalog/schriften/dateien/Italianno/Italianno-Regular.ttf
node --test app/configurator/variant-m/text-outline-regressions.test.mjs
```

Der Original-Replay prüft den Font-Hash und schreibt weder Katalog noch Shop. Preise/Befestigung des dabei erzeugten Produkts kommen nur aus der isolierten vorhandenen Test-Fixture; `orderEnabled` ist ausdrücklich false.

## Übergabe an Claude

Bitte Diff prüfen, Linux-Vollauf ausführen und den Zielvorschau-Lauf mit den aktuellen 737 Edelstahl-Designs wiederholen (einschließlich der übrigen in Nachricht 34 genannten Oval-/Retro-Fälle). Der Original-Replay umfasst D57 9×6 und seine beiden Texte; er behauptet keine Prüfung aller 13 Fälle oder der kompletten Motive. Kein Merge und kein Deployment durch Astra. Die vier separaten Katalog-/Schriftprobleme aus Nachricht 34 bleiben bei Claude. Nächster Schritt ist ausschließlich Review dieses PRs; weitere Pakete erst nach neuem Auftrag von Chris.
