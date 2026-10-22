# Händlerhost auf `main` · Runbook 23.10.2026

Ziel: Der Host `app-2027` läuft mit dem Code von `main` (ein Konfigurator für alle Materialien, Hauptprodukte, Katalog-Import, Editor-Korrekturen). Datenbestände bleiben unangetastet; der alte Renderer-Store (Legacy-Pilot) läuft unverändert weiter, bis seine Produkte aus dem Katalog neu angelegt sind.

## Ist-Zustand (geprüft 23.10.)

- Plesk Node.js (Node 24.22.0, production), Anwendungsstamm `/gravuru-2027-merchant`, Startdatei `start-r5.cjs` → `app.cjs`.
- `app.cjs` setzt drei Umgebungsvariablen (Shopify-Konfigdatei, Legacy-Release, Acryl-Datenordner) und lädt `…/gravuru-combined-id-20261022-v1/acryl/scripts/acryl-employee-entry.cjs`.
- Ein Prozess, zwei Stores: Legacy-Runtime aus dem Legacy-Release (altes Paket d18bc6c + Overlays), Acryl-Runtime aus dem Acryl-Codebaum mit eigenem Datenordner. Pfad-Rewrites `/werkstatt/acryl/…`, Gateway `configurator-test-gateway`, Bestell-Webhook.
- Sicherung beider Stores: `private/sicherung-20261023-2` (SQLite-Online-Backup, quick_check, SHA-256; siehe STATUS.md).
- Plesk Git-Manager vorhanden; Repo `gravuru-2027` (SSH, Deploy-Key, Modus manuell, Ziel `/private/gravuru-2027-main`) vorbereitet – Deploy-Key muss in GitHub eingetragen sein.

## Warum nur der Acryl-Codebaum wechselt

Der Acryl-Store ist bereits der „neue Konfigurator“ (gleiche Codebasis wie `main`, Mandanten-Schema). `main` ⊇ Acryl-Baum (Codex-Branch ist gemergt). Die Legacy-DB ist Einzelmandant und wird nur vom alten Release geöffnet; `main` darf sie nicht öffnen (automatische Migration würde den Rückweg des alten Release zerstören).

## Ablauf

1. **Deploy** – Plesk Git: Repository anlegen, Branch `main`, „Pull/Bereitstellen“ nach `/private/gravuru-2027-main`. Prüfen: `git rev-parse HEAD` im Zielordner = aktueller `main`-Commit; `node --test` nicht auf dem Host (zu lang), stattdessen Schritt 2.
2. **Trockenlauf gegen Datenkopie** (ohne Live-Daten zu berühren):
   - Datenordner Acryl kopieren: SQLite-Dateien per `sqlite3 … ".backup"` (wie sicherung-20261023-2), übrige Dateien `cp -a`, Ziel `private/probe-main-20261023/data`.
   - `node scripts/acryl-employee-check.mjs <legacy-release> <datenkopie>` aus `/private/gravuru-2027-main` mit `GRAVURU_SHOPIFY_CONFIG_FILE` wie in `app.cjs`. Erwartung: `{"preflight":"passed",…}`; dabei migriert die Kopie ggf. auf Schema v4 – Live-DB bleibt unberührt.
   - `PRAGMA user_version` der Kopie notieren (vorher/nachher).
3. **Umschalten** (kurze Unterbrechung ≈ 10 s):
   - Frische Sicherung des Acryl-Datenordners (gleiches Verfahren, `private/sicherung-<datum>-3`).
   - `app.cjs` Zeile 4 auf `/private/gravuru-2027-main/scripts/acryl-employee-entry.cjs` ändern (die drei Variablen bleiben). Plesk „App neu starten“.
   - Prüfen: `/werkstatt/acryl/` 200, `/werkstatt/katalog/` 200, `/api/workshop/session` 401, Legacy-Editor erreichbar, Webhook-Pfad antwortet, Fehlerlog leer.
4. **Rückweg**: Zeile 4 zurück auf den alten Pfad, Neustart. Falls die Acryl-DB bereits migriert wurde und der alte Code sie nicht öffnet: Datenordner aus der Sicherung von Schritt 3 zurückspielen (nur Acryl-Store, nie Legacy).
5. **Danach** (eigene Freigabe): `katalog-import` der Edelstahl-7x2-Hauptprodukte in den Acryl-Store, `shop-bind` der drei Shopify-Produkte, Theme-Block „Jetzt personalisieren“ auf Themekopie, Testbestellung.

## Künftige Updates

Plesk Git „Pull“ + „Bereitstellen“ auf `/private/gravuru-2027-main`, dann „App neu starten“. Kein Datei-Upload, keine Overlays mehr. Schema-Änderungen in `repository.mjs`/`profile-library.mjs` bleiben additiv; vor jedem Update Sicherung des Datenordners.

## Nicht tun

- Kein `--commit`-Import, kein Shopify-Upload, keine Theme-Veröffentlichung ohne Freigabe von Chris.
- Keine historischen Installationsskripte (`ops/install-*.py`, `ops/prepare-*`) erneut ausführen.
- Legacy-Datenordner nie mit `main` öffnen; keine alte DB-Sicherung über neuere Bestellungen kopieren.
- Keine privaten Pfade/IDs/Schlüssel in GitHub, Chat oder Logs.
