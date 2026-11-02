import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {plates,printGeometry,baseGeometry,validateConfiguration,configurationSummary} from '../src/lib/configuration.ts';
const raw={material:'edelstahl',method:'druck',purpose:'gestaltung',quantity:1,marking:'TEST',x:50,y:50,fontSize:10};
for(const finish of ['weiss-matt','klar-hochglanz'])for(const thickness of [3,5]){
 const g=printGeometry({...baseGeometry,baseAcrylicFinish:finish,baseAcrylicThicknessMm:thickness},'edelstahl');assert.equal(g.baseAcrylicThicknessMm,undefined);assert.equal(g.assembly.acrylic.color,finish);assert.equal(g.assembly.acrylic.thicknessMm,thickness);assert.equal(plates.screwWarnings(g).length,0);
 const c=validateConfiguration({...raw,geometry:g});assert.match(configurationSummary(c),/Banding/);assert.equal(printGeometry(g,'acryl').baseAcrylicFinish,finish);
}
const big={...baseGeometry,widthMm:600,heightMm:600,holeCount:0};
for(const model of plates.bellModels){const assembly={reference:model.revision,modelId:model.id,acrylic:null,bell:{x:100,y:100}};assert.throws(()=>plates.validate({...big,baseAcrylicThicknessMm:3,assembly}),/Edelstahl-Grundplatte/);assert.doesNotThrow(()=>plates.validate({...big,assembly}));const g=printGeometry(big,'edelstahl');g.assembly={...assembly,acrylic:g.assembly.acrylic};g.assembly.bell=plates.centeredBell(g);assert.doesNotThrow(()=>plates.validate(g));g.assembly.acrylic.thicknessMm=5;assert.throws(()=>plates.validate(g),/5 mm/);}
const browser={window:{GravuruDoorbellReference:plates.bellReference,GravuruDoorbellModels:plates.bellModels}};vm.runInNewContext(fs.readFileSync('public/werkstatt/plate-geometry.js','utf8'),browser);const g=printGeometry(big,'edelstahl');assert.equal(browser.window.GravuruPlateGeometry.validate(g).assembly.acrylic.color,'weiss-matt');assert.throws(()=>browser.window.GravuruPlateGeometry.validate({...big,baseAcrylicThicknessMm:3,assembly:{reference:plates.bellReference.revision,acrylic:null,bell:{x:100,y:100}}}),/Edelstahl-Grundplatte/);
console.log('PASS: Four printed acrylic/backing variants, safe defaults, banding summary, 42 bells require steel and reject 5 mm; browser/server parity.');
