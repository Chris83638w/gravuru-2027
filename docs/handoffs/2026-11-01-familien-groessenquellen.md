# Größenlücken und lokale Prüfvorlagen · 01.11.2026 · Codex/Astra

Auftrag: Chris im Funkklingel-Chat „ausführen“ zur neuen Claude-Nachricht. Quelle ist [Issue 48, Quellenantwort](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6557254364). Isolierter Folgebranch `dev/familien-groessenquellen-20261101-astra`, ursprünglich auf PR #102 (`9ffc27f`), dessen Branch unverändert bleibt. Nach Claudes Zusammenführung der Kette folgt dieser PR auf Code-main `b3b0886`. Der [aktuelle Fokus](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6557485638) ist ausschließlich Edelstahl-Türschilder: Größenlücken, 15 Prüffälle, Sichtvorschau. Keine weitere Acryl-Arbeit, kein Merge oder Live-Schritt; Claude prüft und übernimmt.

## Fachliche Regeln vor Umsetzung

- [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) und Katalog-README Ebene 3: derselbe Master, dieselbe Form und Formatreihe; bestehende Toleranz von 1 % beim Seitenverhältnis. Native proportionale Übertragung, keine neuen Designs, Schriften, Motive oder Platten.
- Lokale Prüfvorschau darf fehlende Größen derselben Reihe zeigen; Kennzeichnung „übertragen, noch nicht geprüft“. Nur vorhandene explizite Familienziele; Freigaben unverändert.
- Renderbare geometrisch beanstandete Vorlagen lokal sichtbar, Kennzeichnung „prüfen“ plus Grund. Kundenauslieferung und deren Prüfung unverändert streng.
- Katalog separat: nur fehlende `design.json.sizes` nach erfolgreicher vorhandener Passprüfung ergänzen. Nicht passende Größen bleiben weg und werden mit Grund aufgeführt. Bestehende Daten und Freigaben werden nicht ersetzt.
- Die 15 ursprünglichen Edelstahl-Ausschlüsse aus PR #102 werden vollständig mit Design-ID/Größe/Grund aufgeführt. Deren Vorlage wird nicht still korrigiert.

## Ergebnis und Prüfung

Quelle: Katalog-main `20dc4bef667f96008e3ca4c56e86b475b9fa5cc9`, in einer eigenen lokalen Prüfkopie ergänzt um Rund aus `62404b12d429b439e0f8738d6bc81b23e15bd25d`. Der Katalog-PR selbst enthält keine Rund-Dateien aus dem anderen PR.

- **792 Vorlagen** in der lokalen Edelstahl-Prüfgalerie: **80/80 Größen** belegt. Keine blockierte Größe und keine fehlende Schrift. Insgesamt 2.776 zusätzliche lokale Zuordnungen, ausdrücklich „übertragen, noch nicht geprüft“.
- Die 15 ursprünglichen Edelstahl-Prüffälle sind vollständig sichtbar, zusätzlich 56 geometrische Auffälligkeiten aus der Größenerweiterung: insgesamt 71 Prüffälle. Kein Motiv ersetzt oder entfernt. Gründe je Variante in [coverage.json](assets/2026-11-01-familien-groessenquellen/coverage.json).
- Lokale Erweiterung erfordert ausdrücklich `--pruefvorlagen --groessen-erweitern --beanstandete-anzeigen`. Ohne Prüfmodus werden die neuen Optionen abgewiesen. Normale Planung und Kundenauslieferung bleiben unverändert; Produktbindung weiter `local-review`, `orderEnabled:false`. Master-Fontgrenzen, Preislogik und Bestellprüfung nicht gelockert. Über 100 mm skalierte Texte werden ausschließlich als lokale Prüfvorlage über den bestehenden nativen Größenprojektor dargestellt.
- **42/42 gezielte Tests auch auf Code-main `b3b0886`** bestanden (Familienformate, Planung, Zielzuordnung), darunter unveränderte strenge Planung, gleiche Form/Proportion, Nichtmutation der Quellen, geometrisch beanstandete lokale Vorlage und Schrift >100 mm. Build erfolgreich, Bundle `editor-ead16d68808c771f.mjs`. Kein Linux-Vollauf dieses Folgepakets behauptet; Claude übernimmt den unabhängigen Gegencheck.
- Erneuter vollständiger Edelstahl-Plan mit der finalen Implementierung ergibt byteinhaltlich dieselbe Konfiguration wie die Browserprüfung. Die vollständige Konfiguration und Schriftressourcen bleiben lokal, ihr Hash steht im Nachweis.
- Chrome: Retro 1 auf vorher unbelegtes 12×8 gewechselt, Galerie zeigt neue Statusangaben und tatsächlichen Konturfehler; Rechteck 45×30 zeigt die beiden ursprünglichen Schriftgrößenfälle. 390×844 px: lesbarer Umbruch, Dokumentbreite und Scrollbreite beide 390 px. Kein echtes Safari/iPhone. Große lokale Prüfdaten laden merklich länger; kein Kunden-Ladezeitnachweis.
- Katalog-Folgebranch: **2.196 geprüfte Größen in 513 Dateien** ergänzt. 512 Hinweise, 56 Fehler und zwölf Erweiterungen bereits freigegebener Quellen bleiben weg. Alle 513 JSONs außerhalb `sizes` gegen main identisch, 7.105 Excel-Zellen ohne Inhaltsänderung, vollständiger Katalogbau mit 13 Familien bestanden. Vorhandene Freigaben werden weder erweitert noch zurückgesetzt. Drei betroffene Freigabequellen: TAE-V2A-8x5-D8/D22/D24.

[Desktop-Prüfgalerie](assets/2026-11-01-familien-groessenquellen/pruefgalerie-desktop.png) · [Handybreite](assets/2026-11-01-familien-groessenquellen/pruefgalerie-mobil.png).

Wiederholen: `node scripts/plan-family-formats.mjs --katalog=KOPIE --linie=edelstahl-tuerschilder --unterkategorie=familienschilder --output=NEU --pruefvorlagen --groessen-erweitern --beanstandete-anzeigen`. Getrennte Katalogergänzung: `node scripts/prepare-family-size-additions.mjs --katalog=KOPIE --output=NEUER-BERICHT.json`, zunächst ohne `--apply`. Keine eigenen Preise oder Geometrien in diesen Werkzeugen.

**Nächster Schritt bei Claude:** Folge-PR und separaten Katalog-PR prüfen, beanstandete Vorlagen sowie drei bestehende Freigaben entscheiden. Keine automatische Freigabe, kein Import, kein Merge und nichts live. Rückweg vor Übernahme: die Folgebranches nicht übernehmen; keine Datenmigration oder Live-Rücknahme notwendig.

## Die 15 ursprünglichen Prüffälle

| Design-ID | Größe (mm) | Grund |
|---|---|---|
| TRE-V2A-9x3-D55 | 90 × 30 | spruch: Element ragt über die Gestaltungsfläche hinaus. |
| TO-V2A-12x4-D5 | 120 × 40 | motiv-2: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TRE-V2A-9x3-D55 | 240 × 80 | spruch: Element ragt über die Gestaltungsfläche hinaus. |
| TO-V2A-12x4-D5 | 240 × 80 | motiv-2: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TO-V2A-15x8-D5 | 150 × 80 | motiv-2: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TO-V2A-15x8-D9 | 150 × 80 | motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TO-V2A-9x6-D46 | 90 × 60 | motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TO-V2A-9x6-D46 | 210 × 140 | motiv-1: Element ragt über die ovale Gestaltungsfläche hinaus. |
| TRE-V2A-8x5-D57 | 450 × 300 | Schriftgröße: 1 bis 100 mm. |
| TRE-V2A-8x5-D61 | 450 × 300 | Schriftgröße: 1 bis 100 mm. |
| TR1-V2A-9x6-D5 | 90 × 60 | motiv-1: Element ragt über die Gestaltungsfläche hinaus. motiv-2: Element ragt über die Gestaltungsfläche hinaus. |
| TR1-V2A-9x6-D9 | 90 × 60 | motiv-1: Element ragt über die Kontur-Gestaltungsfläche hinaus. |
| TR1-V2A-9x6-D19 | 90 × 60 | motiv-1: Element ragt über die Gestaltungsfläche hinaus. |
| TR2-V2A-9x6-D15 | 90 × 60 | motiv-2: Element ragt über die Kontur-Gestaltungsfläche hinaus. |
| TR2-V2A-9x6-D15 | 120 × 80 | motiv-2: Element ragt über die Kontur-Gestaltungsfläche hinaus. |
