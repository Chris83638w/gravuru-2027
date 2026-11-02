# AE-Türschilder – Bericht (Stand 02.11.2026)

Auftrag Issue #131, Design-Master inkl. §7 (02.11. Freiflächen). Katalog-Branch `dev/ae-tuerschilder-20261102`, Code-Branch gleichnamig.

## Ergebnis

- Familien `ae-tuerschilder-schwarz`/`-anthrazit`: 48 Größen (RE 17, QU 6, OV 10, EL 5, R 3, RT1 7). AB und Grenzgrößen offen.
- **914 Master** in 41 AE-Formatreihen, Ziele schwarz + anthrazit, keine Freigabe. Native Zielprüfung: **914/914 „passt“, 2140 Größenprüfungen** (beide Farben).
- Schritt 1 (je Größe × Unterkategorie mind. 1): D24 Familien, D602 Hausnummern (AA/AS), D200 Willkommen, D110 Hunde, D140 Katzen, D401 Andenken, D66 Hochzeit, D73/D72 Hinweis, D74 Firmen, D26 Namens.
- Schritt 2 (aufgefüllt): D52, D6, D5, D202, D203, D29, D141, D406, D410, D67, D37, D604, D605 (nur Langformate), D72, D75.
- **Offen:** Pferde (kein freigegebenes Design, #114); Firmen in Langformaten (D74 ist runder Stapel); AB/Grenzgrößen (Fragen); weitere freigegebene Designs (Familien ~90, Namens ~60 je Reihe) – Skript kann sie jederzeit nachziehen.

## Vorgehen (Skripte `scripts/ae-tuerschilder/`)

1. Quelle = freigegebener Edelstahl-Master derselben Edelstahlgröße (12×8 → TRE-V2A-8x5-Dn …); Hausnummern aus AA/AS/SS, Firmen D74 aus Rund.
2. Ein Maßstab für alle Elemente (Motiv unverzerrt), Gruppe mittig, vergrößert bis zur Füllgrenze (Rechteck 88 % × 80 %, höchstens ×1,45).
3. Breitere Acrylplatte: Elemente nebeneinander proportional auseinander (Textausrichtung bleibt; Oval höchstens ×1,15); Querformat unter 48 % Höhe: Zeilenabstände maßvoll gestreckt.
4. Prüfungen wie im Konfi (Textkasten, Motivkasten, Oval/Kontur), Texte < 3 mm auf 3 mm, Schrift ≤ 100 mm auch in der größten Größe.
5. Linien bis an den Rand: nur Länge angepasst, bei Oval/Retro bis zur Form.
6. Ergebnisse mit dünner Einzelzeile auf hoher Platte bzw. Fläche < 20 % entfernt (§7) – siehe unten.

Kennung `<Form>-AV2A-<Edelstahlmaß cm>-D<n>` (D-Nummer der Quelle). Bestandsbögen `TRE-AV2A-12x8(10x6)`/`9x6(7x4)` (eigene Nummerierung) noch nicht übernommen – Entscheidung Claude.

## Kontaktbögen (Konfi-Vorschau Acryl schwarz, Edelstahlrahmen ergänzt, Vorlage daneben, ohne Bohrlöcher)

- [bogen-s1-D110.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D110.jpg?raw=true)
- [bogen-s1-D140.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D140.jpg?raw=true)
- [bogen-s1-D200.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D200.jpg?raw=true)
- [bogen-s1-D24.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D24.jpg?raw=true)
- [bogen-s1-D26.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D26.jpg?raw=true)
- [bogen-s1-D401.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D401.jpg?raw=true)
- [bogen-s1-D602.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D602.jpg?raw=true)
- [bogen-s1-D66.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D66.jpg?raw=true)
- [bogen-s1-D73.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D73.jpg?raw=true)
- [bogen-s1-D74.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s1-D74.jpg?raw=true)
- [bogen-s2-D141.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D141.jpg?raw=true)
- [bogen-s2-D202.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D202.jpg?raw=true)
- [bogen-s2-D203.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D203.jpg?raw=true)
- [bogen-s2-D29.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D29.jpg?raw=true)
- [bogen-s2-D37.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D37.jpg?raw=true)
- [bogen-s2-D406.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D406.jpg?raw=true)
- [bogen-s2-D410.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D410.jpg?raw=true)
- [bogen-s2-D5.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D5.jpg?raw=true)
- [bogen-s2-D52.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D52.jpg?raw=true)
- [bogen-s2-D6.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D6.jpg?raw=true)
- [bogen-s2-D604.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D604.jpg?raw=true)
- [bogen-s2-D605.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D605.jpg?raw=true)
- [bogen-s2-D67.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D67.jpg?raw=true)
- [bogen-s2-D72.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D72.jpg?raw=true)
- [bogen-s2-D75.jpg](https://github.com/Chris83638w/gravuru-2027/blob/dev/ae-tuerschilder-20261102/docs/handoffs/ae-tuerschilder-20261102/bogen-s2-D75.jpg?raw=true)

## Inventur: Designs je AE-Formatreihe × Unterkategorie

| Reihe (Acryl mm) | famili | hausnu | willko | hundes | katzen | andenk | hochze | hinwei | firmen | namens | pferde |
|---|---|---|---|---|---|---|---|---|---|---|---|
| re-70x40 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-100x60 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-130x80 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-140x50 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-160x40 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-160x100 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-190x50 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-190x120 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-220x60 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-220x140 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-220x85 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-250x70 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-280x180 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-300x120 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-380x155 | 10 | 3 | 3 | 2 | 2 | 3 | 2 | 2 | – | 9 | – |
| re-400x260 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| re-430x280 | 10 | 2 | 3 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| qu-80x80 | 10 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-70x40 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-100x60 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-130x80 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-130x60 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-160x100 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-190x120 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-205x100 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-220x140 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-280x140 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| oval-280x180 | 9 | 1 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| ellipse-160x40 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | – | 9 | – |
| ellipse-190x50 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | – | 9 | – |
| ellipse-220x60 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | – | 9 | – |
| ellipse-250x70 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | – | 9 | – |
| ellipse-280x80 | 9 | 3 | 4 | 2 | 2 | 3 | 2 | 1 | – | 9 | – |
| rund-100x100 | 10 | 2 | 4 | 2 | 2 | 3 | 2 | 2 | 1 | 9 | – |
| retro1-70x40 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-100x60 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-130x80 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-160x100 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-190x120 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-220x140 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |
| retro1-280x180 | 9 | 2 | 4 | 2 | 2 | 3 | 2 | 1 | 1 | 9 | – |

## Entfernt / ausgelassen (begründet)

- TQ-AV2A-10x10-D73: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR-AV2A-12x12-D73: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-9x6-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-12x8-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-15x10-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-18x12-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-21x14-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-24x16-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-30x20-D602: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- ae-tuerschilder-re-160x40: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-190x50: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-220x60: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-250x70: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-140x50: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-220x85: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-300x120: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-re-380x155: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-ellipse-160x40: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-ellipse-190x50: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-ellipse-220x60: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-ellipse-250x70: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- ae-tuerschilder-ellipse-280x80: ausgelassen: Langformat braucht eigene Anordnung (Quelle rund)
- TRE-AV2A-9x6-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-12x8-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-15x10-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-18x12-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-21x14-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-24x16-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-30x20-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-42x28-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TRE-AV2A-45x30-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TQ-AV2A-10x10-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR-AV2A-12x12-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-9x6-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-12x8-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-15x10-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-18x12-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-21x14-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-24x16-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-30x20-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-22.5x12-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TO-AV2A-30x16-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-9x6-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-12x8-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-15x10-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-18x12-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-21x14-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-24x16-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig
- TR1-AV2A-30x20-D605: entfernt: dünne Einzelzeile/zu wenig Fläche (§7) – eigene Anordnung nötig

## Messung Freiflächen

Alle Gruppen mittig (Versatz 0 %). Werte je Design in `design.json` → `flaeche`. Unter 30 % Fläche bleiben nur: Ellipsen 4:1 mit Motiv über dem Namen (D24, D26, D6) und einzelne Hausnummern 42×28/45×30 (Konfi-Grenze Schrift 100 mm).

## Selbstprüfung

- Jeden Bogen angesehen. Behoben: zerrissene Hausnummer im Oval, Textkasten/Motivkasten über Rand (Konfi-Kastenprüfung), Schrift > 100 mm, Randlinien in Retro/Oval, dünne Einzelzeilen entfernt.
- Grenzen: sehr breite Ellipsen wirken bei Stapel-Designs leer; RT1 9×6 hat durch die 10-mm-Parallelkontur fast eckige Acrylecken; der Edelstahlrahmen im Bogen ist von mir gezeichnet (Konfi zeigt ihn noch nicht, #48).
