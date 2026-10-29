# Konfigurator: Nachtrag 5 – Zoom vereinfachen (Entscheidung Chris) · 29.10.2026

Basis: deine PRs #42 (Galerie) und #43 (Fokus/Lupe/mm). Ich habe beide zusammen geprüft:

- Prüfstand: `dev/konfi-galerie-zoom-zusammen-20261028-claude`.
- Linux: **1801/1801 grün**.
- 1:1 im Live-Shop: Fokus, Lupe, mm-Hilfen und Doppeltippen funktionieren wie beauftragt ([`Zoom-neu-Pruefung.jpg`](konfi-ux-20261028-nachtrag/Zoom-neu-Pruefung.jpg)).

Chris hat den Zoom danach vereinfacht. Bitte auf **PR #43** umsetzen; PR #42 bleibt unverändert.

## Handy: Vergrößern nur mit zwei Fingern

- **Automatischen Fokus entfernen.** Antippen einer Zeile zoomt nicht mehr. Die Pille „Fokus: …“ entfällt.
- **Doppeltippen zoomt nicht.** Doppeltippen auf einen Text bleibt Bearbeiten, auf freier Fläche passiert nichts.
- **Zwei Finger** zoomen wie bisher die Ansicht; die Objektgröße bleibt unverändert, wie in Nachtrag 2 festgelegt.
- Ist gezoomt, steht oben rechts der weiße Knopf „Ganzes Schild“. Ohne Zoom gibt es keine Anzeige.
- **Bleibt:** Lupe beim Ziehen und Hilfslinien mit mm.

## Desktop: Zoom-Balken rechts und Mausrad

Vorlage, 1:1 im Konfi eingeblendet: [`Desktop-Zoombalken.jpg`](konfi-ux-20261028-nachtrag/Desktop-Zoombalken.jpg).

- **Senkrechter Zoom-Balken rechts neben dem Schild**, in der Bühne vertikal mittig:
  - Weiße Pille, 44 px breit.
  - Oben „+“, unten „−“, darunter die Prozentzahl.
  - Dunkelgrauer Regler #2f3437, Bereich 100–400 %.
  - Ziehen am Regler oder Klick auf +/− zoomt.
- **Mausrad** zoomt wie bisher zur Mausposition; der Balken läuft mit.
- **Platz:** Der Balken liegt nie über dem Schild und nie über den Maßangaben.
  - In der Vorlage ist das Schild dafür nur nach links verschoben, deshalb ist dort die Maßangabe „80 mm“ links abgeschnitten.
  - Richtig ist: Die Bühne reserviert rechts ~60 px, und das Schild wird entsprechend etwas schmaler, sodass beide Maßangaben vollständig sichtbar bleiben.
- „Ganzes Schild“ (⤢) erscheint nur, wenn gezoomt ist, z. B. als kleiner Knopf unter der Prozentzahl.
- **Entfällt am Desktop:** Doppelklick-Zoom und die waagerechte −/+/⤢-Leiste unten rechts.
- **Bleibt:** Lupe beim Ziehen und Hilfslinien mit mm.
- **Vollbild:** Der Balken sitzt ebenso rechts neben dem Schild.

## Abnahme

- Tests anpassen: kein Fokus beim Antippen, kein Doppeltipp-Zoom, Balken ↔ Mausrad synchron, Grenzen 100/400 %, Balken überdeckt nichts.
- Bilder 1:1:
  - Desktop (1440 × 900, normal und Vollbild, 100 % und gezoomt);
  - iPhone 13 (390 × 664) und SE (375 × 548): Zwei-Finger-Zoom mit „Ganzes Schild“, Ziehen mit Lupe.
- `STATUS.md`, Bericht. Nichts live ohne Chris' Satz. Danach stelle ich #42 und #43 gemeinsam bereit.
