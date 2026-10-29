# Übergabe: neuer Chat „Produktanlage“ (29.10.2026)

Von: Claude (Operator Konfi). An: Claude (Operator Produktanlage).

## Warum ein eigener Chat
Chris will den Konfi abschließen und die Produkte hochladen. Bisher hat ein einziger Operator-Chat alle Linien betreut, das hat bei den anderen KIs einen Stau verursacht. Ab jetzt gibt es zwei Operator-Chats:

| Chat | Zuständig |
|---|---|
| **Konfi** (bisheriger Chat) | Konfigurator-Code, PR #42/#43 und alle weiteren Konfi-PRs, Linux- und 1:1-iPhone-Prüfung, Deploy in Plesk (nur mit Chris' Satz), Astra 1 |
| **Produktanlage** (neu, Du) | Katalog-Repo, Familien/Preise/Größen, Shopify-Produkte und Bindungen je Linie, Funkklingeln, Türschilder, Hausnummern, Themen-Designs, alle KIs dafür |

Braucht die Produktanlage eine Konfi-Änderung (z. B. Acryl-Familienadapter), meldet sie das als Issue mit Label `konfi`; der Konfi-Chat übernimmt.

## Feste Regeln von Chris (gelten unverändert)
- Antworten auf Deutsch, „Chris“, Du-Form, kurz. Du bist der Boss: selbst entscheiden, ihm widersprechen, wenn er falsch liegt.
- **Live-Systeme (Shopify, Amazon, Plesk): nur lesen/exportieren.** Kein Import, kein Upload, keine Shopify-Mutation durch den Operator. Uploads macht der Upload-Account bzw. Chris nach seinem ausdrücklichen Satz im Chat, mit Zählern (siehe `AGENTS.md`).
- Nichts löschen ohne vorherige Ankündigung. Firmenserver V:/Y: nur neue Dateien.
- Keine Geheimnisse in Repo, Chat oder Logs; keine Passwörter eingeben.
- Signierte Commits (`-S`), Merges `--no-ff -S`, je Arbeit ein Branch `dev/<thema>-<datum>`; je neuem Branch `git config --add remote.origin.fetch '+refs/heads/<b>:refs/remotes/origin/<b>'`.
- Befunde vorher an der Quelle prüfen. Zu Fehlern immer Screenshots; Vorschauen 1:1 im echten Konfi.
- Größen-/Preislisten nach skalierbaren Reihen ordnen; **Quadrat bleibt Quadrat**, nie Rechteck.
- „sammeln“ heißt: nur sammeln, nicht umsetzen.

## Kommunikation mit den anderen KIs: Postfach-Issues
Chris kopiert keine langen Texte mehr. Jede KI hat ein Issue „Postfach <Name>“ in `gravuru-2027`; Nachrichten kommen als Kommentar (nummeriert „Nachricht N“), die KI antwortet dort. Chris schickt der KI nur: „Neue Nachricht für dich in Issue #NN.“ Neue Postfächer legst Du bei Bedarf an. Warten auf Antwort: Kommentarzahl per `gh api repos/Chris83638w/gravuru-2027/issues/NN/comments` im Hintergrund abfragen.

## Stand je Linie (29.10.2026, 11:30)

### Hausnummern AA/AS/S/S (Astra Mika = Astra 3) → **Issue #45**
- Katalog-Repo `gravuru-katalog.`, Branch `dev/hausnummern-preise-20261029-astra3`, Stand `c5b0e29` (signiert).
- Geprüft: je Familie 33 Excel-Größen + 21 Hochformate (`-H`, nur Rechteck/R5/eingezogene Ecken, keine Quadrate/Ovale) = 54; 162 Preise = Excel, S/S = +2 €; 4er-Set nur bei „ja“; Gruppe `QU – Quadrat`; Halter Edelstahl Standard, Schwarz/Weiß Aufpreis, Rosé/Gold nicht im Sortiment.
- **Offen:** Nachricht 5 – 4er-Set Schwarz/Weiß muss +2 € sein (2er +1 €); heute pauschal +1 €. Danach PDF-/PNG-Katalog neu bauen (`build-katalog.py`, `cairosvg` ist hier vorhanden) auf eigenem Branch, dann Merge in Katalog-`main`.
- Auftrag/Referenz: `gravuru-2027` Branch `dev/hausnummern-abstandshalter-20261029-claude`, `docs/handoffs/2026-10-29-hausnummern-abstandshalter-auftrag.md` (+ Fotos, Preis-Excel).
- Konfi-Teil fehlt noch (Issue an Konfi-Chat): `product-families.mjs` `FAMILY_MATERIALS.acrylic.adapter === null`, S/S-Rückplatte und Abstandshalter in der Vorschau.

### Türschilder Acryl/Edelstahl → **PR #44** (`dev/tuerschilder-anbindung-20261029-astra`, `49d6cbe`)
- Heute ist nur D8 gebunden (Konfi-Start über Theme-Section + Metafeld `custom.customization_id`).
- Auftrag: `dev/tuerschilder-anbindung-20261029-claude`, `docs/handoffs/2026-10-29-tuerschilder-anbindung-auftrag.md` (inkl. Liste Handle ≠ Titel, z. B. „Katze“ ↔ `…-hund-silhouette-8x5`).
- **Offen:** PR #44 (Bestandsbericht + Pilotplan) ist noch nicht geprüft → zuerst prüfen. Postfach-Issue für diese KI anlegen.
- D8-Motivaufpreis 1,69 € (Vorlagenmotiv inklusive, ersetztes/zusätzliches Motiv 1,69 €): Byte-Scan von `workshop.sqlite` fand **keinen** Preisvertrag (`gravuru-personalization-pricing/v1`). Neue Revision + Preisvertrag + Bindung = eigener Live-Schritt mit eigenem Satz von Chris.

### Funkklingeln (AOSU)
- 6 AOSU-Produkte aktiv, je 120 Varianten; Produktseiten haben **keinen** Konfi-Start. 2 Hochformat-Produkte ohne `customization_id`. Status des Live-Bestellschalters unbekannt (Plesk-Sitzung abgelaufen).
- Live erst, wenn PR #42 (Galerie je Linie / gleiches Klingelmodell) live ist – das macht der Konfi-Chat – und mit Chris' Satz.
- Unterlagen: `docs/handoffs/2026-10-27-funkklingeln-*.md`, Skript `scripts/doorbell-pilot-bind.mjs`. Die Funkklingel-KI sollte einen nur lesenden Plan liefern; Bericht steht aus → Postfach-Issue anlegen.

### Themen-Designs (andere KIs)
- Auftrag `dev/designs-themen-20261029-claude`, `docs/handoffs/2026-10-29-designs-themen-auftrag.md`: Hochzeit, Hunde („Hier wohnen …“, „Achtung …“), Andenken ohne Foto, Hinweisschilder allgemein; Edelstahl und Acryl; je Thema 2 Hauptprodukte und 20 Designs, Motive aus Bibliothek + neu. Zuerst 5 Muster je Thema. Berichte stehen aus.
- Preisregel: Vorlagenmotiv im Preis, ersetztes/zusätzliches Motiv 1,69 €. Galerie zeigt nur die eigene Linie.

## Werkzeuge
- Shop-Abgleich nur lesend/vorbereitend: `scripts/shop-export.mjs`, `shop-sync.mjs`, `shop-bind.mjs` (siehe `scripts/SHOP-SYNC.txt`).
- Bindungsdaten: `shop_product_binding_revisions`, `form_shop_bindings`, `form_shop_binding_personalization` im Werkstatt-Store.
- Live-Prüfung ohne Login: `https://app-2027.gravuru-designwerkstatt.de/api/workshop/session` → 401 ist gesund; Produktseiten enthalten `#gravuru-konfi` / `data-gravuru-start`.

## Erster Schritt im neuen Chat
1. `AGENTS.md`, `STATUS.md` (oben) und diese Datei lesen.
2. Issue #45 und PR #44 lesen, Stand an der Quelle prüfen.
3. Chris einen kurzen Plan geben: welche Linie zuerst online geht (Vorschlag: D8-Türschilder-Pilot und Funkklingeln, sobald PR #42 live ist), was dafür fehlt und welche Sätze von ihm nötig sind.
