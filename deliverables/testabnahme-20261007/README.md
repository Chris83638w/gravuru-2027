# Testlieferung · 07.10.2026

Aktuelles Installationspaket: [08.10.2026, mit lesender Shopify-Vorprüfung](../plesk-shopify-preflight-20261008/README.md). Vorhandene Excel-Vorlagen und Drucktest-PDFs unverändert.

**[Geschütztes Test-Dashboard](https://test-2027.gravuru-designwerkstatt.de/werkstatt/)** · [Zugang, Bedienung, Betrieb und Abnahmestand](../../docs/dashboard-20261004/HTTPS-TESTABNAHME-20261007.md)

- [Aktuelles Installationspaket · 25,9 MiB](../plesk-private-test-accepted-20261007/gravuru-2027-private-test.zip) · [Quellcommit und SHA-256](../plesk-private-test-accepted-20261007/README.md). Die größere Projektsicherung ist kein Installationspaket.
- [Excel-Vorlage Produktserien](produktserie.xlsx): einschließlich Quellordnern, Schrift-/Motiv- und Fertigungsprofilen.
- [Excel-Vorlage Ausführungsgruppen](ausfuehrungen.xlsx).
- [Plesk-Installation](../../ops/plesk/README.md). Die Testinstanz ist bereits eingerichtet; keine zweite Instanz über die Live-Werkstatt legen.

## Auf dem echten Testserver erzeugte Druckproben

| Synthetisches Beispiel | Roland kombiniert | Mimaki Farbe | Mimaki Weiß |
| --- | --- | --- | --- |
| Acryl 150 × 200 mm | [PDF](server-drucktests/Server-Acryl-Roland.pdf) | [PDF](server-drucktests/Server-Acryl-Mimaki-Farbe.pdf) | [PDF](server-drucktests/Server-Acryl-Mimaki-Weiss.pdf) |
| Form 100 × 80 mm, eigener Text/Motiv/Graustufenfoto | [PDF](server-drucktests/Server-Form-Roland.pdf) | [PDF](server-drucktests/Server-Form-Mimaki-Farbe.pdf) | [PDF](server-drucktests/Server-Form-Mimaki-Weiss.pdf) |

Jeweilige Mimaki-Paare **1:1 mit identischem Ursprung** überlagern; nicht unabhängig beschneiden/zentrieren oder erneut spiegeln. Weiß enthält `RDG_WHITE` und `CutContour`, Farbe kein `RDG_WHITE`. Roland kombiniert beide Separationen. Schriftpfade, Kontur und Vektorweiß vorhanden; keine Fontobjekte, keine Bilder in reiner Weiß-PDF. Fotos bleiben Raster. Benachbarte `.pdf.json`-Dateien nennen Maße, Hashes und Prüfergebnisse; sechs PDFs ohne Reparatur lesbar und mit Ghostscript geprüft. Graustufenfoto der Form in der Schwarzseparation bestätigt. Diese Dateianalyse erfolgte lokal an den tatsächlichen Serverdownloads.

Diese Dateien sind technische Proben, keine physische Maschinenfreigabe und kein freigegebenes Produktions-ICC. Im echten RIP müssen Zuordnung von Weiß/Konturen, Deckung, Spiegelung und Materialwirkung bestätigt werden. Keine Druckmaschine angesteuert.

Die [früheren lokalen PDF-Proben](drucktests/) bleiben als Vergleich erhalten. Die neue Tabelle oben bezeichnet ausschließlich tatsächlich auf dem Testserver erzeugte Dateien.

## Abnahme und offene Anschlüsse

Auf dem Server geprüft: Passwort-/Dateischutz, Neustart mit Daten- und Sitzungserhalt, Dashboard, vorhandener Acryl-Konfigurator, freie Design-/Motiv-/Text-/Fotobearbeitung, private Form-Entwürfe, Excel-/Ordner-/ZIP-Import, Korrektur und Ausführungsgruppen ohne Duplikate. Desktop/390/768, keine JavaScript-Fehler in den aufgeführten Abläufen. [Einzelheiten und Grenzen](../../docs/dashboard-20261004/HTTPS-TESTABNAHME-20261007.md).

Eigener Serverprozess konnte sich mit dem vorhandenen App-Schlüssel bei Shopify anmelden und lesend Shop/App/Produkte/Varianten prüfen. Der private Paketstart aktiviert diese Verbindung noch nicht. `read_orders`, bestätigte Testvarianten und ein Weg ohne echte Belastung/Produktionsauslösung fehlen; der geprüfte Shop ist reguläres Shopify Plus. Keine echte Bestellung, keine Live-App-Konfigurationsänderung und keine kaufgebundene Kundenkonto-Abnahme behauptet.

Für Drive fehlt die eigene Google-Autorisierung. Für den automatisierten KI-Designassistenten der App fehlen Anbieter und Kostenrahmen. Keine kostenpflichtige Nutzung gestartet. Physische Druck-/Geräteabnahme und spätere Produktivumschaltung bleiben getrennte Schritte.
