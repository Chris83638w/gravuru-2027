# Prüfung und Release-Vorbereitung · 10.10.2026

Der Nutzer hat die Weiterentwicklung, Prüfung des gesamten erreichbaren Entwicklungsstands und anschließende Veröffentlichung ausdrücklich beauftragt. Der vorhandene Shop soll direkt für Integrationsprüfungen verwendet werden; er ist laut Nutzer noch nicht live, Zahlungen sind angebunden. Eine Testzahlung ohne Abbuchung wurde noch nicht bestätigt. Frühere Entwicklungspausen gelten nicht mehr.

## Aktuell ausgeführt

- Cloud-Arbeitsverzeichnis `/workspace/gravuru-restored`, eigener Branch `task/live-release-20261010`, Ausgangscommit `260ada3aaa0173c3492d0249fc0c055c8b5a726a`. Die ursprüngliche Wiederherstellung einschließlich aller neueren Branchhistorien bleibt erhalten.
- Vollständige aktuelle Node-Suite: **607 bestanden, 0 Fehler, 0 übersprungen**, 206 Sekunden. [Prüfnachweis](node-tests.json). Automatisierte Prüfung; kein Ersatz für eine echte Bestellung.
- Aktive Shopify-App und alle sieben Module erneut lesend erfasst. Konfiguration doppelt gelesen und semantisch identisch bestätigt. [Baseline](shopify-baseline.json).
- Alle 19 aktiven Theme-Dateien aus der älteren Git-Quelle bytegenau wiedergewonnen. Preisfunktion aus Quellcode mit festgelegten Werkzeugen gebaut; sechs Quelltests und zwei tatsächliche WASM-Ausführungen erfolgreich. Acht negative/positive Prüfgruppen schützen das Erweiterungsinventar.
- Erweiterungspaket in einem neuen privaten Plesk-Verzeichnis installiert: npm-Lockfile, echte Shopify-Konfigurationsvalidierung und kompletter App-Build jeweils Exitcode 0. [Servernachweis](server-build.json), [Paket](../../../deliverables/shopify-extension-build-20261010/README.md).
- Bestehende Werkstatt und neuer Händlerhost per HTTPS erreichbar; Händler-API ohne Identität weiterhin gesperrt. Keine Veröffentlichung, kein Neustart einer bestehenden Werkstatt und keine Produktmutation.
- Originaldaten der Gedenktafel Revision 30 privat gelesen: Produktdokument, alle 16 PDF-Originale und 16 Importdateien, alle 16 Originalprüfsummen bestätigt. Zusätzlich aktive Konfiguration über die originale Serverlaufzeit erfolgreich kompiliert: ein ausgewähltes Design, eingebettete Schrift- und Motivressourcen, neun Befestigungen. Diese privaten Daten bleiben außerhalb von GitHub.

## Festgestellte Anschlusslücken

Die installierte neue Händlerlaufzeit schützt sämtliche Werkstatt-API-Routen mit Händleranmeldung; Kunden-/Webhook-Routen sind noch nicht produktiv angeschlossen. Storefront- und Bestellmodule besitzen absichtliche Testbegrenzungen. Das neue Warenkorbangebot ist noch nicht mit den Attributen der vorhandenen Preisfunktion abgestimmt. `read_orders` und Bestell-Webhooks fehlen in der aktuellen App-Konfiguration. Der native Produktpfad der neuen Werkstatt war auf Acryl beschränkt; die Schieferübernahme muss Originalelemente und Rechte erhalten.

Physische Druck-/Gravurfreigaben, Drive-/KI-Anschlüsse und tatsächliche sichere Testzahlung sind weiterhin gesonderte Voraussetzungen. Ein erfolgreicher Build ist keine vollständige Betriebsfreigabe. Nicht erreichbare frühere Cloud-Dateien sind weiterhin im [Wiederherstellungsbericht](../../../recovery/2026-10-10/RECOVERY-PROVENANCE.md) ausgewiesen; es wurde kein vollständiger privater Datenbankstand rekonstruiert.

## Behobene Zugriffs-/Buildprobleme

Historische npm-Lockdatei passte nicht zum Quellmanifest: in isolierter Kopie neu aufgelöst und anschließend `npm ci` geprüft. CLI-Compilerdownload verwendete den Cloud-Proxy nicht: offizielle Compilerdateien mit geprüftem TLS bezogen. Erster Serverbuild ohne SDK-Abhängigkeiten abgewiesen; Installation ergänzt. Ein geerbtes npm-Offline-Flag blockierte den folgenden Installationsversuch; explizit für den isolierten Installationsschritt aufgehoben. Danach vollständig erfolgreich. Keine unveränderten Fehlversuche wiederholt, TLS-Schutz nicht deaktiviert.
