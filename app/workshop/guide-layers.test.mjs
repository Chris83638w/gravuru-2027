// K3 / Ü6.1: Ebenen mit role 'guide' bleiben in der Vorschau sichtbar und fehlen
// in jeder Fertigungsausgabe (Vertrag, Fertigungs-SVG, Python-Worker).
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {build} from '../configurator/variant-m/build.mjs';import {createWorkshop} from './http.mjs';import {makeProductDocument,validateProductDesign} from './product-model.mjs';import {prepareAcrylicReview} from './acrylic-review.mjs';import {acrylicArtwork} from './acrylic-artwork.mjs';import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';import {renderEngraving} from './form-engraving-proof.mjs';import {importEnvironment} from './design-assets.mjs';
import {cleanObject,validateDesign,quote,isGuideObject,productionObjects,resolvedOptions} from '../configurator/variant-m/contract.mjs';
import {studioSvg} from '../platform/sources/app/shared/models/studio-svg.mjs';
import {validateUniversalElements} from '../platform/sources/app/shared/models/universal-elements.mjs';

const GUIDE={id:'hilfslinie',type:'graphic',shape:'rect',filled:true,strokeWidth:.2,x:100,y:150,w:30,h:30,rotation:0,color:'#b56943',role:'guide',technicalLocked:true,customerEditable:false};
const PRINT={id:'druckflaeche',type:'graphic',shape:'rect',filled:true,strokeWidth:.2,x:25,y:40,w:20,h:20,rotation:0,color:'#b56943',technicalLocked:true,customerEditable:false};
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-guide-layers-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0],w=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});t.after(()=>{w.close();fs.rmSync(dir,{recursive:true,force:true});});
 const c=structuredClone(seed.universal);c.profile.processing.profileId='acrylic-engraving';c.profile.designs[0].objects=[structuredClone(PRINT),structuredClone(GUIDE)];
 const record=w.repository.create(makeProductDocument(c,{name:'Guide-Ebenen · synthetisch',kind:'product'})),config=w.model(record.id,record.revision).universal,design=config.profile.designs[0];
 const preview=execFileSync('python3',['-c',"from PIL import Image;import sys;Image.new('RGBA',(2,2)).save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const input=objects=>({productId:record.id,productRevision:record.revision,designId:design.id,objects,options:{size:'small',base:'none',wall:'none'},quantity:1,media:[],preview});
 return {w,record,config,design,input,bundle:objects=>prepareAcrylicReview({record,config,assets:w.assets,input:input(objects??structuredClone(design.objects))})};
}
function inspect(pdf,points){return JSON.parse(execFileSync('python3',['-c',`import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];k=72/25.4;pix=page.get_pixmap();print(json.dumps([list(pix.pixel(round(x*k),round(y*k))) for x,y in ${JSON.stringify(points)}]))`],{input:pdf,env:importEnvironment()}).toString());}

test('Vertrag: role ist Vorlagenfeld – Kunde kann es weder setzen noch ändern; guide-Motive kosten nichts',t=>{
 const f=fixture(t),{config,design}=f,fonts=config.localResources.fonts,motifs=config.localResources.motifs,options=resolvedOptions(config);
 assert.equal(cleanObject(GUIDE).role,'guide');assert.equal(isGuideObject(GUIDE),true);assert.equal(isGuideObject(PRINT),false);assert.equal(isGuideObject({...PRINT,role:'print'}),false);
 assert.deepEqual(productionObjects([PRINT,GUIDE,{...PRINT,id:'versteckt',uxHidden:true}]).map(o=>o.id),['druckflaeche']);
 const ok=()=>({...structuredClone(design),objects:design.objects.map(cleanObject)});
 validateDesign(config,ok(),options,fonts,motifs);
 const changed=ok();changed.objects.find(o=>o.id==='hilfslinie').role='print';assert.throws(()=>validateDesign(config,changed,options,fonts,motifs),/Ebenenrolle/);
 const promoted=ok();promoted.objects.find(o=>o.id==='druckflaeche').role='guide';assert.throws(()=>validateDesign(config,promoted,options,fonts,motifs),/Ebenenrolle/);
 const invalid=ok();invalid.objects.find(o=>o.id==='druckflaeche').role='hidden';assert.throws(()=>validateDesign(config,invalid,options,fonts,motifs),/Ebenenrolle/);
 assert.throws(()=>validateUniversalElements({objects:[{...PRINT,role:'sonstiges'}]}),/Ebenenrolle/);validateUniversalElements({objects:[GUIDE,PRINT,{...PRINT,role:'print'}]});
 const motif=motifs[0];assert.ok(motif,'Motivbibliothek vorhanden');
 const added=ok();added.objects.push({id:'neu',type:'motif',motif:motif.key,x:70,y:120,w:20,h:20,rotation:0,color:'#000000',role:'guide',customerEditable:true,templateOrigin:false});
 assert.throws(()=>validateDesign(config,added,options,fonts,motifs),/Ebenenrolle/);
 // Produktmodell: role ist strukturell, auch mit vollen Elementrechten nicht änderbar.
 assert.throws(()=>validateProductDesign(f.record.document,changed,{options,fonts,motifs}),/Vorlageneigenschaften|Ebenenrolle/);
 const guideMotif={id:'hilfe-motiv',type:'motif',motif:motif.key,x:70,y:120,w:20,h:20,rotation:0,color:'#000000',role:'guide',templateOrigin:true,customerEditable:false};
 const priced=structuredClone(config);priced.profile.designs[0].objects.push(guideMotif);priced.basePriceCents=1000;priced.extraMotifCents=250;delete priced.acrylic;priced.reviewOnly=false;
 const duplicate={...guideMotif,id:'hilfe-kopie'};
 assert.equal(quote(priced,[PRINT,guideMotif,duplicate],design.id,options).additionalMotifs,0);
});

test('Vorschau zeigt guide-Ebenen mit data-role, Fertigungs-SVG und Gravur-PDF lassen sie aus',async t=>{
 const f=fixture(t),svg=studioSvg(f.config.profile,f.design,f.config.localResources.fonts,{motifs:f.config.localResources.motifs,handles:false});
 assert.match(svg,/data-object="hilfslinie" data-role="guide"/);assert.match(svg,/data-object="druckflaeche" transform/);assert.doesNotMatch(svg,/data-object="druckflaeche" data-role/);
 const bundle=await f.bundle();f.w.customerDrafts.captureAcrylicReview('guide',bundle);
 const art=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.doesNotMatch(art.svg,/data-role="guide"/);assert.equal((art.svg.match(/data-field="native-/g)||[]).length,1,'nur die Druckebene');
 const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256),[print,guide,empty]=inspect(proof.pdf,[[25,40],[100,150],[2,2]]);
 assert.deepEqual(print,[0,0,0]);assert.deepEqual(guide,[255,255,255]);assert.deepEqual(empty,[255,255,255]);
});

test('Python-Worker entfernt data-role="guide" generisch, auch wenn eine Hilfsebene in der SVG steht',async()=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="150mm" height="200mm" viewBox="0 0 150 200"><g data-field="a"><rect x="15" y="30" width="20" height="20" fill="#000"/></g><g data-field="b" data-role="guide"><rect x="85" y="135" width="30" height="30" fill="#000"/></g><g data-preview-only="true" data-role="guide"><text x="75" y="100" font-size="8">Hier Foto hochladen</text></g></svg>';
 const geometry={schema:'gravuru-contour/v1',widthMm:150,heightMm:200,holeCount:0,contours:[{role:'outer',d:'M0 0H150V200H0Z'}]};
 const raw=await renderEngraving({svg,geometry,settings:{mode:'raster',dpi:300,mirror:false},photoFields:[],photos:[]}),[print,guide,hint]=inspect(Buffer.from(raw.pdf,'base64'),[[25,40],[100,150],[75,98]]);
 assert.deepEqual(print,[0,0,0]);assert.deepEqual(guide,[255,255,255]);assert.deepEqual(hint,[255,255,255]);
 // Ohne den guide-Filter würde der Fotohinweis-Text (nicht in Pfade gewandelt) die Vektorprüfung auslösen.
 const vector=await renderEngraving({svg,geometry,settings:{mode:'vector',dpi:300,mirror:false},photoFields:[],photos:[]});assert.equal(vector.pixelWidth,null);
 await assert.rejects(()=>renderEngraving({svg:svg.replace(' data-role="guide"><text',' data-role="print"><text'),geometry,settings:{mode:'vector',dpi:300,mirror:false},photoFields:[],photos:[]}),/Schrift/);
});
