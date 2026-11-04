// Design-Prüfung: aus einer Renderer-Ausgabe (scripts/render-vorlagen.mjs … --png) eine Prüfrunde für die
// Ja/Nein-Prüfseite bauen (Skill .claude/skills/design-pruefung). Nur lokal: liest die Renderer-Ausgabe,
// schreibt ausschließlich in --out. Kein Live-, Shopify- oder Commit-Zugriff.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const HELP=`node scripts/design-pruefung.mjs --aus <Renderer-Ordner> --out <Seitenordner> --runde <id> --titel <Text> --frage <Text> [Optionen]
  --aus        Ausgabeordner von render-vorlagen.mjs (mit --png gerendert, enthält index.json)
  --out        Ordner der Prüfseite (index.html, liste.json, bilder/). Gibt es dort schon eine liste.json,
               wird die neue Runde angehängt; ältere Runden bleiben wählbar.
  --runde      stabile Kennung der Runde, z. B. linien-unter-0-3-20261105 (Buchstaben, Ziffern, - _ .)
  --titel      Überschrift der Runde
  --frage      Frage, die Chris je Design mit Ja/Nein beantwortet
  --ja / --ja-text / --nein / --nein-text   Beschriftung der Knöpfe (Standard: Ja / Nein)
  --zeilen <json>    optional: {"<Design-ID>": [["Bei Ja fällt weg","8 × 5"], …]} – Infozeilen je Design
  --hinweise <json>  optional: {"<Design-ID>": "Hinweistext"}
  --reihennamen <json> optional: {"<Reihenordner>": "Anzeigename"}
  --qualitaet <n>    WebP-Qualität, Standard 86`;

const args=process.argv.slice(2),opt={};
for(let i=0;i<args.length;i++){const a=args[i];if(!a.startsWith('--'))throw Error('Unbekanntes Argument: '+a);const k=a.slice(2);if(k==='help'){opt.help=true;continue;}if(args[i+1]===undefined)throw Error('Wert fehlt für '+a);opt[k]=args[++i];}
if(opt.help||!opt.aus||!opt.out||!opt.runde||!opt.titel||!opt.frage){console.log(HELP);process.exit(opt.help?0:1);}
if(!/^[A-Za-z0-9_.-]+$/.test(opt.runde))throw Error('--runde nur mit Buchstaben, Ziffern, - _ .');
const json=f=>f?JSON.parse(fs.readFileSync(f,'utf8')):{};
const aus=path.resolve(opt.aus),out=path.resolve(opt.out),zeilen=json(opt.zeilen),hinweise=json(opt.hinweise),reihennamen=json(opt.reihennamen);
const index=JSON.parse(fs.readFileSync(path.join(aus,'index.json'),'utf8'));
const listeFile=path.join(out,'liste.json'),liste=fs.existsSync(listeFile)?JSON.parse(fs.readFileSync(listeFile,'utf8')):{runden:[]};
if(liste.runden.some(r=>r.id===opt.runde))throw Error('Runde gibt es schon: '+opt.runde+' (neue Kennung wählen)');
const sharp=createRequire(import.meta.url)('sharp'),safe=s=>String(s).replace(/[^A-Za-z0-9_.-]/g,'_');
fs.mkdirSync(path.join(out,'bilder',opt.runde),{recursive:true});

const items=[],neueDateien=[],fehlt=[];
for(const e of index.ergebnisse){
 if(!e.png){fehlt.push((e.id||'Grundplatte')+' '+(e.label||e.size||'')+': '+(e.issues||[]).slice(-1)[0]);continue;}
 // Gleiches Design in mehreren Größen: Schlüssel aus Design und gerenderter Größe.
 const key=safe(e.id||'grundplatte')+'__'+safe(e.size),rel='bilder/'+opt.runde+'/'+key+'.webp';
 const info=await sharp(path.join(aus,e.png)).webp({quality:Number(opt.qualitaet||86)}).toFile(path.join(out,rel));
 items.push({id:e.id||'Grundplatte',key,reihe:e.reihe||'',reiheName:reihennamen[e.reihe]||e.reihe||'',groesse:e.label||e.size,size:e.size,status:e.status,bild:rel,w:info.width,h:info.height,zeilen:zeilen[e.id]||[],hinweis:hinweise[e.id]||''});
 neueDateien.push(rel);
}
const heute=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
liste.runden.push({id:opt.runde,titel:opt.titel,frage:opt.frage,ja:opt.ja||'Ja',jaText:opt['ja-text']||'',nein:opt.nein||'Nein',neinText:opt['nein-text']||'',stand:heute,items});
fs.writeFileSync(listeFile,JSON.stringify(liste)+'\n');
const vorlage=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','.claude','skills','design-pruefung','pruefseite.html');
fs.copyFileSync(vorlage,path.join(out,'index.html'));
// Für den Artifact-Aufruf (files): nur neue Dateien – beim Aktualisieren bleiben ältere Dateien erhalten.
fs.writeFileSync(path.join(out,'files.json'),JSON.stringify([{path:'liste.json'},...neueDateien.map(p=>({path:p}))])+'\n');
console.log(JSON.stringify({runde:opt.runde,designs:items.length,nichtGerendert:fehlt,seite:out,dateien:neueDateien.length+1},null,1));
