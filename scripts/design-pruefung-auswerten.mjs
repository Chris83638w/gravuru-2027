// Design-Prüfung auswerten: liest die Antworten, die ArtifactData (action list, out_dir) als JSON-Dateien
// gespeichert hat, und fasst eine Runde zusammen (Ja / Nein / offen / Kommentare). Nur lesen.
import fs from 'node:fs';
import path from 'node:path';

const args=process.argv.slice(2),opt={};
for(let i=0;i<args.length;i+=2)opt[args[i].replace(/^--/,'')]=args[i+1];
if(!opt.antworten||!opt.runde){console.log('node scripts/design-pruefung-auswerten.mjs --antworten <out_dir>/antworten --runde <id> [--liste <Seitenordner>/liste.json] [--json <Datei>]');process.exit(1);}
const rows=fs.readdirSync(opt.antworten).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(opt.antworten,f),'utf8'))).filter(r=>r.runde===opt.runde);
const runde=opt.liste?JSON.parse(fs.readFileSync(opt.liste,'utf8')).runden.find(r=>r.id===opt.runde):null;
const key=r=>r.design+'|'+(r.groesse||'');
const beantwortet=new Map(rows.map(r=>[key(r),r]));
const offen=runde?runde.items.filter(i=>!beantwortet.get(i.id+'|'+i.groesse)?.antwort).map(i=>i.id+' ('+i.groesse+')'):[];
const ja=rows.filter(r=>r.antwort==='ja'),nein=rows.filter(r=>r.antwort==='nein'),kommentare=rows.filter(r=>r.kommentar);
const ergebnis={runde:opt.runde,ja:ja.length,nein:nein.length,offen:offen.length,kommentare:kommentare.length,
 jaDesigns:ja.map(r=>({design:r.design,reihe:r.reihe,groesse:r.groesse})),
 neinDesigns:nein.map(r=>({design:r.design,reihe:r.reihe,groesse:r.groesse})),
 offenDesigns:offen,
 kommentarListe:kommentare.map(r=>({design:r.design,groesse:r.groesse,antwort:r.antwort,kommentar:r.kommentar}))};
if(opt.json)fs.writeFileSync(opt.json,JSON.stringify(ergebnis,null,1)+'\n');
console.log(`Runde ${opt.runde}: ${ja.length} Ja · ${nein.length} Nein · ${offen.length} offen · ${kommentare.length} Kommentare`);
for(const k of ergebnis.kommentarListe)console.log(`  ${k.design} (${k.groesse}, ${k.antwort||'offen'}): ${k.kommentar}`);
