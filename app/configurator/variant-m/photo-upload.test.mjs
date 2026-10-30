import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PHOTO_ACCEPT,photoTapPassThrough,replaceablePhotoSlot,emptyPhotoSlotAt,tapTracker,isHeicFile,HEIC_MESSAGE,canvasSize,CANVAS_MAX_PIXELS,normalizePhotoFile} from './photo-upload.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));

// Kleine DOM-Attrappe: Knoten mit closest() über data-Attribute, Wurzel mit elementsFromPoint().
function node(attrs,parent=null){return {dataset:attrs.dataset||{},parent,attrs,closest(selector){let n=this;while(n){if(matches(n,selector))return n;n=n.parent;}return null;}};}
function matches(n,selector){return selector.split(',').some(sel=>{const m=sel.trim().match(/^\[([a-z-]+)\]$/);if(!m)return false;const key=m[1].replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return n.dataset[key]!==undefined;});}
const group=(id,extra={})=>node({dataset:{object:id,...extra}});
const child=parent=>node({},parent);

const slot={id:'photo-main',type:'photoSlot'},frame={id:'photo-frame',type:'graphic',filled:false,acrylicFixed:true},text={id:'names',type:'text'};
const objects=[slot,frame,text];

test('Fotorahmen ohne Füllung oder feste Acrylkontur ist für den Fototipp durchlässig, Texte nicht',()=>{
  assert.equal(photoTapPassThrough(frame),true);
  assert.equal(photoTapPassThrough({type:'graphic',filled:false}),true);
  assert.equal(photoTapPassThrough({type:'graphic',filled:true}),false);
  assert.equal(photoTapPassThrough(text),false);
  assert.equal(photoTapPassThrough(undefined),false);
});

test('Leerer Fotobereich wird direkt und unter dem Rahmen getroffen; Rechte, Sperre und Upload zählen',()=>{
  const slotGroup=group('photo-main',{uxEmptyPhotoSlot:'true'}),frameGroup=group('photo-frame'),textGroup=group('names');
  const hint=child(slotGroup);
  // Direkt auf dem Hinweis.
  assert.deepEqual(emptyPhotoSlotAt(null,objects,hint,null),{slot,through:false});
  // Rahmen liegt oben: elementsFromPoint liefert Rahmen, dann Fotobereich.
  const root={elementsFromPoint:()=>[child(frameGroup),child(slotGroup)]};
  assert.deepEqual(emptyPhotoSlotAt(root,objects,child(frameGroup),{x:1,y:1}),{slot,through:true});
  // Ein Text über dem Foto bleibt ein Texttipp.
  assert.equal(emptyPhotoSlotAt({elementsFromPoint:()=>[child(textGroup),child(slotGroup)]},objects,child(textGroup),{x:1,y:1}),null);
  // Griffe (Größe ändern) sind nie ein Fototipp.
  assert.equal(emptyPhotoSlotAt(root,objects,node({dataset:{resize:'photo-main'}}),{x:1,y:1}),null);
  // Ohne Ersetzrecht, gesperrt oder schon mit eigenem Foto: kein Fototipp.
  assert.equal(emptyPhotoSlotAt(root,objects,hint,null,{canReplace:()=>false}),null);
  assert.equal(emptyPhotoSlotAt(root,[{...slot,uxLocked:true},frame],hint,null),null);
  assert.equal(emptyPhotoSlotAt(root,[{...slot,uxUploadId:'u1'},frame],child(frameGroup),{x:1,y:1}),null);
  assert.equal(replaceablePhotoSlot({...slot,uxHidden:true}),false);
});

test('Tipp gilt nur ohne Ziehen und für denselben Zeiger',()=>{
  const t=tapTracker(),hit={slot};
  t.down({pointerId:1,clientX:10,clientY:10},hit);assert.equal(t.up({pointerId:1,clientX:14,clientY:13}),'photo-main');
  t.down({pointerId:1,clientX:10,clientY:10},hit);assert.equal(t.up({pointerId:1,clientX:30,clientY:10}),null);
  t.down({pointerId:1,clientX:10,clientY:10},hit);assert.equal(t.up({pointerId:2,clientX:10,clientY:10}),null);
  t.down({pointerId:1,clientX:10,clientY:10},hit);t.cancel();assert.equal(t.up({pointerId:1,clientX:10,clientY:10}),null);
  t.down({pointerId:1,clientX:10,clientY:10},null);assert.equal(t.up({pointerId:1,clientX:10,clientY:10}),null);
});

test('HEIC wird erkannt, in JPEG gewandelt, wenn der Browser es liest, sonst verständlich gemeldet',async()=>{
  assert.equal(isHeicFile({type:'image/heic',name:'IMG_1.HEIC'}),true);
  assert.equal(isHeicFile({type:'',name:'IMG_1.heif'}),true);
  assert.equal(isHeicFile({type:'image/jpeg',name:'IMG_1.heic'}),false);
  assert.equal(isHeicFile({type:'image/jpeg',name:'foto.jpg'}),false);
  const jpeg=new File([new Uint8Array([1])],'foto.jpg',{type:'image/jpeg'});
  assert.equal(await normalizePhotoFile(jpeg,{decode:()=>{throw Error('nicht aufrufen');}}),jpeg);
  const heic=new File([new Uint8Array([0,0,0,28])],'IMG_0420.HEIC',{type:'image/heic'});
  const converted=await normalizePhotoFile(heic,{decode:async()=>new Blob([new Uint8Array([255,216,255])],{type:'image/jpeg'})});
  assert.equal(converted.type,'image/jpeg');assert.equal(converted.name,'IMG_0420.jpg');
  await assert.rejects(normalizePhotoFile(heic,{decode:async()=>null}),error=>error.message===HEIC_MESSAGE&&/JPG/.test(error.message));
  await assert.rejects(normalizePhotoFile(heic,{decode:async()=>{throw Error('kaputt');}}),{message:HEIC_MESSAGE});
  // Große iPhone-Fotos (48 MP) passen nach dem Verkleinern in die Canvas-Grenze von iOS.
  const size=canvasSize(8064,6048);assert.ok(size.width*size.height<=CANVAS_MAX_PIXELS);assert.ok(size.width/size.height>1.33&&size.width/size.height<1.34);
  assert.deepEqual(canvasSize(1200,900),{width:1200,height:900});
});

test('Alle Foto-Eingabefelder des Kundeneditors: Galerie wählbar (JPG/PNG/WebP, kein capture)',()=>{
  assert.equal(PHOTO_ACCEPT,'image/jpeg,image/png,image/webp');
  for(const file of ['ux.mjs','acrylic-scene.mjs','photo-upload.mjs']){
    const source=fs.readFileSync(path.join(HERE,file),'utf8');
    assert.doesNotMatch(source,/capture=|\.capture\s*=|setAttribute\('capture'/,file);
  }
  const acceptExpression=fs.readFileSync(path.join(HERE,'ux.mjs'),'utf8').match(/accept="\$\{([^}]+)\}" data-ux-file/)[1];
  const accept=new Function('vectorLogos','VECTOR_LOGO_ACCEPT','PHOTO_ACCEPT','return '+acceptExpression);
  assert.equal(accept(false,'.svg,image/svg+xml',PHOTO_ACCEPT),PHOTO_ACCEPT,'Fotoprodukte behalten ausschließlich JPG/PNG/WebP');
  assert.equal(accept(true,'.svg,image/svg+xml',PHOTO_ACCEPT),'.svg,image/svg+xml','neuer Vektorlogo-Stand erlaubt keine Rasterbilder');
  assert.match(fs.readFileSync(path.join(HERE,'acrylic-scene.mjs'),'utf8'),/photoInput\.accept=PHOTO_ACCEPT/);
});

test('Fotohinweis ist als Vorschau-Hilfe markiert und fehlt in Prüfansicht und Fertigungsdatei',()=>{
  const scene=fs.readFileSync(path.join(HERE,'acrylic-scene.mjs'),'utf8'),completion=fs.readFileSync(path.join(HERE,'completion.mjs'),'utf8'),placeholder=fs.readFileSync(path.join(HERE,'photo-placeholder.mjs'),'utf8');
  assert.match(scene,/<g data-preview-only="true" data-role="guide" data-ux-photo-hint="true"/);
  assert.match(placeholder,/data-ux-photo-hint="true"/);
  assert.match(completion,/\[data-ux-photo-hint\]'\)\.forEach\(n=>n\.remove\(\)\)/);
  assert.match(scene,/querySelectorAll\('\[data-preview-only\],\[data-role="guide"\]/);
});

test('Früher Fototipp wird direkt nach dem ersten Zeichnen eingebaut und von der Oberfläche abgelöst',()=>{
  const build=fs.readFileSync(path.join(HERE,'build.mjs'),'utf8'),ux=fs.readFileSync(path.join(HERE,'ux.mjs'),'utf8');
  assert.match(build,/await mount\(form\.value\);const specimen=host\.querySelector\('gravuru-configurator'\);if\(window\.parent\.UniversalConfig\)adapter\.installEarlyPhotoTap\(specimen,window\.parent\.UniversalConfig\);/);
  assert.match(ux,/el\.uxPhotoTapReady=true;/);
  assert.match(ux,/el\.addEventListener\('gravuru-early-photo',takeEarlyPhoto\);takeEarlyPhoto\(\);/);
});
