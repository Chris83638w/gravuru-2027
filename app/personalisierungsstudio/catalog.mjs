import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {workshopResources} from '../workshop/catalog.mjs';
import {multiply,scene} from './render.mjs';

export const hash = value => createHash('sha256').update(value).digest('hex');
const python = () => process.env.STUDIO_PYTHON || (process.platform==='win32'?'python':'python3');
export const here = name => fileURLToPath(new URL(name,import.meta.url));
function importer(script,args,input) {
  const res = spawnSync(python(),[here(script),...args],{input:JSON.stringify(input??null),encoding:'utf8',maxBuffer:48*1024*1024,windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});
  if (res.error || res.status!==0) throw Error(res.error?.message || (res.stderr||'Import fehlgeschlagen.').trim());
  return JSON.parse(res.stdout);
}
export function worker(action,payload) {
  return new Promise((resolve,reject)=>{
    const proc=spawn(python(),[here('worker.py'),action],{stdio:'pipe',windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});
    const output=[],errors=[];
    proc.on('error',reject);
    proc.stdout.on('data',chunk=>output.push(chunk));
    proc.stderr.on('data',chunk=>errors.push(chunk));
    proc.stdin.on('error',()=>{});
    proc.on('close',code=>code===0 ? resolve(Buffer.concat(output)) : reject(Error(Buffer.concat(errors).toString().trim() || 'Dateiverarbeitung fehlgeschlagen.')));
    proc.stdin.end(JSON.stringify(payload));
  });
}
function check(flag,msg) { if(!flag) throw Error(msg); }
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const seedLabels = {
  'RE-90X60-HOC-08-2':'Namen','RE-90X60-HOC-08-3':'Spruch','RE-90X60-HOC-08-4':'Datum',
  'RE-90X60-EIN-10-2':'Überschrift','RE-90X60-EIN-10-3':'Zusatzzeile','RE-90X60-EIN-10-4':'Familienname'
};
export function nativeDesigns(source, resources) {
  const p=source.product;
  check(p.shape==='rect' && p.cornerRadiusMm===0 && !p.cutPaths?.length,'Für diese Produktform die bestätigte Schnittkontur als SVG importieren.');
  const {widthMm:w,heightMm:h}=p;
  const designs=source.designs.map(d=>{
    const s=d.state;
    check(!d.productId || d.productId===p.id,'Produkt und Bestandsvorlage haben unterschiedliche Kennungen.');
    check(s.width===w && s.height===h && s.holes===false && s.holeCount===0 && s.spacers===false && !s.personalItems?.length,'Technische Ausführung gesondert zuordnen.');
    const objects=s.objects.map(o=>{
      if(o.type==='text') return {...o,key:o.fieldKey||o.id,label:o.fieldLabel||seedLabels[o.id]||o.text};
      check(o.type==='motif','Nicht unterstützte Bestands-Ebene: '+o.type);
      const m=resources.motifs.find(item=>item.key===o.motif);
      check(m,'Originalmotiv fehlt: '+o.motif);
      const [bx,by,bw,bh]=m.bounds;
      check(bw>0 && bh>0,'Motiv ohne gültige Originalmaße.');
      const matrix=[o.w/bw,0,0,o.h/bh,-o.w/2-bx*o.w/bw,-o.h/2-by*o.h/bh];
      const [paths]=importer('worker.py',['motifs'],[m.svgFragment]);
      return {...o,motifName:m.name||o.motif,editable:o.locked!==true,paths:paths.map(path=>({...path,matrix:multiply(matrix,path.matrix),fill:o.color||path.fill}))};
    });
    return {id:d.id,name:[d.title,d.category].filter(Boolean).join(' · '),width:w,height:h,cuts:['M0 0 H'+w+' V'+h+' H0 Z'],objects};
  });
  const pool=new Map();
  for(const d of designs) for(const o of d.objects.filter(o=>o.editable)) pool.set(o.motif,{id:o.motif,name:o.motifName,w:o.w,h:o.h,paths:o.paths});
  for(const d of designs) if(d.objects.some(o=>o.editable)) d.motifs=[...pool.values()];
  return designs;
}
export function compile(designs, resources) {
  check(designs.length>0 && new Set(designs.map(d=>d.id)).size===designs.length,'Design-ID fehlt oder ist doppelt.');
  const assets=new Map();
  const startup=new Map();
  for(const d of designs) for(const o of d.objects.filter(o=>o.type==='text')) {
    const id=o.font+'#'+(o.bold?'bold':'regular');
    if(!startup.has(id)) startup.set(id,new Set(' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÄÖÜäöüß0123456789.,:;!?&+*()-/’\''));
    for(const c of o.text) startup.get(id).add(c);
  }
  const saveAsset=value=>{const raw=JSON.stringify(value), key=hash(raw);assets.set(key,raw);return key;};
  const entries=designs.map(design=>{
    check(idPattern.test(design.id) && typeof design.name==='string' && design.width>0 && design.height>0 && [design.width,design.height].every(Number.isFinite),'Ungültige Vorlagenmaße oder ID.');
    importer('worker.py',['cuts'],design.cuts);
    check(design.cuts.length>0,'Schnittkontur fehlt.');
    const fonts={},faces={},keys=new Set();
    check(design.objects.filter(o=>o.type==='photo').length<=1,'Mehrere Fotofelder benötigen eine eigene Zuordnung.');
    for(const o of design.objects) {
      check([o.x,o.y,o.rotation||0].every(Number.isFinite),'Ungültige Position.');
      if(o.type==='photo') check(o.w>0 && o.h>0 && [o.w,o.h].every(Number.isFinite),'Fotoabmessungen fehlen.');
      if(o.type!=='text') continue;
      check(idPattern.test(o.key) && !keys.has(o.key) && !['__proto__','constructor','prototype'].includes(o.key),'Textfeld benötigt einen eindeutigen Schlüssel.');
      keys.add(o.key);
      const style=o.bold?'bold':'regular';
      const face=resources.fonts[o.font]?.[style];
      check(face,'Originalschrift nicht vorhanden: '+o.font+' '+style);
      fonts[o.font]??={}; fonts[o.font][style]=face;
      if(faces[o.font]?.[style]) continue;
      const original=startup.get(o.font+'#'+style);
      const glyphs=Object.entries(face.glyphs);
      const subset=choose=>({...face,glyphs:Object.fromEntries(glyphs.filter(([c])=>choose(c)))});
      faces[o.font]??={};
      faces[o.font][style]={initial:saveAsset(subset(c=>original.has(c))),full:saveAsset(face)};
    }
    scene(design,fonts);
    const published=design.motifs?{...design,motifs:design.motifs.map(({paths,...m})=>({...m,key:saveAsset(paths)}))}:design;
    const data=JSON.stringify({design:published,faces}), key=hash(data);
    assets.set(key,data);
    return {id:design.id,name:design.name,key,width:design.width,height:design.height};
  });
  const index=JSON.stringify(entries);
  const startAssets=new Map();
  let startBytes=0;
  for(const entry of entries.slice(0,2)){
    const value=JSON.parse(assets.get(entry.key));
    const keys=new Set([entry.key,...Object.values(value.faces).flatMap(styles=>Object.values(styles).map(face=>face.initial))]);
    const added=[...keys].filter(k=>!startAssets.has(k));
    const size=added.reduce((n,k)=>n+Buffer.byteLength(assets.get(k)),0);
    if(startBytes+size>1_100_000)break;
    for(const k of added)startAssets.set(k,JSON.parse(assets.get(k)));
    startBytes+=size;
  }
  return {revision:hash(index),index,assets,bootstrap:JSON.stringify(Object.fromEntries(startAssets))};
}
export function importFiles(files) {
  const resources=workshopResources(), designs=[];
  for(const path of files) {
    if(path.toLowerCase().endsWith('.svg')) designs.push(importer('imports.py',['svg',path]));
    else {
      const source=JSON.parse(fs.readFileSync(path,'utf8'));
      check(source.product && Array.isArray(source.designs),'Für FPD/rekonstruierte Corel-Daten zuerst inspect ausführen.');
      designs.push(...nativeDesigns(source,resources));
    }
  }
  return compile(designs,resources);
}
export const inspectFile = path => importer('imports.py',['inspect',path]);
export const corelMotifProof = path => importer('imports.py',['corel-proof',path]);
