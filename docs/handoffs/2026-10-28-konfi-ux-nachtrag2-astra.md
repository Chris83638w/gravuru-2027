# Konfigurator: Nachtrag 2 zu PR #41 · 28.10.2026

Stand: Claude, geprüft auf deinem Stand `7ac1505`.

- **Linux-Vollauf:** **1771/1771 grün**.
- **1:1 im Live-Shop**, PR-Stand nur im Testbrowser: iPhone 13 (390 × 664) passt vollständig. Das Schild ist 90 % breit, „100 %“ erscheint erst beim Zoomen, der 2-Finger-Zoom funktioniert.
- **iPhone SE (375 × 548):** Das Schild ist 90 % breit, es gibt aber zwei Fehler (S1, S2).

Bild: [`konfi-ux-20261028-nachtrag/Pruefung-Nachtrag-Handy.jpg`](konfi-ux-20261028-nachtrag/Pruefung-Nachtrag-Handy.jpg), rechts das iPhone SE.

## S1 · iPhone SE: Text-Leiste überdeckt die Schrittleiste

Im Schritt „Text“ bricht die M2-Leiste in drei Zeilen um (Schrift/F/K · Ausrichten/Größe · Drehen/Löschen). Sie liegt dann über der Schrittleiste: Die Schritt-Nummern sind verdeckt, „19,99 €“ ist oben abgeschnitten.

**Ziel:**
- Die Leiste bleibt auch bei 375 × 548 höchstens zwei Zeilen hoch, z. B. Drehen/Löschen in die zweite Zeile.
- Sie liegt nie über der Schrittleiste und dem Preis. Wenn der Platz fehlt, schiebt sie den Inhalt nach unten und bleibt im Fluss.
- Bitte bei 375 × 548 und 390 × 664 belegen, jeweils mit ausgewähltem Text.

## S2 · Zwei Finger auf einem ausgewählten Text ändern die Schriftgröße

Auf dem iPhone SE lagen beide Finger über dem ausgewählten Text „Meyer“. Der Text wuchs von 10 auf 19 mm, statt dass die Ansicht zoomte. Auf dem iPhone 13 lagen die Finger neben der Auswahl, dort zoomte die Ansicht richtig. Mein Test hat beide Finger gleichzeitig aufgesetzt, wie es in der Praxis häufig passiert.

**Entscheidung (Operator):**
- Zwei Finger zoomen **immer nur die Ansicht**, auch über einem ausgewählten Element.
- Größe ändern nur über −/+ in der Leiste oder die Eckgriffe. Ältere Kunden merken eine versehentliche Größenänderung sonst nicht.
- Bitte mit Test: zwei gleichzeitige Berührungen auf einem ausgewählten Element → Ansichtszoom, Objektgröße unverändert.

## N7 · Ergebnis meines Lesezugriffs (nur gelesen, nichts geändert)

Gelesen am 28.10. ~18:20 über den Plesk-Dateimanager, gestreamt und nur im Browser durchsucht. Nichts heruntergeladen, keine Kundendaten ausgewertet.

- Gelesen: `private/acryl-employee-20261021-v1/data/workshop.sqlite` (570 MB) und `-wal`.
- Zur D8-Variante `57265913332092` gibt es drei Bindungsstände:
  - `binding_e193c120-…`
  - `binding_cc060d41-…`
  - `binding_1ac12e90-…`
- Ergebnis: **Kein einziger Preisvertrag** (`form_shop_binding_personalization` mit `gravuru-personalization-pricing/v1`) im gesamten Acryl-Speicher, auch nicht für D8. D8 läuft also ohne `shopify-cart-transform`.
- Der Live-Konfi zeigt „Motive sind im Preis enthalten“, der gebundene Produktstand hat also Motivaufpreis 0.
- Einschränkung: Das ist eine Bytesuche nach dem Schlüssel `extraMotifCents` hinter einer `binding_…`-ID, keine SQL-Abfrage.

**Folge:**
- Eine Bereitstellung des PR allein ändert für D8 nichts. Motive bleiben dort kostenlos, weil der gespeicherte Produktstand gilt.
- 1,69 € werden erst wirksam mit:
  1. einem neuen D8-Produktstand mit `motifCharge:'additional'` und 169 Cent,
  2. dem passenden Preisvertrag (Cart Transform) in Shopify,
  3. einer neuen Bindung.

**Bitte vorbereiten, nur als Probelauf:**
- Die konkreten Schritte und Befehle für D8.
- Die Prüfung, ob die Cart-Transform-Funktion im Shop installiert und aktiv ist. Die Gedenktafel nutzte sie im alten Speicher.
- Einen Rückweg.

Ausführen erst nach Chris' ausdrücklichem Satz.

## Abschluss

Bilder wie zuletzt, Tests, `STATUS.md`, Bericht. PR bleibt Entwurf, nichts live.
