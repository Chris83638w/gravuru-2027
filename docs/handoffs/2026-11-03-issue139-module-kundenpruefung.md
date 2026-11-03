# Issue 139 – Produktabhängige Gerätebausteine und Kundenprüfung

Stand 03.11.2026, Fortsetzung von PR 153. Quellen: Claude 6588814817, 6589023089, 6589176539 und 6589326864; ENTSCHEIDUNGEN auf main b53be6a. **Kandidat, kein Deployment.** Bestandszählung der bisherigen Wellen unverändert: neu 2 / überarbeitet 8 / gesamt live 10.

## Gelieferter Code

Die gemeinsame Kundenschale enthält keine modernen Funkklingel-Module mehr. Ein gemeinsames Paket (132 Module, 1.324.469 Byte / 452.506 Byte gzip) und ein separates Gerätepaket werden aus demselben Quellbestand erzeugt. Gemeinsame Abhängigkeiten werden nicht dupliziert; dynamische Geräteimporte werden nur bei der gebundenen Schema-Kennung gravuru-doorbell/v1 aufgelöst. Serverseitige Validierung behält alle Produkttypen. Keine Typauswahl nach Titel oder Material.

| Bereich | Änderung |
|---|---|
| adapter, contract, customer-rights, lazy-resources-model, print-geometry, product-design-gallery, design-content | Geräteauswahl über product-model-module; Gerätecode nicht im Kern |
| adapter, workflow, ux | Geräteansicht über product-view-module, nur im Geräteframe initialisiert |
| studio-svg | Materialdarstellung über product-material-module |
| studio-products / doorbells | Reine Validierung ausgegliedert; Verwaltungs-/Freigabecode nicht mehr im Browserkern |
| Historische Referenzskripte | Bereits separat; native Vorbereitung/Abschluss rufen sie nicht auf |
| Galerie | Miniaturen erst nach Einsetzen der fertigen UX; Gerätevorlagen im Hintergrund nacheinander in der bestehenden Warteschlange |

Edelstahl und Acryl laden nachweislich **ein** Paket und keine Gerätebausteine. AOSU lädt den Kern plus Gerätepaket. Alle drei: historische prepare/finish-Aufrufe 0, historisches Geräte-Skript nicht geladen, keine JavaScript-Fehler. Das vollständige Register mit eigenen Ausführungs-Einstiegen für Türschild, Grabstecker und Gedenktafel sowie deren Live-Abnahme bleiben offen. Die generische Familienausführung ist noch kein fertiges Vier-Modul-Register.

## Kundenaktionen

| Vorgabe | Tatsächlich geprüft |
|---|---|
| R5 Motive löschen | Originalmotiv und Zusatzmotiv über Ebenen entfernt, danach 0 Motivobjekte. [Bild](2026-11-03-issue139-module-kundenpruefung/r5-motive-geloescht.png) |
| R6 Pflichtfeld erst beim Abschluss | Mustertext fokussiert/verlassen und Pflichtfeld geleert: frühe Schritte bleiben frei. Prüfung zeigt fehlenden Namen. Direkter Warenkorbknopf stoppt vor Bilderzeugung/Serveraufruf und führt zum Feld. Zwei dabei gefundene Fehler behoben: vorzeitige Meldung nach Berührung; leeres Pflichtfeld wurde nicht erkannt. [Früh](2026-11-03-issue139-module-kundenpruefung/r6-fruehe-schritte.png), [Abschluss](2026-11-03-issue139-module-kundenpruefung/r6-abschluss-pruefung.png) |
| R7 Motivpreis | 79,99 → 81,68 Euro nach einem Zusatzmotiv, Differenz exakt 169 Cent. [Bild](2026-11-03-issue139-module-kundenpruefung/r7-zusatzmotiv-preis.png) |
| R7 Suche | Wasser findet neben Wassermann auch Anker 1–4/Anker mit Seil durch verwandte Suchbegriffe. [Suchtext](2026-11-03-issue139-module-kundenpruefung/r7-semantische-suche.png), [Treffer](2026-11-03-issue139-module-kundenpruefung/r7-semantische-treffer.png) |
| R8 Warenkorbbild | Kandidatenfrontend im isolierten Browser mit echtem Backend und frischem Shopify-Warenkorb: gebürsteter Edelstahl + Leuchtturm + Kundentexte sichtbar, richtige Variante 57265913332092, Menge 1, Konfigurator und Warenkorb jeweils 19,99 Euro, Bearbeiten-Link vorhanden. HTTP 201 Entwurf / 200 Übergabe, keine JS-Fehler. [Echter Warenkorb](2026-11-03-issue139-module-kundenpruefung/r8-echter-warenkorb-kandidat.png), [Protokoll](2026-11-03-issue139-module-kundenpruefung/warenkorb.json). Kein Checkout/keine Bestellung. |
| R9 Designwechsel | Edelstahl: Koch + B02; Acryl: Koch + B02 + Anthrazit; AOSU: Koch + 24×20, Position opposite, FK-SEITLICH, Anthrazit, B04S bleiben erhalten. [Stahl](2026-11-03-issue139-module-kundenpruefung/icons-designwechsel-steel.png), [Acryl](2026-11-03-issue139-module-kundenpruefung/icons-designwechsel-acryl.png), [AOSU](2026-11-03-issue139-module-kundenpruefung/native-designwechsel-doorbell.png) |
| R16 Optionen | Stahl/Acryl mit Symbolkacheln, K00 zuerst, feste Größe nicht wählbar; Funkklingel behält ihre eigene Ausführung. Gedenktafel/Grabstecker noch offen. |

R3/R4 bleiben verbindlich: 0 mm Gravurrand und Gestaltung über Bohrlöchern ohne Kundenwarnung. Dieses Paket führt keine Rand-/Bohrlochsperre ein. Aktuelle Sichtprüfung auf allen Linien wird nicht behauptet.

## Prüfung und Grenzen

Vollständiger Linux-Lauf mit maximal zwei Testprozessen: 2.047 bestanden / 2 fehlgeschlagen. Die beiden Fehler waren veraltete Testanker nach der Warteschlangen-/Pflichtfeldänderung und wurden korrigiert. Anschließend alle betroffenen Dateien einschließlich neuer Warenkorbguard-, Bündel-, Schema-, Pflichtfeld- und Foto-Tests: **94 bestanden, 0 fehlgeschlagen**. [Gesamtlauf](2026-11-03-issue139-module-kundenpruefung/linux-gesamt.log), [Nachprüfung](2026-11-03-issue139-module-kundenpruefung/linux-nachpruefung.log). Der zuvor wegen zu vieler paralleler Testprozesse abgebrochene Lauf zählt nicht als bestanden.

Browserfunktionen mit echten Produktmodellen, isoliert: Stahl 4,956 s / Acryl 4,912 s bei 9 Mbit/s, 150 ms Latenz und CPU ×4; Galerien 52.516 / 51.944 Zeichen, je 40 Karten. Diese Werte sind **keine** Abnahme mit scripts/konfi-messen.cjs. Verbindliche Desktop-/Handyziele je Linie und Live-Nachmessung stehen aus. Das bestehende Live-System ist unverändert.

Nächste Schritte: restliches Ausführungsregister/fehlende Linien vervollständigen, Ladezeitabnahme je Linie. Claude prüft Register und Trennung vor Merge. Bulk-Pipeline mit etwa 100 Produkten je Lauf und Navigation folgen dem Ladezeit-Paket.

Die Warenkorbprüfung wurde mit ausschließlich im isolierten Browser ausgetauschtem Kandidatenfrontend durchgeführt; Server und Shop blieben auf ihrer bisherigen Veröffentlichung. Das ist ein echter Warenkorbtest, aber kein Live-Deploymentnachweis. Die erste Prüferwartung von 18,99 Euro war veraltet; der wiederholte Lauf verglich den aktuellen sichtbaren Konfiguratorpreis mit dem Warenkorb (beide 19,99 Euro).
