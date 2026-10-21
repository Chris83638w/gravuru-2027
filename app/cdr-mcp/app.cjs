// Startdatei für Plesk (Node.js-Erweiterung, Passenger/LiteSpeed). Liest die private Konfiguration
// standardmäßig aus <übergeordneter Ordner>/private/<App-Ordnername>-config.json (außerhalb des Webroots).
const path = require('node:path');
const fs = require('node:fs');

const appDir = __dirname;
const defaultCfg = path.join(path.dirname(appDir), 'private', path.basename(appDir) + '-config.json');
if (!process.env.CDR_MCP_CONFIG && fs.existsSync(defaultCfg)) process.env.CDR_MCP_CONFIG = defaultCfg;

import('./server.mjs').then(({ loadConfig, createCdrServer }) => {
  const cfg = loadConfig([], process.env);
  const server = createCdrServer(cfg);
  // Passenger/LiteSpeed übernehmen den Socket; lokal gilt PORT bzw. 8975
  server.listen(process.env.PORT || cfg.port, () => console.log('gravuru-cdr-mcp bereit'));
}).catch((e) => { console.error('gravuru-cdr-mcp Start fehlgeschlagen:', e.message); process.exit(1); });
