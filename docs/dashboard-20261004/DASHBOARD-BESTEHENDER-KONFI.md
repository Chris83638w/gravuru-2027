# Dashboard → bestehender Acryl-Konfigurator

Stand: 06.10.2026. Branch `task/existing-konfi-binding-20261006`, Ausgangscommit `84f649eab669486428c9450483605bbfd459660b`.

Die bestehende Kundenoberfläche bleibt verbindlich. Acrylprodukte öffnen bereits den vorhandenen Konfigurator über `/?configuration=…`; freie Formprodukte verwenden bisher eine separate technische Testansicht unter `/konfigurator/form/`. Deren Prüfung ist keine abgeschlossene Integration in die bestehende Kundenoberfläche.

## Änderung

Die beiden Vorschau-Links im Acryl-Produkteditor enthalten jetzt zusätzlich die gespeicherte `revision`. Ungespeicherte und archivierte Produkte bieten diese Links nicht an. Der Hinweis beschreibt den gespeicherten Stand einschließlich seiner Profilzuordnungen. Produktkarten, Historie und Druckexport hatten bereits feste Revisionslinks.

## Tatsächlich ausgeführte Prüfung

Am 06.10.2026 von 08:52:19 bis 08:52:30 Europe/Berlin (06:52 UTC): temporäre synthetische Werkstatt, Loopback-Server, Chromium. Dashboardtext geändert, Links während ungespeicherter Änderung verborgen, Revision 2 gespeichert und den bestehenden iframe-Editor geöffnet. Modell enthält den geänderten Text und Revision 2. Anschließend im Backend Revision 3 gespeichert; Neuladen des alten Kundenlinks liefert weiterhin Revision 2 mit ihrem ursprünglichen Text. Preis sichtbar, Desktop 1440 px, Handy 390 px und Tablet 768 px ohne Seitenüberlauf und ohne JavaScript-Fehler.

Build innerhalb der Fixture: **76 Ressourcen, 1 Modell**. Der vorherige vollständige Lauf mit 268 bestandenen Tests gehört zu Ausgangscommit `84f649e…` und wurde für diese kleine Linkänderung nicht erneut ausgeführt. Ein erster Browserprüfversuch wartete fälschlich per `document.querySelector` auf ein Element im Shadow DOM; korrigiert auf den Shadow-DOM-fähigen Playwright-Locator. Das war ein Fehler im Prüfskript, kein Startfehler des Konfigurators.

Wiederholen mit bereits installierten Anforderungen aus `scripts/requirements-browser.txt`:

```sh
PYTHONPATH=.local-data/python python3 scripts/check-existing-konfi.py
```

Das Skript akzeptiert keine fremde Datenbank oder Ziel-URL; es erzeugt ausschließlich einen temporären synthetischen Bestand und räumt ihn auf. [Maschinenlesbarer Nachweis](existing-konfi-check.json), [Desktop](existing-konfi-desktop.png), [Handy](existing-konfi-mobile.png).

## Grenzen und nächster Schritt

Das synthetische Ausgangsdesign „Unser Anfang“ ist ein Prüfprodukt, kein Ersatz für das gespeicherte Muster Acrylglasbild „Pia & Rafael“. Dessen Referenz und die veröffentlichte Testseite wurden nicht verändert. Keine privaten Daten, Shopify-Aufrufe, echte Bestellungen, Veröffentlichung oder Fertigungsfreigabe.

Als Nächstes die Formprodukt-Anbindung an den vorhandenen Konfigurator umsetzen: gemeinsame gespeicherte Geometrie, Material, Kundenfelder und Ausführungsrevision übernehmen; vorhandene Bedienung weiterverwenden. Danach Kundenentwurf → Werkstattprüfstand → PDF/ZIP zusammenhängend prüfen. Echte Shopify-Testbestellung und reale RIP-/Maschinenabnahme bleiben gesondert offen. Eine Prozentangabe ist eine grobe Entwicklungsschätzung und kein Fertigstellungstermin.
