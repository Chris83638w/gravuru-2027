# Originalfotos in der Galerie · 07.11.2026

Der lokale Fix zeigt vorhandene Katalogfotos mit ihren tatsächlichen Bildwerten. Er ersetzt keine Fotos und verändert weder Masken noch Produktionsdateien. Grundlage: Entscheidungsregister 1.21 (Graustufen-Vorgabe nur für echte Kunden-Uploads, nicht für Katalog-PNGs) sowie der aktuelle Wunsch, vorhandene echte Bilder gemeinsam als wiederverwendbare Auswahl zu beurteilen.

## Ursache und Änderung

Bei Schiefer wurde ein Katalogfoto bisher zusätzlich entsättigt und mit `mix-blend-mode:lighten` auf die Materialfläche gelegt. Bei freier Außenkontur wurde zusätzlich die gesamte Gestaltung aufgehellt. Für jeden Farbkanal bleibt dabei der größere Wert aus Foto und Hintergrund stehen: Dunkles Fell unterhalb der Schieferhelligkeit geht dadurch in der Platte verloren. Das ist eine Darstellungsursache, keine fehlende Originalmaske.

- `app/workshop/product-preview.mjs`: vorhandene Beispielassets ohne zusätzlichen Farb-/Blend-Effekt anzeigen.
- `app/platform/sources/app/shared/models/studio-svg.mjs`: nur tatsächliche Originalfoto-Vorschauen umgehen mit `originalPhotoPreview` die konturweite Mischung. Der bisherige Standardpfad bleibt unverändert.
- `app/configurator/variant-m/adapter.mjs`: Katalogfotos im Editor und in Designkacheln ebenfalls ohne den zusätzlichen Effekt.
- `gallery-workbench.mjs`: Katalogfotos ohne Bearbeitungsmetadaten als Original öffnen. Bereits gespeicherte Foto-Farbe, Bearbeitungsquelle, Zuschnitt und Asset-ID bleiben erhalten.
- `ux.mjs`: die zusätzliche Galerie-Sondermischung entfällt; explizite Nutzer-Farbeinstellungen bleiben wirksam. Die normale Kundenfotodarstellung bleibt unverändert.

Schwarze Hintergründe und bereits vorhandene Graustufen gehören bei mehreren Bildern zur Originaldatei. Sie bleiben sichtbar. Eine Freistellung, Aufhellung oder neue Ausschnittwahl wäre eine gesonderte Bearbeitung und wurde nicht vorgenommen.

## Belegte Quellenbefunde

| Original | Befund |
| --- | --- |
| D217 | Die ursprüngliche JPG-Datei im Ordner `Tiere/Hund` zeigt eine Katze. Der vorhandene Fotoplan vom 06.11. setzt bereits das Hundefoto aus D220 ein; diese Zuordnung wurde nicht erneut verändert. |
| D220 / D230 / D232 | Die Original-JPGs enthalten dunkle, erkennbare Fellzeichnung. D230 und D232 sind echte Hundeaufnahmen. Alle drei bereits in Graustufen; keine neue Entsättigung erforderlich. |
| D13, Sternenkinder | `foto-1.jpg` ist visuell nahezu vollständig schwarz, ohne nutzbares Fotomotiv. Als ungeeignete Quelle aufgeführt; kein neuer Ersatz automatisch zugeordnet. |

## Fotoauswahl zur gemeinsamen Entscheidung

[existing-original-photo-selection.json](existing-original-photo-selection.json) enthält **15 Kandidaten aus 6 Zielgruppen**: Hunde 4, Menschen 4, Katzen 3, Kleintiere 1, Pferde 1, Sternenkinder 2. Es ist eine gezielte Auswahl, kein vollständiges Fotoinventar. Jede Datei hat ID, Herkunftspfad, SHA-256, Pixelmaße, Sichtprüfungsnotiz und Auswahlstatus. Die Bilddateien aller 15 Kandidaten sowie die ausgeschlossene D13-Datei stimmen bytegenau mit dem Git-Blob des gepinnten Katalogstands `dc0a0f6c2d59a93cbe2727709e0657e5d1697b06` überein.

Eine lokale Auswahlseite mit den unveränderten eingebetteten Bildbytes liegt außerhalb Git unter `work/gallery-photo-proof-20261107/original-photo-selection.html`. Bei PNGs mit sichtbaren Tonwertstufen oder Randresten ist dies ausdrücklich vermerkt. Die Katalogherkunft belegt hier keine eigenständige Urheber-/Nutzungsfreigabe; diese wird nicht erfunden. Es wurde kein Kandidat neu in die Galerie importiert oder global zugewiesen.

## Prüfung und Grenzen

- **50 Tests bestanden:** `catalogue-photo-preview.test.mjs` (3), `gallery-workbench.test.mjs` (4), `katalog-photo-assets.test.mjs` (7), `image-processing.test.mjs` (8), `ui-event-regressions.test.mjs` (24), `photo-color-export.test.mjs` (4). Darunter echte PNG-Ausgabe mit Originalfarbe, Graustufen und erhaltenem Alpha sowie erneutes Öffnen gespeicherter bearbeiteter Fotos ohne Asset-Ersatz.
- [original-photo-render-proof.json](original-photo-render-proof.json): D217, D230 und D232 aus demselben unveränderten Paket vor/nach dem Fix gerendert. Exakt die Blend-/Grayscale-Dekoration entfällt. Sämtliche Bild-/Masken-URLs sind bytegleich; der Quelldokumenthash ist gleich. Die sechs nativen SVGs liegen unter `work/gallery-photo-proof-20261107/` mit `-before.svg` bzw. `-after.svg`.
- [customer-photo-preservation.json](customer-photo-preservation.json): **14 direkte Vorher-/Nachher-Vergleiche** gegen den bisherigen Codecommit `6b799d9a79c789d097c970c6283cd4369d02f97b` sind bytegleich. Abgedeckt: native Schiefer-/Acryl-Gravur und Druck, mit/ohne Vorschaucallback; echter Kundeneditor mit Original/Graustufen/Sepia, jeweils unbearbeitet und bereits bearbeitet.
- Quellenbilder lokal visuell geprüft. Eine sichtbare Browserabnahme der geänderten Galerie erfolgt separat durch den Hauptagenten. Dieser Nachweis behauptet weder eine neue Produktionsfreigabe noch eine Host-Aktivierung.

Die Vorschau hat sich absichtlich verändert. Bestehende Renderer-Fingerprints werden durch die vorhandene Implementierungssignatur neu berechnet; keine Freigabe wird durch diesen Fix erweitert oder übertragen. Keine Datenbank-, Host-, Merge- oder Commit-Aktion in diesem Teilauftrag.
