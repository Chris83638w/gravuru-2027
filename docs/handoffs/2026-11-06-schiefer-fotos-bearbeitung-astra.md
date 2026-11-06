# Schiefer: thematische Fotos und bearbeitbare Galerie

**Nachtrag:** Zwei kleine gelbe Sternmotive wurden beim ersten Farbscan übersehen. D2/Tabea und D4/Lara sind jetzt Druck. Aktuell 154 Gravur/26 Druck, davon 10/26 offen; neues Paket v4. [Verbindlicher Korrekturstand](2026-11-06-schiefer-gelbe-sterne-astra.md). Die folgenden Verfahrenszahlen beschreiben den vorherigen Stand.

Chris am 06.11.2026: Vorhandene Masken mit thematisch passenden Fotos füllen, farbige Vorlagen als Druck behandeln und Vorlagen bearbeiten können. Schiefer-only, Neue-Struktur-Originale, weiterhin eigene PR #180; kein Merge, Hostimport, Shopify-Schreibzugriff oder Livegang.

## Ergebnis

- Alle 180 Originale bleiben sichtbar. 144 Gravurdesigns sind für beide Größen vorbereitet, insgesamt 289 gültige Größenfassungen in 28 lokalen Gruppen. Keine fehlenden Fotofelder mehr; 12 Gravur- und 24 UV-Originale bleiben aus anderen Gründen unvollständig.
- Neun tatsächliche unsichtbare Originalmasken wiederhergestellt (D1, D2, D3, D10, D11, D22–D25). Keine neue Maskenform erfunden. Katalogfotos nach Thema eingesetzt und Herkunft/Dateihash/Maskenpfadhash protokolliert.
- Vier falsche Themenfotos ersetzt: D205 und D223 Katze, D217 Hund, D233 Kleintier. D12: leere weiße Kreisgrafik entfernt, die das schon vorhandene Babyfoto verdeckte; bestehendes Fotofeld und seine Maske erhalten. Vollständiger Plan: `scripts/data/slate-photo-plan-20261106.json`.
- Alle 180 unveränderten Originalvorschauen farblich geprüft: fünf sichtbar farbige Treffer (GTUV D6–D9, D11), alle bereits UV. Kein nachgewiesener farbiger Gravurtreffer in diesem Paket. Das ist ein unterstützender Bildscan, kein Beweis dafür, dass jedes monochrome Bild eine Gravur ist. Keine Verfahrensmetadaten ohne belegte Zuordnung geändert. Galerie kennzeichnet UV ausdrücklich als **UV-Druck** und bietet einen Verfahrensfilter. Konkrete weitere von Chris gemeinte Fehlzuordnungen sind ohne IDs noch offen.
- Galerie zeigt Original und die beiden aktuellen gespeicherten Entwürfe. „Bearbeiten“ öffnet genau die angeklickte Größe und Design-ID im vorhandenen Werkstatteditor. Text, Motiv, Position, Größe und Beispielfoto sind bearbeitbar. „Änderungen speichern“ erzeugt eine lokale Revision; erneutes Öffnen der Galerie zeigt diese Revision. Keine festgehaltene alte Revisionsnummer in Vorschaulinks.

## Bedienung und Speicherort

Lokaler Einstieg: **http://127.0.0.1:8996/originale/**. Nach Designnummer/Thema suchen, gewünschte Größe bearbeiten, Element auswählen, ändern und speichern. Foto: links das Fotoelement wählen, rechts **Bild ersetzen**. **Zur Vorlagengalerie** führt zurück.

Änderungen gelten für die gewählte Größe. Die zweite Größe wird nicht automatisch überschrieben. Speicherung ist keine Bild- oder Livefreigabe. Chris' Einzel-OKs werden weiterhin im [Abnahmeregister](../reviews/2026-11-06-schiefer-einzelabnahme/abnahme.json) erfasst: 180 IDs, 0 Freigaben, aktuelle ID D250. Ausgangshashes auf Paket v3 aktualisiert. Nach Editoränderungen müssen die tatsächlich gespeicherten Entwürfe und Ressourcen vor dem OK erneut exportiert und gehasht werden.

Alle lokalen Pfade relativ zu `C:/Users/Christopher Koch/Documents/ChatGPT/Shopify Import/`:

- Code: `work/gravuru-schiefer-originale`, Branch `dev/astra-schiefer-originale-20261105`.
- Unveränderte Quelle: `work/gravuru-schiefer-originalquellen`, Katalog `dc0a0f6c2d59a93cbe2727709e0657e5d1697b06`.
- Vorbereitungsdaten: `work/slate-original-preparation-v3`.
- Geprüftes Ausgangspaket: `work/slate-original-package-v3-final` (1.884 Dateien im Prüfsummenmanifest, 118 Ressourcen, 41 Schriften).
- Bearbeitbare lokale Daten: `work/slate-original-review-v3/workshop.sqlite` und `design-assets.sqlite`, Zuordnung in `local-review-import.json`. Diese Datenbanken enthalten spätere Änderungen; das Ausgangspaket bleibt unverändert. Vor einer späteren Übernahme neu exportieren/prüfen, nicht blind das Ausgangspaket verwenden.
- Paketmanifest SHA256: `8dd3466f7aeba8f083ca0cd250ea72d10286573f53f9af4b7cfb485a0f53f216`.

## Prüfungen

[Belege und Browserbilder](../reviews/2026-11-06-schiefer-fotos-bearbeitung/): 617 Originaldateien bytegleich; 144 Größenpaare mit 867 Objekten proportional geprüft (70 %, 5 mm horizontaler Rand, Toleranz 0,002 mm); 28 Dokumente vollständig zurückgelesen. Alle 1.884 Paketdateihashes geprüft. Native Datenmodellvalidierung und Ressourcenvalidierung bei Import bestanden.

Vier Python-Adaptertests bestanden. 47 gezielte Node-Tests erfolgreich, aufgeteilt in Erstlauf (45 bestanden, zwei Umgebungsfehler: lokales HTTP und Python-Aufruf) und erfolgreichen Nachlauf der beiden betroffenen Dateien (4 Tests). Python-Test verwendet jetzt `GRAVURU_PYTHON` mit bisherigem `python3` als Rückfall. Browserprüfung fand zusätzlich die fehlende HTTP-Freigabe für das neue Editor-Link-Modul; korrigiert und durch den vorhandenen HTTP-Integrationstest abgesichert (erneuter Lauf 1/1). Kein neuer vollständiger Linux-Gesamtlauf.

Echter Chrome-Browser: Nichtstandarddesign D2 direkt geöffnet (Standard bleibt D1), Text geändert/gespeichert/neu geladen, Originaltext wiederhergestellt; Foto über Dateiauswahl ersetzt/gespeichert/neu geladen. Originalmaske und Geometrie per Datenvergleich identisch. Teständerungen anschließend exakt auf den vorherigen Dokumentstand zurückgesetzt (Revision 5). D12-Babyfoto sowie D205-Katze in beiden Größen visuell bestätigt. Druckfilter zeigt 24 Vorlagen. Keine Bildfreigabe dadurch erteilt.

## Reproduktion

Aus dem Codeordner; vorhandene Umgebung mit Python, CairoSVG und Schriftwerkzeugen verwenden:

```powershell
& $env:GRAVURU_PYTHON scripts/prepare-slate-original-source.py --katalog ../gravuru-schiefer-originalquellen --out ../slate-original-preparation-v3 --replacements scripts/data/slate-original-font-replacements-20261105.json --photo-plan scripts/data/slate-photo-plan-20261106.json
node scripts/prepare-slate-originals.mjs --katalog ../gravuru-schiefer-originalquellen --out ../slate-original-preparation-v3 --reuse-fonts-from ../slate-original-preparation
node scripts/finalize-slate-original-groups.mjs --katalog ../gravuru-schiefer-originalquellen --data ../slate-original-preparation-v3
node scripts/audit-slate-originals.mjs --katalog ../gravuru-schiefer-originalquellen --data ../slate-original-preparation-v3
node scripts/package-slate-originals.mjs --data ../slate-original-preparation-v3 --out <neuer-Paketordner>
node scripts/load-slate-original-review.mjs --package <neuer-Paketordner> --out <neuer-Pruefordner>
node scripts/serve-slate-review.mjs --data <Pruefordner> --gallery <Paketordner> --port 8996
```

Font-Wiederverwendung prüft denselben Katalogcommit. Ausgangspaket und neue lokale Prüfung nicht über bereits bearbeitete Daten legen. Der Server bindet ausschließlich 127.0.0.1. Die Galerie kann nur Original-Bilddateien lesend ausliefern; Speichern verwendet die bestehenden Werkstatt-APIs mit CSRF und Revisionsprüfung.

## Offen / nächster Schritt

12 Gravurdesigns: fehlende Schrift/Zeichen (D97 sowie Sternenkinder D2/D4) oder Text außerhalb der Gestaltungsfläche (D79, D80, D83, D84, D203, D227, D264, D271 sowie Sternenkinder D3 nur 30×20). 24 UV-Originale: bearbeitbare Originalebenen bzw. referenzierte Quelldateien fehlen. Keine Ersatzrekonstruktion aus flachen Vorschaubildern als fertige Vorlage ausgegeben.

Chris kann jetzt die Vorlagen bearbeiten und im Chat nacheinander beurteilen. Erst die konkret freigegebenen, aktuellen Größenfassungen mit den bestehenden Produktbindungen übernehmen; gemeinsame Codeübernahme weiterhin ausschließlich über Astra #139, Live nur mit Chris' ausdrücklichem Satz.
