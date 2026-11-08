# Optionaler Modulanschluss im tatsächlichen Plesk-Galeriehost

Stand 08.11.2026. Eigener Branch `dev/mika-plesk-module-host-20261108`, Basis PR #203 `0da2cf7ea59a4b9670e71e6aaf647f11cf26b2f0`. Kein Live-Mount, keine Shopify-Anfrage, keine Datenmigration, keine Änderung am freigegebenen Kundenkonfi. Astras Arbeitsbaum und laufender Prozess bleiben unverändert.

## Anlass und vorhandene Quelle

Site 19 startet tatsächlich über `gravuru-2027-bulkapproval-3db1ef5d/app.cjs` → `ops/plesk/app.cjs` → `createPrivateTestRuntime`. Der CLI-Anschluss aus PR #203 alleine erreicht diesen Pfad nicht. Der frisch gelesene Startwrapper verweist auf die private Konfiguration `private/gesamtbestand-stage-0bb50565-20261106-v1/config.json`. Die bestätigte Quelle ist deren `data` und `gallery-4` unter demselben privaten Verzeichnis, Origin `https://test-2027.gravuru-designwerkstatt.de`.

Die aktive Galerie enthält 462 Originale; nur **24 der 251 normalen Edelstahl-Türschildoriginale** sind dort gefunden. Deshalb ist sie derzeit keine vollständige Quelle für die neue Kunden-Designbank. Keine Ersatzzuordnung erfinden, keine 251 Designs aus einer unvollständigen Galerie überschreiben. Die 23-GB-Datenbank wurde nicht kopiert oder unbeschränkt durchsucht. Der erste Abgleich verwendet nur Manifest-/Importmetadaten; native Revisionen anschließend nur für exakt benannte IDs lesen.

## Begrenzte Änderung

- `ops/plesk/config.mjs` erlaubt optional `GRAVURU_GALLERY_MANAGEMENT_CONFIG`. Der Pfad muss absolut, außerhalb der Anwendung, ohne Symlink/Git-Verzeichnis und eine lokale `.mjs`-Datei sein. Er benötigt ein ausdrücklich konfiguriertes Galeriepaket. Die bestehende private Datei-, Eigentümer-, Rechte- und Konfliktprüfung bleibt erhalten.
- `ops/plesk/slate-review-runtime.mjs` verwendet mit `attachConfiguredSlateReviewGallery` denselben Loader wie PR #203. Die Factory erhält die bereits geöffnete Quellwerkstatt und echten Galerie-/Importpfade. Der bisherige synchrone `attachSlateReviewGallery` bleibt verfügbar; die Management-Injektion ist optional.
- `ops/plesk/runtime.mjs` wartet auf diesen begrenzten Anschluss. Authentifizierung, private Origin-Prüfung, CSRF, Werkstatt-Datenlock, Proxy und Fehlerbereinigung bleiben unverändert. Ohne neuen Konfigurationswert wird die bisherige Verwaltung montiert.

Der Anschluss erzeugt keine eigene Modul- oder Produktverwaltung. PR #201/#202/#203 müssen im späteren Integrationsstand gemeinsam vorhanden sein. Für die gemeinsame `/werkstatt/module/`-API und Galerie muss derselbe Modul-/Gruppenservice mit derselben Quellregistry verwendet werden; diese zusätzliche Integration wird getrennt bearbeitet. Gleiche Profildatenbank allein ersetzt die Galerie-Gruppenscopes nicht.

## Live-Basisvergleich und Sicherung

Die drei frisch lesend gesicherten Live-Dateien wurden vor Änderung verglichen:

| Datei | Live-SHA-256 | Vergleich mit PR203-Basis |
|---|---|---|
| `ops/plesk/runtime.mjs` | `2c7bf58d7fe54b1db5fdd9c71e9b29bb609c1b4bde824c26e2b5af88a6c611d7` | bytegleich |
| `ops/plesk/config.mjs` | `cc57b2ec02d9ae5a3606f05fb68c5f534abf4cd56133e826b9105ad5f42dad97` | bytegleich |
| `ops/plesk/slate-review-runtime.mjs` | `d595ad1802b01a835b313b7f8cc5f629b07b791e5505a6e0e3876f5d56f83531` | PR194 besitzt zusätzlich den späteren `blankOnly`-Validator |

Der neue Patch wurde separat und kontextgeprüft auf genau diese Live-Kopien angewendet. Der vorhandene Live-Mappingvalidator blieb dabei bytegleich; es wird kein ungeprüfter Dateiersatz vorgeschlagen. Lokale Belege: `outputs/module-production-connection-20261108/live-host/`, `plesk-host-adapter.patch` und `live-host-adapter-overlay-proof.json`. Die private Startdatei wurde nicht geändert. Der zuvor vorbereitete Gesamtstand ist in `doc-backup-before-plesk-adapter/` gesichert.

## Gezielte Abnahme

`node --test --test-concurrency=1 --test-timeout=40000 ops/plesk/gallery-management-mount.test.mjs scripts/slate-management-mount.test.mjs`

**7/7 bestanden.** Echte Plesk-Proxy-/Galeriehandler mit nativer Testdatenbank: unveränderter Standard ohne Konfiguration; Factory mit aktueller Registry und tatsächlichen Pfaden; anfangs passende Sichtfreigabe, anschließend fremde/fehlende Original-, Produkt- und Design-ID abgewiesen; Familienänderungen nach Start sichtbar; Basic-Auth/Host/Origin/CSRF unverändert; fehlende/ungültige lokale Factory installiert keine Routen. Windows-Prüfung modelliert lediglich POSIX-Dateirechte/UID, nicht die Anwendungsergebnisse.

Zusätzlich `ops/plesk/slate-review-runtime.test.mjs` und `scripts/gallery-management.test.mjs`: **7/8 bestanden**. Der verbleibende ältere Test erwartet für einen unbekannten Approval-Key 404, erhält 422. Genau derselbe Fehler wurde auf dem unveränderten PR203-Worktree reproduziert; kein neuer Adapterfehler, keine Sollwertänderung. Diese Gruppe wird nicht als vollständig bestanden ausgegeben.

Die erste neue Testfassung räumte unter Windows den temporären Ordner vor dem Datenbankschluss auf; die Testbereinigung wurde korrigiert. Der abschließende 7er-Lauf beendet sich regulär ohne erzwungenen Prozessabbruch.

## Nächster Schritt

Gemeinsamen Modul-/Gruppenservice fertig integrieren, aktuelle Quellabdeckung klären und exakt bestätigte Zielzuordnungen vorbereiten. Ein reiner Modulwechsel darf die vorhandene r4-Designfamilie unverändert erhalten; ein vollständiger Designabgleich benötigt die passende vollständige Originalquelle. Produktionsverbindung zunächst nur lesend, beide Schreibschalter aus. Ein Konfi mit schaltbaren Modulen bleibt das Ziel; keine neue Kundenversion je Produktgruppe.
