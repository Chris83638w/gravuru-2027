# Übergabe: offizieller Prio Konfi, Sicherung und Anschlussplan

08.11.2026, Mika/Codex. Neuer Einstieg: [PRIO-KONFI.md](../../PRIO-KONFI.md). Alle Designs folgen weiterhin dem [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).

## Auftrag und Ergebnis

Nutzer hat R15 als offiziellen Prio Konfi freigegeben und die Übernahme nach main erlaubt. Gemeinsamer Konfi nur Mika + Nutzer; andere KIs nur bestätigte Produktoptionsdaten. Erster neuer Pilot Edelstahl-Türschilder: Form/Größe/Befestigung, alle Formen. Universelle Profile statt Produktgruppen-Forks, Fotos nur bei bestätigter Fähigkeit. Recherche mit drei Unteragenten und Primärquellen abgeschlossen.

Dieses Paket ändert nur Dokumentation und Arbeitsregeln. Keine neue Kundenoberfläche, kein Server-/DB-/Shop-Schreibzugriff, keine Preisänderung. Main erhält eine unveränderliche Freigabereferenz und den Plan; der gesamte gestapelte R15-Codebranch wird nicht pauschal gemergt. Grund: 123 Vorgängercommits / 805 Dateien und konkrete V4/V5-Galerie- sowie Formen-/Checkout-Abhängigkeiten.

## Sicherung

- Vollständiges git-archive des genehmigten Stands 863b7fd3: 299.376.694 Bytes, SHA256 `64b82cbd3652489e1ae5a0ed2f2c42cd5937a38071601f69d6cae33c7d81e835`.
- Vollständiges git-archive von main 207c0c7e: 269.706.553 Bytes, SHA256 `63e67ba82212fba8a1540f723e6d98a38d9f57fcfc07b36cc69ae968de7a265f`.
- GitHub-Tags `prio-konfi-approved-r15-20261108` und `backup/main-before-prio-20261108` erfolgreich erstellt und gepusht; niemals verschieben.
- Lokale ZIPs: `checkpoints/prio-konfi-20261108/`. Öffentliches R15-Paket erneut gehasht: 2.026 Dateien ohne Abweichung, unveränderte Design-/Materialhashes, je Modell 43 Designs/30 Schriften. [Beleg](../reviews/2026-11-08-prio-konfi/release-verification.json).
- Kein neuer Live-Datenbank-/Upload-Backup behauptet: diese privaten Daten wurden hier nicht verändert. Frische private Sicherung mit Restore-Test ist Pflichtteil eines späteren Runtimewechsels.

## Befunde, die nicht verloren gehen dürfen

1. Katalog vollständig: acht Formen/80 Größen; ältere lokale Familie nur fünf/61. Retro 2 fehlt in der alten Pilot-Originalauswahl, nicht als vorhandene Form. Größen/Preise/Befestigungen weiterhin vor Anlage bestätigen.
2. R15-Builder ist checkout=false/reviewOnly; native Galerie öffnet noch den bisherigen Editor. Das Umbenennen zum Prio Konfi stellt keine Verbindung her.
3. R15-Motivlimit bislang nur rechteckig ohne Rundung. Konturbezogen für alle Stahlformen korrigieren und abnehmen, ohne freigegebene rechteckige Bedienung zu verschlechtern.
4. R15-Ressourcenrepository V5 vs. Astra PR194 V4: Migration/Reader/Writer in privater Kopie prüfen. PR194 enthält Familienzuordnung bereits; nicht nachbauen.
5. Saveback vorhanden; neuer Logo-Upload-Roundtrip fehlt. Foto und Logo getrennt freigeben, keine impliziten Defaultrechte.
6. Bestehender Sync deckt Startdesign ab, nicht alle Nebenentwürfe/Medien. Produktanlage und Gruppenbestätigung sind noch nicht ein durchgängiger Shopify-Publisher.
7. Alter productSet-Importer kann Metafelder ersetzen und Lagerverfolgung abschalten. Nicht als allgemeinen Updater benutzen.
8. Bestehenden Edelstahl-Andenken-Piloten aus PR191 nicht erneut anlegen. Neuer Auftrag betrifft Türschilder.
9. Shopify-Connector liest passenden Shop gravuru-design.myshopify.com/EUR/Plus. Aktive Function, Scopes, Preisverträge und echter Warenkorb noch gezielt nachzuweisen.

## Kommunikation und Prüfung

Regel in #168/#48 veröffentlicht und drei bekannte lokale Designchats sowie eigene Rechercheagenten informiert; Links in PRIO-KONFI.md. Das ist Zustellung, keine behauptete Lesebestätigung aller externen Accounts. MD-Regeln ersetzen keine technischen Branch-Schutzrechte.

Nur Dokumentation geändert: keine neuen UI-Regressionstests erforderlich. Sicherungs-/Paketintegrität geprüft; bisherige R15-UI-Abnahme ausdrücklich historisch verlinkt. `git diff --check` sauber; zwölf neu hinzugefügte lokale Dokumentlinks ohne fehlendes Ziel. Tags auch remote auf die richtigen Zielcommits aufgelöst. Unabhängige Schlussprüfung bestätigt die Abgrenzungen und Quellen; ihren Hinweis auf vollständige Einzelabnahme aller acht Formen in die Abnahmetabelle übernommen. Keine unbeteiligten historischen Dokumentlinks geändert.

## Genau nächster Schritt

Bestätigungsfähige Edelstahlmatrix aus dem maßgeblichen Katalog, Preisquellen und realen Befestigungszuordnungen erstellen. Alle acht Formen sichtbar, fehlende Originale oder Regeln klar als offen. Parallel isolierte Runtimeintegration planen: R15 + aktuelle Galerie + gemeinsam verwendete Ressourcen + echter Shopify-Kontext. Kein Anlegen mit geratenen Preisen, keine Demo-Sperre einfach entfernen. Nutzer liefert zusätzliche Performancevorgaben; gestuftes Vor-/Nachladen ist bisher Empfehlung, kein freigegebener Umbau.
