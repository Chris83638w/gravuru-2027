import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importEnvironment} from './design-assets.mjs';
import {digest} from './review-package.mjs';
import {printPreview} from './print-preview.mjs';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {FORM_MATERIALS} from './form-product.mjs';
import {artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {acrylicSelection} from '../configurator/variant-m/acrylic-product.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {getProcessingProfile} from '../platform/sources/app/shared/models/processing-profiles.mjs';

// Werkstatt-Zusammenfassung je Fertigungspaket (Ü7.1). Alle Werte stammen aus dem
// gesicherten Prüfstand und den Renderer-Metadaten; nichts wird neu berechnet,
// was Vorschau, Preis oder Produktionsdatei bereits festgelegt haben.
export const PRODUCTION_SUMMARY_SCHEMA='gravuru-production-summary/v1';
export const SUMMARY_FILES=Object.freeze({pdf:'summary.pdf',json:'summary.json'});
const METHOD_LABELS={print:'UV-Druck',engraving:'Gravur'};
const MATERIAL_KINDS={acrylic:'Acrylglas',slate:'Schiefer',steel:'Edelstahl',wood:'Holz'};
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'production_summary'});};
const round=(v,digits=2)=>Number.isFinite(v)?Number(v.toFixed(digits)):null;
const cents=v=>Number.isSafeInteger(v)?v:null;
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');

// Ampel nach Ü5.1: grün ≥ Soll-dpi, gelb ≥ 60 % davon, rot darunter; ohne Messwert „offen“.
export function resolutionStatus(effectiveDpi,targetDpi){
 if(!Number.isFinite(effectiveDpi)||!Number.isFinite(targetDpi)||targetDpi<=0)return 'offen';
 return effectiveDpi>=targetDpi?'gruen':effectiveDpi>=targetDpi*.6?'gelb':'rot';
}
const photoNote=status=>status==='rot'?'Auflösung niedrig':status==='gelb'?'Auflösung knapp':status==='offen'?'Auflösung nicht gemessen':'';

function nativeDetails(files,manifest,targetDpi){
 let saved,config;try{saved=JSON.parse(files.get('produkt-und-gestaltung.json'));config=JSON.parse(files.get('konfigurator-quellen.json'));}catch{fail('Der gesicherte Produktstand für die Zusammenfassung ist unvollständig.');}
 const state=saved.state,viewport=artworkViewport(config,{mOptions:state.options}),g=viewport.geometry,groups=config.profile.optionGroups||[];
 // Acryl rechnet über config.acrylic.pricing, nicht über die Gruppenpreise; dieselbe Quelle wie quote().
 const acrylic=config.acrylic?acrylicSelection(state.options,config.acrylic.pricing):null;
 const optionPrice=(group,value)=>{
  if(!acrylic)return {priceCents:cents(value?.priceCents),priceKind:'surcharge'};
  if(group.id==='size')return {priceCents:cents(acrylic.size.basePriceCents),priceKind:'base'};
  if(group.id==='base')return {priceCents:cents(acrylic.baseCents),priceKind:'surcharge'};
  if(group.id==='wall')return {priceCents:cents(acrylic.wallCents),priceKind:'surcharge'};
  return {priceCents:null,priceKind:'surcharge'};
 };
 const options=groups.map(group=>{const value=group.values.find(v=>v.id===state.options[group.id]);return {groupId:group.id,group:group.name,valueId:state.options[group.id]??null,value:value?.label??String(state.options[group.id]??''),...optionPrice(group,value),mounting:Boolean(value&&(value.holes||value.mountingRule))};});
 const textFields=state.design.objects.filter(o=>!o.uxHidden&&o.type==='text').map(o=>({id:o.id,label:o.fieldKey||o.id,text:o.text,font:o.font,bold:Boolean(o.bold),italic:Boolean(o.italic),colorHex:o.color??null,
  sizeMm:round(o.size*viewport.scale),xMm:round(viewport.x+o.x*viewport.scale),yMm:round(viewport.y+o.y*viewport.scale),widthMm:round(o.w*viewport.scale),heightMm:round(o.h*viewport.scale),rotationDeg:round(o.rotation||0),anchor:'center'}));
 const processing=getProcessingProfile(config.profile),material=config.profile.material||{};
 const resolution=Array.isArray(manifest.photoResolution)?manifest.photoResolution:[];
 const photos=(manifest.photos||[]).map((p,index)=>{const measured=resolution.find(r=>r.uploadId===p.uploadId),object=state.design.objects.find(o=>o.uxUploadId===p.uploadId),effectiveDpi=Number.isFinite(measured?.effectiveDpi)?measured.effectiveDpi:null,status=resolutionStatus(effectiveDpi,targetDpi);
  return {fieldId:object?.id??null,label:object?.label??object?.fieldKey??measured?.label??('Foto '+(index+1)),path:p.path,fileName:p.path.split('/').pop(),sha256:p.sha256,width:p.width,height:p.height,editedPath:p.edited?.path??null,effectiveDpi,targetDpi,status,note:photoNote(status)};});
 return {product:{material:{kind:material.kind??null,label:MATERIAL_KINDS[material.kind]||material.kind||'offen',thicknessMm:round(material.thicknessMm,3),colorHex:material.color??null},
   widthMm:round(g.width,3),heightMm:round(g.height,3),shape:g.shape??'rect',cornerRadiusMm:round(g.cornerRadiusMm||0,3),
   mounting:{holeCount:(g.holes||[]).length,holes:(g.holes||[]).map(h=>({xMm:round(h.x,3),yMm:round(h.y,3),diameterMm:round(h.diameter,3)})),option:options.find(o=>o.mounting)?{group:options.find(o=>o.mounting).group,value:options.find(o=>o.mounting).value}:null},
   options:options.map(({mounting,...o})=>o),method:processing.method,methodLabel:processing.name||METHOD_LABELS[processing.method]||processing.method},
  textFields,photos,designId:state.design.id};
}

function formDetails(files,manifest,targetDpi){
 let saved;try{saved=JSON.parse(files.get('produkt-und-gestaltung.json'));}catch{fail('Der gesicherte Produktstand für die Zusammenfassung ist unvollständig.');}
 const product=saved.product,g=product.form.geometry,design=product.designs.find(d=>d.id===saved.designId);if(!design)fail('Das gesicherte Design fehlt in der Zusammenfassung.');
 const values=new Map([...saved.customer.fields,...(saved.customer.additions||[])].map(v=>[v.id,v]));
 const textFields=design.fields.filter(f=>f.type==='text').map(f=>{const v=values.get(f.id)||f;return {id:f.id,label:f.label||f.id,text:v.text,font:v.font,bold:Boolean(v.bold),italic:Boolean(v.italic),colorHex:v.color??null,
  sizeMm:round(v.sizeMm),xMm:round(v.xMm+v.widthMm/2),yMm:round(v.yMm+v.heightMm/2),widthMm:round(v.widthMm),heightMm:round(v.heightMm),rotationDeg:0,anchor:'center'};});
 const photos=(manifest.photos||[]).map(p=>{const field=design.fields.find(f=>f.id===p.fieldId),effectiveDpi=Number.isFinite(p.effectiveDpi)?p.effectiveDpi:null,status=resolutionStatus(effectiveDpi,targetDpi);
  return {fieldId:p.fieldId,label:field?.label??p.fieldId,path:p.path,fileName:p.path.split('/').pop(),sha256:p.sha256,width:p.width,height:p.height,editedPath:null,effectiveDpi,targetDpi,status,note:photoNote(status)};});
 const material=product.material||{},known=FORM_MATERIALS.find(m=>m.id===material.id);
 return {product:{material:{kind:material.id??null,label:known?.name||material.id||'offen',thicknessMm:round(material.thicknessMm,3),colorHex:null,surfaceNotes:material.surfaceNotes||''},
   widthMm:round(g.widthMm,3),heightMm:round(g.heightMm,3),shape:'contour',cornerRadiusMm:null,
   mounting:{holeCount:Number.isInteger(g.holeCount)?g.holeCount:(g.contours||[]).filter(c=>c.role==='hole').length,holes:[],option:null},
   options:[],method:product.processingMethod,methodLabel:METHOD_LABELS[product.processingMethod]||product.processingMethod||'offen'},
  textFields,photos,designId:saved.designId};
}

// Bestellbezug nur, wenn beim Erzeugen bereits Bestellpositionen auf den Prüfstand zeigen.
function orderReference(lines,snapshotId){
 const matching=(Array.isArray(lines)?lines:[]).filter(l=>l&&l.snapshotId===snapshotId);
 if(!matching.length)return null;
 return matching.map(l=>({orderId:l.orderId,lineId:l.lineId,positionId:l.id,shopDomain:l.shopDomain,quantity:l.quantity,unitCents:l.unitCents,totalCents:l.totalCents,currency:l.currency,test:l.test===true}));
}

export function productionSummary({files,manifest,metadata,extras=[],orderLines=[],createdAt=new Date().toISOString()}){
 if(!manifest||!metadata)fail('Für die Zusammenfassung fehlen Prüfstand oder Ausgabe-Metadaten.');
 const settings=metadata.settings||{},targetDpi=Number.isFinite(settings.dpi)?settings.dpi:null;
 const details=isNativeReviewSchema(manifest.schema)?nativeDetails(files,manifest,targetDpi):formDetails(files,manifest,targetDpi);
 const profile=metadata.productionProfile||manifest.productionProfile||null,pd=profile?.document||null;
 const selection=manifest.selection||null,orders=orderReference(orderLines,manifest.id);
 return {schema:PRODUCTION_SUMMARY_SCHEMA,createdAt,
  order:orders,orderNote:orders?null:'Beim Erzeugen lag noch keine Bestellposition zu diesem Prüfstand vor; Referenz ist die Konfigurations-ID.',
  configuration:{snapshotId:manifest.id,draftId:manifest.source?.draftId??null,draftRevision:manifest.source?.draftRevision??null,designId:details.designId,productId:manifest.product.id,productRevision:manifest.product.revision,productName:manifest.product.name,sourcePackageSha256:metadata.sourcePackageSha256??null},
  product:{...details.product,quantity:selection?.price?.quantity??orders?.[0]?.quantity??null,price:{unitCents:cents(selection?.price?.unitCents??manifest.product.basePriceCents),totalCents:cents(selection?.price?.totalCents),currency:manifest.product.currency||'EUR'}},
  textFields:details.textFields,photos:details.photos,
  profile:{name:pd?.name??null,revision:profile?.revision??null,method:pd?.method??details.product.method??null,methodLabel:pd?METHOD_LABELS[pd.method]||pd.method:details.product.methodLabel,machine:pd?.machine||null,rip:pd?.rip||null,mirror:typeof settings.mirror==='boolean'?settings.mirror:null,settingsOverridden:typeof metadata.profileSettingsOverridden==='boolean'?metadata.profileSettingsOverridden:null},
  output:{recipe:metadata.schema,settings,files:extras.map(e=>e.name),warnings:Array.isArray(metadata.warnings)?metadata.warnings:[],productionReady:false}};
}

export function renderSummaryPdf(summary,preview){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.GRAVURU_PYTHON||'python3',[fileURLToPath(new URL('./production-summary.py',import.meta.url))],{env:importEnvironment(),stdio:['pipe','pipe','pipe']});let done=false,size=0;const chunks=[];
  const end=(error,value)=>{if(done)return;done=true;clearTimeout(timer);error?reject(Object.assign(Error(error),{status:422,code:'production_summary'})):resolve(value);};
  const timer=setTimeout(()=>{child.kill();end('Die Zusammenfassung hat das Zeitlimit überschritten.');},30000);
  child.on('error',()=>end('Python ist für die Zusammenfassung nicht verfügbar.'));child.stdin.on('error',()=>{});child.stderr.on('data',()=>{});
  child.stdout.on('data',b=>{size+=b.length;if(size>16*1024*1024){child.kill();end('Die Zusammenfassung ist zu groß.');}else chunks.push(b);});
  child.on('close',code=>{if(done)return;const bytes=Buffer.concat(chunks);if(code||!bytes.subarray(0,5).equals(Buffer.from('%PDF-')))return end('Die Zusammenfassung konnte nicht erstellt werden.');end(null,bytes);});
  child.stdin.end(JSON.stringify({summary,preview:preview?{png:preview.toString('base64')}:null}));
 });
}

const normalize=e=>Array.isArray(e)?{name:e[0],bytes:Buffer.from(e[1])}:{name:e.name,bytes:e.bytes?Buffer.from(e.bytes):null,blob:e.blob};
async function bytesOf(entry){return entry.bytes??Buffer.from(await entry.blob.arrayBuffer());}

// Baut das vollständige Fertigungspaket: Prüfstanddateien (unverändert, inkl. fotos/),
// Produktionsdateien, summary.pdf/.json und ein erweitertes manifest.json mit sha256
// aller neuen Dateien. Vorhandene Dateinamen bleiben unverändert.
export async function productionPackage({files,manifest,metadata,pdf,extras,orderLines=[],createdAt}){
 const production=[];for(const e of extras.map(normalize))production.push({name:e.name,bytes:await bytesOf(e)});
 if(production.some(p=>files.has(p.name)||[SUMMARY_FILES.pdf,SUMMARY_FILES.json].includes(p.name)))fail('Dateinamen im Fertigungspaket sind nicht eindeutig.');
 const summary=productionSummary({files,manifest,metadata,extras:production,orderLines,createdAt});
 let preview=null;
 try{preview=(await printPreview({pdf,metadata},['raster','vector'].includes(metadata.settings?.mode)?'engraving':'color')).png;}
 catch(e){summary.previewNote='Vorschau aus der Produktionsdatei nicht verfügbar: '+(e.message||'unbekannter Fehler');}
 const summaryPdf=await renderSummaryPdf(summary,preview);
 production.push({name:SUMMARY_FILES.pdf,bytes:summaryPdf,purpose:'Werkstatt-Zusammenfassung (eine A4-Seite); keine Fertigungsfreigabe.'});
 production.push({name:SUMMARY_FILES.json,bytes:json(summary),purpose:'Zusammenfassung maschinenlesbar; gleiche Daten wie summary.pdf.'});
 const purposes={'druckpruefung.json':'Renderer-Metadaten der Druckausgabe.','gravurpruefung.json':'Renderer-Metadaten der Gravurausgabe.','gesicherte-gestaltung.svg':'Gesicherte Gestaltung als SVG-Quelle der Produktionsdatei.','gesicherte-gravurgestaltung.svg':'Gesicherte Gravurgestaltung als SVG-Quelle.','gravur-kontur-1zu1.pdf':'Separate 1:1-Schnittkontur.'};
 const listed=production.map(p=>({path:p.name,bytes:p.bytes.length,sha256:digest(p.bytes),purpose:p.purpose||purposes[p.name]||(p.name.endsWith('.pdf')?'Produktionsdatei nach Fertigungsprofil.':'Produktionsausgabe.')}));
 const extended={...manifest,files:[...manifest.files,...listed],production:{schema:PRODUCTION_SUMMARY_SCHEMA,recipe:metadata.schema,createdAt:summary.createdAt,summary:{pdf:listed.find(f=>f.path===SUMMARY_FILES.pdf).sha256,json:listed.find(f=>f.path===SUMMARY_FILES.json).sha256},photos:summary.photos.map(p=>({path:p.path,sha256:p.sha256,status:p.status})),files:listed,productionReady:false}};
 const entries=[...files].filter(([name])=>name!=='manifest.json').map(([name,bytes])=>({name,blob:new Blob([bytes])}));
 entries.push(...production.map(p=>({name:p.name,blob:new Blob([p.bytes])})),{name:'manifest.json',blob:new Blob([json(extended)])});
 const archive=Buffer.from(await (await zipFiles(entries)).arrayBuffer());
 return {archive,summary,summaryPdf,manifest:extended};
}
