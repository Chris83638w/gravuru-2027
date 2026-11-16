// Schaltet app.cjs vom aktiven Laufzeitordner auf den neuen F01-Kandidaten um.
// Aufruf im Anwendungsstamm: node ../private/claude-f01-20261116/umschalten-f01.cjs [--pruefen] [--zurueck]
// Sicherung: app.cjs.bak-20261116-f01 (wird nie überschrieben). Rückweg: --zurueck.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PRIV = '/var/www/vhosts/gravuru-designwerkstatt.de/private/';
const ALT = PRIV + 'kandidat-68334981-20261113/';
const NEU = PRIV + 'kandidat-a4616943-20261116/';
const APP = path.resolve('app.cjs');
const BAK = APP + '.bak-20261116-f01';
const zurueck = process.argv.includes('--zurueck');
const nurPruefen = process.argv.includes('--pruefen');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const log = (o) => console.log(JSON.stringify({ event: 'umschalten_f01', ...o }));
try {
  const von = zurueck ? NEU : ALT, nach = zurueck ? ALT : NEU;
  const alt = fs.readFileSync(APP, 'utf8');
  const treffer = alt.split(von).length - 1;
  if (treffer !== 1) throw new Error('Erwartet genau einen Verweis auf ' + von + ', gefunden: ' + treffer);
  const entry = nach + 'scripts/acryl-employee-entry.cjs';
  if (!fs.existsSync(entry)) throw new Error('Startdatei fehlt: ' + entry);
  if (!zurueck) {
    const beleg = JSON.parse(fs.readFileSync(PRIV + 'kandidat-a4616943-20261116.einrichtung.json', 'utf8'));
    if (!beleg.ruecklesenGleich || beleg.rev !== 'a46169437892482ef0d7dda5fb04e3af0c3a52a4') throw new Error('Einrichtungsbeleg passt nicht.');
  }
  const neu = alt.replace(von, nach);
  const info = { richtung: zurueck ? 'zurueck' : 'vor', vorherSha: sha(alt), nachherSha: sha(neu), nach };
  if (nurPruefen) { log({ schritt: 'pruefung', ...info }); return; }
  if (!zurueck) fs.copyFileSync(APP, BAK, fs.constants.COPYFILE_EXCL);
  const tmp = APP + '.tmp-f01';
  fs.writeFileSync(tmp, neu, { flag: 'wx', mode: fs.statSync(APP).mode & 0o777 });
  fs.renameSync(tmp, APP);
  const kontrolle = fs.readFileSync(APP, 'utf8');
  log({ schritt: 'fertig', ...info, kontrolleGleich: sha(kontrolle) === info.nachherSha, sicherung: zurueck ? null : path.basename(BAK) });
} catch (e) { log({ schritt: 'fehler', message: String(e.message || e) }); process.exitCode = 1; }
