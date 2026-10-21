// Startdatei für Plesk (Node.js-Erweiterung, Passenger/LiteSpeed). Liest die private Konfiguration
// standardmäßig aus <übergeordneter Ordner>/private/<App-Ordnername>-config.json (außerhalb des Webroots).
const path = require('node:path');
const fs = require('node:fs');

const appDir = __dirname;
const defaultCfg = path.join(path.dirname(appDir), 'private', path.basename(appDir) + '-config.json');
if (!process.env.CDR_MCP_CONFIG && fs.existsSync(defaultCfg)) process.env.CDR_MCP_CONFIG = defaultCfg;
// Ohne Konfiguration lauffähig: Token und Arbeitsordner im privaten Ordner neben der App (außerhalb des Webroots)
const privBase = path.join(path.dirname(appDir), 'private', path.basename(appDir));
const defaults = { CDR_MCP_TOKEN_FILE: privBase + '-token.txt', CDR_MCP_DATA: privBase + '-data' };

// Ausführrechte gehen beim Entpacken im Plesk-Dateimanager mitunter verloren
for (const f of ['vendor/libcdr/cdr2raw', 'vendor/libcdr/bin/cdr2raw', 'vendor/libcdr/lib/ld-linux-x86-64.so.2']) {
  try { fs.chmodSync(path.join(appDir, f), 0o755); } catch {}
}

import('./server.mjs').then(({ loadConfig, createCdrServer }) => {
  const cfg = loadConfig([], process.env, defaults);
  const server = createCdrServer(cfg);
  // Passenger/LiteSpeed setzen PORT und übernehmen den Socket; ohne sie nur lokal (127.0.0.1) lauschen
  if (process.env.PORT) server.listen(process.env.PORT, () => console.log('gravuru-cdr-mcp bereit'));
  else server.listen(cfg.port, cfg.host, () => console.log(`gravuru-cdr-mcp bereit auf ${cfg.host}:${cfg.port}`));
}).catch((e) => { console.error('gravuru-cdr-mcp Start fehlgeschlagen:', e.message); process.exit(1); });
