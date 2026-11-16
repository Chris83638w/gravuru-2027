# Unabhängiger Teilmerge: Galerie und mobile Oberfläche

11.11.2026 · Gemeinsamer Kandidat `work/issue230-integration-candidate`: Merge von `ac10e6c` in den B/C/v9-Stand `0e200d8`, ohne Commit. Nur zugeteilte Dateien geändert; kein `git add`, Commit, Push oder STATUS-Eintrag. Kein Serverzugriff und keine Produkt-/Originaländerung.

## Zusammengeführte Funktionen

15 Konfliktblöcke in acht Dateien sind aufgelöst und markerfrei:

- `app/configurator/mobile-demo/assets.mjs`: vorhandene Assetfreigabe um R15 `compact-controls.mjs` erhalten.
- `demo.mjs`: bestehende native Funktionen plus Installation und vollständiges Entfernen der R15 CompactControls.
- `demo.test.mjs`: R15 Icon-Beschriftung und kompakte Bedienung bleiben testbar; die bisherigen Tests zur nativen Validierung, Identität, Checkout, Fokus und Entfernung bleiben erhalten.
- `preview-action.mjs`: die R15-Weiterentwicklung desselben nativen Vollansicht-Einstiegs gewählt, nach Einzelprüfung aller fünf Konfliktblöcke. Kompaktes zugänglich beschriftetes Icon, Positionierungsbeobachtung und sauberes Entfernen bleiben; kein zweiter Viewer und kein neuer Checkoutweg.
- `app/workshop/shop-design-gallery.mjs`: Suchmetadaten und Suchquery erhalten; R15 `start(...,{cardModel})` nutzt das bereits bereitgestellte Modell, statt es erneut zu öffnen. Modulprüfung bleibt vor dem Einstieg erhalten.
- `app/workshop/ui/shop-design-switch.mjs`: `q` wird weiterhin durchgereicht; zugleich bleiben R15 `AbortSignal`, Vorschau-Aktivitätsbenachrichtigung und Suspend/Resume bei Wechsel, Fehler und Zurück erhalten.
- `app/workshop/design-dashboard.mjs` und `ui/design-dashboard-ui.mjs`: Originalherkunft zuerst, danach `katalogPrio` innerhalb derselben Herkunft, dann natürliche ID. Quelle: aktuelle v9-Übergabe und R15/Kundensuche. R15 Cache, Signaturen, Sicherung/Laden und Worker-Anbindung bleiben. Nach ausdrücklicher zusätzlicher Zuteilung wurde der historische Dashboard-Test korrigiert und verstärkt: zwei Originale müssen vor einem priorisierten neuen Design stehen; dieses bleibt vor einem anderen neuen Design. Der Test war vor der Komparatorkorrektur rot (D9 vor D1/D2), danach grün.

Rein lesend geprüfte Cleanmerges: `shop-design-gallery.test.mjs` erhält die drei Suchtests zusätzlich zum bisherigen Bindungs-/Scope-/Cache-/Vorschauumfang. `ui/shop-entry-client.mjs` erhält den Suchparameter unverändert und ergänzt signalgebundene private/öffentliche Vorschauanfragen. `shop-preparation.mjs` wurde nicht geändert und liegt nach neuer Zuteilung ausschließlich beim Backendagenten.

## Frischer Serverabgleich: design-targets.mjs

Gesicherte Eingabedatei: `work/restabschluss/server13-input/app/workshop/design-targets.mjs`, SHA-256 `cf778d17754debf1f868acac0dff70e3d3f10ff4bdbf816e08f0e6832695d202`.

Gegen `ac10e6c` und den Kandidaten besteht genau eine Änderung: der Serverstand entfernt den vorhandenen Mindestflächen-Guard einschließlich Kommentar. Kein zusätzlicher Cache-/Performancecode steckt in diesem Delta. Die Entfernung wird nicht übernommen. Das Entscheidungsregister §5.5 und §5.27 bestätigt filigrane Designs erst ab 9 × 6; der vorhandene Test prüft sowohl die kleinere gesperrte Größe als auch ein Design ohne Mindestflächenfeld ohne erfundene neue Sperre.

**Zusätzlich an allen echten v9-Kleinquellen geprüft:** sechs Produkte mit je 27 Designs, insgesamt 243 Design-/Größen-/Farbkombinationen. In keinem dieser Designs ist ein Mindestflächenfeld gesetzt; alle 243 bestehen die aktuelle Zielkompatibilität, null Mindestflächen-Ablehnungen und null sonstige Unverträglichkeiten. Diese bestehende Feldregel schränkt die konkret bestätigten 27 Designs daher nicht ein. Beleg `small-design-compatibility.json`, reproduzierbar mit `check-small-design-compatibility.mjs`, Katalogpin 8236b8b. Keine Ausnahme oder Toleranzlockerung erforderlich.

## Die drei weiteren frischen Serverdateien

Gesamteingang `work/restabschluss/server19-input`, von Root aus Serverbackup `0d6d23d9` bereitgestellt. Alle vier überprüften Serverfassungen und Kandidatdateien stehen mit Byte- und Git-Referenzhashes in `agent-gallery-mobile-server-decisions.json`.

- **design-target-rules.mjs:** Server setzt die Werkstatt-Strichwarnung von 0,3 auf 0,5 mm zurück und entfernt den Filter für bereits nativ gelöste Bohrungsnähe. Aktueller Code bleibt: DESIGN-MASTER §8 Zeile103 und ENTSCHEIDUNGEN §5.8/R17 belegen 0,3 mm für Katalogdesigns; §3.42 grenzt den weiterhin 0,5-mm-Hinweis beim Kunden-Logo ausdrücklich ab. ENTSCHEIDUNGEN §3.40 und DESIGN-MASTER Zeile58 belegen das native Ausweichen. Gesperrte oder weiterhin nahe Texte warnen nach wie vor. Keine neue 27er-Ausnahmelogik in der Serverfassung.
- **katalog-family-formats.mjs:** Server entfernt `offeredFamilyIds` und damit die konkrete Unterkategorie-Materialauswahl und setzt Stahl-Logo pauschal aus. Aktuelle getrennte Material-/Modulverträge bleiben erhalten. Die sechs v9-Kleinprodukte haben bereits explizit Foto/Logo AUS; das Hauptacryl AN. Keine Quelle/kein Plan wird dafür neu erzeugt oder verändert. Bestehende Stahlproduktfälle außerhalb dieser sieben werden nicht still global umgeschaltet.
- **product-preview.mjs:** Server entfernt den weicheren familyFormats-Schatten, originale Katalogfotopixel, native Bohrungsausweichvorschau und Schraubenköpfe. Die aktuellen belegten Wege bleiben: jüngster Nutzerauftrag/Materialübergabe vom11.11., Entscheidungsregister1.21 für Originalfotos und bestehende Montagevorschautests. Kein zusätzlicher eigenständiger R15-Vorschauschritt wurde in diesen entfernten Blöcken gefunden.

Diese vier Serverdeltas sind damit explizit einbezogen; es erfolgt kein blindes Überschreiben mit einem älteren Vollfile. Die übrigen 15 Serverdateien liegen bei Root und den anderen zugeteilten Agenten.

## Tatsächliche Prüfungen

- 88 Tests bestanden: `mobile-demo/demo.test.mjs` und `design-dashboard-ui.test.mjs`.
- 46 weitere Tests bestanden: `shop-design-gallery.test.mjs`, `shop-design-switch.test.mjs`, `design-dashboard-cache.test.mjs`.
- 11 Tests in `design-targets.test.mjs` bestanden, einschließlich Mindestgröße und revisions-/freigabetreuer Zielmigration in synthetischen Testverzeichnissen.
- 1 gezielter kombinierter Test `work/restabschluss/gallery-switch-combined.test.mjs` bestanden: Suchquery, Optionen, Preview-Abbruchsignal und Aktivitätsmeldung funktionieren im selben zusammengeführten Gateway.
- Neun zugeteilte Module bestehen `node --check`; `git diff --check` für diese Dateien ohne Befund.

Zusätzlich bestanden 30 Tests aus dem nun verfügbaren Dashboardtest, `design-target-rules.test.mjs`, `katalog-family-formats.test.mjs`, `catalogue-photo-preview.test.mjs` und `product-preview-mounting.test.mjs`. Damit sind **176 unterschiedliche gezielte Tests grün**; der isolierte Vorherrot/Nachhergrün-Sortiertest ist in diesen30 enthalten und wird nicht nochmals gezählt. Der erste Shop-Switch-Importlauf war noch durch einen fremden `contract.mjs`-Konflikt blockiert; nach dessen Auflösung wurde genau der betroffene Test erneut erfolgreich ausgeführt. Die zunächst fehlende Ops-Abhängigkeit wurde von Root im Sparse-Checkout verfügbar gemacht.

Die zunächst blockierten acht Fälle wurden anschließend gezielt mit den bereits vorhandenen Python-/SVG-Abhängigkeiten aus dem Backendnachweis und erlaubtem Loopbackzugriff wiederholt: **8/8 grün**, keine Installation oder Testabschwächung. Damit sind abschließend **184 unterschiedliche Tests grün, keine offene Testfehlfunktion in diesem Teilumfang**. Das umfasst die vollständigen sieben Materialvorschaufälle und den echten Dashboard-HTTP-/CSRF-/Pfadschutztest. Root führt die gemeinsame Browsersichtprüfung durch.

Keine neue Browsersichtprüfung und keine Performance-/Live-Abnahme dieses Integrationskandidaten behauptet. Die tatsächlichen 19 Serverabweichungen bleiben als eigener Abgleich erkennbar; die frühere ac10-Gegenüberstellung ersetzt ihn nicht.
