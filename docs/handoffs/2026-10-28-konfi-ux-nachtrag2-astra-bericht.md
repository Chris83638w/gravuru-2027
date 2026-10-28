# PR #41 · Nachtrag 2 · Astra · 28.10.2026

**S1 und S2 umgesetzt; N7 ausschließlich als Probelauf vorbereitet. PR bleibt Entwurf. Nichts live geändert.**

Basis ist der unveränderte vorherige PR-Head **7ac150539279018308d9d938acb6515c8634afe7** einschließlich Claudes zuvor per Fast-Forward übernommener Zusammenführung **87154ac**. Auftrag: [Nachtrag 2 auf Claudes Branch](https://github.com/Chris83638w/gravuru-2027/blob/dev/konfi-ux-nachtrag-20261028-claude/docs/handoffs/2026-10-28-konfi-ux-nachtrag2-astra.md). Fortsetzung: dev/konfi-ux-20261028-astra, [PR #41](https://github.com/Chris83638w/gravuru-2027/pull/41).

Claude meldet **Linux 1771/1771** und passende iPhone-13-Ansicht für **7ac1505**. Das ist seine Prüfung des Vorgängerstands, keine Linux-Freigabe der hier ergänzten Änderungen.

## S1 · Zwei Zeilen, freie Schritte und freier Preis

Die bisherige mobile Flexleiste konnte drei Zeilen bilden und aus dem zu kleinen Vorschaucontainer über die feste Schritt-/Preisleiste hinausragen. Die Steuerelemente sind jetzt in zwei explizite Gruppen eingeteilt: Schrift/Stil/Ausrichten und Größe/Drehen/Löschen. Desktop nutzt dieselben Elemente unverändert. 44-px-Trefferflächen bleiben erhalten; zusätzliche Farbfelder scrollen innerhalb ihrer Zeile.

Der mobile Inhaltsbereich scrollt im Fluss oberhalb der Schritt-/Preisleiste. Die Textleiste liegt darin; sie kann nicht mehr über diesen Bereich zeichnen. Bei 375 × 548 und 390 × 664 beträgt ihre Höhe **99 px** statt drei Zeilen. Beide Steuerzeilen sind je 44 px hoch. Ausgewählter Text, Preis und Schritte sind in den Bildern gleichzeitig sichtbar. Plattenbreite bleibt 90 %. Vollbild 375 × 548 zusätzlich geprüft.

## S2 · Zwei Finger verändern ausschließlich die Ansicht

Die bisherige Erfassung bestand aus einzelnen PointerEvents. Gleichzeitige native Touch-Kontakte wurden nicht als eigener atomarer Ansichtszoom übernommen. Nun übernimmt ein TouchEvent-Batch mit zwei Kontakten im Schildbereich die Geste vor Objekt-/Fotobearbeitung; angefangene Objekt- oder Fotoaktionen werden auf ihren Ausgangszustand zurückgenommen. Kompatibilitäts-PointerEvents dürfen dieselbe Geste nicht nochmals bearbeiten. Ein Restfinger wird bis zum Ende der Geste geschluckt, ohne spätes Verschieben, Tippen oder Undo-Eintrag.

SVG-Neuzeichnen kann den ursprünglichen Touch-Zielknoten ablösen. Dessen Touch-Folge wird deshalb bis zum Ende weiter empfangen; danach werden die zusätzlichen Listener entfernt. Einzelnes Ziehen, Eckgriffe und −/+ bleiben nutzbar. Einzel-Finger-Fotoausschnitt bleibt erhalten; zwei Finger zoomen auch dort die Ansicht.

Vier neue Regressionstests scheitern auf dem alten Adapter (4/8 grün) und bestehen mit dem neuen Adapter (**8/8**): gleichzeitige Kontakte über „Meyer“, Abbruch eines begonnenen Eckgriffs, Fotobearbeitung mit unverändertem Ausschnitt, während der Geste abgelöster SVG-Knoten. Ein unbeteiligter weiterer Kontakt außerhalb der Platte hält den Editor nicht fest.

Zusätzlich der gebaute Browsercode auf allen drei Größen: zwei Kontakte in einem TouchEvent, SVG-Neuaufbau während der Berührung, Ansicht **100 → 190 %**, Schriftanzeige **10 → 10 mm**, Rohwert **10,32 → 10,32 mm**. Alle Objekte, Druck-SVG und Undo unverändert. Nur generierte SVG-Namespace-IDs werden für den Vergleich vereinheitlicht. Das ist ein **synthetischer Chromium-Touchtest**, kein physischer iPhone-/Safari-Test.

## N7 · D8-Probelauf und Rückweg

Claudes Plesk-Beleg ist übernommen: Bytesuche in Acryl-DB und WAL ohne gefundenen Preisvertrag, Motivaufpreis 0. Die Einschränkung „keine SQL-Abfrage“ bleibt ausdrücklich bestehen. Ein reines Code-Deployment würde diesen gespeicherten Produktstand nicht ändern.

[Konkreter Ablauf, Befehle, Cart-Transform-Prüfung und Rückweg](2026-10-28-d8-preis-probelauf.md). Zusätzlich **scripts/d8-pricing-dry-run.mjs** mit **4/4 Tests**: liest nur einen privaten lokalen JSON-Lesebeleg, besitzt keinen Netzwerk-/DB-Schreibzugriff und keinen Live-Modus. Es prüft exakte D8-/Shop-/App-Zuordnung, installierte und aktivierte Funktion, Tarif, vollständige Antworten, fehlenden bisherigen Preisvertrag sowie identischen Grundpreis. Vorschlag ausschließlich für neue Produktrevision, additional/169, Preisvertrag und neue Bindung; Original für Rückweg enthalten.

Aktueller tatsächlicher SQL-Lesebeleg mit vollen IDs/Kopfversion und aktuellem Funktions-Release fehlen. Der Probelauf wurde mit synthetischen Testbelegen geprüft; **kein tatsächlicher Live-Lesebeleg oder ausführbarer Aktivierungsauftrag erfunden**. Der einfache shop-bind-Pfad reicht für Personalization nicht; der Ablauf nennt die vorhandene serverseitige Vertragsprüfung und erwartete Kopfversion. Rückweg erhält unveränderliche Angebote/Bindungen und die globale Cart-Transform-Funktion.

## Tests

| Windows-Lauf | Gesamt | Grün | Fehler | Skips |
| --- | ---: | ---: | ---: | ---: |
| Editor vorher 7ac1505 | 400 | 394 | 6 | 0 |
| Editor Nachtrag 2 | 404 | 398 | 6 | 0 |
| Werkstatt vorher 7ac1505 | 1372 | 1207 | 158 | 7 |
| Werkstatt Nachtrag 2 | 1372 | 1207 | 158 | 7 |
| Gezielter Abschluss inklusive D8 | 67 | 67 | 0 | 0 |

Alle **6** Editor- und **158** Werkstattfehler stimmen nach Testnamen und normalisierter führender Fehlersignatur mit dem Vorgänger-Vollauf überein; keine neuen oder entfernten Fehler. Ursache weiterhin Windows-Python-Startalias (9009) und bekannte Folgefehler der Worker. Keine Assertion abgeschwächt, kein Test entfernt. Die 67 gezielten Tests überschneiden sich mit dem Editor-/Werkstattvollauf; nicht addieren. D8-Skripttests sind zusätzlich außerhalb dieser beiden Verzeichnisse enthalten.

Ausgeführt: node --test app/configurator/variant-m/*.test.mjs; node --test app/workshop/*.test.mjs; betroffene Zoom/Workflow/Photo/UX-Gruppen zusammen mit scripts/d8-pricing-dry-run.test.mjs. Neuer Build: **editor-5d78be16948aa18d.mjs**, 108 Module/14 Styles, 1.161.915 Bytes, gzip 380.289 Bytes.

## Belege und offene Punkte

[10 Bilder, Maße, Touch-Ergebnisse und Prüfsummen](konfi-ux-20261028-nachtrag2-astra/README.md): Desktop 1440 × 900, 390 × 664, 375 × 548, ausgewählter Text vor/nach Korrektur; zusätzlich kurzer Vollbildmodus und Touch-Ergebnis je Größe.

1. Claude: Linux-Vollauf des neuen Heads und gleichzeitige Zwei-Finger-Berührung über ausgewähltem Text auf echtem iPhone SE/Safari gegenprüfen.
2. Chris: Bilder abnehmen; Bereitstellung ausschließlich nach neuem ausdrücklichem Live-Satz.
3. N7: vollständige aktuelle SQL-/Shopify-Lesebelege und Funktions-Release prüfen, dann den privaten D8-Vorschlag erzeugen. Erst nach Freigabe neue Revision + Vertrag + Bindung aktivieren und reale Warenkorbpreise testen.
4. Die vorherigen N1–N6, Galerie-/Sitzungs-/Preisgrenzen und deaktivierte A/B-Verteilung bleiben erhalten. Keine Katalogdaten, Freigaben, Schriftdateien oder Live-Systeme verändert.

Kein Merge, Force-Push, Import, Deployment, Live-Preiswechsel oder neuer echter Warenkorbtest in diesem Auftrag.
