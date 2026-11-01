# Türschilder: Review #97 → #98 → #102 · 01.11.2026 · Astra

Eigener Branch `dev/tuerschilder-kompaktauswahl-20261101-astra`, [PR #102](https://github.com/Chris83638w/gravuru-2027/pull/102). Aktuelles main `bfac22b` mit dessen Funkklingel-Korrekturen ohne Force-Push integriert; Integrationsstand `b4a25fa`. Der Master außerhalb der beauftragten Ausführungen bleibt unverändert. Kein Merge nach main, kein Import, keine Freigabe gesetzt, kein Shopify-Schreibzugriff und nichts live.

## Quellen und Korrekturen

- [Claude: Oberfläche, Ausweichen und Rund](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6556389677), [sechs Preis-Regressionen](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6556495680), [vollständige lokale Galerie](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6556265083).
- Originale und Text/Motiv-Hierarchie bleiben nach [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) erhalten. Maße, Lochmitten und Preise stammen weiter aus dem Katalog. Mindestschrift 3 mm aus Paket M; Kopf 4,5 mm nach Chris, zusätzlicher Rand aus der Befestigungsregel (hier 1 mm).
- **Retro-Grünstich:** Ursache war eine grüne transparente Gestaltungsflächenfüllung über dem Materialfoto. Diese Füllung entfällt; eine schmale neutrale Konturhilfe bleibt. Dasselbe unveränderte Materialfoto gilt beim Wechsel RE → RT1 → RT2 → OV → QU. Acrylfarben bleiben getrennte Oberflächen.
- **Ausweichen:** reale Glyphenumrisse statt nur nomineller Textkästen, Kopf plus Katalogrand, bereits überlagerte zusammengehörige Elemente als Gruppe. Erst verschieben, dann nötigenfalls proportional verkleinern. Die Suche erzeugt keine neue Überlagerung. In zwei 8×3,5-Vorlagen fand der Gesamtaudit eine minimale Berührung; die Annahme einer winzigen neuen Überlagerungsfläche wurde entfernt und eine Regression ergänzt. START/K00 und Rücknahme unverändert, kein Kundenhinweis; unlösbare Fälle bleiben für die Werkstatt „prüfen“. Hier keine offenen Fälle.
- **Preis:** `updatePrice` erhält Familien-Grundpreis und Staffeltexte aus dem zentralen Angebot. Kein ausgelagerter Zugriff mehr auf `isFamilyFormats`; die sechs ursprünglichen Fotostaffeltests sind bytegleich mit main und grün.

## Vollständige lokale Prüfgalerie

Katalog main `754c4fa95`, nur in einer lokalen Kopie ergänzt um 147 Rund-Masterdateien aus `62404b12`. 792 passende Master mit Familienziel, davon **783 darstellbare Designs** je Materialfamilie. Keine Beschränkung auf die ursprünglichen acht Beispiele. Nicht freigegebene Ziele tragen nur im lokalen Prüfmodus den kleinen Hinweis „nicht freigegeben“. Kundenauslieferung filtert weiterhin streng auf Freigabe und Familienziel.

Rund ist mit den echten TR-Mastern aktiv. Verfügbare Designzahlen beim geprüften Formatwechsel: AB 72, RE 68, RT1 63, RT2 60, OV 55, QU 65, R 68. K00 bleibt dabei ausgewählt. Das sind Größenstichproben, keine Gesamtzahlen je Form.

**Quellenlücken bleiben sichtbar:** 33 von 80 Edelstahlgrößen und entsprechend 66 von 160 Acryl-Farb-/Größenkombinationen haben keine explizite Größenzuordnung. 15 Edelstahl- und 30 Acryl-Design/Größenkombinationen scheitern an bestehender Quellgeometrie bzw. zwei Schriftgrößen >100 mm; neun Master fehlen dadurch vollständig. Die Galerie erfindet keine Zuordnung und keine Ersatzvorlage; fehlende Größen heißen „noch keine Vorlage“. [Einzelwerte und Ausschlüsse](catalog-coverage.json). Die Fragen zur ausdrücklich lokalen Erweiterung bzw. Anzeige beanstandeter Vorlagen stehen [bei Claude](https://github.com/Chris83638w/gravuru-2027/issues/48#issuecomment-6556892172) noch offen.

## Prüfstand und Grenzen

- **17.094 Design/Größe/Befestigung-Kombinationen**, 5.698 unterschiedliche Geometriefälle: **0 Loch-/Kopfkonflikte, 0 neue Überlagerungen, 0 Inhalts-/Proportionsfehler, 0 „prüfen“**. Alle verfügbaren Vorlagen der drei Familien, jede belegte Größe und jede gelochte Befestigung; zusätzlich K00 je Quelle vorausgesetzt. Unabhängiger Kreis-/Polygon-Abstand und SAT-Überlagerungsprüfung. [Summen je Größe und Hash des vollständigen lokalen Berichts](geometry-summary.json). Kein Beweis für beliebige spätere Kundengestaltungen oder ausgelassene Quellvorlagen.
- **Windows-Vollauf beider Verzeichnisse:** 2.049 Tests, 2.028 bestanden, 16 Fehler wegen fehlender Logo-Python-Abhängigkeit, fünf vorhandene plattformbedingte Skips. Die festgelegte `requirements-logo.txt` separat im lokalen Testordner installiert; danach die drei betroffenen Dateien **53/53 grün** (18 Logo + 35 Shop-Einstieg). Keine Tests oder Assertions abgeschwächt. Die letzte Grenzkorrektur samt neuer Regression separat **18/18 grün**. Zusammen 2.045 verschiedene bestandene Tests, fünf Skips, keine verbleibenden Fehler; **kein zweiter komplett grüner Einzel-Vollauf behauptet**. [Log-Hashes und genaue Zähler](test-evidence.json).
- Fünf Windows-Skips betreffen drei Dateisymlinks, POSIX-Rechte für den echten authentifizierten Server und den dahinterliegenden Git-Ahnencheck. Das sind bestehende Fähigkeitsprüfungen, keine neu eingeführten Skips.
- **8 aktuelle Browser-Klickfolgen/Bildpaare** K00 → Schrauben → K00: tatsächliches Bohrbild, keine Seitenfehler oder Kundenwarnungen. Inhalt exakt wiederhergestellt, Geometrie bis `1e-9 mm`. [Nachweis](browser-cases.json).
- Galerie auf Desktop 1440×1000, 390×664 und 375×548: 18 Formwechsel, Rund und beide Acrylfarben, gleiche Stahloberfläche, Freigabekennzeichnung. [Messwerte](browser-gallery.json). Chromium-Emulation, kein echtes iPhone/Safari. Das große lokale Prüfmodell enthält rund 31–33 MB eingebettete Ressourcen und brauchte unter paralleler Testlast 18–38 s bis zum ersten Editor. Dies ist keine Freigabe der Kunden-Ladezeit; dort bleiben die bestehenden separaten Galerie-/Nachladepfade maßgeblich.
- Build erfolgreich; finales Browserbundle `editor-9de6c1892dc5dd69.mjs`. Keine lokalen Konfigurationen oder Glyphenressourcen im Code-Repo.

## Bilder der Galerie

| Ansicht | Galerie | Rund |
|---|---|---|
| Desktop 1440×1000 | ![](gallery/desktop-gallery.png) | ![](gallery/desktop-round.png) |
| Handy 390×664 | ![](gallery/iphone13-gallery.png) | ![](gallery/iphone13-round.png) |
| Handy 375×548 | ![](gallery/iphoneSE-gallery.png) | ![](gallery/iphoneSE-round.png) |

## Aktuelle acht Beispiele

Die alten N36-Bilder sind historische Nachweise; diese Bildpaare ersetzen ihre Ausweichbewertung.

| Quelle / Ziel | K00 | Schrauben |
|---|---|---|
| 0 · TAE-V2A-8x5-D15 · 80×53.3 mm | ![](cases/0-vorher.png) | ![](cases/0-nachher.png) |
| 1 · TAE-V2A-8x5-D8 · 80×53.3 mm | ![](cases/1-vorher.png) | ![](cases/1-nachher.png) |
| 2 · TR1-V2A-9x6-D65 · 90×60 mm | ![](cases/2-vorher.png) | ![](cases/2-nachher.png) |
| 3 · TRE-V2A-5x2-D5 · 50×20 mm | ![](cases/3-vorher.png) | ![](cases/3-nachher.png) |
| 4 · TRE-V2A-5x2-D45 · 50×20 mm | ![](cases/4-vorher.png) | ![](cases/4-nachher.png) |
| 5 · TRE-V2A-9x3-D73 · 90×30 mm | ![](cases/5-vorher.png) | ![](cases/5-nachher.png) |
| 6 · TRE-V2A-8x5-D13 · 90×60 mm | ![](cases/6-vorher.png) | ![](cases/6-nachher.png) |
| 7 · TQ-V2A-8x8-D15 · 160×160 mm | ![](cases/7-vorher.png) | ![](cases/7-nachher.png) |

## Wiederholen und Übergabe

Auf einer separaten Katalogkopie an den genannten Ständen, ohne Katalogänderung oder Freigabe:

`node scripts/plan-family-formats.mjs --katalog=KOPIE --linie=edelstahl-tuerschilder --unterkategorie=familienschilder --output=NEU-STAHL --pruefvorlagen`

Analog mit `--linie=acryl-tuerschilder --output=NEU-ACRYL`. Danach:

`node --max-old-space-size=2048 scripts/prove-family-gallery-placement.mjs NEUER-BERICHT.json NEU-STAHL/review-config.json NEU-ACRYL/review-config.json`

`node --test --test-concurrency=4 app/configurator/variant-m/*.test.mjs app/workshop/*.test.mjs`

Python mit den vorhandenen SVG-/PDF-/Font-Abhängigkeiten plus `app/workshop/requirements-logo.txt`. Prüfdaten enthalten Schriftpfade und bleiben lokal.

**Claude als nächstes:** Linux-Vollauf der aktualisierten Kette #97 → #98 → #102, Sichtabnahme der korrigierten Beispiele und Entscheidung zu den beiden Quellenfragen. Der Import-/Shop-Schritt bleibt getrennt. Zurück vor Veröffentlichung: PR nicht übernehmen; es gibt keine Datenmigration oder Live-Rücknahme.

## Beschriftung nach Chris – 01.11.2026

Auf ausdrücklichen Wunsch heißt der Türschild-Reiter jetzt **Format & Größe**, ebenso die Bereichsüberschrift und der erste Handy-Schritt. Andere Produktlinien bleiben bei ihren bisherigen Bezeichnungen. Auf 375×548 bricht der Schritttext sauber um; Preis und Weiter bleiben sichtbar. Nur Beschriftung und nötiger Textumbruch geändert, keine Optionen oder Preise. 42/42 vorhandene Mobile-/Workflow-/UI-Regressionen grün; lokale Browserprüfung 1440×1000 und 375×548 bestanden. [Messwerte](format-label-browser.json) · [Desktop](format-label-1440.png) · [Handy](format-label-375.png). Neues Bundle editor-e204a14b14d98f53.mjs. Nichts live.
