# Konkreter nächster Cloud-Übernahmetest

Neue Aufgabe ausdrücklich in der veröffentlichten Umgebung **gravuru-2027** starten. Der vorherige Werkzeugaufruf startete nur Scratch ohne Repository und wurde deshalb korrekt abgebrochen. Nicht erneut eine beliebige Cloud-Scratch-Aufgabe als Umgebungsnachweis zählen. In der verfügbaren Browseroberfläche war kein passender Cloud-Auswahlschalter vorhanden; die Umgebungsliste zeigte neben dem Namen „Unbekanntes Repository“. Verknüpfung/Auswahl ist vor dem Start zu klären, kein fehlender App-Code zu erfinden.

## Arbeitsauftrag für Konto A

Prüfe zunächst Umgebung, Betriebssystem und die tatsächliche Repositoryzuordnung. Kein Zugriff auf C:-Laufwerk oder Dateien dieses Laptops. Verwende nur das private Repository Chris83638w/gravuru-2027 und dokumentierte freigegebene Ressourcen. Lies CLOUD-AKTUELL.md, diesen Prüfauftrag und AGENTS.md. Klone den aktuellen Branch infra/gravuru-2027-cloud-20261003 neu; protokolliere die vollständige Commit-ID. Bei fehlender Berechtigung stoppen und die konkrete Ursache nennen, keine Ersatzquellen still verwenden.

Verifiziere Referenz-/Screenshotarchive anhand ihrer Manifeste. Installiere die dokumentierten Python-Anforderungen. Führe cloud-check sowie separat npm test und npm run build aus; Referenz: 137 verschiedene Tests, keine Fehler/Skips, 76 Ressourcen/1 Modell. Starte ausschließlich eine geschützte Entwicklungsvorschau. Prüfe Konfi, Werkstatt, Profile und Serien, Fremd-Host/-Origin und fehlenden CSRF. Sichere kompakte Testprotokolle ohne Tokens/private Daten dauerhaft auf einem eigenen Testbranch. Schreibe dort genau eine harmlose Übernahmemarkerdatei mit Commit-ID/Testergebnis, keine App-Änderung. Kein Merge, keine Veröffentlichung, keine Shopify-/Plesk-Mutation.

Private Bestände: erst den autorisierten sicheren Zugriff auf verschlüsseltes Serverbackup und Recovery-Key herstellen; Schlüssel nicht im Prompt, Chat, Shellargumentwert oder Git speichern. Danach WIEDERHERSTELLUNG.md in isolierter Datenablage ausführen. Ohne diesen Schritt nur Quell-/Testübernahme bestätigen, nicht nahtlose Übernahme aller Werkstattdaten.

## Konto B – Chris Open AI

Separat anmelden, demselben privaten Repository den konkret erforderlichen Zugang zuordnen und die von A protokollierte Branch-/Commit-ID öffnen. Nicht auf denselben Chat vertrauen. Einstieg und Marker lesen, ungefährlichen Test selbst ausführen, identische Commit-ID und Ergebnis dokumentieren. Keine Produktionsrechte für diesen Test. Momentaner Status: NICHT GETESTET.

## Abnahme

Neue veröffentlichte Umgebung tatsächlich gestartet; Quellinstallation/Tests/Build/Vorschau bestanden; private Datenbankintegration bestanden; Konto B bestätigt denselben Commit; unabhängige Zugangs-/Schlüssel-Recovery nachgewiesen. Erst dann die betroffenen offenen Punkte im Abschlussbericht schließen. Ein erfolgreicher Quelltest allein ist keine Livefreigabe.
