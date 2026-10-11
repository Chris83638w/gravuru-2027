# Shopify-Verbindung · 11.10.2026

Die Händlerübersicht konnte trotz geladener App keine Produkte oder Profile abrufen. Serverprotokolle bestätigen wiederholte 401-Antworten zwischen erfolgreichen Zugriffen. Der äußere Händlerzugang lieferte dabei eine leere Antwort; die Oberfläche zeigte deshalb fälschlich einen allgemeinen Verbindungs-/Antwortfehler.

## Befund und Korrektur

Ein gültig signiertes echtes Shopify-Navigationstoken lag beim aufgezeichneten Eingang um zwei Sekunden voraus (11.10.2026, 15:23:16 UTC). Die bisherige Prüfung tolerierte keine Zeitabweichung. Shopify verwendet in seiner offiziellen Admin-Prüfung zehn Sekunden: [Quellcode](https://github.com/Shopify/shopify-app-js/blob/main/packages/apps/shopify-api/lib/session/decode-session-token.ts). Diese begrenzte Toleranz gilt jetzt für Händler-Tokens; Signatur, Algorithmus, App, Shop, Aussteller, Händleridentität und maximale Lebensdauer bleiben verbindlich. Kunden-Tokens behalten ihre bisherige strikte Zeitprüfung.

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

Kein echter Browser-Klicknachweis des angemeldeten Händlers durch diesen synthetischen Test. Live-Veröffentlichung, HTTPS-Abgleich und private Sicherung folgen als getrennte Nachweise. Öffentliche neue Kunden-/Checkout-Strecke, allgemeine Shopify-Produktübertragung, eigene Drive-Anbindung und Maschinenabnahme bleiben offen. Frühere nicht erreichbare Cloud-/Windows-Dateien und Commit c64c197 werden nicht als wiederhergestellt bezeichnet.
