// Rückweg Werkstatt → Katalog (Design-Dashboard, Chris 23.10.2026). Kein Git-Commit aus der App:
//   node scripts/katalog-writeback.mjs --katalog <pfad>
//       Übersicht offener Änderungen im Katalog (Protokolle designs/<reihe>/_aenderungen.jsonl, geänderte
//       Dateien, git status) für den Commit durch den Betreiber.
//   node scripts/katalog-writeback.mjs --korrekturen <werkstatt.sqlite> [--katalog <pfad>] [--apply] [--svg] [--json <datei>]
//       Gespeicherte Händlerkorrekturen (design-corrections) als Lieferform-2-Änderung in design.json des
//       passenden Katalogdesigns. Dry-run ist Standard; --apply schreibt JSON + SVG + Protokoll
//       gemeinsam. --svg bleibt als kompatibles, nun überflüssiges Argument akzeptiert.
//   node scripts/katalog-writeback.mjs --katalog <pfad> --reihe <reihe> --design <id> --template <json> [--apply]
//       Vollständiger Editorstand {checksum,template}: derselbe Fit- und Rückweg wie im Dashboard.
import fs from 'node:fs';
import {createDesignEditor} from '../app/workshop/design-editor.mjs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {katalogPath} from '../app/workshop/katalog-source.mjs';
import {pendingChanges} from '../app/workshop/design-dashboard.mjs';
import {readCorrections,planCorrectionWriteback,applyCorrectionWriteback,formatPlan} from '../app/workshop/katalog-writeback.mjs';

const arg=name=>{const i=process.argv.indexOf('--'+name);return i>0&&!String(process.argv[i+1]??'').startsWith('--')?process.argv[i+1]:undefined;};
const flag=name=>process.argv.includes('--'+name);
const katalogDir=arg('katalog')||katalogPath();
if(!katalogDir){console.error('Katalogpfad fehlt: --katalog <pfad> oder GRAVURU_KATALOG.');process.exit(2);}
const root=path.resolve(katalogDir);
if(!fs.existsSync(path.join(root,'designs'))){console.error('Kein Katalog unter '+root+' (Ordner designs/ fehlt).');process.exit(2);}

function gitStatus(){
 try{return execFileSync('git',['-C',root,'status','--porcelain','--','designs'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch{return null;}
}

// --template contains {checksum,template}, exported from the editor. It uses the
// same server-owned original template, fit calculation and atomic save as HTTP.
const templateFile=arg('template'),korrekturen=arg('korrekturen');
if(templateFile){
 const input=JSON.parse(fs.readFileSync(path.resolve(templateFile),'utf8')),reihe=arg('reihe'),id=arg('design');
 if(!reihe||!id||!input.checksum||!input.template)throw Error('--template benötigt --reihe, --design und JSON mit checksum/template.');
 const editor=createDesignEditor(),opened=await editor.open(root,{reihe,id}),document=structuredClone(opened.document);
 document.config.profile.designs[0]=input.template;
 const request={reihe,id,checksum:input.checksum,document};
 const result=flag('apply')?await editor.save(root,request,{actor:'katalog-writeback'}):await editor.fit(root,request);
 console.log(JSON.stringify(result,null,1));
 if(!flag('apply'))console.log('Dry-run: nichts geschrieben. --apply speichert design.json, design.svg und Protokoll gemeinsam.');
}else if(!korrekturen){
 const pending=pendingChanges(root);
 console.log('Offene Katalogänderungen aus dem Design-Dashboard ('+root+'):');
 if(!pending.length)console.log('  keine Protokolle (designs/<reihe>/_aenderungen.jsonl).');
 for(const p of pending){
  console.log('- '+p.reihe+': '+p.entries.length+' Einträge, zuletzt '+(p.entries.at(-1)?.at??'?'));
  for(const e of p.entries.slice(-20))console.log('    '+(e.at??'?')+' '+(e.actor??'?')+' '+(e.designId??'?')+' '+(e.changes?Object.entries(e.changes).map(([k,v])=>k+': '+JSON.stringify(v.from)+' → '+JSON.stringify(v.to)).join('; '):e.source??'')+(e.invalid?' (unlesbar)':''));
  if(p.entries.length>20)console.log('    … '+(p.entries.length-20)+' ältere Einträge');
  console.log('    Dateien: '+p.files.join(', '));
 }
 const status=gitStatus();
 console.log(status===null?'\ngit status: nicht verfügbar (kein Git im Katalogordner).':status?'\ngit status --porcelain -- designs:\n'+status:'\ngit status: keine ungesicherten Änderungen unter designs/.');
 console.log('\nCommit im Katalog-Repo durch den Betreiber, z. B.: git -C "'+root+'" add designs && git -C "'+root+'" commit -m "Designs: Korrekturen aus dem Dashboard"');
 const jsonFile=arg('json');if(jsonFile)fs.writeFileSync(jsonFile,JSON.stringify({root,pending,gitStatus:status},null,1)+'\n');
}else{
 const corrections=readCorrections(path.resolve(korrekturen));
 const plan=planCorrectionWriteback(root,corrections);
 console.log(formatPlan(plan));
 const jsonFile=arg('json');if(jsonFile)fs.writeFileSync(jsonFile,JSON.stringify(plan,null,1)+'\n');
 if(!flag('apply'))console.log('\nDry-run: nichts geschrieben. Mit --apply werden '+plan.counts.bereit+' Katalogdesigns (design.json + design.svg) geändert; Commit durch den Betreiber.');
 else{
  const written=applyCorrectionWriteback(plan);
  console.log('\nGeschrieben: '+(written.length?written.map(w=>w.designId+' ('+w.files.join(', ')+')').join('; '):'nichts')+'. Kein Commit – siehe `--katalog`-Übersicht.');
 }
}
