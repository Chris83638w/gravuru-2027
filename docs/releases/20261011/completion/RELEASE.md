# Abschluss der gemeldeten Werkstatt-Bedienfehler

11.10.2026. Veröffentlichung wird nach Paketprüfung dokumentiert. Ausgangsstand `8486800`, laufender Quellstand zunächst `4d8042f`. Keine Behauptung, der gesamte historische Master-Bauplan einschließlich externer Integrationen und Maschinenabnahme sei abgeschlossen.

## Ergänzte Bedienung

- PDF-Textdialog bietet die vollständige erreichbare Schriftbibliothek einschließlich hochgeladener Schriften. Die ausgewählte Ressource wird bei Bedarf in die neue Produktrevision eingebunden; fehlende Glyphen bleiben ein erklärter Fehler.
- PDF-Sonderzeichen/Ligaturen erhalten einen ausdrücklichen Prüfhinweis. Es findet keine allgemeine erfundene Texterkennung oder Ersetzung privater Unicode-Zeichen statt.
- Rückgängig/Wiederholen umfasst direkte Text-, Farb-, Größen-, Namens-, Hinweis- und Kundenrechte-Änderungen sowie Bild-/Rohlingersatz und Elementaktionen. Zusammenhängende Eingabe wird gruppiert. Strg/⌘ Z und Umschalt Z außerhalb von Eingabefeldern; native Textfeldbedienung bleibt erhalten. Verlauf bis 20 Schritte, nach Speichern gilt der unveränderliche Revisionsverlauf. Unabhängige Produkt-/Profiländerungen verwerfen den flüchtigen Gestaltungsverlauf, damit ältere Ganzdokument-Snapshots diese nicht stillschweigend zurücksetzen.
- Jeder neue PDF/SVG-Import startet mit aktivierter Aufbereitung, unabhängig von einer früher abgewählten Einstellung.

## Vorhandene PDF als tatsächlicher Prüffall

Private Kopie der aktuellen Gedenktafel Revision 3: vier erkannte Bestandteile, davon zwei Schriftkonturgruppen, ein Fotobereich und ein Motiv. Die besondere Ligatur im Namen wurde anhand der sichtbaren Original-PDF geprüft; nur dieser konkrete Text wurde berichtigt. Beide Textbereiche verwenden die zuvor vom Nutzer gewünschte vollständige vorhandene Werkstatt-Schrift. Das Foto enthält nun das saubere vorhandene Acryl-Musterfoto mit eigenem Uploadhinweis. Ein bereits in das Originalbild eingebrannter Hinweis wird nicht als entfernbarer PDF-Text ausgegeben. Der neue Fotobereich ist rechteckig und kann im Editor auch oval oder als Bogen gestaltet werden; die ursprüngliche Kreuz-Bildgestaltung bleibt in Revision 3 erhalten. Name im rechten Bereich eingepasst, ohne Überlappung mit dem Musterfoto. Kein Umschreiben der Originaldatei.

Private Dokumente, Fotos, Datenbanken, Testbilder der echten Vorlage und Zugangsdaten bleiben außerhalb von Git. Öffentliche Browserbelege enthalten nur synthetische Inhalte. Sicherung vor Beginn: drei konsistente SQLite-Kopien auf dem Server, bytegleich zu bereits privat gesicherten Cloudkopien.

## Abnahmeumfang

Erweiterter Händler-Browserablauf mit synthetischer App-Bridge-Identität bestanden: importierte PDF bearbeiten, zuvor nicht eingebundene hochgeladene Schrift wählen, Text/Bild/Hinweis/Kundenrecht zurücknehmen und wiederholen, speichern und erneut öffnen. Außerdem die bisherigen Maus-/Touch-/Rohling-/Schriftgruppen-/Master- und Kundenprüfungen. 21 gezielte Quelltests bestanden. Die vorausgehenden 650 Regressionen sind im [vorherigen Release](../selection-pdf/RELEASE.md) dokumentiert; nicht als neu ausgeführter Komplettlauf ausgeben.

Der Nutzer bestätigt, dass er die App über Shopify erreicht. Dies belegt keine durch den Agenten fernbediente echte Nutzeranmeldung oder Abnahme sämtlicher Schaltflächen.

## Weiterhin getrennte Voraussetzungen

- Echte Maschinen-/Materialfreigabe: bestätigte Gravurparameter, Probegravur bzw. Druck-/ICC-/RIP-Abnahme fehlen; keine Fertigungsfreigabe erfinden.
- Begrenzter Shopify-Testwarenkorb bleibt an die bereits geprüfte Gedenktafel Revision 2 gebunden. Eine neue bearbeitbare Produktrevision wird dadurch nicht automatisch als neue Verkaufs-/Bestellfassung freigegeben. Alte Bestell- und Variantenbindungen bleiben unverändert.
- Drive- und KI-Anbindung sind als Master-Bauplan-Erweiterungen noch nicht eingerichtet; aus einem funktionierenden Dashboard folgt keine Fertigstellung dieser Integrationen.
- Historisch verlorene Cloudverzeichnisse, nicht hochgeladene lokale Dateien und das ursprüngliche Prüf-ZIP `c64c197` bleiben nicht erreichbar; siehe [Herkunftsnachweis](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md).
