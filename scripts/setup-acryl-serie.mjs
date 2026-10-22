import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createFontLibrary} from '../app/workshop/font-library.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {makeFormProduct} from '../app/workshop/form-product.mjs';
import {measureText} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {formProductPreview} from '../app/workshop/form-product-preview.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const CODE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'outputs/Acryl-Serie-2027');
const existingRegister=await fs.readFile(path.join(OUT,'Anlageregister.json'),'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
if(existingRegister?.basePricesConfirmed)throw Error('Die Acryl-Serie enthält bestätigte Preise. Erstanlage abgebrochen; Preisänderungen auf vorhandenen Artikel-IDs speichern.');
const data=JSON.parse(await fs.readFile(path.join(ROOT,'work/acryl-prepared.json'),'utf8'));
const rawFonts=JSON.parse(await fs.readFile(path.join(ROOT,'work/acryl-font-resources.json'),'utf8'));
const dbDir=path.join(CODE,'.local-data/acryl-serie');
await fs.mkdir(dbDir,{recursive:true});await fs.mkdir(path.join(OUT,'Produktdaten'),{recursive:true});await fs.mkdir(path.join(OUT,'Vorschau'),{recursive:true});
process.env.GRAVURU_PYTHON=process.argv[2];process.env.PYTHONPATH=process.argv[3];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const fontLib=createFontLibrary({filename:path.join(dbDir,'design-assets.sqlite')});
const fontIds={};
for(const [name,meta] of Object.entries(data.fonts)){
 const result=await fontLib.import({name:path.basename(meta.path),bytes:(await fs.readFile(meta.path)).toString('base64'),allowMissing:true,reason:'Originalschrift der gewählten Bestandsdesigns erhalten; fehlende Zeichen bleiben gesperrt.'});fontIds[name]=result.id;
}
fontLib.close();
const registry=new Map();
const seed=JSON.parse(await fs.readFile(path.join(CODE,'app/configurator/variant-m/.preview/models.json'),'utf8').catch(()=>fs.readFile(path.join(CODE,'.preview/variant-m/models.json'),'utf8')))[0];
const workshop=createWorkshop({filename:path.join(dbDir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,contourConverter:async input=>{const g=registry.get(sha(Buffer.from(input.bytes,'base64')));if(!g)throw Error('Unbekannte Serienkontur');return structuredClone(g);}});
const fonts=workshop.fonts.resources(),designs=[];
for(const d of data.designs){
 const fields=[];
 for(const [i,t] of d.texts.entries())for(const [lineNo,text] of t.text.split('\n').entries()){
  if(!text.trim())continue;
  const size=t.source?.masterSizeMm||t.sizePt*25.4/72,m=measureText({text,font:t.font,size,bold:false,italic:false},rawFonts);
  const x=t.anchorMm[0]-(t.align==='center'?m.w/2:t.align==='right'?m.w:0);
  const y=t.anchorMm[1]+lineNo*t.lineHeightMm-size*.35-m.h/2;
  fields.push({id:'text-'+(i+1)+'-'+(lineNo+1),label:(i===0?'Name':'Text '+(i+1))+(lineNo?' · Zeile '+(lineNo+1):''),type:'text',xMm:x,yMm:y,widthMm:m.w+.002,heightMm:m.h+.002,allowMove:true,allowScale:true,allowDelete:true,text,font:fontIds[t.font],sizeMm:size,color:'#000000',bold:false,italic:false,allowColor:false});
 }
 const boxes=[...fields.map(f=>[f.xMm,f.yMm,f.widthMm,f.heightMm]),...d.motifs.map(m=>m.box)];
 const minX=Math.min(...boxes.map(b=>b[0]))-.01,minY=Math.min(...boxes.map(b=>b[1]))-.01,maxX=Math.max(...boxes.map(b=>b[0]+b[2]))+.01,maxY=Math.max(...boxes.map(b=>b[1]+b[3]))+.01,w=maxX-minX,h=maxY-minY;
 const motifSvg=d.motifs.flatMap(m=>m.paths).map(p=>'<path d="'+esc(p.d)+'" fill="'+esc(p.fill||'none')+'" stroke="'+esc(p.stroke||'none')+'" stroke-width="'+p.strokeMm+'" fill-rule="'+(p.evenodd?'evenodd':'nonzero')+'" opacity="'+(p.opacity??1)+'"/>').join('');
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="'+[minX,minY,w,h].join(' ')+'">'+(motifSvg||'<rect width="1" height="1" fill="none"/>')+'</svg>';
 const asset=await workshop.assets.import({name:d.id+'-Motive.svg',bytes:Buffer.from(svg).toString('base64')});
 designs.push({source:d,asset,w,h,fields:fields.map(f=>({...f,xMm:f.xMm-minX,yMm:f.yMm-minY})),minSize:Math.min(...fields.map(f=>f.sizeMm))});
}
console.log(JSON.stringify({stage:'fonts-designs',fonts:Object.keys(fontIds).length,designs:designs.length}));
function distance(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-a[0]-t*dx,py-a[1]-t*dy);}
function inside(x,y,poly){let v=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))v=!v;}return v;}
function safeBox(x,y,w,h,row,holes){
 const poly=row.outerPolygon,margin=Math.min(2,Math.min(row.widthMm,row.heightMm)*.05),corners=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
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
 for(const [hx,hy] of holes){const qx=Math.max(x,Math.min(x+w,hx)),qy=Math.max(y,Math.min(y+h,hy));if(Math.hypot(hx-qx,hy-qy)<row.diameterMm/2+1.5)return false;}
 return true;
}
const fitCache=new Map();
function fit(row,holes){
 const key=row.skuRoot+':'+holes.length;
 if(fitCache.has(key))return fitCache.get(key);
 const accepted=[],excluded=[];
 for(const d of designs){
  let hi=Math.min((row.sourceContourWidthMm-2)/d.w,(row.sourceContourHeightMm-2)/d.h,100/Math.max(...d.fields.map(f=>f.sizeMm))),lo=0;
  for(let i=0;i<22;i++){const s=(hi+lo)/2,w=d.w*s,h=d.h*s,x=(row.sourceContourWidthMm-w)/2,y=(row.sourceContourHeightMm-h)/2;if(safeBox(x,y,w,h,row,holes))lo=s;else hi=s;}
  const s=lo*.999;
  if(d.minSize*s<3){excluded.push({id:d.source.id,reason:'Kleinster Text wäre unter 3 mm',sizeMm:d.minSize*s});continue;}
  const w=d.w*s,h=d.h*s,x=(row.sourceContourWidthMm-w)/2,y=(row.sourceContourHeightMm-h)/2;
  const fields=d.fields.map(f=>({...f,xMm:x+f.xMm*s,yMm:y+f.yMm*s,widthMm:f.widthMm*s,heightMm:f.heightMm*s,sizeMm:f.sizeMm*s}));
  accepted.push({id:d.source.id,name:d.source.name,assetId:d.asset.assetId,sourceSha256:d.asset.sourceSha256,originalName:d.asset.originalName,xMm:x,yMm:y,widthMm:w,heightMm:h,sourcePrepared:true,fields});
 }
 const value={designs:accepted,excluded};fitCache.set(key,value);return value;
}
function circle(x,y,r){return 'M'+(x-r)+' '+y+' A'+r+' '+r+' 0 1 0 '+(x+r)+' '+y+' A'+r+' '+r+' 0 1 0 '+(x-r)+' '+y+' Z';}
const products=[],seen=new Set(),geometryCache=new Map(),fitReport=[];
for(const row of data.rows)for(const option of data.options.filter(o=>row.allowedMounting.includes(o.code)))for(const color of data.colors){
 const sku=row.skuRoot+'-'+color.sku+'-'+option.code;if(seen.has(sku))continue;seen.add(sku);
 const holes=option.code.startsWith('B')?row.holes:[],geometryKey=row.skuRoot+':'+holes.length;
 let contour=geometryCache.get(geometryKey);
 if(!contour){
  const w=row.sourceContourWidthMm,h=row.sourceContourHeightMm;
  const rings=[{role:'outer',d:row.outerPath},...holes.map(([x,y])=>({role:'hole',d:circle(x,y,row.diameterMm/2)}))];
  const g={schema:'gravuru-contour/v1',unit:'mm',measurement:'path-centerline',widthMm:w,heightMm:h,pageWidthMm:w,pageHeightMm:h,sourceOriginMm:[0,0],contours:rings,holeCount:holes.length,warnings:[]};
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'mm" height="'+h+'mm" viewBox="0 0 '+w+' '+h+'"><path d="'+rings.map(r=>r.d).join(' ')+'" fill="none" stroke="#000" stroke-width="0.01" fill-rule="evenodd"/></svg>';
  registry.set(sha(Buffer.from(svg)),g);
  contour=await workshop.contours.import({name:geometryKey.replace(':','-')+'.svg',bytes:Buffer.from(svg).toString('base64')});geometryCache.set(geometryKey,contour);
 }
 const fitted=fit(row,holes);
 if(!fitted.designs.length)throw Error(sku+' hat kein passendes Design');
 const document=makeFormProduct(contour,'Acryl '+row.shape+' '+row.sizeLabel+' cm · '+color.label+' · '+option.label);
 document.categoryIds=['acryl-tuerschilder-2027',sku];document.material={id:color.sku==='SW'?'acrylic-black':'acrylic-anthracite',thicknessMm:3,surfaceNotes:'Acryl 3 mm · Farbe ohne Aufpreis. Lokaler Entwurf. Preis vorläufig aus Edelstahl übernommen; neue Excel steht aus.'};
 document.processingMethod='engraving';document.basePriceCents=row.baseCents+option.priceCents;document.presentation={scene:'studio'};
 document.designs=fitted.designs;document.defaultDesignId=fitted.designs[0].id;
 document.seo={title:('Acryl-Türschild '+row.sizeLabel+' cm – '+color.label).slice(0,70),description:'Individuell gestaltbares Acryl-Türschild, 3 mm. Form, Farbe und Befestigung wählbar.'};
 const file=path.join(OUT,'Produktdaten',sku+'.json');await fs.writeFile(file,JSON.stringify(document,null,2));
 products.push({sku,document,sourceExcelRow:row.excelRow,form:row.formCode,size:row.actualSizeLabel,color:color.sku,mounting:option.code,priceCents:document.basePriceCents,designCount:fitted.designs.length});
}
console.log(JSON.stringify({stage:'prepared',products:products.length,contours:geometryCache.size}));
const records=[];
for(let i=0;i<products.length;i+=50){
 const batch=products.slice(i,i+50),saved=workshop.repository.importBatch(batch.map(p=>({key:'acryl2027:'+p.sku,fingerprint:sha(JSON.stringify(p.document)),document:p.document})));
 for(let j=0;j<batch.length;j++){const p=batch[j],r=workshop.repository.get(saved[j].id);records.push({sku:p.sku,id:r.id,revision:r.revision,status:r.status,sourceExcelRow:p.sourceExcelRow,form:p.form,size:p.size,color:p.color,mounting:p.mounting,priceCents:p.priceCents,designCount:p.designCount});}
 console.log(JSON.stringify({stage:'saved',count:records.length}));
}
const valueList=(key,label)=>({id:key,label,values:[...new Set(records.map(r=>r[key]))].map(id=>({id,label:key==='color'?data.colors.find(c=>c.sku===id).label:key==='mounting'?data.options.find(o=>o.code===id).label:key==='form'?({RE:'Rechteck',AB:'Rechteck · abgerundet',QU:'Quadrat',OV:'Oval',EL:'Oval · schmal',R:'Rund',RT1:'Retro 1',RT2:'Retro 2'}[id]):id.replaceAll('x',' × ')+' cm'}))});
const axes=[valueList('form','Form'),valueList('size','Größe'),valueList('color','Farbe'),valueList('mounting','Befestigung')];
const groupDoc={name:'Acryl-Türschilder · 3 mm',archived:false,defaultVariantId:records.find(r=>r.sku==='TS-Acryl-RE-150X100-T30-SW-K00')?.sku||records[0].sku,axes,variants:records.map(r=>({id:r.sku,label:r.sku.slice(9)+' · '+data.colors.find(c=>c.sku===r.color).label,productId:r.id,productRevision:r.revision,choices:{form:r.form,size:r.size,color:r.color,mounting:r.mounting}}))};
const old=workshop.variants.list().find(g=>g.document.name===groupDoc.name);
const group=old?(JSON.stringify(old.document)===JSON.stringify(groupDoc)?old:workshop.variants.save(old.id,groupDoc,old.revision)):workshop.variants.create(groupDoc);
for(const [key,value] of fitCache)fitReport.push({geometry:key,available:value.designs.map(d=>d.id),excluded:value.excluded});
const metadata={schema:'gravuru-acryl-series-local/v1',createdAt:new Date().toISOString(),status:'local-draft',priceStatus:'provisional-awaiting-user-excel',basePricesConfirmed:false,colorSurchargeCents:0,productCount:records.length,shapeSizeCount:new Set(records.map(r=>r.form+':'+r.size)).size,contourCount:geometryCache.size,designCount:designs.length,fontCount:Object.keys(fontIds).length,group:{id:group.id,revision:group.revision},url:'http://127.0.0.1:8973/konfigurator/ausfuehrungen/?group='+group.id+'&revision='+group.revision,records,source:{svg:data.source,svgSha256:data.sourceSha256},review:{designLayoutWarnings:data.designs.filter(d=>d.warnings.length).map(d=>({id:d.id,warnings:d.warnings})),fontWarnings:Object.entries(data.fonts).filter(([n,d])=>d.missingGlyphs.length).map(([name,d])=>({name,missing:d.missingGlyphs})),motifs:'Originalmotive als feste Vorlagen; Texte bearbeitbar',production:'Nicht freigegeben',visualReview:'offen'}};
await fs.writeFile(path.join(OUT,'Anlageregister.json'),JSON.stringify(metadata,null,2));
await fs.writeFile(path.join(OUT,'Design-Passform.json'),JSON.stringify(fitReport,null,2));
await fs.writeFile(path.join(OUT,'Auswahlgruppe.json'),JSON.stringify(group,null,2));
const selected=[...new Set(records.map(r=>r.form))].map(form=>records.find(r=>r.form===form&&r.color==='SW'&&r.mounting==='K00'&&r.designCount===40)||records.find(r=>r.form===form&&r.color==='SW'&&r.mounting==='K00'));
for(const r of selected){
 const record=workshop.repository.get(r.id),svg=formProductPreview(record.document,{assets:workshop.assets,contours:workshop.contours,fonts});
 await fs.writeFile(path.join(OUT,'Vorschau',r.sku+'.svg'),svg);
}
const readback=records.map(r=>workshop.repository.get(r.id));
if(readback.some(r=>r.status!=='draft'||r.document.material.thicknessMm!==3))throw Error('Status- oder Materialprüfung fehlgeschlagen');
for(const r of records){const other=records.find(o=>o.form===r.form&&o.size===r.size&&o.mounting===r.mounting&&o.color!==r.color);if(!other||other.priceCents!==r.priceCents)throw Error('Farbpreis weicht ab');}
await fs.writeFile(path.join(OUT,'Anlagepruefung.json'),JSON.stringify({products:records.length,drafts:readback.filter(r=>r.status==='draft').length,uniqueSkus:seen.size,sharedColorPrices:true,allThickness3mm:true,minimumTextMm:Math.min(...readback.flatMap(r=>r.document.designs.flatMap(d=>d.fields.map(f=>f.sizeMm)))),unavailableDesignAssignments:fitReport.reduce((s,r)=>s+r.excluded.length,0),originalContours:true,sourceReviewRequired:true},null,2));
workshop.close();
console.log(JSON.stringify({stage:'complete',products:records.length,group:group.id,url:metadata.url}));
