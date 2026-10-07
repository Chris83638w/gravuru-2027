# Plesk über den Cloud-Browser erreichbar – 07.10.2026

Die frühere Aussage, Browsersteuerung sei hier nicht möglich, war zu pauschal. Kein Browser-Connector und keine Verbindung zum bereits angemeldeten Nutzerbrowser vorhanden; **lokaler Chromium lässt sich jedoch mit Playwright steuern**. Das ist jetzt konkret gegen Plesk geprüft, nicht nur gegen die lokale App.

## Tatsächlicher lesender Aufruf

- Eigener frischer Chromium-Kontext; vorgesehener HTTP/HTTPS-Proxy beibehalten, `ignore_https_errors=False`, keine deaktivierte Zertifikatsprüfung.
- Nutzerlink `https://gravuru.highspeed.cloud/admin/domain/list?context=domains` ohne Port: **HTTP 404**, Titel „404 Not Found“.
- Dieselbe Domainverwaltung auf **Port 8443**: Browser erreicht `/login_up.php`, **HTTP 200**, Titel **Plesk Obsidian 18.0.81**. Sichtbare Eingaben `login_name` und `passwd`.
- Ausschließlich GET-Anfragen zum genannten Host zugelassen, keine Formulare abgesendet, kein Loginversuch mit geratenen Werten, keine Serveränderung.
- Domainliste, bestehende Testbereiche, Node/Python/Cairo und Einzelprozessbetrieb weiterhin nicht authentifiziert geprüft.

Aktuelle Cloud-Statusbeobachtung: Revision 36, verbunden/laufend, Beobachtungen aktuell; keine Secrets, Runtime-Variablen oder ausgehenden Identitäten gebunden. HTTP-Freigabe als unrestricted konfiguriert, Status unknown; tatsächlicher Browseraufruf oben belegt die konkrete HTTPS-Erreichbarkeit. Keine allgemeine Netzwerk-/SSH-Zusage daraus ableiten.

## Jetzt erforderlicher sicherer Schritt

`GRAVURU_PLESK_USERNAME` und `GRAVURU_PLESK_PASSWORD` müssen als **direkte persönliche Prozessvariablen** für die bestehende Umgebung `gravuru-2027` bereitgestellt werden. Beide waren bei der unmittelbar vorausgehenden Verfügbarkeitsprüfung nicht vorhanden; keine Werte ausgegeben. Der Nutzer hat Bedienung der getrennten Testinstanz bereits freigegeben; es fehlt die sichere Anmeldung, nicht erneut die Zustimmung zur Einrichtung.

**Einstellungen → Codex Cloud → Persönlicher Tresor → Umgebungsvariable**: beide Namen getrennt mit den vorhandenen Plesk-Anmeldedaten im geschützten Wertefeld anlegen, auf `gravuru-2027` begrenzen. Die vorhandene Umgebung muss beide Namen unter **Umgebungsvariablen → Verwalten** anfordern. Ein Tresoreintrag allein genügt nicht. Keine Netzwerk-Secrets als Ersatz: sie sind für Port 443 ausgelegt, diese Oberfläche verwendet 8443; keine Proxy-Platzhalter in Loginformulare schreiben. Keine Werte in Chat, Git, ZIP oder Befehlsargumente.

Nach bestätigter Bereitstellung: Verfügbarkeit ohne Werte prüfen, Chromium am selben HTTPS-Ziel anmelden, mögliche zusätzliche Anmeldung/MFA nur dann konkret beim Nutzer anfordern. Zuerst vorhandene Testbereiche und deren tatsächliche Voraussetzungen lesen; danach ausschließlich den freigegebenen getrennten Testbereich bearbeiten. Die bisherige SSH-/VPN-/Plesk-API-Einrichtung bleibt zurückgestellt. Keine Sicherung wiederherstellen und keine Live-Werkstatt verändern.

Projekt-/Installationsstand bleibt `5b44c33fb5b53c504492e4ef12f8c7ff881d798a`, Paketquellcommit `2c46b7fc3b93a6d9f601a37b3c46ee881f38bec3`; keine Code-/Paketänderung oder Wiederholung bestandener Produktprüfungen.
