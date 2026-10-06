# Durchgehender Excel- und Kundenablauf

Stand 06.10.2026. Branch `task/excel-customer-flow-20261006`; Basis `e57a7defee4ff8e554f4f17c5beb0442120e224b`. Bestehende Cloud-Ausführung, keine Veröffentlichung.

## Tatsächlich geprüft

Ein zusammenhängender Browserlauf in einer frisch erzeugten, isolierten synthetischen Datenbank:

1. Zwei vollständige Formmaster (120 × 80 mm klares Acryl, 160 × 100 mm Eiche), je zwei Bohrungen und ein ausdrücklich angelegtes Textfeld. Dies sind Prüfdaten, keine freigegebenen Material-/Produktionsspezifikationen.
2. Echte XLSX-Datei mit drei Produktzeilen und je einer Design-Kindzeile; echte SVG und PDF über die Dateiauswahl importiert. Drei Produkte mit jeweils zwei Designs, Preisen 1499/1999/2499 Cent. Wiederholter Import erzeugt null weitere Produkte.
3. Im Dashboard ausgefüllte Designzuordnungen heruntergeladen, Namen/Standardwahl in Excel geändert und wieder eingelesen. Alle drei Produkte in Revision 2; Originalfeld „Mustername“ erhalten.
4. Ausführungstabelle samt aktuellem Produktkatalog heruntergeladen, eine Gruppe mit drei Produktreferenzen auf Revision 2 gefüllt, über Vorschau und Übernahme angelegt.
5. Jede Ausführung über die echte Kundenauswahl geöffnet. Passende Produkt-ID, Revision, Maße, Preise und zwei Designs bestätigt. Text bearbeitet, gespeichert, Seite neu geladen; eigener Text erhalten. Beim Designwechsel bleibt der jeweilige Kundenentwurf erhalten. Die Produktvorlagen ändern sich nicht.
6. Danach im Backend das erste Produkt auf Revision 3 mit Preis 9999 Cent und anderem Designnamen geändert. Die bestehende Gruppe und ihr Kundenlink verwenden weiter Revision 2, den vorherigen Designnamen und 1499 Cent. Neuester Stand wird in der Gruppenauflösung separat angezeigt, nicht still übernommen.
7. Kundenauswahl und Editor auf 1440/390/768 px ohne horizontalen Überlauf; keine JavaScriptfehler.

[Ausführungswahl Desktop](excel-flow-variants-desktop.png) · [Mobil](excel-flow-variants-mobile.png) · [Kundeneditor](excel-flow-customer-desktop.png).

## Gefundener und behobener Fehler

Die maßgleiche 160 × 100-mm-PDF wurde im ersten Durchlauf abgewiesen. Der PDF-Import rechnet Punkte in mm um; die Fließkomma-Seitengröße liegt minimal über dem Nennmaß. Die zentrierte Startposition wurde dadurch minimal negativ. Die Platzierungsprüfung lehnt negative Koordinaten zu Recht ab, obwohl die Abmessungen innerhalb der bestehenden 0,001-mm-Toleranz liegen.

`addFormDesign` setzt die automatisch berechnete Startposition mindestens auf 0. Originalbreite/-höhe, Verhältnis, Quelle und Kontur bleiben unverändert; keine Skalierung und keine zusätzliche Maßtoleranz. Die bestehende Begrenzung weist echte Übergrößen weiter ab. Ergänzter Regressionstest verwendet eine tatsächlich erzeugte PDF, prüft das erhaltene Original und weist 160,002/160,02/161 mm sowie ausdrücklich negative Benutzerkoordinaten ab.

Der erste Prüflauf wurde nicht als Erfolg gewertet. Nach der Korrektur bestand die unveränderte maßgleiche PDF im vollständigen Browserablauf. [Maschinenlesbarer Browsernachweis](excel-customer-flow-check.json).

## Wiederholbare Prüfung

Die neuen Skripte akzeptieren weder einen vorhandenen Datenbankpfad noch eine Live-URL. Der Node-Fixtureprozess verlangt ein frisches Testverzeichnis mit Marker, lehnt eine existierende Datenbank ab und bindet nur an Loopback. Der Python-Lauf erzeugt XLSX/SVG/PDF synthetisch, startet seinen eigenen Prozess und beendet/entfernt diese Testablage anschließend. Ergebnisse enthalten ausschließlich synthetische Screenshots und Metadaten, keine Entwurfstokens.

Voraussetzungen: bisherige Python-Abhängigkeiten des Projekts, zusätzlich `scripts/requirements-browser.txt`; vorhandener Chromium. Beispiel in dieser Cloud:

```sh
python3 -m pip install --target .local-data/python -r scripts/requirements-browser.txt
PYTHONPATH="$PWD/.local-data/python" python3 scripts/check-excel-customer-flow.py --chromium /usr/bin/chromium
node --test app/workshop/form-designs.test.mjs
node scripts/cloud-check.mjs
```

Bereits vorhandene Bibliotheken/Chromium wurden verwendet; keine erneute Installation behauptet. Browserreport standardmäßig unter `.test-output/excel-customer-flow/report.json`. Der erfolgreiche Browserlauf fand am **06.10.2026, 08:29:43–08:29:54 Europe/Berlin** statt. Die gezielten PDF-/Designregressionen bestanden mit **2/2 Tests**. Abschließender Cloud-Check **06.10.2026, 08:30:09–08:31:31 Europe/Berlin: 268 Tests bestanden, 0 Fehler, 0 Skips; Build 76 Ressourcen/1 Modell, Editor 461440 Bytes**. [Gesamtnachweis](excel-flow-regression-check.json).

## Grenzen und nächster Schritt

Dieser neue Lauf belegt drei Produkte zusammenhängend. Die früheren 100er-/3000-Design-Lastprüfungen bleiben gesonderte historische Nachweise; sie wurden nicht als Teil dieses Browserlaufs wiederholt. Keine echte Bestellung, Zahlung, Shopify-Veröffentlichung, private Datenbank oder RIP-/Maschinenabnahme. Kein Deploy/Publish, Merge oder PR; die separate Acryl-Testseite bleibt unverändert.

Nächster unabhängiger Schritt: denselben Kundenablauf über gespeicherten Werkstattprüfstand bis zum PDF-/ZIP-Export zusammenhängend abnehmen. Ein erfolgreicher Kundenentwurf wird dabei nicht als bezahlte Bestellung ausgegeben.
