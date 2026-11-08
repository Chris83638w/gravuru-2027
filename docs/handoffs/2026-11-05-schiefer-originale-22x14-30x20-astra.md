# Schiefer-Gedenktafeln: Originale 22 × 14 / 30 × 20

Auftrag Chris: alle passenden Gedenktafeln aus der **Neuen Struktur** für beide Größen unverändert und bearbeitbar vorbereiten, ausschließlich per Skript. Im Chat am 05.11.2026 ausdrücklich bestätigt: **„Dokumentierte Ersatzschriften verwenden“**. Eigener Branch `dev/astra-schiefer-originale-20261105`, gestapelt auf #175 (`6dd0361c`). Kein main-Merge, Hostimport, Shopify-Schreibzugriff oder Livegang.

## Ergebnis und Grenzen

**180 Originale** aus `designs/bestand/gedenktafeln` gefunden: 156 Gravur, 24 UV. **135 Gravurdesigns sind in beiden Größen technisch vorbereitet**, zusätzlich eine gültige 22×14-Fassung von GTSK-D3: **271 Größenfassungen**. 28 lokale Prüfgruppen, 38 Glyphenressourcen und 102 unveränderliche Foto-/Maskenressourcen. Die Gruppen folgen der Katalogkategorie; allgemeine Tiergedenkvorlagen werden nicht eigenmächtig zu Hundedesigns umbenannt.

**21 Gravurdesigns und alle 24 UV-Originale bleiben offen. Das Gesamtpaket ist deshalb nicht als vollständig einsatzfertiger oder freigegebener Katalog zu behandeln.** Die Galerie zeigt jedes Original und die verfügbaren Größenfassungen; `OFFENE-ORIGINALE.json` enthält konkrete IDs, Ursachen und fehlende Dateien.

| Befund | Originale |
|---|---|
| Als „mit Foto“ geführt, aber kein definierter Original-Fotobereich in der Quelle | GT-S-30x20-D1, D2, D3, D10, D11, D22, D23, D24, D25 |
| Schrift/Glyphe fehlt auch nach dokumentiertem Ersatz | GT-S-30x20-D97 (`†` in Minimalist); GTSK-S-30x20-D2 (Segoe UI Emoji); GTSK-S-30x20-D4 (bangkar, Segoe UI Emoji) |
| Text verlässt die Fläche; unveränderte Quelle bzw. Ersatzschrift passt bei erhaltenem Anker nicht | GT-S-30x20-D79, D80, D83, D84, D203, D227, D264, D271; GTSK-S-30x20-D3 nur bei 30×20 |
| UV: fehlende Bild-/Maskendateien oder nur flache Vorschau ohne bearbeitbare Ebenen | alle 24 GTUV-S-30x20-Originale im Manifest |

18 Originale tragen zusätzlich historische Sichtprüfungshinweise aus Claudes abgeleiteten Reihen. Diese Hinweise sind als `catalogueReview` übernommen, nicht als erledigt erklärt. Neun davon sind technisch vorbereitet (D12, D211, D213, D215, D220, D224, D231, D234, D236), bleiben aber wie alle Designs ohne neue Designfreigabe. D220 verwendet hier nachweislich die saubere `foto-1.jpg` aus dem Rohbestand; kein eingebrannter Upload-Aufdruck.

## Maßgebliche Quellen und fachliche Regeln

- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md): Originalmotive erhalten, keine Verzerrung, Vergleich mit echter Konfi-Darstellung, Bilder zur Abnahme.
- Katalog #181, Commit `dc0a0f6c2d59a93cbe2727709e0657e5d1697b06`, unverändert gelesen. Tatsächliche Rohoriginale aus `designs/bestand/gedenktafeln`, keine Wiederverwendung der früher gezeigten D1000-Referenzdesigns.
- Fontzuordnungen aus `schriften/ersatz-gedenktafeln-22x14.json`, `schriften/schriften.json#replacements` und dokumentierten `fontOriginal`-Zuordnungen der Katalogreihen; eingefrorene Tabelle in `scripts/data/slate-original-font-replacements-20261105.json`. Keine frei erfundenen Schriftzuordnungen. 68 Originale erhalten echte Ersatzschriften; reine Namens-/Großschreibungs-Aliasse zählen dabei nicht als neuer Schriftschnitt.
- [Claude #85 / 6658238343](https://github.com/Chris83638w/gravuru-2027/issues/85#issuecomment-6658238343): Neue Struktur vor Bestseller. `katalog.prio=1` bleibt bei Import und Skalierung erhalten; Galerie und Werkstatt sortieren entsprechend innerhalb der bestehenden Themenfilter.
- Größen und Produktoptionen aus der bestehenden Schiefer-Familie. Originalmaster 300×200 mm; 220×140 mm durch Faktor 0,7, horizontal 5 mm Rand je Seite. Keine Streckung auf abweichendes Seitenverhältnis, keine Änderung von Preisen oder Bohrbildern.

Die direkte UNC-Quelle war lokal nicht erreichbar. Der zusätzlich geprüfte CDR-Connector bietet nur übertragene Kopien und führt aktuell ausschließlich `Türschilder` im Produktwurzelordner; keine Gedenktafel-Original-CDRs für die offenen Fälle. Er ersetzt keine aktuelle Vollkopie der Neuen Struktur.

## Technische Vorbereitung

Alle 617 Originaldateien werden bytegleich mit SHA-256 gesichert. Der Adapter entfernt nur technische Platten-/Uploadhinweise, erhält Originalbilder und echte Fotomasken und überführt reine Vektorformen, die historisch fälschlich `foto` heißen, wieder in Vektorobjekte. Lange Textfelder werden an vorhandenen Zeilengrenzen geteilt. Vor-/Nachname können getrennte Felder bleiben; die Zuordnung nutzt die Originalschriftgröße, nicht die Größe einer Ersatzschrift.

Bei genehmigtem Schriftersatz wird die Schriftgröße an die im Corel-Export gespeicherte Textbreite angepasst. Anker und Zeilenbaselines bleiben erhalten. Ursprünglich außerhalb des SVG-Plattenfensters liegende, unsichtbare Motivteile werden an exakt diesem Fenster beschnitten, ohne sichtbare Motive zu verschieben. Exakte Kurvenhüllflächen ersetzen konservative Kontrollpunktkästen. Die Rechteckprüfung von Texten berücksichtigt nun die tatsächlichen Buchstabenpfade, wenn nur der nominelle Textkasten übersteht; tatsächlich überstehende Buchstaben bleiben gesperrt.

Native Dokumente behalten `released:false`. Der separate lokale Paketlader prüft Dateihashes, importiert Originalressourcen, validiert Dokumente, liest sie vollständig zurück und wiederholt den Import ohne neue IDs oder Revisionen. Er enthält keine Shopify-/Host-Schreibroute. Datenbanken werden nicht ins Repository aufgenommen.

## Prüfung

- 44/44 gezielte Galerie-, Import-, Schriftkontur- und Skalierungsprüfungen.
- 66/66 Werkstatt-/Dashboard-Prüfungen. Der erste eingeschränkte Windows-Lauf hatte vier Dateiumgebungsfehler; der nachfolgende vollständige Lauf mit erlaubten temporären Dateiumbenennungen war grün.
- 3/3 Python-Adaptertests: unveränderte innenliegende Pfade, korrekter Ausschnitt ohne Verschiebung, Originalfoto und Textanker erhalten.
- Audit: 617/617 Originaldateien stimmen mit dem gepinnten Katalog überein; 135 Designpaare mit 816 Objekten entsprechen Faktor 0,7 + [5,0] mm (Prüftoleranz 0,002 mm); 28 lokale Entwurfsdokumente vollständig zurückgelesen.
- Paketimport: 28 Prüfgruppen, 102 Ressourcen; Wiederholung **0 neue Gruppen**. Kein Produkt veröffentlicht.
- 6 echte Browserprüfungen: 22×14 und 30×20 je Desktop/Handy, Designwechsel, Namensänderung, unveränderte Vorlage; zusätzlich D220 mit Originalfoto/-maske in beiden Größen. Keine JavaScript-Fehler. Keine Warenkorb-/Bestellfreigabe behauptet.
- 30 Kontaktbögen: jeweils Katalogoriginal, native Vorschau 30×20 und 22×14. Fotomasken und Bilder sind für die Offline-Vorschau vollständig eingebettet; Uploadhinweise bleiben in der interaktiven Oberfläche.

Belege unter [reviews/2026-11-05-schiefer-originale](../reviews/2026-11-05-schiefer-originale). Das vollständige lokale Paket enthält `galerie.html`, Originale, native Vorlagen, Originalfoto-/Maskenquellen, Schriftpfade, Prüfsummen und die offene Liste.

## Reproduktion

Node 24, Python mit fontTools/picosvg sowie den vorhandenen Import-Abhängigkeiten; `GRAVURU_PYTHON` auf den eingerichteten Python-Laufzeitpfad setzen. Katalog an obigen Commit binden. Neues Ausgabeverzeichnis verwenden.

```text
python scripts/prepare-slate-original-source.py --katalog <Katalog> --out <Vorbereitung> --replacements scripts/data/slate-original-font-replacements-20261105.json
node scripts/prepare-slate-originals.mjs --katalog <Katalog> --out <Vorbereitung>
node scripts/finalize-slate-original-groups.mjs --katalog <Katalog> --data <Vorbereitung>
node scripts/audit-slate-originals.mjs --katalog <Katalog> --data <Vorbereitung>
node scripts/package-slate-originals.mjs --data <Vorbereitung> --out <Paket>
node scripts/load-slate-original-review.mjs --package <Paket> --out <lokale-Prüfung>
node scripts/serve-slate-review.mjs --data <lokale-Prüfung> --port 8983
node scripts/review-slate-originals.cjs --package <Paket> --url http://127.0.0.1:8983 --import <lokale-Prüfung>/local-review-import.json
```

Nächster Schritt: Quellenkorrektur der 45 offenen Originale durch Claude anhand der konkreten Liste; danach identischen Lauf wiederholen. Bestehende Sichtprüfungshinweise und neue Konfi-Vergleiche von Chris abnehmen lassen. Erst anschließend separat freigegebene Katalogziele mit den vorhandenen Produktbindungen verbinden. Main-Merge bleibt beim zuständigen Astra-Chat; Live nur nach Chris' ausdrücklichem Satz.
