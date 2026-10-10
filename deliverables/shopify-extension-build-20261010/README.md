# Shopify-Erweiterungen · Build 2026-10-10.1

Vollständiger, **noch nicht veröffentlichter** Kandidat der beiden aktiven Erweiterungen. Die übrigen fünf aktiven Konfigurationsmodule bleiben in der frisch gelesenen `shopify.app.toml` erhalten. Enthält Quellcode, npm-Lockfile, kompiliertes WASM und Dateimanifest. Keine Zugangsdaten oder privaten Produktdaten.

- ZIP: `gravuru-shopify-extension-candidate.zip`, 3.337.658 Byte
- SHA-256: `5c447d58a9b35d935d5155db108afcb1d9975b6f2cb67f0ca80f1534e1e2c904`
- Erweiterungsquelle: altes Repository, Commit `b564422edadaf56a27a09f99e1140a546e5e7145`
- Aktive Rückkehrversion: `variante-m-embedded-motifs-20260928`, Shopify-Version `1146632241153`

## Isoliert prüfen

ZIP in ein neues Verzeichnis entpacken, dort mit Node 24 `npm ci --ignore-scripts --no-audit --no-fund` ausführen. Shopify CLI 4.9.0 verwenden. Der Serverhelfer `ops/shopify/check-private-release.py` prüft zunächst Archiv und jede enthaltene Datei, installiert Abhängigkeiten in ein neues privates Verzeichnis und führt `shopify app config validate --json --no-input` und `shopify app build --no-input` aus. Der vorhandene Automation-Token bleibt auf dem Server. Der Helfer veröffentlicht nichts.

Offline-Abgleich aus dem Repository:

```bash
python ops/shopify/verify-extension-release.test.py
```

Der Function-Build prüft vor Verwendung den enthaltenen Binärstand (`verify-wasm.mjs`). Zur bewussten Neukompilierung in einer separaten Kopie den benutzerdefinierten Build-Befehl in der Function-TOML leeren und `shopify app function build --no-input --path extensions/gravuru-personalization-price` ausführen. Verwendete Werkzeuge: Javy 9.1.0, Shopify Javy Plugin v4, Binaryen 123.0.0; offizieller Function Runner 9.2.2 für die WASM-Prüfung. Compiler aus den offiziellen Shopify-GitHub-Releases, Plugin aus dem Shopify-CDN, Binaryen aus dem npm-CDN beziehen; TLS-Prüfung eingeschaltet lassen.

Neu kompiliertes WASM: 3.294 Byte, SHA-256 `f9360588df38eb108ec77ecd0276f46f4524841949c15a76d9789f332adb7890`. Zwei separate Builds lieferten dieselbe Prüfsumme. Sechs Quelltests und beide vorhandenen WASM-Testfälle bestanden. Das aktive historische WASM hat 3.332 Byte; seine Originalbytes liegen nicht vor. **Keine Binärgleichheit mit der aktiven Version behauptet.** Alle 19 Theme-Dateien dagegen stimmen bytegenau mit der aktiven Version überein.

Serverinstallation, Konfigurationsprüfung und Build erfolgreich: [Nachweis](../../docs/releases/20261010/server-build.json). Das Paket ersetzt weder den Werkstatt-Installer noch eine echte Händler-/Kunden-/Bestellabnahme. App-URL, Produkte, Webhooks und aktive Version wurden nicht umgeschaltet.
