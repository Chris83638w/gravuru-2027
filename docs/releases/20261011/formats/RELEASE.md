# Formate, Designimport, Katalog und Hilfslinien · 11.10.2026

## Änderungen

- Händlereditor: Hilfslinien für Schildmitte, Rand und Kanten/Mitten anderer Elemente. Einrasten mit vier Bildschirmpixeln Abstand; Schalter für Hilfslinien und Einrasten, Alt unterdrückt Einrasten. Nur während des Ziehens, nicht in Fertigungsdateien.
- Einlagiges Edelstahlschild: Grundmaß und Form (Rechteck, abgerundet, Oval/Kreis) bearbeiten; komplette Designs proportional in die wirkliche Kontur einpassen. Zusätzliche Kundenformate mit gleichen Proportionen und ausdrücklich eingetragenen Einzelpreisen. Kunde, Vorschau, Shopify-Vorbereitung und Export verwenden dieselbe Geometrie/Preisquelle. Noch offene Form-/Größeneingaben werden beim Speichern übernommen.
- Hintergrund & Szene: Rohlingbild sowie getrenntes Szenenbild austauschen; Standardhintergrund wiederherstellen. Szene bleibt außerhalb technischer Ausgaben.
- PDF/SVG: zuvor wurde bei Edelstahl fälschlich der Acrylbereich verwendet. Einpassen berücksichtigt nun die tatsächliche Kontur samt Sicherheitsrand, auch oval/abgerundet. Andere Designs und Originaldateien bleiben erhalten; editierbare Aufbereitung folgt auf die Einpassung.
- Katalog: kompakte Liste oder Karten, Material/Kategorie, Suche, Sortierung, 24/48/96 Produkte pro Seite und gemeinsame Kategoriezuweisung. Abgeleiteter SQLite-Index liest beim Blättern keine vollständigen Schrift-/Design-/Bildpakete; Originalrevisionen bleiben unveränderlich. 3.000 Produkte geprüft. Auswahl gilt ausdrücklich nur für die sichtbare Seite.
- Shopify: eindeutiger Weg vom gespeicherten Stand zur bestehenden journalgestützten Entwurfsübertragung. Eigene App-Anmeldung mit kurzlebigem, nur im Speicher gehaltenem Token; keine neuen Berechtigungen angefordert. Shopify-Entwurf und öffentlicher Konfigurator/Checkout sind getrennte Freigaben.

## Prüfung vor Veröffentlichung

726 Regressionstests bestanden; 29 abschließende gezielte Prüfungen bestanden (überlappende Mengen). Isolierter echter Händler-Backend-/Browserablauf mit synthetischer Shopify-Identität: Größen-/Preiswahl, Hintergrund, Hilfslinien beim Ziehen, Speichern/Neuladen, Kundengestaltung und PDF-Einpassung. Desktop/Mobil sichtbar geprüft. Kein echter Shopify-Nutzerlogin durch den Test.

19 unterschiedliche erreichbare Original-PDFs in einer privaten Datenkopie auf dem tatsächlich vorhandenen Edelstahlprodukt Revision 2 jeweils rechteckig/oval eingepasst und zur Bearbeitung aufbereitet. 38 Konturprüfungen, Originale bytegleich, Produktstand unverändert. Die genaue Datei unter dem Screenshot-Namen `GT1E86_1.PDF` ist nicht ausdrücklich verfügbar; der Fehler wurde mit einem übergroßen PDF sowie den erreichbaren Originalen geprüft. Der erste Originaltest hatte vorhandene Motivressourcen nicht mitgeladen; danach vollständige private Ressourcenkopie verwendet. Erster Browserlauf fand fehlende statische Modulfreigaben; Ursache behoben und erfolgreich neu geprüft.

Vor der Installation: drei private Datenbanken auf Server und in Cloud gesichert; SHA-256 und SQLite-Integrität stimmen überein. Gegenüber voriger Veröffentlichung sind die neueren Produktänderungen und zwei zusätzliche SVG-Ressourcen erhalten. Private Daten, Quellen-PDFs und Geheimnisse sind nicht im Repository.

## Grenzen

AOSU besitzt eine feste, zweilagige technische Konstruktion; diese allgemeine Formbearbeitung gilt für das einlagige Edelstahlschild. Größenänderungen mit festem Bohrbild benötigen eine eigene freigegebene Geometrie. Zusätzliche Größen eines Produkts haben dieselben Proportionen; andere Grundproportionen über Produkt → Schildgröße & Form. Keine erfundenen Preise oder Maschinenfreigabe.

Shopify-Produktentwurf ist noch keine öffentliche personalisierte Bestellstrecke. Medienübertragung, neue Verkaufsbindungen, öffentlicher Checkout, AOSU-Fertigungsexport und Maschinenabnahme bleiben getrennte offene Arbeitspakete. Bisherige Kundenwerkstatt und Shopify-Theme werden durch dieses Paket nicht verändert.

Nächster Schritt: geprüften Paketstand gesichert aktivieren und tatsächlich ausgelieferte Laufzeit bestätigen; anschließend öffentliche Verkaufsbindung samt Testbestellung als eigenes Paket.
