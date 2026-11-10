# Vorbereitete Konfi-Pakete im bestehenden Acrylhost

Stand: 10.11.2026, Codex/Mika. Isolierter Branch `dev/mika-acryl-prepared-bundles-20261110`, Basis `f69c8dbfd1703e4abe2da80c1955d086cddbe547`. **Lokal geprüft, nicht veröffentlicht.**

## Enger Umfang

Der bestehende Acrylhost holt bisher bei jedem Bundleabruf die gesamte Datei über seinen internen HTTP-Server, schreibt die Ressourcenpfade um und liefert unkomprimierte Bytes an LiteSpeed. Dieser Kandidat bereitet ausschließlich öffentliche `/_acryl-bundle/editor-[16 Hexzeichen].mjs` vor und verwendet danach die fertigen Bytes. Keine neue öffentliche Route, kein CDN-/Plesk-Wechsel und kein neuer Konfigurator.

Drei Produktionsdateien:

- `app/workshop/prepared-editor-bundles.mjs` (neu): die zwei schon vorhandenen HTML-Preloads beim Start umschreiben und gzip-komprimieren; weitere historische Pakete erst auf Abruf. LRU-Speicher höchstens 32 MiB, einzelne Quellpakete höchstens 20 MiB. Dateien werden weder erzeugt noch gelöscht. Dateistempel inklusive Inode, Größe und Änderungszeiten werden bei jedem Treffer geprüft.
- `app/configurator/variant-m/server.mjs`: privater interner Adapter benutzt weiterhin die vorhandenen Händlerhost-Prüfungen und Sicherheitsheader. Diese laufen auf jedem Abruf, auch auf warmen Treffern.
- `app/workshop/acryl-employee-host.mjs`: genau zwei Anschlusszeilen; gültige Bundleantwort vor dem bisherigen Loopbackproxy liefern. Alle anderen Routen bleiben unverändert.

Die Acryl-Pfadumschreibung ist dieselbe Funktion wie bisher. Normale und entpackte gzip-Antwort sind bytegleich. Der Inhalt, seine Modulinstanzen, Styles, Bilder, Preload-Anzahl und Produktdaten ändern sich nicht. Kein zweiter Preis-, Rechte- oder Freigabevertrag. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert.

## Prüfungen

43 unterschiedliche Fälle bestanden: acht neue funktionale Fälle, sieben Routingfälle, neun Bundlefälle und 19 vorhandene Händlerhostfälle. Der erste kombinierte Lauf hatte 39/41 bestanden; zwei Excel-Exportfälle fanden die dokumentierte Abhängigkeit `openpyxl` nicht. Sie bestanden nach Installation ausschließlich der Projektdatei `requirements-excel.txt` in einer eigenen lokalen Venv. Diese beiden Fälle wurden gezielt nachgeprüft. Keine Tests übersprungen und keine Anpassung der Produktlogik für die Tests.

Die neuen Fälle belegen echte HTTP-Antworten mit der nativen Host-/Origin-/Fetch-Site-Prüfung, unveränderte CSP, kein zusätzliches CORS, HEAD, gzip samt q=0/Identity/406, fertige gültige ESM-Inhalte, alte Pakete, Dateiänderung/Löschung, begrenzten Speicher und Rückfall bei Fehlern. Private APIs, HTML, Modelle und Original-/Kundenvorschauen werden ausdrücklich nicht verarbeitet.

```powershell
node --test app/workshop/prepared-editor-bundles.test.mjs app/workshop/acryl-host-routing.test.mjs app/configurator/variant-m/bundle.test.mjs app/workshop/shopify-admin-host.test.mjs
# Für die vorhandenen Excel-Exportfälle: GRAVURU_PYTHON auf eine eigene Venv mit
# app/workshop/requirements-excel.txt setzen.
node ops/proofs/prepared-editor-bundles.mjs <vorhandene-öffentliche-editor-HASH.mjs>
```

## Messung und Grenzen

Mit dem tatsächlichen veröffentlichten Core `editor-e49b3da45a697a36.mjs` lokal über HTTP verglichen, jeweils zwölf Abrufe: bisherige Loopback-/Rewrite-Kette Median 14,21 ms, vorbereitete gzip-Antwort 3,17 ms. Einmalige synchrone Vorbereitung 44,92 ms. Entpackt weiterhin 1.454.759 Bytes und SHA `12c0c828986e8acf132e34ca078527b21b577c69edc96a5405d1e0b002c09af4`. Fertiges gzip 484.780 Bytes; bisher extern beobachtetes LiteSpeed-gzip 545.987 Bytes (rund 11 % mehr Übertragung vermeidbar, sofern der Edge die vorbereitete Kompression durchreicht).

Das ist **keine Messung der künftigen Kundennetzverbindung**. LiteSpeed und der externe Übertragungsweg wurden im lokalen Vergleich nicht simuliert. Der dokumentierte 44-s-Transfer und Browserabbruch sind damit nicht als gelöst behauptet. Eine kalte Vorbereitung blockiert kurz synchron; normalerweise geschieht dies für die zwei aktuellen Pakete vor Annahme von Kundenanfragen. Historische, bislang nicht vorbereitete Pakete benötigen diesen Schritt einmal beim Abruf. Fehlende, zu große oder nicht vorbereitbare Dateien bleiben auf der bisherigen Route. Der normale Browsercache bleibt `public, max-age=31536000, immutable`; `Vary: Accept-Encoding` und korrekte Bodylängen bleiben erhalten.

## Übernahme und Rücknahme

Root prüft vor Übernahme die aktuellen drei Quelldateien gegen `docs/reviews/2026-11-10-prepared-acryl-bundles/manifest.json`; die neue Datei muss bisher fehlen. Keine vorhandenen Pakete überschreiben. Alle drei Quellen gemeinsam installieren, bestehende aktive Runtime und ihre privaten Pfade beibehalten und gezielt neu starten. Der vorhandene Startbuild bleibt unverändert; dieser Patch schreibt selbst keine Build-/Datenartefakte. Danach vollständigen Coreabruf, gzip-Dekompression/SHA, Host-/Origin-Sperre und echten Produkteinstieg messen. Keine privaten API-Antworten auf eine statische Auslieferung umstellen.

Rücknahme: zwei bestehende Dateien aus der unmittelbar vorherigen Sicherung wiederherstellen und nach Entfernen des Imports den neuen Helfer aus dem aktiven Quellpaket nehmen; gezielter Neustart. HTML und Bundlebytes bleiben durch diesen Patch unverändert. Keine Shopify-, Produkt-, Upload- oder Datenbankrücknahme.

Unabhängiger Review ist angefragt; Root entscheidet die Übernahme getrennt. Exakte Dateihashes, Messwerte und Testgrenzen stehen im [Prüfnachweis](../reviews/2026-11-10-prepared-acryl-bundles/proof.json).
