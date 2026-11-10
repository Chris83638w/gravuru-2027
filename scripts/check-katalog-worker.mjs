// Paket 1c: Messung Katalog-Arbeiter gegen direkten Aufruf.
// Aufruf: node scripts/check-katalog-worker.mjs <worker|direct> [katalogPfad] [linie]
// Rechnet die Designliste einer Linie (mit Fit) zweimal und misst im Hauptprozess mit einem 10-ms-Intervall die größte Verzögerung.
// Nur lesend: der Katalog wird nicht verändert, die Datenbank ist eine leere Wegwerf-Datei.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {designDashboardWithFit,forgetKatalog} from '../app/workshop/design-dashboard.mjs';
import {createKatalogWorker} from '../app/workshop/katalog-worker-client.mjs';

const [mode='worker',root=process.env.GRAVURU_KATALOG||'/home/claude/katalog',linie='edelstahl-tuerschilder']=process.argv.slice(2);
if(!['worker','direct'].includes(mode)){console.error('Modus: worker oder direct');process.exit(2);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'p1c-check-')),filename=path.join(dir,'werkstatt.sqlite');
const repository=createProductRepository({filename,tenantId:'gravuru'});
const available={};
const worker=mode==='worker'?createKatalogWorker({dbFile:filename,tenantId:'gravuru',available}):null;
const args={linie,reihe:null,material:null,status:null,freigabe:null,bestand:null,startDesigns:false};

async function once(label){
  let last=performance.now(),max=0,ticks=0;
  const timer=setInterval(()=>{const now=performance.now();max=Math.max(max,now-last-10);last=now;ticks+=1;},10);
  const begin=performance.now();let bytes;
  if(worker)bytes=(await worker.call('designs.list',root,args,{acceptGzip:false})).bytes.length;
  else{forgetKatalog();bytes=Buffer.byteLength(JSON.stringify(await designDashboardWithFit(root,{...args,repository,available})));}
  const ms=performance.now()-begin;clearInterval(timer);
  console.log(JSON.stringify({mode,call:label,ms:Math.round(ms),maxDelayMs:Math.round(max),ticks,bytes}));
}
try{
  await once('1. Aufruf');
  await once('2. Aufruf');
}finally{
  await worker?.close();repository.close();fs.rmSync(dir,{recursive:true,force:true});
}
