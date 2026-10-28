# Konfigurator: Nachtrag zu Auftrag 2 (PR #41) · 28.10.2026

Stand: 28.10.2026, Claude als Operator. Geprüft habe ich deinen Stand `d472ba4` drei Wege:

- **Linux-Vollauf:** **1760/1760 grün**. Zum Vergleich hat `main` (`f200509`) 1660/1667; die 7 bekannten Fehler sind auf deinem Stand behoben, neue Fehler gibt es keine.
- **Unabhängige Prüfung** von Preis- und Sicherheitsteil: kein Blocker.
- **Bedienung 1:1 im Live-Shop:** PR-Stand nur im Testbrowser eingespielt, Desktop 1440 × 900 und iPhone 13 mit **390 × 664**. 664 px ist die sichtbare Höhe in Safari, nicht 844.

Gute Arbeit. Desktop, Vollbild, Griffe, ⓘ, Motive, Hover und Zoom passen.

## Basis: zuerst meinen Merge übernehmen

Ich habe meine iPhone-Absicherung und das Entfernen leerer Zusatztexte mit deinem Stand zusammengeführt: Branch `dev/konfi-ux-ios-zusammen-20261028-claude`, Commit `87154ac`. Er baut direkt auf `d472ba4` auf.

- Bitte `87154ac` per Fast-Forward in `dev/konfi-ux-20261028-astra` übernehmen, nicht neu schreiben, und darauf weiterarbeiten.
- **Konfliktauflösung:** Aus dem Fenster kommen jetzt zwei Meldungen.
  - `gravuru-shop-ready` = Seite geladen; der Wächter in `shop-embed.mjs` geht aus.
  - Dein `gravuru-shop-editor-ready` = Editor bedienbar; die Fensterleiste wird ausgeblendet.
  - Bei `gravuru-shop-failed` bleibt die Leiste mit „Schließen“ sichtbar, und der Hinweis „Weiter warten / Neu laden / Ohne Fenster öffnen“ erscheint.
- Zwei Teststubs wurden dafür angepasst. Gezielte Tests: 70/70, Linux-Vollauf auf `87154ac`: **1762/1762 grün**.

Bild: [`konfi-ux-20261028-nachtrag/Pruefung-Auftrag2.jpg`](konfi-ux-20261028-nachtrag/Pruefung-Auftrag2.jpg). Oben ist der Desktop in Ordnung, unten links sind die zwei Handy-Punkte A und B markiert.

## N1 · Handy: Schild nur 55 % breit (Punkt 9 noch nicht erfüllt)

Gemessen im Live-Shop bei 390 × 664:
- `.stage` ist 225 px hoch, mit Innenabstand unten 60 px.
- `.plate-holder` ist 215 × 143 px.

Die Höhe begrenzt das Schild, deshalb kommen die 90 % aus deinem Bericht (bei 844 px Höhe) im echten Safari nicht an. Bild, Markierung A.

**Ziel:** Auf dem Handy nutzt das Schild ~90 % der Breite, auch bei 664 px sichtbarer Höhe, normal wie in den Schritten Text und Motive.
- Die Bühne darf dafür bis ~50 % der sichtbaren Höhe nutzen.
- Den unteren Innenabstand verkleinern. Die Zoom-Anzeige liegt ohnehin über der Bühne.
- Bitte bei 390 × 664 **und** 375 × 548 (iPhone SE in Safari) belegen.

## N2 · Handy: „100 % ⤢“ nur beim Zoomen zeigen

Unten rechts steht dauerhaft eine dunkle Anzeige „100 % ⤢“. Ohne Zoom hat sie keinen Zweck und verdeckt den Maßstab (Bild, Markierung B).

- **Handy:** Die Anzeige erscheint erst ab Zoom > 100 % und verschwindet nach „Ganzes Schild“ wieder.
- **Desktop:** Die Leiste mit −/+ bleibt sichtbar. Bitte so setzen, dass sie die Maßangabe „120 mm“ nicht überdeckt.

## N3 · Design-Galerie: Aufwand je Aufruf begrenzen (vor dem Livegang)

`GET …/design-gallery` geht bei **jedem** Aufruf und jeder Seite über alle aktiven Varianten des Stores.
- Wo: `shop-design-gallery.mjs` (Liste), `shop-product-binding-store.mjs` `listActive()` → `result()`, danach in der Galerie noch einmal `resolve()`.
- Je Variante läuft der volle Belegdigest doppelt, dazu `modelFor`, `quote` und `physicalGeometry`. Erst danach wird auf 40 Karten gekürzt.
- Mit den ~120 aktiven Funkklingel-Varianten und Materialbildern im Beleg blockiert das den Event-Loop. Davon sind auch Warenkorb-Übergaben anderer Kunden betroffen.
- Grenze heute: 240 Anfragen pro Minute und Sitzung. Neue Sitzungen gibt es über `start` billig.

**Bitte:**
- Ergebnisliste je Store + Zuordnungsstand + Produktrevision kurz zwischenspeichern (kleiner LRU, Ungültigkeit über die Revisionsköpfe).
- Kein doppeltes `resolve`.
- Die Vorschau-Begrenzung (2 gleichzeitig) auch serverseitig, z. B. eine Warteschlange je Prozess.
- Einen Lasttest mit ≥ 150 aktiven Bindungen beilegen: Antwortzeit erste Seite kalt/warm, Event-Loop-Verzögerung.

## N4 · Galerie: ein defekter Eintrag darf nicht alles sperren

`listActive()` fängt nur `shop_binding_cfg_changed` ab (`shop-product-binding-store.mjs` ~Z. 188). Eine Zeile mit `shop_binding_active_integrity` oder `shop_binding_document` wirft für **alle** Kunden 503.

**Bitte:** defekte Zeilen überspringen, serverseitig protokollieren (ohne Kundendaten) und mit Test belegen. Die exakte Auflösung beim Wechsel bleibt streng.

## N5 · Start: ungültiges `leiste` nicht ablehnen

`startParams()` (`shop-entry.mjs` ~Z. 157) liefert bei `?leiste=x` jetzt **422**. Das ist der live genutzte Startweg. Eine veraltete oder fremde Adresse darf den Kunden nicht aussperren.

**Bitte:** einen unbekannten oder mehrfachen `leiste`-Wert ignorieren (= Standard B), mit Test.

## N6 · Sitzung beim Designwechsel nicht verlängern

`design-switch` stellt eine neue Sitzung mit **voller** Laufzeit aus (`shop-entry.mjs` ~Z. 349). Durch Hin- und Herwechseln lässt sie sich beliebig verlängern.

**Bitte:** Die neue Sitzung übernimmt höchstens die Restlaufzeit der Quellsitzung, mit Test.

## N7 · Motivaufpreis im Live-Shop: Bericht, keine Änderung

- Neue Stände rechnen 169 Cent je zusätzlichem oder geändertem Motiv. Der Server verlangt dafür einen passenden Preisvertrag; ohne ihn kommt dein Hinweis „derzeit noch nicht bestellbar“.
- Hat eine bestehende Aufpreisbindung einen **anderen** Centwert, scheitert die Bestellung an der `extraMotifCents`-Prüfung. Das ist sicher, aber nicht bestellbar.

**Bitte nur lesen und berichten:**
- Welche Preisbindung hat D8 heute (Modus, Centwert)?
- Was passiert nach einer Bereitstellung beim Hinzufügen eines Motivs?
- Welcher Live-Schritt wäre nötig (z. B. Preisvertrag/Cart Transform für D8), damit 1,69 € wirklich bestellbar sind?

Keine Live-Änderung ohne Chris' Satz.

## Kleinigkeit

Prüfe bitte, ob `uxHidden`-Motive (vom Kunden ausgeblendet) in Fertigung und Export ebenfalls fehlen. In der Preiszählung fehlen sie (`contract.mjs` ~Z. 186). Beide Stellen müssen dasselbe Verhalten haben.

## Abschluss

- Wieder Vorher/Nachher-Bilder: Desktop 1440 × 900, Handy 390 × 664 und 375 × 548.
- Testergebnisse, `STATUS.md`, Bericht unter `docs/handoffs/`.
- PR bleibt Entwurf; nichts live ohne Chris' Satz.
