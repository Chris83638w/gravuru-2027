# #230 – Designsuche, Suchauswertung und weiche Materialschatten

11.11.2026 · Codex/Astra mit drei Unteragenten. Folgebranch `dev/astra-issue230-search-material-20261111`, Ausgangsstand `6298f7af22056333569b030c249ce64568e46beb`. Das getrennte B-Paket wurde nach Chris' ausdrücklicher Freigabe auf `dev/astra-issue230-b-native-20261111` hochgeladen und am Remote mit genau diesem Commit zurückgelesen. Dieser Folgeauftrag ist kein Serverrollout.

## Aktuelle Entscheidungen und Ergebnis

Chris bestätigte das Suchfeld direkt über den Vorlagen auf PC und Handy („ja so einbauen“) und verlangte weiche Schatten für Acryl und Edelstahl, da die harte Acrylkontur wie zwei übereinanderliegende Schilder wirkte. Beides ist umgesetzt. Anschließend stellte er klar: „ach so bei den designs kann es so bleiben. Ich bin vom Hauptprodukt ausgegangen.“ Auf Rückfrage: „Produktbild im Shop“. Die bestehenden Design-/Startvorlagen bleiben deshalb bestehen; die frühere Auslegung einer Ablehnung ist überholt. Eine zusätzliche A/B/C/D-Auswahl ist nicht erforderlich. Die vier Tafeln mit zwölf vorhandenen Design-IDs und 21 Materialansichten bleiben optionale Vergleichsbilder; keine Alternative wird als Start übernommen. Der separat gezeigte Shopbildentwurf H1 wurde ausdrücklich freigegeben und als Hauptbild des bestehenden Acrylprodukts 16190784602492 übernommen; DRAFT und altes Bild bleiben erhalten. [Aktuelle Klarstellung mit Wortlaut](2026-11-11-issue230-shop-image-clarification.md). Der [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) bleibt maßgeblich.

- Designsuche nach vorhandenen Namen, IDs/D-Nummern, Themen und expliziten Motivschlagworten; Berechtigung und native Passung vor Suche/Seitenteilung, maximal 40 Karten je Serverseite. Keine automatische Erschließung unbenannter Bildmotive oder Kundentexte.
- Öffentliche Galerie und nativer Vorschaueditor: beschriftetes Feld, Trefferzahl, Nulltreffer, Leeren, Tastatur-/Kompositionseingaben und Schutz vor verspäteten Ergebnissen. Tatsächliche CSS-Sichtbarkeit und Fenstergrenzen der Modulprofile wurden im Browser geprüft und eng korrigiert.
- Bestehende Suchauswertung um Design/Motiv ergänzt; Shop/Vorschau bleibt eine getrennte Herkunft. Historische Motivdaten bleiben erhalten. Migration nur in isolierten Prüfdateien ausgeführt, keine produktive Datenbank geöffnet.
- Acryl besitzt eine Front mit feiner Randkante und weichem gerichteten Schatten; die versetzte harte Kopie ist entfernt. Edelstahl erhält denselben Schattenweg. Native Produktvorschau und Kundeneditor verwenden ihn gemeinsam.

## Sichtbare Browserabnahme

Echter Chrome, lokale v8-Quellen, synthetische lokale Variantenbindungen und isolierte Suchstatistik. Desktop 1440×900 und Handy 390×844; keine Shopify-Mutation, kein Warenkorb-/Bestellversuch. Temporäre Bildschirmgrößen danach zurückgesetzt.

| Weg | Beobachtetes Ergebnis |
| --- | --- |
| Öffentliche Galerie, Edelstahl 5×2, Desktop | Haus: 2; D23: 1; unbekannter Begriff: 0 mit Erklärung; Leeren: 27 |
| Derselbe Weg, Handy | D23: 1; Suchfeld direkt über den Karten und bedienbar |
| Nativer Editor, Acryl 5×2, Handy | D23: 1 sichtbare Karte; 26 ausgeschlossene Karten tatsächlich `display:none`, `inert` und `aria-hidden=true` |
| Nativer Editor, Suche geleert | 27 Karten wiederhergestellt; kein Suchausschluss, kein verbliebenes `inert`/`aria-hidden`; bestehende Rangaufteilung 23 + 4 weitere |
| Bestehende Auswertungsseite | Suchart Designs/Herkunft Vorschau zeigt die erzeugten Suchereignisse und Nulltreffer; Auswahl bleibt nach Neuladen erhalten |

Die Screenshots und DOM-Belege liegen in [search-browser](../reviews/2026-11-11-issue230-search-browser/). Im lokalen Test zeigen unveränderte v8-Pläne weiterhin ihren bisherigen Beispielstart. Die aktuelle Nutzerkorrektur verlangt dessen Beibehaltung; sie ist keine Station-3-/Produktfreigabe.

## Prüfungen und Grenzen

Die [Suchimplementierung](2026-11-11-issue230-design-search-implementation.md) dokumentiert getrennte gezielte Testläufe, 35/35 HTTP-Suchfälle an sieben echten v8-Produkten und den erfolgreichen Build mit 157 Modulen, 16 Styles und 76 geprüften Ressourcen. Die [Suchauswertung](2026-11-11-issue230-search-analytics.md) dokumentiert Migration, Mandanten-/Herkunftserhalt, Datenschutzfilter, getrennte Zähler und gespeicherte Filter. Die [Materialübergabe](2026-11-11-issue230-material-depth.md) belegt 11/11 Tests sowie fünf bytegleiche Produktions-SVG und identische Produktionskonturen vor/nach der Vorschauänderung. Testsummen aus überlappenden Läufen werden nicht addiert. Historische B-Testfehler werden durch diesen Folgeauftrag nicht als behoben ausgegeben.

Eine vollständige Motivverschlagwortung liegt weiterhin nicht vor: Hauptacryl 1.157 von 1.205 Designs mit mindestens einem unbenannten eingebetteten Motiv; je Kleinprodukt 24 von 27. Vorhandene Designnamen sind trotzdem durchsuchbar. Die neun bereits belegten Geometrieausnahmen bleiben ausgeschlossen, zwei bewusst versteckte Designs bleiben versteckt. Keine Originalgestaltung, Produktionskontur, Excel-Akte, Preisregel, native Quelle oder Plan-ID wurde durch diesen Folgeauftrag verändert.

## Genau nächster Schritt

1. Das ausdrücklich freigegebene Shop-Hauptbild H1 ist übernommen und zurückgeprüft. Bestehende Designs und Starts beibehalten; keine zusätzliche Auswahl aus den [historischen Startalternativen](../reviews/2026-11-11-issue230-start-alternatives/README.md) verlangen. Steuerkontext und die noch unbestätigten Mengenstaffeln bleiben offen. Bestätigte Einzelpreise und Uploadoptionen nicht erneut erfragen.
2. Bei der späteren fachlichen Fortschreibung die überholte zusätzliche Startauswahlpflicht anhand der aktuellen Klarstellung entfernen und die verbleibenden offenen Angaben zur abschließenden Station-3-Freigabe vorlegen. Dieser reine Dokumentationsnachtrag erzeugt keine neuen Pläne oder XLSX. Die gesicherten sieben Pläne bleiben in ihrem historischen Stand unbestätigt, unausgeführt und `valid:false`; 0 confirm/execute.
3. Operator Claude gleicht diesen Branch mit seinem tatsächlichen gemischten Laufzeitstand ab und integriert gezielt. `main` bei Arbeitsbeginn war `76269aa85b5dd7e22957fb138de7d404758d9ea5`; es enthielt nicht alle Grundlagen dieses Aufgabenbranches. Daher keine pauschale Runtimekopie. Vor einer späteren Installation Suchdatenbank sichern und Migration im vorgesehenen Operatorverfahren abnehmen; Kunden-, Warenkorb-, Bestell- und Produktionsweg separat prüfen.

Server-App, Neustart, produktive Bindings und Veröffentlichung wurden hier nicht ausgeführt. Shopify-Produkte nach dem gesondert freigegebenen Bildauftrag: 0 neu, 1 bestehendes Produkt nur am Hauptbild überarbeitet; weiterhin DRAFT. [Bildübernahmebeleg](../reviews/2026-11-11-issue230-shop-hero/README.md). Die bereits erfolgreiche Katalogübernahme #233 wird nicht wiederholt; ihre drei Werkstattänderungen bleiben erhalten.
