# Veröffentlichung und vollständige erreichbare Sicherung

Stand 10.10.2026: Die neue Händlerwerkstatt ist als Startseite der bestehenden Shopify-App **Gravuru Konfigurator** veröffentlicht. Einstieg über Shopify → Apps; die Anmeldung erfolgt mit Shopify App Bridge.

- App-Adresse: https://app-2027.gravuru-designwerkstatt.de/werkstatt/
- Installierter Quellcommit: `21f9922b49ab20bbd28f6c2e55f2d6278da0cef1`.
- Aktive Shopify-Version: `gid://shopify/Version/1162554900481`, Tag `gravuru-2027-merchant-20261010-build1`.
- Release: `gid://shopify/Release/1153001947137`.
- Gesicherte Rückkehrversion: `gid://shopify/Version/1146632241153`.

## Umfang und Erhaltung

Alle sieben bisherigen Shopify-Module sind vorhanden. Die 19 Theme-Dateien, Berechtigungen, Webhooks sowie Abfrage und Einstellungen der Preisfunktion sind unverändert. Neben der Händleradresse änderten sich die Modul-ID und WASM-Größe der aus wiedergewonnenen Quellen gebauten Preisfunktion (3332 → 3294 Bytes). Das neue WASM wurde separat geprüft; es ist nicht bytegleich mit der vorherigen Binärdatei. SHA-256: `f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890`.

Der veröffentlichte Kandidat wurde vor Freigabe mit der bisherigen Version und nach Freigabe mit der aktiven Version verglichen. [Maschinenlesbarer Nachweis](merchant-publication.json). Die vorhandene Kundenwerkstatt mit ihren Dateien und Daten blieb unverändert.

Die neue private Händlerablage enthält eine native Gedenktafel mit neun Befestigungen, ursprünglichen Preisen, Materialbild, Schrift und bearbeitbaren Textelementen. Ein ursprüngliches Design ist aktiv bearbeitbar; alle 16 Original-PDFs sind zusätzlich in der privaten Designbibliothek importiert. Die 16 PDF- und 16 JSON-Originaldateien wurden unverändert separat privat gesichert. Dies bedeutet nicht, dass sämtliche 16 Designs bereits vollständig als native bearbeitbare Vorlagen vorliegen.

## Installation und Prüfung

[Installationspaket](../../../deliverables/merchant-originals-20261010/README.md): Version `0.1.0-recovery.20261010+21f9922b49ab`, 27.222.491 Bytes, 381 Nutzdateien plus Manifest. SHA-256: `279cb0924365a665c2df88723c86bfa7e1749d3728bd3898e41cffa2ea9688a3`.

Automatischer Installer prüft Archiv und Dateien, baut in einem neuen Verzeichnis und validiert die private Konfiguration. Genau dieses ZIP wurde in einer getrennten Umgebung installiert und mit synthetischen Daten gestartet: Kundenansicht HTTP 200, anonyme API HTTP 401. Dasselbe Paket wurde auf dem getrennten Plesk-Händlerhost installiert; HTTPS und Zugriffsschutz danach mit echter TLS-Prüfung bestätigt.

- [Isolierte Paketprüfung](merchant-package-install.json), [Serveraktivierung](merchant-server-activation-21f9922.json), [HTTPS-Prüfung](merchant-final-https-check.json).
- 40 gezielte Händler-/Vorschauprüfungen bestanden. Breiter Lauf: 655 Tests, zunächst ein Fehler wegen fehlendem Browserkontext im Test; Ursache korrigiert und 16 betroffene Folgeprüfungen bestanden. Kein durchgängig grüner neuer 655er-Lauf behauptet.
- Echte Desktop-/Mobilbedienung mit synthetischer Shopify-Identität: Acryl, freie Gestaltung, private Bilder, Sicherung und Kundenansicht bestanden. [Browserabnahme](MERCHANT-PREVIEW.md).
- 5 Prüfungen für den gesperrten Installationswechsel bestanden; 19 PDF-/Importprüfungen und die Konvertierung aller 16 tatsächlichen Original-PDFs bestanden. [Originalprüfung](original-pdf-import-check.json).
- Vorherige Schieferabnahme: alle neun Preise, Textänderung, private Sicherung und maßhaltige Vektor-PDF geprüft. Keine physische Maschinenprobe. [Schieferabnahme](SLATE-ADAPTER.md).

Testmengen überlappen; sie dürfen nicht zu einer Gesamtzahl addiert werden.

## Sicherungen und Herkunft

Tatsächliche Cloud: Debian 13.6, Node 24.19, Python 3.12.14; Laufzeit-ID `ccarenv_b64_Y2NhcmVudl8xNjQ2ZWNjZjE3NmM4MTkxYjM3ZDhhMzgzMmM2Yzk0MA`. Arbeitsverzeichnis `/workspace/gravuru-restored`, Repository `Chris83638w/gravuru-2027`, Branch `task/live-release-20261010`. Der ursprüngliche Checkout `/workspace/gravuru-2027` blieb unangetastet. Produktbasis `a2af162edd3a1dfa2106212c9f4b76c7ae351b70` bleibt in der erhaltenen Historie; spätere Änderungen wurden nicht zurückgesetzt.

GitHub enthält Quellcode, Ressourcen, Dokumentation, Tests, Installationshelfer, Versionspakete und bereinigte Prüfberichte. Verbindliche Sicherungsbranches sind `task/live-release-20261010`, `backup/account-recovery-20261010` und `task/full-backup-install-20261010`; endgültigen Remote-Commit in der Abschlussmeldung beachten.

Private Sicherung auf Plesk und in `/workspace/recovery-private`: bisheriger Händlercode, Konfiguration und drei SQLite-Datenbanken vor Installation; außerdem eine konsistente Sicherung aller drei Datenbanken nach Originalimport. Für die vollständige Kopie wurde der Laufzeit-Lock gehalten. SQLite-Integrität und SHA-256 aller Cloud-Kopien bestätigt. [Bereinigter Nachweis](merchant-complete-private-backup.json). Geheimnisse, Datenbanken, Entwürfe und Originalkundendaten sind nicht im Repository oder Installations-ZIP.

Die genaue historische Bestandsaufnahme und fehlende Dateien stehen im [Wiederherstellungsbericht](../../../recovery/2026-10-10/REPORT.md) und [Herkunftsnachweis](../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md). Dateien verlorener Cloud-Arbeitsverzeichnisse, nicht hochgeladene lokale Dateien und das dort dokumentierte fehlende historische Review-ZIP sind weiterhin nicht erreichbar. Dokumentationsdiffs aus dem früheren Chat wurden als Rekonstruktion gekennzeichnet. „Alles erreichbar gesichert“ bedeutet nicht, dass verlorene Cloud-Dateien vollständig wiedergefunden wurden.

## Offene Abnahme und nächster Schritt

Die tatsächliche Shopify-Händleranmeldung ist noch vom Nutzer zu bestätigen. Der Zahlungs-Testmodus wurde vom Nutzer bestätigt. Die neue Warenkorb-/Bestellstrecke ist noch nicht angeschlossen; es wurde keine Bestellung ausgelöst, keine Zahlung getestet und keine Produktion gestartet. Die bisherige geschützte Preisfunktion bleibt aktiv.

Weiterarbeit: tatsächliche Storefront-Verfügbarkeit und Zugänge prüfen, gespeicherten Entwurf mit Varianten-/Preisvertrag verbinden, verifizierten Bestelleingang anschließen und anschließend eine echte Shopify-Testbestellung bis zum unveränderlichen Produktionspaket nachweisen. Die Veröffentlichung der Händleroberfläche ersetzt diese Abnahme nicht.
