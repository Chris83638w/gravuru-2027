# Warenkorbprüfung Main + sechs Kleinformate (12.11.2026, 19:00–19:20 UTC)

Auftrag: Chris über Astra (#168): „Mach bitte mit Claude auch den Warenkorbtest … Zeig mir danach alles zur Freigabe, bevor etwas veröffentlicht wird.“ Grundlage `d8bf96d`.

Was nicht getan wurde: kein Publish, kein ACTIVE, keine Kanalveröffentlichung, keine Bestellung oder Zahlung, keine Produktionsfreigabe, keine App-Umschaltung. Kein Produkt-, Bild-, Text- oder Handle-Write.

Die Ergebnisse sind in drei getrennte Belegarten aufgeteilt.

## A – Öffentlicher Kaufweg (echt, Chrome Desktop 1440 × 709)

Einstieg über den echten Shop-Proxy `/apps/konfigurator/start?product=…&variant=…`, Konfi auf `app-2027…`. Danach „In den Warenkorb“, „Jetzt in den Warenkorb“ und die echte Shopify-Übergabe.

| Produkt | Konfi startet | Übergabe an Shopify |
|---|---|---|
| Main 16190784602492 (RE 12×8 Schwarz, 2 Schrauben, Menge 10, Motiv + Logo) | ja | **„Kann Variante nicht finden“ (DRAFT)** |
| Edelstahl 8×2 16203718459772 (Motiv, Menge 10) | ja | **„Kann Variante nicht finden“ (DRAFT)** |

Direkte Kontrolle `/cart/add.js` mit je einer Variante aller sieben Produkte: **7 × HTTP 422 „Kann Variante nicht finden“**. Die Anzahl der Warenkorbpositionen blieb unverändert; zwei ältere fremde Testzeilen wurden nicht angefasst.

**Ein echter Shopify-Warenkorb ist mit DRAFT-Produkten also nicht erreichbar.** Kaufweg, Zeilenpreis im Warenkorb, Mengenwechsel im Warenkorb und Ersetzen der Zeile beim Bearbeiten sind deshalb **offen**. Sie müssen nach einer Veröffentlichung auf genau diesem Weg wiederholt werden.

Bearbeiten und Wiederöffnen: „Zurück zur Gestaltung“ nach der Übergabe stellt die gespeicherte Gestaltung wieder her (Text, Motiv, Logo, Befestigung, Preis 32,36 €). Die Menge springt dabei auf 1 zurück (Bild 04).

Handy 390: hier nicht prüfbar. Das Browserfenster ist maximiert und lässt sich nicht verkleinern, und der Konfi verweigert die Einbettung in einen Rahmen. **Offen.**

## B – Preis im Konfi (echt, Brutto inkl. MwSt.)

| Fall | Konfi | Erwartet |
|---|---:|---:|
| Main RE 12×8 Schwarz 2 Schrauben (neuer Preis) | 17,68 € | 17,68 |
| … Menge 3 / 5 / 10 | 50,40 / 79,55 / 150,30 € | 16,80×3 / 15,91×5 / 15,03×10 |
| … + Motiv | 19,37 € | +1,69 |
| … + Motiv + Foto | 29,36 € | +9,99 |
| … + Motiv + Foto + Logo | 42,35 € | +12,99 |
| … alles, Menge 3 / 5 / 10 | 120,69 / 190,60 / 360,00 € | 40,23×3 / 38,12×5 / 36,00×10 |
| … Motiv + Logo, Menge 10 | 275,10 € | 27,51×10 |
| Main R1-Restvariante RE 8×2 | 8,49 € (alter Stand, 1 Design) | 8,49 |
| Acryl 5×2 K00 / 2 Schrauben | 6,99 / 9,68 € | 6,99 / +2,69 |
| … + Motiv, Menge 1 / 3 / 5 / 10 | 11,37 / 32,40 / 51,15 / 96,60 € | 11,37 / 10,80×3 / 10,23×5 / 9,66×10 |
| Edelstahl 8×2 K00 + Motiv, Menge 1 / 10 | 11,18 / 95,00 € | 11,18 / 9,50×10 |
| Acryl 6×2 K00 | 7,99 € | 7,99 |

Bei allen Kleinformaten gibt es keinen Foto-/Logo-Reiter. Das passt zu „Foto und Logo AUS“. Sichtbare Befestigungsaufpreise: +2,99 / +3,99 / +2,49 / +2,69 €. Es werden 13 Motive angezeigt (Nr. 9 ist entfernt) und 27 Designs je Kleinformat.

## C – Preisfunktion mit den tatsächlichen Preisfeldern (nur lesend)

Lauf `sicherungen-db/warenkorb-ebene-c-20261112T191713Z`, Skript `wk-funktion.mjs`, sha `0225a236…d691`. Beleg `WARENKORB-ebene-c.json`: 74 590 B, sha `e80290ddbd16df9ef86393f8cd4d746060ad2dfb8c020c182134eafa996ade45`. Eine Shopify-Leseabfrage, kein fremdes Netz.

**438/438 Fälle grün.**
- Main-R2: sieben Befestigungs-/Größenvarianten × Mengen 1/3/5/10, dazu Motiv/Foto/Logo-Kombinationen.
- Historische R1-Zeile: alter Preis 17,98 bleibt bei Revision 1 erhalten. Zusätzlich eine R1-Restvariante.
- Alle 45 Kleinvarianten × 4 Mengen × Motiv 0/1.
- Kleinformate: Logo wird abgewiesen, ein Foto-Zähler kostet 0 c, eine fremde Revision wird abgewiesen.
- Main: 5 Logos, unbekannte Revision und Zeile ohne Entwurf werden abgewiesen.
- Gemischter Warenkorb mit 7 verschiedenen Zeilen: 382,44 €.

Gelesene Preisfelder:
- Main: 3 898 B `37ef02c6…` (gepinnt)
- A5: 566 B `02f696d1…`
- A6: 572 B `b65dfcfd…`
- A8: 572 B `c9e6ab30…`
- S5: 463 B `9bb94fe5…`
- S6: 463 B `5d20131f…`
- S8: 463 B `1399ebd7…`

**Grenze:** Ausgeführt wurde die JS-Quelle der laufenden Runtime, nicht der kompilierte WASM-Build (`a5c59354…`). Es gibt daher **keine Instruktionsmessung**. Die bekannte Grenze bei 20 verschiedenen Zeilen bleibt bestehen. Den Build habe ich bei Astra angefragt (#168 6833033657).

## Befunde vor einer Veröffentlichung

1. **Blocker – Main-Designauswahl kommt zu spät.** `/api/shop-entry/design-gallery` braucht für Main R2 gemessen **5,7–8,1 s** (127 Designs bei 12 × 8, vier Messungen). Der Konfi bricht nach 5 s ab und zeigt „Die Designauswahl ist gerade nicht erreichbar“ (Bild 01). Kunden können beim Hauptprodukt daher kein Design wählen.
   - Bei den Kleinformaten (27 Designs) lädt die Auswahl sofort.
   - Laut Code läuft der Zweig für „alle Größen“ synchron. Der 4-s-„wird vorbereitet“-Zeitgeber kann deshalb nicht greifen, und der Node-Prozess ist für diese Zeit blockiert.
   - Ursache ist der größere R2-Designbestand (am 10.11. zeigte R1 bei 12 × 8 noch 21 Designs).
   - Eine Lösung braucht eine Code- bzw. App-Änderung und damit eine eigene Freigabe.
2. **Main enthält weiterhin die 30 alten R1-Kleinformat-Varianten (5×2/6×2/8×2).** Sie zeigen den alten Stand mit 1 Design (Bild 05). Vor dem Livegang muss entschieden werden, wie damit umgegangen wird, da es dieselben Größen jetzt als eigene Produkte gibt.
3. Beim Wiederöffnen springt die Menge auf 1 zurück (gering).
4. Optisch, zur Sichtprüfung durch Chris: Bei 5 × 2 cm wirken die Schraubenköpfe in der Vorschau sehr groß (Bild 07).
