# Shopify-Verbindung · 11.10.2026

Die Händlerübersicht konnte trotz geladener App keine Produkte oder Profile abrufen. Serverprotokolle bestätigen wiederholte 401-Antworten zwischen erfolgreichen Zugriffen. Der äußere Händlerzugang lieferte dabei eine leere Antwort; die Oberfläche zeigte deshalb fälschlich einen allgemeinen Verbindungs-/Antwortfehler.

## Befund und Korrektur

Der direkte Vergleich mit altem und korrigiertem Prüfer auf dem Server bestätigt: Ein gültig signiertes echtes Shopify-Navigationstoken lag beim aufgezeichneten Eingang um zwei Sekunden voraus (11.10.2026, 15:23:16 UTC). Die bisherige Prüfung tolerierte keine Zeitabweichung. Shopify verwendet in seiner offiziellen Admin-Prüfung zehn Sekunden: [Quellcode](https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/lib/session/decode-session-token.ts). Der alte Prüfer lehnt das Token zum protokollierten Eingangszeitpunkt ab; der neue akzeptiert es. Tokens oder Schlüssel wurden dabei nicht exportiert (`clock-skew-evidence.json`). Diese begrenzte Toleranz gilt jetzt für Händler-Tokens; Signatur, Algorithmus, App, Shop, Aussteller, Händleridentität und maximale Lebensdauer bleiben verbindlich. Kunden-Tokens behalten ihre bisherige strikte Zeitprüfung.

Das tatsächliche Bearer-Token der fehlgeschlagenen Browser-API-Anfrage wurde nicht protokolliert. Daher ist die Zeitabweichung ein nachgewiesener Fehler und plausibler Auslöser der sporadischen Ablehnungen, aber noch kein vollständiger Nachweis für jede einzelne 401-Antwort des Screenshots. Neue Diagnoseausgaben enthalten ausschließlich begrenzte Fehlercodes, niemals Tokens, Benutzer oder Token-Inhalte.

- APIs antworten bei abgelehnter Anmeldung mit 401 und einer verständlichen JSON-Meldung.
- Ein abgelehnter Lesezugriff darf einmal mit einem tatsächlich erneuerten Shopify-Token wiederholt werden. Identische Tokens, Schreibzugriffe und unbekannte Netzwerkergebnisse werden nicht automatisch erneut gesendet.
- **Verbindung prüfen** ist ein bedienbarer Knopf. Er lädt Sitzung, Produkte, Profile und Schriftbibliothek erneut, ohne den Editor neu zu laden oder ungespeicherte Eingaben zu verwerfen.
- Kein Wechsel von App-Schlüsseln, keine Freigabe privater Daten und keine Umgehung der Shopify-Anmeldung.

## Prüfung vor Veröffentlichung

65 gezielte Regressionstests bestanden: Zeitgrenzen, Signaturen, beide Serverzugangsstufen, Host/HTTPS, CSRF, geschützte Medien, Navigation, Wiederanmeldung und begrenzte Wiederholung.

Browser mit echter lokaler Händlerlaufzeit und synthetischer Shopify-Identität: um zwei Sekunden vorausliegende Tokens laden Produkte/Profilbibliothek; um 30 Sekunden vorausliegende Tokens werden gesperrt; Wiederverbindung lädt auch private Produktbilder und Schriftbibliothek. Ungespeicherter Produktname bleibt erhalten und lässt sich anschließend ausdrücklich speichern und erneut öffnen. 49 API-Anfragen, keine JavaScript-Fehler; Desktop und Mobil geprüft. Der erste Prüfablauf wartete im Editor erfolglos auf völlige Netzwerkruhe; die Prüfung wartet jetzt auf sichtbare Editorzustände. Kein Fehler wurde durch geänderte fachliche Sollwerte verdeckt.

## Arbeitsstand und Grenzen

Verwaltete Cloud, Arbeitsverzeichnis `/workspace/gravuru-restored`, Repository `Chris83638w/gravuru-2027`, Aufgabenbranch `task/shopify-connection-20261011`, Ausgangscommit `d5346d2`, zunächst sauberer Arbeitsbaum. Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleibt Vorfahr. Neuerer Code, Ressourcen und Dokumentation bleiben erhalten. Private Diagnose und Datenbanken liegen außerhalb von Git unter `/workspace/recovery-private`.

Kein echter Browser-Klicknachweis des angemeldeten Händlers durch diesen synthetischen Test. Live-Veröffentlichung, HTTPS-Abgleich und private Sicherung sind unten separat dokumentiert. Der Nutzer hat nach Neuladen bestätigt: „Ja, Produkte werden angezeigt“. 19 erfolgreiche authentifizierte Serverzugriffe auf Sitzung, Produkte, Profile, Schriftbibliothek und Vorschauen wurden dazu beobachtet. Dies bestätigt die wiederhergestellte Händlerverbindung, nicht automatisch jeden übrigen Ablauf. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Shopify-Produktübertragung, eigene Drive-Anbindung und Maschinenabnahme bleiben offen. Frühere nicht erreichbare Cloud-/Windows-Dateien und Commit c64c197 werden nicht als wiederhergestellt bezeichnet.

## Installationspaket

Quellstand `f1bc2bcbc0eb6472a2294e5f99a9938d53f061c4`, Version `0.1.0-recovery.20261010+f1bc2bcbc0eb`. Archiv mit 411 geprüften Manifestdateien, 27.308.684 Byte, SHA-256 `65948648ddc773609fd01ebec2c2a63a92b6fc94e4d882e8f147e5d86f32d563`. Isolierte Installation/Start mit synthetischen Daten und anonymer Zugriffssperre bestanden. Dasselbe unveränderte Archiv wurde auf dem Zielserver in ein frisches Releaseverzeichnis installiert; Build und private Konfiguration geprüft. [Paket und Installationsablauf](../../../../deliverables/merchant-connection-20261011/README.md).

## Live-Veröffentlichung

Quellstand **f1bc2bc** seit **11.10.2026, 16:25 UTC** auf `https://app-2027.gravuru-designwerkstatt.de` aktiv. Genau ein Händlerprozess, Start nach Aktivierung bestätigt. Vier ausgelieferte Module stimmen bytegenau mit dem Paket überein. HTTPS und Shopify-Seitenkontext geprüft; anonyme APIs liefern weiterhin 401, jetzt mit strukturierter Anmeldemeldung statt leerem Antwortkörper. Neun HTTPS-Prüfungen bestanden. Die echte Shopify-Sitzung kann mit vollständigem Neuladen der Shopify-Seite und anschließend „Verbindung prüfen“ die neuen Module verwenden.

Vorherige Laufzeit und drei konsistente Datenbanken, alter Einstieg und private Konfiguration unter `/private/gravuru-merchant-backup-20261011-f1bc2bc` auf dem Server gesichert. SQLite-Integrität und Prüfsummen bestätigt. Aktivierung ändert ausschließlich den Händler-Einstieg; `start-r5.cjs`, App-Schlüssel und übrige Konfiguration bleiben erhalten. Alte Kundenwerkstatt, Produktstände, Bestellungen, Zahlungen und Fertigung wurden nicht verändert. Bestehende KI-Funktionen bleiben aktiv; weiterhin vier frühere Aufträge mit zusammen 34 Cent, keine zusätzlichen kostenpflichtigen Aufrufe.

## Abschließende Sicherung und echte Anmeldung

Nach Aktivierung alle historischen Zeilen in **49 Tabellen** gegen die vorherige Sicherung erhalten. Drei konsistente Datenbanken, zusammen **42.934.272 Byte**, liegen auf dem Server unter `/private/gravuru-merchant-after-connection-20261011` und in dieser Cloud unter `/workspace/recovery-private/merchant-after-connection-20261011`. Dateigrößen, SHA-256 und SQLite-Integrität stimmen überein. Private Kopien mit Dateimodus 0600, Verzeichnis 0700; kein API-Schlüssel exportiert.

Nutzer bestätigt nach Neuladen „Ja, Produkte werden angezeigt“. Serverzugriffe am 11.10.2026 um 16:26 UTC bestätigen 19 erfolgreiche authentifizierte Abrufe einschließlich Schriftbibliothek, Sitzung, Produkte, Profile, Revisionen und Editorvorschau. Die vier vorherigen 401-Antworten nach Aktivierung gehören exakt zu unseren absichtlich anonymen Zugriffstests.

Code, Paket und Berichte auf Aufgabenbranch und beiden Recovery-Branches gesichert. Nächstes vom Nutzer beauftragtes Paket: vorhandene ausgearbeitete Edelstahl- und Acrylschild-Vorlagen in die Händlerwerkstatt übernehmen und dort prüfen.
