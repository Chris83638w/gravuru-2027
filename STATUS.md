# Aktueller Stand – Gravuru 2027

Stand: 30.09.2026. **G27-01 lokal umgesetzt und geprüft. Nächstes Paket: G27-02.**

## Aktuelle Umsetzung

Aktive Anwendung: `app/`. Start: `LOKAL-STARTEN.md`. Vorschau: http://127.0.0.1:8961/?model=acryl. Der alte Vergleich auf Port 8951 bleibt getrennt. Dies ist eine lokale Entwicklungsgrundlage, keine installierte oder live bestellbare Shopify-App.

Gezielt übernommen: Kundeneditor, Motive, Schriften, Acrylszene und sechs Sockel samt benötigter Laufzeitmodule. `app/REFERENCE-UI.json` dokumentiert die ursprünglichen Dateien/Prüfsummen; aktive Fassungen enthalten bewusste Änderungen. Neuer lokaler Server und Einstieg laden nur das Acrylmodell, keine alten Admin-/Bestell-/Produktionsrouten.

Implementiert: gemeinsame versionierte Acrylpreisquelle, validierte Rechte fixer Vorlagenelemente, Fotozuordnung nur über eindeutige semantische Feldschlüssel. Kundenkorrekturen: physische mm-Schriftgrößen, runde Farbfelder/Farbwähler, deutlicher Fotoersatz, mobile direkte Texteingabe, Griffe vor dem Sockel, unpassende Reiter/Bedienelemente ausgeblendet. Das sind Teile von G27-02/G27-05, keine vollständige Abnahme dieser Pakete.

Aktuelle Prüfung: **57 Tests bestanden**; Build mit **76 Ressourcen und einem Modell**. Reale Browserprüfung: alle Sockel, Größe/Preis/Text/Farbe, zweimal Fotoersatz, mobile Texteingabe, mm-Wert nach Fokuswechsel und Griffe vor dem Sockel. Unabhängige Astra-Prüfung mit hohem Denkaufwand: gefundene mm-/Fotoformfehler behoben und nachgeprüft. Details und Grenzen: `G27-01-PRUEFUNG.md`.

Lokaler Aufgabenbranch: `task/g27-01-runnable-foundation`. Die lokale Git-Historie wurde aus dem Referenzstand initialisiert und ist nicht mit der Remote-Historie verbunden. **Nicht per Force-Push übertragen.** Connectorzugriff auf das neue private Repository und Git-Anmeldung waren nicht verfügbar. Ein Übergabearchiv ist ein separater Transportweg, kein gepushter Quellbranch.

## Abgeschlossen

- Eigenständiges privates Repository: `Chris83638w/gravuru-2027`.
- Ausgangsdokumentation auf GitHub: Commit `573d882588d968964bfd2a1e17414b22c3f69eac`.
- Umsetzungspakete, Startauftrag für GPT-6.1 Sol, Arbeitsregeln und Materialzuordnung vorbereitet.
- Vier Referenzarchive mit 294 Dateien: bestehender Quellcode, Motive/Schriften, Acrylressourcen, zwölf Materialbilder und zwei ausgewählte Oberflächenentwürfe.
- Probeentpackung und alle Datei-/Archivprüfsummen erfolgreich. 19 vorhandene Tests bestanden; Build erfolgreich mit 104 geprüften Ressourcen und 7 Modellen. Details in `QUELLEN-UND-START.md`.

## Keine Fertigbehauptung

Die erste lokale Kundenoberfläche ist implementiert. Vollständige Admin-/Shopify-Installation, freie PDF/SVG-Konturen, Produktdatenbank, Excel-Stapelimport und Bestellproduktion sind noch umzusetzen bzw. durchgehend zu prüfen. Endgültige Schriften und freigegebene Produktionsprofile bleiben offen. Referenzarchive sind keine automatische Migration.

## Neu berücksichtigt

Edelstahl, Schiefer, Leder und Holz gehören neben Acryl zur Grundlage. In der historischen Sammlung ist **Edelstahl v4** ausgewählt; v6 war eine falsche Zwischenzuordnung. Leder 2 mm und Holz 5 mm sind dort nur Bildannahmen. Schiefer-Designbeispiele liegen vor, reine Rohlingreferenz noch nicht eindeutig zugeordnet. `MATERIALREFERENZEN.md` lesen.

## Genau weiter so

G27-02 aus `UMSETZUNGSPAKETE.md`: gemeinsames Produkt-/Varianten-/Designmodell mit stabilen IDs, Revisionen, Speicherung, Migrationen und Versionskonflikten. Vorhandene Acrylregeln wiederverwenden. Danach Verwaltung und Bestellproduktion gemäß Paketfolge. Keine erneute vollständige Recherche oder Gesamtplanung.

## Fortschritt pro Paket ergänzen

Paket / Status / Branch und Commit / betroffene Dateien / konkret ausgeführte Tests / Ergebnislink / offene Grenzen / nächstes Paket. Historische Tests nicht als aktuelle Ergebnisse neuer Änderungen fortschreiben.
