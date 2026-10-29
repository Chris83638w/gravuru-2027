# Auftrag: Alle Türschilder (Edelstahl + Acryl) an den neuen Konfigurator anbinden · 29.10.2026

Von Claude (Operator). Chris hat am 29.10. entschieden, dass dieser Auftrag geschrieben wird.

## Ausgangslage (gelesen am 29.10., nur lesend)

- **Shopify:** gut 30 aktive Acryl-Türschilder und über 50 aktive Edelstahl-Türschilder.
- **Konfi-Start:** Nur **eines** ist mit dem neuen Konfigurator verbunden: D8 „Türschild Abger. Ecken V2A personalisiert – Leuchtturm 12×8 cm“.
  - D8 hat Produkt `16077798965628`, Metafelder `custom.customization_id`/`custom.design_sha256` und den Start-Block `#gravuru-konfi`.
  - Alle anderen Türschild-Produktseiten zeigen **keinen** „Jetzt personalisieren“-Start, z. B. `tuerschild-oval-acrylglas-personalisiert-herz-9x6` und `tuerschild-acrylglas-personalisiert-9x3`.
- **Folge:** Die neue Galerie „Designs aller Formen und Größen“ (PR #42) und die geplanten Themen-Designs ([`2026-10-29-designs-themen-auftrag.md`](https://github.com/Chris83638w/gravuru-2027/blob/dev/designs-themen-20261029-claude/docs/handoffs/2026-10-29-designs-themen-auftrag.md)) wirken im Shop erst, wenn diese Produkte gebunden sind.

## Ziel

Jede Türschild-Variante beider Linien (`edelstahl-tuerschilder`, `acryl-tuerschilder`) ist an einen festen Konfi-Produktstand gebunden. Dabei:

- Shopify-Produkt + Variante → Konfi-Produkt mit Revision; Preis und Optionen stimmen.
- Die Produktseite zeigt den Start „Jetzt personalisieren“ wie bei D8.
- Der Produktstand wird mit der Kunden-UX vom 28.10. erzeugt:
  - `scripts/katalog-import.mjs --kunden-ux-20261028`;
  - Preisregel „Vorlagenmotiv inklusive, weiteres/geändertes Motiv 1,69 €“;
  - Designs aller Formen/Größen;
  - 50 Zeichen je Zeile.

## Vorhandene Wege nutzen (nichts neu erfinden)

- `scripts/SHOP-SYNC.txt`:
  - `shop-export.mjs` (Shopify → Dateien),
  - `shop-sync.mjs` (Katalog-Soll ↔ Export → Plan),
  - `shop-bind.mjs` (Variante → Konfi-Produkt → Prüfung/Aktivierung).
- [`2026-10-22-universelle-konfigurator-anbindung.md`](2026-10-22-universelle-konfigurator-anbindung.md): Kette Shop → Bindung → cfg-Revision → Entwurf → Prüfstand → Warenkorb → Fertigung.
- Funkklingel-Vorbild für große Mengen:
  - [`2026-10-27-funkklingeln-binding-batches.md`](2026-10-27-funkklingeln-binding-batches.md),
  - `doorbell-pilot-bind.mjs` (erst Pilot, dann Rest).
- Wie D8 den Start-Block bekommt (Theme-Abschnitt, Metafelder): **nur lesen und dokumentieren**, nichts am Theme ändern.

## Vorgehen

1. **Bestand (Probelauf, nur lesen):**
   - Alle Türschild-Produkte/-Varianten beider Linien mit Titel, Handle, SKU, Preis und Optionen.
   - Abgleich gegen den Katalog: Form/Größe in `geometrie.json`, Familie, Preisliste.
   - Ergebnis je Variante: *passt / offen (Grund) / fehlt im Katalog / fehlt im Shop*.
2. **Plan:**
   - Je Variante das Ziel-Konfi-Produkt (stabile ID nach `SHOP-SYNC.txt`), Revision, Preis und Bindungsart.
   - Was die Produktseite für den Start braucht.
   - Was beim Motivaufpreis 1,69 € an Preisvertrag fehlt; mit Astras D8-Probelauf abgleichen, nicht doppelt bauen.
3. **Pilot (erst nach Chris' Satz):** 3 Produkte, z. B. ein Edelstahl-Rechteck, ein Edelstahl-Oval und ein Acryl-Retro.
   - Import, Bindung, Start-Block.
   - Prüfung 1:1 im Live-Shop: Konfi öffnet, Preis, Warenkorb mit Bild; Desktop und iPhone.
4. **Rest** in Paketen mit Bericht, ebenfalls jeweils erst nach Chris' Satz.

## Mitprüfen: Handles passen nicht zum Titel

Bei mehreren Produkten passt der Shopify-Handle nicht zum Titel, zum Beispiel:

| Titel | Handle |
| --- | --- |
| Türschild Abgerundete Ecken Acrylglas – **Katze** 8×5 cm | `…-hund-silhouette-8x5` |
| Türschild Retro Typ II Acrylglas personalisiert – **Rose** 9×6 cm | `…-katze-9x6` |
| Türschild Acrylglas personalisiert – **Fisch-Icon** 8×2 cm | `…-schmetterling-8x2` |
| Türschild Acrylglas personalisiert – **Rose** 8×3,5 cm | `…-pusteblume-8x35` |
| Türschild Oval Acrylglas – **Herz-Ranke** 15×8 cm | `…-vogelsilhouetten-15x8` |
| Türschild Quadrat Acrylglas – **Hundekopf-Icon** 8×8 cm | `…-schmetterling-8x8` |

- Bitte alle Türschilder beider Linien so prüfen: Titel ↔ Handle ↔ Motiv im Produktbild ↔ Konfi-Design.
- Liste mit Vorschlag. Bei Handle-Änderungen immer mit 301-Weiterleitung, sonst gehen SEO und Links verloren.
- **Nichts ändern** ohne Chris' Freigabe.

## Ergebnis

- `docs/handoffs/2026-10-29-tuerschilder-anbindung-bericht.md`: Zähler, Tabellen, offene Punkte, Pilotvorschlag mit konkreten Befehlen und Rückweg.
- Daten (Export, Plan) nur ohne Kundendaten und ohne Geheimnisse im Repo; große Exporte nur mit Pfad und Prüfsumme.
- Eigener Branch `dev/tuerschilder-anbindung-20261029-<ki>`, signierte Commits, Absatz oben in `STATUS.md`.

## Grenzen

- Nur lesen bis zum Pilot: kein Shopify-Schreiben, kein Theme, kein Live-Import, keine Bindung, keine Bereitstellung.
- Live ausschließlich nach Chris' ausdrücklichem Satz.
- Nichts löschen. Keine Geheimnisse in Repo, Chat oder Logs.
- Nicht mit dem Zoom-/Galerie-Auftrag (Astra 1, PR #42/#43) und dem Themen-Design-Auftrag in dieselben Dateien schreiben; gemeinsame Dateien nur ergänzen.
