# Neun Geometrieausnahmen: Abschlussaudit

11.11.2026 · unabhängige lokale Leseprüfung · Katalog `8236b8bfab7322447ec46661c116fa526331af3d` · Code `64e026e8fd15b129a16cc97189b28506aa9e8ac2` · native Pläne v8.

**Die neun Ausschlüsse verhindern technisch weder die sieben Produktstrukturen noch das Angebot ihrer bereits enthaltenen Designs. Sie verhindern eine vollständige Übernahme-/Freigabebehauptung für alle 1.298 Auftragszeilen.** Im gespeicherten v8-Hauptplan steht der ungeklärte Umfang allerdings ausdrücklich als `open_question`; dieser konkrete Plan ist deshalb weiterhin nicht bestätigbar. Die sechs Kleinprodukte sind von den neun Ausnahmen nicht betroffen. Eine gezielte Codekorrektur, die diese neun unveränderten Originale ohne Toleranzlockerung sicher zulassen würde, ist nicht belegt.

## Was erneut geprüft wurde

- Der bisherige Geometriemesslauf wurde mit v8 und dem finalen Code erneut ausgeführt. Alle neun Ergebnisse einschließlich der detaillierten Punkte und Quellenmessungen sind identisch. 18 Originaldateien (je JSON und SVG) stimmen mit den dokumentierten SHA256 überein.
- Hauptprodukt: **1.205 enthaltene Designs** aus 1.216 eindeutigen angefragten IDs. Neun Geometrieausnahmen und zwei absichtlich ausgeblendete IDs fehlen tatsächlich sowohl in der Designbank als auch in sämtlichen Formatverweisen. Die beiden getrennten `hidden`-IDs sind `TQ-V2A-8x8-D14` und `TO-V2A-9x6-D38`.
- Sechs Kleinprodukte: jeweils **27/27 Designs**, keine der neun Ausnahmen enthalten. In keiner der sieben Quellen gibt es eine Größe/Farbe ohne verfügbares Design. Die Familienberichte haben keine blockierte oder unverfügbare Größe.
- Alle sieben gespeicherten Pläne enthalten ausschließlich `open_question`-Einträge: Hauptprodukt drei, jedes Kleinprodukt zwei. Es gibt hier keinen `native_validation`-Fehler. Das ist keine Gesamtfreigabe und beseitigt die anderen offenen Angaben nicht.
- 1.298 Auftragszeilen entsprechen 1.297 eindeutigen IDs, weil `TRE-V2A-7x2-D34` doppelt vorkommt. Materialwiederholungen der Kleinprodukte dürfen nicht als weitere einzigartige Designs gezählt werden.

## Exakte Ausnahmen

Die Überstände beziehen sich jeweils auf das erste bislang untersuchte Zielformat, **nicht auf das Maximum aller Größen**. Der Familienbericht enthält insgesamt 104 ausgeschlossene Kombinationen aus Design, Größe und Farbe. Die vollständigen Größenlisten und Originalhashes stehen im JSON.

| ID | geprüftes Ziel, mm | Element | gemessener Überstand, mm | Einordnung |
|---|---:|---|---:|---|
| TO-V2A-12x4-D5 | 120 × 40 | motiv-2 | 0,000079 | Mikrogrenze |
| TO-V2A-15x8-D5 | 300 × 160 | motiv-2 | 0,000782 | Mikrogrenze |
| TO-V2A-15x8-D9 | 300 × 160 | motiv-1 | 0,005021 | Pfadüberstand |
| TO-V2A-9x6-D46 | 90 × 60 | motiv-1 | 0,003097 | kleiner Pfadüberstand |
| TR1-V2A-9x6-D19 | 90 × 60 | motiv-1 | 0,005000 | Pfadüberstand |
| TR1-V2A-9x6-D5 | 90 × 60 | motiv-1 und motiv-2 | 0,097000 | Pfadüberstand |
| TR1-V2A-9x6-D9 | 90 × 60 | motiv-1 | 0,121903 | Pfadüberstand |
| TR2-V2A-9x6-D15 | 90 × 60 | motiv-2 | 0,200775 | Pfadüberstand |
| TR-V2A-6.5x6.5-D803 | 85 × 85 | text-1, HARTMANN | 1,829868 | Buchstabenüberstand |

Die native Prüfung verwendet bereits tatsächliche Motivpfade beziehungsweise Glyphen. Alle betroffenen Objekte liefern `false`, nicht den Wert `null` für eine nicht unterstützte Kontur. Eine Umstellung von Begrenzungsboxen auf Pfade wäre daher keine neue Lösung.

## Engere Prüfung möglicher Konverterfehler

**Zwei Mikrogrenzen:** Zusätzlich wurden ausschließlich exakte M/L/C-Endpunkte der unveränderten SVGs gegen die ideale Ellipse geprüft. Kurvenkontrollpunkte und Kurvenabtastung werden dabei nicht als Randpunkte verwendet. Für TO-12x4-D5 ergibt sich `q = 1,000017496111111`, für TO-15x8-D5 `q = 1,000015866711111`, wobei `q = ((x−cx)/rx)² + ((y−cy)/ry)²` und außen `q > 1` bedeutet. Ein zusätzlicher Ganzzahlvergleich auf Basis der originalen 0,001-mm-Koordinaten bestätigt das positive Vorzeichen ohne Gleitkommaentscheidung. Damit existiert der minimale rechnerische Überstand bereits vor jeder Konverterrundung. Die Fertigungsrelevanz dieser Mikroabweichungen bleibt ausdrücklich unbewertet; es wird keine neue zulässige Fertigungstoleranz abgeleitet.

**Gedrehter Text D803:** Die echte eingebettete Schrift Bebas Neue wurde zusätzlich direkt mit dem SVG-Schriftgrad 11,92 mm, Mittelanker, Grundlinie und der Originaldrehung −90° um (15,567; 35,426) gerechnet. Ohne `katalogDesignToTemplate`, `scaleTemplate` oder `textGlyphLayout` liegt ein Punkt des H bereits im 65-mm-Original um **1,399060 mm** außerhalb des Kreises. Die Größenordnung des 85-mm-Nativbefunds ist deshalb kein bloßer Fehler der Umrechnung des Drehpunkts.

**Übrige Fälle:** Die erneute Pfadmessung bestätigt die dokumentierten Überstände. Bei den beiden größeren Ovalbefunden ist der Überstand auch vor Rundung von Objektmitte/-größe vorhanden; die Rundung verändert ihn geringfügig, verursacht ihn aber nicht allein. D19 enthält bereits y = 60,005 mm und D5 x = −0,097 mm im Original. Es wurde kein reproduzierbarer Fehler gefunden, dessen isolierte Korrektur eines dieser ausgeschlossenen Designs mit identischer Originalgeometrie sicher zulassen würde.

Die vorhandene konservative Reserve für Pfadapproximation ist keine zugesagte Fertigungstoleranz. Sie zu entfernen, den Rand zu erweitern oder die Elemente automatisch kleiner zu machen wäre keine belegte Fehlerkorrektur. Entsprechend wurde nichts davon geändert.

## Kleinster fachlich korrekter Abschlussweg

1. **Begrenzten Angebotsumfang ausdrücklich festhalten:** Hauptprodukt mit 1.205 vorhandenen Designs, Kleinprodukte je 27; neun Geometrieausnahmen bleiben ausgeschlossen und zwei `hidden` bleiben ausgeblendet. Die ursprüngliche Auftragsliste und Originalquellen bleiben erhalten. Diese Entscheidung löst die Umfangsfrage, behauptet aber keine 1.298-fache Vollfreigabe. Liegt diese Entscheidung noch nicht vor, bleibt genau diese Umfangsfrage offen.
2. **Aktuelle offene Angaben getrennt auflösen:** Die weiteren v8-Fragen zu Start-/Excel-Angaben, Steuer und Staffel mit den neuesten tatsächlichen Nutzerentscheidungen abgleichen. Die neun Ausnahmen dürfen weder die sechs Kleinprodukte pauschal sperren noch als Begründung dienen, andere offene Angaben still zu bestätigen.
3. **Native neue Planrevision erzeugen:** Erst nach belegter Auflösung der jeweiligen Fragen die Vorlage über den normalen Planservice revisionieren und neu planen. Alte Plan-IDs/Hashes und v8-Dateien nicht ändern. Dann aktuelle Quell-/Profilpins, 823 Preise und den begrenzten Designumfang erneut vergleichen; neue Excel-Nachträge/Manifest binden die neuen Planpaare ohne zirkuläre Hashangaben. Bestätigung/Ausführung richten sich nach dem konkreten neuen Plan und der vorliegenden Autorisierung.
4. **Neun Designs als eigenes Nacharbeitspaket führen:** Für spätere Aufnahme je Original eine gesonderte versionierte Korrektur mit sichtbarem Originalvergleich vorbereiten und konkret freigeben lassen. Keine stillen Originalersetzungen. Danach alle 104 bislang ausgeschlossenen Größe/Farbe-Kombinationen mit unveränderten Prüfregeln erneut prüfen. Die zwei Mikrogrenzen bleiben bis zu dieser Entscheidung ausgeschlossen; die geringe Zahl allein rechtfertigt keine Ausnahme.

## Operator-TODO

- In #230/Übergabe den tatsächlichen eingeschränkten Umfang und die neun exakten IDs festhalten; zwei `hidden` und die doppelte Listenzeile getrennt zählen.
- Vor einer Planrevision prüfen, ob die Annahme dieses eingeschränkten Umfangs und die übrigen v8-Restentscheidungen bereits ausdrücklich vorliegen; keine neue Freigabe aus diesem Audit ableiten.
- Neue native Planpaare und deren Freigaben eindeutig versionieren; die Ausschlüsse müssen auch in Browserauswahl und Zielgrößenverweisen erhalten bleiben.
- Geometriekorrekturen als getrennte Nacharbeit beauftragen; Originale, Motive, Schriftkonturen und Kataloghistorie erhalten. Kein Override der Konturprüfung.
- Kunden-/Warenkorb-/Bestell-/Produktionsabnahmen und gegebenenfalls Server-/Shopübernahme separat nachweisen. Dieser lokale Audit belegt keine neue Liveänderung.

Belege: `Abschlussaudit.json` (neue unabhängige Zusatzproben, alle Planpins und Quellenhashes), bestehendes `work/product-plans-run-v8/review/geometry-analysis.json`, identische Reproduktion `work/geometry-final-audit/reproduced.json`. Reproduktion des Zusatzchecks: `node work/geometry-final-audit/audit.mjs`. Alle Prüfzugriffe auf Pläne, Katalog und Code waren lesend; geschrieben wurden nur neue Auditdateien.
