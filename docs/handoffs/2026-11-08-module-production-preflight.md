# Modulanschluss – tatsächliche Produktionsgrundlage

Stand: 08.11.2026. Diese Notiz trennt geprüfte Bestandsdaten von noch nicht aktivierten Anschlussänderungen.

## Unveränderlicher Kundenstand

Der freigegebene R15-Kundenkonfigurator und seine Oberfläche bleiben bestehen. Produktgruppen sollen denselben Konfigurator mit bestätigten Modulprofilen verwenden. Keine neue Kundenoberfläche pro Produkt, keine automatische Umgestaltung vorhandener Designs und keine Übernahme neuer Optionen ohne Bestätigung.

Bestehendes Edelstahl-Türschild: Shopify `16190784438652`, native Kennung `cfg_ac514214-a313-4738-8008-00445ee1befd`, Revision 4. Bestätigt sind 8 Formen, 80 Größen und 404 Variantenverbindungen. Fotos sind aus; SVG-Logos kosten 12,99 EUR. Motive kosten 1,69 EUR. Aktuelle Formen, Preise und Befestigungen bleiben erhalten.

## Frisch gelesene Produktionsbelege

- Die gezielte, nur lesende Datenbankaufnahme bestätigt alle 404 aktuellen Verbindungen samt Revision 4 und ihrer Katalogfreigabe. Sie enthält keine Bestellungen, Kundentexte oder Uploads. Gzip-SHA256: `3895cfba6aaf56e53ce580221f08c46743f0c353605dbaf4b3dde0d086975798`.
- Der aktuelle native Dokumentstand hat den serialisierten SHA256 `2e74548aa7211a2f5546af428e1d27d9f00f12181490356633e3cd109cb179c0`. Der kanonische Bindungshash ist `3b28df2b1792ca561243f1c592458f4dd309b0c317e88b83362a69e3e0586c1c`.
- Alle 251 Originalkennungen wurden mit der vorbereiteten Gesamtgalerie abgeglichen. Die `design.json`-Prüfsummen stimmen mit der Herkunft der vorhandenen r4-Designbank überein. Gefilterter Metadatenbeleg: SHA256 `b7fb25d152368a91be671fbaae59eff8fe095183dff48c44d5345992388ba84a`, 251 Originalkarten, 502 Produkt-/Importzuordnungen. Keine Datenbank dafür geöffnet und keine Quelle geändert.
- 239 Originale haben 1.418 ausdrücklich passende native Stahlziele. Zwölf Originale haben weiterhin ungeklärte Zielprüfungen: elf D952-Fassungen zur Verfahrensklärung und `TRE-V2A-9x3-D55` wegen Überstand. Eine vorhandene Originalkarte allein bedeutet keine Freigabe zum Designabgleich.

Die Metadatenaufnahme ersetzt keinen frischen Produktionsplan: Vor einer Übernahme müssen native Verbindungen, Freigaben, Profilversion, Optionen und Shopify-Preise erneut über die tatsächlichen Schnittstellen gelesen werden.

## Zwei ausdrücklich getrennte Vorgänge

1. **Nur Modulprofil ändern:** eigener Typ `module-profile`; bestehendes Zielprodukt, bestätigte ursprüngliche Fähigkeitsrevision und gespeichertes Profil. Keine erfundene Galerie-Original-ID und keine Medien- oder Artworkübertragung. Alle 251 Designs bleiben erhalten.
2. **Designs synchronisieren:** konkrete Original-, Ziel-, Größen- und Freigabezuordnung erforderlich. Die zwölf offenen Zielprüfungen werden nicht übergangen. Der erste Produktionsanschluss exponiert diesen Vollabgleich noch nicht.

## Aktive und vorbereitete Galerie

Der tatsächlich aktive private Galeriehost verwendet weiterhin `gesamtbestand-stage-0bb50565-20261106-v1/gallery-4`. Dort liegen nur 24 der 251 Stahloriginale. Die größere Quelle `complete-gallery-20261107-v1` ist vorbereitet, aber laut STAGE-READY nicht aktiviert. Ihre Existenz darf nicht als Freigabe verstanden werden, Astras gesamten Galeriehost umzuschalten.

Der Modulanschluss muss dieselbe aktive Quellregistry, Datenablage, Anmeldung und CSRF-Prüfung verwenden. Er erhält eine getrennte, geprüfte Backend-Laufzeit. Der Kundenhost wird dafür nicht ersetzt.

## Sicherung und Freigabegate

Vor dem Mount wird eine private Online-Sicherung von acht SQLite-Datenbanken sowie Start-/Konfigurationsdateien erstellt. Galeriezuordnung, Manifest und Marker werden zusätzlich gesichert. Datenbankkopien bleiben privat auf dem Server; GitHub erhält nur die Beschreibung und Prüfsummen. Für den Mount sind vollständige Sicherungsbelege, unabhängige Prüfung und geschlossenes Dateimanifest erforderlich.

**Sicherung abgeschlossen:** 08.11.2026, 13:54:00 UTC. 16 Dateien einschließlich acht SQLite-Datenbanken mit `quick_check` und SHA256 wurden privat gesichert; zusätzlich drei Galerie-/Importdateien. Sicherungsordner `private/mika-module-connect-20261108-v2/pre-mount-backup-v2`, ergänzende Dateien `pre-mount-files-extra`. Vollständiger Receipt SHA256 `e4ae36a7e450fc295b4955266e556a36474bf0ed81f6d8a6d50162321339c83e`; lokale Nachweiskopie `outputs/module-production-connection-20261108/live-host/pre-mount-backup-final.json`.

**Aktivierungsstand:** Noch keine Aktivierung des neuen Modulanschlusses, keine Änderung am Kundenhost und keine Shopify-Schreibaktion in diesem Arbeitsschritt. Beide Schreibschalter bleiben beim ersten Anschluss ausgeschaltet. Der lokale Integrationsstand ist in Draft PR 213; der neue rein lesende Anschluss wird in dasselbe Runtimepaket aufgenommen.

## Koordination

- Backendagent: kohärente Zusammenführung, gemeinsamer Verwaltungsdienst, Modulprofil-Typ, native 251/404-Erhaltung, Paketmanifest.
- Anschlussagent: reale Quell-/Zielzuordnungen und private lesende Vorprüfung mit bestehender Preislogik.
- Prüfagent: unabhängiger Review von Versionen, Bestätigung, konkurrierenden Änderungen, Datenhaltung und Lebenszyklus.
- Hauptagent: aktuelle Serverbelege, private Sicherung, kontrollierter Anschluss und abschließende Dokumentation.

Ein neues Profil oder eine neue Produktgruppe benötigt weiterhin einen konkreten bestätigten Anlageplan. Eine allgemeine Zustimmung zum Modulbau ersetzt keine Freigabe neuer Produktoptionen.
