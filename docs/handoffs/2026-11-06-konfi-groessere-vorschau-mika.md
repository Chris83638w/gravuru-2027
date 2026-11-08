# Konfi: größere Tafel und bündige Bedienreihe

Stand 06.11.2026, Codex/Mika, Branch `dev/mika-konfi-anschluss-20261105`, Draft-PR #178. Aufbau auf `4c4d4f3a` (R10). R11 seit **09:31:22 UTC / 10:31 Uhr Berlin** aktiv: `editor-3ce792e6e3efd39f.mjs`.

## Auftrag und Grenzen

Mikail fordert anhand zweier Screenshots: **„bitte alles auf eine Höhe“**, **„es geht zu viel Platz verloren. Der Kunde muss es gut gestalten können. Die Tafel ist zu klein. Cleverer machen“**, anschließend ausdrücklich **„umsetzen“**. Gilt für Vorschaufläche, Abstände und Anordnung der Bedienelemente.

Neue dauerhafte Arbeitspräferenz: **Optimierungsvorschläge aktiv nennen, aber nicht ohne Auftrag umsetzen.** Vorgeschlagen wurde die deutlichere Bezeichnung „Ansichtszoom“; sie wurde in diesem Layoutpaket nicht eingeführt. Weitere Vorschläge bleiben vorab abzustimmen.

Nur `design-reset.mjs`, `modern-navigation.css`, `view-zoom.css` sowie der bestehende DOM-Testadapter in `design-reset.test.mjs` geändert. Keine neue Fachregel, kein Preis-/Geometrie-/Rechtewechsel. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich. Abstimmung in Issue #168, Reservierung 6681557047.

## Umsetzung

- Reset in die bestehende Stage versetzt: keine eigene zusätzliche Zeile mehr. Bestätigungsdialog, Originalvorlage und Undo unverändert.
- Desktop: Fotogröße links, Zurücksetzen mittig, Ansicht rechts; gemeinsame Unterkante und 44 px Höhe. Reglerbreiten lassen den mittleren Button frei.
- Kleinere obere Abstände und frei gewordene Resetzeile vergrößern den verfügbaren Plattenbereich. Keine Änderung von Objektmaßen oder Ansichtszoomwerten.
- Handy: Fotogröße bei ausgewähltem Foto in einer Zeile; Reset und Ansicht bündig darunter. Bei ausgeblendetem Fotoregler bleibt nur die gemeinsame Zeile. Alle Ziele bleiben 44 px hoch, keine überlappenden Regler.

## Prüfungen

**66/66 gezielte Tests lokal und 66/66 auf Linux**, null Fehler/übersprungene Tests; beide Builds erfolgreich. Geprüft wurden Reset/Bestätigung, Ansichtszoom/Modell, Foto-UI, Toolbar-Hosts, mobiles Vorschaulayout und Überlagerungshinweis. Keine unnötige neue Testdatei für die CSS-Korrektur; bestehender Resetadapter auf den neuen Elternknoten angepasst, fachliche Erwartungen unverändert.

Direkte Browserprüfung lokal:

- Desktop 1440×709: 22×14 cm ohne Auswahl von **535,85×341 px** auf **655,28×417 px** vergrößert, Vorschaucontainer unverändert 897,75×573 px. Rund **22,3 % mehr Breite / 49,5 % mehr Fläche**, kein genereller Prozentwert für alle Fenster/Formate.
- Mit synthetischem Foto: Fotogröße, Reset und Ansicht jeweils Oberkante **580 px**, Höhe **44 px**, horizontal getrennt. Fotogröße bedient, Ansicht 100 → 101 → 100 %, Resetdialog geöffnet und abgebrochen.
- Größenwechsel auf 30×20 und Vollbild/Rückweg geprüft. Vorhandenes Foto und Optionen bleiben erhalten.
- Handyansichten 390×844 und 375×740 mit Foto: Platte 330×210 bzw. 315×200,45 px; Reset und Ansicht jeweils gleich hoch, keine Überschneidung. Browseremulation, kein physisches Smartphone.

Veröffentlichter Stand:

- Hauptansicht live mit 655,28×417 px Platte bestätigt; alle drei Bedienelemente auch mit Testfoto exakt bei y=580 px / Höhe 44 px.
- Live-Handyansicht 390×844 bestätigt: Fotoregler y=413 px, Reset/Ansicht y=463 px, Platte 330×210 px. Eigener Testtab anschließend frisch gestartet; Nutzerentwürfe nicht neu geladen.
- Beide Seiten und Modelle sowie Hauptbundle und vier Zusatzmodule HTTP 200. Beide Produktmodelle bytegleich: 43 Designs, 1999/2499 Cent, 169 Cent Zusatzmotiv.
- Veröffentlichung nach erneuter Plesk-Anmeldung, Abgleich der aktiven Quelldateien, versionierter Serverkopie und Linux-Prüfung. Vorversion/Sicherung erhalten, keine Datenbankänderung.

[Maschinenlesbarer Nachweis](2026-11-06-konfi-groessere-vorschau-nachweis.json). Kein neuer Warenkorb-/Bestellnachweis, Produktlaunch oder Merge. Kein pauschaler Volltest aller Repositorymodule behauptet.

## Nächster Schritt

Mikails Sichtprüfung über den [frischen Testlink](https://app-2027.gravuru-designwerkstatt.de/produktvorschau/21afd5dc8edad301caace78b04c7973c6a2e6f7b3133dd24/22x14.html?fresh=1). Weitere Optimierungsideen zuerst benennen und abstimmen.
