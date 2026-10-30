# Direkte Sichtung: Motive inline, ruhige Designkarten und Schrauben

Stand: 30.10.2026, Codex/Astra, bestehender Entwurfs-PR #58, Basis dieses Nachtrags `da7139f`. Chris hat die gesammelten Punkte mit „umsetzen“ freigegeben. Weiterhin nur lokale Prüfung, kein Merge nach main und keine Installation. Aktuell direkte Abstimmung mit Chris; keine neue Nachricht an Claude.

## Nachtrag: schmaler Hinweis und 4,5-mm-Schrauben

Chris: „Hinweis kleiner halten“, „schmaler“ und anschließend „Schraubenkopf auf 4,5mm machen“. Überlagerungen erscheinen jetzt als kompakte Zeile mit betroffenen Elementen und „Anzeigen“ / „Ignorieren“. Lange Namen werden platzsparend gekürzt, bleiben im zugänglichen Text und als Tooltip erhalten. Erkennung, Hervorheben, Ignorieren und Wiederanzeigen unverändert; mechanische Befestigungswarnungen behalten ihren vollständigen Text. Die vorhandene fotorealistische Schraubenvorschau hat jetzt **4,5 mm Kopfmaß**, Bohrungen bleiben unverändert. Damit ist die frühere 3,6-mm-Vorgabe dieses Berichts überholt.

**21/21 bestehende gezielte Tests** (`customer-tools`, `customer-orientation`) und Build bestanden. Desktophinweis im echten Editor 40 px hoch; 375 × 548 mit zweizeiligem Hinweis, bedienbaren 44-px-Tasten und sichtbarem Preis geprüft. Anzeigen, Ignorieren und Wiederanzeigen mit einer echten Testüberlagerung bedient. Nur separates Testtab verändert; kein Live-Zugriff. Keine neue Claude-Nachricht während Chris' direkter Sichtung.

![Schmaler Hinweis am Desktop](issue48-orientierung-20261030/hinweis-schmal-desktop.png)
![Hinweis auf 375 × 548](issue48-orientierung-20261030/hinweis-schmal-375x548.png)


## Änderungen

- Designkarten zeigen Vorschau und Auswahl, keine sichtbaren Beschreibungen. Der zugängliche Name bleibt erhalten, ebenso die Vergrößerung. Auch die produktübergreifende Galerie hat keine sichtbaren Titel mehr.
- Die Größenpfeile sind eigene graue Pfeile mit transparentem Hintergrund statt der weißen Browser-Spinner. Sie benutzen denselben vorhandenen Größenhandler wie −/+, einschließlich Rechteprüfung. Große −/+-Tasten bleiben für Touch verfügbar. Die Leiste bleibt auf dem Handy zweizeilig.
- Schraubenköpfe verwenden die unveränderte vorhandene WebP-Referenz `app/designs/aosu-labrador/runtime/images/gravuru-schraubenkopf-fotorealistisch.webp`. Das Bild ist selbständig eingebettet, damit auch SVG-Bildvorschauen funktionieren. Sichtbare Alpha-Grenzen maßstäblich in einer 3,6 × 3,6 mm großen Vorschau; Bohrungen und Fertigungsgeometrie unverändert.
- „Alle Motive entdecken“ ersetzt die Bestseller im selben Bereich. Kein Motivdialog, kein neuer Tab. Die vorhandenen Such-/Kategorieelemente bleiben erhalten; Zurückwechseln verliert weder Suchbegriff noch bereits nachgeladene Treffer. Drei Spalten, weitere Treffer mit „Mehr anzeigen“. Motivklick fügt weiterhin hinzu und lässt die Bibliothek offen.
- Suchhinweis: „Beschreibe einfach, was du suchst – du musst den genauen Motivnamen nicht kennen.“ Die bestehende Suche nach verwandten Begriffen bleibt unverändert.

## Prüfung

**84/84 gezielte Tests, keine Skips**, verteilt auf zehn Dateien:

```text
inline-motif-browser.test.mjs
customer-orientation.test.mjs
ui-event-regressions.test.mjs
workflow.test.mjs
customer-tools.test.mjs
motif-tile-fit.test.mjs
toolbar-hosts.test.mjs
product-design-gallery-label.test.mjs
design-gallery.test.mjs
bundle.test.mjs
```

Davon 68/68 UI-/Geometrie-/Übernahmetests, zehn Galerietests und sechs Bündeltests. Zwei Bündeltests konnten zunächst im Windows-System-Temp nicht umbenennen (`EPERM`); mit TEMP/TMP in `.local-data/logo-ui-test` bestehen alle sechs unverändert. Build des gemeinsamen Prüfstands erfolgreich. Kein neuer Vollauf; die früheren Vollauf-Befunde sind damit nicht erledigt.

Browserprüfung im lokalen Chromium: Desktop 1280 × 720, Handyansichten 390 × 664 und 375 × 548. Auf Desktop: Suche „wasser“ → 21 Treffer; „Mehr anzeigen“ von 6 auf 12; Bestseller → Bibliothek behält Suche und zwölf Treffer; Anker hinzufügen erhöht Ebenen von 6 auf 7 und Preis von 24,37 auf 26,06 €, Rückgängig stellt beides zurück. Größenpfeile 10 → 11 → 10 mm. Die Pfeile bleiben sichtbar ohne weißen Untergrund. Keine horizontale Überbreite der mobilen Textleiste; Preis/Schritte und Plattenbemaßung im Textschritt sichtbar. Nutzer-Originaltabs nicht neu geladen; eigenes Prüftab benutzt.

## Bilder

![Desktop: Inline-Motive und verständlicher Suchhinweis](issue48-orientierung-20261030/motive-inline-desktop.png)
![Designkarte ohne Beschreibung](issue48-orientierung-20261030/designs-ohne-beschreibung.png)
![Desktop: graue Pfeile und fotorealistische Schrauben](issue48-orientierung-20261030/pfeile-schrauben-desktop.png)
![375 × 548: Textleiste und Preis](issue48-orientierung-20261030/pfeile-grau-375x548.png)
![390 × 664: Textleiste und Preis](issue48-orientierung-20261030/pfeile-grau-390x664.png)
![375 × 548: Suche im bisherigen Bereich](issue48-orientierung-20261030/motive-inline-375x548.png)

## Offen / nächster Schritt

Chris prüft die lokale Vorschau weiter. Echte Safari-/iPhone-Bedienung, Linux-Vollauf und spätere Shop-Abnahme bleiben offen. Keine Live-Daten, Freigaben oder Preise geändert. Chris' zusätzliche Bestseller-Motive stehen noch aus. Katalog-/Design-Masterdaten wurden nicht verändert.

## Feinschliff: Abstand unter dem Kopf

Chris wünscht nur wenige Pixel zwischen dunklem Kopf und Vollbild-Zeile: **4 px Außenabstand** am Desktop ab 768 px. Build erfolgreich; im Browser Kopfende bei y=50 und Werkzeugzeile ab y=54 gemessen. Bemaßung und Preis sichtbar, mobile Regeln unverändert. Reine CSS-Anpassung, kein erneuter Funktionstestlauf. Weiterhin lokal/Entwurf, keine Veröffentlichung.

![Vier Pixel Abstand](issue48-orientierung-20261030/kopf-abstand-4px.png)

## Feinschliff: helleres Blaugrau

Chris: „da blau wieder ein wenig heller“. Der Kopfbereich verwendet jetzt `#343e46` statt `#252a2e`, mit heller Schrift `#f7f7f7`. Der 4-px-Abstand bleibt erhalten. Build bestanden; tatsächliche Browserfarbe `rgb(52, 62, 70)` und Lesbarkeit geprüft. Reine Farbänderung, kein weiterer Funktionstestlauf und nichts live.

![Helleres Blaugrau](issue48-orientierung-20261030/kopf-blaugrau-heller.png)
