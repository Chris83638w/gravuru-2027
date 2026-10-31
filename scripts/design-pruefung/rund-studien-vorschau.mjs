// Isolierter Prüfstand für rund-studien.py. Keine Mutation des Quellkatalogs.
// Original-IDs sind ausschließlich interne Leseschlüssel der temporären Kopie;
// die Anzeige nennt D-Nummer und „Kennung offen“, keine neue Katalogkennung.
import fs from 'node:fs';
import path from 'node:path';
import {targetDesignPreview} from '../../app/workshop/design-target-preview.mjs';
const arg=n=>process.argv.find(v=>v.startsWith('--'+n+'='))?.slice(n.length+3);
const source=path.resolve(arg('katalog')),studies=path.resolve(arg('studien')),out=path.resolve(arg('out'));
const temp=path.join(out,'pruefkatalog'),series='rund-studien';
fs.mkdirSync(temp,{recursive:true});
for(const part of ['familien','linien','schriften','motive']){
 const link=path.join(temp,part);if(!fs.existsSync(link))fs.symlinkSync(path.join(source,part),link,'junction');
}
fs.copyFileSync(path.join(source,'themen.json'),path.join(temp,'themen.json'));
const family=JSON.parse(fs.readFileSync(path.join(source,'familien/edelstahl/steel-door-signs.json'),'utf8'));
const sizes=family.sizes.filter(s=>s.groupKey==='R').map(s=>s.key);
const mapping=JSON.parse(fs.readFileSync(path.join(studies,'zuordnung.json'),'utf8'));
const results=[],index=[];
for(const entry of mapping.filter(e=>e.study)){
 const study=JSON.parse(fs.readFileSync(path.join(studies,entry.study,'studie.json'),'utf8'));
 const original=JSON.parse(fs.readFileSync(path.join(source,'designs/edelstahl-gravur-80x80',entry.source,'design.json'),'utf8'));
 const d={...original,...study,id:entry.source,plate:{widthMm:65,heightMm:65},sizes,formatreihe:'Rund',
  masterSheet:{familySize:sizes[0],plateMm:[65,65]},ziele:[{familie:'steel-door-signs',freigabe:null}],
  katalog:{...original.katalog,series,key:series+'-'+entry.study}};
 delete d.production;delete d.transfer;delete d.freigabe;
 const dir=path.join(temp,'designs',series,entry.source);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'design.json'),JSON.stringify(d,null,1));
 fs.copyFileSync(path.join(studies,entry.study,'studie.svg'),path.join(dir,'design.svg'));
 index.push({key:entry.source,pfad:entry.source,name:d.name,plateMm:[65,65],groessen:sizes});
}
fs.writeFileSync(path.join(temp,'designs',series,'index.json'),JSON.stringify(index));
for(const entry of mapping){
 if(!entry.study){results.push(entry);continue;}
 try{
  const preview=await targetDesignPreview(temp,{reihe:series,id:entry.source,familie:family.id,mounting:'K00'});
  if(preview.svg)fs.writeFileSync(path.join(out,entry.study+'.svg'),preview.svg);
  results.push({...entry,fit:preview.reviewFit,preview:!!preview.svg});
  console.log(entry.study,preview.reviewFit.status);
 }catch(error){results.push({...entry,error:error.message});console.log(entry.study,error.message);}
}
fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(results,null,1));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cards=results.map(r=>`<article id="${r.study||'D14'}"><h2>${r.study||'D14'} <small>· Kennung offen</small></h2><div class="pair"><div><span>Quadrat · Original</span><img src="../quadrat-vorlagen/${esc(r.source)}.svg"></div><div><span>Rund · Studie 65 mm</span>${r.preview?`<img src="${r.study}.svg">`:`<p>${esc(r.error||r.grund||'Vorschau fehlt')}</p>`}</div></div><p>${esc(r.fit?.status||r.status)}${r.deviations?.length?' · '+esc(r.deviations.join(' ')):''}</p><details><summary>Prüfhinweise</summary><p>${esc(r.fit?.issues?.join(' | ')||r.error||r.grund||'Keine Passungswarnung')}</p></details></article>`).join('');
fs.writeFileSync(path.join(out,'kontaktbogen.html'),`<!doctype html><html lang="de"><meta charset="utf-8"><title>Issue 85 · Runde Studien</title><style>body{margin:24px;background:#f6f5f2;color:#252820;font:14px system-ui}h1{font-weight:500}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:16px}article{background:white;padding:16px;border:1px solid #ddd;border-radius:8px}h2{font-size:18px;font-weight:500;margin:0 0 14px}small{font-size:12px;color:#666}.pair{display:flex;gap:10px}.pair>div{width:50%}img{width:100%;height:210px;object-fit:contain}span{font-size:12px;color:#777}details{font-size:12px;color:#666}details p{max-height:180px;overflow:auto}</style><h1>Runde Schilder · Kompositionsstudien</h1><p>Original links, Kreis rechts. Beide Ansichten aus der nativen Konfigurator-Zielvorschau. Kreis ohne Befestigung; Prüfung umfasst alle fünf Größen und Befestigungen.</p><p>Studienstand: keine neue Katalogkennung, keine Freigabe. D14: Schrift Welcome fehlt. Acryl-Zielprüfung folgt nach Bereitstellung der Familien aus #48.</p><main>${cards}</main></html>`);
console.log(JSON.stringify(results.reduce((a,r)=>(a[r.fit?.status||'offen']=(a[r.fit?.status||'offen']||0)+1,a),{})));
