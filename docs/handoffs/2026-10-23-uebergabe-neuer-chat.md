# Übergabe an den nächsten Chat · 23.10.2026 06:30

Kontext: Chris (Inhaber gravuru GmbH) hat Claude zum Operator des Projekts gravuru 2027 gemacht („Du machst alles“, Freigaben für Shopify-Schreibzugriffe liegen vor; Codex ist abgesetzt). Ziel: ein stabiler Konfigurator für alle Materialien, Produkte aus dem Katalog schnell nach Shopify, „Jetzt personalisieren“ muss sofort den richtigen Konfi öffnen. Regeln: Katalog-JSON ist die Quelle, nichts erfinden, stabile IDs, keine Secrets/privaten Pfade in Git, kurz und verständlich mit Chris sprechen (Du, „Chris“), vor Löschen informieren, Massenarbeit per Skript.

## Stand `main` (GitHub, 2333828, 1138/1138 Tests)

- Zusammenführung aller Branches (Codex-Übergabe, Hauptprodukte 7x2, CDR-MCP) → `main`; lokaler Worktree `/home/claude/gravuru-2027-codex` auf `integration/main-20261022` (= main).
- Editor-Korrekturen gemergt (e6b6403): Foto-/Logo-Reiter nur bei Foto, Befestigungskacheln mit Icon + Aufpreis, Bohrloch-Kundenhinweis entfällt, freie Farbe beim Farbdruck, neues Element immer auf freiem Platz (Text 3 mm, Motiv 10 mm = Setzung Claude). Sichtprüfung im Browser steht aus.
- `scripts/corel-linie.py`: Corel-Massenstrecke je Linie (Bögen parallel, Metadaten aus Pfad, `__NEU` = Formatreihen, `_mB` = eigener Bogen, Doppelte mit 1 mm Toleranz, Linienübersicht). Bogenleser akzeptiert 8-stellige CustomizationIDs.
- `scripts/shop-export.mjs` (läuft auf dem Händlerhost, Token per client_credentials aus Secret-Datei), `shop-sync.mjs` (productSet-Plan je Linie über Basis-SKU; `--apply` mit Journal), `shop-bind.mjs` (Binding-Plan Variante → `katalog-…`-Produkt; `--store-id` Pflicht). 18 Tests, Spec `scripts/SHOP-SYNC.txt`. Shop: 1 240 Produkte (1 109 aktiv, 121 Entwurf); Teil-Export 300 in `.local-data/` (gitignored). Befund: SKU `GT-PS-30x20` doppelt (zwei DRAFT-Produkte); 153/421 Varianten ohne SKU.
- Runbook `docs/plans/HOST-UMZUG-MAIN-20261023.md`: Plesk Git-Manager zieht `main` nach `/private/gravuru-2027-main`, Trockenlauf gegen Datenkopie mit `scripts/acryl-employee-check.mjs`, Umschalten nur `app.cjs` Zeile 4, Rückweg. Legacy-Store (alte Renderer-Daten, Einzelmandant) nie mit `main` öffnen.

## Katalog (Branch `dev/bestand-edelstahl-neu-20261023`, GitHub, WIP-Commit 2c7d34f8)

- Bestand Türschilder Gravur komplett ohne Corel gelesen (110 Bögen, ~8 500 Designs): Edelstahl `__NEU` 37 Bögen/2 871 Designs (2 457 grün), Acryl 25/1 837, Kunststoff 14/2 068 (jede Nummer 2–4× je Bogen), Schiefer 19/1 045, Holz 7/397, Acryl+Edelstahl 8/283. Ablage `designs/bestand/boegen/<Basis-SKU>/`, Übersichten `_linie-turschilder-gravur-*.json`; Vorschau-PNGs per .gitignore außerhalb Git. Quelle: Light-Kopie `C:\katalog-quelle` auf Chris’ Laptop (Gerätebrücke), UV-Bögen (55, 26 GB) noch nicht gelesen.
- `linien/_inventar/FancyCustomizationIDs.csv` (1 367 Hauptprodukte; Spalten CustomizationID; Export-Name; Hauptdesign Artikelnummer; CDR Pfad). Türschilder 306, davon 105 Edelstahl `__NEU` (3 umgesetzt: 3100000/3200000/3300000).
- **WIP, ungeprüft (Agent abgebrochen):** Lieferform 2 für 13 Edelstahl-Formatreihen in `designs/edelstahl-gravur-*` (50x20, 60x20, 80x20, 80x35, 80x53, ab-80x53, 80x80, 90x30, oval-90x60, oval-120x40, oval-150x80, retro1-90x60, retro2-91x61). Noch offen: Prüfung gegen `designs/README.md`, `zuordnung.json`/Themen, Hauptprodukte in `linien/edelstahl-tuerschilder.json` (102 Einträge mit startDesign/sizesOffered/customizationId; Name = Shopify-Titel wenn vorhanden), `build-katalog.py`, `katalog-import --dry-run`.

## WIP-Branches im Code-Repo (GitHub, ungeprüft, Agenten durch Sitzungslimit abgebrochen)

- `dev/design-dashboard-20261023` (bbb95b0, Worktree `/home/claude/gravuru-2027-editor`): API `/api/workshop/designs` (+svg, PATCH), Seite `/werkstatt/designs/` (Shell eingetragen, alle Seiten re-synced), `app/workshop/design-dashboard.mjs`, `katalog-writeback.mjs`, `scripts/katalog-writeback.mjs`, `hidden` im Katalog-Import. Tests teils vorhanden; volle Suite nicht gelaufen.
- `dev/shop-einstieg-20261023` (cb71572, Worktree `/home/claude/gravuru-2027-anbindung`): `app/workshop/shop-entry*.mjs` (App-Proxy-Start, signierte Kundensitzung, Binding genau ein Treffer), `app/configurator/variant-m/shop-cart.mjs`, `ui/shop-entry*.{html,mjs}`, Einhängung in `acryl-employee-host.mjs`/`configurator-integration.mjs`, Theme-Block `ops/shopify/theme-block/`, `ops/shopify/SHOP-EINSTIEG.md`, Spec `SHOP-ENTRY.txt` (unvollständig). Warenkorb-Weg und Tests prüfen; drei Dateien mit CRLF-Warnung (nicht normalisieren).

## Host (app-2027.gravuru-designwerkstatt.de, Plesk über Chris’ Chrome „gravuru Shopify“, Tab-Sitzung 480 min)

- Ein Node-Prozess: Anwendungsstamm `/gravuru-2027-merchant`, `start-r5.cjs` → `app.cjs` (setzt `GRAVURU_SHOPIFY_CONFIG_FILE`, `GRAVURU_ACRYL_LEGACY_RELEASE`, `GRAVURU_ACRYL_DATA_DIR`, lädt `…/gravuru-combined-id-20261022-v1/acryl/scripts/acryl-employee-entry.cjs`). Sicherung beider Stores: `private/sicherung-20261023-2`.
- Plesk Git-Manager: Formular für `git@github.com:Chris83638w/gravuru-2027.git` vorbereitet (Modus manuell, Ziel `/private/gravuru-2027-main`); **Deploy-Key wartet auf Chris** (öffentlicher Schlüssel in `plesk-deploy-key-gravuru-2027.pub` übergeben; GitHub → Repo → Settings → Deploy keys, ohne Schreibrecht). Für das Katalog-Repo wird ein zweiter Key nötig (GitHub erlaubt einen Key nur je Repo).
- Vorbereitete Plesk-Befehle (Datenkopie + Trockenlauf) im Scratchpad `plesk-probe-main-commands.txt` (Pfade im Runbook beschrieben; je < 980 Zeichen für „Jetzt ausführen“).

## Nächste Schritte (Reihenfolge)

1. Chris: Deploy-Key eintragen → Plesk-Repo anlegen, `main` nach `/private/gravuru-2027-main` ziehen; Datenkopie + `acryl-employee-check.mjs` gegen die Kopie; dann `app.cjs` Zeile 4 umstellen, Neustart, Prüfen (`/werkstatt/acryl/` 200, `/api/workshop/session` 401).
2. Auf dem Host `scripts/shop-export.mjs --out private/shop-export-<datum>` (Vollexport 1 240 Produkte), `products.json` holen.
3. WIP-Branches prüfen (Tests, Sichtprüfung) und nach `main` mergen: Design-Dashboard, Shop-Einstieg.
4. Katalog-WIP prüfen, Hauptprodukte Edelstahl eintragen, `build-katalog.py`, Import-Dry-run; dann `katalog-import --commit` auf dem Host (Acryl-Store = neuer Konfi), `shop-sync`/`shop-bind` für Edelstahl, Theme-Block „Jetzt personalisieren“ auf Themekopie (Chris veröffentlicht), Testbestellung.
5. Übrige Materialien/Linien dieselbe Strecke; UV-Bögen lesen; Dashboard-Korrekturen durch Chris.

Offene Entscheidungen für Chris: Themenzuordnung unsicherer Hauptprodukte, Preise je Formatreihe (Katalog hat keine; Shopify-Preise als Notiz), Basis-SKUs mit Komma/Klammer (`externalIds` erlaubt sie nicht → `--sku-map` oder Schema), Store-ID für Bindungen, Minimalist-Schrift liefern, Photoroom-App deinstallieren, leere Ordner `sicherung-20261023`/`-1` auf dem Host löschen.
