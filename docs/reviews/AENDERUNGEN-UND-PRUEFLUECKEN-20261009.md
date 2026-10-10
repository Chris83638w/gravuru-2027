# Prüfgrundlage: Änderungen, Fehlschläge und fehlende Belege

Diese Zusammenstellung stammt von Codex. Sie ist keine unabhängige Gegenprüfung. Produktcode-Basis: `6f384f4da4f0e5f43f67de73f6f89e596dd6ccd3`, Branch `feat/excel-profile-assignments-20261007`. Der Nutzer wünscht jetzt eine andere KI zur Prüfung; Entwicklung und weitere Server-/Shopänderungen sind angehalten.

## Änderungen und beobachtete Ergebnisse

| Bereich | Tatsächliche Änderung beziehungsweise Beobachtung | Beleg im Paket |
| --- | --- | --- |
| Operator-Test | Separate Plesk-Site 19, `test-2027.gravuru-designwerkstatt.de`, eigener App-/Datenbereich, HTTPS/Basic-Anmeldung, Python/Cairo. | `docs/dashboard-20261004/HTTPS-TESTABNAHME-20261007.md` und `hosted-acceptance-20261007/report.json` |
| Anfangsfehler im Testbetrieb | Listener-/Konfigurationsübergabe, fehlende Weitergabe des Entwurfstokens, Sitzungserhalt nach Prozesswechsel sowie verlorene schnelle Fotobedienung wurden korrigiert. Die erwähnten gezielten Prüfungen sind historische Nachweise, keine jetzt neu ausgeführte Prüfung. | Abschnitt „Behobene Fehler“ im HTTPS-Bericht; Code und Tests unter `ops/plesk/` und `app/workshop/` |
| Händler-Test | Separate Plesk-Site 20, `app-2027.gravuru-designwerkstatt.de`, eigener App-/Datenbereich, Node 24.21.0, JWT-/CSRF-Prüfung, Prozesssperre, HTTPS-Proxyheader nur dieser Site. | `SHOPIFY-HAENDLER-LAUFZEIT-20261009.md` und `merchant-runtime-20261009/server-*.json` |
| Händlernachweis | Echte Serveraufrufe, Speichern und Prozesswechsel geprüft, aber mit selbst erzeugter synthetischer Identität. Echte Shopify-Browseranmeldung nicht abgenommen. | Dieselben Serverberichte; `server-public-browser.json` dokumentiert fehlenden Shopify-Kontext beim direkten Aufruf. |
| Shopify-Entwurf fehlgeschlagen | Vorschlag aus allen sieben aktiven Modulen mit alleiniger App-URL-Änderung. Erstellung ohne Release von Shopify abgewiesen: ungültiges/unvollständiges Theme-Bundle und fehlende WASM-Datei. | `shopify-memorial-20261009/candidate-rejected.json`, `ops/shopify/preserved-version.mjs` |
| Bestehende Shopify-Version | Nach dem Fehlversuch aktive Version `1146632241153`, alle sieben Module unverändert, keine Kandidatenversion gefunden. | `shopify-memorial-20261009/active-release-after-attempt.json` |
| Gedenktafel | Vorhandenes Schieferprodukt `16138083107196`, neun Varianten mit gespeichertem Preisstand Revision 30 verglichen. Noch keine neue Konfiguratorbindung; öffentliche Seite 404. | `SHOPIFY-GEDENKTAFEL-20261009.md`, `shopify-memorial-20261009/selection.json` |
| GitHub zunächst | Native Git-Aufrufe scheiterten mit fehlender Anmeldung. Bestätigter letzter Remote-Sicherungsstand `d8a09447dba5acdce285f0f6584ee2eb067a0de8`. | Datierte Shopify-Berichte und STATUS-Historie |
| GitHub später | In Cloud-Revision 81/82 Variable `GH_TOKEN` vorhanden. Beide Repository-Abfragen sowie GitHub `/user` liefern 401; GitHub-Request-ID vorhanden und Meldung exakt `Bad credentials`. Danach lokaler GitHub-Credential-Helper verbunden; normaler Git-Aufruf weiter Exit 128 / Anmeldung abgewiesen. | `docs/reviews/github-auth-observation-20261009.json`; Zusammenfassung beobachteter Werkzeugausgaben, kein vollständiges Serverprotokoll |

## Lokale Git-Konfiguration außerhalb des Quellarchivs

Am 09.10. wurde ausschließlich im aktuellen Repository `.git/config` ergänzt:

```ini
[credential "https://github.com"]
    helper =
    helper = !gh auth git-credential
```

Die leere erste Einstellung hebt geerbte Helper für diesen Kontext auf, danach wird die vorhandene GitHub CLI verwendet. Die geprüfte Ausgangskonfiguration hatte weder allgemeinen noch GitHub-spezifischen Credential-Helper. Vorherige Datei privat gesichert. Kein Tokenwert in der Git-Konfiguration gespeichert, keine globale Git-/Cloud-/Serverkonfiguration dabei verändert. Der Helper macht einen ungültigen Token nicht gültig. **Nicht belegt sind Quelle, Ersteller, Erstellungszeit, Ablauf oder Widerruf des eingebundenen Tokens.** Diese Punkte dürfen weder Codex noch dem Nutzer ohne zusätzliche Nachweise zugeschrieben werden.

## Bekannte Grenzen des Quellpakets

- Enthält Appcode, Tests, Anforderungen, Betriebsskripte und ausgewählte Prüfberichte. Keine `.git`-Historie, Zugangsdaten, Produktions-/Kundendatenbanken oder privaten Serverkonfigurationen. GitHub-/Plesk-/Shopify-Zugriff ist für die Codeprüfung nicht erforderlich.
- Große historische ZIP-Sicherungen und nicht ausgewählte Screenshots/PDFs sind nicht enthalten. Die im aktuellen App-Build verwendeten Referenzressourcen unter `app/` sind enthalten. Ältere Quellmanifeste benennen auch ausgeschlossene Archive; ihr Vorhandensein nicht unterstellen. Konkrete fehlende Prüfgrundlagen im Bericht nennen.
- Die 14 externen Theme-Assets und die bestehende kompilierte Function sind nicht vollständig enthalten. Fünf eingebettete Theme-Dateien wurden auf Plesk privat zurückgewonnen; sie befinden sich nicht in diesem Quellpaket. Die Inventur im Paket ist kein vollständiges wiederherstellbares Erweiterungsbackup.
- Die tatsächlich installierte Händlerlaufzeit basiert auf `5884f3e5becbb3226691fd0dc98beb5d8440306e`; spätere Änderungen betreffen Prüfhilfen und Dokumentation. Nicht behaupten, jeder lokale Commit sei bereits auf dem Webserver installiert.
- Der Quellstand `6f384f4` ist lokal und als geprüftes privates Git-Bundle auf Plesk gesichert. Das Bundle setzt den bestätigten Vorfahren `d8a0944` voraus. Kein erfolgreicher GitHub-Push der späteren Commits bestätigt.
- Das Archiv ersetzt keine Serverinventur oder unabhängige Live-Abnahme. Vorhandene Berichte sind von Codex erstellte Nachweise. Auch dessen Aussage, Produktionsdaten und globale Servereinstellungen nicht ersetzt zu haben, kann allein aus dem lokalen Quellcode nicht umfassend bewiesen werden.
- Fehlende Verbindungen: reale Händler-/Kundenanmeldung, passende Schiefer-Produktrevision mit Befestigungsgeometrie, Warenkorb-/Aufpreisbindung, Bestell-Webhooks und kaufgebundene Dateifreigabe. Kein bestätigter Testkauf ohne Belastung/Produktionsauslösung. Drive-OAuth und KI-Anbieter/Kosten ebenfalls offen; keine physischen Druckabnahmen.

## Besonders kritisch zu hinterfragen

1. Welche „bestandenen“ Prüfungen verwenden selbst erzeugte Identitäten, Mocks oder Prüfdaten und decken damit keine echte Integration ab?
2. Werden fehlende Funktionalität, fehlerhafte Konfiguration und externe Zugangsprobleme sauber unterschieden?
3. Sind Rechte-, Datei-, Prozess-, Revisions- und Bestellgrenzen im tatsächlichen Code wirksam oder nur im Testaufbau?
4. Welche Statusmeldungen sind widersprüchlich oder veraltet? Besonders `START_HERE.md` versus aktuelle STATUS-/Serverberichte prüfen.
5. War der Veröffentlichungsansatz bei erkennbar fehlenden Erweiterungsartefakten angemessen? Welche konkrete Voraussetzung hätte vor dem Versionsversuch erfüllt sein müssen?
6. Welche kleinsten Korrekturen schaffen einen zuverlässig prüfbaren nächsten Schritt? Keine pauschale Neuimplementierung und keine vollständige Freigabe ohne Belege.
