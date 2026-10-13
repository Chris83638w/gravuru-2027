// Probelauf: Welche vorhandenen Designs passen auf welche Größen und Materialien?
//
// Liest nur. Schreibt nichts in die Werkstatt, ändert keine Produkte.
// Ergebnis: Bericht je Design × Material × Zielgröße (passt / prüfen / passt nicht)
// als CSV (Excel) und JSON, dazu eine Übersicht in der Konsole.
//
// Grundsatz: Ein Design gehört nicht zu einem Material, sondern zu einem Format.
// Ein Gedenktafel-Design 30 × 20 cm kann so auf Edelstahl, Acryl schwarz/anthrazit
// oder Schiefer natur/premium laufen – jede Familie bringt ihre eigenen Maße,
// Ränder, Bohrbilder und Preise mit.
//
// Regeln für eine Übertragung:
//  - gleiches Verfahren (Gravur-Designs nur auf Gravur-Familien, Druck nur auf Druck)
//  - gleiche Formklasse (eckig inkl. abgerundeter Ecken ↔ eckig, oval ↔ oval)
//  - gleiches Seitenverhältnis (± 1 %)
//  - das ganze Design wird gleichmäßig skaliert (Schriften, Motive, Abstände)
// Danach Prüfung mit denselben Regeln wie Werkstatt und Konfigurator:
//  - jedes Element liegt in der Kontur inkl. Gestaltungsrand der Familie → sonst „passt nicht“
//  - Text in einer Bohrloch-Schutzzone (je Befestigung der Zielgröße)     → „prüfen“
//
// Aufruf:
//   node scripts/plan-family-designs.mjs --designs /PRIVAT/import.json \
//        --family app/designs/steel-door-signs/family.json [--family weitere.json …] \
//        --out /PRIVAT/design-plan/
// --designs: Datei mit {designs:[{id,title,category,productId,state:{objects}}]}.
//   productId = SKU der Ausgangsgröße in einer der Familien.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {objectIssue} from '../app/platform/sources/app/shared/models/design-content.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {holesFor} from '../app/platform/sources/app/shared/models/mounting-rules.mjs';
import {textsNearHoles} from '../app/platform/sources/app/shared/models/hole-proximity.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';

const args=process.argv.slice(2),values=name=>args.flatMap((v,i)=>v==='--'+name&&args[i+1]?[args[i+1]]:[]);
const designsPath=values('designs')[0]||values('seed')[0],out=values('out')[0];
const familyPaths=values('family').length?values('family'):['app/designs/steel-door-signs/family.json'];
if(!designsPath||!out)throw Error('Bitte --designs und --out angeben.');
const source=JSON.parse(fs.readFileSync(designsPath,'utf8'));
const families=familyPaths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
const {fonts}=workshopResources();

// Motive stehen in einem quadratischen Rahmen (viewBox 0 0 100 100). Schmale
// Ornamente/Linien füllen davon oft nur einen Streifen. Geprüft wird darum der
// sichtbare Inhalt, nicht der Rahmen: einmal je Motiv gerastert (CairoSVG), Ergebnis
// als Anteil des Rahmens. Ohne SVG oder Python bleibt der volle Rahmen (strenger).
const usedMotifs=new Set(source.designs.flatMap(d=>d.state.objects.filter(o=>o.type==='motif').map(o=>o.motif)));
const motifSvg=Object.fromEntries((source.motifs||[]).flatMap(m=>{const key=usedMotifs.has(m.id)?m.id:usedMotifs.has('import-'+m.id)?'import-'+m.id:null;return key&&m.svg?[[key,m.svg]]:[];}));
const contentBox=(()=>{
 if(!Object.keys(motifSvg).length)return {};
 const py=`import json,io,sys,cairosvg
from PIL import Image
r={}
for k,s in json.load(sys.stdin).items():
    try:
        im=Image.open(io.BytesIO(cairosvg.svg2png(bytestring=('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="400" height="400">'+s+'</svg>').encode()))).split()[-1]
        b=im.getbbox(); r[k]=[b[0]/400,b[1]/400,b[2]/400,b[3]/400] if b else None
    except Exception: pass
print(json.dumps(r))`;
 const run=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-I','-c',py],{input:JSON.stringify(motifSvg),encoding:'utf8',maxBuffer:64<<20});
 if(run.status!==0){console.warn('Hinweis: Motiv-Inhalt nicht messbar, geprüft wird der volle Rahmen.',run.stderr.slice(-300));return {};}
 return JSON.parse(run.stdout);
})();
// Box des sichtbaren Inhalts (x/y = Mittelpunkt wie im Design). Gedrehte Motive: voller Rahmen.
function visible(o){
 const b=o.type==='motif'&&!o.rotation&&contentBox[o.motif];
 if(!b)return o;
 const left=o.x-o.w/2+b[0]*o.w,top=o.y-o.h/2+b[1]*o.h,w=(b[2]-b[0])*o.w,h=(b[3]-b[1])*o.h;
 return {...o,x:left+w/2,y:top+h/2,w,h};
}

const process_=f=>/engraving/.test(f.material?.processingProfileId||'')?'Gravur':'Druck';
const shapeClass=g=>g.shape==='ellipse'?'oval':'eckig';
// Every size of every family, with everything the checks need.
const targets=families.flatMap(f=>{const groups=new Map(f.groups.map(g=>[g.key,g])),rules=new Map(f.mountingRules.map(r=>[r.id,r]));
 return f.sizes.map(s=>{const g=groups.get(s.groupKey);return {family:f,size:s,group:g,process:process_(f),shape:shapeClass(g),ratio:s.widthMm/s.heightMm,
  geometry:{width:s.widthMm,height:s.heightMm,shape:g.shape,cornerRadiusMm:g.cornerRadiusMm,safeMarginMm:f.designArea.marginMm,holes:[]},
  mountings:s.mounting.map(id=>rules.get(id)),keepoutMm:f.designArea.keepoutMm};});});
const bySku=new Map(targets.map(t=>[t.size.key,t]));

// Uniform scaling of the complete design; text boxes are re-measured with the real font.
function scaled(objects,k){
 return objects.map(o=>{
  const n={...o,x:o.x*k,y:o.y*k,w:o.w*k,h:o.h*k};
  if(o.type==='text'){n.size=o.size*k;if(o.letterSpacing!==undefined)n.letterSpacing=o.letterSpacing*k;measureText(n,fonts);}
  if(o.strokeWidth!==undefined)n.strokeWidth=o.strokeWidth*k;
  return n;
 });
}
const label=o=>o.type==='text'?'Text „'+String(o.text).slice(0,30)+'“':o.type==='motif'?'Motiv '+o.motif:o.type;

const rows=[];
for(const design of source.designs){
 const from=bySku.get(design.productId);
 if(!from){rows.push({design,status:'übersprungen',note:'Ausgangsgröße '+design.productId+' in keiner Familie'});continue;}
 for(const to of targets){
  if(to.process!==from.process||to.shape!==from.shape||Math.abs(to.ratio-from.ratio)/from.ratio>0.01)continue;
  const k=to.size.widthMm/from.size.widthMm,base={design,from,to,scale:k};
  let objects;
  try{objects=scaled(design.state.objects,k);}catch(e){rows.push({...base,status:'passt nicht',note:/Schriftgröße/.test(e.message)?'Schrift würde größer als 100 mm (Grenze von Editor und Konfigurator) – für diese Größe eigenes Design':'Skalierung nicht möglich: '+e.message});continue;}
  const outside=objects.map(o=>[o,objectIssue(visible(o),{kind:'universal-product',geometry:to.geometry})]).filter(([,issue])=>issue);
  if(outside.length){rows.push({...base,status:'passt nicht',note:outside.map(([o,issue])=>label(o)+': '+issue).join(' · ')});continue;}
  const notes=[];
  for(const r of to.mountings){
   const holes=holesFor(to.geometry,r),near=textsNearHoles({objects},{geometry:{...to.geometry,holes}},null,to.keepoutMm);
   if(near.length)notes.push(r.skuSuffix+' ('+r.edgeMm+' mm Rand): Text am Bohrloch – '+near.map(n=>'„'+n.text+'“').join(', '));
  }
  rows.push({...base,status:notes.length?'prüfen':'passt',note:notes.join(' · ')});
 }
}

// Report
fs.mkdirSync(out,{recursive:true});
const cell=v=>'"'+String(v??'').replaceAll('"','""')+'"',name=t=>t?t.group.name+' '+t.size.label:'';
const header=['Design-ID','Titel','Kategorie','Ausgang','Material / Familie','Zielgröße','SKU','Skalierung','Status','Hinweis'];
const csv=[header,...rows.map(r=>[r.design.id,r.design.title,r.design.category,name(r.from),r.to?.family.name,name(r.to),r.to?.size.key,r.scale?r.scale.toFixed(3).replace('.',','):'',r.status,r.note])].map(l=>l.map(cell).join(';')).join('\n');
fs.writeFileSync(path.join(out,'design-plan.csv'),'﻿'+csv);
const perSize=targets.map(t=>{const own=rows.filter(r=>r.to===t);return {family:t.family.id,familyName:t.family.name,sku:t.size.key,label:name(t),passt:own.filter(r=>r.status==='passt').length,pruefen:own.filter(r=>r.status==='prüfen').length,passtNicht:own.filter(r=>r.status==='passt nicht').length};});
fs.writeFileSync(path.join(out,'design-plan.json'),JSON.stringify({families:families.map(f=>({id:f.id,name:f.name,source:f.source?.sha256})),designs:source.designs.length,perSize,rows:rows.map(r=>({design:r.design.id,title:r.design.title,category:r.design.category,from:r.from?.size.key,family:r.to?.family.id,to:r.to?.size.key,scale:r.scale,status:r.status,note:r.note}))},null,1));

const count=s=>rows.filter(r=>r.status===s).length;
console.log(`Designs: ${source.designs.length} · Familien: ${families.map(f=>f.name).join(', ')}`);
console.log(`Zuordnungen: ${rows.length} · passt ${count('passt')} · prüfen ${count('prüfen')} · passt nicht ${count('passt nicht')} · übersprungen ${count('übersprungen')}`);
for(const f of families){
 const sizes=perSize.filter(s=>s.family===f.id),covered=sizes.filter(s=>s.passt+s.pruefen>0);
 console.log(`\n${f.name}: ${covered.length} von ${sizes.length} Größen mit Designs`);
 for(const s of covered)console.log(`  ${s.label.padEnd(34)} passt ${String(s.passt).padStart(3)} · prüfen ${String(s.pruefen).padStart(3)} · passt nicht ${String(s.passtNicht).padStart(3)}`);
 console.log(`  Ohne Design: ${sizes.length-covered.length} Größen → neue Designs mit dem Plugin (Schablonen im Briefing).`);
}
console.log(`\nBericht: ${path.join(out,'design-plan.csv')}`);
