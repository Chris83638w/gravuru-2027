# Gemeinsame Modul- und Produktgruppenverwaltung

08.11.2026 · Codex/Mika · ausschließlich lokale Integration, kein Live-Mount.

## Problem und Korrektur

Die Galerieverwaltung aus PR194/203 verwendet ihre dynamischen Galerie-Quellen und Unterkategorien. Die Modulverwaltung aus PR201/202 erzeugte dagegen einen eigenen Service mit `native-products` als Scope. Gemeinsame SQLite-Tabellen allein reichen dafür nicht: Eine in der Galerie angelegte Vorlage konnte im Modulbereich nicht zuverlässig weiterverwendet werden.

Der Workshop stellt jetzt `configureModuleManagement({filename,sourceRegistry})` bereit. Der ausdrücklich konfigurierte Galeriehost registriert damit vor den ersten Anfragen genau einen gemeinsamen Service. `/originale/verwaltung` und `/api/workshop/configurator-modules` arbeiten anschließend mit identischen Profilen, Gruppen, Quellen-IDs, Unterkategorien, Plänen und Bestätigungen. Die bestehende Oberfläche wird weiterverwendet.

- Exakt dieselbe Werkstattablage ist erforderlich; keine erratenen Quellen-/Pfadaliase.
- Eine bereits mit einer anderen Registry oder dem Standard initialisierte Verwaltung kann nicht während des Betriebs umgehängt werden: 409, vor ersten Anfragen korrekt konfigurieren.
- Wiederholte Registrierung desselben Registry-Objekts liefert denselben Service.
- Der Workshop besitzt und schließt den Service. Schließen des Galerie-/Sync-Anschlusses beendet nur dessen Journal; die Modul-API bleibt nutzbar, bis der Workshop geschlossen wird.
- Ohne ausdrücklich konfigurierten Galeriehost bleibt die bisherige native Quellenverwaltung bestehen.

## Fachlicher Rahmen

Nutzerauftrag vom 08.11.2026: ein Konfigurator mit wiederverwendbaren, ein-/ausschaltbaren Modulen; Optionen vor Produktanlage bestätigen; freigegebenen Kundenaufbau unverändert lassen. Der Design-Master im Katalog-Repository bleibt verbindlich. Dieser Fix ändert keine Designs, Maße, Preise, Ausführungslisten, Kundenoberfläche oder Bestellstände.

## Exakte Integrationsbasis

Eigener Branch basiert auf PR202 Commit `324a6434c2e506f222dd3056b4333ad36af38b8d` (einschließlich PR201). Die reale private Galerie-/Plesk-Anbindung wurde aus PR194 + PR203 (`0da2cf7ea59a4b9670e71e6aaf647f11cf26b2f0`) + PR207 (`4821ff99babd41b32784e1014e8124bac9912d5b`) als explizite zweite Checkout-Abhängigkeit geprüft.

Keine fremden Branches wurden blind übernommen. Der Integrationstest lädt den echten Plesk-Proxy, die tatsächlichen Galerie-Routen und den tatsächlichen Registry-Adapter aus diesem zweiten Checkout. PR194s reale Repository-Lesemethoden `importItems`, `head`, `cacheIdentity` und dessen Materialkatalog-Leser werden gegen dieselbe isolierte Testdatenbank verwendet. Produktanlage, Revisionen, Importtransaktion und Modul-API stammen aus PR202 mit diesem Fix. Dies ist ein gezielter API-Integrationsnachweis, **kein Nachweis einer vollständig zusammengeführten Produktionsruntime**. Bei deren Zusammenführung müssen beide bereits vorhandenen Repository-APIs und der Materialkatalog erhalten bleiben.

Produktionsdelta dieses PRs: nur `app/workshop/http.mjs` und `scripts/lib/gallery-module-management-host.mjs`.

## Geprüft

5/5 gezielte Tests, 0 übersprungen; vollständiges Protokoll und Dateihashes unter `docs/reviews/2026-11-08-shared-module-management/`.

1. Vorhandener Modul-Sync: konkrete Vorschau, ausdrückliche Bestätigung, gleiche Shopify-IDs im simulierten Shop, unveränderte alte Revision, idempotente Wiederholung.
2. Profiländerung nach Bestätigung: Konflikt, kein Produkt-/Shopwrite.
3. Bestehende Modul-UI/API verwendet nun tatsächlich die Galerie-Scope-IDs und dieselben Quellen.
4. Echte Plesk-Routen: Galerievorlage → im Modulbereich öffnen/Profil zuweisen → Optionen prüfen/bestätigen → über Galerie-Route genau einen lokalen Entwurf erzeugen → über Modul-Route ohne Duplikat wiederholen. Neue Quellrevision verhindert weitere Anlage. Falsche Anmeldung/CSRF und fehlende Bestätigung werden abgewiesen. Schließen des Galerieanschlusses schließt die gemeinsame Modul-API nicht.
5. Reales normalisiertes Edelstahl-r4-Dokument, SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`: Logo an/aus durch native Validierung; alle 251 Designs, sämtliche Formatdaten, Ressourcen und Elementrechte unverändert. Kein Originaldatensatz geschrieben.

Der Plesk-Test benötigt `GRAVURU_PLESK_MODULE_HOST_ROOT` auf den geprüften PR207-Checkout; der r4-Test `GRAVURU_MODULE_NATIVE_CANDIDATE` auf die genannte lokale Kandidatdatei. Ohne diese ausdrücklich gesetzten Abhängigkeiten werden genau diese zwei Tests als übersprungen ausgewiesen, niemals als erfüllt. Zum Ausführen: `node --test scripts/lib/gallery-module-management-host.test.mjs scripts/lib/gallery-module-plesk-shared.test.mjs`. Der lokale Python-Interpreter wird wie bisher über `GRAVURU_PYTHON` gesetzt.

## Offene Produktionsfreigabe

Der aktuelle Galeriequellstand enthält 24 Designs, die aktive Edelstahlbank 251. Deshalb **keine Design-Synchronisierung und kein gemeinsamer produktiver Mount freigegeben**. Dieser Unterschied wird weder durch neue Aliase noch durch Rückschreiben der Galerie umgangen. Der reine Modulprofil-/Gruppenanschluss ist lokal vollständig geprüft; konkrete Live-Zuordnung und gemeinsame Runtime-Freigabe bleiben getrennt.

Keine Server-, Shopify-, Browser- oder Live-Datenbankänderung durch dieses Paket. Browser-Sichtprüfung der zusammengeführten Verwaltung ist offen. Keine Änderungen am aktuell aktiven Edelstahl-r4 und keine alten Bestell-Snapshots verändert.

## Sicherung und nächster Schritt

Die zwei ursprünglichen Produktionsmodule wurden vor Bearbeitung lokal unter `outputs/shared-module-management-20261108/backup/` gesichert und gehasht. Der PR202-Basiscommit ist der reproduzierbare Code-Rückweg. Ohne aktivierte gemeinsame Produktion ist dieser Fix durch Entfernen seines Commits vollständig rücknehmbar; keine Datenmigration erforderlich.

Nächster Schritt: getrennte Review der zwei Produktionsdateien, anschließend PR194/201/202/203/207 plus diesen Fix kontrolliert zusammenführen und die bestehende Verwaltung sichtbar abnehmen. Die Designquellen-Differenz muss vor jeder Design-Synchronisierung explizit geklärt werden.
