// #265 Stufe B (ENTSCHEIDUNGEN 3.61, ersetzt die vier Downloads aus 3.57): zwei Downloads je Bestellposition – PDF und SVG,
// beide immer mit Kontur als Haarlinie, für jede Produktart (native Produkte und Formprodukte alter Art).
// Alle Daten sind synthetisch (Mustermodell des Builds, Testbild aus zwei Farbflächen); keine Kunden- und keine Katalogdaten.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createHmac,randomUUID} from 'node:crypto';
import {build} from '../configurator/variant-m/build.mjs';
import {exportSettings} from '../configurator/variant-m/print-export-model.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {artworkFragment} from '../configurator/variant-m/artwork-resource.mjs';
import {createWorkshop} from './http.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {importEnvironment} from './design-assets.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {FORM_ENGRAVING_RECIPE,formEngravingKey,formEngravingSettings,renderEngraving,createFormEngravingProof} from './form-engraving-proof.mjs';
import {FORM_PRINT_RECIPE,formPrintKey,formPrintSettings,createFormPrintProof} from './form-print-proof.mjs';
import {ACRYLIC_ENGRAVING_RECIPE,acrylicEngravingKey,acrylicEngravingSettings,createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {ACRYLIC_PRINT_RECIPE,acrylicPrintKey,createAcrylicPrintProof} from './acrylic-print-proof.mjs';
import {printDelivery,orderDownload,orderFileSets,svgWithContour,contourStroke,ORDER_FORMATS,ORDER_FILES_SCHEMA,ORDER_FILE_MISSING,ORDER_FORMAT_REQUIRED} from './print-delivery.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {orderFileButtons,orderFilesNote,ORDER_FILE_LABELS} from './ui/order-store-context.mjs';
import {missingOrderFilesNote} from './cross-store-orders.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {initialFormCustomerState} from './form-customer-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {prepareFormReview} from './form-review-snapshot.mjs';

const python=process.env.GRAVURU_PYTHON||'python3';
// Liest eine PDF maßlich: Seitenmaß in mm, Bilder (Farbraum und Prüfsumme der Pixel), Ebenen und jede Zeichnung mit Linienbreite,
// Farbe, Ebene, Rahmen und der Menge ihrer Stützpunkte in mm (unabhängig von Zeichenrichtung und Aufteilung in Teilpfade).
const INSPECT=`import sys,json,hashlib,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];k=72/25.4;r=lambda v:round(v/k,2)
def pts(d):
 out=set()
 for item in d['items']:
  for v in item[1:]:
   if isinstance(v,f.Point):out.add((r(v.x),r(v.y)))
   elif isinstance(v,f.Rect):out.update([(r(v.x0),r(v.y0)),(r(v.x1),r(v.y0)),(r(v.x1),r(v.y1)),(r(v.x0),r(v.y1))])
   elif isinstance(v,f.Quad):out.update([(r(q.x),r(q.y)) for q in v])
 return sorted(out)
images=[]
for i in page.get_images(full=True):
 pix=f.Pixmap(p,i[0]);images.append({'colorSpace':i[5],'width':pix.width,'height':pix.height,'sha256':hashlib.sha256(pix.samples).hexdigest()})
objects='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()))
print(json.dumps({'pages':len(p),'repaired':p.is_repaired,'widthMm':round(page.rect.width/k,3),'heightMm':round(page.rect.height/k,3),'images':images,'fonts':len(page.get_fonts()),'layers':[o['name'] for o in (p.get_ocgs() or {}).values()],'cutSpot':'/CutContour' in objects,'whiteSpot':'/RDG_WHITE' in objects,
 'drawings':[{'type':d['type'],'width':d.get('width'),'color':d.get('color'),'fill':d.get('fill'),'layer':d.get('layer') or '','rect':[r(v) for v in d['rect']],'points':pts(d)} for d in page.get_drawings()]}))`;
const inspect=bytes=>{assert.equal(bytes.subarray(0,5).toString(),'%PDF-');return JSON.parse(execFileSync(python,['-c',INSPECT],{input:bytes,env:importEnvironment(),maxBuffer:64*1024*1024}).toString());};
const unpack=result=>readReviewPackage(result.archive,digest(result.archive),[...NATIVE_REVIEW_SCHEMAS,'gravuru-form-review/v1']).files;
const points=drawings=>[...new Set(drawings.flatMap(d=>d.points.map(p=>p.join(' '))))].sort();
const mirrored=(list,widthMm)=>[...new Set(list.map(p=>{const [x,y]=p.split(' ').map(Number);return Number((widthMm-x).toFixed(2))+' '+y;}))].sort();
// Nachbarpunkte dürfen um die Rundung (0,01 mm) abweichen; verglichen wird Punkt für Punkt in sortierter Reihenfolge.
const samePoints=(a,b,message)=>{assert.equal(a.length,b.length,message);const xy=list=>list.map(p=>p.split(' ').map(Number)).sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const x=xy(a),y=xy(b);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i][0]-y[i][0])<=.02&&Math.abs(x[i][1]-y[i][1])<=.02,message+' '+a[i]+' / '+b[i]);};
const withoutLayer=(info,layer)=>info.drawings.filter(d=>d.layer!==layer).map(d=>({...d,layer:''}));
// Die zwei Dateien einer Fläche samt Dateinachweis; jede liegt im Paket und stimmt mit ihrer Prüfsumme überein. Der Nachweis
// kennt genau diese zwei Formate – eine Datei ohne Kontur führt er nicht mehr.
function twoFiles(result,surfaceId='front'){
 const files=unpack(result),sets=orderFileSets(result.metadata),set=sets.find(s=>s.id===surfaceId);
 assert.deepEqual([...ORDER_FORMATS],['pdf','svg']);assert.equal(result.metadata.orderFiles.schema,ORDER_FILES_SCHEMA);assert.equal(ORDER_FILES_SCHEMA,'gravuru-order-files/v2');
 assert.ok(set,'Dateinachweis der Fläche');assert.deepEqual(set.formats,[...ORDER_FORMATS]);
 assert.deepEqual(Object.keys(result.metadata.orderFiles.surfaces.find(s=>s.id===surfaceId).files),[...ORDER_FORMATS]);
 const out={files};
 for(const format of ORDER_FORMATS){
  const descriptor=result.metadata.orderFiles.surfaces.find(s=>s.id===surfaceId).files[format],bytes=files.get(descriptor.name);
  assert.ok(bytes,descriptor.name);assert.equal(digest(bytes),descriptor.sha256,descriptor.name);
  assert.deepEqual(orderDownload(result,format,surfaceId).bytes,bytes);out[format]={name:descriptor.name,bytes};
 }
 return out;
}
// SVG 1:1 in Millimetern: Breite/Höhe in mm und derselbe Zahlenraum im viewBox – damit liegt die Kontur (ebenfalls in mm)
// deckungsgleich auf der Gestaltung. „SVG“ = die Gestaltung (`plain`: die Datei ohne Kontur, wo das Paket sie führt) plus genau
// die Konturebene als letzte Ebene.
function checkSvg(two,{widthMm,heightMm,geometry,stroke,mirror=false,plain=null}){
 const contour=two.svg.bytes.toString();
 for(const text of [contour,...(plain===null?[]:[plain.toString()])]){assert.match(text,new RegExp('^<svg [^>]*width="'+widthMm+'mm"'));assert.match(text,new RegExp('^<svg [^>]*height="'+heightMm+'mm"'));assert.match(text,new RegExp('^<svg [^>]*viewBox="0 0 '+widthMm+' '+heightMm+'"'));}
 const group=contour.match(/<g id="kontur"[^>]*>.*?<\/g>(?=<\/svg>$)/s)?.[0];assert.ok(group,'Konturebene als letzte Ebene');assert.equal(contour.match(/id="kontur"/g).length,1);
 if(plain!==null){assert.doesNotMatch(plain.toString(),/id="kontur"/);assert.equal(contour.replace(group,''),plain.toString(),'ohne die Konturebene ist „SVG“ die Gestaltung des Pakets');}
 assert.match(group,new RegExp('^<g id="kontur" fill="none" stroke="'+stroke+'" stroke-width="0\\.05"'+(mirror?' transform="translate\\('+widthMm+' 0\\) scale\\(-1 1\\)"':'')+'><path d="'));
 assert.equal(group.match(/<path d="([^"]*)"/)[1],geometry.contours.map(c=>c.d+' Z').join(' '),'derselbe Pfad wie die getrennte Konturdatei');
}

let shared=null;
function seedWorkshop(){
 if(shared)return shared;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-order-files-'));build({outputDirectory:dir});
 const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'test.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
 const png=execFileSync(python,['-c',"from PIL import Image,ImageDraw;import sys;im=Image.new('RGB',(200,200),'white');ImageDraw.Draw(im).rectangle((0,0,99,199),fill='red');im.save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 return shared={dir,seed,w,png};
}
after(()=>{if(shared){shared.w.close();fs.rmSync(shared.dir,{recursive:true,force:true});}});
// Synthetisches Gravurprodukt (Fläche, Schrift, Fotoplatz) bzw. das Mustermodell als Druckprodukt; `text` unterscheidet Prüfstände.
async function nativeBundle({engraving,photo,text='Oa',workshop=seedWorkshop().w}){
 const {seed,png}=seedWorkshop(),c=structuredClone(seed.universal),d=c.profile.designs[0];
 if(engraving){
  c.profile.processing.profileId='acrylic-engraving';const label=structuredClone(d.objects.find(o=>o.type==='text'));Object.assign(label,{id:'text',text,size:5,x:100,y:40,w:10,h:6});
  d.objects=[{id:'square',type:'graphic',shape:'rect',filled:true,strokeWidth:.2,x:25,y:40,w:20,h:20,rotation:0,color:'#b56943',technicalLocked:true,customerEditable:false},label,{id:'photo',fieldKey:'photo-test',type:'photoSlot',x:90,y:100,w:20,h:20,rotation:0,photoShape:'rect',required:false,customerEditable:true}];
 }
 const record=workshop.repository.create(makeProductDocument(c,{name:(engraving?'Acrylgravur':'Acryldruck')+' · synthetisch',kind:'product'})),config=workshop.model(record.id,1).universal,objects=structuredClone(config.profile.designs[0].objects);
 if(photo)Object.assign(objects.find(o=>o.type==='photoSlot'),{uxUploadId:'photo-test',uxUploadKind:'photo'});
 const input={productId:record.id,productRevision:1,designId:d.id,objects,options:{size:'small',base:'none',wall:'none'},quantity:1,media:photo?[{id:'photo-test',original:png}]:[],preview:png};
 return {record,bundle:await prepareAcrylicReview({record,config,input,assets:workshop.assets})};
}

test('Gravur ohne Fertigungsprofil: `auto` nur ohne Profil und ohne Wahl; das Profil und eine ausdrückliche Wahl gelten unverändert',()=>{
 assert.equal(ACRYLIC_ENGRAVING_RECIPE,'gravuru-acrylic-engraving-proof/v8');
 assert.deepEqual(acrylicEngravingSettings(undefined,{mirror:true}),{mode:'auto',dpi:300,mirror:true});
 assert.deepEqual(acrylicEngravingSettings(null),{mode:'auto',dpi:300,mirror:false});
 for(const mode of ['raster','vector'])assert.deepEqual(acrylicEngravingSettings(undefined,{mode,mirror:true}),formEngravingSettings({mode,mirror:true}));
 const profile={mode:'raster',dpi:600,mirror:true};
 assert.deepEqual(acrylicEngravingSettings(profile),formEngravingSettings(profile));assert.deepEqual(acrylicEngravingSettings(profile,{mirror:true}),formEngravingSettings(profile));
 assert.deepEqual(acrylicEngravingSettings({mode:'vector',dpi:300,mirror:false},{dpi:600}),{mode:'vector',dpi:600,mirror:false});
 assert.throws(()=>acrylicEngravingSettings(profile,{mode:'auto'}),/Gravureinstellungen/,'mit Profil gibt es keine Regel statt des Profils');
 assert.throws(()=>acrylicEngravingSettings(undefined,{mode:'auto',white:'full'}),/Gravureinstellungen/);assert.throws(()=>formEngravingSettings({mode:'auto'}),/Gravureinstellungen/,'Formprodukte alter Art kennen die Regel nicht');
 // Eigener Schlüssel je Wahl; Ausgaben der Rezeptstände v6 und v7 behalten ihren Schlüssel und bleiben abrufbar.
 const keys=['auto','raster','vector'].map(mode=>acrylicEngravingKey({mode,mirror:true}));assert.equal(new Set(keys).size,3);
 assert.equal(acrylicEngravingKey(acrylicEngravingSettings(undefined,{mirror:true})),keys[0]);
 for(const old of ['v6','v7'])assert.notEqual(keys[1],digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/'+old,settings:formEngravingSettings({mode:'raster',mirror:true})})));
 // ENTSCHEIDUNGEN 3.61: neuer Rezeptstand bei allen vier Ausgaben – auch den Formprodukten alter Art –, jeweils mit eigenem Schlüssel.
 assert.equal(ACRYLIC_PRINT_RECIPE,'gravuru-acrylic-print-proof/v9');assert.equal(FORM_ENGRAVING_RECIPE,'gravuru-form-engraving-proof/v2');assert.equal(FORM_PRINT_RECIPE,'gravuru-form-print-proof/v6');
 assert.notEqual(acrylicPrintKey({}),digest(JSON.stringify({recipe:'gravuru-acrylic-print-proof/v8',settings:formPrintSettings({})})));
 assert.notEqual(formEngravingKey({}),digest(JSON.stringify({recipe:'gravuru-form-engraving-proof/v1',settings:formEngravingSettings({})})));assert.equal(formEngravingKey({}),digest(JSON.stringify({recipe:'gravuru-form-engraving-proof/v2',settings:formEngravingSettings({})})));
 assert.notEqual(formPrintKey({}),digest(JSON.stringify({recipe:'gravuru-form-print-proof/v5',settings:formPrintSettings({})})));assert.equal(formPrintKey({}),digest(JSON.stringify({recipe:'gravuru-form-print-proof/v6',settings:formPrintSettings({})})));
});

test('Bestellansicht: zwei Knöpfe je Fläche – PDF und SVG, beide mit Kontur –, nur aktiv bei „fertig“ und vorhandener Datei; sonst ein verständlicher Hinweis',()=>{
 const all={jobId:'job_1',surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null},done={state:'fertig',reason:null,jobId:'job_1'};
 assert.deepEqual(Object.keys(ORDER_FILE_LABELS),[...ORDER_FORMATS]);
 assert.deepEqual(orderFileButtons(done,all),[{surface:'front',label:'',buttons:[{format:'pdf',label:'PDF',enabled:true},{format:'svg',label:'SVG',enabled:true}]}]);
 assert.equal(orderFilesNote(done,all),'');
 for(const state of [{state:'wird erstellt'},{state:'bitte prüfen',reason:'Die Schrift fehlt.'},undefined]){assert.ok(orderFileButtons(state,all)[0].buttons.every(b=>!b.enabled));assert.match(orderFilesNote(state,all),/^PDF und SVG sind aktiv, sobald die Fertigungsdatei fertig ist/);}
 // Ausgabe ohne Dateinachweis: keine Fläche mit Dateien → zwei inaktive Knöpfe und der Hinweis des Servers, kein Fehler.
 const old={jobId:null,surfaces:[],pending:true,note:'PDF und SVG werden für diese Position neu erstellt.'};
 assert.equal(orderFileButtons(done,old)[0].buttons.length,2);assert.ok(orderFileButtons(done,old)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(done,old),old.note);
 assert.ok(orderFileButtons(done,undefined)[0].buttons.every(b=>!b.enabled));
 const partial={...all,surfaces:[{id:'front',formats:['pdf']}]};assert.deepEqual(orderFileButtons(done,partial)[0].buttons.map(b=>b.enabled),[true,false]);assert.match(orderFilesNote(done,partial),/neu erstellen/);
 const both={...all,surfaces:[{id:'front',formats:[...ORDER_FORMATS]},{id:'back',formats:[...ORDER_FORMATS]}]};assert.deepEqual(orderFileButtons(done,both).map(s=>[s.surface,s.label,s.buttons.length]),[['front','Vorderseite',2],['back','Rückseite',2]]);
 // Einen eigenen Knopf „mit Kontur“ oder eine Datei ohne Kontur gibt es nicht mehr – auch nicht, wenn eine Antwort die früheren Formate nennt.
 const former=orderFileButtons(done,{...all,surfaces:[{id:'front',formats:['pdf','pdf-contour','svg','svg-contour']}]})[0].buttons;assert.deepEqual(former.map(b=>[b.format,b.label]),[['pdf','PDF'],['svg','SVG']]);
 // Hinweis des Servers je Lage: wird neu erstellt | nicht baubar mit Grund | fertige Ausgabe ohne die Dateien | nichts.
 assert.equal(missingOrderFilesNote({own:{status:'queued'},completed:1}),'PDF und SVG werden für diese Position neu erstellt.');assert.equal(missingOrderFilesNote({own:{status:'running'}}),'PDF und SVG werden für diese Position gerade erstellt.');
 assert.equal(missingOrderFilesNote({own:{status:'failed',error:'Die gesicherte Schrift fehlt.'},completed:1}),'PDF und SVG ließen sich für diese Position nicht erstellen: Die gesicherte Schrift fehlt.');
 // Kein Sonderfall „Formprodukt alter Art“ mehr: auch dort entstehen die Dateien (ENTSCHEIDUNGEN 3.61).
 for(const own of [{status:'completed'},null]){const note=missingOrderFilesNote({own,completed:1});assert.match(note,/enthält PDF und SVG mit Kontur nicht.*neu erstellen/);assert.doesNotMatch(note,/Formprodukt|vier/);}
 assert.equal(missingOrderFilesNote({own:null,completed:0}),null);assert.equal(missingOrderFilesNote(),null);
 const page=fs.readFileSync(new URL('./ui/orders.html',import.meta.url),'utf8');for(const id of ['order-files','order-file-rows','order-files-note'])assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/Beide enthalten immer die Kontur als Haarlinie/);assert.doesNotMatch(page,/„Mit Kontur“ enthält zusätzlich/);
});

test('Dateinachweis und Download: ohne Nachweis ein klarer Hinweis; nur PDF und SVG; eine Farbregel der Kontur für alle Produktarten',async()=>{
 assert.deepEqual(orderFileSets({}),[]);assert.deepEqual(orderFileSets({orderFiles:{schema:'fremd',surfaces:[{id:'front',files:{}}]}}),[]);
 for(const format of ORDER_FORMATS)assert.throws(()=>orderDownload({metadata:{schema:'gravuru-acrylic-engraving-proof/v6',pdfSha256:'a'.repeat(64)},pdf:Buffer.from('%PDF-alt'),archive:Buffer.alloc(0)},format),{status:409,code:'order_file_missing',message:ORDER_FILE_MISSING});
 // Die früheren Formate („mit Kontur“ als eigene Wahl) und fremde Formate gibt es nicht.
 assert.equal(ORDER_FORMAT_REQUIRED,'Bitte PDF oder SVG auswählen.');
 for(const format of ['pdf-contour','svg-contour','zip','white-pdf',undefined])assert.throws(()=>orderDownload({metadata:{}},format),{status:422,code:'print_delivery',message:ORDER_FORMAT_REQUIRED});
 // Ein heutiger Nachweis, der nur die früheren Schlüssel trägt, führt keine Datei; geerbte Eigenschaften zählen nicht.
 const sha='a'.repeat(64);assert.deepEqual(orderFileSets({orderFiles:{schema:ORDER_FILES_SCHEMA,surfaces:[{id:'front',files:{'pdf-contour':{name:'x.pdf',sha256:sha},'svg-contour':{name:'x.svg',sha256:sha}}}]}}),[{id:'front',formats:[]}]);
 assert.deepEqual(orderFileSets({orderFiles:{schema:'gravuru-order-files/v1',surfaces:[{id:'front',files:Object.create({'pdf-contour':{name:'x.pdf',sha256:sha}})}]}}),[{id:'front',formats:[]}]);
 assert.throws(()=>svgWithContour('<svg></svg> <!-- x -->',{widthMm:1,contours:[]},{stroke:'#000000'}),/nicht mit Kontur/);assert.throws(()=>svgWithContour('<svg></svg>',{widthMm:1,contours:[]},{stroke:'red'}),/nicht mit Kontur/);
 // Farbregel: Funkklingel rot, Schiefergravur blau, sonst schwarz. Schiefer heißt beim nativen Produkt `kind`, beim Formprodukt `id`.
 const art=(material,doorbell=false)=>({manifest:{product:{material}},...(doorbell?{doorbellLayers:{}}:{})});
 assert.equal(contourStroke(art({kind:'slate'}),{engraving:true}),'#0000ff');assert.equal(contourStroke(art({id:'slate',thicknessMm:5,surfaceNotes:''}),{engraving:true}),'#0000ff','Formprodukt aus Schiefer');
 assert.equal(contourStroke(art({kind:'slate'})),'#000000','Schieferdruck: schwarz');assert.equal(contourStroke(art({id:'slate'})),'#000000');
 for(const material of [{kind:'acrylic'},{kind:'steel'},{id:'steel'},{id:'acrylic-black'},undefined,null])for(const engraving of [true,false])assert.equal(contourStroke(art(material),{engraving}),'#000000',JSON.stringify(material));
 for(const engraving of [true,false])assert.equal(contourStroke(art({kind:'slate'},true),{engraving}),'#ff0000','Funkklingel: rot wie die Schnittdatei der Acrylauflage');
});

// Synthetische Druckdaten wie in print-delivery-vector.test.mjs: Kontur mit Bohrloch, zwei Schriftfelder.
const cutPath='0 0 m 20 0 l 20 30 l 0 30 l h\n4 4 m 6 4 l 6 6 l 4 6 l h',glyph=(x,y)=>`${x} ${y} m ${x+2} ${y} l ${x+2} ${y+3} l ${x} ${y+3} l h`;
function printInput(options){
 const width=20,height=30,alpha=new Uint8Array(width*height),rgb=new Uint8Array(width*height*3);
 return {settings:exportSettings({width,height},options),pixels:{width,height,rgb,alpha,whiteAlpha:alpha,whiteAllowed:new Uint8Array(width*height).fill(255)},paths:{cut:cutPath,color:cutPath,white:cutPath},artwork:[{type:'text',paths:[{path:glyph(2,10),rgb:[0,0,0]},{path:glyph(5,10),rgb:[0,0,0]}]},{type:'text',paths:[{path:glyph(10,20),rgb:[120,50,30]}]}]};
}
test('Druck: die Druckdatei bleibt Byte für Byte gleich; die „PDF“ der Bestellansicht ist sie mit der Schnittlinie als Haarlinie – eine Fassung ohne Schnittlinie entsteht nicht',async()=>{
 for(const profile of ['roland','mimaki'])for(const mirror of [false,true])for(const bleedMm of [0,1]){
  const options={profile,mirror,bleedMm},before=await printDelivery(printInput(options)),result=await printDelivery(printInput(options),{orderFiles:true}),label=JSON.stringify(options);
  assert.equal(before.order,undefined,'ohne Schalter entsteht nichts Neues');assert.deepEqual(result.pdf,before.pdf,label);assert.deepEqual(result.downloads,before.downloads,label);
  assert.equal(result.extras.length,before.extras.length);for(const [i,e] of result.extras.entries())assert.deepEqual(Buffer.from(await e.blob.arrayBuffer()),Buffer.from(await before.extras[i].blob.arrayBuffer()));
  assert.deepEqual(Object.keys(result.order),['pdf'],'nur die Fassung mit Kontur');
  const main=inspect(result.pdf),order=inspect(result.order.pdf),page=[20+2*bleedMm,30+2*bleedMm];
  for(const info of [main,order]){assert.equal(info.repaired,false);assert.deepEqual([info.widthMm,info.heightMm],page,label);assert.equal(info.fonts,0);assert.equal(info.pages,1);}
  // Derselbe Inhalt wie die Druckdatei – Ebenen, Sonderfarben, Farbe und Weiß – und genau eine Schnittlinie der Breite 0 auf
  // demselben Pfad wie in der Druckdatei (dort 0,05 mm).
  assert.equal(order.cutSpot,true);assert.equal(order.whiteSpot,main.whiteSpot);assert.deepEqual(order.layers,main.layers);assert.ok(order.layers.includes('CutContour'));assert.deepEqual(order.images,main.images);
  assert.deepEqual(withoutLayer(order,'CutContour'),withoutLayer(main,'CutContour'),label);
  const cut=order.drawings.filter(d=>d.layer==='CutContour'),existing=main.drawings.filter(d=>d.layer==='CutContour');
  assert.equal(cut.length,1);assert.equal(existing.length,1);assert.equal(cut[0].width,0,'Haarlinie: Breite 0');assert.ok(Math.abs(existing[0].width-.05*72/25.4)<1e-4,'bestehende Druckdatei: 0,05 mm');
  assert.equal(cut[0].type,'s');assert.deepEqual(cut[0].points,existing[0].points,label);assert.deepEqual(cut[0].rect,existing[0].rect);assert.deepEqual(cut[0].color,existing[0].color);
 }
});

test('Gravur-Worker: `auto` wird Vektor ohne Foto, Raster mit Foto oder mit Rasterbild in der Gestaltung; ausdrücklicher Vektor lehnt weiter ab',async()=>{
 const geometry={schema:'gravuru-contour/v1',widthMm:40,heightMm:30,holeCount:1,contours:[{role:'outer',d:'M0 0H40V30H0Z'},{role:'hole',d:'M5 5V8H8V5Z'}]},{png}=seedWorkshop();
 const svg=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="30mm" viewBox="0 0 40 30"><g data-native-design="true">'+body+'</g></svg>';
 const vector=svg('<g data-field="native-0"><path d="M10 10H20V20H10Z" fill="none" stroke="#000000" stroke-width="1"/></g>'),raster=svg('<g data-field="native-0"><image href="data:image/png;base64,'+png+'" x="10" y="10" width="10" height="10"/></g>');
 const run=(source,mode,extra={})=>renderEngraving({svg:source,geometry,settings:{mode,dpi:300,mirror:false},photoFields:[],photos:[],contourStroke:'#000000',...extra});
 const a=await run(vector,'auto');assert.equal(a.mode,'vector');assert.equal(a.pixelWidth,null);
 const plain=inspect(Buffer.from(a.pdf,'base64')),contour=inspect(Buffer.from(a.pdfContour,'base64')),separate=inspect(Buffer.from(a.contour,'base64'));
 assert.equal(plain.images.length,0);assert.deepEqual([plain.widthMm,plain.heightMm,contour.widthMm,contour.heightMm],[40,30,40,30]);
 // Die Gestaltung behält ihre eigene Strichstärke (1 mm); nur die Konturebene ist die Haarlinie.
 assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings);assert.ok(Math.abs(plain.drawings[0].width-72/25.4)<1e-3);
 const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0);assert.equal(line[0].type,'s');assert.deepEqual(contour.layers,['Kontur']);
 assert.deepEqual(line[0].points,separate.drawings[0].points,'deckungsgleich mit der getrennten Konturdatei');assert.deepEqual(line[0].rect,separate.drawings[0].rect);
 assert.ok(Math.abs(separate.drawings[0].width-.05*72/25.4)<1e-4,'getrennte Konturdatei bleibt bei 0,05 mm');
 // Rasterbild ohne Kundenfoto (z. B. eingefärbte Designquelle): Vektor wäre ein Fehlschlag, die Regel nimmt Raster 300 dpi.
 const b=await run(raster,'auto');assert.equal(b.mode,'raster');assert.equal(b.pixelWidth,Math.ceil(40*300/25.4));assert.deepEqual(inspect(Buffer.from(b.pdf,'base64')).images.map(i=>i.colorSpace),['DeviceGray']);
 await assert.rejects(()=>run(raster,'vector'),/Rasterbilder/);
 const explicit=await run(vector,'raster');assert.equal(explicit.mode,'raster');assert.equal(explicit.pixelWidth,Math.ceil(40*300/25.4));
 // Ohne Konturfarbe entsteht keine Datei mit Kontur (seit ENTSCHEIDUNGEN 3.61 nennt jede Ausgabe eine Farbe, auch die der
 // Formprodukte alter Art); eine fremde Farbangabe wird abgelehnt.
 assert.equal((await run(vector,'vector',{contourStroke:undefined})).pdfContour,undefined);await assert.rejects(()=>run(vector,'vector',{contourStroke:'red'}),/Konturfarbe/);
});

test('Gravur: zwei Dateien 1:1, beide mit Kontur; ohne Fertigungsprofil Vektor ohne Foto und Raster 300 dpi mit Foto; Kontur als Haarlinie deckungsgleich',async()=>{
 const noPhoto=(await nativeBundle({engraving:true,photo:false})).bundle,withPhoto=(await nativeBundle({engraving:true,photo:true})).bundle;
 // Ohne Foto, gespiegelt wie über die Werkstatt (Acrylgravur von hinten): Regel → Vektor.
 const v=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mirror:true}),two=twoFiles(v);
 assert.deepEqual(v.metadata.settings,{mode:'vector',dpi:300,mirror:true});assert.deepEqual(v.metadata.modeRule.applied,'vector');assert.equal(v.metadata.pixelWidth,null);assert.equal(v.metadata.schema,ACRYLIC_ENGRAVING_RECIPE);
 assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'gravur-1zu1-mit-kontur.pdf',svg:'gravur-1zu1-mit-kontur.svg'});
 // Die Dateien der Seite „Ausgaben“ bleiben im Paket: Gravur-PDF, getrennte Konturdatei, Fertigungs-SVG.
 const base=two.files.get('technische-gravurpruefung.pdf'),baseSvg=two.files.get('gravur-fertigung.svg');
 assert.deepEqual(base,v.pdf);assert.equal(v.metadata.pdfSha256,digest(base));assert.equal(v.metadata.productionSvg[0].sha256,digest(baseSvg));
 const plain=inspect(base),contour=inspect(two.pdf.bytes),separate=inspect(two.files.get('gravur-kontur-1zu1.pdf'));
 for(const info of [plain,contour,separate]){assert.deepEqual([info.widthMm,info.heightMm],[150,200]);assert.equal(info.fonts,0);assert.equal(info.images.length,0);assert.equal(info.pages,1);}
 assert.ok(plain.drawings.length>1);assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings,'derselbe Inhalt wie die Gravur-PDF');
 const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0,'Haarlinie: Breite 0');assert.deepEqual(line[0].color,[0,0,0]);assert.equal(line[0].fill,null);
 assert.equal(separate.drawings.length,1);assert.deepEqual(line[0].points,separate.drawings[0].points,'deckungsgleich mit gravur-kontur-1zu1.pdf');assert.deepEqual(line[0].rect,separate.drawings[0].rect);
 assert.equal(v.metadata.contourSha256,digest(two.files.get('gravur-kontur-1zu1.pdf')));
 const artwork=JSON.parse(two.files.get('gravurpruefung.json'));assert.deepEqual(artwork.orderFiles,v.metadata.orderFiles);
 // Die Kontur der SVG ist die gesicherte Geometrie des Prüfstands (unabhängig gelesen), gespiegelt wie die Gravur.
 const {geometry}=await acrylicArtwork(noPhoto.package,noPhoto.manifest.packageSha256,{engraving:true});assert.deepEqual([geometry.widthMm,geometry.heightMm],[150,200]);
 checkSvg(two,{widthMm:150,heightMm:200,geometry,stroke:'#000000',mirror:true,plain:baseSvg});
 // Ausgabe des Stands 3.57 (Dateinachweis v1 mit vier Dateien, hier aus denselben Paketdateien nachgestellt): Aus ihr kommt nur
 // noch die Fassung mit Kontur – sofort, ohne Neuaufbau. Die Datei ohne Kontur wird nicht mehr ausgeliefert.
 const current=v.metadata.orderFiles.surfaces[0].files,v1={...v,metadata:{...v.metadata,schema:'gravuru-acrylic-engraving-proof/v7',orderFiles:{schema:'gravuru-order-files/v1',surfaces:[{id:'front',files:{pdf:{name:'technische-gravurpruefung.pdf',sha256:digest(base)},'pdf-contour':current.pdf,svg:{name:'gravur-fertigung.svg',sha256:digest(baseSvg)},'svg-contour':current.svg}}]}}};
 assert.deepEqual(orderFileSets(v1.metadata),[{id:'front',formats:['pdf','svg']}]);
 assert.deepEqual(orderDownload(v1,'pdf').bytes,two.pdf.bytes);assert.equal(orderDownload(v1,'pdf').suffix,'gravur-1zu1-mit-kontur.pdf');assert.equal(orderDownload(v1,'pdf').sha256,current.pdf.sha256);
 assert.deepEqual(orderDownload(v1,'svg').bytes,two.svg.bytes);assert.equal(orderDownload(v1,'svg').mime,'image/svg+xml');
 assert.notDeepEqual(orderDownload(v1,'pdf').bytes,base,'nicht die Gravur-PDF ohne Kontur');assert.notDeepEqual(orderDownload(v1,'svg').bytes,baseSvg);
 for(const format of ['pdf-contour','svg-contour'])assert.throws(()=>orderDownload(v1,format),{status:422,message:ORDER_FORMAT_REQUIRED});
 // Fehlt im alten Nachweis die Fassung mit Kontur, fehlt die Datei – die Fassung ohne Kontur rückt nicht nach.
 const partial=structuredClone(v1.metadata);delete partial.orderFiles.surfaces[0].files['pdf-contour'];
 assert.deepEqual(orderFileSets(partial),[{id:'front',formats:['svg']}]);assert.throws(()=>orderDownload({...v1,metadata:partial},'pdf'),{status:409,code:'order_file_missing'});
 // Mit Foto: Regel → Raster 300 dpi; die „PDF“ trägt dasselbe Graustufenbild und darüber die Haarlinie.
 const r=await createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256),photo=twoFiles(r);
 assert.deepEqual(r.metadata.settings,{mode:'raster',dpi:300,mirror:false});assert.equal(r.metadata.modeRule.applied,'raster');assert.equal(r.metadata.pixelWidth,Math.ceil(150*300/25.4));assert.equal(r.metadata.pixelHeight,Math.ceil(200*300/25.4));
 const rp=inspect(photo.files.get('technische-gravurpruefung.pdf')),rc=inspect(photo.pdf.bytes);assert.deepEqual(photo.files.get('technische-gravurpruefung.pdf'),r.pdf);assert.deepEqual(rp.images.map(i=>[i.colorSpace,i.width,i.height]),[['DeviceGray',1772,2363]]);assert.deepEqual(rc.images,rp.images);
 assert.deepEqual([rc.widthMm,rc.heightMm],[150,200]);assert.equal(rp.drawings.length,0);assert.deepEqual(rc.drawings.map(d=>[d.layer,d.width,d.type]),[['Kontur',0,'s']]);
 assert.deepEqual(rc.drawings[0].points,inspect(photo.files.get('gravur-kontur-1zu1.pdf')).drawings[0].points);
 checkSvg(photo,{widthMm:150,heightMm:200,geometry,stroke:'#000000',plain:photo.files.get('gravur-fertigung.svg')});
 // Eine ausdrückliche Wahl gilt unverändert: Raster ohne Foto bleibt Raster, Vektor mit Foto wird weiter abgelehnt.
 const explicit=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mode:'raster'});assert.deepEqual(explicit.metadata.settings,{mode:'raster',dpi:300,mirror:false});assert.equal(explicit.metadata.modeRule,undefined);
 assert.deepEqual(inspect(explicit.pdf).images.map(i=>i.colorSpace),['DeviceGray']);twoFiles(explicit);
 await assert.rejects(()=>createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
});

test('Druck: zwei Dateien 1:1 für Roland und Mimaki, beide mit Kontur; Schnittlinie als Haarlinie deckungsgleich mit der Druckdatei; keine Datei ohne Schnittlinie',async()=>{
 const {bundle}=await nativeBundle({engraving:false,photo:true});
 for(const settings of [{mirror:true},{profile:'mimaki'}]){
  const result=await createAcrylicPrintProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mimaki=settings.profile==='mimaki',label=JSON.stringify(settings);
  assert.equal(result.metadata.schema,'gravuru-acrylic-print-proof/v9');
  assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'druck-1zu1-mit-kontur.pdf',svg:'druck-1zu1-mit-kontur.svg'});
  assert.ok(![...two.files.keys()].some(name=>/ohne-schnittlinie/.test(name)),'keine Druckdatei ohne Schnittlinie im Paket');
  // Die Druckdatei der „Ausgaben“ bleibt die bisherige Datei mit ihrem Dateinachweis.
  const mainName=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'technische-druckpruefung.pdf';assert.deepEqual(two.files.get(mainName),result.pdf);assert.equal(result.metadata.downloads.pdf.sha256,digest(result.pdf));assert.equal(result.metadata.pdfSha256,digest(result.pdf));
  const main=inspect(result.pdf),order=inspect(two.pdf.bytes);
  for(const info of [main,order]){assert.deepEqual([info.widthMm,info.heightMm],[150,200],label);assert.equal(info.fonts,0);assert.equal(info.repaired,false);}
  assert.ok(main.images.length>0,'Foto als Bildebene');assert.deepEqual(order.images,main.images);
  // Farbe und Weiß wie die Druckdatei: Roland führt beides in einer Datei, bei Mimaki bleibt Weiß die eigene Datei.
  assert.equal(order.whiteSpot,main.whiteSpot);assert.equal(order.whiteSpot,!mimaki);assert.deepEqual(order.layers,main.layers);assert.equal(order.layers.includes('RDG_WHITE'),!mimaki);if(mimaki)assert.ok(two.files.has('Mimaki-NUR-RDG_WHITE.pdf'));
  assert.equal(order.cutSpot,true);assert.deepEqual(withoutLayer(order,'CutContour'),withoutLayer(main,'CutContour'),label);
  const cut=order.drawings.filter(d=>d.layer==='CutContour'),existing=main.drawings.filter(d=>d.layer==='CutContour');
  assert.equal(cut.length,1);assert.equal(cut[0].width,0);assert.deepEqual(cut[0].points,existing[0].points,'deckungsgleich mit der Schnittlinie der Druckdatei');assert.deepEqual(cut[0].rect,existing[0].rect);
  // SVG: die gesicherte Gestaltung (nicht gespiegelt) plus Kontur; die Gestaltung ohne Kontur bleibt als Quelle im Paket.
  const {geometry}=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);assert.deepEqual([geometry.widthMm,geometry.heightMm],[150,200]);
  checkSvg(two,{widthMm:150,heightMm:200,geometry,stroke:'#000000',plain:two.files.get('gesicherte-gestaltung.svg')});
  assert.deepEqual(JSON.parse(two.files.get('druckpruefung.json')).orderFiles,result.metadata.orderFiles);
 }
});

test('Funkklingel zweischichtig: PDF und SVG zeigen die Acrylauflage (sie trägt die Gestaltung) als rote Haarlinie; die Schnittdateien bleiben getrennt',async()=>{
 const fixture=doorbellFixture(),decoration=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="1mm" viewBox="0 0 30 1"><path d="M.5 .5L29.5 .5" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>'),hash=digest(decoration);
 fixture.localResources.motifs.push({key:'artwork-'+hash,bounds:[0,0,30,1],svgFragment:artworkFragment(hash,30,1),embeddedOnly:true,vectorOnly:true,artwork:{schema:'gravuru-imported-artwork/v1',assetId:hash,sourceSha256:hash,previewSha256:hash,format:'svg',page:1,pageCount:1,widthMm:30,heightMm:1}});
 for(const p of [fixture.profile,...fixture.doorbell.formats.map(f=>f.profile)])p.designs[0].objects.find(o=>o.id==='mark-0').motif='artwork-'+hash;
 const document=makeProductDocument(fixture),config=document.config,record={id:config.profile.id,revision:1,document},selection={format:'35x18',frame:'FK-VERDECKT',color:'schwarz',mounting:'B04S',position:'opposite'},source=selectedProfile(config,selection).designs[0];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
 const bundle=await prepareAcrylicReview({record,config,input:{productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:selection,quantity:1,media:[],preview:png.toString('base64')},assets:{get:()=>({format:'svg'}),read:()=>decoration},preparePhoto:async()=>({original:png,preview:png,width:40,height:60})});
 const frozen=JSON.parse(readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('funkklingel-fertigung.json'));
 for(const mirror of [false,true]){
  const result=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror}),two=twoFiles(result),label='gespiegelt: '+mirror;
  assert.equal(result.metadata.settings.mode,'vector','ohne Foto und ohne Rasterbild: Vektor');assert.equal(result.metadata.layered.cutMirror,false);
  assert.deepEqual(two.files.get('technische-gravurpruefung.pdf'),result.pdf);
  const plain=inspect(result.pdf),contour=inspect(two.pdf.bytes),acrylic=inspect(two.files.get('acrylauflage-schnitt-1zu1.pdf')),steel=inspect(two.files.get('edelstahltraeger-schnitt-1zu1.pdf'));
  for(const info of [plain,contour,acrylic,steel])assert.deepEqual([info.widthMm,info.heightMm],[350,180],label);
  assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings,label);
  const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0);assert.deepEqual(line[0].color,[1,0,0],'rot wie die Schnittdatei der Acrylauflage');
  // Deckungsgleich mit der Schnittdatei der Acrylauflage – in der Ausrichtung der Gravur (die Schnittdateien werden nie gespiegelt).
  const cut=points(acrylic.drawings),carrier=points(steel.drawings);
  samePoints(points(line),mirror?mirrored(cut,350):cut,label);
  assert.notDeepEqual(cut,carrier,'der Edelstahlträger ist ein anderes Teil und bleibt getrennt');
  const a=frozen.acrylicBoundsMm,outer=mirror?[350-a.x-a.width,a.y,350-a.x,a.y+a.height]:[a.x,a.y,a.x+a.width,a.y+a.height];
  for(const [i,v] of outer.entries())assert.ok(Math.abs(line[0].rect[i]-v)<=.02,label+' Außenmaß der Acrylauflage');
  for(const name of ['edelstahltraeger-schnitt-1zu1.pdf','acrylauflage-schnitt-1zu1.pdf','edelstahltraeger-schnitt.svg','acrylauflage-schnitt.svg','gravur-kontur-1zu1.pdf'])assert.ok(two.files.has(name),name);
  assert.equal(two.files.get('acrylauflage-schnitt.svg').toString(),frozen.acrylic.svg);assert.equal(two.files.get('edelstahltraeger-schnitt.svg').toString(),frozen.steel.svg);
  checkSvg(two,{widthMm:350,heightMm:180,geometry:frozen.geometry,stroke:'#ff0000',mirror,plain:two.files.get('gravur-fertigung.svg')});
 }
});

// Formprodukt alter Art wie in form-engraving-proof.test.mjs / form-print-proof.test.mjs: Freiform 60 × 40 mm mit Ausschnitt und
// Bohrloch, importierte Designquelle (zwei Flächen), ein Textfeld, ein Fotoplatz. `capture` sichert den Prüfstand in der Werkstatt.
async function formBundle({method,photo=false,material='steel',workshop=seedWorkshop().w}){
 const {seed}=seedWorkshop(),fonts=seed.universal.localResources.fonts;
 const contour=await workshop.contours.import({name:'Form.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><path d="M0 0H60V30H40V40H0Z"/><circle cx="8" cy="20" r="2"/></svg>').toString('base64')});
 const asset=await workshop.assets.import({name:'Design.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="0 0 60 40"><rect x="3" y="3" width="14" height="20" fill="red"/><rect x="35" y="3" width="10" height="15" fill="blue"/></svg>').toString('base64')});
 const d=addFormDesign(makeFormProduct(contour,'Formprüfung · synthetisch'),asset,{name:'Prüfdesign',designId:'design-'+method});d.processingMethod=method;d.material={id:material,thicknessMm:1.5,surfaceNotes:''};d.basePriceCents=2999;d.designs[0].sourcePrepared=true;
 d.designs[0].fields=[{id:'text',type:'text',label:'Name',xMm:5,yMm:29,widthMm:30,heightMm:8,text:'Oa',font:Object.keys(fonts)[0],sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:false,allowScale:false,allowDelete:false,allowColor:false},{id:'photo',type:'photo',label:'Foto',xMm:22,yMm:10,widthMm:10,heightMm:10,shape:'rect',required:false,allowMove:true,allowScale:true,allowDelete:true}];
 const record=workshop.repository.create(d),created=workshop.customerDrafts.create(record,d.defaultDesignId,initialFormCustomerState(d.designs[0]));let draft=created;
 if(photo){
  const raw=execFileSync(python,['-c',"from PIL import Image;import sys;im=Image.new('RGBA',(1200,1200),(0,0,0,255));im.paste((255,255,255,255),(600,0,1200,1200));im.save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()});
  const media=workshop.customerDrafts.addPhoto(created.id,created.token,await prepareCustomerPhoto(raw.toString('base64'))),state=structuredClone(created.state);state.fields.find(f=>f.id==='photo').mediaId=media.mediaId;draft=workshop.customerDrafts.save(created.id,created.token,state,1);
 }
 const bundle=await prepareFormReview({record,draft,assets:workshop.assets,contours:workshop.contours,fonts,media:id=>workshop.customerDrafts.photo(created.id,created.token,id)});
 const saved=readReviewPackage(bundle.package,bundle.manifest.packageSha256).files;
 return {record,bundle,geometry:JSON.parse(saved.get('produkt-und-gestaltung.json')).product.form.geometry,source:saved.get('gestaltung-vorschau.svg'),capture:()=>workshop.customerDrafts.capture(created.id,created.token,draft.revision,bundle)};
}
// Die Gestaltung des Formprodukts ist selbst auf die Kontur beschnitten (clipPath `form-design-clip`, form-review-snapshot.mjs).
// Trägt die Konturebene denselben Pfad im selben Zahlenraum (viewBox in mm), liegt sie deckungsgleich auf der Gestaltung.
const clipPathOf=svg=>svg.toString().match(/<clipPath id="form-design-clip"><path d="([^"]*)"/)?.[1];
const contourPathOf=svg=>svg.toString().match(/<g id="kontur"[^>]*><path d="([^"]*)"/)?.[1];

test('Formprodukt alter Art, Gravur: dieselben zwei Dateien mit Kontur (Schiefer blau, sonst schwarz); die bisherigen Dateien bleiben; Kontur deckungsgleich zur Gestaltung',async()=>{
 for(const [material,stroke,rgb] of [['steel','#000000',[0,0,0]],['slate','#0000ff',[0,0,1]]]){
  const {bundle,geometry,source}=await formBundle({method:'engraving',material});
  assert.deepEqual([geometry.schema,geometry.widthMm,geometry.heightMm],['gravuru-contour/v1',60,40]);assert.match(source.toString(),/^<svg [^>]*width="60mm" height="40mm" viewBox="0 0 60 40">/,'Gestaltung in Millimetern');
  for(const settings of [{mode:'vector'},{mode:'vector',mirror:true},{}]){
   const result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mirror=settings.mirror===true,vector=settings.mode==='vector',label=material+' '+JSON.stringify(settings);
   assert.equal(result.metadata.schema,'gravuru-form-engraving-proof/v2');assert.equal(result.metadata.settings.mode,vector?'vector':'raster');
   assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'gravur-1zu1-mit-kontur.pdf',svg:'gravur-1zu1-mit-kontur.svg'});
   // Die bisherigen Dateien des Pakets bleiben: Gravur-PDF (die Datei der „Ausgaben“) und die getrennte Konturdatei (schwarz, 0,05 mm).
   assert.deepEqual(two.files.get('technische-gravurpruefung.pdf'),result.pdf);assert.equal(result.metadata.pdfSha256,digest(result.pdf));assert.equal(result.metadata.contourSha256,digest(two.files.get('gravur-kontur-1zu1.pdf')));
   const plain=inspect(result.pdf),contour=inspect(two.pdf.bytes),separate=inspect(two.files.get('gravur-kontur-1zu1.pdf'));
   for(const info of [plain,contour,separate]){assert.deepEqual([info.widthMm,info.heightMm],[60,40],label);assert.equal(info.fonts,0);assert.equal(info.pages,1);}
   assert.deepEqual(separate.drawings.map(d=>[d.type,d.color]),[['s',[0,0,0]]]);assert.ok(Math.abs(separate.drawings[0].width-.05*72/25.4)<1e-4,'getrennte Konturdatei bleibt bei 0,05 mm');
   // „PDF“: derselbe Inhalt wie die Gravur-PDF plus genau eine Haarlinie in der Farbe der Regel, deckungsgleich mit der Konturdatei.
   assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings,label);assert.deepEqual(contour.images,plain.images);assert.deepEqual(contour.layers,['Kontur']);
   const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0,'Haarlinie: Breite 0');assert.equal(line[0].type,'s');assert.equal(line[0].fill,null);assert.deepEqual(line[0].color,rgb,label);
   assert.deepEqual(line[0].points,separate.drawings[0].points,'deckungsgleich mit gravur-kontur-1zu1.pdf');assert.deepEqual(line[0].rect,separate.drawings[0].rect);assert.deepEqual(line[0].rect,[0,0,60,40]);
   if(vector){
    // Lage der Gestaltung im selben Maß: die rote Fläche der Designquelle (3…17 × 3…23 mm), gespiegelt 43…57 mm.
    assert.equal(plain.images.length,0);assert.ok(plain.drawings.some(d=>d.type==='f'&&d.rect.every((v,i)=>Math.abs(v-(mirror?[43,3,57,23]:[3,3,17,23])[i])<=.02)),label+' Designfläche');
   }else assert.deepEqual(plain.images.map(i=>i.colorSpace),['DeviceGray']);
   // „SVG“: die Gravurgestaltung in mm plus Konturebene; die Kontur ist der Pfad, auf den die Gestaltung selbst beschnitten ist.
   checkSvg(two,{widthMm:60,heightMm:40,geometry,stroke,mirror});
   const svg=two.svg.bytes.toString();assert.equal(contourPathOf(svg),clipPathOf(svg),'Kontur = Beschnitt der Gestaltung');assert.equal(clipPathOf(svg),clipPathOf(source));
   // Gespiegelt liegen Gestaltung und Kontur unter derselben Spiegelung; sonst trägt keine von beiden eine.
   const flip='transform="translate(60 0) scale(-1 1)"';assert.equal(svg.includes('<g '+flip+'><defs>'),mirror,label);assert.equal(svg.includes('stroke-width="0.05" '+flip+'>'),mirror,label);
   assert.match(svg,/data-design="design-engraving"/);
   assert.deepEqual(JSON.parse(two.files.get('gravurpruefung.json')).orderFiles,result.metadata.orderFiles);
  }
 }
 // Mit Kundenfoto: Raster; die „PDF“ trägt dasselbe Graustufenbild und darüber die Haarlinie.
 const {bundle}=await formBundle({method:'engraving',photo:true}),result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256),two=twoFiles(result);
 const plain=inspect(result.pdf),contour=inspect(two.pdf.bytes);assert.equal(plain.drawings.length,0);assert.deepEqual(contour.images,plain.images);assert.deepEqual(contour.drawings.map(d=>[d.layer,d.width,d.type]),[['Kontur',0,'s']]);
 await assert.rejects(()=>createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
});

test('Formprodukt alter Art, Druck: dieselben zwei Dateien mit Kontur für Roland und Mimaki; die Druckdateien bleiben; Kontur deckungsgleich zur Gestaltung',async()=>{
 const {bundle,geometry,source}=await formBundle({method:'print',photo:true,material:'slate'});
 for(const settings of [{},{mirror:true},{profile:'mimaki'}]){
  const result=await createFormPrintProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mimaki=settings.profile==='mimaki',label=JSON.stringify(settings);
  assert.equal(result.metadata.schema,'gravuru-form-print-proof/v6');
  assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'druck-1zu1-mit-kontur.pdf',svg:'druck-1zu1-mit-kontur.svg'});
  assert.ok(![...two.files.keys()].some(name=>/ohne-schnittlinie/.test(name)));
  // Die Druckdatei der „Ausgaben“ bleibt die bisherige Datei mit ihrem Dateinachweis; bei Mimaki bleibt Weiß die eigene Datei.
  const mainName=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'technische-druckpruefung.pdf';assert.deepEqual(two.files.get(mainName),result.pdf);assert.equal(result.metadata.downloads.pdf.sha256,digest(result.pdf));assert.equal(result.metadata.pdfSha256,digest(result.pdf));
  if(mimaki)assert.equal(digest(two.files.get('Mimaki-NUR-RDG_WHITE.pdf')),result.metadata.downloads.white.sha256);
  const main=inspect(result.pdf),order=inspect(two.pdf.bytes);
  for(const info of [main,order]){assert.deepEqual([info.widthMm,info.heightMm],[60,40],label);assert.equal(info.fonts,0);assert.equal(info.repaired,false);}
  assert.ok(main.images.length>0);assert.deepEqual(order.images,main.images);assert.equal(order.whiteSpot,main.whiteSpot);assert.equal(order.whiteSpot,!mimaki);assert.deepEqual(order.layers,main.layers);
  assert.equal(order.cutSpot,true);assert.deepEqual(withoutLayer(order,'CutContour'),withoutLayer(main,'CutContour'),label);
  const cut=order.drawings.filter(d=>d.layer==='CutContour'),existing=main.drawings.filter(d=>d.layer==='CutContour');
  assert.equal(cut.length,1);assert.equal(existing.length,1);assert.equal(cut[0].width,0,'Haarlinie: Breite 0');assert.ok(Math.abs(existing[0].width-.05*72/25.4)<1e-4);
  assert.deepEqual(cut[0].points,existing[0].points,'deckungsgleich mit der Schnittlinie der Druckdatei');assert.deepEqual(cut[0].rect,existing[0].rect);assert.deepEqual(cut[0].rect,[0,0,60,40]);
  // „SVG“: die gesicherte Gestaltung (seitenrichtig, auch bei gespiegeltem Druck) plus Kontur – schwarz, auch auf Schiefer (Druck).
  checkSvg(two,{widthMm:60,heightMm:40,geometry,stroke:'#000000',plain:source});
  const svg=two.svg.bytes.toString();assert.equal(contourPathOf(svg),clipPathOf(svg),'Kontur = Beschnitt der Gestaltung');assert.doesNotMatch(svg,/<g id="kontur"[^>]* transform=/);
  assert.deepEqual(JSON.parse(two.files.get('druckpruefung.json')).orderFiles,result.metadata.orderFiles);
 }
});

// Werkstatt wie im Büro: Händlersitzung und CSRF. Eine bezahlte Testbestellung je Prüfstand; der Auftrag entsteht mit dem Eingang.
test('Download der Bestellposition: nur angemeldet und mit CSRF, zwei Formate mit geprüfter Prüfsumme; frühere Ausgaben → Konturfassung sofort bzw. Hinweis und Neuaufbau; Formprodukt wie natives Produkt',async t=>{
 const {dir,seed}=seedWorkshop(),shopDomain='synthetic.myshopify.com',secret='synthetic-app-secret-value-265',origin='https://work.example';
 const w=createWorkshop({filename:path.join(dir,'route.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,shopifySessions:{mode:'test-only',shopDomain,clientId:'synthetic-client',secret}});
 const api=http.createServer((req,res)=>w.handle(req,res,new URL(req.url,origin)));api.listen(0,'127.0.0.1');await once(api,'listening');
 t.after(async()=>{api.closeAllConnections();await new Promise(r=>api.close(r));w.close();});
 const bearer=()=>{const at=Math.floor(Date.now()/1000),input=[{alg:'HS256',typ:'JWT'},{aud:'synthetic-client',dest:'https://'+shopDomain,sub:'123',iss:'https://'+shopDomain+'/admin',exp:at+60,nbf:at,iat:at,jti:randomUUID()}].map(v=>Buffer.from(JSON.stringify(v)).toString('base64url')).join('.');return 'Bearer '+input+'.'+createHmac('sha256',secret).update(input).digest('base64url');};
 let csrf='';
 const call=async(pathname,data,{auth=true,token=true,method}={})=>{const r=await fetch('http://127.0.0.1:'+api.address().port+pathname,{method:method||(data?'POST':'GET'),headers:{...(auth?{authorization:bearer()}:{}),...(data?{'Content-Type':'application/json'}:{}),...(data&&token?{'X-Gravuru-CSRF':csrf}:{})},...(data?{body:JSON.stringify(data)}:{})}),bytes=Buffer.from(await r.arrayBuffer());let json=null;try{json=JSON.parse(bytes);}catch{}return {status:r.status,headers:r.headers,bytes,json};};
 csrf=(await call('/api/workshop/session')).json.csrfToken;assert.match(csrf,/^[a-f0-9]{64}$/);
 let serial=0;
 // `quiet`: Eingang in einer fremden, offenen Transaktion – wie eine Bestellung vor dem Aufspielen entsteht dabei kein Auftrag.
 async function position(text,{quiet=false}={}){
  const {record,bundle}=await nativeBundle({engraving:true,photo:false,text,workshop:w});w.customerDrafts.captureAcrylicReview('order-files-'+text,bundle);
  const n=++serial,binding=w.orderIntake.bind({shopDomain,variantId:String(300+n),record,snapshotId:bundle.manifest.id}),offer=w.orderIntake.offer({bindingId:binding.id,snapshotId:bundle.manifest.id,quantity:1});
  const raw=Buffer.from(JSON.stringify({id:1000+n,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:2000+n,variant_id:300+n,quantity:1,price:(binding.unitCents/100).toFixed(2),properties:[offer.property]}]}));
  const deliver=()=>w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-order-files-'+n},{shopDomain,secret,apiVersion:'2026-07'});
  const result=quiet?w.orderIntake.withBindingTransaction(deliver):deliver();assert.equal(result.errors.length,0);return result.lines[0];
 }
 const route=line=>'/api/workshop/orders/'+line.id+'/download',outputs=async line=>(await call('/api/workshop/orders/'+line.id+'/outputs')).json;

 // 1. Neue Bestellung: Auftrag mit dem Eingang, Regel → Vektor (kein Foto, kein Fertigungsprofil), gespiegelt nach Verfahrensprofil.
 const first=await position('Ab'),[job]=w.exportJobs.forSnapshot(first.snapshotId).jobs;
 assert.deepEqual(job.settings,{mode:'auto',dpi:300,mirror:true});assert.equal(job.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal(job.recipeKey,acrylicEngravingKey(job.settings));
 // Solange gebaut wird: Kennzeichen „wird erstellt“, noch keine Datei – der Abruf nennt das, statt etwas Halbes zu liefern.
 const early=await call(route(first),{format:'pdf'});assert.equal(early.status,409);assert.equal(early.json.error.code,'order_file_missing');assert.equal(early.json.error.message,'PDF und SVG werden für diese Position gerade erstellt.');
 await w.exportWorker.wait(job.id);
 const proof=w.customerDrafts.printProof(first.snapshotId,job.recipeKey),files=unpack(proof);assert.equal(proof.metadata.settings.mode,'vector');
 const ready=await outputs(first);assert.deepEqual(ready.outputState,{state:'fertig',reason:null,jobId:job.id});
 assert.deepEqual(ready.downloads,{jobId:job.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});assert.equal(ready.total,1);
 // Nur angemeldet, nur mit CSRF, nur per POST, nur die zwei Formate – auch die früheren Formate werden abgelehnt.
 assert.equal((await call(route(first),{format:'pdf'},{auth:false})).status,401);assert.equal((await call(route(first),{format:'pdf'},{token:false})).status,403);
 assert.equal((await call(route(first))).status,405);assert.equal((await call(route(first),undefined,{auth:false})).status,401);
 for(const body of [{format:'zip'},{format:'white-pdf'},{format:'pdf-contour'},{format:'svg-contour'},{},{format:'pdf',job:job.id},{format:'pdf',surface:'left'}])assert.equal((await call(route(first),body)).status,422,JSON.stringify(body));
 assert.equal((await call(route(first),{format:'pdf-contour'})).json.error.message,'Bitte PDF oder SVG auswählen.');
 assert.equal((await call('/api/workshop/orders/orderline_00000000-0000-4000-8000-000000000000/download',{format:'pdf'})).status,404);
 const expected={pdf:['gravur-1zu1-mit-kontur.pdf','application/pdf'],svg:['gravur-1zu1-mit-kontur.svg','image/svg+xml']};
 for(const format of ORDER_FORMATS){
  const r=await call(route(first),{format}),[name,mime]=expected[format],descriptor=proof.metadata.orderFiles.surfaces[0].files[format];
  assert.equal(r.status,200,format);assert.equal(r.headers.get('content-type'),mime);assert.equal(r.headers.get('content-disposition'),'attachment; filename="'+job.id+'-'+name+'"');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(r.bytes,files.get(name),format);assert.equal(digest(r.bytes),descriptor.sha256);assert.equal(r.headers.get('x-gravuru-file-sha256'),descriptor.sha256);
 }
 // „PDF“ ist die Gravur mit Kontur als Haarlinie – nicht die Gravur-PDF der Seite „Ausgaben“; „SVG“ trägt die Konturebene.
 const withContour=(await call(route(first),{format:'pdf'})).bytes;assert.notDeepEqual(withContour,proof.pdf);assert.deepEqual(inspect(withContour).drawings.filter(d=>d.layer==='Kontur').map(d=>d.width),[0]);
 assert.match((await call(route(first),{format:'svg'})).bytes.toString(),/<g id="kontur" fill="none" stroke="#000000" stroke-width="0\.05" transform="translate\(150 0\) scale\(-1 1\)"><path d="[^"]+"\/><\/g><\/svg>$/);
 assert.equal((await call(route(first),{format:'pdf',surface:'back'})).status,409,'keine Rückseite gestaltet');
 // Die bestehenden Ausgabe-Downloads bleiben unverändert.
 assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'pdf'})).bytes,proof.pdf);assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'zip'})).bytes,proof.archive);

 // 2. Ausgabe ohne Dateinachweis (Rezeptstand v6, vor 3.57): bleibt gültig und abrufbar; die Position bekommt statt eines
 // Fehlers den Hinweis, und der Auftrag mit dem neuen Rezeptstand entsteht beim Öffnen der Ausgaben von selbst.
 const old=await position('Cd',{quiet:true}),oldSettings={mode:'raster',dpi:300,mirror:true},oldKey=digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings}));
 assert.equal(w.exportJobs.forSnapshot(old.snapshotId).total,0);
 w.customerDrafts.savePrintProof(old.snapshotId,oldKey,{metadata:{schema:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings,pdfSha256:digest(Buffer.from('%PDF-alt')),warnings:[]},pdf:Buffer.from('%PDF-alt'),archive:Buffer.from('altes Paket')});
 const oldJob=w.exportJobs.enqueue({snapshotId:old.snapshotId,recipeKey:oldKey,recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings});assert.equal(oldJob.status,'completed');
 assert.deepEqual(w.orderOutputState(old),{state:'fertig',reason:null,jobId:oldJob.id});
 const missing=await call(route(old),{format:'pdf'});assert.equal(missing.status,409);assert.equal(missing.json.error.code,'order_file_missing');assert.match(missing.json.error.message,/enthält PDF und SVG mit Kontur nicht.*neu erstellen/);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'),'die alte Ausgabe bleibt abrufbar');
 const opened=await outputs(old);assert.equal(opened.total,2);assert.equal(opened.outputState.state,'fertig');
 assert.deepEqual(opened.downloads,{jobId:null,formats:[...ORDER_FORMATS],surfaces:[],pending:true,note:'PDF und SVG werden für diese Position neu erstellt.'});
 assert.ok(orderFileButtons(opened.outputState,opened.downloads)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(opened.outputState,opened.downloads),opened.downloads.note);
 const rebuilt=opened.jobs.find(j=>j.id!==oldJob.id);assert.equal(rebuilt.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal((await outputs(old)).total,2,'wiederholtes Öffnen legt nichts doppelt an');
 await w.exportWorker.wait(rebuilt.id);
 const renewed=await outputs(old);assert.deepEqual(renewed.downloads,{jobId:rebuilt.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
 assert.ok(orderFileButtons(renewed.outputState,renewed.downloads)[0].buttons.every(b=>b.enabled));
 const fresh=await call(route(old),{format:'pdf'});assert.equal(fresh.status,200);assert.equal(inspect(fresh.bytes).drawings.filter(d=>d.layer==='Kontur')[0].width,0);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'));

 // 2b. Ausgabe des Stands 3.57 (Rezeptstand v7, Dateinachweis mit vier Dateien – so liegen die Ausgaben vom 21.11.2026 vor):
 // „PDF“ und „SVG“ kommen sofort aus ihr, als Fassung mit Kontur; die Fassungen ohne Kontur werden nicht mehr abgegeben. Beim
 // Öffnen entsteht der Auftrag mit dem heutigen Rezeptstand; bis er fertig ist, bleibt die vorhandene Ausgabe die Quelle.
 const seven=await position('Ij',{quiet:true}),sevenKey=digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/v7',settings:job.settings})),present=proof.metadata.orderFiles.surfaces[0].files;
 assert.notEqual(sevenKey,job.recipeKey);
 const sevenMetadata={...structuredClone(proof.metadata),schema:'gravuru-acrylic-engraving-proof/v7',orderFiles:{schema:'gravuru-order-files/v1',surfaces:[{id:'front',files:{pdf:{name:'technische-gravurpruefung.pdf',sha256:digest(files.get('technische-gravurpruefung.pdf'))},'pdf-contour':present.pdf,svg:{name:'gravur-fertigung.svg',sha256:digest(files.get('gravur-fertigung.svg'))},'svg-contour':present.svg}}]}};
 w.customerDrafts.savePrintProof(seven.snapshotId,sevenKey,{metadata:sevenMetadata,pdf:proof.pdf,archive:proof.archive});
 const sevenJob=w.exportJobs.enqueue({snapshotId:seven.snapshotId,recipeKey:sevenKey,recipe:'gravuru-acrylic-engraving-proof/v7',settings:job.settings});assert.equal(sevenJob.status,'completed');
 for(const format of ORDER_FORMATS){
  const r=await call(route(seven),{format}),[name]=expected[format];assert.equal(r.status,200,format);assert.deepEqual(r.bytes,files.get(name),format);
  assert.equal(r.headers.get('content-disposition'),'attachment; filename="'+sevenJob.id+'-'+name+'"');assert.equal(r.headers.get('x-gravuru-file-sha256'),present[format].sha256);
 }
 assert.notDeepEqual((await call(route(seven),{format:'pdf'})).bytes,files.get('technische-gravurpruefung.pdf'),'nicht die Datei ohne Kontur');
 for(const format of ['pdf-contour','svg-contour'])assert.equal((await call(route(seven),{format})).status,422,format);
 const openedSeven=await outputs(seven);assert.equal(openedSeven.total,2);
 assert.deepEqual(openedSeven.downloads,{jobId:sevenJob.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
 const renewedJob=openedSeven.jobs.find(j=>j.id!==sevenJob.id);assert.equal(renewedJob.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal(renewedJob.recipeKey,job.recipeKey);
 await w.exportWorker.wait(renewedJob.id);assert.equal((await outputs(seven)).downloads.jobId,renewedJob.id,'danach gilt der Auftrag der Position');assert.equal((await outputs(seven)).total,2);
 assert.equal(w.customerDrafts.printProof(seven.snapshotId,renewedJob.recipeKey).metadata.orderFiles.schema,ORDER_FILES_SCHEMA);

 // 3. Falsche Prüfsumme: Der Dateinachweis des Auftrags passt nicht zu den Bytes im Paket → Fehler wie bei der Weißdatei, keine Datei.
 const tampered=await position('Ef',{quiet:true}),metadata=structuredClone(proof.metadata);metadata.orderFiles.surfaces[0].files.pdf.sha256='0'.repeat(64);
 w.customerDrafts.savePrintProof(tampered.snapshotId,job.recipeKey,{metadata,pdf:proof.pdf,archive:proof.archive});
 const checked=await outputs(tampered);assert.equal(checked.outputState.state,'fertig');assert.equal(checked.total,1);
 const wrong=await call(route(tampered),{format:'pdf'});assert.equal(wrong.status,422);assert.equal(wrong.json.error.code,'print_delivery');assert.match(wrong.json.error.message,/unvollständig oder verändert/);
 assert.ok(!wrong.bytes.includes('%PDF-'));assert.equal((await call(route(tampered),{format:'svg'})).status,200,'die übrigen Dateien mit passendem Nachweis bleiben abrufbar');
 // Verändertes Paket: dieselbe Antwort wie bei den bestehenden Downloads aus dem Paket.
 const broken=await position('Gh',{quiet:true}),archive=Buffer.from(proof.archive);archive[archive.indexOf('gravur-1zu1-mit-kontur.svg')+60]^=1;
 w.customerDrafts.savePrintProof(broken.snapshotId,job.recipeKey,{metadata:proof.metadata,pdf:proof.pdf,archive});await outputs(broken);
 const damaged=await call(route(broken),{format:'svg'});assert.equal(damaged.status,422);assert.match(damaged.json.error.message,/Ausgabepaket ist unvollständig oder verändert/);

 // 4. Formprodukt alter Art (ENTSCHEIDUNGEN 3.61: „alles andere auch“): Der Auftrag entsteht mit dem Eingang wie beim nativen
 // Produkt; PDF und SVG tragen die Kontur. Eine fertige Ausgabe des früheren Rezeptstands (ohne die Dateien) wird beim Öffnen
 // von selbst neu aufgebaut – kein Sonderfall „Formprodukt alter Art“ mehr.
 async function formPosition(material,{quiet=false}={}){
  const {record,bundle,capture}=await formBundle({method:'engraving',material,workshop:w});capture();
  const n=++serial,binding=w.orderIntake.bind({shopDomain,variantId:String(300+n),record}),offer=w.orderIntake.offer({bindingId:binding.id,snapshotId:bundle.manifest.id,quantity:1});
  const raw=Buffer.from(JSON.stringify({id:1000+n,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:2000+n,variant_id:300+n,quantity:1,price:(binding.unitCents/100).toFixed(2),properties:[offer.property]}]}));
  const deliver=()=>w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-order-files-form-'+n},{shopDomain,secret,apiVersion:'2026-07'});
  const result=quiet?w.orderIntake.withBindingTransaction(deliver):deliver();assert.equal(result.errors.length,0);return result.lines[0];
 }
 const form=await formPosition('slate'),[formJob]=w.exportJobs.forSnapshot(form.snapshotId).jobs;
 assert.equal(formJob.recipe,FORM_ENGRAVING_RECIPE);assert.equal(formJob.recipeKey,formEngravingKey(formJob.settings));
 await w.exportWorker.wait(formJob.id);
 const formReady=await outputs(form);assert.deepEqual(formReady.outputState,{state:'fertig',reason:null,jobId:formJob.id});
 assert.deepEqual(formReady.downloads,{jobId:formJob.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});assert.equal(formReady.total,1);
 const formProof=w.customerDrafts.printProof(form.snapshotId,formJob.recipeKey),formPdf=await call(route(form),{format:'pdf'}),formSvg=await call(route(form),{format:'svg'});
 assert.equal(formPdf.status,200);assert.equal(formPdf.headers.get('content-disposition'),'attachment; filename="'+formJob.id+'-gravur-1zu1-mit-kontur.pdf"');assert.equal(formPdf.headers.get('x-gravuru-file-sha256'),formProof.metadata.orderFiles.surfaces[0].files.pdf.sha256);
 assert.deepEqual(inspect(formPdf.bytes).drawings.filter(d=>d.layer==='Kontur').map(d=>[d.width,d.color]),[[0,[0,0,1]]],'Schiefer: blaue Haarlinie');
 assert.equal(formSvg.status,200);assert.equal(formSvg.headers.get('content-type'),'image/svg+xml');assert.match(formSvg.bytes.toString(),/<g id="kontur" fill="none" stroke="#0000ff" stroke-width="0\.05"/);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+formJob.id+'/download',{format:'pdf'})).bytes,formProof.pdf,'die Ausgabe der Seite „Ausgaben“ bleibt die Gravur-PDF');
 // Frühere Formausgabe (Rezept v1, ohne Dateinachweis): Hinweis statt Fehler, Neuaufbau beim Öffnen.
 const formOld=await formPosition('steel',{quiet:true}),formOldSettings=formEngravingSettings({}),formOldKey=digest(JSON.stringify({recipe:'gravuru-form-engraving-proof/v1',settings:formOldSettings}));
 assert.equal(w.exportJobs.forSnapshot(formOld.snapshotId).total,0);
 w.customerDrafts.savePrintProof(formOld.snapshotId,formOldKey,{metadata:{schema:'gravuru-form-engraving-proof/v1',settings:formOldSettings,pdfSha256:digest(Buffer.from('%PDF-form-alt')),warnings:[]},pdf:Buffer.from('%PDF-form-alt'),archive:Buffer.from('altes Formpaket')});
 const formOldJob=w.exportJobs.enqueue({snapshotId:formOld.snapshotId,recipeKey:formOldKey,recipe:'gravuru-form-engraving-proof/v1',settings:formOldSettings});assert.equal(formOldJob.status,'completed');
 const formMissing=await call(route(formOld),{format:'pdf'});assert.equal(formMissing.status,409);assert.match(formMissing.json.error.message,/enthält PDF und SVG mit Kontur nicht.*neu erstellen/);assert.doesNotMatch(formMissing.json.error.message,/Formprodukt/);
 const formOpened=await outputs(formOld);assert.equal(formOpened.total,2);assert.deepEqual(formOpened.downloads,{jobId:null,formats:[...ORDER_FORMATS],surfaces:[],pending:true,note:'PDF und SVG werden für diese Position neu erstellt.'});
 const formRebuilt=formOpened.jobs.find(j=>j.id!==formOldJob.id);assert.equal(formRebuilt.recipe,FORM_ENGRAVING_RECIPE);await w.exportWorker.wait(formRebuilt.id);
 const formRenewed=await outputs(formOld);assert.deepEqual(formRenewed.downloads,{jobId:formRebuilt.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
 assert.deepEqual(inspect((await call(route(formOld),{format:'pdf'})).bytes).drawings.filter(d=>d.layer==='Kontur').map(d=>[d.width,d.color]),[[0,[0,0,0]]],'Edelstahl: schwarze Haarlinie');
 assert.deepEqual((await call('/api/workshop/export-jobs/'+formOldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-form-alt'),'die frühere Ausgabe bleibt abrufbar');
});
