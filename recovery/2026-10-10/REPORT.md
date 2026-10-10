# Sicherung und Installationsprüfung · 10.10.2026

**Der erreichbare neuere Projektstand ist wiederhergestellt und als versioniertes Installationspaket geprüft. Die Live-Werkstatt wurde nicht verändert.** Das ist eine Quell-/Ressourcen-/Dokumentationssicherung mit lokaler Installationsabnahme, keine Freigabe einer vollständigen Shopify-Verkaufsstrecke.

## Gesicherter Umfang

1. Alle 113 beim ersten Abruf erreichbaren Branches von `Chris83638w/gravuru-2027`, einschließlich der Historien des bisherigen Sicherungsbranches. Der ursprüngliche Checkout auf `work`/`3ff2c2f` war sauber und blieb erhalten.
2. Neuerer Produktstand `d8a0944` statt Rücksetzung auf Basis `a2af162`; danach die zuvor nur auf Plesk gesicherten Änderungen bis **`6f384f4`** wiederhergestellt. Das Bundle war byteidentisch zum historischen SHA-256-Nachweis und bestand `git bundle verify`.
3. 1.093 Dateien im wiedergefundenen Produkt-/Dokumentationsbaum: vollständige App, vorhandene Ressourcen, Testskripte, historische Berichte, Screenshots, Excel-Vorlagen, synthetische Druck-PDFs und frühere Lieferpakete. Neue Sicherungsnachweise und Installer kommen hinzu; Datei-Hashes in `SOURCE-FILES.json` (angegebener Inventurcommit beachten).
4. Die fünf jüngsten Dokumentations-/Exportdateien des nicht mehr verfügbaren Commits `c64c197` anhand vollständiger Chatdiffs beziehungsweise des protokollierten Erstellungsbefehls rekonstruiert. Keine Behauptung, das ursprüngliche Git-Objekt oder Original-ZIP sei wiedergefunden.
5. Fünf zusätzliche eingebettete Theme-Dateien von Plesk; aus dem erreichbaren älteren Repository 34 Erweiterungsdateien einschließlich **aller 14 vorher vermissten Theme-Assets und des Preisfunktions-Quellcodes**. Die 15 Branches/27 Refs dieses älteren Repositorys sind bereits in dessen bestehendem Sicherungsbranch verankert und hier inventarisiert. Kein Beleg für Byteidentität mit dem heutigen Shopify-Release, keine kompilierte WASM-Datei gefunden.

Sicherungsziele: `backup/account-recovery-20261010` und `task/full-backup-install-20261010`. Beide erhalten den neueren Produktbaum und die vollständige bisherige Sicherungshistorie. `main` bleibt unverändert. Ein Fast-forward-Push ohne Force verhindert das Überschreiben zwischenzeitlicher Remote-Änderungen; die bestätigte endgültige Commit-ID steht in der Abschlussmeldung.

## Installationspaket

[Paket, Installer und Anleitung](../../deliverables/recovery-install-20261010/README.md)

- Version: `0.1.0-recovery.20261010+a9bfbfbc463e`.
- Quelle: `a9bfbfbc463e8eb54903097873f6e240a3c8a392`.
- Größe: 27.212.538 Bytes; 370 manifestierte Dateien plus Manifest.
- SHA-256: `551ef1c8ddd985cfd55ad5730bb8d5586ab0090bc75fe3703ae515a5eeee78c5`.
- Tatsächliche automatisierte Installation in neue temporäre App-/Privat-/Python-Verzeichnisse, frische Abhängigkeiten aus Paketindex, danach Vorbereitung und Laufzeitprüfung erfolgreich. Der Installer überschreibt keine vorhandene Installation und startet keinen Dienst automatisch.

## Ausgeführte Prüfungen

| Prüfung | Ergebnis / tatsächlicher Umfang |
| --- | --- |
| Git-Objekte und Vorfahren | `git fsck --full --no-reflogs` ohne Fehler; alle erfassten Remote-Branchspitzen im wiederhergestellten Verlauf; Bundle-Prüfsumme und Voraussetzung korrekt. |
| Ursprüngliche Ressourcen | 4 Referenzarchive und alle 294 entpackten Manifestdateien mit Original-SHA-256 geprüft. |
| Build | 76 Ressourcen verifiziert, 1 Modell, 461.440 Editor-Bytes. |
| Breite Node-Prüfung auf `d8a0944` | 588 Tests, zunächst 587 PASS / 1 umgebungsbedingter Fehler; die betroffene Konfigurationsgruppe anschließend außerhalb künstlicher Git-Marker 5/5 PASS. |
| Wiederhergestellte Module bis `6f384f4` | 66 gezielte Tests PASS: HTTP, private Laufzeiten, Händler-JWT, Shopify-Lese-/Variantenprüfung, Versionsschutz und Gedenktafel-Auswahl. Testmengen überschneiden sich; Zahlen nicht addieren. |
| Automatischer Installer | 7 Prüfgruppen PASS: äußere/innere Manipulation, vorhandene Ziele, frische Installation, Wiederholschutz, reale lokale App/Auth/CSRF, SQLite-/Sitzungserhalt nach Neustart und zweite Prozessinstanz. |
| Installiertes ZIP im Browser | 6 Gruppen PASS: Manifest, Python/Cairo, private Konfiguration, simulierter LiteSpeed-Eingang, Passwort-/Host-/Origin-/CSRF-/Dateischutz, private Entwürfe, SVG-/CSV-/Excel-/SQLite-Ablauf, Neustart ohne Duplikate; Desktop/390 px ohne JS-Fehler. |
| Händler-Browser | Produktanlage/Wiederöffnen, authentifizierte Vorschau, Desktop/Mobil und anonyme API-Sperre PASS; synthetischer Bearer und simuliertes App Bridge/HTTPS. |
| Archive / sensible Inhalte | 22 Archive inklusive verschachtelter Quellpakete bei der dokumentierten Inventur gelesen/CRC-geprüft; 1.484 unterschiedliche Inhalte auf bekannte Secretmuster, eingebundenes Passwort und SQLite-Signatur geprüft, keine Funde. Neue Lieferdateien vor Push zusätzlich geprüft. Kein Beweis gegen jede unbekannte Geheimnisform. |

Maschinenlesbare Ergebnisse: `INSTALL-TEST.json`, `PACKAGE-BROWSER.json`, `MERCHANT-BROWSER.json`, `TEST-SUMMARY.json`, `REFERENCE-CHECK.json`, `CONTENT-CHECK.json`; ausführliche Node-Ausgaben und Screenshots liegen daneben.

Eine zusätzliche Kombination bisher getrennter Paket-Testoptionen deckte einen **Fehler im Prüfskript** auf: `--draft-access` legte ein zusätzliches Prüfprodukt an, während die spätere CSV-Prüfung starr insgesamt zwei Produkte erwartete. `scripts/check-plesk-test-package.py` prüft nun genau ein neues Importprodukt und die Unverändertheit aller zuvor vorhandenen Produkte. Neuer Lauf bestätigt 2 → 3, Neustart/Wiederholung bleiben bei 3. Erster Fehlbericht erhalten. Keine Änderung des App-Produktcodes oder Anpassung an fehlerhaftes Produktverhalten.

## Bewusste Grenzen und fehlende Dateien

**Keine Garantie, dass jede jemals in einem alten Chat erzeugte Datei wiedergefunden wurde.** Nicht eingebunden sind die damaligen Cloud-Arbeitsverzeichnisse, lokalen Windows-Verzeichnisse, ungesicherten Anhänge und temporären Prüfdateien. Das Original-Prüf-ZIP von `c64c197` fehlt; vollständige sichtbare Änderungen wurden rekonstruiert. Die genaue Liste und Herkunft stehen in [RECOVERY-PROVENANCE.md](RECOVERY-PROVENANCE.md).

Private Plesk-Datenbanken, Konfigurationen, Token und Kunden-/Originaldaten bleiben außerhalb des Repositorys auf dem Server. Ihre Verzeichnisse wurden nur inventarisiert; es wurde **keine konsistente private Datenbanksicherung** erstellt und keine Geheimnisdatei gelesen. Git-Sicherung und Installationspaket ersetzen kein separates Betriebsdaten-Backup.

Nicht neu ausgeführt: Installation oder Neustart auf Plesk, echte Shopify-Händler-/Kundenanmeldung, reale Testbestellung, Checkout-/Webhook-Gesamtstrecke, physische RIP-/ICC-/Maschinenabnahme oder unabhängige Claude-Prüfung. Die aktuelle Testinstallation ist lokal auf derselben Cloud-Maschine mit getrennten Prozessen und frischen Verzeichnissen/virtueller Python-Umgebung; kein zusätzlicher Cloud-Server und kein Container-Isolationsnachweis. Alte Serverberichte bleiben historische Nachweise.

Als nächster fachlicher Schritt kann eine unabhängige Prüfung auf diesem gesicherten Stand fortgesetzt werden. Vor irgendeiner Live-Umstellung sind der genaue Stand der vorhandenen Erweiterungen einschließlich WASM, echte Anmelde-/Bestellstrecke und gesonderte Betriebsdatensicherung zu klären. Dieser Sicherungslauf nimmt keine Produktivumschaltung vor.
