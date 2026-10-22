import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {createWorkshop} from '../app/workshop/http.mjs';import {createFontLibrary} from '../app/workshop/font-library.mjs';import {formMotif} from '../app/workshop/form-additions.mjs';import {formProductPreview} from '../app/workshop/form-product-preview.mjs';import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';import {retiredSteelDesigns,steelHoleClearanceMm,correctSteelLayout,settleSteelFlowers} from '../app/workshop/edelstahl-series-layout.mjs';
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ROOT=path.resolve(CODE,'../..'),OUT=path.join(ROOT,'outputs/Acryl-Serie-2027'),BEFORE=path.join(ROOT,'work/Vor-Edelstahl-Korrekturen'),SOURCE=path.join(ROOT,'work/Edelstahl-Korrekturen-Quelle');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),write=async(p,v)=>fs.writeFile(p,JSON.stringify(v,null,2)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
process.env.GRAVURU_PYTHON=process.argv[2];process.env.PYTHONPATH=process.argv[3];
const manifest=await read(path.join(BEFORE,'Anlageregister.json')),data=await read(path.join(SOURCE,'prepared.json')),geometry=await read(path.join(ROOT,'work/acryl-prepared.json')),sourceManifest=await read(path.join(SOURCE,'Quellen.json')),rawFonts=await read(path.join(ROOT,'work/acryl-font-resources.json')),dbDir=path.join(CODE,'.local-data/acryl-serie');
const sourceHash=sha(JSON.stringify(sourceManifest.files)),sourceRegister=await read(path.join(SOURCE,'Anlageregister.json'));assert.equal(data.designs.length,40);assert.equal(manifest.records.length,798);assert.equal(manifest.group.revision,3);
const fontLib=createFontLibrary({filename:path.join(dbDir,'design-assets.sqlite')});
const fontIds={};
for(const [name,meta] of Object.entries(data.fonts)){
 const result=await fontLib.import({name:path.basename(meta.path),bytes:(await fs.readFile(meta.path)).toString('base64'),allowMissing:true,reason:'Originalschrift der gewählten Bestandsdesigns erhalten; fehlende Zeichen bleiben gesperrt.'});fontIds[name]=result.id;
}
fontLib.close();
const seed=(await read(path.join(CODE,'app/configurator/variant-m/.preview/models.json')))[0];const workshop=createWorkshop({filename:path.join(dbDir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
try{
const fonts=workshop.fonts.resources(),designs=[];
for(const d of data.designs.filter(d=>!retiredSteelDesigns.has(d.id))){
 const fields=[];
 for(const [i,t] of d.texts.entries())for(const [lineNo,text] of t.text.split('\n').entries()){
  if(!text.trim())continue;
  const size=t.source?.masterSizeMm||t.sizePt*25.4/72,m=measureText({text,font:t.font,size,bold:false,italic:false},rawFonts);
  const x=t.anchorMm[0]-(t.align==='center'?m.w/2:t.align==='right'?m.w:0);
  const y=t.anchorMm[1]+lineNo*t.lineHeightMm-size*.35-m.h/2;
  fields.push({id:'text-'+(i+1)+'-'+(lineNo+1),label:(i===0?'Name':'Text '+(i+1))+(lineNo?' · Zeile '+(lineNo+1):''),type:'text',xMm:x,yMm:y,widthMm:m.w+.002,heightMm:m.h+.002,allowMove:true,allowScale:true,allowDelete:true,text,font:fontIds[t.font],sizeMm:size,color:'#000000',bold:false,italic:false,allowColor:false});
 }

 const motifFields=d.motifs.map((m,i)=>{const source=formMotif('acryl-'+d.id.split('-D')[1]+'-motiv-'+(i+1));return {id:'motiv-'+(i+1),label:source.name,type:'motif',xMm:m.box[0],yMm:m.box[1],widthMm:m.box[2],heightMm:m.box[3],allowMove:true,allowScale:true,allowDelete:true,motifKey:source.key,motifSha256:source.sha256,rotation:0,color:'#000000',allowColor:false};});
 const corrected=correctSteelLayout(d.id,fields,motifFields),{w,h}=corrected;
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="0 0 '+w+' '+h+'"><rect width="1" height="1" fill="none"/></svg>';
 const asset=await workshop.assets.import({name:d.id+'-Transparente-Basis.svg',bytes:Buffer.from(svg).toString('base64')});
 designs.push({source:d,asset,w,h,fields:corrected.fields,footer:corrected.footer,minSize:Math.min(...fields.map(f=>f.sizeMm))});
}
console.log(JSON.stringify({stage:'fonts-designs',fonts:Object.keys(fontIds).length,designs:designs.length}));
function distance(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy);}
function inside(x,y,poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))v=!v;}return v;}
function safeBox(x,y,w,h,row,holes){
 const poly=row.outerPolygon,margin=Math.min(3,Math.min(row.widthMm,row.heightMm)*.1),corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
 if(corners.some(([px,py])=>!inside(px,py,poly)))return false;
 for(let i=1;i<poly.length;i++){
  const a=poly[i-1],b=poly[i];
  if(Math.max(a[0],b[0])<x-margin||Math.min(a[0],b[0])>x+w+margin||Math.max(a[1],b[1])<y-margin||Math.min(a[1],b[1])>y+h+margin)continue;
  const qx=Math.max(x,Math.min(x+w,a[0])),qy=Math.max(y,Math.min(y+h,a[1]));
  if(Math.hypot(a[0]-qx,a[1]-qy)<margin)return false;
  for(let j=0;j<4;j++){
   if(distance(corners[j][0],corners[j][1],a,b)<margin)return false;
   const c=corners[j],d=corners[(j+1)%4],cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
   if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;
  }
 }
 for(const [hx,hy] of holes){const qx=Math.max(x,Math.min(x+w,hx)),qy=Math.max(y,Math.min(y+h,hy));if(Math.hypot(hx-qx,hy-qy)<row.diameterMm/2+steelHoleClearanceMm)return false;}
 return true;
}
const fitCache=new Map();
function fit(row,holes){
 const key=row.skuRoot+':'+holes.length;
 if(fitCache.has(key))return fitCache.get(key);
 const accepted=[],excluded=[];
 for(const d of designs){
  let hi=Math.min((row.sourceContourWidthMm-2)/d.w,(row.sourceContourHeightMm-2)/d.h,100/Math.max(...d.fields.filter(f=>f.type==='text').map(f=>f.sizeMm))),lo=0;
  for(let i=0;i<22;i++){const s=(hi+lo)/2,w=d.w*s,h=d.h*s,x=(row.sourceContourWidthMm-w)/2,y=(row.sourceContourHeightMm-h)/2;if(safeBox(x,y,w,h,row,holes))lo=s;else hi=s;}
  const s=lo*.999;
  if(d.minSize*s<3){excluded.push({id:d.source.id,reason:'Kleinster Text wäre unter 3 mm',sizeMm:d.minSize*s});continue;}
  const w=d.w*s,h=d.h*s,x=(row.sourceContourWidthMm-w)/2,y=(row.sourceContourHeightMm-h)/2;
  const fields=d.fields.map(f=>({...f,xMm:x+f.xMm*s,yMm:y+f.yMm*s,widthMm:f.widthMm*s,heightMm:f.heightMm*s,...(f.type==='text'?{sizeMm:f.sizeMm*s}:{})}));
  if(d.footer)settleSteelFlowers(fields,row,holes,safeBox);
  accepted.push({id:d.source.id.replace('TS-Edelstahl-','TS-Acryl-'),name:d.source.name,assetId:d.asset.assetId,sourceSha256:d.asset.sourceSha256,originalName:d.asset.originalName,xMm:x,yMm:y,widthMm:w,heightMm:h,sourcePrepared:true,fields});
 }
 const value={designs:accepted,excluded};fitCache.set(key,value);return value;
}


const entries=[],expected=new Map(),rowsByExcel=new Map(geometry.rows.map(r=>[r.excelRow,r]));let assignments=0,minText=Infinity;
for(const r of manifest.records){
 const row=rowsByExcel.get(r.sourceExcelRow);assert.ok(row,r.sku);assert.equal(row.formCode,r.form);assert.equal(row.actualSizeLabel,r.size);
 const old=workshop.repository.get(r.id,{revision:r.revision}),head=workshop.repository.get(r.id),document=structuredClone(old.document),holes=r.mounting.startsWith('B')?row.holes:[],fitted=fit(row,holes);
 document.designs=structuredClone(fitted.designs);if(!document.designs.some(d=>d.id===document.defaultDesignId))document.defaultDesignId=document.designs[0].id;
 assert.ok(document.designs.length);assert.equal(document.form.geometry.widthMm,row.sourceContourWidthMm);assert.equal(document.form.geometry.heightMm,row.sourceContourHeightMm);
 for(const design of document.designs)for(const f of design.fields){assert.ok(safeBox(f.xMm,f.yMm,f.widthMm,f.heightMm,row,holes),r.sku+' '+design.id+' '+f.id+' clearance');if(f.type==='text'){minText=Math.min(minText,f.sizeMm);assert.ok(f.sizeMm>=3);}else{const m=formMotif(f.motifKey,f.motifSha256);assert.ok(m);assert.equal(m.sha256,f.motifSha256);}assert.ok(f.allowMove&&f.allowScale&&f.allowDelete);}
 workshop.repository.validate(document);assert.equal(document.basePriceCents,r.priceCents);assert.equal(head.status,'draft');
 const key='acryl-steel-corrections:'+sourceHash.slice(0,12)+':'+r.sku,fingerprint=sha(JSON.stringify(document)),prior=workshop.repository.importItem(key);
 if(prior){assert.equal(prior.fingerprint,fingerprint);assert.equal(head.revision,r.revision+1);assert.deepEqual(head.document,document);}else assert.equal(head.revision,r.revision);
 entries.push({key,fingerprint,action:'update',productId:r.id,expectedRevision:r.revision,document});expected.set(r.sku,{r,document,old:old.document});assignments+=document.designs.length;
}
assert.equal(minText>=3,true);console.log(JSON.stringify({stage:'validated',products:entries.length,designAssignments:assignments,minimumTextMm:minText,geometryFits:fitCache.size}));
for(let i=0;i<entries.length;i+=50){workshop.repository.importBatch(entries.slice(i,i+50));console.log(JSON.stringify({stage:'saved',count:Math.min(i+50,entries.length)}));}
const oldGroup=workshop.variants.get(manifest.group.id,manifest.group.revision),groupDoc=structuredClone(oldGroup.document);for(const v of groupDoc.variants)v.productRevision=expected.get(v.id).r.revision+1;
const headGroup=workshop.variants.get(oldGroup.id),group=headGroup.revision===oldGroup.revision?workshop.variants.save(oldGroup.id,groupDoc,headGroup.revision):headGroup;assert.deepEqual(group.document,groupDoc);
const records=[];for(const {r,document,old} of expected.values()){
 const actual=workshop.repository.get(r.id);assert.deepEqual(actual.document,document);assert.equal(actual.status,'draft');assert.equal(actual.revision,r.revision+1);
 const strip=d=>{const c=structuredClone(d);delete c.designs;delete c.defaultDesignId;return c;};assert.deepEqual(strip(actual.document),strip(old));assert.deepEqual(workshop.repository.get(r.id,{revision:r.revision}).document,old);
 const selection=workshop.variants.select(group.id,group.revision,r.sku);assert.equal(selection.basePriceCents,r.priceCents);assert.equal(selection.productRevision,actual.revision);
 records.push({...r,revision:actual.revision,designCount:document.designs.length});await write(path.join(OUT,'Produktdaten',r.sku+'.json'),actual.document);
}
let colorPairs=0;for(const r of records.filter(r=>r.color==='SW')){const other=records.find(a=>a.form===r.form&&a.size===r.size&&a.mounting===r.mounting&&a.color==='AN');assert.ok(other);assert.equal(r.priceCents,other.priceCents);assert.deepEqual(expected.get(r.sku).document.designs,expected.get(other.sku).document.designs);colorPairs++;}assert.equal(colorPairs,399);
const correction={source:'Edelstahl-Galerie',sourceGroup:sourceRegister.group,sourceCapturedAt:sourceManifest.capturedAt,sourceHash,appliedAt:new Date().toISOString(),activeDesigns:data.designs.map(d=>d.id.replace('TS-Edelstahl-','TS-Acryl-')),removed:['TS-Acryl-D2','TS-Acryl-D70','TS-Acryl-D71'],added:['TS-Acryl-D29','TS-Acryl-D32','TS-Acryl-D63'],holeClearanceMm:steelHoleClearanceMm,minimumTextMm:3};
const updated={...manifest,updatedAt:correction.appliedAt,group:{id:group.id,revision:group.revision},records,designCorrections:correction,url:'http://127.0.0.1:8977/konfigurator/ausfuehrungen/?group='+group.id+'&revision='+group.revision,galleryUrl:'http://127.0.0.1:8977/acryl-galerie/Designgalerie.html'};
updated.review.designLayoutWarnings=[];updated.review.visualReview='Korrigierte Edelstahl-Vorlagen auf exakte Acrylkonturen eingepasst; Browserprüfung folgt';await write(path.join(OUT,'Anlageregister.json'),updated);await write(path.join(OUT,'Auswahlgruppe.json'),group);await write(path.join(OUT,'Designauswahl.json'),data.designs.map(d=>({id:d.id.replace('TS-Edelstahl-','TS-Acryl-'),designNo:d.designNo,texts:d.texts.map(t=>({text:t.text})),name:d.name})));
await write(path.join(OUT,'Design-Passform.json'),[...fitCache].map(([geometry,value])=>({geometry,available:value.designs.map(d=>d.id),excluded:value.excluded.map(d=>({...d,id:d.id.replace('TS-Edelstahl-','TS-Acryl-')}))})));
for(const color of ['SW','AN']){const r=records.find(r=>r.sku==='TS-Acryl-RE-150X100-T30-'+color+'-K00'),doc=expected.get(r.sku).document;for(const d of doc.designs)await fs.writeFile(path.join(OUT,'Galerievorschauen',d.id+'-'+color+'.svg'),formProductPreview(doc,{assets:workshop.assets,contours:workshop.contours,fonts,designId:d.id}));}
for(const form of [...new Set(records.map(r=>r.form))])for(const color of ['SW','AN']){const r=records.find(r=>r.form===form&&r.color===color&&r.mounting==='K00'&&r.size==='15x10')||records.find(r=>r.form===form&&r.color===color&&r.mounting==='K00'&&r.designCount===40);assert.ok(r);await fs.writeFile(path.join(OUT,'Galerievorschauen','Form-'+form+'-'+color+'.svg'),formProductPreview(expected.get(r.sku).document,{assets:workshop.assets,contours:workshop.contours,fonts,designId:'TS-Acryl-D14'}));}
const report={...correction,products:records.length,designAssignments:assignments,activeDesignCount:40,formSizeCombinations:new Set(records.map(r=>r.form+':'+r.size)).size,forms:new Set(records.map(r=>r.form)).size,geometryFits:fitCache.size,minimumActualTextMm:minText,colorPairs,identicalLayoutsAndPricesPerColorPair:true,all798IdsPreserved:true,all798PricesPreserved:true,all798ContoursPreserved:true,all798OtherProductFieldsPreserved:true,all798PreviousRevisionsPreserved:true,all798Draft:true,all798SelectionReadback:true,allFieldsInsideContourAnd4mmFromHoles:true,groupRevision:group.revision,excludedDesignGeometryPairs:[...fitCache.values()].reduce((n,v)=>n+v.excluded.length,0)};
await write(path.join(OUT,'Designkorrekturen-Uebernahme.json'),report);console.log(JSON.stringify({stage:'complete',report}));
}finally{workshop.close();}
