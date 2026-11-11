# Unabhängiger Abschlussreview – #230 B, lokaler Lauf v8

11.11.2026 · Prüfer search_preview · ausschließlich lesend gegen work/product-plans-run-v8.

**Sieben echte persistierte native Planpaare und 823 korrekte Variantenpreise nachgewiesen. Die bestätigte Uploadentscheidung ist in den tatsächlichen Plänen umgesetzt und von den nativen Fähigkeiten gedeckt:** Hauptacryl Foto und SVG-Logo an; sechs Kleinprodukte beides aus. Alle sieben bleiben unbestätigte lokale Prüfpläne mit valid:false; keine Ausführung oder Veröffentlichung wurde vorgenommen.

## Unabhängig ausgeführte Prüfungen

- SQLite readOnly: **7 Quellprodukte, 7 gespeicherte Pläne, 0 Bestätigungen, 0 Ausführungen**.
- Exportierte und gespeicherte Pläne, native Planhashes, Quellrevisionen, Vorlagenrevisionen, Excel-SHA und Quellenbindungen stimmen. Die kompilierte Konfiguration entspricht der Quelle nach Anwendung des tatsächlich gespeicherten, nach ID/Revision/Hash gepinnten cmp-Modulprofils. effectiveModules stimmt mit dem Plan überein.
- **823 Variantenpreise** unabhängig mit der unveränderten Excel-Extraktion verglichen: Hauptacryl 778, Acryl klein je 10, Stahl klein je 5. **0 Abweichungen**, eindeutige Optionskombinationen.
- Rang 0 vor Rang 1 in jeder Designbank und jedem Format. Die doppelte Katalog-ID TRE-V2A-7x2-D34 bleibt einmal mit Rang 0.
- Die sechs kleinen Produkte haben ein natives Motivprofil mit genau den bestätigten **13 Motiv-IDs**. Auswahl, Katalog und gespeicherte Metadaten stimmen. schmetterlinge-1.svg bleibt ausgeschlossen; eingebettete Originalmotive sind gegenüber v7 unverändert.
- **Zusatzreview an allen sieben echten v8-Konfigurationen:** prepareConfig, vectorLogoAllowed, nativeModuleAvailability, uploadAllowed, photoAvailableForDesign und Anzeigehilfe bestätigen die Uploadentscheidung. Hauptacryl bietet Foto für 9,99 € und SVG-Logo für 12,99 € entsprechend dem gespeicherten Plan; die kleinen Pläne deaktivieren beides. Eingabekonfigurationen unverändert; die Uploadauswahl steht nicht mehr als offene Nutzerentscheidung im Plan.
- Uploadcode unabhängig gelesen: zusätzlicher Acrylgravurzweig beseitigt den früheren technischen Konflikt; Edelstahl behält SVG ohne Foto. Dateiauswahl unterscheidet Foto und SVG. Ein gefundener überholter Hilfetext wurde korrigiert: Der Upload-Guide nutzt jetzt dieselbe produktabhängige decisionHelp.

Belege: review-v8.json, review-v8-details.json und review-v8-uploads.json. Letzterer enthält Prüfsummen der gelesenen Uploaddateien. Medien-, Preis-, Checkout- und PDF-Tests des Autors wurden nicht als eigene unabhängige Testausführung gezählt. Dieser Review enthält keinen Browser-/Live-Nachweis.

## Geometrie

1.298 Katalogzeilen entsprechen 1.297 eindeutigen IDs. Hauptprodukt: 1.217 Zeilen / 1.216 IDs, davon 1.205 nativ übernommen. Zwei fehlende IDs sind bewusst ausgeblendet; neun weitere bestehen die Randprüfung nicht.

**Sieben klare Überstände und zwei Mikro-Grenzfälle** an tatsächlichen Motiv-/Buchstabenpfaden; kein pauschaler Begrenzungsbox-Fehler. Quelle, Zielgröße, Punkte, Messgrenzen und nächster Schritt stehen in geometry-review.md und geometry-analysis.json. Pro Design wurde das erste ausgeschlossene Zielformat vertieft untersucht; sämtliche Zielgrößen müssen nach einer späteren Korrektur erneut geprüft werden. Keine Originalgestaltung oder Geometrietoleranz verändert.

## Verbleibende Grenzen

- Vorgeschlagene Startdesigns und ausdrücklich ungeklärte Angaben zu Steuerkontext/Mengenstaffeln beziehungsweise Excel-Startreferenzen bleiben sichtbar, ohne erfundene Nutzerentscheidung.
- Der Platzierungsadapter für die bestätigten 13 Motive einschließlich Strich-Ausnahmen ist lokal gebaut und geprüft. Die Motivauswahl verlangt keine neue Nutzerentscheidung. Grenzen und ausstehende Sichtprüfung stehen unten.
- Sieben klare Überstände benötigen konkrete versionierte Korrekturvorschauen. Zwei Mikro-Grenzfälle benötigen gezielte Präzisions-/Regressionstests. Keine globale Toleranzlockerung oder stille Originaländerung.
- Bibliotheks-Motivprofile sind im Dokument nur über Profil-ID gebunden. Revision/Prüfsumme liegen separat in Metadaten/Paket; der native Planservice schützt diese nicht wie cmp-Modulprofile. Vor späterer Ausführung die separate Bindung erneut prüfen.
- Keine Server-, Shopify-, Produktbindung-, Kunden- oder Produktionsänderung. Lokale Prüfung ersetzt keine spätere Browser-/Bestell-/Produktionsabnahme.

## Reproduktion

```text
node review-persisted-plans.mjs FINALER_LAUF NEUER_REVIEW_JSON CODE_REPO
node review-final-details.mjs FINALER_LAUF KATALOG_REPO CODE_REPO VERGLEICHS_QUELLENLAUF NEUER_DETAIL_REVIEW_JSON
node review-upload-decision.mjs FINALER_LAUF CODE_REPO NEUER_UPLOAD_REVIEW_JSON
node analyze-geometry.mjs FINALER_LAUF KATALOG_REPO CODE_REPO NEUE_GEOMETRIE_JSON
```

Geprüft: v8, Originalressourcen verglichen mit v7. Initialer nativer Quellenlauf der Sitzung: v3. Externe Reproduktion erzeugt diesen Quellenlauf erneut aus den gesicherten Eingaben. Portables Skript: review-final-details.mjs, nicht der frühere feste Snapshot review-final-details-v6.mjs. Das separat gepinnte Code-Repository wird benötigt.

## Begrenzter Motivpatch im finalen lokalen Stand

Der Platzierungsadapter wurde lokal ergänzt; v8 ist der darauf folgende finale Planlauf. 34 gezielte bestehende/neue Tests sowie anschließend der zusätzliche Drehungs-/Glyphentest sind grün. Reale v8-Quellen: 78/78 Kombinationen der sechs gespeicherten kleinen Konfigurationen mit den 13 Original-IDs sowie 13/13 Hauptprodukt-Ausschlüsse korrekt. Beleg: motif-placement-real-sources-v8.json und docs/handoffs/2026-11-11-issue230-small-motif-placement.md.

Die Adapterarbeit ist damit lokal gebaut, die Sicht-/Bedienprüfung bleibt offen. Beim vorgeschlagenen D1-Start auf 5×2 und 6×2 cm findet die konservative Realquellenprobe keinen Seitenplatz für ein mindestens 10 mm großes Motiv neben dem unveränderten Text; der bestehende Hinweis bleibt korrekt. Beide Linien passen, beim 8×2-Start alle 13 Proben. Es wird keine automatische Platzierbarkeit aller Motive auf jedem Start behauptet. Keine Originaltexte wurden verkleinert oder verschoben.

## Vorhandene Startbilder auf v8 zugeordnet

Die sieben vorhandenen nativen Startvorschauen wurden ursprünglich aus v7 erzeugt. Vergleich mit v8: vollständige Konfiguration (ausschließlich cmp-ID/Revision als nicht bildwirksame Identität ausgenommen), effektive Module, ausgewähltes Profil, Design, Geometrie, Material, Optionen und lokale Ressourcen sind identisch. Die gespeicherten SVG- und PNG-Prüfsummen stimmen weiterhin. Ein Neurender ist hierfür nicht erforderlich. Beleg und exakte alte/neue Plan-ID-/Hash-Zuordnung: outputs/Produktplaene-230/Startdesign-Vorschlaege/Zuordnung-v8.json. Die Bilder sind native Renderbilder vorgeschlagener Starts, keine neuen Browser-Screenshots und keine Designfreigabe.

## Sieben Excel-Nachträge unabhängig geprüft

Die sieben neuen XLSX-Versionen unter outputs/Produktplaene-230/Excel-Nachtraege bestehen den unabhängigen Abgleich. **17.968 ursprüngliche Zellen einschließlich Preiswerte und Formeln sind unverändert.** Darüber hinaus sind sämtliche ursprünglichen Worksheet-, Table- und Worksheet-Relation-Dateien innerhalb der XLSX bytegleich. Jede Datei ergänzt genau das Blatt BestätigteUploads.

Die konkreten Zellen des Nachtrags verweisen auf die finalen v8-Plan-IDs und Planhashes, die richtigen Quell-/Vorlagen-/Modulprofil-IDs mit Revisionen und SHA sowie den SHA der unveränderten Original-Excel. Hauptacryl Foto AN/999 Cent und SVG-Logo AN/1299 Cent; sechs kleine Produkte beides AUS/nicht angeboten; Motivpreis 169 Cent. Startdesign/-größe, Steuerkontext, Mengenstaffeln und Gesamtfreigabe bleiben in C14:C18 OFFEN. Das externe Manifest benennt die richtigen neuen XLSX-Hashes und den SHA der v8-Zusammenfassung.

Beleg: review-v8-excel-addenda.json. Die OOXML-Werte/Formeln und enthaltenen Dateibytes wurden direkt und unabhängig von der Autorenbibliothek gelesen. Reproduktion: node review-excel-addenda.mjs FINALER_LAUF ORIGINAL_EXCEL_ORDNER NACHTRAGS_ORDNER CODE_REPO NEUER_REVIEW_JSON. Dieser Inhalts-/Pin-Abgleich ist getrennt von der Sichtprüfung des Autorenagenten.
