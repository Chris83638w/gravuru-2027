// #265 Stufe B, Lieferung 2 (ENTSCHEIDUNGEN 3.57): vier Downloads je Bestellposition – PDF, PDF mit Kontur, SVG, SVG mit Kontur.
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
import {formEngravingSettings,renderEngraving} from './form-engraving-proof.mjs';
import {ACRYLIC_ENGRAVING_RECIPE,acrylicEngravingKey,acrylicEngravingSettings,createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {createAcrylicPrintProof} from './acrylic-print-proof.mjs';
import {printDelivery,orderDownload,orderFileSets,svgWithContour,ORDER_FORMATS,ORDER_FILE_MISSING} from './print-delivery.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {orderFileButtons,orderFilesNote,ORDER_FILE_LABELS} from './ui/order-store-context.mjs';
import {missingOrderFilesNote} from './cross-store-orders.mjs';

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
const unpack=result=>readReviewPackage(result.archive,digest(result.archive),NATIVE_REVIEW_SCHEMAS).files;
const points=drawings=>[...new Set(drawings.flatMap(d=>d.points.map(p=>p.join(' '))))].sort();
const mirrored=(list,widthMm)=>[...new Set(list.map(p=>{const [x,y]=p.split(' ').map(Number);return Number((widthMm-x).toFixed(2))+' '+y;}))].sort();
// Nachbarpunkte dürfen um die Rundung (0,01 mm) abweichen; verglichen wird Punkt für Punkt in sortierter Reihenfolge.
const samePoints=(a,b,message)=>{assert.equal(a.length,b.length,message);const xy=list=>list.map(p=>p.split(' ').map(Number)).sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const x=xy(a),y=xy(b);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i][0]-y[i][0])<=.02&&Math.abs(x[i][1]-y[i][1])<=.02,message+' '+a[i]+' / '+b[i]);};
const withoutLayer=(info,layer)=>info.drawings.filter(d=>d.layer!==layer).map(d=>({...d,layer:''}));
// Die vier Dateien einer Fläche samt Dateinachweis; jede liegt im Paket und stimmt mit ihrer Prüfsumme überein.
function fourFiles(result,surfaceId='front'){
 const files=unpack(result),sets=orderFileSets(result.metadata),set=sets.find(s=>s.id===surfaceId);
 assert.ok(set,'Dateinachweis der Fläche');assert.deepEqual(set.formats,[...ORDER_FORMATS]);
 const out={files};
 for(const format of ORDER_FORMATS){
  const descriptor=result.metadata.orderFiles.surfaces.find(s=>s.id===surfaceId).files[format],bytes=files.get(descriptor.name);
  assert.ok(bytes,descriptor.name);assert.equal(digest(bytes),descriptor.sha256,descriptor.name);
  assert.deepEqual(orderDownload(result,format,surfaceId).bytes,bytes);out[format]={name:descriptor.name,bytes};
 }
 return out;
}
// SVG 1:1 in Millimetern: Breite/Höhe in mm und derselbe Zahlenraum im viewBox; „mit Kontur“ = dieselbe Datei plus genau die Konturebene.
function checkSvg(four,{widthMm,heightMm,geometry,stroke,mirror=false}){
 const plain=four.svg.bytes.toString(),contour=four['svg-contour'].bytes.toString();
 for(const text of [plain,contour]){assert.match(text,new RegExp('^<svg [^>]*width="'+widthMm+'mm"'));assert.match(text,new RegExp('^<svg [^>]*height="'+heightMm+'mm"'));assert.match(text,new RegExp('^<svg [^>]*viewBox="0 0 '+widthMm+' '+heightMm+'"'));}
 assert.doesNotMatch(plain,/id="kontur"/);
 const group=contour.match(/<g id="kontur"[^>]*>.*?<\/g>(?=<\/svg>$)/s)?.[0];assert.ok(group,'Konturebene als letzte Ebene');
 assert.equal(contour.replace(group,''),plain,'ohne die Konturebene ist „SVG mit Kontur“ die Datei „SVG“');
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
 assert.equal(ACRYLIC_ENGRAVING_RECIPE,'gravuru-acrylic-engraving-proof/v7');
 assert.deepEqual(acrylicEngravingSettings(undefined,{mirror:true}),{mode:'auto',dpi:300,mirror:true});
 assert.deepEqual(acrylicEngravingSettings(null),{mode:'auto',dpi:300,mirror:false});
 for(const mode of ['raster','vector'])assert.deepEqual(acrylicEngravingSettings(undefined,{mode,mirror:true}),formEngravingSettings({mode,mirror:true}));
 const profile={mode:'raster',dpi:600,mirror:true};
 assert.deepEqual(acrylicEngravingSettings(profile),formEngravingSettings(profile));assert.deepEqual(acrylicEngravingSettings(profile,{mirror:true}),formEngravingSettings(profile));
 assert.deepEqual(acrylicEngravingSettings({mode:'vector',dpi:300,mirror:false},{dpi:600}),{mode:'vector',dpi:600,mirror:false});
 assert.throws(()=>acrylicEngravingSettings(profile,{mode:'auto'}),/Gravureinstellungen/,'mit Profil gibt es keine Regel statt des Profils');
 assert.throws(()=>acrylicEngravingSettings(undefined,{mode:'auto',white:'full'}),/Gravureinstellungen/);assert.throws(()=>formEngravingSettings({mode:'auto'}),/Gravureinstellungen/,'Formprodukte alter Art kennen die Regel nicht');
 // Eigener Schlüssel je Wahl; Ausgaben des Rezeptstands v6 behalten ihren Schlüssel und bleiben abrufbar.
 const keys=['auto','raster','vector'].map(mode=>acrylicEngravingKey({mode,mirror:true}));assert.equal(new Set(keys).size,3);
 assert.equal(acrylicEngravingKey(acrylicEngravingSettings(undefined,{mirror:true})),keys[0]);
 assert.notEqual(keys[1],digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/v6',settings:formEngravingSettings({mode:'raster',mirror:true})})));
});

test('Bestellansicht: vier Knöpfe je Fläche, nur aktiv bei „fertig“ und vorhandener Datei; sonst ein verständlicher Hinweis',()=>{
 const all={jobId:'job_1',surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null},done={state:'fertig',reason:null,jobId:'job_1'};
 assert.deepEqual(Object.keys(ORDER_FILE_LABELS),[...ORDER_FORMATS]);
 assert.deepEqual(orderFileButtons(done,all),[{surface:'front',label:'',buttons:[{format:'pdf',label:'PDF',enabled:true},{format:'pdf-contour',label:'PDF mit Kontur',enabled:true},{format:'svg',label:'SVG',enabled:true},{format:'svg-contour',label:'SVG mit Kontur',enabled:true}]}]);
 assert.equal(orderFilesNote(done,all),'');
 for(const state of [{state:'wird erstellt'},{state:'bitte prüfen',reason:'Die Schrift fehlt.'},undefined]){assert.ok(orderFileButtons(state,all)[0].buttons.every(b=>!b.enabled));assert.match(orderFilesNote(state,all),/sobald die Fertigungsdatei fertig ist/);}
 // Ausgabe alter Art: keine Fläche mit Dateien → vier inaktive Knöpfe und der Hinweis des Servers, kein Fehler.
 const old={jobId:null,surfaces:[],pending:true,note:'Die vier Dateien werden für diese Position neu erstellt.'};
 assert.equal(orderFileButtons(done,old)[0].buttons.length,4);assert.ok(orderFileButtons(done,old)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(done,old),old.note);
 assert.ok(orderFileButtons(done,undefined)[0].buttons.every(b=>!b.enabled));
 const partial={...all,surfaces:[{id:'front',formats:['pdf','svg']}]};assert.deepEqual(orderFileButtons(done,partial)[0].buttons.map(b=>b.enabled),[true,false,true,false]);assert.match(orderFilesNote(done,partial),/neu erstellen/);
 const both={...all,surfaces:[{id:'front',formats:[...ORDER_FORMATS]},{id:'back',formats:[...ORDER_FORMATS]}]};assert.deepEqual(orderFileButtons(done,both).map(s=>[s.surface,s.label,s.buttons.length]),[['front','Vorderseite',4],['back','Rückseite',4]]);
 // Hinweis des Servers je Lage: wird neu erstellt | nicht baubar mit Grund | Formprodukt alter Art | nur Ausgabe alter Art | nichts.
 assert.match(missingOrderFilesNote({own:{status:'queued'},completed:1}),/werden für diese Position neu erstellt/);assert.match(missingOrderFilesNote({own:{status:'running'}}),/werden für diese Position gerade erstellt/);
 assert.equal(missingOrderFilesNote({own:{status:'failed',error:'Die gesicherte Schrift fehlt.'},completed:1}),'Die vier Dateien ließen sich für diese Position nicht erstellen: Die gesicherte Schrift fehlt.');
 assert.match(missingOrderFilesNote({own:{status:'completed'},completed:1}),/Formprodukt alter Art.*Ausgaben/);assert.match(missingOrderFilesNote({own:null,completed:1}),/enthält die vier Dateien nicht.*neu erstellen/);
 assert.equal(missingOrderFilesNote({own:null,completed:0}),null);assert.equal(missingOrderFilesNote(),null);
 const page=fs.readFileSync(new URL('./ui/orders.html',import.meta.url),'utf8');for(const id of ['order-files','order-file-rows','order-files-note'])assert.match(page,new RegExp('id="'+id+'"'));
});

test('Dateinachweis und Download: ohne Nachweis ein klarer Hinweis, bei falscher Prüfsumme der Fehler der bestehenden Downloads',async()=>{
 assert.deepEqual(orderFileSets({}),[]);assert.deepEqual(orderFileSets({orderFiles:{schema:'fremd',surfaces:[{id:'front',files:{}}]}}),[]);
 for(const format of ORDER_FORMATS)assert.throws(()=>orderDownload({metadata:{schema:'gravuru-acrylic-engraving-proof/v6',pdfSha256:'a'.repeat(64)},pdf:Buffer.from('%PDF-alt'),archive:Buffer.alloc(0)},format),{status:409,code:'order_file_missing',message:ORDER_FILE_MISSING});
 assert.throws(()=>orderDownload({metadata:{}},'zip'),{status:422,code:'print_delivery'});
 assert.throws(()=>svgWithContour('<svg></svg> <!-- x -->',{widthMm:1,contours:[]},{stroke:'#000000'}),/nicht mit Kontur/);assert.throws(()=>svgWithContour('<svg></svg>',{widthMm:1,contours:[]},{stroke:'red'}),/nicht mit Kontur/);
});

// Synthetische Druckdaten wie in print-delivery-vector.test.mjs: Kontur mit Bohrloch, zwei Schriftfelder.
const cutPath='0 0 m 20 0 l 20 30 l 0 30 l h\n4 4 m 6 4 l 6 6 l 4 6 l h',glyph=(x,y)=>`${x} ${y} m ${x+2} ${y} l ${x+2} ${y+3} l ${x} ${y+3} l h`;
function printInput(options){
 const width=20,height=30,alpha=new Uint8Array(width*height),rgb=new Uint8Array(width*height*3);
 return {settings:exportSettings({width,height},options),pixels:{width,height,rgb,alpha,whiteAlpha:alpha,whiteAllowed:new Uint8Array(width*height).fill(255)},paths:{cut:cutPath,color:cutPath,white:cutPath},artwork:[{type:'text',paths:[{path:glyph(2,10),rgb:[0,0,0]},{path:glyph(5,10),rgb:[0,0,0]}]},{type:'text',paths:[{path:glyph(10,20),rgb:[120,50,30]}]}]};
}
test('Druck: die Druckdatei bleibt Byte für Byte gleich; „PDF“ ist sie ohne Schnittlinie, „PDF mit Kontur“ mit der Schnittlinie als Haarlinie',async()=>{
 for(const profile of ['roland','mimaki'])for(const mirror of [false,true])for(const bleedMm of [0,1]){
  const options={profile,mirror,bleedMm},before=await printDelivery(printInput(options)),result=await printDelivery(printInput(options),{orderFiles:true}),label=JSON.stringify(options);
  assert.equal(before.order,undefined,'ohne Schalter entsteht nichts Neues');assert.deepEqual(result.pdf,before.pdf,label);assert.deepEqual(result.downloads,before.downloads,label);
  assert.equal(result.extras.length,before.extras.length);for(const [i,e] of result.extras.entries())assert.deepEqual(Buffer.from(await e.blob.arrayBuffer()),Buffer.from(await before.extras[i].blob.arrayBuffer()));
  const main=inspect(result.pdf),plain=inspect(result.order.pdf),contour=inspect(result.order.contour),page=[20+2*bleedMm,30+2*bleedMm];
  for(const info of [main,plain,contour]){assert.equal(info.repaired,false);assert.deepEqual([info.widthMm,info.heightMm],page,label);assert.equal(info.fonts,0);assert.equal(info.pages,1);}
  // Ohne Schnittlinie: keine Ebene, keine Sonderfarbe, keine Zeichnung der Kontur; Farbe und Weiß wie in der Druckdatei.
  assert.equal(plain.cutSpot,false);assert.ok(!plain.layers.includes('CutContour'));assert.equal(plain.whiteSpot,main.whiteSpot);assert.deepEqual(plain.layers,main.layers.filter(l=>l!=='CutContour'));
  assert.deepEqual(plain.drawings,main.drawings.filter(d=>d.layer!=='CutContour'),label);assert.deepEqual(plain.images,main.images);
  // Mit Kontur: derselbe Inhalt plus genau eine Schnittlinie der Breite 0 auf demselben Pfad wie in der Druckdatei (dort 0,05 mm).
  assert.equal(contour.cutSpot,true);assert.deepEqual(contour.layers,main.layers);assert.deepEqual(withoutLayer(contour,'CutContour'),plain.drawings.map(d=>({...d,layer:''})),label);
  const cut=contour.drawings.filter(d=>d.layer==='CutContour'),existing=main.drawings.filter(d=>d.layer==='CutContour');
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
 // Ohne Konturfarbe (Formprodukte alter Art) entsteht keine Datei „mit Kontur“; eine fremde Farbangabe wird abgelehnt.
 assert.equal((await run(vector,'vector',{contourStroke:undefined})).pdfContour,undefined);await assert.rejects(()=>run(vector,'vector',{contourStroke:'red'}),/Konturfarbe/);
});

test('Gravur: vier Dateien 1:1; ohne Fertigungsprofil Vektor ohne Foto und Raster 300 dpi mit Foto; Kontur als Haarlinie deckungsgleich',async()=>{
 const noPhoto=(await nativeBundle({engraving:true,photo:false})).bundle,withPhoto=(await nativeBundle({engraving:true,photo:true})).bundle;
 // Ohne Foto, gespiegelt wie über die Werkstatt (Acrylgravur von hinten): Regel → Vektor.
 const v=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mirror:true}),four=fourFiles(v);
 assert.deepEqual(v.metadata.settings,{mode:'vector',dpi:300,mirror:true});assert.deepEqual(v.metadata.modeRule.applied,'vector');assert.equal(v.metadata.pixelWidth,null);assert.equal(v.metadata.schema,ACRYLIC_ENGRAVING_RECIPE);
 assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,four[f].name])),{pdf:'technische-gravurpruefung.pdf','pdf-contour':'gravur-1zu1-mit-kontur.pdf',svg:'gravur-fertigung.svg','svg-contour':'gravur-1zu1-mit-kontur.svg'});
 assert.deepEqual(four.pdf.bytes,v.pdf);assert.equal(v.metadata.pdfSha256,digest(four.pdf.bytes));assert.equal(v.metadata.productionSvg[0].sha256,digest(four.svg.bytes));
 const plain=inspect(four.pdf.bytes),contour=inspect(four['pdf-contour'].bytes),separate=inspect(four.files.get('gravur-kontur-1zu1.pdf'));
 for(const info of [plain,contour,separate]){assert.deepEqual([info.widthMm,info.heightMm],[150,200]);assert.equal(info.fonts,0);assert.equal(info.images.length,0);assert.equal(info.pages,1);}
 assert.ok(plain.drawings.length>1);assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings,'derselbe Inhalt wie ohne Kontur');
 const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0,'Haarlinie: Breite 0');assert.deepEqual(line[0].color,[0,0,0]);assert.equal(line[0].fill,null);
 assert.equal(separate.drawings.length,1);assert.deepEqual(line[0].points,separate.drawings[0].points,'deckungsgleich mit gravur-kontur-1zu1.pdf');assert.deepEqual(line[0].rect,separate.drawings[0].rect);
 assert.equal(v.metadata.contourSha256,digest(four.files.get('gravur-kontur-1zu1.pdf')));
 const artwork=JSON.parse(four.files.get('gravurpruefung.json'));assert.deepEqual(artwork.orderFiles,v.metadata.orderFiles);
 // Die Kontur der SVG ist die gesicherte Geometrie des Prüfstands (unabhängig gelesen), gespiegelt wie die Gravur.
 const {geometry}=await acrylicArtwork(noPhoto.package,noPhoto.manifest.packageSha256,{engraving:true});assert.deepEqual([geometry.widthMm,geometry.heightMm],[150,200]);
 checkSvg(four,{widthMm:150,heightMm:200,geometry,stroke:'#000000',mirror:true});
 // Mit Foto: Regel → Raster 300 dpi; „mit Kontur“ trägt dasselbe Graustufenbild und darüber die Haarlinie.
 const r=await createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256),photo=fourFiles(r);
 assert.deepEqual(r.metadata.settings,{mode:'raster',dpi:300,mirror:false});assert.equal(r.metadata.modeRule.applied,'raster');assert.equal(r.metadata.pixelWidth,Math.ceil(150*300/25.4));assert.equal(r.metadata.pixelHeight,Math.ceil(200*300/25.4));
 const rp=inspect(photo.pdf.bytes),rc=inspect(photo['pdf-contour'].bytes);assert.deepEqual(rp.images.map(i=>[i.colorSpace,i.width,i.height]),[['DeviceGray',1772,2363]]);assert.deepEqual(rc.images,rp.images);
 assert.deepEqual([rc.widthMm,rc.heightMm],[150,200]);assert.equal(rp.drawings.length,0);assert.deepEqual(rc.drawings.map(d=>[d.layer,d.width,d.type]),[['Kontur',0,'s']]);
 assert.deepEqual(rc.drawings[0].points,inspect(photo.files.get('gravur-kontur-1zu1.pdf')).drawings[0].points);
 checkSvg(photo,{widthMm:150,heightMm:200,geometry,stroke:'#000000'});
 // Eine ausdrückliche Wahl gilt unverändert: Raster ohne Foto bleibt Raster, Vektor mit Foto wird weiter abgelehnt.
 const explicit=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mode:'raster'});assert.deepEqual(explicit.metadata.settings,{mode:'raster',dpi:300,mirror:false});assert.equal(explicit.metadata.modeRule,undefined);
 assert.deepEqual(inspect(explicit.pdf).images.map(i=>i.colorSpace),['DeviceGray']);fourFiles(explicit);
 await assert.rejects(()=>createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
});

test('Druck: vier Dateien 1:1 für Roland und Mimaki; „PDF“ ohne Schnittlinie mit Farbe und Weiß, Kontur als Haarlinie deckungsgleich mit der Druckdatei',async()=>{
 const {bundle}=await nativeBundle({engraving:false,photo:true});
 for(const settings of [{mirror:true},{profile:'mimaki'}]){
  const result=await createAcrylicPrintProof(bundle.package,bundle.manifest.packageSha256,settings),four=fourFiles(result),mimaki=settings.profile==='mimaki',label=JSON.stringify(settings);
  assert.equal(result.metadata.schema,'gravuru-acrylic-print-proof/v8');
  assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,four[f].name])),{pdf:'druck-1zu1-ohne-schnittlinie.pdf','pdf-contour':'druck-1zu1-mit-kontur.pdf',svg:'gesicherte-gestaltung.svg','svg-contour':'druck-1zu1-mit-kontur.svg'});
  // Die Druckdatei der „Ausgaben“ bleibt die bisherige Datei mit ihrem Dateinachweis.
  const mainName=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'technische-druckpruefung.pdf';assert.deepEqual(four.files.get(mainName),result.pdf);assert.equal(result.metadata.downloads.pdf.sha256,digest(result.pdf));assert.equal(result.metadata.pdfSha256,digest(result.pdf));
  const main=inspect(result.pdf),plain=inspect(four.pdf.bytes),contour=inspect(four['pdf-contour'].bytes);
  for(const info of [main,plain,contour]){assert.deepEqual([info.widthMm,info.heightMm],[150,200],label);assert.equal(info.fonts,0);assert.equal(info.repaired,false);}
  assert.ok(main.images.length>0,'Foto als Bildebene');assert.deepEqual(plain.images,main.images);assert.deepEqual(contour.images,main.images);
  assert.equal(plain.cutSpot,false);assert.deepEqual(plain.layers,main.layers.filter(l=>l!=='CutContour'));assert.deepEqual(plain.drawings,main.drawings.filter(d=>d.layer!=='CutContour'),label);
  // Annahme (b): Roland führt Farbe und Weiß in der Druckdatei, also auch „PDF“; bei Mimaki bleibt Weiß die eigene Datei.
  assert.equal(plain.whiteSpot,!mimaki);assert.equal(plain.layers.includes('RDG_WHITE'),!mimaki);if(mimaki)assert.ok(four.files.has('Mimaki-NUR-RDG_WHITE.pdf'));
  assert.deepEqual(withoutLayer(contour,'CutContour'),plain.drawings.map(d=>({...d,layer:''})),label);
  const cut=contour.drawings.filter(d=>d.layer==='CutContour'),existing=main.drawings.filter(d=>d.layer==='CutContour');
  assert.equal(cut.length,1);assert.equal(cut[0].width,0);assert.deepEqual(cut[0].points,existing[0].points,'deckungsgleich mit der Schnittlinie der Druckdatei');assert.deepEqual(cut[0].rect,existing[0].rect);
  // SVG: die gesicherte Gestaltung wie bisher (nicht gespiegelt) und dieselbe Datei mit Kontur.
  const {geometry}=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);assert.deepEqual([geometry.widthMm,geometry.heightMm],[150,200]);
  checkSvg(four,{widthMm:150,heightMm:200,geometry,stroke:'#000000'});
  assert.deepEqual(JSON.parse(four.files.get('druckpruefung.json')).orderFiles,result.metadata.orderFiles);
 }
});

test('Funkklingel zweischichtig: „mit Kontur“ zeigt die Acrylauflage (sie trägt die Gestaltung) als rote Haarlinie; die Schnittdateien bleiben getrennt',async()=>{
 const fixture=doorbellFixture(),decoration=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="1mm" viewBox="0 0 30 1"><path d="M.5 .5L29.5 .5" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>'),hash=digest(decoration);
 fixture.localResources.motifs.push({key:'artwork-'+hash,bounds:[0,0,30,1],svgFragment:artworkFragment(hash,30,1),embeddedOnly:true,vectorOnly:true,artwork:{schema:'gravuru-imported-artwork/v1',assetId:hash,sourceSha256:hash,previewSha256:hash,format:'svg',page:1,pageCount:1,widthMm:30,heightMm:1}});
 for(const p of [fixture.profile,...fixture.doorbell.formats.map(f=>f.profile)])p.designs[0].objects.find(o=>o.id==='mark-0').motif='artwork-'+hash;
 const document=makeProductDocument(fixture),config=document.config,record={id:config.profile.id,revision:1,document},selection={format:'35x18',frame:'FK-VERDECKT',color:'schwarz',mounting:'B04S',position:'opposite'},source=selectedProfile(config,selection).designs[0];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
 const bundle=await prepareAcrylicReview({record,config,input:{productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:selection,quantity:1,media:[],preview:png.toString('base64')},assets:{get:()=>({format:'svg'}),read:()=>decoration},preparePhoto:async()=>({original:png,preview:png,width:40,height:60})});
 const frozen=JSON.parse(readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('funkklingel-fertigung.json'));
 for(const mirror of [false,true]){
  const result=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror}),four=fourFiles(result),label='gespiegelt: '+mirror;
  assert.equal(result.metadata.settings.mode,'vector','ohne Foto und ohne Rasterbild: Vektor');assert.equal(result.metadata.layered.cutMirror,false);
  const plain=inspect(four.pdf.bytes),contour=inspect(four['pdf-contour'].bytes),acrylic=inspect(four.files.get('acrylauflage-schnitt-1zu1.pdf')),steel=inspect(four.files.get('edelstahltraeger-schnitt-1zu1.pdf'));
  for(const info of [plain,contour,acrylic,steel])assert.deepEqual([info.widthMm,info.heightMm],[350,180],label);
  assert.deepEqual(withoutLayer(contour,'Kontur'),plain.drawings,label);
  const line=contour.drawings.filter(d=>d.layer==='Kontur');assert.equal(line.length,1);assert.equal(line[0].width,0);assert.deepEqual(line[0].color,[1,0,0],'rot wie die Schnittdatei der Acrylauflage');
  // Deckungsgleich mit der Schnittdatei der Acrylauflage – in der Ausrichtung der Gravur (die Schnittdateien werden nie gespiegelt).
  const cut=points(acrylic.drawings),carrier=points(steel.drawings);
  samePoints(points(line),mirror?mirrored(cut,350):cut,label);
  assert.notDeepEqual(cut,carrier,'der Edelstahlträger ist ein anderes Teil und bleibt getrennt');
  const a=frozen.acrylicBoundsMm,outer=mirror?[350-a.x-a.width,a.y,350-a.x,a.y+a.height]:[a.x,a.y,a.x+a.width,a.y+a.height];
  for(const [i,v] of outer.entries())assert.ok(Math.abs(line[0].rect[i]-v)<=.02,label+' Außenmaß der Acrylauflage');
  for(const name of ['edelstahltraeger-schnitt-1zu1.pdf','acrylauflage-schnitt-1zu1.pdf','edelstahltraeger-schnitt.svg','acrylauflage-schnitt.svg','gravur-kontur-1zu1.pdf'])assert.ok(four.files.has(name),name);
  assert.equal(four.files.get('acrylauflage-schnitt.svg').toString(),frozen.acrylic.svg);assert.equal(four.files.get('edelstahltraeger-schnitt.svg').toString(),frozen.steel.svg);
  checkSvg(four,{widthMm:350,heightMm:180,geometry:frozen.geometry,stroke:'#ff0000',mirror});
 }
});

// Werkstatt wie im Büro: Händlersitzung und CSRF. Eine bezahlte Testbestellung je Prüfstand; der Auftrag entsteht mit dem Eingang.
test('Download der Bestellposition: nur angemeldet und mit CSRF, vier Formate mit geprüfter Prüfsumme; Ausgabe alter Art → Hinweis und Neuaufbau',async t=>{
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
 const early=await call(route(first),{format:'pdf'});assert.equal(early.status,409);assert.equal(early.json.error.code,'order_file_missing');assert.match(early.json.error.message,/werden für diese Position gerade erstellt/);
 await w.exportWorker.wait(job.id);
 const proof=w.customerDrafts.printProof(first.snapshotId,job.recipeKey),files=unpack(proof);assert.equal(proof.metadata.settings.mode,'vector');
 const ready=await outputs(first);assert.deepEqual(ready.outputState,{state:'fertig',reason:null,jobId:job.id});
 assert.deepEqual(ready.downloads,{jobId:job.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});assert.equal(ready.total,1);
 // Nur angemeldet, nur mit CSRF, nur per POST, nur die vier Formate.
 assert.equal((await call(route(first),{format:'pdf'},{auth:false})).status,401);assert.equal((await call(route(first),{format:'pdf'},{token:false})).status,403);
 assert.equal((await call(route(first))).status,405);assert.equal((await call(route(first),undefined,{auth:false})).status,401);
 for(const body of [{format:'zip'},{format:'white-pdf'},{},{format:'pdf',job:job.id},{format:'pdf',surface:'left'}])assert.equal((await call(route(first),body)).status,422,JSON.stringify(body));
 assert.equal((await call('/api/workshop/orders/orderline_00000000-0000-4000-8000-000000000000/download',{format:'pdf'})).status,404);
 const expected={pdf:['technische-gravurpruefung.pdf','application/pdf'],'pdf-contour':['gravur-1zu1-mit-kontur.pdf','application/pdf'],svg:['gravur-fertigung.svg','image/svg+xml'],'svg-contour':['gravur-1zu1-mit-kontur.svg','image/svg+xml']};
 for(const format of ORDER_FORMATS){
  const r=await call(route(first),{format}),[name,mime]=expected[format],descriptor=proof.metadata.orderFiles.surfaces[0].files[format];
  assert.equal(r.status,200,format);assert.equal(r.headers.get('content-type'),mime);assert.equal(r.headers.get('content-disposition'),'attachment; filename="'+job.id+'-'+name+'"');assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff');
  assert.deepEqual(r.bytes,files.get(name),format);assert.equal(digest(r.bytes),descriptor.sha256);assert.equal(r.headers.get('x-gravuru-file-sha256'),descriptor.sha256);
 }
 assert.deepEqual((await call(route(first),{format:'pdf'})).bytes,proof.pdf);
 assert.equal((await call(route(first),{format:'pdf',surface:'back'})).status,409,'keine Rückseite gestaltet');
 // Die bestehenden Ausgabe-Downloads bleiben unverändert.
 assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'pdf'})).bytes,proof.pdf);assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'zip'})).bytes,proof.archive);

 // 2. Ausgabe alter Art (Rezeptstand v6, ohne die neuen Dateien): bleibt gültig und abrufbar; die Position bekommt statt eines
 // Fehlers den Hinweis, und der Auftrag mit dem neuen Rezeptstand entsteht beim Öffnen der Ausgaben von selbst.
 const old=await position('Cd',{quiet:true}),oldSettings={mode:'raster',dpi:300,mirror:true},oldKey=digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings}));
 assert.equal(w.exportJobs.forSnapshot(old.snapshotId).total,0);
 w.customerDrafts.savePrintProof(old.snapshotId,oldKey,{metadata:{schema:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings,pdfSha256:digest(Buffer.from('%PDF-alt')),warnings:[]},pdf:Buffer.from('%PDF-alt'),archive:Buffer.from('altes Paket')});
 const oldJob=w.exportJobs.enqueue({snapshotId:old.snapshotId,recipeKey:oldKey,recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings});assert.equal(oldJob.status,'completed');
 assert.deepEqual(w.orderOutputState(old),{state:'fertig',reason:null,jobId:oldJob.id});
 const missing=await call(route(old),{format:'pdf-contour'});assert.equal(missing.status,409);assert.equal(missing.json.error.code,'order_file_missing');assert.match(missing.json.error.message,/enthält die vier Dateien nicht.*neu erstellen/);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'),'die alte Ausgabe bleibt abrufbar');
 const opened=await outputs(old);assert.equal(opened.total,2);assert.equal(opened.outputState.state,'fertig');
 assert.deepEqual(opened.downloads,{jobId:null,formats:[...ORDER_FORMATS],surfaces:[],pending:true,note:'Die vier Dateien werden für diese Position neu erstellt.'});
 assert.ok(orderFileButtons(opened.outputState,opened.downloads)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(opened.outputState,opened.downloads),opened.downloads.note);
 const rebuilt=opened.jobs.find(j=>j.id!==oldJob.id);assert.equal(rebuilt.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal((await outputs(old)).total,2,'wiederholtes Öffnen legt nichts doppelt an');
 await w.exportWorker.wait(rebuilt.id);
 const renewed=await outputs(old);assert.deepEqual(renewed.downloads,{jobId:rebuilt.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
 assert.ok(orderFileButtons(renewed.outputState,renewed.downloads)[0].buttons.every(b=>b.enabled));
 const fresh=await call(route(old),{format:'pdf-contour'});assert.equal(fresh.status,200);assert.equal(inspect(fresh.bytes).drawings.filter(d=>d.layer==='Kontur')[0].width,0);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'));

 // 3. Falsche Prüfsumme: Der Dateinachweis des Auftrags passt nicht zu den Bytes im Paket → Fehler wie bei der Weißdatei, keine Datei.
 const tampered=await position('Ef',{quiet:true}),metadata=structuredClone(proof.metadata);metadata.orderFiles.surfaces[0].files['pdf-contour'].sha256='0'.repeat(64);
 w.customerDrafts.savePrintProof(tampered.snapshotId,job.recipeKey,{metadata,pdf:proof.pdf,archive:proof.archive});
 const checked=await outputs(tampered);assert.equal(checked.outputState.state,'fertig');assert.equal(checked.total,1);
 const wrong=await call(route(tampered),{format:'pdf-contour'});assert.equal(wrong.status,422);assert.equal(wrong.json.error.code,'print_delivery');assert.match(wrong.json.error.message,/unvollständig oder verändert/);
 assert.ok(!wrong.bytes.includes('%PDF-'));assert.equal((await call(route(tampered),{format:'svg'})).status,200,'die übrigen Dateien mit passendem Nachweis bleiben abrufbar');
 // Verändertes Paket: dieselbe Antwort wie bei den bestehenden Downloads aus dem Paket.
 const broken=await position('Gh',{quiet:true}),archive=Buffer.from(proof.archive);archive[archive.indexOf('gravur-1zu1-mit-kontur.svg')+60]^=1;
 w.customerDrafts.savePrintProof(broken.snapshotId,job.recipeKey,{metadata:proof.metadata,pdf:proof.pdf,archive});await outputs(broken);
 const damaged=await call(route(broken),{format:'svg-contour'});assert.equal(damaged.status,422);assert.match(damaged.json.error.message,/Ausgabepaket ist unvollständig oder verändert/);
});
