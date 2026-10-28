# Konfigurator: zweiter Auftrag an Astra zu PR #41 · 28.10.2026

Stand: 28.10.2026, Claude als Operator. Chris hat den Stand von PR #41 (Commit `458f56b8`, Entwurf) mit mir durchgesehen. Alle Punkte unten sind mit Chris abgestimmt. Ich habe sie 1:1 im echten Konfigurator geprüft: PR-Stand im Live-Shop, eingespielt nur im Testbrowser, Desktop 1440 × 900 und iPhone 13.

Bilder: [`konfi-ux-20261028-auftrag2/`](konfi-ux-20261028-auftrag2/), Dateiname = Punktnummer.

## Rahmen (unverändert)

- Weiter auf deinem Branch `dev/konfi-ux-20261028-astra` bzw. PR #41. Signierte Commits, Tests, `STATUS.md`, Bericht unter `docs/handoffs/`.
- Vor dem Merge 1:1-Bilder im echten Konfi an Chris: Desktop 1440 × 900 und iPhone 390 × 844, keine freien Skizzen.
- Live erst mit Chris' ausdrücklichem Satz („Ja, Du darfst … bereitstellen und die App neu starten.“).
- **Dateien, die ich parallel ändere:**
  - Ich führe meinen Branch `dev/konfi-ios-sicherheit-20261028-claude` selbst mit PR #41 zusammen. Er enthält die iPhone-Absicherung des Shop-Fensters und das Entfernen leerer Zusatztexte.
  - Betroffene Dateien: `app/workshop/ui/shop-embed.mjs`, `app/workshop/ui/shop-entry-page.mjs`, `app/configurator/variant-m/completion.mjs`, neu `added-texts.mjs`.
  - Bitte dort nichts umbauen, was nicht zum Auftrag gehört.

## 1. Preisregel zurück auf „zusätzlich“ (Entscheidung Chris)

Das Motiv der Vorlage ist im Produktpreis enthalten. Nur ein **anderes** Motiv (ersetzt) oder ein **zusätzliches** Motiv kostet 1,69 € je Motiv. Der Shopify-Preis bleibt 19,99 € (D8).

**Heute:** Mit `motifCharge:'all'` zeigt die Fußleiste 21,68 € statt 19,99 €, Bild **F10**.

**Umsetzung:**
- `motifCharge:'all'` aus Importer/Proposal und Produktständen entfernen. Es bleibt die bestehende Regel `additional` (`contract.mjs` `quote()`: gleiche ID + gleiches Motiv = frei).
- Die Texte in `usability.mjs`, `decision-help.mjs` und `adapter.mjs` an diese Regel anpassen.
- Wortlaut ⓘ-Text: „Das Motiv der Vorlage ist im Preis enthalten. Jedes weitere oder geänderte Motiv: +1,69 €.“

**Prüfen und melden, nicht live ändern:** Aufpreise brauchen `binding.priceMode==='shopify-cart-transform'`. Sonst wirft `commerce-model.mjs` „Aufpreisberechnung noch nicht freigeschaltet“.
- Prüfe, mit welchem Preismodus das Testprodukt gebunden ist.
- Prüfe, was der Kunde heute sieht, wenn er ein Motiv tauscht.
- Er darf nie eine technische Fehlermeldung sehen. Solange der Aufpreis nicht freigeschaltet ist, muss er einen klaren Hinweis bekommen.

## 2. Text-Leiste über dem Schild (F1/F2, Entscheidung Chris)

**Heute:** Die Leiste verdeckt die Zeile über dem gewählten Text. Im Vollbild liegt sie auf „Kerstin & Ralf“, Bilder **F1-F2-leiste-varianten** (Spalte „Heute“) und **F2-vollbild**.

**Variante B (Standard):** Die Leiste steht immer im freien Rand **knapp über dem Schild**, 8 px Abstand zur Platte. Seitlich rückt sie mit dem gewählten Element mit und wird an der Bühne begrenzt. Sie verdeckt nie die Gravur, normal und im Vollbild (Spalte „B“).
- Ist die Ansicht gezoomt (Punkt 5) und das Schild füllt die Bühne, sitzt die Leiste am oberen Rand der Bühne.
- Auf dem Handy bleibt die Leiste M2 direkt **unter** dem Schild (bereits entschieden).

**Variante A (Vergleich):** Die Leiste steht knapp über dem gewählten Text (6 px über den Griffen) und ist ~22 % kleiner (Spalte „A“).

**A/B-Test, Chris testet beide:**
- Einstellung `textToolbarPlacement: 'plate' | 'selection'`, Standard `plate`.
- Zum Selbsttesten per Adresszusatz `?leiste=a` bzw. `?leiste=b`, nur im Shop-Fenster.
- Für einen späteren Kundentest: optional Zuteilung 50/50 pro Besucher, gemerkt im Browser.
- Die Variante wird im gespeicherten Gestaltungsstand mitgeschrieben, damit Bestellungen zuzuordnen sind. Kein zusätzliches Warenkorbfeld und keine Änderung an Preis- oder Bindungsprüfung.
- Die Kundenzuteilung bleibt **aus**, bis Chris sie freigibt.

## 3. Vollbild-Kopf (F2b/F2c)

Bild **F2-vollbild**:
- Der Knopf oben links „← Zurück“ heißt im Vollbild **„Vollbild verlassen“**. Sonst denkt der Kunde, er verlässt den Konfigurator.
- Der Mini-Titel unten rechts („Türschild Abger. Ecken …“) entfällt im Vollbild.

## 4. ⓘ-Links an die richtige Stelle (F3, F5b)

- „Schrift ⓘ“ steht verloren unter „Text bearbeiten“, Bild **F3**. Das ⓘ gehört direkt an die Überschrift: „Text bearbeiten ⓘ“, oder in die Leiste neben die Schriftauswahl.
- Ebenso „Motive ⓘ“: Es steht verloren unter der Motivliste, Bild **F5** (5b). Es gehört an „Bestseller-Motive / Alle Motive“.
- Bitte überall gleich: ⓘ immer direkt hinter dem Begriff, den es erklärt.

## 5. Zoom ins Produkt (neu, Entscheidung Chris)

**Heute** gibt es praktisch keinen Zoom, Bild **Zoom-vorschlag-grau**, links:
- Der Regler „Zoom“ vergrößert nur den Rahmen, bis das ganze Schild die Breite füllt.
- Auf dem Desktop ist das sofort erreicht, deshalb wird er ausgeblendet. Auf dem Handy ist er ganz ausgeblendet (`mobile.css`).

**Neu: echter Zoom ins Schild**, damit der Kunde Elemente genau ausrichten kann.

- **Desktop:**
  - Leiste unten rechts in der Bühne mit „− 180 % + ⤢“ (⤢ = ganzes Schild).
  - Stufen 100–400 %. Das Mausrad zoomt zur Mausposition.
  - Ziehen auf freier Fläche verschiebt. Ziehen auf einem Element bewegt weiterhin das Element.
- **Handy:**
  - Zoomen mit zwei Fingern, mit einem Finger auf freier Fläche verschieben.
  - Unten rechts stehen nur die Prozentanzeige und ⤢ „Ganzes Schild“. Keine +/−-Knöpfe, damit nichts das Schild verdeckt.
- **Beide:**
  - Mini-Karte unten links (Schild klein, sichtbarer Ausschnitt als Rahmen). Sie ist nur sichtbar, wenn gezoomt ist.
  - Beim ersten Zoom erscheint ein kurzer Hinweis („Freie Fläche ziehen = verschieben · Mausrad = zoomen“ bzw. „2 Finger = zoomen“). Er verschwindet nach wenigen Sekunden.
- **Automatischer Zoom (gehört zu F5):** Tippt der Kunde ein sehr kleines Element an, zoomt der Konfi sanft so weit, dass es gut greifbar ist. ⤢ führt zurück.
- **Griffe, Auswahlrahmen und Text-Leiste** bleiben beim Zoomen gleich groß und sitzen genau am gezoomten Element.
- **Farben:** Zoomleiste, Mini-Karten-Rahmen und Hinweis in **Dunkelgrau** (#2f3437, wie „In den Warenkorb“), **nicht grün**.
- **Abgrenzung:** Der alte Regler „Vorschaugröße/Zoom“ entfällt. Der Fotozoom unter „Foto / Logo bearbeiten“ bleibt, wie er ist.
- Die Vorlage im Bild (Desktop 180 %, Handy 160 %) ist 1:1 im echten Konfi eingeblendet. Auf dem Handy war das Schild noch schmal; mit Punkt 8 wird es breiter.

## 6. Griffe kleiner (F6, Entscheidung Chris)

Bild **F6-kaestchen-kleiner**, rechts ist der gewünschte Stand.
- Die Kästchen bleiben wie heute: weiß, abgerundet, mit Pfeil.
- Sie werden nur von 26 auf **~19 px** verkleinert, der Pfeil etwas kräftiger. Der Drehpfeil oben wird im gleichen Verhältnis kleiner.
- Die Tippfläche bleibt unsichtbar **44 px**, damit die Bedienung für ältere Kunden einfach bleibt.
- Der Auswahlrahmen um den Text bleibt grün.
- Gilt Desktop und Handy.

## 7. Auswahl nicht mit Hover verwechseln (F4)

Bild **F4**: „Mit 2 Bohrlöchern“ ist nur mit der Maus berührt, sieht aber genauso grau aus wie die gewählte Kachel.
- **Hover:** nur ein leicht dunklerer Rand.
- **Gewählt:** dunkler Rand + Haken.
- Gilt für alle Kacheln: Befestigung, Material, Größe, Motive, Designs.

## 8. Motive (F5)

Bild **F5**:
- **5a:** Linienmotive („Herzlinie schlicht“, „Florale Zierlinie“) sind in der Kachel winzig. Jedes Motiv füllt die Kachel automatisch, also auf seine eigene Breite/Höhe eingepasst statt fester Skalierung.
- **5b:** siehe Punkt 4.
- **5c:** „Ebenenverwaltung (6)“ steht verloren unter allem. Bitte zu den Werkzeugen über dem Schild (Vollbild / Rückgängig / Wiederholen / Hilfe), Wortlaut „Ebenen (6)“. Auf dem Handy kommt sie in die Kopfzeile (siehe Punkt 9).
- **Bestseller:** Solange Bestseller-Motive laden, Platzhalter-Kacheln (grau, gleiche Größe) statt Leerfläche oder Springen.

## 9. Handy: Platz für das Schild (F7)

Bild **F7**:
- **7a:** Die Werkzeuge (Vollbild, Rückgängig, Wiederholen, Hilfe) haben eine eigene Zeile. Sie gehören als Symbole in die Kopfzeile neben „Entwurf speichern“; der Titel kürzt sich.
- **7b:** Das Schild ist nur ~45 % breit. Es soll ~90 % der Breite nutzen.

## 10. Hinweis-Pille (F8, F9)

- **F8 (Desktop):** „Dein letzter Stand wurde wiederhergestellt“ bricht in der Pille um. Bitte einzeilig „✓ Stand wiederhergestellt“ und nach ~4 s ausblenden.
- **F9 (Handy):** Es bleibt ein leeres ✓-Kästchen in der Kopfzeile stehen. Die Pille soll auf dem Handy denselben kurzen Text zeigen und danach ganz verschwinden.

## 11. Designs aller Formen und Größen (Entscheidung Chris)

- Kunden sollen Designs aller Formen und Größen sehen. Das ist `designSelection:'all-approved'`, bereits in PR #41.
- Wechselt der Kunde dabei auf ein anderes Produkt (andere Form/Größe), werden seine eingegebenen Texte übernommen, soweit die Felder passen.
- Der Preis und das Shopify-Produkt bzw. die Variante wechseln korrekt mit.
- Der Kunde bekommt einen kurzen Hinweis, wenn sich Größe oder Preis ändern („Neue Größe 15 × 10 cm – 24,99 €“).
- Bitte mit Bildern belegen: Wechsel auf ein Design anderer Größe, Texte bleiben erhalten, Preis passt, Warenkorb enthält das richtige Produkt.

## Reihenfolge (Vorschlag)

1. Preisregel (1), Prüfung Preismodus
2. Leiste über dem Schild + Schalter A/B (2), Vollbild-Kopf (3)
3. Griffe (6), Hover (7), ⓘ (4), Pille (10)
4. Handy-Platz (9), Motive (8)
5. Zoom (5)
6. Designwechsel über Formen/Größen (11)

Zum Schluss für jeden Punkt ein Vorher/Nachher-Bild 1:1 (Desktop + iPhone) im Bericht und die Testergebnisse. Die bekannten roten Tests auf `main` bitte getrennt ausweisen (neu kaputt vs. vorher schon rot).
