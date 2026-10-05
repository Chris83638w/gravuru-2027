## Aktuell: Formkonturen importieren und prüfen – 05.10.2026

Branch `task/dashboard-contour-import-20261005`, Basis `138dc8bbc3dc7f742d40f86fa813fc706a41ec26` (M02-Varianten, über GitHub bestätigt). Werkstatt → Formkonturen: geschlossene SVG-/PDF-Außenform mit Innenausschnitten in tatsächlichen mm importieren, Vorschau und unverändertes Original sichern, gespeicherte Vorlagen erneut öffnen. Bestehende Designs/Produkte unverändert. **185 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell; Desktop/Mobil/Tablet mit synthetischen Konturdateien geprüft.** [Ergebnis, Installationsbefehl und Bilder](docs/dashboard-20261004/DASHBOARD-KONTUREN.md).

**Nächster Schritt:** Konturvorlage in das versionierte Material-/Formproduktmodell einbinden und dieselbe Geometrie in 2D-Vorschau und Produktionskontur nutzen. Importbibliothek ist fertig; freie Produkt-/Fertigungsanbindung und reale Maschinenabnahme bleiben offen. Kein Dashboard-Publish. Nachfolgende Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01 und M02-Variantensteuerung – 05.10.2026

Branch `task/dashboard-options-20261005`, Basis `092228adb0fbc6a14b0850cdeccee947c2c17a45` (M01-Karten/Verwaltungsaktionen, auf GitHub bestätigt). Zusätzlich in M02: verfügbare Größen, Sockel und Wandhalterungen samt Kunden-Startauswahl bearbeiten; gemeinsame Vorschau-/Preisauflösung und Revisionen. **177 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Backend → Speichern → echter Kundenkonfigurator in der bestehenden Cloud mit synthetischen Daten geprüft. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-VARIANTEN.md). Muster Acrylglasbild erhalten, kein Dashboard-Publish.

**Nächster Schritt:** Maßhaltiger SVG-/PDF-Konturimport im Material-/Formmodell, getrennt vom Designimport; Originalmaße und vorhandene Materialreferenzen erhalten. Shopify/Bestellstrecke und reale Fertigungsabnahme bleiben offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M01-Karten und Verwaltungsaktionen – 05.10.2026

Branch `task/dashboard-m01-overview-20261005`, Basis `8227eb7db836de5e30779e42fdd7bd36cb1a68f4`. Große Produktkarten mit tatsächlichem Design und vollständiger Platte, Größen/Stand/Designanzahl, Kopieren und revisionsgeschützte Einzel-/Mehrfacharchivierung samt Wiederherstellung. M02 und Muster Acrylglasbild bleiben erhalten. **176 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Cloud-Browserprüfung Desktop/Mobil mit synthetischen Daten, einschließlich parallelem Speicherkonflikt. [Ergebnis und Bilder](docs/dashboard-20261004/DASHBOARD-M01.md). Kein Dashboard-Publish.

**Nächster Schritt:** Verfügbare Acrylgrößen/Sockel und Startauswahl in M02 „Optionen & Preise“ über das bestehende Variantenmodell bearbeitbar machen. Shopify, weitere Materialadapter und echte Produktionsabnahme sind weiterhin offen. Die folgenden Abschnitte dokumentieren frühere Pakete.

## Aktuell: M02-Produktbearbeitung – 05.10.2026

Branch `task/dashboard-m02-editor-20261005`, Basis `b51f7fb6fa5ef4f9ed2b53832858f2035fc283e4`. Große Entwurfsvorschau zwischen Bereichen/Elementen und Eigenschaften; Text/Schrift/mm/Farbe, Kundenrechte, Beispielfotoersatz und Uploadhinweis angebunden. Vorhandene Speicher-/Import-/Verlauffunktionen weiterverwendet. **175 Tests bestanden, 0 Fehler/Skips; Build 76 Ressourcen/1 Modell.** Desktop/Mobil mit synthetischen Daten in der bestehenden Cloud geprüft. [Ergebnis, Grenzen und Bilder](docs/dashboard-20261004/DASHBOARD-M02.md). Keine Dashboard-Veröffentlichung; Muster Acrylglasbild unverändert.

**Nächster Schritt:** M01-Produktkarten entsprechend der ausgewählten fotografischen Übersicht korrigieren. Die älteren „fertig“-Aussagen sind keine vollständige Dashboard-Abnahme.

## Aktueller Auftrag – Dashboard fortsetzen, 05.10.2026

Nutzer hat „Dashboard“ ausdrücklich bestätigt. M01-Produktübersicht jetzt umgesetzt: [Stand und Abnahme](docs/dashboard-20261004/DASHBOARD-M01.md). Die UV-Serienvorbereitung ist derzeit nicht der nächste Schritt. „Muster Acrylglasbild“ bleibt separat [gesichert und direkt erreichbar](docs/dashboard-20261004/MUSTER-ACRYLGLASBILD.md). Weiter mit M02-Produktbearbeitung. Frühere Prioritäten unten sind historische Zwischenstände.

# Gravuru 2027 – aktueller Neuaufbau in der Cloud

Stand 04.10.2026. Nutzerauftrag: den gemeinsam erarbeiteten Neuaufbau der Gravur-Designwerkstatt fortsetzen. Bestehende funktionierende Module wiederverwenden; die alte Pipeline ist keine Ersatzvorgabe. Ausschließlich vorhandene Codex Cloud, keine neue Umgebung/Serverplanung, kein Live-Deployment.

## Maßgeblicher Stand

Repository `Chris83638w/gravuru-2027`. Dashboard-Ausgangsbranch `task/dashboard-customer-fields-20261004`, abgeleitet vom aktuell remote geprüften Übergabestand `1b4626eab6cc2e7d22f815754583cc678e57d558` auf `infra/cloud-only-handoff-20261004`. Nicht ungeprüft `main` verwenden. Vollständigen aktuellen Commit beim Einstieg mit `git rev-parse HEAD` erfassen; keine Rücksetzung auf eine ältere Referenz.

Vorhanden: aktiver G27-02-Quellbaum, Konfigurator mit Acryl-/Preisregeln, Produkt-/Masterverwaltung und Revisionen, Profilbibliothek, SVG/PDF-Designerersatz und Excel-Stapelanlage. Privatdaten sind davon getrennt. Dokumentierter Ausgangsstand: 137 Tests. Die neue Arbeit ergänzt diese Module, ohne sie durch die alte Pipeline zu ersetzen.

## Entscheidungen und direkt sichtbare Referenzen

Maßgeblich bleiben [Entscheidungsregister E01–E34](docs/cloud-migration-20261003/ENTSCHEIDUNGEN-REGISTER.md), [Bauplan](NEUE-WERKSTATT-PLAN.md) und [Arbeitspakete](UMSETZUNGSPAKETE.md).

- [M01 Produktübersicht](docs/dashboard-20261004/referenzen/M01.png): ausgewählte Variante 2, große Produktkarten, Suche, Master/Stapelzugang. Die aktuelle Listenübersicht ist noch nicht diese vollständige Kartenansicht.
- [M02 Produktbearbeitung](docs/dashboard-20261004/referenzen/M02.png): Elemente links, große Vorschau mittig, Einstellungen rechts. Die neue Kundenfeldbearbeitung übernimmt diese Aufteilung; die gesamte Werkstatt ist noch nicht vollständig nach M02 umgebaut.
- [C01](docs/dashboard-20261004/referenzen/C01.png): Designreiter nur bei Auswahl, Filter ausdrücklich optional; [C02](docs/dashboard-20261004/referenzen/C02.png): dezimale mm, perfekt runde Farbpunkte, „Ausgewählte Farbe“; [C04](docs/dashboard-20261004/referenzen/C04.png): Griffe im Vordergrund.
- [C03](docs/dashboard-20261004/referenzen/C03.png): Referenz zur Bestsellerfrage. Die genaue zusätzliche Listenlogik bleibt unbestätigt. M03–M05 sind Alternativen ohne endgültige Auswahl, weiterhin im [Originalarchiv](SCREENSHOT-REFERENZEN-20261003.zip).

Screenshots sind historische Referenzen; die dazu dokumentierten Änderungen gelten zusätzlich. Die sechs oben direkt bereitgestellten PNGs sind unveränderte Archivoriginale, keine neuen Entwürfe.

## Jetzt ergänzt

Werkstatt → Produkt → „Designs & Texte“ → importiertes Design → „Kundenfelder bearbeiten …“:
Text- und Fotofelder ausdrücklich benennen und zuordnen, Position/Maße in mm, vorhandene Schrift wählen, runde Farbvorschläge und separate Farbfreigabe. Große Vorschau vor dem Speichern, anschließend neue Produktrevision. Erneutes Bearbeiten/Entfernen der zugeordneten Felder möglich. Kunden dürfen Text bzw. Foto ersetzen; Position und Größe sind gesperrt. Feldnamen erscheinen auch in der Kundenansicht.

Die importierte Originalgrafik und historische Revisionen bleiben erhalten. Es werden keine PDF-Pfadtexte erkannt, entfernt oder durch Abdeckflächen versteckt. Vorlagen müssen passende freie Bereiche enthalten. Bestätigung dieser Voraussetzung ist zum Speichern neuer Felder erforderlich. Höchstens 19 Felder plus Originalgrafik, entsprechend dem vorhandenen 20-Elemente-Modell. Verfügbare Schriften werden aus dem Produkt übernommen; fehlende Glyphen werden gemeldet.

## Geprüfter Umfang und konkrete Grenzen

- Ausgangspaket mit 215 Dateien erneut gegen den Übergabecommit geprüft: 206 bytegleich, 6 nur Zeilenenden, 3 fortgeschriebene Dokumente, 0 fehlend. Alle vier Referenzarchive stimmen mit ihren Hashes überein; elf Originalscreenshots sind vorhanden/geprüft.
- Dokumentiertes früheres Chatwissen wird über das Register übernommen. Vollständigkeit jeder früheren mündlichen/chatbasierten Absprache ist damit nicht bewiesen; die oben genannten bestätigten Vorgaben sind zugänglich.
- Private Werkstatt-, Profil- und Designasset-Datenbanken sind in dieser Aufgabe nicht angebunden. Chris' separater Restore ist kein Nachweis ihrer Verfügbarkeit hier. Für diese Umsetzung genügen synthetische Daten und In-Memory-Datenbanken.
- Der neue Editor ist ein geprüftes Teilstück, keine vollständige Dashboard-Abnahme. M01-Kartenansicht und durchgängiger M02-Produkteditor mit Produktszene bleiben nächste Oberflächenarbeit. Automatische Zerlegung beliebiger PDFs, Material/Form/Bohrbild, Shopify und Produktionsausgaben bleiben separate offene Pakete.
- Der tatsächliche neue Prüfstand und Browserbilder stehen im [Prüfbericht](docs/dashboard-20261004/PRUEFUNG.md). Keine historischen Tests als neue Ausführung ausgeben.

## Weiterarbeiten

Node >=24 und Python 3.12 verwenden. Python-Anforderung: `python3 -m pip install --target .local-data/python -r app/workshop/requirements-import.txt`. Tests: `PYTHONPATH="$PWD/.local-data/python" npm test`; gezielt: `node --test app/workshop/customer-fields.test.mjs`. Build: `npm run build`. Start: `npm start` (geschützte Loopback-Vorschau auf Port 8961, synthetischer Master bei leerer Entwicklungsdatenbank). In dieser Aufgabe wurde die bereits vorhandene PyMuPDF-Installation des Cloud-Abnahmecheckouts über PYTHONPATH verwendet.

Für Entwicklung mit synthetischen Daten sind keine Produktivsecrets nötig. `.local-data/`, SQLite-Dateien, Schlüssel und private Originale nicht committen. Vor Konto-/Chatwechsel den Aufgabenbranch pushen und tatsächlichen Iststand dokumentieren; keine automatische Chat- oder Dateisynchronisierung voraussetzen.

Genau nächster fachlicher Schritt: die bestehende Produktübersicht mit echten Konfigurationsvorschauen an M01 anpassen, ohne Beispiele aus dem Mockup als vorhandene Produkte auszugeben; die neue Kundenfeldbearbeitung dabei weiterverwenden.

## Aktueller Folgeauftrag: UV-Designserie

Der Nutzer hat den Pilot „18 – Unser kleines Glück“ zur automatisierten Umwandlung vorhandener UV-Designbeispiele bestätigt. Nach erfolgreicher Abnahme soll ein weiteres Modell die übrigen Designs im geprüften Format vorbereiten. Konkrete GitHub-Quellen, bereits vorhandene Ebenen und aktueller Prüfstand stehen in [UV-DESIGN-PILOT.md](docs/dashboard-20261004/UV-DESIGN-PILOT.md). Dieser Folgeauftrag hat Vorrang vor der oben genannten M01-Übersicht. Keine neue Umwandlung als bereits bestanden ausgeben.

## UV-Pilot umgesetzt (04.10.2026)

Aktiver Folgebranch `task/uv-design-pilot-20261004`, Codebasis `03fc8aa74df2714ae523fd8208ae2ad3d7327cfa`. Nutzerupload des Master-ZIPs geprüft; neun Ebenen und fünf Kundenfelder aus der vorhandenen SVG automatisiert vorbereitet. Neuer zusätzlicher Designimport im bestehenden Dialog, Bogenfoto, Laufweite, wiederholter Fotoaustausch und Textbearbeitung geprüft. 150 Tests bestanden, 0 Fehler/Skips; Build 76/1; Desktop-/Mobilablauf geprüft. [Nachweis](docs/dashboard-20261004/UV-PILOT-PRUEFUNG.md) und [Vorlagenformat](docs/dashboard-20261004/VORLAGENFORMAT.md).

Die privaten Originale und die isolierte Pilotdatenbank bleiben außerhalb von Git, nur in dieser laufenden Aufgabe. Nicht mit Chris' privaten Bestandsdaten oder gemeinsamer dauerhafter Datenablage gleichsetzen. Nächster Schritt ist die Vorbereitung eines weiteren tatsächlich verfügbaren Originaldesigns im geprüften Format; dazu fehlen hier noch dessen Quelldateien. Keine beliebige Bildrekonstruktion, vollständige Schriftabdeckung oder UV-Produktionsfreigabe behaupten.

## Aktuelle Korrektur hat Vorrang: Originaldarstellung

Nutzer verlangt Originalfoto mit anklickbarem Uploadhinweis, unveränderte Beispieltexte (Pia & Rafael, weiterhin kundenseitig änderbar) und Berücksichtigung von 7 mm Verdeckung durch massive Holzsockel. Auf `task/uv-original-preview-20261004` wird das mitgelieferte Foto als separate, geprüfte Vorschau erhalten; keine Kunden-Upload-ID und keine Übernahme in Druck-/Kundenobjekte. Nächste Serienvorbereitung pausiert bis zum visuellen Originalabgleich. Die SVG-Basis ist laut ZIP-Anleitung bereits rekonstruiert, Schrift nur ähnlich; 93-%-Einpassung ist noch vorhanden. [Tatsächlicher Änderungsstand und offene 1:1-Lücke](docs/dashboard-20261004/UV-ORIGINAL-KORREKTUR.md).
