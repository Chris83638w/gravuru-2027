# Amazon SP-API in gravuru 2027

Prüfstand: **16.10.2026**, Entwicklungsbranch `task/amazon-sp-api-20261016`. Die Integration erweitert die vorhandene Werkstatt mit Node.js 24 und SQLite. Es entsteht kein zweites Warenwirtschaftssystem.

**Nachgewiesen ist eine echte Verbindung zur statischen Amazon-Sandbox:** LWA-Tokenabruf und Orders API `v2026-01-01` / `getOrder` haben HTTP 200 geliefert. Die Antwort enthält ein öffentliches Amazon-Testbeispiel, keine gravuru-Kundenbestellung. Produktive Auftragsabrufe, Amazon Custom, Carrierkonten und Cloudbetrieb sind damit nicht freigegeben oder getestet.

## Dokumentation

- [Berechtigungsbericht](BERECHTIGUNGEN.md): Profilrollen, Sandbox-App, API-Nachweis und widersprüchlicher älterer Supportstatus.
- [Einrichtung und Testbetrieb](EINRICHTUNG.md): lokale Vorschau, verschlüsselter Zugangsspeicher, Testbefehle und erwartete Ergebnisse.
- [Technischer Integrationsstand](INTEGRATIONSSTAND.md): Module, Datenfluss, Grenzen und nächste Abnahmen.
- [Sicherheit und Aufbewahrung](SICHERHEIT-UND-AUFBEWAHRUNG.md): umgesetzte Schutzmaßnahmen, produktive Nachweise und Löschvorschau.
- [DTC-Antrag – Entwurf](DTC-ANTRAG-ENTWURF.md): begründeter Custom-Anwendungsfall; nicht eingereicht.
- [Quellen](QUELLEN.md): offizielle API-, Richtlinien- und Carrierunterlagen.
- [Sanitisierter Sandboxnachweis](nachweise/sandbox-probe-2026-10-16.json): Zeitpunkt, HTTP-Status, Request-IDs und öffentliche Testdaten.
- [Abnahmeprotokoll](ABNAHME.md): automatisierte Prüfungen, echte Sandbox und Browserbeobachtungen.

## Arbeits- und Freigabegrenzen

Die lokale Laufzeit bindet an `127.0.0.1`, verwendet eine eigene Testdatenbank und akzeptiert ausschließlich einen Sandbox-Client. Die wiederholte Prüfung ist optional und ruft dasselbe statische Testbeispiel ab. Sie ist kein automatischer produktiver Bestellimport.

Folgende Schritte bleiben ausdrücklich freigabepflichtig: Einreichung zusätzlicher Amazon-Rollen; Zugriff auf echte Kundendaten; Änderungen an echten Bestellungen, Angeboten oder Preisen; Kauf echter Versandlabels; produktive Deployments und Änderungen sicherheitskritischer Produktionskonfiguration; tatsächliche Datenlöschung. Die Beschränkungen werden durch einen erfolgreichen Sandboxtest nicht aufgehoben.

Cloud und produktive Datenspeicher wurden in diesem Integrationsstand nicht technisch geprüft. Die bekannte HTTPS-Domain lieferte eine Plesk-Standardseite; das ist kein Nachweis einer bereitgestellten gravuru-Anwendung. Die Tests dieses Branches sind mit lokalen Testdaten ausführbar. Der aktuelle [Abnahmestand](ABNAHME.md) enthält 105 erfolgreiche Amazon-Tests und 72 erfolgreiche bestehende Regressionstests; die native Prüfstandzuordnung einschließlich Browseröffnung ist erfolgreich geprüft.

[Sicherung und Wiederaufnahme](SICHERUNG.md) · [Synthetischer nativer Prüfstand](../../scripts/amazon-demo-design.README.md)
