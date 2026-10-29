# Auftrag: Themen-Designs für alle Türschild-Formen (Edelstahl + Acryl) · 29.10.2026

> **Verbindlich seit 29.10.2026, 12:10: [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md).** Vorlage 1:1 oder starke Referenz, 1–3 Schriften aus allen 84 und variieren, Motiv bleibt (Text weicht), Anordnung frei statt automatisch mittig, Abnahme per Kontaktbogen 1:1 aus dem Konfi. Bei Widerspruch zu diesem Auftrag gilt der Master.

Von Claude (Operator) für die Design-KIs (Astra/Codex u. a.). Chris hat entschieden (29.10.):

- **Material:** Edelstahl-Türschilder **und** Acryl-Türschilder 3 mm, jeweils alle Formen und Größen der Linie.
- **Themen:**
  1. **Hochzeitsschilder** (z. B. „Mr & Mrs Müller · 12.06.2026“, Ringe, Herzen, Tauben)
  2. **Hundeschilder**, zwei Arten:
     - „Hier wohnen …“: Familie mit Hund, z. B. „Hier wohnen Anna, Tom & Bello“
     - „Achtung …“: z. B. „Achtung! Hier wache ich“, mit Hundenamen
  3. **Andenken ohne Foto** (z. B. „In liebevoller Erinnerung“, Name, Daten; kein Fotofeld)
  4. **Hinweisschilder allgemein** (z. B. „Bitte keine Werbung“, „Bitte klingeln“, „Privat“, Paketablage; Symbole + kurzer Text)
- **Menge je Thema:** **2 Hauptprodukte** und **20 Designs zur Auswahl**. Die 20 Designs sind im Konfigurator wählbar, und zwar auf allen Formen/Größen.
  - Lesart Claude: je Thema **und** Material 2 Hauptprodukte (= 16 Hauptprodukte), Chris bestätigt.
- **Motive:** aus der vorhandenen Bibliothek (~721 Motive) **plus neue Motive**. Neue Motive werden erst nach Chris' Freigabe in die Bibliothek aufgenommen.

## Wo und wie

- Repos: Code `gravuru-2027`, Katalog `gravuru-katalog.`. Branch `main` ist die Wahrheit.
- **Designs:** Katalog-Weg wie bisher. Ein Design wird über Design-Ziele auf mehrere Formen/Größen/Materialien eingepasst, siehe:
  - [`2026-10-24-paket-m-design-ziele.md`](2026-10-24-paket-m-design-ziele.md)
  - [`2026-10-24-paket-j-designs-einpassen.md`](2026-10-24-paket-j-designs-einpassen.md)
  - [`2026-10-24-paket-i-dashboard-startdesigns-astra.md`](2026-10-24-paket-i-dashboard-startdesigns-astra.md)
  - Import mit `scripts/katalog-import.mjs` und Schalter `--kunden-ux-20261028`, damit Preisregel und Kunden-UX stimmen.
- **Linien:** `edelstahl-tuerschilder` (Reihen u. a. Rechteck, abgerundete Ecken, Oval, Retro 1/2, Quadrat, Langformate) und `acryl-tuerschilder`. Formen/Größen aus `geometrie.json` der Linie nehmen, nichts erfinden.
- **Hauptprodukte:**
  - Nur als Shopify-Importdatei bzw. Entwurf vorbereiten: Titel, Beschreibung, Varianten, Bilder-Konzept. Die gravuru-Skills für Titel/Texte/Matrixify nutzen.
  - **Kein Upload**, kein Shopify-Schreibzugriff, keine Bindung. Das macht Chris bzw. Claude erst nach Freigabe.

## Gestaltungsregeln (aus der Konfi-Abnahme vom 28.10.)

- **Text:**
  - Jedes Textfeld bekommt einen sprechenden Namen („Vornamen“, „Nachname“, „Hundename“, „Datum“, „Spruch“), nie „Text 3“.
  - Ein zusammengehöriger langer Text gehört in **ein** Feld.
  - Höchstens 50 Zeichen pro Zeile, Mindestschrift 3 mm.
- **Motive:**
  - Motive liegen vollständig **innerhalb der Kontur** und des Sicherheitsrands, nie über Rand oder Rundung.
  - Edelstahl-Gravur: Linien ≥ 0,5 mm (V2A), sonst Warnung.
  - Acryl: Gravurwirkung weiß-matt beachten (Kontrast).
- **Preis:** Das Motiv der Vorlage ist im Preis enthalten. Weitere oder geänderte Motive kosten 1,69 €; in den Designs nichts daran ändern.
- **Andenken ohne Foto:** kein Fotofeld, ruhige Schriften, keine verspielten Motive.
- **Stil:** Ein Stil je Thema, gut lesbar für ältere Kunden. Keine Fremdmarken, keine geschützten Figuren oder Logos.
- **Neue Motive:**
  - Einfarbige SVG, gravur- und drucktauglich, natürlich wirkend (nicht „KI-typisch“), eigene Gestaltung.
  - Mit Schlagworten für die semantische Suche, z. B. Hochzeit: Ringe, Herz, Tauben, Sekt; Hund: Pfote, Knochen, Rassen-Silhouetten; Hinweis: Briefkasten, Paket, Klingel.
  - Erst als Vorschlagsliste mit Bildern an Chris, Aufnahme nach Freigabe.

## Aufteilung (Vorschlag, je KI ein eigener Branch)

| KI | Themen | Branch |
| --- | --- | --- |
| A | Hochzeit + Andenken ohne Foto | `dev/designs-hochzeit-andenken-20261029-<ki>` |
| B | Hundeschilder + Hinweisschilder | `dev/designs-hund-hinweis-20261029-<ki>` |
| C (optional) | neue Motive für alle vier Themen | `dev/motive-themen-20261029-<ki>` |

Keine zwei KIs am selben Thema. Gemeinsame Dateien (Motiv-Bibliothek, `STATUS.md`) nur ergänzen, nie umformatieren.

## Vorgehen

1. **Probe zuerst:**
   - Je Thema **5 Designs** auf **2 Formen** (z. B. Rechteck 120×80, Oval 90×60), Edelstahl und Acryl.
   - Bilder **1:1 im echten Konfigurator** (Desktop 1440 × 900 und iPhone 390 × 664), keine freien Skizzen.
   - Dazu die Liste der benötigten neuen Motive.
   - → Chris gibt frei.
2. Danach alle **20 Designs je Thema** auf allen Formen/Größen der beiden Linien. Import nur als Probelauf mit Bericht: Zähler je Form, Warnungen Kontur/Linienstärke/Schriftgröße.
3. Die 2 Hauptprodukte je Thema und Material als Importdatei mit Prüfbericht.
4. `STATUS.md` (Absatz oben), Bericht unter `docs/handoffs/`, signierte Commits, eigener Branch.

## Grenzen

- Nichts live: kein Import in die Live-Werkstatt, kein Shopify/Amazon/Plesk-Schreiben, keine Bereitstellung. Live nur mit Chris' ausdrücklichem Satz.
- Nichts löschen, keine Geheimnisse in Repo oder Chat.
- Fragen an Chris nur bei echten Entscheidungen, z. B. Texte, Motivauswahl, Freigabe der Probe.
