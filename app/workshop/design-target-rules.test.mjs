import test from 'node:test';
import assert from 'node:assert/strict';
import {designTargetRules,assessDesignTarget} from './design-target-rules.mjs';
import {getProcessingProfile,WALNUT_ENGRAVING_TONE} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import fs from 'node:fs';
import {workshopResources} from './catalog.mjs';
const family=(process='steel-engraving')=>({material:{kind:process==='color-print'?'steel':process.split('-')[0],processingProfileId:process}});
const master=body=>({svg:()=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60">'+body+'</svg>'});
const text=(size=3,fill='#000000')=>'<text id="text-1" x="30" y="30" font-family="Test" font-size="'+size+'" fill="'+fill+'">Test</text>';
const motif=(path,attrs='')=>'<g id="motiv-1"><path d="'+path+'" '+attrs+'/></g>';
test('3 mm minimum is identical for engraving and print and reports the text location',()=>{
 for(const process of ['steel-engraving','wood-engraving','acrylic-engraving','slate-engraving','color-print']){
  assert.equal(designTargetRules(master(text()),family(process)).status,'passt');const result=designTargetRules(master(text(2.9)),family(process));assert.equal(result.status,'prüfen');assert.equal(result.details[0].code,'text_below_minimum');assert.deepEqual(result.details[0].location,{xMm:30,yMm:30});
 }
});
test('monochrome source transfers to print without a color restriction; colored source is blocked for engraving',()=>{
 for(const fill of ['#000000','#fff','rgb(80,80,80)'])assert.equal(designTargetRules(master(text(3,fill)),family('color-print')).status,'passt');
 for(const fill of ['#ff0000','red','rgb(80,20,30)']){assert.equal(designTargetRules(master(text(3,fill)),family()).status,'passt nicht');assert.equal(designTargetRules(master(text(3,fill)),family('color-print')).status,'passt');}
 const colored=master(motif('M10 10H30V20H10Z','fill="#0000ff"'));assert.equal(designTargetRules(colored,family()).details[0].code,'color_on_engraving');
});
test('photo placeholders follow the process profile: photo engraving is allowed where tools.photo is set',()=>{
 const source=master('<g id="foto-1"><rect x="20" y="20" width="20" height="20"/></g>');
 for(const profile of ['steel-engraving','slate-engraving','acrylic-engraving','wood-engraving','color-print'])assert.equal(designTargetRules(source,family(profile)).status,'passt',profile);
 assert.ok(!designTargetRules(source,family()).details.some(d=>d.code==='photo_on_engraving'));
});
test('V2A strokes under 0.5 mm warn with motif/path/location and follow target scale',()=>{
 const source=master(motif('M10 10L30 20','fill="none" stroke="#000000" stroke-width="0.49"'));
 const result=designTargetRules(source,family());assert.equal(result.status,'prüfen');assert.equal(result.details[0].code,'v2a_thin_stroke');assert.equal(result.details[0].widthMm,.49);assert.equal(result.details[0].element,'motiv-1');assert.equal(result.details[0].pathIndex,0);
 assert.equal(designTargetRules(source,family(),{scale:2}).status,'passt');assert.equal(designTargetRules(source,family('color-print')).status,'passt');assert.equal(designTargetRules(source,family('slate-engraving')).status,'passt');
 const edge=master(motif('M10 10L30 20','fill="none" stroke="#000000" stroke-width="0.5"'));assert.equal(designTargetRules(edge,family()).status,'passt');
});
test('thin filled and diagonal motif contours warn without modifying the source',()=>{
 for(const path of ['M10 10H30V10.2H10Z','M10 10L30 30L30.14 29.86L10.14 9.86Z']){
  const source=master(motif(path,'fill="#000000"')),before=source.svg();const result=designTargetRules(source,family());assert.equal(result.status,'prüfen');assert.equal(result.details[0].code,'v2a_thin_contour');assert.ok(result.details[0].widthUpperBoundMm<.5);assert.equal(source.svg(),before);
 }
});
test('existing guide layers are not production artwork',()=>{
 const source=master('<text id="guide-1" x="30" y="30" font-family="Test" font-size="1" fill="#00ff00">Guide</text>');assert.equal(designTargetRules(source,family()).status,'passt');
});
test('walnut has an explicitly approximate dark low-contrast engraving tone',()=>{
 const p=getProcessingProfile({material:{kind:'wood',variant:'walnut'},processing:{profileId:'wood-engraving'}});assert.equal(p.id,'wood-engraving');assert.equal(p.approximate,true);assert.equal(p.ink,WALNUT_ENGRAVING_TONE.ink);assert.match(p.label,/Näherung/);assert.match(p.note,/ohne/);
 assert.equal(getProcessingProfile({material:{kind:'wood',variant:'oak'}}).approximate,undefined);
});


test('real mounting holes warn for text without blocking intentional hole proximity or motifs',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url),'utf8')),size=f.sizes[0],fonts=workshopResources().fonts;
 const source=master('<text id="text-1" x="6" y="30" font-family="Montserrat" font-size="4">T</text>'),template={objects:[{id:'text-1',type:'text',text:'T',font:'Montserrat',size:4,x:6,y:30,w:2,h:5,rotation:0,color:'#000000',customerEditable:true}],katalog:{scale:1}};
 const before=JSON.stringify(template),fit=assessDesignTarget({master:source,template,family:f,size,fonts});assert.equal(fit.status,'prüfen');assert.equal(fit.details[0].code,'text_near_hole');assert.equal(fit.details[0].mounting,'B02-E6-D4');assert.deepEqual(fit.details[0].location,{xMm:6,yMm:30});assert.match(fit.issues.join(' '),/bewusst so bestellen/);assert.equal(JSON.stringify(template),before);
 const without=assessDesignTarget({master:source,template,family:f,size:{...size,mounting:['KGL']},fonts});assert.equal(without.status,'passt');
});
