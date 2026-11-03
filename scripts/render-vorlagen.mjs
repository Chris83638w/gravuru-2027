// Vorlagen-Renderer: Katalogdesigns und leere Grundplatten → SVG/PNG und Kontaktbogen, ohne Klicks im Konfi.
// Gleicher Zeichencode wie Konfi und Werkstatt (studioSvg über productPreview/targetDesignPreview),
// gleiche automatische Prüfung (assessDesignTarget: Bohrlöcher, dünne Motivlinien, Schriften).
// Nur lokal: liest den Katalog, schreibt ausschließlich in --out. Kein Live-, Shopify- oder Commit-Zugriff.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {katalogFor} from '../app/workshop/design-dashboard.mjs';
import {designTargets} from '../app/workshop/design-targets.mjs';
import {targetDesignPreview} from '../app/workshop/design-target-preview.mjs';
import {familyProductConfig} from '../app/workshop/product-families.mjs';
import {productPreview} from '../app/workshop/product-preview.mjs';

const HELP=`node scripts/render-vorlagen.mjs --katalog <Katalogordner> --familie <id> --out <Ordner> [Auswahl] [Ausgabe]
Auswahl (eine davon):
  --leer                      leere Grundplatten (ohne Design) je Größe
  --reihe a,b                 alle Designs dieser Katalogreihen, die die Familie als Ziel haben
  --design "ID1;ID2"          einzelne Designs, mit Semikolon getrennt (IDs enthalten Kommas)
  --alle                      alle Designs mit dieser Familie als Ziel
Optionen:
  --groesse <key,key|alle|familie>  Standard: erste passende Größe; alle = alle passenden Größen; familie = jede Größe
  --befestigung <id>          K00 (ohne), KGL/KRA (Kleben), B02/B04 (Löcher), B02S/B04S (Schrauben); Standard: K00, bei --ansicht pruefung Bohrung
  --ansicht kunde|pruefung    kunde = ohne Gestaltungsbereich (Standard), pruefung = mit Gestaltungsbereich
  --png                       zusätzlich PNG (Chromium, ein Browser für alle Dateien)
  --breite <px>               PNG-Breite, Standard 1200
  --bogen                     Kontaktbogen (HTML, mit --png auch PNG) mit Prüfstatus je Design
  --grenze <n>                höchstens n Dateien (zum Testen)`;

const args=process.argv.slice(2),opt={};
for(let i=0;i<args.length;i++){
 const a=args[i];if(!a.startsWith('--'))throw Error('Unbekanntes Argument: '+a);
 const key=a.slice(2),flag=['leer','alle','png','bogen','help'].includes(key);
 if(flag)opt[key]=true;else{if(args[i+1]===undefined)throw Error('Wert fehlt für '+a);opt[key]=args[++i];}
}
if(opt.help||!opt.katalog||!opt.familie||!opt.out){console.log(HELP);process.exit(opt.help?0:1);}
const list=(v,sep=',')=>v?String(v).split(sep).map(s=>s.trim()).filter(Boolean):[];
const root=path.resolve(opt.katalog),out=path.resolve(opt.out),width=Number(opt.breite||1200),limit=opt.grenze?Number(opt.grenze):Infinity;
const view=opt.ansicht||'kunde';if(!['kunde','pruefung'].includes(view))throw Error('--ansicht kunde oder pruefung');
const started=Date.now(),katalog=katalogFor(root,{maxAgeMs:0}),family=katalog.families.get(opt.familie);
if(!family)throw Error('Familie nicht im Katalog: '+opt.familie);
// Kundenansicht startet wie der Konfi ohne Befestigung; die Prüfansicht zeigt wie die Werkstatt die Bohrung.
const mounting=opt.befestigung?String(opt.befestigung).toUpperCase():view==='kunde'?'K00':null;
const safe=s=>String(s).replace(/[^\w.-]+/g,'_');
fs.mkdirSync(out,{recursive:true});

// Auftragsliste: {kind,reihe,id,size}
const jobs=[],sizesFor=(wanted,fallback)=>wanted==='alle'?fallback:list(wanted);
if(opt.leer){
 const keys=opt.groesse?sizesFor(opt.groesse,family.sizes.map(s=>s.key)):family.sizes.map(s=>s.key);
 for(const key of keys){if(!family.sizes.some(s=>s.key===key))throw Error('Größe nicht in Familie: '+key);jobs.push({kind:'leer',size:key});}
}else{
 const reihen=new Set(list(opt.reihe)),ids=new Set(list(opt.design,';'));
 if(!opt.alle&&!reihen.size&&!ids.size)throw Error('Auswahl fehlt: --leer, --reihe, --design oder --alle');
 const masters=katalog.designs.masters.filter(d=>(opt.alle||reihen.has(d.seriesFolder)||ids.has(d.id))&&designTargets(d,katalog).some(t=>t.familie===opt.familie));
 const missing=[...ids].filter(id=>!masters.some(d=>d.id===id));if(missing.length)throw Error('Design ohne Ziel „'+opt.familie+'“ oder nicht gefunden: '+missing.join(', '));
 for(const d of masters){
  let keys=[null];
  if(opt.groesse==='alle')keys=(await targetDesignPreview(root,{reihe:d.seriesFolder,id:d.id,familie:opt.familie},{katalog})).sizes.filter(s=>s.compatible).map(s=>s.key);
  else if(opt.groesse)keys=sizesFor(opt.groesse==='familie'?'alle':opt.groesse,family.sizes.map(s=>s.key));
  for(const key of keys)jobs.push({kind:'design',reihe:d.seriesFolder,id:d.id,size:key});
 }
}
if(jobs.length>limit)jobs.length=limit;

const sizeLabel=key=>{const s=family.sizes.find(s=>s.key===key),g=family.groups.find(g=>g.key===s?.groupKey);return s?(s.label+(g?' · '+g.name:'')):key;};
function blankSvg(key){
 const size=family.sizes.find(s=>s.key===key),v=structuredClone(family);
 v.groups=v.groups.filter(g=>g.key===size.groupKey);v.sizes=[structuredClone(size)];v.options=[];delete v.quantityTiers;delete v.backing;
 v.mountingRules=v.mountingRules.filter(r=>size.mounting.includes(r.id));
 const config=familyProductConfig(v,v.sizes[0],1,{previewOnly:true});
 for(const d of config.profile.designs)d.objects=[];
 const m=mountingFor(key),options=m?{mounting:m}:{};
 return productPreview({universal:config},{options,keepout:false,designArea:false});
}
// Konfi-Auswahl heißt B02S, die Katalogregel je Größe z. B. B02S-E6-D4.
const mountingFor=key=>!mounting||mounting==='K00'?mounting:family.sizes.find(s=>s.key===key)?.mounting.some(id=>id===mounting||id.startsWith(mounting+'-'))?mounting:false;

const results=[];
for(const job of jobs){
 const t=Date.now(),entry={...job};
 try{
  if(job.kind==='leer'){
   if(mountingFor(job.size)===false)throw Error('Befestigung '+mounting+' gibt es für diese Größe nicht.');
   entry.svg=blankSvg(job.size);entry.status='leer';entry.issues=[];entry.label=sizeLabel(job.size);
  }else{
   const preview={designArea:view==='pruefung'};
   const r=await targetDesignPreview(root,{reihe:job.reihe,id:job.id,familie:opt.familie,size:job.size||undefined},{katalog,preview});
   entry.size=r.size.key;entry.label=r.size.label;
   const m=mountingFor(entry.size);if(m===false)throw Error('Befestigung '+mounting+' gibt es für diese Größe nicht.');
   if(m){const again=await targetDesignPreview(root,{reihe:job.reihe,id:job.id,familie:opt.familie,size:entry.size},{katalog,preview:{...preview,options:{mounting:m},mountingPlacement:true}});r.svg=again.svg;}
   entry.svg=r.svg;entry.status=r.svg?r.fit.status:'passt nicht';entry.issues=r.fit.issues;
   if(!r.svg)throw Error(r.fit.issues.at(-1)||'Keine Vorschau');
  }
  const base=(job.kind==='leer'?'grundplatte':safe(job.reihe)+'/'+safe(job.id))+'__'+safe(entry.size)+(mounting?'__'+mounting:'');
  entry.file=base+'.svg';fs.mkdirSync(path.dirname(path.join(out,entry.file)),{recursive:true});
  fs.writeFileSync(path.join(out,entry.file),entry.svg);
 }catch(error){entry.status='fehler';entry.issues=[...(entry.issues||[]),error.message];}
 delete entry.svg;entry.ms=Date.now()-t;results.push(entry);
}
const svgMs=Date.now()-started;

// PNG: ein Chromium, eine Seite, nur Laden + Screenshot je Datei.
let pngMs=0;
const require=createRequire(import.meta.url);
async function withPages(n,viewport,fn){
 const {chromium}=require('playwright'),browser=await chromium.launch();
 try{const pages=await Promise.all(Array.from({length:n},()=>browser.newPage({viewport})));return await fn(pages);}finally{await browser.close();}
}
if(opt.png){
 const t=Date.now();
 await withPages(4,{width,height:width},async pages=>{
  const queue=results.filter(r=>r.file);
  await Promise.all(pages.map(async page=>{for(let r;(r=queue.shift());){
   const svg=fs.readFileSync(path.join(out,r.file),'utf8').replace('<svg ','<svg id="vorlage" style="display:block;width:'+width+'px;height:auto" ');
   await page.setContent('<!doctype html><html><body style="margin:0;background:transparent">'+svg+'</body></html>',{waitUntil:'load'});
   r.png=r.file.replace(/\.svg$/,'.png');
   await (await page.$('#vorlage')).screenshot({path:path.join(out,r.png),omitBackground:true});
  }}));
 });
 pngMs=Date.now()-t;
}

const count=results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{});
const summary={katalog:root,familie:opt.familie,befestigung:mounting,ansicht:view,anzahl:results.length,status:count,ms:{svg:svgMs,png:pngMs,gesamt:Date.now()-started},ergebnisse:results};
fs.writeFileSync(path.join(out,'index.json'),JSON.stringify(summary,null,1)+'\n');

if(opt.bogen){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const color={passt:'#2e7d32','prüfen':'#e08a00','passt nicht':'#c62828',fehler:'#c62828',leer:'#607d8b'};
 const cards=results.map(r=>'<figure><div class="bild">'+(r.file?'<img src="'+esc(r.png||r.file)+'">':'')+'</div><figcaption><b>'+esc(r.id||'Grundplatte')+'</b> <span>'+esc(r.label||r.size||'')+'</span><i style="background:'+(color[r.status]||'#555')+'">'+esc(r.status)+'</i>'+(r.issues?.length?'<ul>'+r.issues.slice(0,4).map(i=>'<li>'+esc(i)+'</li>').join('')+(r.issues.length>4?'<li>… '+(r.issues.length-4)+' weitere</li>':'')+'</ul>':'')+'</figcaption></figure>').join('');
 const html='<!doctype html><meta charset="utf-8"><title>Kontaktbogen '+esc(opt.familie)+'</title><style>body{font:13px system-ui,sans-serif;margin:24px;background:#fff;color:#222}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 16px;color:#555}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}figure{margin:0;border:1px solid #ddd;border-radius:6px;padding:10px}.bild{background:#f3f3f1;display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;padding:8px}.bild img{max-width:100%;max-height:100%}figcaption{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}figcaption span{color:#666}i{font-style:normal;color:#fff;border-radius:3px;padding:1px 6px;margin-left:auto}ul{margin:4px 0 0;padding-left:16px;width:100%;color:#a33;font-size:12px}</style><h1>Kontaktbogen · '+esc(family.name)+'</h1><p>'+results.length+' Dateien · '+Object.entries(count).map(([k,v])=>v+' '+k).join(' · ')+(mounting?' · Befestigung '+esc(mounting):'')+'</p><main>'+cards+'</main>';
 fs.writeFileSync(path.join(out,'kontaktbogen.html'),html);
 if(opt.png)await withPages(1,{width:1400,height:900},async ([page])=>{await page.goto('file://'+path.join(out,'kontaktbogen.html'),{waitUntil:'load'});await page.screenshot({path:path.join(out,'kontaktbogen.png'),fullPage:true});});
}
console.log(JSON.stringify({anzahl:results.length,status:count,ms:summary.ms,out},null,1));
