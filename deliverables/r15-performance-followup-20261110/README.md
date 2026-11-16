# Gemeinsames Fünfdateienpaket: Galerie und vorbereitete Konfi-Pakete

10.11.2026 · **nur lokal vorbereitet und geprüft, nicht veröffentlicht**.

**Vor Veröffentlichung vollständigen Ist-Abgleich ausführen:** Neue UV-/Kontur-Benachrichtigungen lösten einen zusätzlichen Root-Abgleich aus. Der frische Read-only-Beleg vom 10.11.2026, 05:46:19 UTC bestätigt für unsere Runtime unveränderten Wrapper, vier Vorherdateien, fehlenden Helper und unverändertes HTML; die alte Quittung hat raw SHA `9cd80d0a…`, die neue fehlt. Das ist Roots Serverbeleg, keine eigene Liveprüfung dieses Autors. Dieses Archiv bleibt der gepinnte Kandidat für Baseline `767701ee`; erst der vollständige `--check` mit allen 51 Schutzdateien erlaubt die anschließende Entscheidung. Fremde Änderungen werden nicht zurückgesetzt; kein Hashguard wird gelockert.

Quellcommit `3bfe6a3151517ffdfb78ba5e010ab55de0aeace0`, Branch `dev/mika-performance-release-20261110`. Wiederverwendet die unveränderten Galeriequellen aus `6c310120d48daef12b16e9568916a62ecd278597` und die drei geprüften Serverquellen aus `333d77b4b98b4ce71fb2e4ae8b017d60b156d2d9`.

Das Paket pausiert konkurrierende Galerieabrufe während eines Designwechsels und bereitet die bereits öffentlichen, umgeschriebenen Konfi-Bundles im bestehenden Server im Speicher vor. Keine neue Oberfläche, keine Produktzuordnung, keine Preisänderung. Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt unverändert.

## Exakter Umfang

Vier vorhandene Dateien ersetzen:

- `app/configurator/variant-m/product-design-gallery.mjs`
- `app/workshop/ui/shop-design-switch.mjs`
- `app/configurator/variant-m/server.mjs`
- `app/workshop/acryl-employee-host.mjs`

Genau eine neue Datei, die vorher fehlen muss:

- `app/workshop/prepared-editor-bundles.mjs`

Die vollständigen Vorher-/Nachher-Hashes stehen in `patch-manifest.json`. Die zwei Runtime-Vorherdateien stimmen exakt mit der gesicherten realen Server-App überein; der Helper fehlt dort. Keine Guards wurden zum Anpassen an einen anderen Ausgangsstand gelockert.

## Ausgangsstand und Sicherung

- Bestehende Runtime: `/var/www/vhosts/gravuru-designwerkstatt.de/private/mika-r15-resume-20261108-v1`.
- Realer Ausgangsstand: `767701ee59c14ef550b6b1c1468013869b8fe188`, Quittung `server-hit-followup-20261109-receipt.json` vom 09.11.2026, 15:10:27 UTC.
- Wrapper-SHA: `e679ca2dd1285c7925126bec3ef67bf1b775e080f6306e3210a996874b90d53c`.
- Vorheriges HTML: `c2cff8848d89b0a2260ed5a7f5d824e08b1837482241445d310606d4ee2545d4`.
- Geschützt: 51 Quelldateien einschließlich aller 36 Styles, beide fremden aktiven Korrekturen und die bereits veröffentlichten Treffer-/Serverkorrekturen. Das gesamte aktive App-Inventar wird während des Stagings erneut verglichen.
- Genau eine neue enge Sicherung: `pre-switch-backup/performance-followup-20261110-v1`. Kein zweites Vollbackup und keine Datenbankkopie.
- Neue Quittung: `performance-followup-20261110-receipt.json`. Existierende Sicherung oder Quittung verhindert eine ungeprüfte zweite Ausführung.

## Dateien für die Übertragung

| Datei | Bytes | SHA-256 |
|---|---:|---|
| `install-performance-followup.cjs` | 29452 | `9aa96ac7f9cbbdc3a66a19c26e42b6621959134f1eb60b6ebe77f1cf02ab63b3` |
| `install-performance-followup.cjs.gz` | 16208 | `964a211db4141d3c4df1695bdafd09c9590d579af517baaafcb69f122886a529` |

Der Installer enthält bereits die komprimierten, gepinnten Byte-Patches. `transfer-chunks.json` teilt seine Gzip-Datei in Base64-Stücke mit höchstens 2100 Zeichen und kumulativen SHA-256-Prüfsummen. Zuerst den zusammengebauten Gzip-Hash, anschließend nach Entpacken den Installerhash prüfen. Das Archiv enthält dieselben Dateien plus die fünf lesbaren Kandidatenquellen und Belege; sein äußerer Hash steht separat in `transfer-manifest.json`.

Alternativ enthält `transfer-upload-command.txt` genau ein Node-Kommando (22.845 Bytes): Gzip und entpackten Installer im festen privaten Verzeichnis exklusiv anlegen, vorhandene identische Dateien ohne Write akzeptieren, abweichende Dateien/Symlinks abweisen, beide vollständigen Hashes ausgeben. Es führt keinen Installer aus. Vier lokale gemappte Transferfälle bestanden, siehe `transfer-command-verification.json`.

Nach geprüfter Übertragung zum Beispiel unter `/var/www/vhosts/gravuru-designwerkstatt.de/private/install-performance-followup-20261110.cjs`:

```sh
node /var/www/vhosts/gravuru-designwerkstatt.de/private/install-performance-followup-20261110.cjs --check
```

Dieser erste Aufruf prüft ausschließlich; er schreibt keine Sicherung, Quelle oder Vorschau. Nur bei vollständigem Erfolg und eigener Veröffentlichung durch Root folgt derselbe Aufruf ohne `--check`. Dieses Paket wurde hier nicht auf dem Server ausgeführt.

## Veröffentlichungs- und Rückweg

Der Installer prüft Wrapper, vorherige Quittung, alle fünf Vorbedingungen, aktive Dateien und Vorschauartefakte. Danach sichert er vier vorherige Quellen, die ausdrückliche Abwesenheit des Helpers, HTML, Wrapper und alte Hashdateien. Er baut ausschließlich eine getrennte statische App-Kopie ohne Datenbanken, Umgebungsdateien, Kundenuploads oder Cache.

Neue Bundlebytes, entpackte Gzip-Inhalte und HTML müssen dem lokalen Build entsprechen. Ein gültiges vorhandenes Gzip mit anderem Betriebssystem-Header wird unverändert erhalten. Historische Hashdateien werden niemals verschoben oder gelöscht. Vor der Veröffentlichung werden aktive und gestagte Inventare nochmals geprüft. Der neue Helper wird zuerst und exklusiv erzeugt, ohne eine inzwischen vorhandene fremde Datei zu ersetzen. Erst danach folgen seine Importer und die übrigen Ersetzungen; HTML wird als letzter Einstiegspunkt atomar ersetzt. Der Installer schreibt eine Quittung, ändert aber weder Wrapper noch Berechtigungsregeln und führt keinen Neustart aus.

Bei Publikationsfehler stellt er altes HTML und die vier vorherigen Quellen wieder her. Erst danach wird der neu eingeführte Helper bei exakt passendem Kandidatenhash entfernt; die geprüfte Reihenfolge vermeidet damit das erkannte Importfenster beim Publizieren und Zurücknehmen. Alte und bereits ausgelegte neue Hashdateien bleiben für offene Sitzungen verfügbar. Eine spätere bewusste Rücknahme erfolgt aus genau dieser Sicherung mit Hashkontrolle; keine Produkt-/Bestell-/Datenbankrücknahme. Nach erfolgreicher Installation ist ein gezielter App-Neustart erforderlich, damit die neuen Servermodule aktiv werden.

## Tatsächliche Nachweise und offene Abnahme

`installer-verification.json`: neun lokale Prüfergebnisse mit echtem nativen Build grün, Linux-Festzielguard ausschließlich in einer isolierten Windows-VM-Fixture simuliert:

1. `--check` mit ausdrücklich gesperrten Dateisystem-Schreibmethoden.
2. Geänderte Vorherquelle abgewiesen.
3. Bereits vorhandener neuer Helper abgewiesen.
4. Geänderter geschützter Style abgewiesen.
5. Neuer Helper wird nachweislich vor jeder vorhandenen Quellersetzung publiziert.
6. Erfolg: exakt fünf Quellen, 36 Styles und alle alten Bündel erhalten; vorhandenes gültiges OS-Gzip unverändert.
7. Zweite Ausführung durch bestehende Sicherung/Quittung gesperrt.
8. Fehler beim atomaren HTML-Rename: alte Quellen/HTML wiederhergestellt, neuer Helper erst nach seinen Importern entfernt.
9. Fehler beim Schreiben der Quittung nach HTML: vollständige gleiche Rücknahme einschließlich geprüfter Importreihenfolge, Hashdateien erhalten.

Nativer kombinierter Build: Core `editor-b9827ca8587a6c7b.mjs`, 154 Module, 1.453.655 Bytes; HTML 374.704 Bytes, SHA `ddcdc1f39eabd95ea2d298d2940bc83f99df24b1fcf38b0cf8e7836c043d7993`. Unverändertes R15-Paket `editor-bf7d088b9bdf015e.mjs`. Alle drei Serverquellen verändern selbst keine Kundenbundlebytes; der neue Kernhash stammt ausschließlich vom Galerie-Patch.

Vorhandene Autorenbelege getrennt: Galerie 24/24 gezielte Fälle plus historische 12/12 lokale synthetische Browserfälle; Serveradapter 43 unterschiedliche funktionale/Host-/Bundlefälle. Der unabhängige Installerreview durch `module_backend` verlangte die oben beschriebene Helper-/Importer-Reihenfolge. Ausschließlich wegen dieser Korrektur wurde der enge Installerlauf gezielt um Reihenfolgeprüfungen erweitert und wiederholt. Abschließender unabhängiger Review des oben gepinnten Installers und Gzip sowie des neuen Reihenfolge-/Rollbackbelegs: kein verbleibender belegter Blocker für die gepinnte alte Baseline. Keine Testdopplung durch den Reviewer, keine aktuelle Liveabnahme. Die fünf Produktionsquellen und ihre Hashes änderten sich nicht.

Offen bleibt die reale Server-/Kundenabnahme nach einer späteren Installation: vollständiger Coreabruf einschließlich Gzip-Dekompression und SHA, unveränderte Host-/Origin-Sperren, frischer Produkteinstieg, Designwechsel/Fehler/Zurück und Ladezeiten. Der zuvor beobachtete äußere Übertragungsengpass ist durch dieses Paket noch nicht als gelöst bewiesen. Browser-Abbruch garantiert keinen Abbruch bereits laufenden serverseitigen Vorschau-Renderings.
