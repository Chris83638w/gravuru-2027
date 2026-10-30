# Verbindlicher Konfigurator-Master – 30.10.2026

**Nachtrag:** Technischer Warenkorbhinweis inzwischen live ausgeblendet, main-Konflikte in PR #77 unter vollständigem Erhalt von `app/` aufgelöst. Gedenktafel-Migration nach Chris' neuer Entscheidung ausdrücklich vertagt. [Aktueller Abgleich und Nachweise](2026-10-30-master-abgleich-warenkorb.md). Die datierten Prüfungen unten bleiben historische Nachweise.

## Entscheidung von Chris

„Unser ist der Master.“ Die gemeinsam geprüfte Oberfläche und Bedienung gilt für alle Produktlinien. Ausschließlich **Ausführungen** wird je Linie ergänzt (z. B. Funkklingel-Farbe und Klingelposition). Keine spätere Funkklingel-Oberfläche in den freigegebenen Master übernehmen. Chris hat die Veröffentlichung ausdrücklich freigegeben.

Abgenommene Oberfläche: Tag `konfigurator-master-20261030`, Commit `ce7c86613f06760146be36fe5004b7c58d3a9921`. Dieser Tag bleibt unverändert.

## Für den Betrieb erforderlicher Abgleich

- Bereits live vorhandene Korrektur der Funkklingel-Warenkorbprüfung beibehalten: mehrteilige Funkklingeln erhalten keinen überholten Fertigungsblocker.
- Bereits live gültige native Gestaltungslinien bleiben lesbar. Gegenprüfung aller 926 aktiven Produktstände, darunter 126 Funkklingeln: keine Validierungsfehler nach dem Abgleich.
- Neue Funkklingel-Dokumente behalten die bisherige Rechtevergabe, statt nur ihre ausgewählte Wurzelvorlage zu verändern und damit die Formatidentität zu verletzen. Bestehende Revisionen werden nicht umgeschrieben.
- Fotowerkzeug-Test ergänzt die realen Layout-Container. Seine Funktionsprüfungen bleiben erhalten.
- Der SVG-Importtest prüft jetzt ausdrücklich die freigegebenen Motivrechte (ersetzbar/löschbar, nicht verschiebbar/skalierbar), Originaldateien, Farben und Idempotenz. Seine alte Erwartung eines generell gesperrten Motivs widersprach der bereits abgenommenen Funktion.
- Neue Preisfunktion erhält die vollständige aktive V1-Mengenrabattberechnung. V2 ergänzt Logos zu 1.299 Cent; zusätzliche Motive bleiben 169 Cent. Die erste Vorlage bleibt enthalten.

## Bestätigter Live-Stand am 30.10.2026

Chris hat ausdrücklich „alles live stellen und als Master markieren“ freigegeben und anschließend die Durchführung erneut bestätigt. Der gemeinsame Shop-Einstieg läuft mit der abgenommenen Oberfläche. Die spätere Funkklingel-Oberfläche wurde nicht eingemischt. Der alte separate Gedenktafel-Einstieg ist davon noch ausgenommen (siehe offene Punkte).

- Laufzeitquelle auf `dev/konfi-live-20261030-astra`: **`5f69917c9bb8177638f509e59b67cb66b14e79c9`**, nach Betriebsvorbereitung `4eeb97a` und Warenkorb-/Bildkorrektur `f31ec4d`. Der Abnahmetag `ce7c866` bleibt unverändert; die Nachträge ändern nicht die freigegebene Editor-Oberfläche.
- Öffentlich ausgeliefertes Paket `editor-af86a0f4cb283c9d.mjs`: **1.306.861 Byte**, SHA-256 `b2175ab3f42919f59eedf029c08699e146081ce00f29197e6100ebc567858cf8`, am 30.10.2026 um 14:25:38 UTC exakt mit dem abgenommenen lokalen Build verglichen.
- Shopify-App-Version **`gravuru-2027-master-20261030-v3`**, Version **1188282466305**, veröffentlicht. Cart Transform **172523900**, Function **01a0e45d-c47f-70b9-9d5a-a2c72120ae01**, `blockOnFailure=true` bleiben erhalten. Keine erweiterten Scopes, keine fremden Theme-/App-Einstellungen ersetzt.
- D8-Produktrevision **2** und alle **fünf** Verkaufsbindungen aktiv. Grundpreis 1.999 Cent, zusätzliches/geändertes Motiv 169 Cent, Kundenlogo 1.299 Cent; Vorlagenmotiv enthalten. Mengenstaffel weiterhin 3/5/10 Stück mit 5/10/15 Prozent auf den ganzen Stückpreis. Revision 1 bleibt historisch verfügbar.
- Startdatei zeigt auf den gesicherten Kandidaten `private/konfigurator-master-20261030/image-fix-source`. Der alte Händlerprozess wurde nach Abgleich von Benutzer, Arbeitsverzeichnis und Kommando gezielt beendet; die nächste Anfrage startet die neue Laufzeit. Öffentliche Rücklese und echte Warenkorbtests bestätigen den Wechsel.

## Fehlerursachen und Korrekturen

1. Zwei bereits gesicherte D8-Warenkorbangebote besaßen noch keine neuen Zähler. Eine eng begrenzte Kompatibilitätsliste übernimmt nur die tatsächlich gespeicherten, noch gültigen Angebote samt exakter Variante, Menge, Revision, Kennung und altem Preis. Kein allgemeiner Rückfall auf ungeprüfte Warenkorbdaten.
2. Shopify lehnte das Vorschaubild der Cart Transform mit `image_not_found` ab: Ein Datei-Upload im Warenkorb ist noch kein registriertes Shopify-Medienbild. Die Laufzeit registriert jetzt das eigene unveränderliche PNG als Shopify-IMAGE. V3 verwendet ausschließlich das bestätigte Medienbild in `_gravuru_checkout_image`. Original und Warenkorbvorschau bleiben erhalten.
3. Die Sitzungskonfiguration nennt auch den öffentlichen Shop-Einstieg `test-only`. Diese Bezeichnung hatte den Bildadapter ungewollt abgeschaltet. Jetzt schaltet die tatsächliche Aktivierung des Shop-Einstiegs den verzögert ausgeführten Adapter ein; Authentifizierung und Berechtigungen bleiben unverändert.
4. Mehrzeiliger Gravurtext wird bei Multipart-Übertragung von LF auf CRLF normalisiert. Dadurch meldete die strenge Rücklese trotz erfolgreichem Hinzufügen einen Fehler. Nur bei `Gravurtext` und dessen nummerierten Fortsetzungen werden Zeilenenden normalisiert. Inhalte, Zeilenanzahl, Preise, Kennungen, URLs und sämtliche anderen Eigenschaften werden weiterhin exakt geprüft.

## Prüfungen und echte Warenkorbtests

| Prüfung | Ergebnis | Einordnung |
| --- | --- | --- |
| Linux-Vollauf auf vorbereitetem Master | **1.928/1.928**, 0 Fehler, 0 übersprungen | Abschließend 30.10., 11:03:29 UTC; vor den folgenden Warenkorb-Hotfixes |
| Aktive Produktstände | **926 gültig**, davon 126 Funkklingeln | Keine bestehende Revision umgeschrieben |
| Linux-Bild-/Warenkorbkorrektur | **58/58**, 0 Fehler, 0 übersprungen | Stand `f31ec4d` |
| Linux nach letztem Hotfix | **83/83**, 0 Fehler, 0 übersprungen | Neun betroffene Module einschließlich Shop-Einstieg, Bilder, Warenkorb, Routing und Logopreis |
| Windows: Multipart-/Warenkorbclient | **13/13**, 0 Fehler, 0 übersprungen | Echter FormData-Roundtrip; geänderter Text bleibt abgelehnt |
| Kompilierte Shopify-Funktion | **14/14** Erwartungsfälle | V1/V2, Staffel, Altangebote, falsche Zähler/Angebote und Medienbild |

Die Läufe überschneiden sich; sie werden nicht addiert. Der Vollauf wurde nicht nachträglich als Vollauf des Hotfixes ausgegeben. Ein früherer Windows-Teillauf hatte 41 Erfolge und zwei Umgebungsfehler (Python-Logokonverter/temporäre Dateisperre); die betroffenen Linux-Prüfungen sind grün.

Kompilierte V3-Funktion: 11.007 Byte, SHA-256 `07fa49b1844fcda714cab375aa1d560e60aa0b2c004ac200b3983cd6e831e4d9`.

**Türschild D8, echter Shop:** Hausmotiv und Kundenlogo, 19,99 + 1,69 + 12,99 = **34,67 EUR**. Eigene Testposition über „Bearbeiten“ erneut geöffnet, Text geändert und „Warenkorb aktualisieren“ ausgeführt. Automatische Rückkehr in den Warenkorb ohne Fehler, neue Revision und registriertes Vorschaubild bestätigt, keine doppelte Testposition. Die vier vorher vorhandenen Positionen sind unverändert erhalten (fünf Positionen, Summe 134,00 EUR). Bearbeiten-Link unter dem Foto vorhanden.

**Gedenktafel für Menschen 220 x 140 mm, echter Shop:** In separatem Chrome-Test mit dem bereits für diesen Test bereitgestellten Originalfoto sowie zusätzlichem Hausmotiv durch die komplette Prüfung bis in den Warenkorb. Ergebnis **34,67 EUR** = 22,99 + 9,99 Foto + 1,69 Motiv, eine Position, Vorschau mit Foto und Haus, „Kostenpflichtige Bilder: 1“, „Zusätzliche Motive: 1“, Bearbeiten-Link unter dem Foto. Keine vorhandene Gestaltung verändert. Dieser Nachweis betrifft den bestehenden separaten Gedenktafel-Einstieg, nicht die neue Master-Oberfläche.

Private Screenshots und Prüfbelege sind gesichert. Kundenfoto, Originalmedien, Warenkorb-Zugriffsschlüssel und gespeicherte Bearbeitungskennungen werden nicht in GitHub veröffentlicht. Keine Bestellung/Zahlung ausgelöst.

## Offene Punkte und nächster Schritt

- **Gedenktafel-Einstieg:** Das Produkt `gedenktafel-fuer-menschen-220x140` öffnet weiterhin eine ältere, separat eingebundene `produktvorschau`. Die Übernahme dieser Produktlinie in den Master muss ihren Foto-/Preis-/Bearbeitungsvertrag erhalten; sie ist noch nicht erfolgt. Nicht als bereits vollständig migriert ausgeben.
- **Warenkorb-Darstellung erledigt:** „Bearbeitbarer Entwurf“ wird bei nativen Positionen im Live-Theme ausgeblendet; Daten und Preisvertrag bleiben erhalten. Beide Dateien exakt zurückgelesen, fünf Positionen/fünf Bearbeiten-Links/134,00 EUR nach Neuladen bestätigt. Siehe Nachtrag oben.
- Echter iPhone-/Safari-Test mit Tastatur und Zweifingergeste sowie echte Bestellung, Danke-Seite/E-Mail und Fertigungs-/Maschinenabnahme bleiben offen. Desktop- und lokale Mobilansichten ersetzen diese Nachweise nicht.
- Chris' angekündigte zusätzliche Bestseller-Dateien fehlen weiterhin; keine Bestseller-Rangfolge erfunden. Feine Logodetails unter 0,5 mm erfordern weiterhin manuelle Prüfung.
- Nächster technischer Schritt: den dokumentierten Live-Branch prüfen und kontrolliert in die Repo-Hauptlinie übernehmen; keine fremde Funkklingel-Oberfläche hineinmischen. Anschließend die abweichenden Produkt-Einstiege und ausschließlich ihre Ausführungen separat anbinden.

Die Veröffentlichung erfolgte direkt vom eigenen Live-Branch. PR #58 bleibt ein ungemergter Entwurf; ein Live-Nachweis ist kein behaupteter Merge nach `main`.

## Sicherung und Rückweg

Auf dem privaten Host: `konfigurator-master-20261030/backup` mit bisherigen Quellen, Startdateien und sechs SQLite-Sicherungen. Bestehende Kunden- und Bestellstände bleiben historisch unverändert.

Vorherige Shopify-App-Version: `gravuru-2027-shop-einstieg-20261026-v1`. Ein Rückweg für D8 muss über neue Revisionen und geprüfte Zuordnungen erfolgen, niemals durch Wiederherstellen einer alten Gesamt-Datenbank über neue Bestellungen.
