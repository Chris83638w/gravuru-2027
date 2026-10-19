import test from 'node:test';
import assert from 'node:assert/strict';
import {acrylicPhotoResolution as measure} from './acrylic-photo-resolution.mjs';

const photo={uploadId:'test',path:'fotos/original.png',width:1200,height:600};
const slot={id:'photo',type:'photoSlot',w:101.6,h:50.8};
test('native photo density follows physical scale and crop zoom, not pan or rotation',()=>{
 assert.equal(measure(slot,photo,1).effectiveDpi,300);
 assert.equal(measure(slot,photo,2).effectiveDpi,150);
 const zoomed={...slot,uxPhotoCrop:{zoom:2,x:1,y:-1,angle:90},rotation:37};
 assert.equal(measure(zoomed,photo,1).effectiveDpi,150);
 assert.equal(measure({...zoomed,uxPhotoCrop:{zoom:2}},photo,1).effectiveDpi,150);
 assert.equal(measure({...slot,w:50.8},photo,1).effectiveDpi,300); // cover, not squeezed pixels
});
test('edited image pixels and each placement determine density; originals remain intact',()=>{
 const edited={...photo,edited:{path:'fotos/edited.png',width:200,height:200}};
 const result=measure(slot,edited,1);
 assert.equal(result.frameCovered,true);assert.equal(measure({...slot,uxPhotoCrop:{zoom:.5}},edited,1).frameCovered,false);assert.equal(result.source,'edited');assert.equal(result.effectiveDpi,50);
 assert.equal(result.placedHeightMm,101.6);assert.equal(result.path,'fotos/edited.png');
 assert.equal(photo.width,1200);assert.equal(edited.width,1200);
 assert.equal(measure({...slot,w:50.8,h:25.4},edited,1).effectiveDpi,100);
 assert.equal(measure(slot,{...photo,width:0},1),null);
});
test('free uploads use contained image dimensions rather than the photo-slot cover',()=>{
 const square={...slot,type:'image',w:101.6,h:101.6};
 const contained=measure(square,photo,1),covered=measure({...square,type:'photoSlot'},photo,1);
 assert.equal(contained.effectiveDpi,300);assert.equal(contained.placedHeightMm,50.8);
 assert.equal(covered.effectiveDpi,150);assert.equal(covered.placedWidthMm,203.2);
});
import {resolutionGrade,resolutionHint,photoResolutionNote,resolutionTargetDpi,LOW_RESOLUTION_HINT} from './acrylic-photo-resolution.mjs';
test('Ü5.1: Ampel grün ab Soll-DPI, gelb ab 60 %, rot darunter; Soll aus Fertigungsprofil, sonst 300',()=>{
 assert.equal(resolutionGrade(300,300),'gruen');assert.equal(resolutionGrade(180,300),'gelb');assert.equal(resolutionGrade(179,300),'rot');
 assert.equal(resolutionGrade(600,600),'gruen');assert.equal(resolutionGrade(360,600),'gelb');assert.equal(resolutionGrade(300,600),'rot');
 assert.equal(resolutionGrade(50),'rot');assert.throws(()=>resolutionGrade(NaN,300));assert.throws(()=>resolutionGrade(100,0));
 assert.equal(resolutionTargetDpi(null),300);assert.equal(resolutionTargetDpi({document:{output:{dpi:600,mirror:true}}}),600);assert.equal(resolutionTargetDpi({document:{output:{mode:'vector',dpi:300}}}),300);
 // K10: ohne Maschinenprofil zählt das Soll des Verfahrensprofils (Objekt oder Kennung), sonst 300.
 assert.equal(resolutionTargetDpi(null,'color-print'),300);assert.equal(resolutionTargetDpi(null,{id:'x',targetDpi:600}),600);assert.equal(resolutionTargetDpi(null,{id:'x',targetDpi:null}),300);
 assert.equal(resolutionTargetDpi({document:{output:{dpi:600}}},{id:'x',targetDpi:150}),600);assert.equal(resolutionTargetDpi(null,'unbekannt'),300);
 assert.equal(measure(slot,photo,2,{targetDpi:600}).grade,'rot');assert.equal(measure(slot,photo,1).grade,'gruen');assert.equal(measure(slot,photo,1).targetDpi,300);
});
test('Ü5.2: rot ergibt den freundlichen Hinweis und den Vermerk „Auflösung niedrig“ – keine Sperre, keine Bestätigung',()=>{
 const red=photoResolutionNote(100,300),yellow=photoResolutionNote(200,300),green=photoResolutionNote(400,300);
 assert.deepEqual(red,{grade:'rot',effectiveDpi:100,targetDpi:300,hint:LOW_RESOLUTION_HINT,productionNote:'Auflösung niedrig'});
 assert.equal(red.hint,'Das Foto ist klein, wir holen das Beste raus.');assert.equal(resolutionHint('rot'),LOW_RESOLUTION_HINT);
 assert.equal(yellow.grade,'gelb');assert.equal(yellow.productionNote,'Auflösung knapp');assert.ok(yellow.hint);
 assert.deepEqual(green,{grade:'gruen',effectiveDpi:400,targetDpi:300,hint:'',productionNote:''});
 for(const note of [red,yellow,green])assert.ok(!('blocked' in note)&&!('confirmationRequired' in note));
});
