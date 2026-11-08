# Erste Motiv- und Designkarten vor dem Öffnen vorbereiten

Basis: `587a395`, isolierter Branch `dev/mika-first-panel-preload-20261108`. Auftrag Nutzer: „Setze alles um“, 08.11.2026. Kein Livezugriff, kein Preis-, Layout- oder Modulumbau.

## Änderung

- Bestehende native Erstmotiv-Auswahl in einem gemeinsamen Resolver; Reihenfolge, Produktauswahl und Bestsellerregeln bleiben erhalten. Shopvorwärmen verwendet dieselben Startschlüssel statt einer abweichenden Hausauswahl. Nutzungssortierungen des tatsächlichen Editors sind weiterhin maßgeblich.
- Nach Editorbereitschaft sechs tatsächlich erlaubte erste Motive mit zwei Arbeitern im Leerlauf vorbereiten, auch solange der Reiter verborgen ist. Dieselben per-item-Promises und Ressourcen werden beim Öffnen wiederverwendet; keine 703er-Gesamtladung.
- Nach dem vorhandenen authentifizierten Galerie-Metadatenabruf drei erste Designbilder auch im verborgenen Reiter laden. Bestehende Zwei-Anfragen-Warteschlange und Bildobjekte bleiben; Sichtbarwerden verursacht keinen erneuten Abruf. Formatwechsel verwirft alte geplante Aufträge. Save-Data/2g unterbindet diese Spekulation.
- Produktseiten-Vorwärmen nach DOM-Bereitschaft und zwei Zeichenzyklen, anschließend kurzem Leerlauf, statt auf alle Produktseitenbilder und `window.load` zu warten. Bestehendes Vorziehen bei Benutzerabsicht bleibt.

## Prüfungen

16 gezielte Tests für gemeinsame Auswahl, sechs verdeckte Motive, maximal zwei parallele Abrufe, erneutes Öffnen ohne Doppelladen, drei verdeckte Galerie-Bilder, Save-Data, Formatwechsel während Leerlauf, Produktseitenstart sowie bisherige Warmup- und Auswahlregeln grün. Bestehende Lazy-/Build-/HTTP-/Shopclient-Regressionssuite: 49 von 50 zunächst grün; die alte Erwartung „nur sichtbare Motive“ benötigt jetzt die echte initiale Motivauswahl im Testeditor. Dieser Testdatensatz wurde entsprechend dem beauftragten neuen Verhalten ergänzt; enger Wiederholungslauf 17/17 grün. Insgesamt 66 unterschiedliche Fälle final grün. Der neue Galerie-Nachweis führt den echten Installer mit kontrolliertem DOM/IntersectionObserver in einer VM aus; er ist kein realer Browser-/Server-Latenznachweis.

## Offene Grenze

Designbilder auf der Shopify-Produktseite selbst sind noch nicht vorbereitet: ihr erster Renderauftrag benötigt momentan die private Galeriesitzung. Diese Änderung bereitet sie direkt nach dem authentifizierten Editorstart vor. Keine privaten Galerietokens in das öffentliche Warmmanifest eingebaut, keine vollständige Editor-/Modellsitzung zum Vorwärmen gestartet. Produktseitige kleine, revisionsgebundene Designvorschaubilder und eine gemeinsam cachebare Grundplatte sind ein gesonderter nächster Schritt. Kein Versprechen, dass sofortiger Klick auf einem kalten Mobilgerät bereits fertig vorgeladene Bilder vorfindet. Reale Browserabnahme und Freigabe erfolgen durch Root.

Designs bleiben unverändert gemäß [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Rücknahme

Vor Deployment bestehende sieben Produktionsdateien anhand Gitbasis/Hashes sichern. Nur diesen Patch zurücknehmen und Editor neu bauen; keine Produkt-, Ressourcen-, Bestell- oder Datenbankänderung. Keine Serveraktion in diesem Arbeitsschritt.
