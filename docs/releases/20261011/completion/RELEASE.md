# Abschluss der gemeldeten Werkstatt-Bedienfehler

11.10.2026. Quellstand **`cdb840ddbac077c234daa53dc7eca288f920b79e`** ist auf dem getrennten Händlerhost `https://app-2027.gravuru-designwerkstatt.de` aktiviert und per HTTPS geprüft. Ausgangsstand `8486800`, zuvor laufender Quellstand `4d8042f`. Keine Behauptung, der gesamte historische Master-Bauplan einschließlich externer Integrationen und Maschinenabnahme sei abgeschlossen.

## Veröffentlichung und Sicherung

- Gedenktafel als **Revision 4** übernommen: zwei native Werkstatttexte, Fotofeld mit echtem Musterfoto und Motiv. Die tatsächliche Serverumgebung hat die fünf vorbereiteten Ressourcen erneut geprüft; Originalrevision 3 unverändert. Preise und Optionen unverändert, inklusive bisheriger Fotopreisregel (+9,99 € bei diesem Produkt).
- Version `0.1.0-recovery.20261010+cdb840ddbac0`, ZIP mit SHA-256 `bc9f3a9994c05f7b14d2d1f2f3f91c495652b428c5822ed90c846b5347cec78b`, 27.264.680 Bytes und 398 Manifestdateien. [Paket und automatischer Ablauf](../../../../deliverables/merchant-completion-20261011/README.md). Isolierte Installation, Aktivierung/Neustart und synthetischer Bestelleingang bestanden.
- 46 Datenbanktabellen abgeglichen: alle ursprünglichen Zeilen erhalten; ausschließlich der erwartete aktuelle Produktzeiger von Revision 3 auf 4 samt Änderungszeit fortgeschrieben. Neue Revision und fünf Ressourcen angefügt.
- Vorherige Laufzeit, Startdatei, private Konfiguration und drei Datenbanken auf dem Server gesichert. Neue drei Datenbanksicherungen zusätzlich privat in dieser Cloud, SHA-256 und SQLite-Integrität bestätigt (28.327.936 Bytes). Keine Kundendaten oder Geheimnisse im Git-Paket. Bestehende alte Kundenwerkstatt unverändert.
- Tatsächliche Arbeitsumgebung: verwaltete Codex-Linux-Cloud, `/workspace/gravuru-restored`, Repository `Chris83638w/gravuru-2027`, Branch `task/live-release-20261010`. Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleibt Vorfahr; neuere Arbeit wurde erhalten.

## Bedienung nach Neuladen

Oben **Produkte → Gedenktafel → Designs & Elemente** öffnen. Links stehen Motiv, zwei Texte und Musterfoto separat. Elemente direkt auswählen und an ihren Griffen ziehen; Texte und Schrift rechts ändern. **Hintergrund & Szene** enthält den Rohlingtausch; **Schriften & Profile** oben öffnet Upload und Gruppen. Speichern legt eine neue Revision an. **Kundenansicht** öffnet den gespeicherten Stand für Text-/Fotoersatz und Prüfstand-Sicherung. Kundenrechte rechts beschränken den Kundeneditor; der Händler kann die Gestaltung unabhängig davon bearbeiten.

## Ergänzte Bedienung

- PDF-Textdialog bietet die vollständige erreichbare Schriftbibliothek einschließlich hochgeladener Schriften. Die ausgewählte Ressource wird bei Bedarf in die neue Produktrevision eingebunden; fehlende Glyphen bleiben ein erklärter Fehler.
- PDF-Sonderzeichen/Ligaturen erhalten einen ausdrücklichen Prüfhinweis. Es findet keine allgemeine erfundene Texterkennung oder Ersetzung privater Unicode-Zeichen statt.
- Rückgängig/Wiederholen umfasst direkte Text-, Farb-, Größen-, Namens-, Hinweis- und Kundenrechte-Änderungen sowie Bild-/Rohlingersatz und Elementaktionen. Zusammenhängende Eingabe wird gruppiert. Strg/⌘ Z und Umschalt Z außerhalb von Eingabefeldern; native Textfeldbedienung bleibt erhalten. Verlauf bis 20 Schritte, nach Speichern gilt der unveränderliche Revisionsverlauf. Unabhängige Produkt-/Profiländerungen verwerfen den flüchtigen Gestaltungsverlauf, damit ältere Ganzdokument-Snapshots diese nicht stillschweigend zurücksetzen.
- Jeder neue PDF/SVG-Import startet mit aktivierter Aufbereitung, unabhängig von einer früher abgewählten Einstellung.

## Behobene Fehler in der Kundenansicht

- Geschützte PDF-Bildadressen werden nur im vorübergehenden Renderkatalog aufgelöst. Das geprüfte Produktmodell und seine unveränderlichen Originalnachweise bleiben unverändert; dadurch startet die Kundenansicht importierter PDFs wieder.
- Der Prüfexport verwendet bereits eingebettete Bildbytes direkt. Die strenge Verbindungssperre bleibt erhalten; der bisherige unnötige Daten-URL-Abruf verursachte „Failed to fetch“.
- Importierte Tonwertinformationen bleiben auch im Kundenrenderer verfügbar. Die lokale Hilfedatei ist erreichbar; der überflüssige Basislink und ein ungültiger alter Galerieabruf sind entfernt.

## Vorhandene PDF als tatsächlicher Prüffall

Private Kopie der aktuellen Gedenktafel Revision 3: vier erkannte Bestandteile, davon zwei Schriftkonturgruppen, ein Fotobereich und ein Motiv. Die besondere Ligatur im Namen wurde anhand der sichtbaren Original-PDF geprüft; nur dieser konkrete Text wurde berichtigt. Beide Textbereiche verwenden die zuvor vom Nutzer gewünschte vollständige vorhandene Werkstatt-Schrift. Das Foto enthält nun das saubere vorhandene Acryl-Musterfoto mit eigenem Uploadhinweis. Ein bereits in das Originalbild eingebrannter Hinweis wird nicht als entfernbarer PDF-Text ausgegeben. Der neue Fotobereich ist rechteckig und kann im Editor auch oval oder als Bogen gestaltet werden; die ursprüngliche Kreuz-Bildgestaltung bleibt in Revision 3 erhalten. Name im rechten Bereich eingepasst, ohne Überlappung mit dem Musterfoto. Kein Umschreiben der Originaldatei.

Private Dokumente, Fotos, Datenbanken, Testbilder der echten Vorlage und Zugangsdaten bleiben außerhalb von Git. Öffentliche Browserbelege enthalten nur synthetische Inhalte. Sicherung vor Beginn: drei konsistente SQLite-Kopien auf dem Server, bytegleich zu bereits privat gesicherten Cloudkopien.

## Abnahmeumfang

Erweiterter Händler-Browserablauf mit synthetischer App-Bridge-Identität bestanden: importierte PDF bearbeiten, zuvor nicht eingebundene hochgeladene Schrift wählen, Text/Bild/Hinweis/Kundenrecht zurücknehmen und wiederholen, speichern und erneut öffnen. Außerdem die bisherigen Maus-/Touch-/Rohling-/Schriftgruppen-/Master- und Kundenprüfungen. 21 gezielte Quelltests bestanden. Zusätzlich 652 Regressionen nach der Modellkorrektur und 29 gezielte Prüfungen nach der Export-/Hostkorrektur bestanden. Testmengen überschneiden sich. Der tatsächliche PDF-Ablauf wurde in einer privaten Datenkopie einschließlich Texteingabe, Fotoersatz und gesichertem Prüfstand getestet. Zu langer Text wird weiterhin abgewiesen; nach Korrektur lässt sich der Stand speichern. Vorlagen-Schriftgröße und Kundenrechte werden nicht stillschweigend aufgeweicht.

Der Nutzer bestätigt, dass er die App über Shopify erreicht. Dies belegt keine durch den Agenten fernbediente echte Nutzeranmeldung oder Abnahme sämtlicher Schaltflächen.

## Noch beobachtete technische Grenze

Der tatsächliche Kundenablauf und die gespeicherten Bilder sind geprüft. Beim kurzzeitigen Aufbau des alten Renderer-Unterbaus wurden weiterhin sieben Bildanfragen an `/undefined` beobachtet (404); kein fehlendes sichtbares Produkt-/Musterfoto und kein blockierter Speicherablauf im geprüften Fall. Die genaue verbliebene Aufrufquelle ist noch nicht abschließend geklärt. Deshalb keine Behauptung einer vollständig fehlerfreien Browserkonsole.

## Weiterhin getrennte Voraussetzungen

- Echte Maschinen-/Materialfreigabe: bestätigte Gravurparameter, Probegravur bzw. Druck-/ICC-/RIP-Abnahme fehlen; keine Fertigungsfreigabe erfinden.
- Begrenzter Shopify-Testwarenkorb bleibt an die bereits geprüfte Gedenktafel Revision 2 gebunden. Eine neue bearbeitbare Produktrevision wird dadurch nicht automatisch als neue Verkaufs-/Bestellfassung freigegeben. Alte Bestell- und Variantenbindungen bleiben unverändert.
- Drive- und KI-Anbindung sind als Master-Bauplan-Erweiterungen noch nicht eingerichtet; aus einem funktionierenden Dashboard folgt keine Fertigstellung dieser Integrationen.
- Historisch verlorene Cloudverzeichnisse, nicht hochgeladene lokale Dateien und das ursprüngliche Prüf-ZIP `c64c197` bleiben nicht erreichbar; siehe [Herkunftsnachweis](../../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md).
