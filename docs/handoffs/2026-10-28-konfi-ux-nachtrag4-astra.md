# Konfigurator: Nachtrag 4 – Zoom neu denken · 28.10.2026

Chris gefällt der heutige Zoom nicht. Der Kunde muss selbst zoomen, verschieben und zurückgehen, dazu kommt eine dunkle Anzeige. Für ältere Kunden ist das zu viel Bedienung. Entscheidung (Chris/Claude): **Der Konfi zoomt von selbst dorthin, wo der Kunde arbeitet, und hilft beim Ausrichten ohne Zoom.**

Vorlage 1:1 im Live-Konfi (iPhone 13, 390 × 664): [`konfi-ux-20261028-nachtrag/Handy-Zoom-Vorschlag.jpg`](konfi-ux-20261028-nachtrag/Handy-Zoom-Vorschlag.jpg). Links heute, Mitte Fokus, rechts Lupe und Hilfslinien.

**Reihenfolge:** zuerst Nachtrag 3 (Galerie), dann dieser Nachtrag. Beides auf `main` `0643c70`, eigener Branch `dev/konfi-zoom-fokus-20261028-astra`.

## Z1 · Fokus (Handy)

- **Auslöser:** Der Kunde tippt ein Element auf dem Schild oder dessen Textfeld in der Liste an. Die Ansicht fährt sanft hin (~250 ms, bei „reduzierte Bewegung“ ohne Animation).
- **Zoomstufe:** Das Element nimmt ~70 % der Bühnenbreite ein, höchstens 300 %. Ist es schon groß genug (≥ 50 % der Breite), wird nicht gezoomt.
- **Anzeige während des Fokus:**
  - Oben links eine kleine dunkle Pille „Fokus: <Feldname>“ mit dem Namen aus der Textliste.
  - Oben rechts ein weißer Knopf „⤢ Ganzes Schild“.
  - Keine Prozentanzeige, keine Mini-Karte.
- **Ende:** Tippen neben das Schild, „Ganzes Schild“, „Weiter/Zurück“ und das Abwählen fahren die Ansicht zurück. Ein Wechsel zu einem anderen Element fährt direkt dorthin.
- **Tastatur:** Bei offener Tastatur bleibt das bearbeitete Element sichtbar.
- **Desktop:** Kein automatischer Fokus, die Platte ist dort groß genug. Doppelklick (siehe Z4) und die kleine Zoomsteuerung reichen.

## Z2 · Lupe beim Ziehen (Handy und Desktop)

- Solange ein Element gezogen oder über einen Eckgriff skaliert wird, erscheint eine runde Lupe:
  - 110 px Durchmesser, 3-fach, mit feinem Fadenkreuz.
  - Sitzt ~50 px über dem Finger bzw. Mauszeiger. Am oberen Rand weicht sie seitlich aus.
- Sie zeigt den echten Plattenausschnitt (Material, Gravur), ohne Griffe.
- Beim Loslassen verschwindet sie sofort. Kein Einfluss auf Designkoordinaten, Druck-SVG oder Undo.

## Z3 · Hilfslinien mit mm (Handy und Desktop)

- Beim Ziehen rastet das Element ein:
  - an der Mitte der Platte, waagerecht und senkrecht;
  - an Mitte und Kanten anderer Elemente;
  - am Sicherheitsrand.
- Einrastweite ~1,5 mm auf der Platte, unabhängig vom Zoom. Das bestehende Einrasten bitte nutzen, nicht doppelt bauen.
- **Sichtbar:**
  - eine Linie;
  - eine kleine Beschriftung, z. B. „Mitte“ oder „bündig mit „Kerstin & Ralf““;
  - der Abstand zum nächsten Plattenrand in **mm** („15 mm zum Rand“), aus der echten Geometrie gerechnet.
- Farbe: ein Akzent, der sich klar vom grünen Auswahlrahmen und vom dunklen UI unterscheidet. In der Vorlage ist das Pink #e0457b; gern auch dein Vorschlag im selben Kontrast.
- Nur während des Ziehens sichtbar.

## Z4 · Doppeltippen / Doppelklick

- **Auf freier Plattenfläche:** Die Stelle wird auf 200 % vergrößert. Nochmal doppeltippen fährt aufs ganze Schild zurück.
- **Auf einem Text:** Das bleibt Bearbeiten wie heute, kein Zoom.

## Z5 · Was wegfällt bzw. bleibt

- **Handy:**
  - Die dunkle Anzeige „100 % ⤢“ und die Mini-Karte entfallen.
  - Zwei Finger zoomen weiterhin die Ansicht, wie in Nachtrag 2 festgelegt. Die Objektgröße ändert sich dabei nie.
  - Ist der Kunde von Hand gezoomt, erscheint oben rechts derselbe weiße Knopf „Ganzes Schild“.
- **Desktop:**
  - Statt der dunklen Leiste eine kleine **weiße** Steuerung im gleichen Stil wie „Ganzes Schild“: −, +, ⤢.
  - Sie überdeckt nicht die Maßangabe.
  - Das Mausrad bleibt.

## Abnahme

- **Tests:** Fokus rein/raus, Zoomstufe, Tastatur, Lupe ohne Seiteneffekte, Einrasten mit mm-Werten (z. B. gegen bekannte Plattenmaße 120 × 80), Doppeltippen frei vs. auf Text, „reduzierte Bewegung“.
- **Bilder 1:1:** iPhone 13 (390 × 664), iPhone SE (375 × 548), Desktop (1440 × 900). Jeweils: Fokus auf eine Zeile, Ziehen mit Lupe + Linie + mm, Doppeltippen, „Ganzes Schild“.
- Bei Touch-Belegen bitte ehrlich kennzeichnen, was synthetisch und was echtes Gerät ist. Chris testet am echten iPhone nach der Bereitstellung.
- `STATUS.md`, Bericht unter `docs/handoffs/`. Nichts live ohne Chris' Satz.
