# Gravuru Manufaktur – Website und Konfigurator

Eigenständige Next.js-/Payload-Anwendung für **gravuru-manufaktur.de** (Dienstleistungen: Gravur, Farbdruck, Zuschnitt, Sonderanfertigungen).
Nicht identisch mit `gravuru-2027` (Shop-Konfigurator), der Händlerwerkstatt oder dem Shopify-Shop.

## Herkunft dieses Stands

- Quellstand vom Produktionsserver (Plesk, `/var/www/vhosts/gravuru.de/gravuru-manufaktur-app`), gesichert am 02.11.2026.
- Abgleich: alle 13 Dateien aus dem letzten Release-Manifest `20261030-1` (`work/interaction-fixes-20261030/release/manifest.json`) sind SHA-256-identisch; die 11 öffentlichen Werkstatt-Dateien sind auch live identisch.
- Nicht enthalten (privat bzw. Laufzeitdaten): `.env`, `data/` (SQLite, Kundenlinks), `media/`, `backups/`, `work/`, `node_modules/`, `.next/`.
- Große, unveränderte Bibliotheksdateien (Schriften/Motive, PDF.js, Klingelbilder, Illustrationen) sind nicht eingecheckt; ihr Stand ist in `ASSETS-MANIFEST.sha256` belegt und liegt auf dem Server.

## Lokal starten

```bash
pnpm install --frozen-lockfile
node scripts/setup.mjs        # legt lokale .env an (SITE_PUBLIC=false)
pnpm dev                      # http://127.0.0.1:3087
```

Für die großen Bibliotheksdateien den Stand aus dem Server-Release nach `public/` kopieren und mit `sha256sum -c ASSETS-MANIFEST.sha256` prüfen.

## Veröffentlichung

Nur nach ausdrücklicher Freigabe durch Chris. Ablauf: Ausgangshashes prüfen → private Sicherung → Build in separatem Verzeichnis → Dateien tauschen → Neustart (`tmp/restart.txt`) → Liveprüfung. Keine `.env`, DB, Konten oder Medien ersetzen.
