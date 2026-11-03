# Massenlauf Shop-Produkte (Issue 139) – Grabstecker als erste Linie

Claude als Operator, 02.11.2026 abends. Auftrag Chris (21:23): „Kannst du es mit den Grabsteckern einmal machen?“ – (21:28) „Kannst du es ihm mit einem Script beibringen?“ – Produktschnitt (21:39): „Ein Herz ist 10×10 mit Stiel, ein Herz ist 30×30 mit Stiel. Dann ist das die Zielgruppe Hund und unter Ausführung kann ich die Größe auswählen. Unter Designs kann ich dann nur Hundedesigns auswählen.“ [Design-Master](https://github.com/Chris83638w/gravuru-katalog./blob/main/designs/DESIGN-MASTER.md) gilt unverändert; es werden nur freigegebene, textführende Katalogdesigns verwendet.

## Was neu ist

| Datei | Zweck |
| --- | --- |
| `scripts/shop-schnitt-plan.mjs` | **Ein Lauf plant alle Produkte einer Linie**: je Form × Zielgruppe (`--form`) bzw. Größe × Zielgruppe; schreibt je Produkt `review-config.json` (native Konfi-Konfiguration), `plan.json`, `product-set.json` (Shopify-ProductSetInput, DRAFT, Vorlage `konfi`, Metafeld `custom.gravuru_product_cut`, Preise aus der Familie, SKU = Größe + Zielgruppe) und eine `summary.json` mit Dublettenprüfung (gemeinsame Fünfwortfolgen, gleiche Titel/SEO-Felder, doppelte Handles). Lädt nichts hoch. |
| `scripts/shop-inhalte/grabstecker-edelstahl.mjs` | Entwurfstexte (Baukasten). Für den Shop gelten die Texte aus `--texte=<texte.json>` (je Produkt einzeln formuliert, Dublettenprüfung bestanden). |
| `scripts/hauptbild-kontur.py` | Hauptbild aus der echten Katalog-Kontur mit ganzem Stiel + Edelstahltextur + Gravur, WebP 2000×2000, kein KI-Bild. |
| `app/workshop/shop-product-cut.mjs` | Produktschnitt kennt optional `zielgruppe` (nur Designs dieser Zielgruppe) und `groessenWahl:"form"` (alle Größen derselben Form wählbar, `sizeKey` = Startgröße). Bestehende Schnitte unverändert gültig. |
| `app/workshop/katalog-family-formats.mjs`, `app/configurator/variant-m/family-formats.mjs` | Familie `grabstecker-edelstahl` und ihre 13 Kopfformen als Familienformat zugelassen; Grabsteckerformen erscheinen nur in Grabstecker-Konfis; Größenwahl je Form ohne AB-12×8-Pflicht. |

Katalog: neue Linie `linien/grabstecker-edelstahl.json` (Unterkategorie `andenkenschilder`, Collection `grabstecker-edelstahl`).

## Ergebnis Grabstecker (Trockenlauf)

102 Produkte = 13 Formen × passende Zielgruppen (Mensch allgemein, Mama, Papa, Oma/Opa, Sternenkind, Hund, Katze, Haustier, christlich, jüdisch, islamisch; Pfote/Katze/Herz mit Pfote nur Tiere, Kreuz/Engel nur Menschen – so wie die Designs im Katalog liegen). Je Produkt Option „Größe“ (z. B. Herz S 18,99 €, M 29,99 €, XL 42,99 €), nur die Designs der Zielgruppe (10 je Größe), Startdesign = kleinste Designnummer der Zielgruppe in der mittleren Größe. „Befestigung: Ohne Bohrung“ wird im Shop ausgeblendet (einwertige Option).

## Ablauf für Astra 1 (Server) – einmal je Linie, keine Handarbeit je Produkt

1. `git pull` Code + Katalog (main).
2. Plan bauen:
   `node scripts/shop-schnitt-plan.mjs --katalog=<katalog> --linie=grabstecker-edelstahl --unterkategorie=andenkenschilder --form --ohne-formen=GS-INFINITY --texte=<texte.json> --output=<neuer ordner>`
   (Unendlichkeit zurückgestellt: Startdesigns liegen schlecht auf der Form, „Oma“ oben links, Daten winzig – Claude prüft die Designs neu.)
   → `summary.json` prüfen: `blockiert`, `offen`, `doppelteHandles` = 0; Dubletten-Maximum im Bericht.
3. Hauptbilder: je Produkt `python3 scripts/hauptbild-kontur.py --svg <katalog>/designs/<reihe>/<startDesign>/design.svg --material <Edelstahl-Textur> --schnitt <katalog>/schneidvorlagen/grabstecker/grabstecker.json --schnitt-key <sizeKey ohne GS-V2A-> --out <ordner>/<handle>/<imageFile>` (Innenausschnitte Pfote/Engel/Kreuz werden ausgestanzt).
4. Je Produkt in einer Schleife (so wie heute bei D8/D10, aber skriptgesteuert):
   a) `review-config.json` als native Konfiguration importieren (Werkstatt-DB, vorher SQLite-Sicherung),
   b) `productSet` mit `product-set.json → input` (DRAFT), Bild mit `alt` hochladen, Collections `grabstecker` + `grabstecker-<zielgruppe>` (anlegen, falls fehlend, und im Onlineshop veröffentlichen),
   c) Varianten binden über `variantSources` (sizeKey/mounting → Shopify-Variante) mit Preisvertrag, Katalog-Bestellfreigabe.
5. Lauf-Bericht in #139: **Neu angelegt: X · überarbeitet: 0 · gesamt live: Z**, Liste der Handles, 5 Stichproben-Screenshots (Galerie nur Zielgruppe, Größenwahl, Preis, Warenkorb).
6. Nach Claudes Stichprobe: alle auf ACTIVE + Onlineshop-Veröffentlichung, Navigation „Andenken & Grabschmuck → Grabstecker“.

## Offen / Grenzen

- Konfi-Ladezeit: eine Grabstecker-Konfiguration ist trotz nur 30 Designs ~12 MB, weil Schriften (~9,5 MB) und die Materialtextur (~1,9 MB) eingebettet sind. Gehört in Astra 1s Ladezeit-PR (Ressourcen als zwischengespeicherte Dateien statt eingebettet).
- Server-Import der Produktschnitt-Felder `zielgruppe`/`groessenWahl` ist in diesem PR nur im Planer umgesetzt; falls der Server die Konfiguration aus dem Metafeld neu plant, muss er dieselbe Funktion nutzen (tut er, wenn er `planFamilyFormats` aufruft).
- Innenausschnitte (Herz mit Pfote, Engel, Infinity, Kreuz) – Darstellung laut #48 bei Astra 1.
