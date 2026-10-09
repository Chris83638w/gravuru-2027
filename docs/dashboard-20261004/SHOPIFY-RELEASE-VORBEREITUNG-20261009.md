# Shopify-Veröffentlichung: Sicherungsabruf vorbereitet · 09.10.2026

Die erneute Nutzeranweisung „alles komplett live setzen“ bestätigt die Freigabe für den vollständigen Shopify-Anschluss der bestehenden App. Keine erneute allgemeine Veröffentlichungsfreigabe erforderlich. Die technischen Anschluss- und Abnahmegrenzen bleiben tatsächliche offene Arbeit.

## Neu umgesetzt

Quellcommit `3996475c88cf5d27b8affbbeacbf723ec1ce70fe`, zusätzlich zum erhaltenen Projektstand `7200d2f`. Eigenständiger Betriebshelfer [read-baseline.mjs](../../ops/shopify/read-baseline.mjs): feste vorhandene Client-ID, nur Konfiguration abrufen und Versionen auflisten, keine App-Neuanlage, kein Deploy/Release. CLI 4.9.0 bleibt fest vorgegeben.

Der Helfer liest den privaten App-Automation-Token direkt auf dem Server. Der Token gelangt nur in die Umgebung des CLI-Kindprozesses, niemals in Befehlsargumente oder ausgegebene Fehler. Neues privates Verzeichnis je Versuch statt Überschreiben alter Sicherungen. Konfiguration und aktive Version müssen über zwei Abrufe übereinstimmen; nur dann entstehen Abschlussmanifest und gesicherte Rückkehrversion. Mitarbeiter-/Freitextdaten aus der Versionsliste werden nicht ausgegeben oder gespeichert. Abweichungen, leere Tokens, falsche App-Identität, deaktivierte TLS-Prüfung, Timeout und unsichere Dateipfade blockieren den Abschluss.

Der Abschlussbericht behauptet weiterhin weder eine vollständige Sicherung der Erweiterungsquellen noch Freigabereife oder Veröffentlichung. Die vollständige Erweiterungsinventur und der tatsächliche Händler-/Kunden-/Bestellanschluss folgen nach erfolgreichem Zugriff. Kein Blind-Deployment eines leeren Projekts, das vorhandene Shopify-Erweiterungen entfernen könnte.

## Tatsächliche Prüfungen

**13 neue lokale Tests bestanden**, `node --test ops/shopify/read-baseline.test.mjs`. Positive synthetische Konfigurations-/Versionssicherung; Wiederholung erhält alte Sicherung; fehlende/öffentliche/symlinkartige Dateien; falsche CLI-Version/Git-Pfade; wechselnde Remote-Konfiguration/Version; fehlende oder doppelte aktive Version; Fehler-/Tokenredaktion; Dateirechte/umask; gültige Versionsnamen mit Leerzeichen; deaktivierte TLS-Prüfung. Kein unveränderter Produkt-, Druck- oder Browser-Gesamttest wiederholt.

Der Helfer wurde über den bestehenden Plesk-Dateimanager in der privaten Werkzeugablage installiert:

`/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-shopify-deploy-tools/read-baseline-3996475.mjs`

SHA-256: `a9e60311e4ed3dfb007579fc09d7a49f93d8f0bfe7a0f3078afd7c6dc6c7249b`, reguläre Datei 0600. Das Werkstatt-Installationspaket und die laufende Webanwendung wurden nicht geändert. Der erste lange Plesk-Konsolenaufruf wurde vom Befehls-Transport abgewiesen (`node: -e requires an argument`); danach regulärer kleiner Datei-Upload und kurzer geprüfter Aufruf. Kein Umgehen von Netzwerk-/Zugangsgrenzen.

**Echter Serveraufruf:** Exitcode 1, `automation_token_missing_or_private_file`. Vorangehende Metadatenprüfung bestätigt: vorbereitete Token-Datei existiert und ist privat, aber leer. Damit korrekter Abbruch vor CLI-/Shopify-Zugriff und vor Anlage eines Sicherungsverzeichnisses. **Keine tatsächliche App-Konfiguration oder aktive Rückkehrversion abgerufen, kein Shopify-Release erfolgt.** [Servernachweis](shopify-release-baseline-20261009/server-report.json).

## Einmaliger noch notwendiger Zugangsschritt

Im bereits geöffneten Shopify-Dev-Dashboard die bestehende App **Gravuru Konfigurator → App settings → App Automation Token → Create token**, Laufzeit ein Monat. Den Wert ausschließlich in der vorbereiteten privaten Plesk-Datei `private/gravuru-shopify-app-automation-token` speichern; im Chat nur „hinterlegt“ melden. Falls der Bereich fehlt, nur die sichtbaren Menünamen nennen. Kein Passwort/Token im Chat, keine neue App.

Anschließend den vorbereiteten Helfer ausführen, tatsächliche aktuelle Konfiguration/Version sichern und daraus den konkreten Shopify-Anschluss umsetzen. Die App-Freigabe gilt bereits. Sichere Testbestellung, passende Varianten/Preise, zusätzliche Bestellberechtigungen, Kundenkontozugriff und physische Fertigungsabnahme bleiben offen; reine Veröffentlichung löst diese Punkte nicht automatisch.

GitHub-Anmeldung auch in Laufzeitrevision 64 nicht verfügbar: `git ls-remote` meldet fehlende HTTPS-Anmeldedaten. Neue Änderungen lokal committet, privater Serverhelfer installiert; kein erfolgreicher Push behauptet. Bestehende Live-Werkstatt, Produktionsdaten und Shopify-Produkte unverändert.
