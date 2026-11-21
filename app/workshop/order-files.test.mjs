// #265 Stufe B (ENTSCHEIDUNGEN 3.61 und 3.62): zwei Downloads je Bestellposition – PDF und SVG, immer mit Kontur, nie gespiegelt,
// im Aufbau der Musterdatei von Chris vom 21.11.2026 (test-fixtures/musterdatei-gravur-chris-20261121.pdf, „so müssen die dateien
// aussehen“) – für jede Produktart (native Produkte und Formprodukte alter Art). Gravur: Inhalt in der Ebene „03 Gravur“ in reinem
// Schwarz; blaue Linie = Kontur zum Anlegen, rote Linie = Schnitt nach der Gravur (Löcher bei Acrylglas); Druck: jede Kontur in der
// Roland-Schmuckfarbe `CutContour`. Alle Linien 0,001 mm.
// Alle Daten sind synthetisch oder stammen aus den Testvorlagen des Repos; keine Kundendaten.
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
import {exportSettings,printPDF} from '../configurator/variant-m/print-export-model.mjs';
import {selectedProfile,prepareConfig} from '../configurator/variant-m/contract.mjs';
import {artworkFragment} from '../configurator/variant-m/artwork-resource.mjs';
import {createWorkshop} from './http.mjs';
import {makeProductDocument} from './product-model.mjs';
import {familyProductConfig} from './product-families.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {importEnvironment} from './design-assets.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {FORM_ENGRAVING_RECIPE,formEngravingKey,formEngravingSettings,renderEngraving,createFormEngravingProof} from './form-engraving-proof.mjs';
import {FORM_PRINT_RECIPE,formPrintKey,formPrintSettings,createFormPrintProof} from './form-print-proof.mjs';
import {ACRYLIC_ENGRAVING_RECIPE,acrylicEngravingKey,acrylicEngravingSettings,createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {ACRYLIC_PRINT_RECIPE,acrylicPrintKey,createAcrylicPrintProof} from './acrylic-print-proof.mjs';
import {printDelivery,orderDownload,orderFileSets,printSvgWithContour,withOrderCutLine,orderHoleLines,orderPlate,orderEngravingFiles,ORDER_HOLES_ACRYLIC,ORDER_HOLES_OTHER,ORDER_LINE_MM,CUT_CONTOUR_RGB,ORDER_FORMATS,ORDER_FILES_SCHEMA,ORDER_FILE_MISSING,ORDER_FORMAT_REQUIRED} from './print-delivery.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {orderFileButtons,orderFilesNote,ORDER_FILE_LABELS} from './ui/order-store-context.mjs';
import {missingOrderFilesNote} from './cross-store-orders.mjs';
import {makeFormProduct} from './form-product.mjs';
import {addFormDesign} from './form-designs.mjs';
import {initialFormCustomerState} from './form-customer-model.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {prepareFormReview} from './form-review-snapshot.mjs';

const python=process.env.GRAVURU_PYTHON||'python3';
// Liest eine PDF maßlich: Seitenmaß in mm, Bilder (Farbraum, Prüfsumme der Pixel und ihres Spiegelbilds, Bindung an eine Ebene), Ebenen,
// ob das Endformat (TrimBox) ausdrücklich gesetzt und gleich der Seite ist, jede Zeichnung in Zeichenreihenfolge mit Linienbreite,
// Farbe, Ebene, Rahmen und der Menge ihrer Stützpunkte in mm, dazu jede
// Angabe einer Linienfarbe im Seiteninhalt (`strokes`) – daran ist zu sehen, ob eine Linie in einer druckenden Farbe steht.
const INSPECT=`import sys,json,hashlib,re,numpy as np,pymupdf as f
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
 pix=f.Pixmap(p,i[0]);a=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.stride)[:,:pix.width*pix.n].reshape(pix.height,pix.width,pix.n)
 images.append({'colorSpace':i[5],'width':pix.width,'height':pix.height,'sha256':hashlib.sha256(a.tobytes()).hexdigest(),'mirroredSha256':hashlib.sha256(a[:,::-1].tobytes()).hexdigest(),'layered':'/OC' in p.xref_object(i[0])})
objects='\\n'.join(p.xref_object(i) for i in range(1,p.xref_length()))
content=b'\\n'.join(p.xref_stream(i) for i in range(1,p.xref_length()) if p.xref_is_stream(i) and '/Image' not in p.xref_object(i) and ('/Form' in p.xref_object(i) or i in page.get_contents()))
strokes=sorted(set(' '.join(m.decode().split()) for m in re.findall(rb'(?:(?:\\d*\\.?\\d+)\\s+){1,4}(?:RG|K|G)\\b|/\\w+\\s+CS\\s+(?:\\d*\\.?\\d+\\s+)+SCN',content)))
print(json.dumps({'pages':len(p),'repaired':p.is_repaired,'widthMm':round(page.rect.width/k,3),'heightMm':round(page.rect.height/k,3),'trimIsMedia':'/TrimBox' in p.xref_object(page.xref) and [round(v,2) for v in page.trimbox]==[round(v,2) for v in page.mediabox],'images':images,'fonts':len(page.get_fonts()),'layers':[o['name'] for o in (p.get_ocgs() or {}).values()],'cutSpot':'/CutContour' in objects,'whiteSpot':'/RDG_WHITE' in objects,'strokes':strokes,
 'drawings':[{'type':d['type'],'width':d.get('width'),'color':d.get('color'),'fill':d.get('fill'),'layer':d.get('layer') or '','rect':[r(v) for v in d['rect']],'points':pts(d)} for d in page.get_drawings()]}))`;
const inspect=bytes=>{assert.equal(bytes.subarray(0,5).toString(),'%PDF-');return JSON.parse(execFileSync(python,['-c',INSPECT],{input:bytes,env:importEnvironment(),maxBuffer:64*1024*1024}).toString());};
const unpack=result=>readReviewPackage(result.archive,digest(result.archive),[...NATIVE_REVIEW_SCHEMAS,'gravuru-form-review/v1']).files;
const points=drawings=>[...new Set(drawings.flatMap(d=>d.points.map(p=>p.join(' '))))].sort();
const mirrored=(list,widthMm)=>[...new Set(list.map(p=>{const [x,y]=p.split(' ').map(Number);return Number((widthMm-x).toFixed(2))+' '+y;}))].sort();
// Nachbarpunkte dürfen um die Rundung (0,01 mm) abweichen; verglichen wird Punkt für Punkt in sortierter Reihenfolge.
const samePoints=(a,b,message)=>{assert.equal(a.length,b.length,message);const xy=list=>list.map(p=>p.split(' ').map(Number)).sort((p,q)=>p[0]-q[0]||p[1]-q[1]);const x=xy(a),y=xy(b);for(let i=0;i<x.length;i++)assert.ok(Math.abs(x[i][0]-y[i][0])<=.02&&Math.abs(x[i][1]-y[i][1])<=.02,message+' '+a[i]+' / '+b[i]);};
const withoutLayer=(info,layer)=>info.drawings.filter(d=>d.layer!==layer).map(d=>({...d,layer:''}));
const MM=72/25.4,LAYER='03 Gravur',BLACK=[0,0,0],WHITE=[1,1,1],BLUE=[0,0,1],RED=[1,0,0],same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const isOrderLine=d=>Math.abs(d.width/MM-ORDER_LINE_MM)<2e-5;
// Die Musterdatei von Chris vom 21.11.2026 – der verbindliche Aufbau jeder Gravur-Bestelldatei.
const REFERENCE=fs.readFileSync(new URL('./test-fixtures/musterdatei-gravur-chris-20261121.pdf',import.meta.url));
// Gravur-PDF der Bestellansicht im Aufbau der Musterdatei. `holes`: 'none' (die Platte hat keine Innenkontur), 'cut' (rot),
// 'contour' (blau) oder 'omit' (nicht gezeichnet). Dieselbe Prüfung besteht die Musterdatei selbst.
function checkEngravingPdf(info,{widthMm,heightMm,holes,raster=false,outer=[0,0,widthMm,heightMm]},label=''){
 assert.equal(info.pages,1,label);assert.equal(info.repaired,false,label);assert.deepEqual([info.widthMm,info.heightMm],[widthMm,heightMm],label+' Seite = Plattenmaß');assert.equal(info.trimIsMedia,true,label+' Endformat ausdrücklich = Seite');assert.equal(info.fonts,0,label+' keine Schriften');
 assert.deepEqual(info.layers,[LAYER],label+' genau eine Ebene');
 const content=info.drawings.filter(d=>d.layer===LAYER),lines=info.drawings.filter(d=>d.layer!==LAYER);
 assert.deepEqual(info.drawings.map(d=>d.layer),[...content.map(()=>LAYER),...lines.map(()=>'')],label+' erst die Ebene, danach die Konturen außerhalb jeder Ebene');
 if(raster){assert.equal(content.length,0,label);assert.deepEqual(info.images.map(i=>[i.colorSpace,i.layered]),[['DeviceGray',true]],label+' Graustufenbild in der Ebene');}
 else{
  assert.equal(info.images.length,0,label+' keine Bilder');assert.ok(content.length>0,label);
  for(const d of content){if(d.fill)assert.ok(same(d.fill,BLACK)||same(d.fill,WHITE),label+' Fläche reines Schwarz: '+d.fill);if(d.color)assert.ok(same(d.color,BLACK)||same(d.color,WHITE),label+' Linie reines Schwarz: '+d.color);}
 }
 for(const d of lines){assert.equal(d.type,'s',label);assert.equal(d.fill,null,label);assert.ok(isOrderLine(d),label+' Linie 0,001 mm, ist '+d.width/MM);}
 assert.ok(lines.length>=1,label);assert.deepEqual(lines[0].color,BLUE,label+' Außenkontur reines Blau');assert.ok(lines[0].rect.every((v,i)=>Math.abs(v-outer[i])<=.02),label+' Außenkontur = Plattenmaß: '+lines[0].rect);
 const inner=lines.slice(1);
 if(holes==='none'||holes==='omit')assert.equal(inner.length,0,label+' keine Innenkontur gezeichnet');
 else{assert.ok(inner.length>=1,label+' Innenkonturen gezeichnet');for(const d of inner)assert.deepEqual(d.color,holes==='cut'?RED:BLUE,label+' Innenkontur '+(holes==='cut'?'rot (Schnitt)':'blau (Anlegen)'));}
 assert.deepEqual(info.strokes.filter(s=>!/^0 0 0 RG$|^0 G$/.test(s)).sort(),[...new Set(lines.map(d=>d.color.join(' ')+' RG'))].sort(),label+' außer Schwarz nur die Konturfarben');
 return {content,lines};
}
// Gravur-SVG der Bestellansicht: Gestaltung in der Gruppe „03 Gravur“, danach die Konturgruppen – seitenrichtig, in Millimetern.
// `plate`: die Platte ist kleiner als das Format der Gestaltung (Acrylauflage der Funkklingel) – Seite = Platte, die Gruppen
// behalten die Koordinaten des Formats und sind als Ganzes an den Ursprung der Platte geschoben.
function checkEngravingSvg(svg,{widthMm,heightMm,geometry,holes,plate=null},label=''){
 const text=svg.toString(),root=text.match(/^<svg [^>]*>/)[0],shift=plate?' transform="translate('+(-plate.x||0)+' '+(-plate.y||0)+')"':'',page=plate?[plate.width,plate.height]:[widthMm,heightMm];
 for(const attribute of ['width="'+page[0]+'mm"','height="'+page[1]+'mm"','viewBox="0 0 '+page[0]+' '+page[1]+'"','xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"'])assert.ok(root.includes(attribute),label+' '+attribute);
 const open='<g id="gravur" data-layer="03 Gravur" inkscape:groupmode="layer" inkscape:label="03 Gravur"'+shift+'>';
 assert.ok(text.startsWith(root+open),label+' Gestaltung in der Gruppe „03 Gravur“');assert.equal(text.split('id="gravur"').length,2,label);
 assert.ok(!text.startsWith(root+open+'<g transform="translate('+widthMm+' 0) scale(-1 1)">'),label+' nicht gespiegelt');
 const outer='<g id="aussenkontur" data-layer="Außenkontur (Anlegen)" fill="none" stroke="#0000ff" stroke-width="0.001"'+shift+'><path d="'+geometry.contours[0].d+' Z" /></g>';
 const inner=geometry.contours.slice(1).map(c=>c.d+' Z').join(' '),rule={cut:['ausschnitte','Ausschnitte (Schnitt)','#ff0000'],contour:['innenkonturen','Innenkonturen (Anlegen)','#0000ff']}[holes];
 const innerGroup=rule?'<g id="'+rule[0]+'" data-layer="'+rule[1]+'" fill="none" stroke="'+rule[2]+'" stroke-width="0.001"'+shift+'><path d="'+inner+'" /></g>':'';
 if(rule)assert.ok(geometry.contours.length>1,label+' Prüffall mit Innenkontur');if(holes==='none')assert.equal(geometry.contours.length,1,label);
 assert.ok(text.endsWith('</g>'+outer+innerGroup+'</svg>'),label+' Konturgruppen nach der Gestaltung: '+text.slice(-260));
 for(const id of ['aussenkontur','ausschnitte','innenkonturen','kontur','CutContour'])assert.equal(text.split('id="'+id+'"').length-1,id==='aussenkontur'||id===rule?.[0]?1:0,label+' '+id);
 // Inhalt der Gruppe = alles zwischen ihrem Anfang und der Außenkontur.
 return text.slice((root+open).length,text.length-('</g>'+outer+innerGroup+'</svg>').length);
}
const svgInner=svg=>{const text=svg.toString(),root=text.match(/^<svg [^>]*>/)[0];assert.ok(text.endsWith('</svg>'));return text.slice(root.length,-6);};
// Druck-PDF der Bestellansicht: jede Linie steht in der Schmuckfarbe `CutContour` (eine normale Farbe würde mitgedruckt –
// Chris, 21.11.2026, 17:18 Uhr), Breite 0,001 mm; kein Blau, kein Rot, keine Ebene der Gravur.
function checkPrintPdf(info,{widthMm,heightMm,white},label=''){
 assert.equal(info.pages,1,label);assert.equal(info.repaired,false,label);assert.deepEqual([info.widthMm,info.heightMm],[widthMm,heightMm],label);assert.equal(info.fonts,0,label);
 assert.equal(info.cutSpot,true,label+' Schmuckfarbe CutContour');assert.equal(info.whiteSpot,white,label+' RDG_WHITE');
 assert.deepEqual(info.layers,white?['Farbmotiv','RDG_WHITE','CutContour']:['Farbmotiv','CutContour'],label+' Ebenen: erst Farbe, dann Weiß, dann Schnittkontur');
 assert.deepEqual(info.strokes,['/Cut CS 1 SCN'],label+' einzige Linienfarbe ist die Schmuckfarbe');
 const stroked=info.drawings.filter(d=>d.type!=='f');assert.equal(stroked.length,1,label+' genau eine Kontur');
 assert.equal(stroked[0].layer,'CutContour',label);assert.equal(stroked[0].type,'s',label);assert.equal(stroked[0].fill,null,label);assert.ok(isOrderLine(stroked[0]),label+' Linie 0,001 mm');
 for(const d of info.drawings)for(const rgb of [d.color,d.fill])if(rgb&&d.layer==='CutContour')assert.ok(!same(rgb,BLUE)&&!same(rgb,RED),label+' kein Blau/Rot in der Kontur');
 return stroked[0];
}
// Druck-SVG: die gesicherte Gestaltung (`plain`) plus genau eine Gruppe `CutContour` mit allen Ringen der Form.
function checkPrintSvg(svg,{widthMm,heightMm,geometry,plain},label=''){
 const text=svg.toString();
 for(const source of [text,plain.toString()]){assert.match(source,new RegExp('^<svg [^>]*width="'+widthMm+'mm"'),label);assert.match(source,new RegExp('^<svg [^>]*height="'+heightMm+'mm"'),label);assert.match(source,new RegExp('^<svg [^>]*viewBox="0 0 '+widthMm+' '+heightMm+'"'),label);}
 const group='<g id="CutContour" data-layer="CutContour" fill="none" stroke="'+CUT_CONTOUR_RGB+'" stroke-width="0.001"><path d="'+geometry.contours.map(c=>c.d+' Z').join(' ')+'"/></g>';
 assert.equal(CUT_CONTOUR_RGB,'#ff00ff');assert.ok(text.endsWith(group+'</svg>'),label+' Schnittkontur als letzte Gruppe');assert.equal(text.replace(group,''),plain.toString(),label+' ohne die Kontur ist „SVG“ die gesicherte Gestaltung (seitenrichtig)');
 for(const id of ['aussenkontur','ausschnitte','innenkonturen','gravur','kontur'])assert.ok(!text.includes('id="'+id+'"'),label+' keine Gruppe der Gravurdatei: '+id);
 assert.doesNotMatch(group,/#0000ff|#ff0000/,label+' Blau und Rot nur in Gravurdateien');
}
// Die zwei Dateien einer Fläche samt Dateinachweis; jede liegt im Paket und stimmt mit ihrer Prüfsumme überein.
function twoFiles(result,surfaceId='front'){
 const files=unpack(result),sets=orderFileSets(result.metadata),set=sets.find(s=>s.id===surfaceId);
 assert.deepEqual([...ORDER_FORMATS],['pdf','svg']);assert.equal(result.metadata.orderFiles.schema,ORDER_FILES_SCHEMA);assert.equal(ORDER_FILES_SCHEMA,'gravuru-order-files/v3');
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
// Natives Produkt aus einer Katalogfamilie der Testvorlagen: Türschild 120 × 80 mm mit der Befestigung „zwei Bohrlöcher“ –
// `steel.json` (Edelstahl) bzw. `schwarz.json` (Acrylglas). So entsteht ein echtes Produkt mit Innenkonturen je Material.
async function familyBundle(file){
 const f=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/'+file,import.meta.url))),s=f.sizes.find(x=>x.widthMm===120&&x.heightMm===80&&x.mounting.some(m=>m.startsWith('B02')));assert.ok(s,file);
 const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))},config=prepareConfig(familyProductConfig(view,s,1)),p=config.profile;
 const group=p.optionGroups.find(g=>g.values.some(v=>v.holes?.length)),mounting=group.values.find(v=>v.holes?.length),selection=Object.fromEntries(p.optionGroups.map(g=>[g.id,g===group?mounting.id:g.defaultValueId]));
 const profile=selectedProfile(config,selection),source=profile.designs.find(d=>d.id===profile.defaultDesignId)||profile.designs[0],document=makeProductDocument(config),record={id:p.id,revision:1,document};
 const png='iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==';
 return prepareAcrylicReview({record,config:document.config,input:{productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:selection,quantity:1,media:[],preview:png},assets:{get:()=>null,read:()=>null}});
}
// Deckungsgleich: jeder Punkt der einen Menge hat einen Nachbarn der anderen innerhalb der Rundung (0,02 mm) – und umgekehrt.
function sameShape(a,b,message){
 const xy=list=>list.map(p=>p.split(' ').map(Number)),A=xy(a),B=xy(b);assert.ok(A.length>0&&B.length>0,message+' (leer)');
 for(const [from,to,side] of [[A,B,'→'],[B,A,'←']])for(const p of from)assert.ok(to.some(q=>Math.abs(p[0]-q[0])<=.02&&Math.abs(p[1]-q[1])<=.02),message+' '+side+' '+p.join(' '));
}
const near=(rect,expected)=>rect.every((v,i)=>Math.abs(v-expected[i])<=.02);
// Was beim Öffnen der Datei zu sehen ist: Fläche der roten Bildpunkte (Anzahl, Schwerpunkt in mm) und die Farbe an einzelnen Stellen.
const LOOK=`import sys,json,numpy as np,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');pix=p[0].get_pixmap(dpi=127,colorspace=f.csRGB,alpha=False);k=5
a=np.frombuffer(pix.samples,dtype=np.uint8).reshape(pix.height,pix.stride)[:,:pix.width*3].reshape(pix.height,pix.width,3).astype(int)
red=(a[:,:,0]>170)&(a[:,:,1]<100)&(a[:,:,2]<100);ys,xs=np.nonzero(red);n=int(red.sum())
print(json.dumps({'count':n,'xMm':round(float(xs.mean()+.5)/k,1) if n else None,'yMm':round(float(ys.mean()+.5)/k,1) if n else None,'points':[[int(v) for v in a[min(int(y*k),pix.height-1),min(int(x*k),pix.width-1)]] for x,y in json.loads(sys.argv[1])]}))`;
const look=(bytes,at=[])=>JSON.parse(execFileSync(python,['-c',LOOK,JSON.stringify(at)],{input:bytes,env:importEnvironment(),maxBuffer:64*1024*1024}).toString());

test('Musterdatei von Chris (21.11.2026): eine Ebene „03 Gravur“ in Schwarz, danach außerhalb jeder Ebene eine blaue und rote Linien von 0,001 mm; unsere Gravurdatei hat denselben Aufbau',async()=>{
 const reference=inspect(REFERENCE),{content,lines}=checkEngravingPdf(reference,{widthMm:160,heightMm:260,holes:'cut'},'Musterdatei');
 assert.ok(content.some(d=>d.type==='f'&&same(d.fill,BLACK)),'Gravur der Musterdatei: schwarze Vektorflächen');assert.ok(content.every(d=>same(d.fill||d.color,BLACK)&&(!d.fill||!d.color||same(d.color,BLACK))),'in der Ebene nur reines Schwarz');
 assert.deepEqual(lines.map(d=>d.color.join(' ')),['0 0 1',...Array(7).fill('1 0 0')],'eine blaue Außenkontur, danach sieben rote Schnitte');
 assert.equal(ORDER_LINE_MM,.001);for(const d of lines)assert.ok(Math.abs(d.width-.0028346)<2e-6,'Linienbreite der Musterdatei: 0,0028346 pt = 0,001 mm');
 // Derselbe Aufbau bei uns – am echten Produkt aus Acrylglas mit Bohrlöchern (Kennzeichen ohne Seitenmaß und Anzahl der Schnitte).
 const aufbau=info=>({layers:info.layers,trimIsMedia:info.trimIsMedia,fonts:info.fonts,images:info.images.length,pages:info.pages,order:[...new Set(info.drawings.map(d=>d.layer?'Ebene '+d.layer:'Linie '+d.color.join(' ')+' · '+(d.width/MM).toFixed(4)+' mm'))]});
 const bundle=await familyBundle('schwarz.json'),ours=inspect(twoFiles(await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror:true})).pdf.bytes);
 assert.deepEqual(aufbau(ours),aufbau(reference));
 assert.deepEqual(aufbau(reference).order,['Ebene 03 Gravur','Linie 0 0 1 · 0.0010 mm','Linie 1 0 0 · 0.0010 mm']);
});

test('Rezeptstände: neuer Stand und eigener Schlüssel bei allen vier Ausgaben (3.62); `auto` nur ohne Profil und ohne Wahl, das Profil und eine ausdrückliche Wahl gelten unverändert',()=>{
 assert.equal(ACRYLIC_ENGRAVING_RECIPE,'gravuru-acrylic-engraving-proof/v9');
 assert.deepEqual(acrylicEngravingSettings(undefined,{mirror:true}),{mode:'auto',dpi:300,mirror:true});
 assert.deepEqual(acrylicEngravingSettings(null),{mode:'auto',dpi:300,mirror:false});
 for(const mode of ['raster','vector'])assert.deepEqual(acrylicEngravingSettings(undefined,{mode,mirror:true}),formEngravingSettings({mode,mirror:true}));
 const profile={mode:'raster',dpi:600,mirror:true};
 assert.deepEqual(acrylicEngravingSettings(profile),formEngravingSettings(profile));assert.deepEqual(acrylicEngravingSettings(profile,{mirror:true}),formEngravingSettings(profile));
 assert.deepEqual(acrylicEngravingSettings({mode:'vector',dpi:300,mirror:false},{dpi:600}),{mode:'vector',dpi:600,mirror:false});
 assert.throws(()=>acrylicEngravingSettings(profile,{mode:'auto'}),/Gravureinstellungen/,'mit Profil gibt es keine Regel statt des Profils');
 assert.throws(()=>acrylicEngravingSettings(undefined,{mode:'auto',white:'full'}),/Gravureinstellungen/);assert.throws(()=>formEngravingSettings({mode:'auto'}),/Gravureinstellungen/,'Formprodukte alter Art kennen die Regel nicht');
 // Eigener Schlüssel je Wahl; Ausgaben früherer Rezeptstände behalten ihren Schlüssel und bleiben auf der Seite „Ausgaben“ abrufbar.
 const keys=['auto','raster','vector'].map(mode=>acrylicEngravingKey({mode,mirror:true}));assert.equal(new Set(keys).size,3);
 assert.equal(acrylicEngravingKey(acrylicEngravingSettings(undefined,{mirror:true})),keys[0]);
 const key=(recipe,settings)=>digest(JSON.stringify({recipe,settings}));
 assert.equal(keys[1],key('gravuru-acrylic-engraving-proof/v9',formEngravingSettings({mode:'raster',mirror:true})));
 for(const old of ['v6','v7','v8'])assert.notEqual(keys[1],key('gravuru-acrylic-engraving-proof/'+old,formEngravingSettings({mode:'raster',mirror:true})));
 // ENTSCHEIDUNGEN 3.62: neuer Rezeptstand bei allen vier Ausgaben – auch den Formprodukten alter Art –, jeweils mit eigenem Schlüssel.
 assert.equal(ACRYLIC_PRINT_RECIPE,'gravuru-acrylic-print-proof/v10');assert.equal(FORM_ENGRAVING_RECIPE,'gravuru-form-engraving-proof/v3');assert.equal(FORM_PRINT_RECIPE,'gravuru-form-print-proof/v7');
 assert.equal(acrylicPrintKey({}),key('gravuru-acrylic-print-proof/v10',formPrintSettings({})));for(const old of ['v8','v9'])assert.notEqual(acrylicPrintKey({}),key('gravuru-acrylic-print-proof/'+old,formPrintSettings({})));
 assert.equal(formEngravingKey({}),key('gravuru-form-engraving-proof/v3',formEngravingSettings({})));for(const old of ['v1','v2'])assert.notEqual(formEngravingKey({}),key('gravuru-form-engraving-proof/'+old,formEngravingSettings({})));
 assert.equal(formPrintKey({}),key('gravuru-form-print-proof/v7',formPrintSettings({})));for(const old of ['v5','v6'])assert.notEqual(formPrintKey({}),key('gravuru-form-print-proof/'+old,formPrintSettings({})));
});

test('Bestellansicht: zwei Knöpfe je Fläche – PDF und SVG –, nur aktiv bei „fertig“ und vorhandener Datei; sonst ein verständlicher Hinweis; der Hilfetext nennt die Regel je Verfahren',()=>{
 const all={jobId:'job_1',surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null},done={state:'fertig',reason:null,jobId:'job_1'};
 assert.deepEqual(Object.keys(ORDER_FILE_LABELS),[...ORDER_FORMATS]);
 assert.deepEqual(orderFileButtons(done,all),[{surface:'front',label:'',buttons:[{format:'pdf',label:'PDF',enabled:true},{format:'svg',label:'SVG',enabled:true}]}]);
 assert.equal(orderFilesNote(done,all),'');
 for(const state of [{state:'wird erstellt'},{state:'bitte prüfen',reason:'Die Schrift fehlt.'},undefined]){assert.ok(orderFileButtons(state,all)[0].buttons.every(b=>!b.enabled));assert.match(orderFilesNote(state,all),/^PDF und SVG sind aktiv, sobald die Fertigungsdatei fertig ist/);}
 // Ausgabe ohne heutigen Dateinachweis: keine Fläche mit Dateien → zwei inaktive Knöpfe und der Hinweis des Servers, kein Fehler.
 const old={jobId:null,surfaces:[],pending:true,note:'PDF und SVG werden für diese Position neu erstellt.'};
 assert.equal(orderFileButtons(done,old)[0].buttons.length,2);assert.ok(orderFileButtons(done,old)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(done,old),old.note);
 assert.ok(orderFileButtons(done,undefined)[0].buttons.every(b=>!b.enabled));
 const partial={...all,surfaces:[{id:'front',formats:['pdf']}]};assert.deepEqual(orderFileButtons(done,partial)[0].buttons.map(b=>b.enabled),[true,false]);assert.match(orderFilesNote(done,partial),/neu erstellen/);
 const both={...all,surfaces:[{id:'front',formats:[...ORDER_FORMATS]},{id:'back',formats:[...ORDER_FORMATS]}]};assert.deepEqual(orderFileButtons(done,both).map(s=>[s.surface,s.label,s.buttons.length]),[['front','Vorderseite',2],['back','Rückseite',2]]);
 // Einen eigenen Knopf „mit Kontur“ oder eine Datei ohne Kontur gibt es nicht – auch nicht, wenn eine Antwort die früheren Formate nennt.
 const former=orderFileButtons(done,{...all,surfaces:[{id:'front',formats:['pdf','pdf-contour','svg','svg-contour']}]})[0].buttons;assert.deepEqual(former.map(b=>[b.format,b.label]),[['pdf','PDF'],['svg','SVG']]);
 // Hinweis des Servers je Lage: wird neu erstellt | nicht baubar mit Grund | fertige Ausgabe ohne die heutigen Dateien | nichts.
 assert.equal(missingOrderFilesNote({own:{status:'queued'},completed:1}),'PDF und SVG werden für diese Position neu erstellt.');assert.equal(missingOrderFilesNote({own:{status:'running'}}),'PDF und SVG werden für diese Position gerade erstellt.');
 assert.equal(missingOrderFilesNote({own:{status:'failed',error:'Die gesicherte Schrift fehlt.'},completed:1}),'PDF und SVG ließen sich für diese Position nicht erstellen: Die gesicherte Schrift fehlt.');
 for(const own of [{status:'completed'},null]){const note=missingOrderFilesNote({own,completed:1});assert.equal(note,'Die gespeicherte Ausgabe dieser Position enthält PDF und SVG im heutigen Aufbau nicht. Bitte die Ausgabe für diese Position neu erstellen.');assert.doesNotMatch(note,/Formprodukt|vier/);}
 assert.equal(missingOrderFilesNote({own:null,completed:0}),null);assert.equal(missingOrderFilesNote(),null);
 const page=fs.readFileSync(new URL('./ui/orders.html',import.meta.url),'utf8');for(const id of ['order-files','order-file-rows','order-files-note'])assert.match(page,new RegExp('id="'+id+'"'));
 // Hilfetext: kurz und je Verfahren richtig (3.62) – nie gespiegelt; Gravur schwarz in „03 Gravur“, Anlegen blau, Löcher bei
 // Acrylglas rot; Druck alle Konturen in CutContour; Linien 0,001 mm. Die Aussagen der Stände davor stehen dort nicht mehr.
 const help=page.match(/<p class="help">(PDF und SVG in Originalgröße[^<]*)</)?.[1];
 assert.equal(help,'PDF und SVG in Originalgröße (1:1), nie gespiegelt. Gravur: schwarz in der Ebene „03 Gravur“, Kontur zum Anlegen blau, Löcher bei Acrylglas rot (Schnitt nach der Gravur). Druck: alle Konturen in der Roland-Schmuckfarbe CutContour (rosa). Konturlinien 0,001 mm.');
 assert.doesNotMatch(page,/Beide enthalten immer die Kontur als Haarlinie|„Mit Kontur“ enthält zusätzlich|gespiegelt wie die/);
});

test('Dateinachweis und Download: nur PDF und SVG; ohne den heutigen Nachweis – auch mit dem der Stände 3.57 und 3.61 – keine Datei, sondern ein klarer Hinweis',()=>{
 assert.deepEqual(orderFileSets({}),[]);assert.deepEqual(orderFileSets({orderFiles:{schema:'fremd',surfaces:[{id:'front',files:{}}]}}),[]);
 for(const format of ORDER_FORMATS)assert.throws(()=>orderDownload({metadata:{schema:'gravuru-acrylic-engraving-proof/v6',pdfSha256:'a'.repeat(64)},pdf:Buffer.from('%PDF-alt'),archive:Buffer.alloc(0)},format),{status:409,code:'order_file_missing',message:ORDER_FILE_MISSING});
 // Die früheren Formate („mit Kontur“ als eigene Wahl) und fremde Formate gibt es nicht.
 assert.equal(ORDER_FORMAT_REQUIRED,'Bitte PDF oder SVG auswählen.');
 for(const format of ['pdf-contour','svg-contour','zip','white-pdf',undefined])assert.throws(()=>orderDownload({metadata:{}},format),{status:422,code:'print_delivery',message:ORDER_FORMAT_REQUIRED});
 const sha='a'.repeat(64),files={pdf:{name:'gravur-1zu1-mit-kontur.pdf',sha256:sha},svg:{name:'gravur-1zu1-mit-kontur.svg',sha256:sha}};
 assert.equal(ORDER_FILES_SCHEMA,'gravuru-order-files/v3');assert.deepEqual(orderFileSets({orderFiles:{schema:ORDER_FILES_SCHEMA,surfaces:[{id:'front',files}]}}),[{id:'front',formats:['pdf','svg']}]);
 // Nachweise der Stände davor – v1: vier Dateien (3.57), v2: zwei Dateien (3.61) – nennen Dateien, die nach Profil gespiegelt sind
 // und die Kontur schwarz mit Breite 0 führen. Sie werden über die Bestellansicht nicht mehr abgegeben, auch nicht ersatzweise.
 for(const [schema,former] of [['gravuru-order-files/v1',{...files,'pdf-contour':files.pdf,'svg-contour':files.svg}],['gravuru-order-files/v2',files]]){
  const metadata={orderFiles:{schema,surfaces:[{id:'front',files:former}]}};assert.deepEqual(orderFileSets(metadata),[],schema);
  for(const format of ORDER_FORMATS)assert.throws(()=>orderDownload({metadata,pdf:Buffer.from('%PDF-alt'),archive:Buffer.alloc(0)},format),{status:409,code:'order_file_missing',message:ORDER_FILE_MISSING},schema);
 }
 // Ein heutiger Nachweis, der nur die früheren Schlüssel trägt, führt keine Datei; geerbte Eigenschaften zählen nicht.
 assert.deepEqual(orderFileSets({orderFiles:{schema:ORDER_FILES_SCHEMA,surfaces:[{id:'front',files:{'pdf-contour':files.pdf,'svg-contour':files.svg}}]}}),[{id:'front',formats:[]}]);
 assert.deepEqual(orderFileSets({orderFiles:{schema:ORDER_FILES_SCHEMA,surfaces:[{id:'front',files:Object.create(files)}]}}),[{id:'front',formats:[]}]);
});

test('Regel der Innenkonturen (Chris, 21.11.2026, 17:17 Uhr): rot nur bei Acrylglas – Material der Platte, nicht der Produktname; sonst blau (Annahme); an genau einer Stelle',()=>{
 const art=(material,doorbell=false)=>({manifest:{product:{name:'Acrylglas Edelstahl Schiefer Türschild',material}},...(doorbell?{doorbellLayers:{}}:{})});
 assert.deepEqual([ORDER_HOLES_ACRYLIC,ORDER_HOLES_OTHER],['cut','contour']);
 // Natives Produkt: `material.kind`; Formprodukt alter Art: `material.id` (FORM_MATERIALS führt Acrylglas als `acrylic-…`).
 for(const material of [{kind:'acrylic'},{kind:'acrylic',id:'acryl-3mm-schwarz'},{id:'acrylic-clear',thicknessMm:3,surfaceNotes:''},{id:'acrylic-anthracite'},{id:'acrylic-black'},{id:'acrylic-satin'}])assert.equal(orderHoleLines(art(material)),'cut',JSON.stringify(material));
 for(const material of [{kind:'steel'},{kind:'slate'},{kind:'wood'},{id:'steel',thicknessMm:1.5,surfaceNotes:''},{id:'slate'},{id:'oak'},{id:'leather'},{id:'acrylic'},{kind:'acrylic-like'},{kind:'steel',name:'Acrylglas-Optik'},undefined,null])assert.equal(orderHoleLines(art(material)),'contour',JSON.stringify(material));
 // Zweischichtige Funkklingel: Die Gestaltung trägt die Acrylauflage – ihre Ausschnitte werden nach der Gravur geschnitten.
 for(const material of [{kind:'steel'},{kind:'slate'},undefined])assert.equal(orderHoleLines(art(material,true)),'cut','Funkklingel '+JSON.stringify(material));
 assert.equal(orderHoleLines({}),'contour');assert.equal(orderHoleLines({manifest:null,doorbellLayers:null}),'contour');
 // Seite = Plattenmaß: sonst das ganze Format; bei der Funkklingel die Acrylauflage (Lage und Maß im gemeinsamen Format).
 const overlay={doorbellLayers:{acrylicBoundsMm:{x:0,y:10,width:160,height:260,thicknessMm:3}},manifest:{product:{material:{kind:'steel'}}}};
 assert.deepEqual(orderPlate(overlay),{x:0,y:10,width:160,height:260});assert.equal(orderPlate(art({kind:'acrylic'})),null);assert.equal(orderPlate({}),null);assert.equal(orderPlate({doorbellLayers:{}}),null);
 assert.deepEqual(orderEngravingFiles(overlay),{holes:'cut',plate:{x:0,y:10,width:160,height:260}});assert.deepEqual(orderEngravingFiles(art({kind:'acrylic'})),{holes:'cut'});assert.deepEqual(orderEngravingFiles(art({id:'slate'})),{holes:'contour'});
 // Die Regel steht nur in print-delivery.mjs: Die Ausgaben reichen ihr Ergebnis durch, der Worker zeichnet, was er bekommt.
 const read=name=>fs.readFileSync(new URL('./'+name,import.meta.url),'utf8');
 for(const name of ['acrylic-engraving-proof.mjs','form-engraving-proof.mjs']){const source=read(name);assert.match(source,/orderEngravingFiles\(/,name);assert.doesNotMatch(source,/'cut'|'contour'|'omit'|#0000ff|#ff0000/,name+' kennt weder die Rollen noch die Farben');}
 const worker=read('form-engraving-worker.py');assert.doesNotMatch(worker.replace(/^#.*$/gm,''),/acrylic|Acryl|material\b.*holes/,'der Worker entscheidet nicht nach Material');
 for(const name of ['acrylic-print-proof.mjs','form-print-proof.mjs','form-print-worker.py'])assert.doesNotMatch(read(name),/orderHoleLines|#0000ff|#ff0000|aussenkontur|03 Gravur/,name+': Blau und Rot nur in Gravurdateien');
});

// Synthetische Druckdaten wie in print-delivery-vector.test.mjs: Kontur mit Bohrloch (links oben), Schriftfelder, Farbe und Weiß nur
// in den linken acht Spalten – jede Spiegelung fällt auf. Wie der Druck-Worker (form-print-worker.py) liefert `printInput` bei
// gespiegeltem Profil die Pixelfelder zeilenweise gespiegelt; Pfade und Schrift bleiben seitenrichtig und werden in printPDF gespiegelt.
const cutPath='0 0 m 20 0 l 20 30 l 0 30 l h\n4 4 m 6 4 l 6 6 l 4 6 l h',glyph=(x,y)=>`${x} ${y} m ${x+2} ${y} l ${x+2} ${y+3} l ${x} ${y+3} l h`;
const flippedRows=(source,width,height,channels)=>{const out=new Uint8Array(source.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let c=0;c<channels;c++)out[(y*width+width-1-x)*channels+c]=source[(y*width+x)*channels+c];return out;};
function printInput(options,{artwork=true}={}){
 const width=20,height=30,alpha=new Uint8Array(width*height),rgb=new Uint8Array(width*height*3),whiteAlpha=new Uint8Array(width*height),whiteAllowed=new Uint8Array(width*height).fill(255);
 for(let y=0;y<height;y++)for(let x=0;x<8;x++){const i=y*width+x;alpha[i]=whiteAlpha[i]=255;rgb[i*3]=255;}
 const settings=exportSettings({width,height},options),flip=(a,channels)=>settings.mirror?flippedRows(a,width,height,channels):a;
 return {settings,pixels:{width,height,rgb:flip(rgb,3),alpha:flip(alpha,1),whiteAlpha:flip(whiteAlpha,1),whiteAllowed:flip(whiteAllowed,1)},paths:{cut:cutPath,color:cutPath,white:cutPath},...(artwork?{artwork:[{type:'text',paths:[{path:glyph(2,10),rgb:[0,0,0]},{path:glyph(5,10),rgb:[0,0,0]}]},{type:'text',paths:[{path:glyph(10,20),rgb:[120,50,30]}]}]}:{})};
}
test('Druck: die Druckdatei bleibt Byte für Byte gleich; die „PDF“ der Bestellansicht ist nie gespiegelt, zeigt den Druck (Farbe über Weiß) und führt die Schnittkontur als Linie von 0,001 mm in CutContour',async()=>{
 for(const profile of ['roland','mimaki'])for(const bleedMm of [0,1])for(const artwork of [true,false]){
  const orders=[];
  for(const mirror of [false,true]){
   const options={profile,mirror,bleedMm},before=await printDelivery(printInput(options,{artwork})),result=await printDelivery(printInput(options,{artwork}),{orderFiles:true}),label=JSON.stringify({...options,artwork});
   assert.equal(before.order,undefined,'ohne Schalter entsteht nichts Neues');assert.deepEqual(result.pdf,before.pdf,label);assert.deepEqual(result.downloads,before.downloads,label);
   assert.equal(result.extras.length,before.extras.length);for(const [i,e] of result.extras.entries())assert.deepEqual(Buffer.from(await e.blob.arrayBuffer()),Buffer.from(await before.extras[i].blob.arrayBuffer()));
   assert.deepEqual(Object.keys(result.order),['pdf'],'genau eine Fassung');
   const main=inspect(result.pdf),order=inspect(result.order.pdf),page=[20+2*bleedMm,30+2*bleedMm],roland=profile==='roland';
   for(const info of [main,order]){assert.equal(info.repaired,false);assert.deepEqual([info.widthMm,info.heightMm],page,label);assert.equal(info.fonts,0);assert.equal(info.pages,1);}
   // Aufbau wie die Druckdatei – Ebenen in der Reihenfolge Farbe, Weiß, Schnittkontur; Sonderfarben wie dort.
   const cut=checkPrintPdf(order,{widthMm:page[0],heightMm:page[1],white:roland},label);assert.deepEqual(order.layers,main.layers,label);assert.equal(order.whiteSpot,main.whiteSpot);
   const existing=main.drawings.filter(d=>d.layer==='CutContour');assert.equal(existing.length,1);assert.ok(Math.abs(existing[0].width-.05*MM)<1e-4,'bestehende Druckdatei: 0,05 mm');
   // Seitenrichtig: das Bohrloch der Kontur liegt links (4…6 mm), die Schrift bei 2…4 mm – in der gespiegelten Druckdatei rechts.
   assert.ok(near(cut.rect,[bleedMm,bleedMm,20+bleedMm,30+bleedMm]),label);assert.ok(cut.points.some(([x,y])=>near([x,y],[4+bleedMm,4+bleedMm])),label+' Bohrloch links');assert.ok(!cut.points.some(([x])=>Math.abs(x-(14+bleedMm))<=.02),label);
   sameShape(points([cut]),mirror?mirrored(points(existing),page[0]):points(existing),label+' Schnittkontur');
   if(mirror)assert.ok(existing[0].points.some(([x,y])=>near([x,y],[14+bleedMm,4+bleedMm])),label+' Druckdatei bleibt gespiegelt');
   else{assert.deepEqual(withoutLayer(order,'CutContour'),withoutLayer(main,'CutContour'),label+' ungespiegelt: derselbe Inhalt wie die Druckdatei');assert.deepEqual(order.images,main.images);assert.deepEqual({...cut,width:null},{...existing[0],width:null});}
   // Der Druck ist beim Öffnen zu sehen: Weiß liegt unter der Farbe, nicht darüber.
   if(artwork){const [ink,paper]=look(result.order.pdf,[[11+bleedMm,21.5+bleedMm],[17+bleedMm,25+bleedMm]]).points;assert.ok(ink[0]<190&&ink[1]<120&&ink[2]<100,label+' Schriftfarbe sichtbar: '+ink);assert.deepEqual(paper,[255,255,255]);}
   else{const seen=look(result.order.pdf),shown=look(result.pdf);assert.ok(seen.count>100,label+' rote Fläche sichtbar');assert.ok(Math.abs(seen.xMm-(4+bleedMm))<=.6,label+' links: '+seen.xMm);assert.ok(Math.abs(shown.xMm-(mirror?16+bleedMm:4+bleedMm))<=.6,label+' Druckdatei: '+shown.xMm);}
   orders.push(result.order.pdf);
  }
  assert.deepEqual(orders[1],orders[0],'gespiegeltes Profil: dieselbe Bestell-PDF, Byte für Byte – '+JSON.stringify({profile,bleedMm,artwork}));
 }
});

test('Schnittkontur der Druck-Bestelldatei: nur die Breite der einen Schnittkontur wird 0,001 mm, jedes andere Objekt bleibt Byte für Byte; ein fremder Aufbau wird abgelehnt',async()=>{
 const input=printInput({profile:'roland'}),pdf=async extra=>Buffer.from(await (await printPDF({...input,...extra})).arrayBuffer());
 const hairline=await pdf({kind:'combined',cut:'hairline'}),line=await pdf({kind:'combined'}),none=await pdf({kind:'color'}),out=withOrderCutLine(hairline);
 const a=inspect(hairline),b=inspect(out);assert.equal(b.repaired,false);assert.deepEqual(b.layers,a.layers);assert.deepEqual(b.images,a.images);assert.deepEqual(withoutLayer(b,'CutContour'),withoutLayer(a,'CutContour'));
 const [before]=a.drawings.filter(d=>d.layer==='CutContour'),[after]=b.drawings.filter(d=>d.layer==='CutContour');
 assert.equal(before.width,0,'printPDF: Geräte-Haarlinie (Breite 0)');assert.ok(isOrderLine(after),'Bestelldatei: 0,001 mm');assert.deepEqual({...after,width:0},before);
 // Objekt für Objekt: genau eines ändert sich (der Seiteninhalt).
 const objects=bytes=>{const text=bytes.toString('latin1');return text.slice(0,text.lastIndexOf('\nxref\n')).split(/\n(?=\d+ 0 obj\n)/);},x=objects(hairline),y=objects(out);
 assert.equal(y.length,x.length);assert.equal(x.filter((object,i)=>object!==y[i]).length,1);
 for(const [bytes,message] of [[line,/Schnittkontur nicht genau einmal/],[none,/Schnittkontur nicht genau einmal/],[out,/Schnittkontur nicht genau einmal/],[REFERENCE,/Schnittkontur nicht genau einmal/],[Buffer.from('%PDF-1.7\nkein Aufbau'),/nicht den erwarteten Aufbau/],[hairline.subarray(0,hairline.length-3),/nicht den erwarteten Aufbau/],[Buffer.concat([hairline,Buffer.from('\n')]),/nicht den erwarteten Aufbau/]])
  assert.throws(()=>withOrderCutLine(bytes),e=>e.status===422&&e.code==='print_delivery'&&message.test(e.message));
});

test('Druck-SVG: die gesicherte Gestaltung plus genau eine Gruppe CutContour mit allen Ringen, Linie 0,001; kein Blau, kein Rot',()=>{
 const geometry={widthMm:40,heightMm:30,contours:[{role:'outer',d:'M0 0H40V30H0Z'},{role:'hole',d:'M5 5V8H8V5Z'}]},plain='<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="30mm" viewBox="0 0 40 30"><path d="M1 1H2V2Z" fill="#0000ff"/></svg>';
 const svg=printSvgWithContour(plain,geometry);checkPrintSvg(svg,{widthMm:40,heightMm:30,geometry,plain});
 assert.ok(svg.endsWith('<g id="CutContour" data-layer="CutContour" fill="none" stroke="#ff00ff" stroke-width="0.001"><path d="M0 0H40V30H0Z Z M5 5V8H8V5Z Z"/></g></svg>'));
 assert.equal(printSvgWithContour(plain+'\n',geometry).replace(/\n$/,''),svg);
 for(const broken of ['<svg></svg> <!-- x -->','<svg>','kein SVG'])assert.throws(()=>printSvgWithContour(broken,geometry),/nicht mit Kontur/);
});

test('Gravur-Worker: Bestelldateien im Aufbau der Musterdatei – Ebene „03 Gravur“ in reinem Schwarz, Außenkontur blau, Innenkonturen nach `orderFiles.holes`, nie gespiegelt; `auto` und die Dateien der „Ausgaben“ wie bisher',async()=>{
 const geometry={schema:'gravuru-contour/v1',widthMm:40,heightMm:30,holeCount:1,contours:[{role:'outer',d:'M0 0H40V30H0Z'},{role:'hole',d:'M5 5V8H8V5Z'}]},{png}=seedWorkshop();
 const svg=body=>'<svg xmlns="http://www.w3.org/2000/svg" width="40mm" height="30mm" viewBox="0 0 40 30"><g data-native-design="true">'+body+'</g></svg>';
 // Links der Mitte: eine schwarze Linie von 1 mm, eine Fläche in Vorschaufarbe (kein Maschinenwert), darin eine weiße (keine Gravur).
 const vector=svg('<g data-field="native-0"><path d="M10 10H20V20H10Z" fill="none" stroke="#000000" stroke-width="1"/><path d="M3 22H9V27H3Z" fill="#b56943"/><path d="M4 23H6V25H4Z" fill="#ffffff"/></g>'),raster=svg('<g data-field="native-0"><image href="data:image/png;base64,'+png+'" x="10" y="10" width="10" height="10"/></g>');
 const run=(source,mode,extra={})=>renderEngraving({svg:source,geometry,settings:{mode,dpi:300,mirror:false},photoFields:[],photos:[],orderFiles:{holes:'cut'},...extra});
 const a=await run(vector,'auto');assert.equal(a.mode,'vector');assert.equal(a.pixelWidth,null);
 // Die Dateien der Seite „Ausgaben“: Gravur-PDF ohne Ebene und ohne Kontur, getrennte Konturdatei 0,05 mm; die Vorschaufarbe bleibt dort ein eigener Wert.
 const plain=inspect(Buffer.from(a.pdf,'base64')),separate=inspect(Buffer.from(a.contour,'base64'));
 assert.equal(plain.images.length,0);assert.deepEqual([plain.widthMm,plain.heightMm,separate.widthMm,separate.heightMm],[40,30,40,30]);assert.deepEqual(plain.layers,[]);assert.equal(plain.drawings.length,3);
 assert.ok(Math.abs(plain.drawings[0].width-MM)<1e-3);assert.ok(plain.drawings.some(d=>d.fill&&!same(d.fill,BLACK)&&!same(d.fill,WHITE)),'Gravur-PDF der „Ausgaben“ führt die Vorschaufarbe weiter als eigenen Wert');
 assert.equal(separate.drawings.length,1);assert.ok(Math.abs(separate.drawings[0].width-.05*MM)<1e-4,'getrennte Konturdatei bleibt bei 0,05 mm');
 for(const holes of ['cut','contour','omit']){
  const r=holes==='cut'?a:await run(vector,'auto',{orderFiles:{holes}}),{content,lines}=checkEngravingPdf(inspect(Buffer.from(r.orderPdf,'base64')),{widthMm:40,heightMm:30,holes},holes);
  assert.equal(lines.length,holes==='omit'?1:2,holes);if(holes!=='omit')assert.ok(near(lines[1].rect,[5,5,8,8]),holes);
  // Inhalt: dieselbe Lage und dieselbe Strichstärke wie die Gestaltung (1 mm bleibt 1 mm), jede Farbe reines Schwarz, Weiß bleibt Weiß.
  sameShape(points(content),points(plain.drawings),holes);assert.equal(content.length,3);assert.ok(Math.abs(content[0].width-MM)<1e-3,'Strichstärke der Gestaltung');
  assert.deepEqual(content.map(d=>d.color||d.fill),[BLACK,BLACK,WHITE],holes);
  checkEngravingSvg(r.orderSvg,{widthMm:40,heightMm:30,geometry,holes},holes);
  // Die Angabe ändert nur die Bestelldateien.
  assert.equal(r.svg,a.svg);assert.deepEqual(inspect(Buffer.from(r.pdf,'base64')).drawings,plain.drawings);assert.deepEqual(inspect(Buffer.from(r.contour,'base64')).drawings,separate.drawings);
 }
 // Die SVG trägt die Farben der Gestaltung unverändert (dort ist Schwarz die Angabe der Gestaltung selbst); Inhalt = Fertigungs-SVG.
 assert.equal(checkEngravingSvg(a.orderSvg,{widthMm:40,heightMm:30,geometry,holes:'cut'}),svgInner(a.svg));
 // Ohne die Angabe entsteht nichts Neues; eine fremde Angabe und eine Kontur ohne eindeutige Außenform werden abgelehnt.
 const none=await run(vector,'auto',{orderFiles:undefined});assert.equal(none.orderPdf,undefined);assert.equal(none.orderSvg,undefined);assert.equal(none.svg,a.svg);assert.deepEqual(inspect(Buffer.from(none.pdf,'base64')).drawings,plain.drawings);
 await assert.rejects(()=>run(vector,'auto',{orderFiles:{holes:'red'}}),/Innenkonturen der Bestelldatei/);await assert.rejects(()=>run(vector,'auto',{orderFiles:{holes:'cut',mirror:true}}),/Angabe zur Bestelldatei/);await assert.rejects(()=>run(vector,'auto',{orderFiles:'cut'}),/Angabe zur Bestelldatei/);
 await assert.rejects(()=>run(vector,'auto',{geometry:{...geometry,contours:[...geometry.contours].reverse()}}),/eindeutige Außenform/);
 // Nie gespiegelt: Mit gespiegeltem Fertigungsprofil ändern sich Gravur-PDF, Konturdatei und Fertigungs-SVG – die Bestelldateien nicht.
 const m=await run(vector,'auto',{settings:{mode:'auto',dpi:300,mirror:true}}),mirroredPlain=inspect(Buffer.from(m.pdf,'base64'));
 sameShape(points(mirroredPlain.drawings),mirrored(points(plain.drawings),40),'Gravur-PDF gespiegelt');assert.ok(m.svg.includes('<g transform="translate(40 0) scale(-1 1)">'));assert.notEqual(m.svg,a.svg);
 assert.equal(m.orderSvg,a.orderSvg,'SVG der Bestellansicht: unabhängig von der Spiegelung');assert.ok(!m.orderSvg.includes('scale(-1 1)'));
 assert.deepEqual(inspect(Buffer.from(m.orderPdf,'base64')).drawings,inspect(Buffer.from(a.orderPdf,'base64')).drawings,'PDF der Bestellansicht: unabhängig von der Spiegelung');
 // Rasterbild ohne Kundenfoto (z. B. eingefärbte Designquelle): Vektor wäre ein Fehlschlag, die Regel nimmt Raster 300 dpi. Die
 // Bestell-PDF trägt dieselben Pixel als Graustufenbild in der Ebene, darüber die Konturen als Vektor.
 const b=await run(raster,'auto');assert.equal(b.mode,'raster');assert.equal(b.pixelWidth,Math.ceil(40*300/25.4));
 const rasterPlain=inspect(Buffer.from(b.pdf,'base64')),rasterOrder=inspect(Buffer.from(b.orderPdf,'base64'));assert.deepEqual(rasterPlain.images.map(i=>[i.colorSpace,i.layered]),[['DeviceGray',false]]);
 assert.equal(checkEngravingPdf(rasterOrder,{widthMm:40,heightMm:30,holes:'cut',raster:true},'Raster').lines.length,2);assert.equal(rasterOrder.images[0].sha256,rasterPlain.images[0].sha256,'dieselben Pixel wie die Gravurseite');
 const bm=await run(raster,'auto',{settings:{mode:'auto',dpi:300,mirror:true}}),flippedPlain=inspect(Buffer.from(bm.pdf,'base64')),flippedOrder=inspect(Buffer.from(bm.orderPdf,'base64'));
 assert.notEqual(flippedPlain.images[0].sha256,flippedPlain.images[0].mirroredSha256,'das Prüfbild ist nicht symmetrisch');
 assert.equal(flippedOrder.images[0].sha256,flippedPlain.images[0].mirroredSha256,'gespiegelte Gravurseite: die Bestell-PDF trägt ihre Pixel seitenrichtig');checkEngravingPdf(flippedOrder,{widthMm:40,heightMm:30,holes:'cut',raster:true},'Raster gespiegelt');assert.equal(bm.orderSvg,b.orderSvg);
 await assert.rejects(()=>run(raster,'vector'),/Rasterbilder/);
 const explicit=await run(vector,'raster');assert.equal(explicit.mode,'raster');assert.equal(explicit.pixelWidth,Math.ceil(40*300/25.4));checkEngravingPdf(inspect(Buffer.from(explicit.orderPdf,'base64')),{widthMm:40,heightMm:30,holes:'cut',raster:true},'Raster gewählt');
 // Seite = Plattenmaß: Ist die Platte kleiner als das Format (Acrylauflage der Funkklingel), wird sie die Seite – 1:1, der Inhalt
 // um ihre Lage verschoben, die Außenkontur auf dem Seitenrand. Die Dateien der „Ausgaben“ bleiben im Format.
 const inset={...geometry,contours:[{role:'outer',d:'M4 2H34V28H4Z'},{role:'hole',d:'M9 7V10H12V7Z'}]},plate={x:4,y:2,width:30,height:26},shifted=list=>list.map(point=>{const [x,y]=point.split(' ').map(Number);return Number((x-4).toFixed(2))+' '+Number((y-2).toFixed(2));});
 const whole=await run(vector,'auto',{geometry:inset}),cropped=await run(vector,'auto',{geometry:inset,orderFiles:{holes:'cut',plate}}),croppedPdf=inspect(Buffer.from(cropped.orderPdf,'base64'));
 assert.deepEqual([inspect(Buffer.from(whole.orderPdf,'base64')).widthMm,inspect(Buffer.from(whole.orderPdf,'base64')).heightMm],[40,30],'ohne Angabe: das ganze Format');
 const croppedParts=checkEngravingPdf(croppedPdf,{widthMm:30,heightMm:26,holes:'cut'},'Platte');assert.ok(near(croppedParts.lines[1].rect,[5,5,8,8]));
 sameShape(points(croppedParts.content),shifted(points(checkEngravingPdf(inspect(Buffer.from(whole.orderPdf,'base64')),{widthMm:40,heightMm:30,holes:'cut',outer:[4,2,34,28]},'Format').content)),'Inhalt um die Lage der Platte verschoben');
 checkEngravingSvg(cropped.orderSvg,{widthMm:40,heightMm:30,geometry:inset,holes:'cut',plate},'Platte');assert.equal(cropped.svg,whole.svg);assert.deepEqual(inspect(Buffer.from(cropped.pdf,'base64')).drawings,inspect(Buffer.from(whole.pdf,'base64')).drawings);
 assert.equal((await run(vector,'auto',{geometry:inset,orderFiles:{holes:'cut',plate,}, settings:{mode:'auto',dpi:300,mirror:true}})).orderSvg,cropped.orderSvg,'Platte: unabhängig von der Spiegelung');
 const full=await run(vector,'auto',{orderFiles:{holes:'cut',plate:{x:0,y:0,width:40,height:30}}});assert.equal(full.orderSvg,a.orderSvg,'Platte = Format: wie ohne Angabe');
 const croppedRaster=inspect(Buffer.from((await run(raster,'auto',{geometry:inset,orderFiles:{holes:'cut',plate}})).orderPdf,'base64'));checkEngravingPdf(croppedRaster,{widthMm:30,heightMm:26,holes:'cut',raster:true},'Platte, Raster');
 assert.deepEqual([croppedRaster.images[0].width,croppedRaster.images[0].height],[403-47,332-23],'Raster auf ganze Pixel um die Platte beschnitten, nicht umgerechnet');
 // Lage 1:1: Die dunkle Bildhälfte (im Format bei 10…15 mm) liegt auf der Seite der Platte bei 6…11 mm.
 const [dark,light,paper]=look(Buffer.from((await run(raster,'auto',{geometry:inset,orderFiles:{holes:'cut',plate}})).orderPdf,'base64'),[[8.5,13],[13.5,13],[3,13]]).points;assert.ok(dark[0]<120,'dunkel: '+dark);assert.ok(light[0]>240&&paper[0]>240);
 for(const bad of [{x:4,y:2,width:40,height:26},{x:-1,y:2,width:30,height:26},{x:4,y:2,width:0,height:26},{x:4,y:2,width:30},{x:'4',y:2,width:30,height:26},[4,2,30,26],'A4'])await assert.rejects(()=>run(vector,'auto',{orderFiles:{holes:'cut',plate:bad}}),/Plattenmaß der Bestelldatei/,JSON.stringify(bad));
 // Führt die Gestaltung zufällig eine Kennung der Bestelldatei, weicht die Ebene aus; die Ausgabe scheitert daran nicht.
 const clash=await run(svg('<g id="gravur"><path id="aussenkontur" d="M10 10H20V20H10Z" fill="#000000"/></g>'),'vector',{orderFiles:{holes:'contour'}});
 assert.match(clash.orderSvg,/<g id="gravur-2" data-layer="03 Gravur" /);assert.match(clash.orderSvg,/<g id="aussenkontur-2" data-layer="Außenkontur \(Anlegen\)" /);assert.match(clash.orderSvg,/<g id="innenkonturen" data-layer="Innenkonturen \(Anlegen\)" /);
 for(const id of ['gravur','gravur-2','aussenkontur','aussenkontur-2','innenkonturen'])assert.equal(clash.orderSvg.split('id="'+id+'"').length,2,id);
 checkEngravingPdf(inspect(Buffer.from(clash.orderPdf,'base64')),{widthMm:40,heightMm:30,holes:'contour'},'Kennung belegt');
});

test('Gravur, natives Produkt: zwei Dateien 1:1 im Aufbau der Musterdatei – nie gespiegelt, auch wenn die Gravur-PDF der „Ausgaben“ nach Profil gespiegelt ist; mit Foto Raster in der Ebene, Kontur als Vektor',async()=>{
 const noPhoto=(await nativeBundle({engraving:true,photo:false})).bundle,withPhoto=(await nativeBundle({engraving:true,photo:true})).bundle;
 const {geometry}=await acrylicArtwork(noPhoto.package,noPhoto.manifest.packageSha256,{engraving:true});assert.deepEqual([geometry.widthMm,geometry.heightMm,geometry.contours.length],[150,200,1]);
 assert.equal(noPhoto.manifest.product.material.kind,'acrylic');
 const made={};
 for(const mirror of [false,true]){
  // Ohne Foto und ohne Fertigungsprofil: Regel → Vektor. `mirror:true` ist der Stand über die Werkstatt (Acrylgravur von hinten).
  const v=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mirror}),two=twoFiles(v),label='gespiegelt: '+mirror;made[mirror]=two;
  assert.deepEqual(v.metadata.settings,{mode:'vector',dpi:300,mirror});assert.deepEqual(v.metadata.modeRule.applied,'vector');assert.equal(v.metadata.pixelWidth,null);assert.equal(v.metadata.schema,ACRYLIC_ENGRAVING_RECIPE);
  assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'gravur-1zu1-mit-kontur.pdf',svg:'gravur-1zu1-mit-kontur.svg'});
  // Die Dateien der Seite „Ausgaben“ bleiben im Paket: Gravur-PDF, getrennte Konturdatei, Fertigungs-SVG – nach Profil gespiegelt.
  const base=two.files.get('technische-gravurpruefung.pdf'),baseSvg=two.files.get('gravur-fertigung.svg');
  assert.deepEqual(base,v.pdf);assert.equal(v.metadata.pdfSha256,digest(base));assert.equal(v.metadata.productionSvg[0].sha256,digest(baseSvg));assert.equal(v.metadata.productionSvg[0].mirror,mirror);assert.equal(v.metadata.contourSha256,digest(two.files.get('gravur-kontur-1zu1.pdf')));
  const plain=inspect(base),separate=inspect(two.files.get('gravur-kontur-1zu1.pdf'));
  for(const info of [plain,separate]){assert.deepEqual([info.widthMm,info.heightMm],[150,200]);assert.equal(info.fonts,0);assert.equal(info.images.length,0);assert.equal(info.pages,1);assert.deepEqual(info.layers,[]);}
  assert.ok(plain.drawings.length>1);assert.equal(separate.drawings.length,1);assert.ok(Math.abs(separate.drawings[0].width-.05*MM)<1e-4);
  // „PDF“: Aufbau der Musterdatei; die Platte hat keine Innenkontur → genau eine blaue Linie auf dem Plattenrand.
  const {content,lines}=checkEngravingPdf(inspect(two.pdf.bytes),{widthMm:150,heightMm:200,holes:'none'},label);assert.equal(lines.length,1);
  // Deckungsgleich mit der getrennten Konturdatei des ungespiegelten Stands (gespiegelte Bögen nähert cairo mit anderen Stützpunkten an).
  if(!mirror)made.contour=points(separate.drawings);sameShape(points(lines),made.contour,label+' Außenkontur deckungsgleich mit gravur-kontur-1zu1.pdf');assert.deepEqual(lines[0].rect,separate.drawings[0].rect);
  // Inhalt seitenrichtig: ungespiegelt derselbe wie die Gravur-PDF, gespiegelt deren Spiegelbild.
  assert.equal(content.length,plain.drawings.length,label);sameShape(points(content),mirror?mirrored(points(plain.drawings),150):points(plain.drawings),label+' Inhalt');
  if(mirror)assert.throws(()=>sameShape(points(content),points(plain.drawings),''),undefined,'das Prüfmotiv ist nicht symmetrisch');
  // „SVG“: Gruppe „03 Gravur“ mit dem Inhalt der Fertigungs-SVG (seitenrichtig), danach die blaue Außenkontur der gesicherten Geometrie.
  const inner=checkEngravingSvg(two.svg.bytes,{widthMm:150,heightMm:200,geometry,holes:'none'},label);
  if(mirror){assert.ok(baseSvg.toString().includes('<g transform="translate(150 0) scale(-1 1)">'),'die Fertigungs-SVG der „Ausgaben“ bleibt gespiegelt');assert.ok(!two.svg.bytes.toString().includes('scale(-1 1)'));}
  else assert.equal(inner,svgInner(baseSvg),'Inhalt der Gruppe = Fertigungs-SVG');
  assert.deepEqual(JSON.parse(two.files.get('gravurpruefung.json')).orderFiles,v.metadata.orderFiles);
 }
 assert.equal(made.true.svg.bytes.toString(),made.false.svg.bytes.toString(),'SVG: das gespiegelte Profil ändert die Bestelldatei nicht');
 assert.deepEqual(inspect(made.true.pdf.bytes).drawings,inspect(made.false.pdf.bytes).drawings,'PDF: das gespiegelte Profil ändert die Bestelldatei nicht');
 // Mit Foto: Regel → Raster 300 dpi (3.57 (5) bleibt). Die „PDF“ trägt dieselben Pixel als Graustufenbild in der Ebene „03 Gravur“ –
 // bei gespiegelter Gravurseite seitenrichtig –, darüber die Außenkontur als Vektorlinie.
 for(const mirror of [false,true]){
  const r=await createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256,{mirror}),photo=twoFiles(r),label='Foto, gespiegelt: '+mirror;made['photo'+mirror]=photo;
  assert.deepEqual(r.metadata.settings,{mode:'raster',dpi:300,mirror});assert.equal(r.metadata.modeRule.applied,'raster');assert.equal(r.metadata.pixelWidth,Math.ceil(150*300/25.4));assert.equal(r.metadata.pixelHeight,Math.ceil(200*300/25.4));
  const rp=inspect(photo.files.get('technische-gravurpruefung.pdf')),rc=inspect(photo.pdf.bytes);assert.deepEqual(photo.files.get('technische-gravurpruefung.pdf'),r.pdf);
  assert.deepEqual(rp.images.map(i=>[i.colorSpace,i.width,i.height,i.layered]),[['DeviceGray',1772,2363,false]]);assert.equal(rp.drawings.length,0);
  const {lines}=checkEngravingPdf(rc,{widthMm:150,heightMm:200,holes:'none',raster:true},label);assert.equal(lines.length,1);sameShape(points(lines),made.contour,label);assert.deepEqual(lines[0].rect,inspect(photo.files.get('gravur-kontur-1zu1.pdf')).drawings[0].rect);
  assert.deepEqual([rc.images[0].width,rc.images[0].height],[1772,2363]);assert.notEqual(rp.images[0].sha256,rp.images[0].mirroredSha256);assert.equal(rc.images[0].sha256,mirror?rp.images[0].mirroredSha256:rp.images[0].sha256,label+' dieselben Pixel, seitenrichtig');
  checkEngravingSvg(photo.svg.bytes,{widthMm:150,heightMm:200,geometry,holes:'none'},label);
 }
 assert.equal(made.phototrue.svg.bytes.toString(),made.photofalse.svg.bytes.toString());
 // Eine ausdrückliche Wahl gilt unverändert: Raster ohne Foto bleibt Raster, Vektor mit Foto wird weiter abgelehnt.
 const explicit=await createAcrylicEngravingProof(noPhoto.package,noPhoto.manifest.packageSha256,{mode:'raster'});assert.deepEqual(explicit.metadata.settings,{mode:'raster',dpi:300,mirror:false});assert.equal(explicit.metadata.modeRule,undefined);
 assert.deepEqual(inspect(explicit.pdf).images.map(i=>i.colorSpace),['DeviceGray']);checkEngravingPdf(inspect(twoFiles(explicit).pdf.bytes),{widthMm:150,heightMm:200,holes:'none',raster:true},'Raster gewählt');
 await assert.rejects(()=>createAcrylicEngravingProof(withPhoto.package,withPhoto.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
});

test('Gravur, echtes Türschild 120 × 80 mm mit zwei Bohrlöchern: Edelstahl – Löcher blau (Anlegen, Annahme); Acrylglas – Löcher rot (Schnitt nach der Gravur)',async()=>{
 for(const [file,kind,holes] of [['steel.json','steel','contour'],['schwarz.json','acrylic','cut']]){
  const bundle=await familyBundle(file),{geometry}=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
  assert.equal(bundle.manifest.product.material.kind,kind);assert.equal(orderHoleLines({manifest:bundle.manifest}),holes);
  assert.deepEqual([geometry.widthMm,geometry.heightMm,geometry.contours.map(c=>c.role).join()],[120,80,'outer,hole,hole'],file);
  const made=[];
  for(const mirror of [false,true]){
   const result=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror}),two=twoFiles(result),label=file+' gespiegelt: '+mirror;made.push(two);
   assert.equal(result.metadata.settings.mode,'vector',label);
   const {content,lines}=checkEngravingPdf(inspect(two.pdf.bytes),{widthMm:120,heightMm:80,holes},label),plain=inspect(result.pdf),separate=inspect(two.files.get('gravur-kontur-1zu1.pdf'));
   // Außenkontur und beide Bohrlöcher, deckungsgleich mit der getrennten Konturdatei (Bohrbild symmetrisch).
   assert.deepEqual(lines.map(d=>d.color),[BLUE,holes==='cut'?RED:BLUE],label);assert.ok(lines[1].rect[2]-lines[1].rect[0]>60,label+' beide Bohrlöcher in einer Linie');
   sameShape(points(lines),mirror?mirrored(points(separate.drawings),120):points(separate.drawings),label);
   assert.ok(content.length>0);sameShape(points(content),mirror?mirrored(points(plain.drawings),120):points(plain.drawings),label+' Inhalt');
   checkEngravingSvg(two.svg.bytes,{widthMm:120,heightMm:80,geometry,holes},label);
  }
  assert.equal(made[1].svg.bytes.toString(),made[0].svg.bytes.toString(),file);assert.deepEqual(inspect(made[1].pdf.bytes).drawings,inspect(made[0].pdf.bytes).drawings,file);
 }
});

test('Druck, natives Produkt: zwei Dateien 1:1 für Roland und Mimaki – nie gespiegelt, der Druck ist zu sehen, jede Kontur in CutContour als Linie von 0,001 mm; die Druckdateien der „Ausgaben“ bleiben',async()=>{
 const {bundle}=await nativeBundle({engraving:false,photo:true}),{geometry}=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256);assert.deepEqual([geometry.widthMm,geometry.heightMm],[150,200]);
 const made={};
 for(const settings of [{},{mirror:true},{profile:'mimaki'},{profile:'mimaki',mirror:true}]){
  const result=await createAcrylicPrintProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mimaki=settings.profile==='mimaki',mirror=settings.mirror===true,label=JSON.stringify(settings);made[label]=two;
  assert.equal(result.metadata.schema,'gravuru-acrylic-print-proof/v10');assert.equal(result.metadata.settings.mirror,mirror);
  assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'druck-1zu1-mit-kontur.pdf',svg:'druck-1zu1-mit-kontur.svg'});
  assert.ok(![...two.files.keys()].some(name=>/ohne-schnittlinie/.test(name)),'keine Druckdatei ohne Schnittlinie im Paket');
  // Die Druckdatei der „Ausgaben“ bleibt die bisherige Datei mit ihrem Dateinachweis (nach Profil gespiegelt, Schnittlinie 0,05 mm).
  const mainName=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'technische-druckpruefung.pdf';assert.deepEqual(two.files.get(mainName),result.pdf);assert.equal(result.metadata.downloads.pdf.sha256,digest(result.pdf));assert.equal(result.metadata.pdfSha256,digest(result.pdf));
  const main=inspect(result.pdf),order=inspect(two.pdf.bytes);assert.deepEqual([main.widthMm,main.heightMm],[150,200],label);assert.ok(main.images.length>0,'Foto als Bildebene');
  const existing=main.drawings.filter(d=>d.layer==='CutContour');assert.equal(existing.length,1);assert.ok(Math.abs(existing[0].width-.05*MM)<1e-4);
  // „PDF“: Aufbau der Druckdatei – Farbe und Weiß in einer Datei bei Roland, bei Mimaki bleibt Weiß die eigene Datei der „Ausgaben“.
  const cut=checkPrintPdf(order,{widthMm:150,heightMm:200,white:!mimaki},label);assert.deepEqual(order.layers,main.layers);assert.equal(order.images.length,main.images.length);if(mimaki)assert.ok(two.files.has('Mimaki-NUR-RDG_WHITE.pdf'));
  sameShape(points([cut]),points(existing),label+' Schnittkontur deckungsgleich mit der Druckdatei');assert.ok(near(cut.rect,[0,0,150,200]));
  // Der Druck ist zu sehen und steht seitenrichtig: Die rote Hälfte des Fotos liegt in der Bestell-PDF immer an derselben Stelle,
  // in der gespiegelten Druckdatei spiegelbildlich.
  const seen=look(two.pdf.bytes),shown=look(result.pdf),plain=made[JSON.stringify(mimaki?{profile:'mimaki'}:{})];made[label+' rot']=seen;
  assert.ok(seen.count>500,label+' der Druck ist zu sehen');assert.ok(Math.abs(shown.xMm-(mirror?150-seen.xMm:seen.xMm))<=.4,label+' Druckdatei '+shown.xMm+' / Bestelldatei '+seen.xMm);assert.ok(Math.abs(seen.xMm-75)>2,'das Prüfmotiv liegt nicht mittig');
  assert.deepEqual(two.pdf.bytes,plain.pdf.bytes,label+': dieselbe Bestell-PDF wie ungespiegelt, Byte für Byte');
  // „SVG“: die gesicherte Gestaltung (seitenrichtig) plus Schnittkontur in der Farbe von CutContour; die Gestaltung ohne Kontur bleibt im Paket.
  checkPrintSvg(two.svg.bytes,{widthMm:150,heightMm:200,geometry,plain:two.files.get('gesicherte-gestaltung.svg')},label);assert.deepEqual(two.svg.bytes,plain.svg.bytes);
  assert.deepEqual(JSON.parse(two.files.get('druckpruefung.json')).orderFiles,result.metadata.orderFiles);
 }
 assert.deepEqual(made['{} rot'],made['{"profile":"mimaki"} rot'],'Roland und Mimaki zeigen denselben Druck an derselben Stelle');
});

test('Funkklingel zweischichtig: PDF und SVG zeigen die Acrylauflage (sie trägt die Gestaltung) – Seite = Auflage, Außenform blau, Ausschnitte rot; nie gespiegelt; die Schnittdateien bleiben getrennt',async()=>{
 const decoration=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="1mm" viewBox="0 0 30 1"><path d="M.5 .5L29.5 .5" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>'),hash=digest(decoration);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
 // 35 × 18 cm verdeckt: die Auflage ist so groß wie das gemeinsame Format. 16 × 28 cm mit Rahmen oben und unten: die Auflage ist
 // 160 × 260 mm – das Maß der Musterdatei von Chris – und liegt im Format um 10 mm nach unten versetzt.
 for(const [selection,format,bounds] of [[{format:'35x18',frame:'FK-VERDECKT',color:'schwarz',mounting:'B04S',position:'opposite'},[350,180],{x:0,y:0,width:350,height:180}],[{format:'16x28',frame:'FK-OBENUNTEN',color:'schwarz',mounting:'K00',position:'opposite'},[160,280],{x:0,y:10,width:160,height:260}]]){
  const fixture=doorbellFixture();
  fixture.localResources.motifs.push({key:'artwork-'+hash,bounds:[0,0,30,1],svgFragment:artworkFragment(hash,30,1),embeddedOnly:true,vectorOnly:true,artwork:{schema:'gravuru-imported-artwork/v1',assetId:hash,sourceSha256:hash,previewSha256:hash,format:'svg',page:1,pageCount:1,widthMm:30,heightMm:1}});
  for(const p of [fixture.profile,...fixture.doorbell.formats.map(f=>f.profile)])p.designs[0].objects.find(o=>o.id==='mark-0').motif='artwork-'+hash;
  const document=makeProductDocument(fixture),config=document.config,record={id:config.profile.id,revision:1,document},source=selectedProfile(config,selection).designs[0];
  const bundle=await prepareAcrylicReview({record,config,input:{productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:selection,quantity:1,media:[],preview:png.toString('base64')},assets:{get:()=>({format:'svg'}),read:()=>decoration},preparePhoto:async()=>({original:png,preview:png,width:40,height:60})});
  const frozen=JSON.parse(readReviewPackage(bundle.package,bundle.manifest.packageSha256,NATIVE_REVIEW_SCHEMAS).files.get('funkklingel-fertigung.json')),made=[],a=frozen.acrylicBoundsMm,name=selection.format+' '+selection.frame;
  assert.deepEqual(frozen.geometry.contours.map(c=>c.role).slice(0,2),['outer','hole'],'Acrylauflage mit Ausschnitt');assert.deepEqual({x:a.x,y:a.y,width:a.width,height:a.height},bounds,name);
  const whole=a.x===0&&a.y===0&&a.width===format[0]&&a.height===format[1],plate=whole?null:bounds,shifted=list=>list.map(point=>{const [x,y]=point.split(' ').map(Number);return Number((x-a.x).toFixed(2))+' '+Number((y-a.y).toFixed(2));});
  for(const mirror of [false,true]){
   const result=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mirror}),two=twoFiles(result),label=name+' gespiegelt: '+mirror;made.push(two);
   assert.equal(result.metadata.settings.mode,'vector','ohne Foto und ohne Rasterbild: Vektor');assert.equal(result.metadata.layered.cutMirror,false);assert.equal(result.metadata.layered.engravingMirror,mirror);
   assert.deepEqual(two.files.get('technische-gravurpruefung.pdf'),result.pdf);
   // Die Dateien der „Ausgaben“ bleiben im gemeinsamen Format von Träger und Auflage.
   const plain=inspect(result.pdf),acrylic=inspect(two.files.get('acrylauflage-schnitt-1zu1.pdf')),steel=inspect(two.files.get('edelstahltraeger-schnitt-1zu1.pdf'));
   for(const info of [plain,acrylic,steel])assert.deepEqual([info.widthMm,info.heightMm],format,label);
   // „PDF“: Seite = Acrylauflage (wie die Musterdatei). Die blaue Außenform liegt auf dem Seitenrand, die roten Linien sind ihre
   // Ausschnitte – zusammen deckungsgleich mit der Schnittdatei der Acrylauflage, um die Lage der Auflage verschoben.
   const order=inspect(two.pdf.bytes),{content,lines}=checkEngravingPdf(order,{widthMm:a.width,heightMm:a.height,holes:'cut'},label);
   assert.deepEqual(lines.map(d=>d.color),[BLUE,RED],label);
   const cut=points(acrylic.drawings),carrier=points(steel.drawings);sameShape(points(lines),shifted(cut),label+' Schnittdatei der Acrylauflage');
   assert.notDeepEqual(cut,carrier,'der Edelstahlträger ist ein anderes Teil und bleibt getrennt');
   sameShape(points(content),shifted(mirror?mirrored(points(plain.drawings),format[0]):points(plain.drawings)),label+' Inhalt seitenrichtig');
   for(const file of ['edelstahltraeger-schnitt-1zu1.pdf','acrylauflage-schnitt-1zu1.pdf','edelstahltraeger-schnitt.svg','acrylauflage-schnitt.svg','gravur-kontur-1zu1.pdf'])assert.ok(two.files.has(file),file);
   assert.equal(two.files.get('acrylauflage-schnitt.svg').toString(),frozen.acrylic.svg);assert.equal(two.files.get('edelstahltraeger-schnitt.svg').toString(),frozen.steel.svg);
   checkEngravingSvg(two.svg.bytes,{widthMm:format[0],heightMm:format[1],geometry:frozen.geometry,holes:'cut',plate},label);
   // Dieselbe Seite wie die Musterdatei, wenn es dieselbe Auflage ist.
   if(selection.format==='16x28'){const reference=inspect(REFERENCE);assert.deepEqual([order.widthMm,order.heightMm],[reference.widthMm,reference.heightMm],'160 × 260 mm wie die Musterdatei');}
  }
  assert.equal(made[1].svg.bytes.toString(),made[0].svg.bytes.toString(),name);assert.deepEqual(inspect(made[1].pdf.bytes).drawings,inspect(made[0].pdf.bytes).drawings,name);
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
// Die Gestaltung des Formprodukts ist selbst auf die Kontur beschnitten (clipPath `form-design-clip`, form-review-snapshot.mjs).
// Tragen die Konturgruppen dieselben Pfade im selben Zahlenraum (viewBox in mm), liegen sie deckungsgleich auf der Gestaltung.
const clipPathOf=svg=>svg.toString().match(/<clipPath id="form-design-clip"><path d="([^"]*)"/)?.[1];
const cutPathOf=svg=>svg.toString().match(/<g id="CutContour"[^>]*><path d="([^"]*)"/)?.[1];
const ringsOf=geometry=>geometry.contours.map(c=>c.d+' Z').join(' ');

test('Formprodukt alter Art, Gravur: dieselben zwei Dateien im Aufbau der Musterdatei – Innenkonturen bei Acrylglas rot, bei Edelstahl und Schiefer blau (Annahme); nie gespiegelt; die bisherigen Dateien bleiben',async()=>{
 for(const [material,holes] of [['steel','contour'],['slate','contour'],['acrylic-black','cut']]){
  const {bundle,geometry,source}=await formBundle({method:'engraving',material}),made={};
  assert.deepEqual([geometry.schema,geometry.widthMm,geometry.heightMm,geometry.contours.map(c=>c.role).join()],['gravuru-contour/v1',60,40,'outer,hole']);assert.match(source.toString(),/^<svg [^>]*width="60mm" height="40mm" viewBox="0 0 60 40">/,'Gestaltung in Millimetern');
  assert.equal(bundle.manifest.product.material.id,material);assert.equal(orderHoleLines({manifest:bundle.manifest}),holes,material);
  for(const settings of [{mode:'vector'},{mode:'vector',mirror:true},{},{mirror:true}]){
   const result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mirror=settings.mirror===true,vector=settings.mode==='vector',label=material+' '+JSON.stringify(settings);(made[vector]??=[]).push(two);
   assert.equal(result.metadata.schema,'gravuru-form-engraving-proof/v3');assert.equal(result.metadata.settings.mode,vector?'vector':'raster');assert.equal(result.metadata.settings.mirror,mirror);
   assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'gravur-1zu1-mit-kontur.pdf',svg:'gravur-1zu1-mit-kontur.svg'});
   // Die bisherigen Dateien des Pakets bleiben: Gravur-PDF (die Datei der „Ausgaben“, nach Profil gespiegelt, ohne Ebene) und die
   // getrennte Konturdatei (schwarz, 0,05 mm).
   assert.deepEqual(two.files.get('technische-gravurpruefung.pdf'),result.pdf);assert.equal(result.metadata.pdfSha256,digest(result.pdf));assert.equal(result.metadata.contourSha256,digest(two.files.get('gravur-kontur-1zu1.pdf')));
   const plain=inspect(result.pdf),separate=inspect(two.files.get('gravur-kontur-1zu1.pdf'));
   for(const info of [plain,separate]){assert.deepEqual([info.widthMm,info.heightMm],[60,40],label);assert.equal(info.fonts,0);assert.equal(info.pages,1);assert.deepEqual(info.layers,[]);}
   assert.deepEqual(separate.drawings.map(d=>[d.type,d.color]),[['s',[0,0,0]]]);assert.ok(Math.abs(separate.drawings[0].width-.05*MM)<1e-4,'getrennte Konturdatei bleibt bei 0,05 mm');
   // „PDF“: Aufbau der Musterdatei. Außenform blau, das Bohrloch nach der Regel des Materials; zusammen deckungsgleich mit der
   // Konturdatei – seitenrichtig, also bei gespiegeltem Profil mit deren Spiegelbild.
   const {content,lines}=checkEngravingPdf(inspect(two.pdf.bytes),{widthMm:60,heightMm:40,holes,raster:!vector},label);
   assert.deepEqual(lines.map(d=>d.color),[BLUE,holes==='cut'?RED:BLUE],label);assert.ok(near(lines[1].rect,[6,18,10,22]),label+' Bohrloch links: '+lines[1].rect);
   sameShape(points(lines),mirror?mirrored(points(separate.drawings),60):points(separate.drawings),label+' Konturen');
   if(vector){
    // Die rote Fläche der Designquelle (3…17 × 3…23 mm): in der Bestelldatei an ihrem Platz und reines Schwarz; in der Gravur-PDF der
    // „Ausgaben“ bei gespiegeltem Profil bei 43…57 mm und als Grauwert der Gestaltungsfarbe (kein Maschinenwert).
    assert.ok(content.some(d=>d.type==='f'&&same(d.fill,BLACK)&&near(d.rect,[3,3,17,23])),label+' Designfläche seitenrichtig und schwarz');
    assert.ok(plain.drawings.some(d=>d.type==='f'&&d.fill[0]>.2&&d.fill[0]<.22&&d.fill[0]===d.fill[1]&&d.fill[1]===d.fill[2]&&near(d.rect,mirror?[43,3,57,23]:[3,3,17,23])),label+' Gravur-PDF der „Ausgaben“: Grauwert der Gestaltungsfarbe, Lage nach Profil');
    assert.equal(plain.images.length,0);sameShape(points(content),mirror?mirrored(points(plain.drawings),60):points(plain.drawings),label+' Inhalt');
   }else{
    const image=inspect(two.pdf.bytes).images[0];assert.deepEqual(plain.images.map(i=>[i.colorSpace,i.layered]),[['DeviceGray',false]]);
    assert.notEqual(plain.images[0].sha256,plain.images[0].mirroredSha256);assert.equal(image.sha256,mirror?plain.images[0].mirroredSha256:plain.images[0].sha256,label+' dieselben Pixel, seitenrichtig');
   }
   // „SVG“: die Gestaltung in mm in der Gruppe „03 Gravur“, danach Außenform und Bohrloch – zusammen der Pfad, auf den die
   // Gestaltung selbst beschnitten ist. Nichts ist gespiegelt.
   checkEngravingSvg(two.svg.bytes,{widthMm:60,heightMm:40,geometry,holes},label);
   const svg=two.svg.bytes.toString();assert.equal(clipPathOf(svg),ringsOf(geometry),'Außenform und Bohrloch = Beschnitt der Gestaltung');assert.equal(clipPathOf(svg),clipPathOf(source));
   assert.ok(!svg.includes('scale(-1 1)'),label);assert.match(svg,/data-design="design-engraving"/);
   assert.deepEqual(JSON.parse(two.files.get('gravurpruefung.json')).orderFiles,result.metadata.orderFiles);
  }
  for(const pair of Object.values(made)){assert.equal(pair[1].svg.bytes.toString(),pair[0].svg.bytes.toString(),material);assert.deepEqual(inspect(pair[1].pdf.bytes).drawings,inspect(pair[0].pdf.bytes).drawings,material);}
  assert.equal(made.true[0].svg.bytes.toString(),made.false[0].svg.bytes.toString(),'die SVG hängt nicht von Vektor oder Raster ab');
 }
 // Mit Kundenfoto: Raster; die „PDF“ trägt dasselbe Graustufenbild in der Ebene und darüber die Konturen als Vektor.
 const {bundle}=await formBundle({method:'engraving',photo:true}),result=await createFormEngravingProof(bundle.package,bundle.manifest.packageSha256),two=twoFiles(result);
 const plain=inspect(result.pdf),order=inspect(two.pdf.bytes);assert.equal(plain.drawings.length,0);assert.equal(checkEngravingPdf(order,{widthMm:60,heightMm:40,holes:'contour',raster:true},'Foto').lines.length,2);assert.equal(order.images[0].sha256,plain.images[0].sha256);
 await assert.rejects(()=>createFormEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),/Fotos benötigen Rastergravur/);
});

test('Formprodukt alter Art, Druck: dieselben zwei Dateien für Roland und Mimaki – nie gespiegelt, der Druck ist zu sehen, Außenform und Bohrloch in CutContour; kein Blau, kein Rot als Kontur – auch nicht auf Schiefer oder Acrylglas',async()=>{
 for(const material of ['slate','acrylic-clear']){
  const {bundle,geometry,source}=await formBundle({method:'print',photo:true,material}),made={};
  for(const settings of [{},{mirror:true},{profile:'mimaki'},{profile:'mimaki',mirror:true}]){
   const result=await createFormPrintProof(bundle.package,bundle.manifest.packageSha256,settings),two=twoFiles(result),mimaki=settings.profile==='mimaki',mirror=settings.mirror===true,label=material+' '+JSON.stringify(settings);made[JSON.stringify(settings)]=two;
   assert.equal(result.metadata.schema,'gravuru-form-print-proof/v7');
   assert.deepEqual(Object.fromEntries(ORDER_FORMATS.map(f=>[f,two[f].name])),{pdf:'druck-1zu1-mit-kontur.pdf',svg:'druck-1zu1-mit-kontur.svg'});
   assert.ok(![...two.files.keys()].some(name=>/ohne-schnittlinie/.test(name)));
   // Die Druckdatei der „Ausgaben“ bleibt die bisherige Datei mit ihrem Dateinachweis; bei Mimaki bleibt Weiß die eigene Datei.
   const mainName=mimaki?'Mimaki-FARBE-ohne-RDG_WHITE.pdf':'technische-druckpruefung.pdf';assert.deepEqual(two.files.get(mainName),result.pdf);assert.equal(result.metadata.downloads.pdf.sha256,digest(result.pdf));assert.equal(result.metadata.pdfSha256,digest(result.pdf));
   if(mimaki)assert.equal(digest(two.files.get('Mimaki-NUR-RDG_WHITE.pdf')),result.metadata.downloads.white.sha256);
   const main=inspect(result.pdf),order=inspect(two.pdf.bytes);assert.deepEqual([main.widthMm,main.heightMm],[60,40],label);assert.ok(main.images.length>0);
   const existing=main.drawings.filter(d=>d.layer==='CutContour');assert.equal(existing.length,1);assert.ok(Math.abs(existing[0].width-.05*MM)<1e-4);
   // „PDF“: eine Linie in CutContour mit Außenform und Bohrloch (links bei 6…10 mm), seitenrichtig; die Druckdatei bleibt nach Profil gespiegelt.
   const cut=checkPrintPdf(order,{widthMm:60,heightMm:40,white:!mimaki},label);assert.deepEqual(order.layers,main.layers);assert.ok(near(cut.rect,[0,0,60,40]));
   assert.ok(cut.points.some(([x])=>Math.abs(x-6)<=.02)&&!cut.points.some(([x])=>Math.abs(x-54)<=.02),label+' Bohrloch links');assert.equal(existing[0].points.some(([x])=>Math.abs(x-54)<=.02),mirror,label);
   sameShape(points([cut]),mirror?mirrored(points(existing),60):points(existing),label+' Schnittkontur');
   // Der Druck ist zu sehen und steht seitenrichtig: die rote Fläche der Designquelle (3…17 mm) links, in der gespiegelten Druckdatei rechts.
   const seen=look(two.pdf.bytes),shown=look(result.pdf);assert.ok(seen.count>500,label+' der Druck ist zu sehen');assert.ok(Math.abs(seen.xMm-10)<=1,label+' rote Fläche links: '+seen.xMm);assert.ok(Math.abs(shown.xMm-(mirror?50:10))<=1,label+' Druckdatei: '+shown.xMm);
   const plain=made[JSON.stringify(mimaki?{profile:'mimaki'}:{})];assert.deepEqual(two.pdf.bytes,plain.pdf.bytes,label+': dieselbe Bestell-PDF wie ungespiegelt, Byte für Byte');
   // „SVG“: die gesicherte Gestaltung (seitenrichtig) plus Schnittkontur – derselbe Pfad, auf den die Gestaltung beschnitten ist.
   checkPrintSvg(two.svg.bytes,{widthMm:60,heightMm:40,geometry,plain:source},label);
   const svg=two.svg.bytes.toString();assert.equal(cutPathOf(svg),clipPathOf(svg),'Schnittkontur = Beschnitt der Gestaltung');assert.equal(cutPathOf(svg),ringsOf(geometry));assert.doesNotMatch(svg,/<g id="CutContour"[^>]* transform=/);assert.deepEqual(two.svg.bytes,plain.svg.bytes);
   assert.deepEqual(JSON.parse(two.files.get('druckpruefung.json')).orderFiles,result.metadata.orderFiles);
  }
 }
});

// Werkstatt wie im Büro: Händlersitzung und CSRF. Eine bezahlte Testbestellung je Prüfstand; der Auftrag entsteht mit dem Eingang.
test('Download der Bestellposition: nur angemeldet und mit CSRF, zwei Formate mit geprüfter Prüfsumme, seitenrichtig im Aufbau der Musterdatei; Ausgaben früherer Stände → Hinweis und Neuaufbau statt einer Datei im alten Aufbau; Formprodukt wie natives Produkt',async t=>{
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
 const proof=w.customerDrafts.printProof(first.snapshotId,job.recipeKey),files=unpack(proof);assert.equal(proof.metadata.settings.mode,'vector');assert.equal(proof.metadata.settings.mirror,true);assert.equal(proof.metadata.orderFiles.schema,ORDER_FILES_SCHEMA);
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
 // „PDF“ ist die Bestelldatei im Aufbau der Musterdatei – nicht die Gravur-PDF der Seite „Ausgaben“ – und trotz gespiegeltem
 // Verfahrensprofil seitenrichtig; „SVG“ trägt die Gruppe „03 Gravur“ und die blaue Außenkontur.
 const orderPdf=(await call(route(first),{format:'pdf'})).bytes,orderSvg=(await call(route(first),{format:'svg'})).bytes.toString();assert.notDeepEqual(orderPdf,proof.pdf);
 const {content:firstContent}=checkEngravingPdf(inspect(orderPdf),{widthMm:150,heightMm:200,holes:'none'},'Download');
 sameShape(points(firstContent),mirrored(points(inspect(proof.pdf).drawings),150),'Download: seitenrichtig, die Gravur-PDF der „Ausgaben“ ist gespiegelt');
 assert.match(orderSvg,/^<svg [^>]*><g id="gravur" data-layer="03 Gravur" inkscape:groupmode="layer" inkscape:label="03 Gravur">/);assert.match(orderSvg,/<\/g><g id="aussenkontur" data-layer="Außenkontur \(Anlegen\)" fill="none" stroke="#0000ff" stroke-width="0\.001"><path d="[^"]+" \/><\/g><\/svg>$/);assert.ok(!orderSvg.includes('scale(-1 1)'));
 assert.ok(files.get('gravur-fertigung.svg').toString().includes('<g transform="translate(150 0) scale(-1 1)">'),'die Fertigungs-SVG der „Ausgaben“ bleibt gespiegelt');
 assert.equal((await call(route(first),{format:'pdf',surface:'back'})).status,409,'keine Rückseite gestaltet');
 // Die bestehenden Ausgabe-Downloads bleiben unverändert.
 assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'pdf'})).bytes,proof.pdf);assert.deepEqual((await call('/api/workshop/export-jobs/'+job.id+'/download',{format:'zip'})).bytes,proof.archive);

 // 2. Ausgabe ohne Dateinachweis (Rezeptstand v6, vor 3.57): bleibt gültig und abrufbar; die Position bekommt statt eines
 // Fehlers den Hinweis, und der Auftrag mit dem neuen Rezeptstand entsteht beim Öffnen der Ausgaben von selbst.
 const NOT_TODAY='Die gespeicherte Ausgabe dieser Position enthält PDF und SVG im heutigen Aufbau nicht. Bitte die Ausgabe für diese Position neu erstellen.',REBUILDING={jobId:null,formats:[...ORDER_FORMATS],surfaces:[],pending:true,note:'PDF und SVG werden für diese Position neu erstellt.'};
 const old=await position('Cd',{quiet:true}),oldSettings={mode:'raster',dpi:300,mirror:true},oldKey=digest(JSON.stringify({recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings}));
 assert.equal(w.exportJobs.forSnapshot(old.snapshotId).total,0);
 w.customerDrafts.savePrintProof(old.snapshotId,oldKey,{metadata:{schema:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings,pdfSha256:digest(Buffer.from('%PDF-alt')),warnings:[]},pdf:Buffer.from('%PDF-alt'),archive:Buffer.from('altes Paket')});
 const oldJob=w.exportJobs.enqueue({snapshotId:old.snapshotId,recipeKey:oldKey,recipe:'gravuru-acrylic-engraving-proof/v6',settings:oldSettings});assert.equal(oldJob.status,'completed');
 assert.deepEqual(w.orderOutputState(old),{state:'fertig',reason:null,jobId:oldJob.id});
 const missing=await call(route(old),{format:'pdf'});assert.equal(missing.status,409);assert.equal(missing.json.error.code,'order_file_missing');assert.equal(missing.json.error.message,NOT_TODAY);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'),'die alte Ausgabe bleibt abrufbar');
 const opened=await outputs(old);assert.equal(opened.total,2);assert.equal(opened.outputState.state,'fertig');assert.deepEqual(opened.downloads,REBUILDING);
 assert.ok(orderFileButtons(opened.outputState,opened.downloads)[0].buttons.every(b=>!b.enabled));assert.equal(orderFilesNote(opened.outputState,opened.downloads),opened.downloads.note);
 const rebuilt=opened.jobs.find(j=>j.id!==oldJob.id);assert.equal(rebuilt.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal((await outputs(old)).total,2,'wiederholtes Öffnen legt nichts doppelt an');
 await w.exportWorker.wait(rebuilt.id);
 const renewed=await outputs(old);assert.deepEqual(renewed.downloads,{jobId:rebuilt.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
 assert.ok(orderFileButtons(renewed.outputState,renewed.downloads)[0].buttons.every(b=>b.enabled));
 const fresh=await call(route(old),{format:'pdf'});assert.equal(fresh.status,200);checkEngravingPdf(inspect(fresh.bytes),{widthMm:150,heightMm:200,holes:'none'},'neu aufgebaut');
 assert.deepEqual((await call('/api/workshop/export-jobs/'+oldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-alt'));

 // 2b. Ausgaben der Stände 3.57 (Rezept v7, Nachweis v1 mit vier Dateien) und 3.61 (Rezept v8, Nachweis v2 mit zwei Dateien) – so
 // liegen die Ausgaben vom 21.11.2026 vor. Ihre Dateien sind nach Profil gespiegelt und führen die Kontur schwarz mit Breite 0;
 // über die Bestellansicht werden sie nicht mehr abgegeben, auch nicht übergangsweise. Die Position nennt den Stand, der Auftrag
 // mit dem heutigen Rezeptstand entsteht beim Öffnen von selbst, danach kommen PDF und SVG aus ihm. Auf der Seite „Ausgaben“
 // bleibt die frühere Ausgabe abrufbar.
 const present=proof.metadata.orderFiles.surfaces[0].files;
 for(const [text,recipe,orderFiles] of [['Ij','gravuru-acrylic-engraving-proof/v7',{schema:'gravuru-order-files/v1',surfaces:[{id:'front',files:{pdf:{name:'technische-gravurpruefung.pdf',sha256:digest(files.get('technische-gravurpruefung.pdf'))},'pdf-contour':present.pdf,svg:{name:'gravur-fertigung.svg',sha256:digest(files.get('gravur-fertigung.svg'))},'svg-contour':present.svg}}]}],['Kl','gravuru-acrylic-engraving-proof/v8',{schema:'gravuru-order-files/v2',surfaces:[{id:'front',files:present}]}]]){
  const former=await position(text,{quiet:true}),formerKey=digest(JSON.stringify({recipe,settings:job.settings}));assert.notEqual(formerKey,job.recipeKey);
  w.customerDrafts.savePrintProof(former.snapshotId,formerKey,{metadata:{...structuredClone(proof.metadata),schema:recipe,orderFiles},pdf:proof.pdf,archive:proof.archive});
  const formerJob=w.exportJobs.enqueue({snapshotId:former.snapshotId,recipeKey:formerKey,recipe,settings:job.settings});assert.equal(formerJob.status,'completed');
  for(const format of [...ORDER_FORMATS]){const r=await call(route(former),{format});assert.equal(r.status,409,recipe+' '+format);assert.equal(r.json.error.code,'order_file_missing');assert.equal(r.json.error.message,NOT_TODAY);assert.ok(!r.bytes.includes('%PDF-'));}
  for(const format of ['pdf-contour','svg-contour'])assert.equal((await call(route(former),{format})).status,422,format);
  const openedFormer=await outputs(former);assert.equal(openedFormer.total,2,recipe);assert.deepEqual(openedFormer.downloads,REBUILDING,recipe);
  const renewedJob=openedFormer.jobs.find(j=>j.id!==formerJob.id);assert.equal(renewedJob.recipe,ACRYLIC_ENGRAVING_RECIPE);assert.equal(renewedJob.recipeKey,job.recipeKey);
  await w.exportWorker.wait(renewedJob.id);
  const after=await outputs(former);assert.deepEqual(after.downloads,{jobId:renewedJob.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});assert.equal(after.total,2);
  assert.equal(w.customerDrafts.printProof(former.snapshotId,renewedJob.recipeKey).metadata.orderFiles.schema,ORDER_FILES_SCHEMA);
  const now=await call(route(former),{format:'pdf'});assert.equal(now.status,200);assert.equal(now.headers.get('content-disposition'),'attachment; filename="'+renewedJob.id+'-gravur-1zu1-mit-kontur.pdf"');checkEngravingPdf(inspect(now.bytes),{widthMm:150,heightMm:200,holes:'none'},recipe);
  assert.deepEqual((await call('/api/workshop/export-jobs/'+formerJob.id+'/download',{format:'pdf'})).bytes,proof.pdf,'die frühere Ausgabe bleibt auf der Seite „Ausgaben“ abrufbar');
 }

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
 // Produkt; PDF und SVG haben denselben Aufbau. Eine fertige Ausgabe eines früheren Rezeptstands wird beim Öffnen von selbst
 // neu aufgebaut – kein Sonderfall „Formprodukt alter Art“.
 async function formPosition(material,{quiet=false}={}){
  const {record,bundle,capture}=await formBundle({method:'engraving',material,workshop:w});capture();
  const n=++serial,binding=w.orderIntake.bind({shopDomain,variantId:String(300+n),record}),offer=w.orderIntake.offer({bindingId:binding.id,snapshotId:bundle.manifest.id,quantity:1});
  const raw=Buffer.from(JSON.stringify({id:1000+n,test:true,financial_status:'paid',currency:'EUR',line_items:[{id:2000+n,variant_id:300+n,quantity:1,price:(binding.unitCents/100).toFixed(2),properties:[offer.property]}]}));
  const deliver=()=>w.orderIntake.receive(raw,{'x-shopify-hmac-sha256':createHmac('sha256',secret).update(raw).digest('base64'),'x-shopify-shop-domain':shopDomain,'x-shopify-api-version':'2026-07','x-shopify-topic':'orders/paid','x-shopify-webhook-id':'evt-order-files-form-'+n},{shopDomain,secret,apiVersion:'2026-07'});
  const result=quiet?w.orderIntake.withBindingTransaction(deliver):deliver();assert.equal(result.errors.length,0);return result.lines[0];
 }
 // Acrylglas: Außenform blau, Bohrloch rot (wird nach der Gravur geschnitten).
 const form=await formPosition('acrylic-black'),[formJob]=w.exportJobs.forSnapshot(form.snapshotId).jobs;
 assert.equal(formJob.recipe,FORM_ENGRAVING_RECIPE);assert.equal(formJob.recipeKey,formEngravingKey(formJob.settings));
 await w.exportWorker.wait(formJob.id);
 const formReady=await outputs(form);assert.deepEqual(formReady.outputState,{state:'fertig',reason:null,jobId:formJob.id});
 assert.deepEqual(formReady.downloads,{jobId:formJob.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});assert.equal(formReady.total,1);
 const formProof=w.customerDrafts.printProof(form.snapshotId,formJob.recipeKey),formPdf=await call(route(form),{format:'pdf'}),formSvg=await call(route(form),{format:'svg'});
 assert.equal(formPdf.status,200);assert.equal(formPdf.headers.get('content-disposition'),'attachment; filename="'+formJob.id+'-gravur-1zu1-mit-kontur.pdf"');assert.equal(formPdf.headers.get('x-gravuru-file-sha256'),formProof.metadata.orderFiles.surfaces[0].files.pdf.sha256);
 assert.deepEqual(checkEngravingPdf(inspect(formPdf.bytes),{widthMm:60,heightMm:40,holes:'cut',raster:formProof.metadata.settings.mode==='raster'},'Formprodukt Acrylglas').lines.map(d=>d.color),[BLUE,RED]);
 assert.equal(formSvg.status,200);assert.equal(formSvg.headers.get('content-type'),'image/svg+xml');assert.match(formSvg.bytes.toString(),/<g id="aussenkontur" [^>]*stroke="#0000ff" stroke-width="0\.001"><path d="[^"]+" \/><\/g><g id="ausschnitte" [^>]*stroke="#ff0000" stroke-width="0\.001"><path d="[^"]+" \/><\/g><\/svg>$/);
 assert.deepEqual((await call('/api/workshop/export-jobs/'+formJob.id+'/download',{format:'pdf'})).bytes,formProof.pdf,'die Ausgabe der Seite „Ausgaben“ bleibt die Gravur-PDF');
 // Frühere Formausgaben – Rezept v1 ohne Dateinachweis und Rezept v2 mit dem Nachweis des Stands 3.61: Hinweis statt Datei,
 // Neuaufbau beim Öffnen. Edelstahl: Außenform und Bohrloch blau (Anlegen).
 for(const [recipe,orderFiles] of [['gravuru-form-engraving-proof/v1',null],['gravuru-form-engraving-proof/v2',{schema:'gravuru-order-files/v2',surfaces:[{id:'front',files:formProof.metadata.orderFiles.surfaces[0].files}]}]]){
  const formOld=await formPosition('steel',{quiet:true}),formOldSettings=formEngravingSettings({}),formOldKey=digest(JSON.stringify({recipe,settings:formOldSettings}));
  assert.equal(w.exportJobs.forSnapshot(formOld.snapshotId).total,0);
  w.customerDrafts.savePrintProof(formOld.snapshotId,formOldKey,{metadata:{schema:recipe,settings:formOldSettings,pdfSha256:digest(Buffer.from('%PDF-form-alt')),warnings:[],...(orderFiles?{orderFiles}:{})},pdf:Buffer.from('%PDF-form-alt'),archive:orderFiles?formProof.archive:Buffer.from('altes Formpaket')});
  const formOldJob=w.exportJobs.enqueue({snapshotId:formOld.snapshotId,recipeKey:formOldKey,recipe,settings:formOldSettings});assert.equal(formOldJob.status,'completed');
  const formMissing=await call(route(formOld),{format:'pdf'});assert.equal(formMissing.status,409,recipe);assert.equal(formMissing.json.error.message,NOT_TODAY);assert.doesNotMatch(formMissing.json.error.message,/Formprodukt/);
  const formOpened=await outputs(formOld);assert.equal(formOpened.total,2);assert.deepEqual(formOpened.downloads,REBUILDING);
  const formRebuilt=formOpened.jobs.find(j=>j.id!==formOldJob.id);assert.equal(formRebuilt.recipe,FORM_ENGRAVING_RECIPE);await w.exportWorker.wait(formRebuilt.id);
  const formRenewed=await outputs(formOld);assert.deepEqual(formRenewed.downloads,{jobId:formRebuilt.id,formats:[...ORDER_FORMATS],surfaces:[{id:'front',formats:[...ORDER_FORMATS]}],pending:false,note:null});
  const rebuiltMode=w.customerDrafts.printProof(formOld.snapshotId,formRebuilt.recipeKey).metadata.settings.mode;
  assert.deepEqual(checkEngravingPdf(inspect((await call(route(formOld),{format:'pdf'})).bytes),{widthMm:60,heightMm:40,holes:'contour',raster:rebuiltMode==='raster'},'Formprodukt Edelstahl').lines.map(d=>d.color),[BLUE,BLUE]);
  assert.deepEqual((await call('/api/workshop/export-jobs/'+formOldJob.id+'/download',{format:'pdf'})).bytes,Buffer.from('%PDF-form-alt'),'die frühere Ausgabe bleibt abrufbar');
 }
});
