import {spawnSync} from 'node:child_process';
import {writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('.',import.meta.url));
const suites=directory=>readdirSync(new URL(directory+'/',import.meta.url),{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')).map(entry=>directory+'/'+entry.name).sort();
const testFiles=['transport.test.mjs','adapter/native-review-adapter.test.mjs','ops/ops.test.mjs',
  ...suites('photo-persistence'),...suites('photo-persistence/server'),...suites('pricing/live-preflight')];
const tests=spawnSync(process.execPath,['--test','--test-reporter=tap',...testFiles],{cwd,encoding:'utf8',maxBuffer:8*1024*1024});
writeFileSync(new URL('verification.tap',import.meta.url),tests.stdout||'');
if(tests.status!==0){process.stderr.write(tests.stderr||tests.stdout||'Prüflauf fehlgeschlagen.');process.exit(tests.status||1);}
const prices=spawnSync(process.execPath,['pricing/run.mjs'],{cwd,encoding:'utf8',maxBuffer:8*1024*1024});
if(prices.status!==0){process.stderr.write(prices.stderr||prices.stdout||'Preisprüfung fehlgeschlagen.');process.exit(prices.status||1);}
const count=(tests.stdout.match(/^# tests (\d+)/m)||[])[1];
console.log(`${count||'Alle'} Adapter-/Transport-/Ops-/Foto-/Server-/Preflight-Tests bestanden. Preisbericht: pricing/report.json. Kein Livesystem angesprochen. Python-Sicherungsprüfung wird separat ausgeführt.`);
