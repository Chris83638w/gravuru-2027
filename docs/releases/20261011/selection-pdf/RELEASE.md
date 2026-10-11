# Werkstatt: Auswahl, bearbeitbare PDFs und echtes Musterfoto

11.10.2026. Veröffentlichungskandidat; der Live-Nachweis folgt nach Aktivierung. Die bisherigen Behauptungen zur vollständigen Werkstattbedienung waren zu weitgehend. Dieser Stand behebt konkret reproduzierte Probleme; der gesamte Master-Bauplan ist damit nicht automatisch abgeschlossen.

## Änderungen

- Sichtbare dünne Auswahlkontur und vier Größen-Griffe als separate Bedienebene über der Produktszene. Die Grafik erhält keinen weißen Dekorrahmen. Auswahl per Elementliste oder Vorschau, proportional vergrößern/verkleinern, Ziehen, Pfeiltasten (1 mm, Umschalt 10 mm), Rückgängig. Kundensperren begrenzen nicht die Händlergestaltung. Technisch gesperrte Elemente bleiben geschützt.
- Touch-Ziehen brach durch Browser-Scrollen ab; die Zeichenfläche steuert Touch nun ausdrücklich. Eine ausstehende Vorschau wird beim Ziehen und Speichern abgebrochen. Sonst konnten alte SVG-Knoten ersetzt werden oder eigene Vorschauanfragen einen Revisionskonflikt auslösen.
- PDF/SVG-Import bereitet standardmäßig getrennte Bestandteile auf. Vorschau vor Übernahme, Originaldatei und bisherige Revision unverändert. Ältere flach importierte Designs: **Designs & Elemente → PDF / SVG in Elemente aufbereiten**, prüfen und speichern. Vorhandene zusätzliche Elemente werden nicht stillschweigend entfernt.
- PDF-Schriftkonturen bleiben zunächst originalgetreu auswählbar, verschiebbar und skalierbar. **PDF-Text auswählen → Text bearbeiten → Text prüfen und vollständige Werkstatt-Schrift wählen** wandelt genau diesen Bereich in nativen Text um. Fehlende Zeichen werden nicht erfunden. Ein in ein Rasterbild eingebrannter Text bleibt ohne separate Aufbereitung ein Bild. Höchstens 20 getrennte Bestandteile; nicht jede flache oder komplexe Datei kann semantisch vollständig erkannt werden.
- Erkannte Bildbereiche werden zu Fotofeldern mit dem enthaltenen echten Musterbild und dem Hinweis zum Hochladen eines eigenen Fotos. Neue Fotofelder erhalten das vorhandene echte Acryl-Musterfoto (oder ein bereits zugeordnetes Musterbild), keine leere Box. Fotoform und Bildersatz sind im Editor bearbeitbar. Beispielbild und Hinweis erfüllen kein erforderliches Kundenfoto und sind keine Fertigungsfreigabe.
- Vorbereitete Ebenenpakete werden auf Schiefer anhand der tatsächlichen Plattenmaße eingepasst; die Acrylfläche wird dafür nicht mehr verwendet.

## Belege und Grenzen

650 vollständige Regressionstests bestanden, ergänzt durch abschließende gezielte Prüfungen. Browserprüfung mit realem lokalem Händlerhost und synthetischer App-Bridge-Identität: Auswahl/Griffe, Maus/Touch, PDF-Text und Musterfoto, Bildersatz, Speichern/Neuladen, Schriftupload/Gruppe, Rohlingaustausch, Masteranlage und unveränderte Testwarenkorbgrenzen. Browserbilder zeigen synthetische Prüfdaten. Alle 20 erreichbaren privaten PDF-Ressourcen durch den Aufbereitungsschritt geprüft; das ist keine Freigabe jedes Designs für die Fertigung.

Echte Shopify-Nutzeranmeldung ist hier weiterhin nicht fernsteuerbar. Öffentliche HTTPS-Seiten und Anmelde-Bootstrap werden separat geprüft; synthetische Token sind kein echter Login-Nachweis. Keine neue Bestellung, Abbuchung oder Produktionsauslösung. Private Datenbanken, Originalfotos, Zugangsdaten bleiben außerhalb von Git. Nicht erreichbare historische Cloud-/Windows-Dateien bleiben als solche dokumentiert; es werden keine fehlenden Dateien als gesichert ausgegeben.

Vor der Veröffentlichung: drei konsistente private SQLite-Online-Sicherungen auf dem Server, Prüfsummen und Integrität bestätigt; identische Cloudkopien privat gesichert. Die Veröffentlichung des Codes überschreibt keine bestehende Produktrevision, insbesondere nicht die letzte vom Nutzer gespeicherte PDF.

Weiterhin gesondert abzunehmen: reale Shopify-Anmeldung und Benutzerablauf im angemeldeten Shop, sämtliche tatsächlich verwendeten Designs einschließlich Schrift-/Fotoformwahl, Maschinen-/Materialfreigabe und die übrigen offenen Master-Bauplan-Erweiterungen. Excel-Stapelverarbeitung ist bereits als Code mit Regressionen vorhanden; Drive-/KI-Integration ist dadurch nicht als eingerichtet belegt.
