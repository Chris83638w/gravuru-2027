import test from 'node:test';
import assert from 'node:assert/strict';
import {textSizeMm,designTextSize,fitsSurface,fittingTextSize,canColorElement,applyPrintColor,restoreOriginalColors,PRINT_PALETTES,paletteGroups} from './usability-model.mjs';
import {validateUniversalElements} from '../../platform/sources/app/shared/models/universal-elements.mjs';
import {cleanObject} from './contract.mjs';
test('Customer sizes retain hundredths of millimetres, never below four',()=>{
  assert.deepEqual([0,3,4,4.4,4.5,6.8,101].map(v=>textSizeMm(v)),[4,4,4,4.4,4.5,6.8,100]);
  // K10: Mindestgröße aus dem Verfahrensprofil (Druck 3 mm), ungültiges Minimum fällt auf 4 zurück.
  assert.deepEqual([0,2.5,3,4.4].map(v=>textSizeMm(v,3)),[3,3,3,4.4]);
  assert.equal(textSizeMm(2,null),4);assert.equal(designTextSize(3,1,3),3);assert.equal(designTextSize(3,1),4);
});
test('Surface changes with the frame; exact edge is allowed, overrun is not',()=>{
  const object={x:80,y:30,size:10}, bounds={x:-80,y:-5,width:160,height:10};
  assert.equal(fitsSurface(object,bounds,{x:0,y:0,width:160,height:280}),true);
  assert.equal(fitsSurface(object,bounds,{x:10,y:10,width:140,height:260}),false);
  assert.equal(fittingTextSize(object,bounds,{x:10,y:10,width:140,height:260}),8);
});
test('Rotated text and ellipse edges are checked, hidden centering is not performed',()=>{
  const bounds={x:-40,y:-5,width:80,height:10};
  assert.equal(fitsSurface({x:50,y:20,rotation:90},bounds,{x:0,y:0,width:100,height:60}),false);
  assert.equal(fitsSurface({x:50,y:30},bounds,{x:0,y:0,width:100,height:60,shape:'ellipse'}),true);
  assert.equal(fittingTextSize({x:-20,y:20,size:10},bounds,{x:0,y:0,width:100,height:60}),null);
});
test('Auto fit never reduces a long text under four millimetres',()=>{
  assert.equal(fittingTextSize({x:50,y:25,size:20},{x:-500,y:-10,width:1000,height:20},{x:0,y:0,width:100,height:50}),null);
});
test('Print colours stay valid for text and graphics; photos remain original',()=>{
  for(const object of [{type:'text'},{type:'graphic',shape:'rect',filled:true,strokeWidth:1,w:20,h:20}]){
    applyPrintColor(object,'#c93232');
    assert.equal(object.color,'#c93232');
    assert.doesNotThrow(()=>validateUniversalElements({objects:[object]}));
  }
  for(const object of [{type:'photoSlot'},{type:'image',uxUploadKind:'photo'},{type:'text',uxLocked:true},{type:'motif',uxHidden:true}]){
    assert.equal(canColorElement(object),false);
    applyPrintColor(object,'#c93232');assert.equal(object.color,undefined);
  }
});
test('Motifs and upload logos can restore original colours with separate draft flags',()=>{
  const motif={type:'motif'},logo={type:'image',uxUploadKind:'logo',uxUploadId:'local-logo'};
  applyPrintColor(motif,'#edc4cf');applyPrintColor(logo,'#edc4cf');
  assert.equal(motif.preserveColors,false);assert.equal(logo.uxLogoTint,true);
  assert.equal(logo.preserveColors,undefined);assert.equal(cleanObject(logo).uxLogoTint,true);
  restoreOriginalColors(motif);restoreOriginalColors(logo);
  assert.equal(motif.preserveColors,true);assert.equal(logo.uxLogoTint,undefined);
  assert.equal(PRINT_PALETTES.flatMap(([,colors])=>colors).length,20);
});

test('K10: palette swatches follow the process profile list; autofit honours the profile minimum',()=>{
  assert.equal(paletteGroups(null).flatMap(([,c])=>c).length,20);
  assert.deepEqual(paletteGroups(['#C93232','#edc4cf']),[['Standardfarben',[['Rot','#c93232']]],['Pastellfarben',[['Rosé','#edc4cf']]]]);
  assert.deepEqual(paletteGroups(['#abcdef']),[['Weitere Profilfarben',[['#ABCDEF','#abcdef']]]]);
  assert.deepEqual(paletteGroups([]),[]);
  // Text 10 mm, Breite 200 (passt bei 60 mm Fläche erst ab 3 mm): Druckminimum 3 mm greift, Gravurminimum 4 mm nicht.
  assert.equal(fittingTextSize({x:30,y:25,size:10},{x:-100,y:-5,width:200,height:10},{x:0,y:0,width:60,height:50},1,3),3);
  assert.equal(fittingTextSize({x:30,y:25,size:10},{x:-100,y:-5,width:200,height:10},{x:0,y:0,width:60,height:50},1,4),null);
});
