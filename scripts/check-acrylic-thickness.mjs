import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {plates,baseGeometry,validateConfiguration,configurationSummary} from '../src/lib/configuration.ts'
const seed={...baseGeometry,holeCount:0},layer=plates.initialAcrylic(seed),g={...seed,assembly:{reference:plates.bellReference.revision,acrylic:layer,bell:null}}
const raw={material:'acryl',method:'zuschnitt',geometry:seed,quantity:1,x:50,y:50,fontSize:10}
for(const t of [3,5]){const c=validateConfiguration({...raw,geometry:{...seed,baseAcrylicThicknessMm:t}});assert.equal(c.geometry.baseAcrylicThicknessMm,t);assert.match(configurationSummary(c),new RegExp('Acrylglasstärke: '+t+' mm'));assert.equal(plates.product(c.geometry,'x','x').thicknessMm,t);assert.equal(plates.validate({...g,assembly:{...g.assembly,acrylic:{...layer,thicknessMm:t}}}).assembly.acrylic.thicknessMm,t)}
for(const m of plates.bellModels){const a={reference:m.revision,modelId:m.id,acrylic:null,bell:{x:100,y:30}};assert.throws(()=>plates.validate({...seed,baseAcrylicThicknessMm:5,assembly:a}),/5 mm/);assert.throws(()=>plates.validate({...g,assembly:{...a,acrylic:{...layer,thicknessMm:5}}}),/5 mm/)}
assert.throws(()=>plates.validate({...seed,baseAcrylicThicknessMm:4}));assert.throws(()=>plates.validate({...g,assembly:{...g.assembly,acrylic:{...layer,thicknessMm:4}}}));
const browser={window:{GravuruDoorbellReference:plates.bellReference,GravuruDoorbellModels:plates.bellModels}};vm.runInNewContext(fs.readFileSync('public/werkstatt/plate-geometry.js','utf8'),browser);assert.throws(()=>browser.window.GravuruPlateGeometry.validate({...g,assembly:{...g.assembly,acrylic:{...layer,thicknessMm:5},bell:{x:100,y:30}}}),/5 mm/)
console.log('PASS: Both acrylic variants support 3/5 mm; all 42 bells rejected on 5 mm; persisted thickness, summary, product metadata and browser validation checked.')
