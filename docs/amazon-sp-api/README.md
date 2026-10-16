# Amazon SP-API in gravuru 2027

Prüfstand: **16.10.2026**, Entwicklungsbranch `task/amazon-sp-api-20261016`. Die Integration erweitert die vorhandene Werkstatt mit Node.js 24 und SQLite. Es entsteht kein zweites Warenwirtschaftssystem.

**Nachgewiesen ist eine echte Verbindung zur statischen Amazon-Sandbox:** LWA-Tokenabruf und Orders API `v2026-01-01` / `getOrder` haben HTTP 200 geliefert. Die Antwort enthält ein öffentliches Amazon-Testbeispiel, keine gravuru-Kundenbestellung. Produktive Auftragsabrufe, Amazon-Custom-APIzugriff, Carrierkonten und produktiver Betrieb dieser Amazon-Erweiterung sind damit nicht freigegeben oder getestet.

Der lokale Stand enthält jetzt außerdem unveränderlichen Custom-Dateiimport pro Testposition mit Feldprüfung und Bestätigung, automatische A4-Testbegleitscheine beim Auftragsimport, A4-/A5-Stapelausgabe mit Code 128 sowie interne Scanschritte für Fertigung, Qualität und Versandvorbereitung. Vollständiges Bildlayout und physischer Drucker-/Scannertest bleiben offen. Aktuelle Ergebnisse: [siehe Testnachweis](ABNAHME.md).

## Dokumentation

- [Berechtigungsbericht](BERECHTIGUNGEN.md): Profilrollen, Sandbox-App, API-Nachweis und widersprüchlicher älterer Supportstatus.
- [Einrichtung und Testbetrieb](EINRICHTUNG.md): lokale Vorschau, verschlüsselter Zugangsspeicher, Testbefehle und erwartete Ergebnisse.
- [Technischer Integrationsstand](INTEGRATIONSSTAND.md): Module, Datenfluss, Grenzen und nächste Abnahmen.
- [Sicherheit und Aufbewahrung](SICHERHEIT-UND-AUFBEWAHRUNG.md): umgesetzte Schutzmaßnahmen, produktive Nachweise und Löschvorschau.
- [DTC-Antrag – Entwurf](DTC-ANTRAG-ENTWURF.md): begründeter Custom-Anwendungsfall; nicht eingereicht.
- [Aktueller DTC-Antragsstand](DTC-ANTRAGSSTAND.md): Antrag autorisiert, Portalentwurf ergänzt, Sicherheitsnachweise fehlen.
- [DTC-Sicherheitsfragen](DTC-SICHERHEITSFRAGEN.md): tatsächliche Portalfragen, begrenzte Antworten und benötigte Nachweise.
- [Custom-Dateiimport und Barcodes](CUSTOM-DATEIIMPORT-UND-BARCODES.md): manueller Zwischenweg, Testimport, PDF-/Scanablauf und Hardwaregrenzen.
- [Quellen](QUELLEN.md): offizielle API-, Richtlinien- und Carrierunterlagen.
- [Sanitisierter Sandboxnachweis](nachweise/sandbox-probe-2026-10-16.json): Zeitpunkt, HTTP-Status, Request-IDs und öffentliche Testdaten.
- [Abnahmeprotokoll](ABNAHME.md): automatisierte Prüfungen, echte Sandbox und Browserbeobachtungen.

## Arbeits- und Freigabegrenzen

Die lokale Laufzeit bindet an `127.0.0.1`, verwendet eine eigene Testdatenbank und akzeptiert ausschließlich einen Sandbox-Client. Die wiederholte Prüfung ist optional und ruft dasselbe statische Testbeispiel ab. Sie ist kein automatischer produktiver Bestellimport.

Die DTC-Antragstellung ist ausdrücklich autorisiert; der Portalentwurf wurde ergänzt, aber wegen ungeprüfter Sicherheitsangaben nicht abgeschickt. Eine weitere allgemeine Antragserlaubnis fehlt nicht. Freigabepflichtig bleiben insbesondere Zugriff auf echte Kundendaten, Änderungen an echten Bestellungen/Angeboten/Preisen, echte Versandlabels, produktive Deployments, sicherheitskritische Produktionsänderungen und tatsächliche Datenlöschung. Ein Sandboxtest hebt diese Grenzen nicht auf.

Die bestehende Webanwendung unter [app-2027.gravuru-designwerkstatt.de/werkstatt/](https://app-2027.gravuru-designwerkstatt.de/werkstatt/) ist mit HTTP 200 und dem Titel „Gravuru 2027 · Werkstatt“ bestätigt. Die Rootadresse zeigt eine Plesk-Standardseite; daraus folgt nicht, dass die Werkstatt fehlt. Cloudinternals, produktive Datenspeicher und Sicherheitskonfiguration sind weiterhin ungeprüft. Der neue Amazon-Branch wurde nicht dorthin deployed. Aktuelle Testzahlen einschließlich der Erweiterung: [siehe Testnachweis](ABNAHME.md).

[Sicherung und Wiederaufnahme](SICHERUNG.md) · [Synthetischer nativer Prüfstand](../../scripts/amazon-demo-design.README.md)
