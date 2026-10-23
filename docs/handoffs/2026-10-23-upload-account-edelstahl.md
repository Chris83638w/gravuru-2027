# Übergabe an den Upload-Account · Edelstahl-Türschilder nach Shopify · 23.10.2026

Für: der zweite Claude- bzw. ChatGPT-Account, der Shopify-Uploads ausführt (Chris: „ein anderer Account lädt die Produkte hoch“). Der Operator-Account (dieser Chat) lädt nichts hoch; er liefert Plan, Skripte und diesen Ablauf. **Jeder Schreibzugriff auf Shopify braucht die ausdrückliche Freigabe von Chris im jeweiligen Chat.** Keine Geheimnisse (Tokens, Pfade mit Zugangsdaten) in Repo, Chat oder Protokoll.

## Was feststeht (Chris 23.10.2026)

Katalog → Design-Dashboard (manuelle Prüfung, Freigabe je Design) → Shopify. Neue Produkte werden neu gelistet; bestehende nur aktualisiert, wenn sich das Design geändert hat. Alles bleibt jederzeit im Dashboard/Katalog bearbeitbar.

Technisch ist das umgesetzt in `main` (gravuru-2027) und Branch `dev/bestand-edelstahl-neu-20261023` (gravuru-katalog.):

| Schritt | Werkzeug | Stand |
| --- | --- | --- |
| Hauptprodukte je Unterkategorie | `linien/edelstahl-tuerschilder.json` (96 Einträge, `externalIds.customizationId/sku/shopifyProductId`) | im Katalog, Branch oben |
| Freigabe je Design | `/werkstatt/designs/` (Ampel + Button „Freigeben“, schreibt `design.json.freigabe`) | Code auf dem Host (c929cf3); braucht dort einen verbundenen Katalog (siehe Voraussetzungen) |
| Katalogseite | `/werkstatt/katalog/` liest/bearbeitet `linien/*.json` | wie oben |
| Werkstatt-Import (Vorlagen je Größe) | `node scripts/katalog-import.mjs --katalog <pfad> --linie edelstahl-tuerschilder --unterkategorie familienschilder,hinweisschilder --dry-run` → `--commit` nur mit Freigabe | Dry-run 23.10.: 584 Produkte, 87 gesperrt (60-Vorlagen-Grenze, fehlende Schriften) |
| Shop-Export (lesend) | `node scripts/shop-export.mjs --out <ordner>` auf dem Host | Vollexport vom 23.10. vorhanden (1 240 Produkte) |
| Shop-Abgleich | `node scripts/shop-sync.mjs --katalog <pfad> --linie edelstahl-tuerschilder --export <products.json> --out <plan.json>` → Plan prüfen → `--apply [--create]` | Spec `scripts/SHOP-SYNC.txt` |
| Bindung Konfi ↔ Shop-Variante | `node scripts/shop-bind.mjs …` nach dem Abgleich | Spec `scripts/SHOP-SYNC.txt` Abschnitt 3 |

Regeln im Abgleich (shop-sync): nur Hauptprodukte mit **freigegebenem** Startdesign werden geplant (sonst „offen“); Metafeld `custom.design_sha256` hält den Design-Stand; bestehende Shop-Produkte werden nur angefasst, wenn sich der Stand geändert hat (`--daten-aktualisieren` erzwingt Datenupdates); `--alle-designs` nur für Tests. Produkte ohne Shop-Treffer werden nur mit `--create` als DRAFT angelegt (ohne Texte/Bilder – Texte kommen aus den gravuru-Matrixify-Skills).

## Voraussetzungen, die noch fehlen (Reihenfolge)

1. **Katalog auf dem Host** (Operator oder Chris): zweites Plesk-Git-Repo `gravuru-katalog.` (Deploy-Key wie beim Code-Repo) nach `/private/gravuru-katalog`, dann in `gravuru-2027-merchant/app.cjs` die Umgebungsvariable `GRAVURU_KATALOG=/var/www/vhosts/gravuru-designwerkstatt.de/private/gravuru-katalog` setzen, App neu starten. Erst dann zeigen `/werkstatt/designs/` und `/werkstatt/katalog/` die Katalogdaten (sonst 503 „Kein Katalog verbunden“ bzw. der eingebaute Stand).
2. **Katalog-Branch nach `main` mergen** (Operator, nach Dry-run-Prüfung durch Chris): `dev/bestand-edelstahl-neu-20261023` → `main` im Katalog-Repo.
3. **Freigaben durch Chris im Dashboard** – ohne freigegebene Designs plant shop-sync nichts („offen“). Die 40 Edelstahl-Designs des lokalen Testlaufs werden noch bearbeitet (Chris: „nein, bearbeiten wir noch“).
4. **Entscheidungen Chris**: 60-Vorlagen-Grenze je Produkt (8 Größen liegen bei 62–74); Schriftdateien (Fineliner Script, Comic Sans MS, ParmaPetit, Welcome – 50 Designs ohne); Retro 1/2 (14 Größen) und Grundpreise Rund 8,5/12/16/20 (siehe `familien/edelstahl/quellen/edelstahl-serie-2027-abgleich.md`); 40 Grundpreise aus Chris’ Excel (21.10.) sind jetzt im Katalog – vor dem ersten `--daten-aktualisieren` bestätigen.

## Ablauf für den Upload-Account (wenn 1–3 erledigt sind)

1. Auf dem Host: `shop-export.mjs` frisch laufen lassen (lesend), `products.json` sichern.
2. `shop-sync.mjs` Dry-run (ohne `--apply`), `plan.json` an Chris: Zähler je Aktion (create/update/unverändert/offen/konflikt) + Liste der „offen“/„konflikt“-Gründe.
3. Freigabe von Chris im Chat (wörtlich, mit Zählern). Dann `--apply` (Update bestehender Produkte) bzw. `--apply --create` (neue DRAFT-Produkte); Journal `<plan-ordner>/.shop-sync-journal/` aufbewahren.
4. Texte/Bilder für neue DRAFT-Produkte: gravuru-Matrixify-Skills (Titel, Body, Stichpunkte, SEO, Tags, Collections) – eigener Dry-run + Backup-Export (Skill 18) vor jedem Matrixify-Import, Freigabe Chris.
5. `shop-bind.mjs` (Bindung Konfi-Varianten ↔ Shop-Varianten) nach erfolgreichem Abgleich; Ergebnis prüfen.
6. Erst danach Shop-Einstieg: App-Proxy + Theme-Block laut `ops/shopify/SHOP-EINSTIEG.md` (App-Version ohne Release, Theme-Kopie, Freigabe Chris; `customerIntegration.shopEntry` auf dem Host einschalten).
7. Testbestellung (bezahlt) für ein Edelstahl-Hauptprodukt; Ergebnis mit Bestellnummer in `STATUS.md` (gravuru-2027) eintragen.

Jede Aktion: ein Absatz in `STATUS.md` (Datum, Account, Kommando ohne Geheimnisse, Zähler, Freigabe von Chris zitiert). Fragen/Entscheidungen als GitHub-Issue in `gravuru-2027` (Label `entscheidung`).
