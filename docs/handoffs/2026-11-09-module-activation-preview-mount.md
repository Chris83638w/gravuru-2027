# Gesichert: vorhandenen Modulplan prüfen und bestätigen, Ausführung weiter gesperrt

Nutzerauftrag: ein gemeinsamer Konfigurator, Module je Produkt/Gruppe, konkrete Änderungsübersicht mit Bestätigung. Dieser Schritt ergänzt keine Gestaltung und keine Produktionsregel. Der Design-Master bleibt unverändert verbindlich.

Basis PR223 `fce83b0494e320ce3821be25edad27ab747332f5`. Zwei neue Produktionsmodule verbinden ausschließlich den vorhandenen Aktivierungsadapter mit dem bestehenden privaten Verwaltungsweg. Beide Schreibschalter bleiben fest ausgeschaltet. Die beiden tatsächlich gespeicherten Stahlprofil-IDs/Revisionen/Hashes und die vorhandenen Bibliotheks-/Journalpfade sind explizit gepinnt. Keine Liveinstallation, keine Profilzuweisung, keine Änderung an Kundenaufbau oder Shopify.

Gezielter Nachweis **2/2 grün, 0 Skip**: tatsächlicher privater HTTP-Weg, Plesk-Anmeldung/CSRF, reale 251/404-Eingabe in isolierten nativen Testdatenbanken, Auswahl → Änderung „Logo an → aus“ → ausdrückliche Bestätigung → 403 bei Ausführung. Nach Neustart gleicher Plan und gleiche Bestätigung. Native Ziel-SQLite bytegleich, gespeicherte Profilrevisionen gleich, null Aktivierungsvorgänge, null Shopify-Mutationen. Shopify-Antworten sind simuliert; kein Live-Nachweis behauptet. Kein breiter Engine-Neulauf.

Unabhängiger Read-only-Review durch `module_contract`: kein belegter Blocker. Die private Verwaltung bleibt für Profilbearbeitung und Prüfplan-/Bestätigungsspeicherung bestimmungsgemäß schreibbar; ausschließlich Produktaktivierung und Shopify-Schreiben sind gesperrt. Das ist keine pauschal nur lesende Oberfläche.

[Anleitung, Pfade, Grenzen und Testlog](../reviews/2026-11-09-module-activation-preview/README.md). Installationsdelta gegenüber privater Runtime-v2 Commit `044494a06b05571364e57dffc83b8a0a4458050d`: vier vorhandene Backenddateien aus PR214/223, vier neue Module, ein externer Weiterleiter. Geschützte Kunden-/UI-Dateien bleiben unverändert. Keine vollständige Laufzeitkopie; vor späterer Installation tatsächliche Vorherhashes prüfen. Nur `GRAVURU_GALLERY_MANAGEMENT_CONFIG` muss auf den neuen externen Weiterleiter zeigen, kein Kunden- oder Quellstartpfadwechsel.

Genau nächster Schritt: Root prüft das gesicherte enge Delta gegen die tatsächlich installierten Dateien. Erst nach gesonderter Abnahme darf der private Vorschau-Mount erfolgen. Ein produktiver Profilwechsel benötigt weiterhin einen frischen konkreten Plan, Nutzerbestätigung und eine andere ausdrücklich geprüfte Aktivierungskonfiguration. Das aktuelle Vorschaupaket kann keine Schreibschalter öffnen.
