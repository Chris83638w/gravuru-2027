// Publishable review artifacts only: no import, approvals or live changes.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {katalogFor} from '../app/workshop/design-dashboard.mjs';
import {renderReviewSheets} from './slate-review-sheets.mjs';
const require=createRequire(import.meta.url),args=process.argv.slice(2),value=k=>args[args.indexOf(k)+1];
const root=path.resolve(value('--katalog')),work=path.resolve(value('--work')),kind=value('--family');
if(!['premium','natur','geschnitten','kordel'].includes(kind))throw Error('--family fehlt');
const katalog=katalogFor(root,{maxAgeMs:0}),family=katalog.families.get('schiefer-tafeln-'+kind),source=path.join(work,'slate-design-render-'+kind),out=path.join(root,'auftraege/2026-11-04-schiefer-designziele',kind);
const read=p=>JSON.parse(fs.readFileSync(p)),index=read(path.join(source,'index.json')),area=read(path.join(out,'flaechenpruefung.json'));
const key=r=>r.reihe+'|'+r.id+'|'+r.size;
const measurements=new Map(area.rows.map(r=>[key(r),r]));
const results=index.ergebnisse.filter(r=>!r.reihe.startsWith('schiefer-menschen-')).map(row=>{
 const r={...row,issues:[...row.issues],rendererStatus:row.status},master=katalog.designs.masters.find(d=>d.seriesFolder===r.reihe&&d.id===r.id),sourceArea=master.json.gestaltungsflaeche??master.json.flaeche;
 if(sourceArea){
  r.sourceArea=sourceArea;const a=sourceArea.fa??sourceArea.flaeche,x=sourceArea.cx??sourceArea.versatzX,y=sourceArea.cy??sourceArea.versatzY,h=sourceArea.fh??sourceArea.hoehe;
  const flags=[];if(a<.30)flags.push('Fläche '+Math.round(a*100)+' %');if(Math.abs(x)>.03)flags.push('Versatz x '+Math.round(x*100)+' %');if(Math.abs(y)>.03)flags.push('Versatz y '+Math.round(y*100)+' %');if(master.plateMm[0]>master.plateMm[1]*1.15&&h<.45)flags.push('Höhe '+Math.round(h*100)+' %');
  if(flags.length){r.issues.push('Quellmessung prüfen: '+flags.join(', ')+'. Vorhandene Gestaltung unverändert.');if(r.status==='passt')r.status='prüfen';}
 }
 const measured=measurements.get(key(r));
 if(measured){r.measurement=measured;const flags=[...new Set(measured.measurements.flatMap(m=>m.befund))];if(flags.length){r.issues.push('Bildmessung: '+flags.join(', '));if(r.status==='passt')r.status='prüfen';}if(!measured.measured){r.issues.push(measured.limitation);if(r.status==='passt')r.status='prüfen';}}
 return r;
});
async function withPages(n,viewport,fn){const browser=await require('playwright').chromium.launch();try{return await fn(await Promise.all(Array.from({length:n},()=>browser.newPage({viewport}))));}finally{await browser.close();}}
await renderReviewSheets({results,out:source,root,family,katalog,png:true,withPages,reuseSources:true});
const sheets=read(path.join(source,'boegen.json'));fs.mkdirSync(out,{recursive:true});
for(const sheet of sheets)fs.copyFileSync(path.join(source,sheet.file),path.join(out,sheet.file));
const status=results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),rendererStatus=results.reduce((a,r)=>(a[r.rendererStatus]=(a[r.rendererStatus]??0)+1,a),{});
const clean=results.map(({file,png,ms,...r})=>r);
const report={family:family.id,checks:results.length,designs:new Set(results.map(r=>r.reihe+'/'+r.id)).size,status,rendererStatus,approvalsSet:0,sheets:sheets.map(({html,...s})=>s),results:clean,measurementLimitation:'Bildmessung mit unverändertem flaeche-messen.py. Die Schiefertextur kann als Gravur erkannt werden; unauffällige Bildmessung ist kein Gestaltungsnachweis. Quellmesswerte ergänzt; Sichtprüfung entscheidet.'};
fs.writeFileSync(path.join(out,'pruefungen.json'),JSON.stringify(report,null,1)+'\n');
const scopedArea=area.rows.filter(r=>!r.reihe.startsWith('schiefer-menschen-'));fs.writeFileSync(path.join(out,'flaechenpruefung.json'),JSON.stringify({...area,images:scopedArea.length,measured:scopedArea.filter(r=>r.measured).length,flagged:scopedArea.filter(r=>r.measurements.some(m=>m.befund.length)).length,rows:scopedArea},null,1)+'\n');
fs.writeFileSync(path.join(out,'README.md'),'# '+family.name+' – Designprüfung\n\n'+report.checks+' Zielprüfungen; '+report.designs+' Designs. '+Object.entries(status).map(([s,n])=>n+' '+s).join(', ')+'. **Keine neue Freigabe gesetzt.** Bestehende Ziel-Freigaben unverändert; die Freigabe dieser Bögen ist offen.\n\n'+report.measurementLimitation+'\n\n| Format | Zielgruppe | Tafel | Bogen |\n|---|---|---|---|\n'+sheets.map(s=>'| '+s.format+' | '+s.group+' | '+s.size+' | ['+s.count+' Designs]('+s.file+') |').join('\n')+'\n');
console.log(JSON.stringify({kind,checks:report.checks,designs:report.designs,status,sheets:sheets.length}));
