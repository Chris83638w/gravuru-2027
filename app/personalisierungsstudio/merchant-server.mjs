import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fork} from 'node:child_process';
import {here} from './catalog.mjs';

export const merchantPage=(local,f02=false)=>'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Werkstatt · gravuru Studio</title><link rel="stylesheet" href="/merchant/studio.css"><body class="gs-demo" data-local="'+local+'"><header><strong>gravuru Studio</strong>'+(local?'<a href="/">Zur Designprobe</a>':'')+'</header><main><h1>Werkstatt</h1><form id="login"><label>Werkstatt-Zugang <input id="key" type="password" autocomplete="current-password" required></label> <button>Anmelden</button></form><p id="status" role="status" aria-live="polite"></p><section id="tools" hidden><h2>Bestellungen</h2>'+(f02?'<button id="sync-f02" type="button">Testbestellungen aktualisieren</button>':'')+'<div id="orders"></div><form id="sync"><label>Shopify-Bestell-ID <input id="orderid" pattern="[1-9][0-9]*" inputmode="numeric" required></label> <button>Bestellung abrufen</button></form><hr><h2>Designs importieren</h2><form id="import"><label>Vorlagendatei <input id="file" type="file" accept=".svg,.json,.zip" required></label> <button type="button" id="inspect">Quelle prüfen</button><pre id="report"></pre><label>Produkt-ID <input id="product" pattern="[1-9][0-9]*" required '+(local?'value="70001" readonly':'')+'></label> <label>Varianten-ID <input id="variant" pattern="[1-9][0-9]*" required '+(local?'value="90002" readonly':'')+'></label> <button id="publish" disabled>Vorlagen übernehmen</button></form></section></main><script type="module" src="/merchant/merchant.mjs"></script></body></html>';

export async function merchantImport(store,shop,input,publish){
  const ext=path.extname(String(input.name||'')).toLowerCase();
  if(!['.json','.svg','.zip'].includes(ext)||typeof input.bytes!=='string'||input.bytes.length>10_700_000)throw Error('SVG, JSON oder ZIP mit Corel- oder FPD-Originalen bis 8 MB erwartet.');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-studio-import-')),source=path.join(dir,'input'+ext);
  try{
    const raw=Buffer.from(input.bytes,'base64');
    if(!raw.length || raw.length>8_000_000)throw Error('Leere oder zu große Quelle.');
    fs.writeFileSync(source,raw);
    const result=await new Promise((resolve,reject)=>{
      const child=fork(here('merchant-worker.mjs'),[source],{stdio:['ignore','ignore','ignore','ipc'],execArgv:[],timeout:90_000,windowsHide:true,serialization:'advanced'});
      child.once('error',reject);child.once('message',reply=>reply.error?reject(Error(reply.error)):resolve(reply));
      child.once('exit',()=>reject(Error('Importprüfung wurde beendet.')));
    });
    if(!result.pack){if(publish)throw Error('Fehlende Originalzuordnungen zuerst auflösen.');return result.review;}
    const pack=result.pack,templates=JSON.parse(pack.index).map(d=>({id:d.id,name:d.name,widthMm:d.width,heightMm:d.height}));
    if(publish){
      if(input.expected!==pack.revision)throw Error('Quelle geändert. Bitte erneut prüfen.');
      store.publish(shop,input.product,input.variant,pack);
    }
    return {revision:pack.revision,count:templates.length,templates};
  }finally{
    fs.rmSync(source,{force:true});fs.rmdirSync(dir);
  }
}
