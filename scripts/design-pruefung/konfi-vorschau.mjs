// Konfi-Vorschau und Passungsprüfung für Katalog-Designs (Lieferform 2) – ohne Server, ohne Shopify.
//
// Nutzt exakt den Konfi-Code dieses Repos: targetDesignPreview (Einlesen wie im Konfi,
// Passung je Zielgröße, Vorschau-SVG aus productPreview). Ergebnis je Design:
//   <out>/<id>.svg          echte Konfi-Vorschau (Platte, Material, Bohrbild, Texte als Pfade)
//   <out>/ergebnis.json     Passung (passt / prüfen / passt nicht / FEHLER) mit Hinweisen
//   <out>/kontaktbogen.html alle Vorschauen nebeneinander, optional mit Vorlage daneben
//
// Aufruf (Windows PowerShell oder Linux), im Ordner gravuru-2027:
//   node scripts/design-pruefung/konfi-vorschau.mjs --katalog=..\gravuru-katalog --reihe=familie-mika-120x80 --out=..\pruefung
// Optionen:
//   --reihe=<ordner>[,<ordner>]   Designordner unter designs/ (Pflicht)
//   --ids=<id>[,<id>]             nur diese Design-Kennungen
//   --familie=<id>                Zielfamilie; sonst erstes Ziel aus design.json „ziele“
//   --vorlage=<pfad>              optional: Bildordner mit <id>.png als Vorlage daneben
// Hinweis: Jeder Aufruf liest den Katalog neu ein. Bei sehr großen Katalogen (> 3000 Designs)
// nur die benötigten Reihen in eine Arbeitskopie legen.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const arg=(name,def=null)=>{const hit=process.argv.find(v=>v.startsWith('--'+name+'='));return hit?hit.slice(name.length+3):def;};
const katalog=arg('katalog'),reihen=(arg('reihe')||'').split(',').filter(Boolean),only=new Set((arg('ids')||'').split(',').filter(Boolean));
const out=path.resolve(arg('out','design-pruefung')),familieArg=arg('familie'),vorlage=arg('vorlage');
if(!katalog||!reihen.length){console.error('Aufruf: --katalog=<pfad> --reihe=<designs-ordner> [--out=<ordner>]');process.exit(2);}
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','..');
const {targetDesignPreview}=await import(new URL('file://'+path.join(ROOT,'app/workshop/design-target-preview.mjs').replace(/\\/g,'/')).href);
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const results=[];
for(const reihe of reihen){
 const dir=path.join(katalog,'designs',reihe);
 if(!fs.existsSync(dir)){console.error('Reihe fehlt: '+dir);process.exitCode=1;continue;}
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const jsonFile=path.join(dir,entry.name,'design.json');if(!fs.existsSync(jsonFile))continue;
  const json=JSON.parse(fs.readFileSync(jsonFile,'utf8')),id=json.id||entry.name;
  if(only.size&&!only.has(id))continue;
  const familie=familieArg||json.ziele?.[0]?.familie;
  const r={reihe,id,name:json.name||id,familie};
  try{
   if(!familie)throw Error('Keine Zielfamilie (design.json „ziele“ oder --familie).');
   const p=await targetDesignPreview(katalog,{reihe,id,familie});
   r.passung=p.reviewFit.status;r.hinweise=p.reviewFit.issues;r.groesse=p.size?.key??null;
   if(p.svg)fs.writeFileSync(path.join(out,id+'.svg'),p.svg);else r.hinweise=[...(r.hinweise||[]),'Keine Vorschau: '+(p.previewError||'unbekannt')];
  }catch(error){r.passung='FEHLER';r.hinweise=[error.message];}
  results.push(r);console.log(r.passung.padEnd(11),id,r.groesse??'');
 }
}
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify({erstellt:new Date().toISOString(),katalog:path.resolve(katalog),ergebnisse:results},null,1));
const cell=r=>{const v=vorlage&&fs.existsSync(path.join(vorlage,r.id+'.png'))?`<img class=v src="${esc(path.relative(out,path.join(vorlage,r.id+'.png')).replace(/\\/g,'/'))}">`:'';
 const s=fs.existsSync(path.join(out,r.id+'.svg'))?`<img src="${esc(r.id)}.svg">`:'<div class=f>keine Vorschau</div>';
 return `<figure class="${esc(r.passung).replace(/\s/g,'-')}">${v}${s}<figcaption><b>${esc(r.id)}</b> · ${esc(r.name)}<br>${esc(r.passung)}${r.hinweise?.length?' · '+esc(r.hinweise.slice(0,3).join(' | ')):''}</figcaption></figure>`;};
fs.writeFileSync(path.join(out,'kontaktbogen.html'),`<!doctype html><meta charset=utf-8><title>Kontaktbogen</title><style>body{font:13px system-ui;margin:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}figure{margin:0;border:1px solid #ccc;padding:6px}figure img{width:100%;height:220px;object-fit:contain}figure img.v{height:140px;border-bottom:1px dashed #ccc}.passt-nicht,.FEHLER{border-color:#c00}.prüfen{border-color:#c90}figcaption{font-size:11px}</style><h1>Kontaktbogen · echte Konfi-Vorschau</h1><main>${results.map(cell).join('')}</main>`);
const count=results.reduce((m,r)=>(m[r.passung]=(m[r.passung]||0)+1,m),{});
console.log('Fertig:',JSON.stringify(count),'→',path.join(out,'kontaktbogen.html'));
