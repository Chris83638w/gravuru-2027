import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url));
const tests=spawnSync(process.execPath,['--test','--test-reporter=tap','transport.test.mjs','adapter/native-review-adapter.test.mjs','ops/ops.test.mjs'],{cwd,encoding:'utf8'});
writeFileSync(new URL('verification.tap',import.meta.url),tests.stdout||'');
if(tests.status!==0){process.stderr.write(tests.stderr||tests.stdout||'Prüflauf fehlgeschlagen.');process.exit(tests.status||1);}
const prices=spawnSync(process.execPath,['pricing/run.mjs'],{cwd,encoding:'utf8'});
if(prices.status!==0){process.stderr.write(prices.stderr||prices.stdout||'Preisprüfung fehlgeschlagen.');process.exit(prices.status||1);}
const count=(tests.stdout.match(/^# tests (\d+)/m)||[])[1];
console.log(`${count||'Alle'} Adapter-/Transport-/Ops-Tests bestanden. Preisbericht: pricing/report.json. Kein Livesystem angesprochen.`);
