import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
const arg=name=>process.argv.find(v=>v.startsWith('--'+name+'='))?.slice(name.length+3);
for(const name of ['katalog','original-katalog','pruefung','out'])if(!arg(name))throw Error('--'+name+' ist erforderlich.');
const root=path.resolve(arg('katalog')),original=path.resolve(arg('original-katalog')),proof=path.resolve(arg('pruefung')),out=path.resolve(arg('out'));
if(root===original)throw Error('Original und Arbeitskopie müssen getrennt sein.');
const series='familie-mika-120x80',dir=path.join(root,'designs',series),qa=path.join(dir,'pruefung');
const index=JSON.parse(fs.readFileSync(path.join(dir,'index.json'),'utf8'));
const result=JSON.parse(fs.readFileSync(path.join(proof,'ergebnis.json'),'utf8'));
const quality=JSON.parse(fs.readFileSync(path.join(proof,'qualitaetspruefung.json'),'utf8'));
const counts=result.ergebnisse.reduce((all,item)=>(all[item.passung]=(all[item.passung]||0)+1,all),{});
const minimumHeight=Math.min(...quality.checks.map(item=>item.minVisibleGlyphHeightMm));
const require=createRequire(import.meta.url);
let chromium;
try{({chromium}=require('playwright'));}catch{({chromium}=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')));}
const chrome=process.env.GRAVURU_CHROME||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':undefined);
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(qa,'vorher'),{recursive:true});fs.mkdirSync(path.join(qa,'konfi'),{recursive:true});
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{})});
try{
 const page=await browser.newPage({viewport:{width:2200,height:1200},deviceScaleFactor:1});
 await page.goto(pathToFileURL(path.join(proof,'kontaktbogen.html')).href);
 for(const d of index.designs){
  const source=path.join(proof,d.id+'.svg');
  if(!fs.existsSync(source))throw Error('Konfi-SVG fehlt: '+d.id);
  fs.copyFileSync(source,path.join(qa,'konfi',d.id+'.svg'));
  fs.copyFileSync(path.join(original,'designs',series,d.id,'preview.png'),path.join(qa,'vorher',d.id+'.png'));
  await page.evaluate(url=>{document.body.replaceChildren();document.body.style.margin='0';const image=document.createElement('img');image.src=url;image.style.width='900px';image.style.display='block';document.body.append(image);},pathToFileURL(source).href);
  await page.locator('img').evaluate(img=>img.decode());
  await page.locator('img').screenshot({path:path.join(dir,d.id,'preview.png')});
 }
 fs.copyFileSync(path.join(proof,'ergebnis.json'),path.join(qa,'ergebnis.json'));
 fs.copyFileSync(path.join(proof,'qualitaetspruefung.json'),path.join(qa,'qualitaetspruefung.json'));
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const figure=(d,before)=>`<figure><img src="${before?'vorher/'+d.id+'.png':'../'+d.id+'/preview.png'}"><figcaption>${before?'Vorher':'Echte Konfi-Vorschau'} · ${d.persons} Personen${d.pets?' + Hund':''}</figcaption></figure>`;
 const rows=Array.from({length:5},(_,i)=>{const a=index.designs[i*2],b=index.designs[i*2+1],fit=result.ergebnisse.find(r=>r.id===a.id);return `<section><h2>${String(i+1).padStart(2,'0')} · ${esc(a.name.split(' · ')[0])} <span>${esc(a.fonts.join(' / '))} · ${esc(fit.passung)} · fünf eigene Charaktere</span></h2><div class="row">${figure(a,true)}${figure(a,false)}${figure(b,true)}${figure(b,false)}</div></section>`;}).join('');
 const html=`<!doctype html><html lang="de"><meta charset="utf-8"><title>Familienschilder – Konfi-Kontaktbogen</title><style>body{margin:24px;font:18px Arial,sans-serif;color:#183a36;background:#fff}h1{font-size:32px;margin:0 0 8px}header p{margin:4px 0 18px}h2{font-size:23px;margin:18px 0 8px}h2 span{font-size:15px;font-weight:400;margin-left:20px}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;border:1px solid #c5cecc;padding:8px}img{width:100%;height:322px;object-fit:contain}figcaption{font-size:16px;padding:5px 0}footer{margin-top:20px;font-size:16px;line-height:1.45}</style><header><h1>Familienschilder · fünf Richtungen, zehn Muster</h1><p>120 × 80 mm · Edelstahl-Gravur · links jeweils die vorhandene Fassung, rechts unveränderte Ausgabe des echten Konfi-Prüfwerkzeugs</p></header>${rows}<footer>30.10.2026 · ${quality.memberCount} getrennte Figuren und Namensfelder · sichtbare Schriftkonturen mindestens ${minimumHeight.toFixed(2).replace('.',',')} mm hoch · ${counts.passt||0} passt / ${counts['prüfen']||0} prüfen wegen feiner Originalkonturen · ${counts.FEHLER||0} FEHLER / ${counts['passt nicht']||0} passt nicht<br>Keine Produktions- oder Designfreigabe: Die Feinlinien der Originalmotive in Reihe 01–03 sind vor Fertigung zu bewerten. Motive und Größenbindung erhalten.</footer></html>`;
 const currentHtml=html.replace('prüfen wegen feiner Originalkonturen','prüfen').replace('Keine Produktions- oder Designfreigabe: Die Feinlinien der Originalmotive in Reihe 01–03 sind vor Fertigung zu bewerten. Motive und Größenbindung erhalten.','26 individuelle Illustrationen nach Bildrichtungen 1 und 3, mit Bildgenerierung entwickelt und vektorisiert. Alle Freigaben bleiben offen; die Entscheidung über Design und Produktion trifft Chris.');
 fs.writeFileSync(path.join(qa,'kontaktbogen.html'),currentHtml);
 await page.goto(pathToFileURL(path.join(qa,'kontaktbogen.html')).href,{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
 await page.screenshot({path:path.join(qa,'kontaktbogen.png'),fullPage:true});
 fs.copyFileSync(path.join(qa,'kontaktbogen.png'),path.join(out,'kontaktbogen.png'));
 console.log(JSON.stringify({previews:index.designs.length,contactSheet:path.join(out,'kontaktbogen.png')}));
}finally{await browser.close();}
