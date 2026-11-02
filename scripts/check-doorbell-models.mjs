import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {plates,baseGeometry,validateConfiguration,configurationSummary} from '../src/lib/configuration.ts';
import pilot from '../src/lib/workshop/steel-pilot.cjs';
assert.equal(plates.bellModels.length,42);
assert.equal(new Set(plates.bellModels.map(m=>m.id)).size,42);
const provenance=JSON.parse(fs.readFileSync('src/lib/workshop/doorbell-provenance.json','utf8'));
for(const m of provenance.models)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/werkstatt/klingeln/'+m.id+'.png')).digest('hex'),m.imageSha256);
for(const m of plates.bellModels){
 const base={...baseGeometry,widthMm:300,heightMm:300};const a=plates.initialAcrylic(base);
 const raw={...base,assembly:{modelId:m.id,reference:m.revision,acrylic:a,bell:null}};
 raw.assembly.bell=plates.centeredBell(raw);const g=plates.validate(raw);
 assert.equal(g.assembly.modelId,m.id);assert.equal(plates.screwWarnings(g).length,0);
 const c=validateConfiguration({material:'edelstahl',method:'gravur',geometry:g,quantity:1,marking:'Test',x:50,y:50,fontSize:10,repeat:'gleich'});assert.ok(configurationSummary(c).includes(m.name));
 const engine={svgBody:()=>''};pilot.apply(engine,plates.product(g,'test','test'));const svg=engine.productionLayerSvg('acrylic');
 for(const path of m.cutPaths)assert.ok(svg.includes(path));assert.ok(!svg.includes('<image'));
 // The same model must also work directly on the base plate.
 const direct=plates.validate({...raw,assembly:{...raw.assembly,acrylic:null}});
 assert.equal(direct.assembly.acrylic,null);assert.equal(plates.screwWarnings(direct).length,0);
 assert.deepEqual(plates.acrylicHoles(direct),[]);
 assert.ok(plates.assemblyPreview(direct).includes(m.imageUrl));
 assert.ok(!plates.assemblyPreview(direct).includes('fill="#45494c"'));
 const directEngine={svgBody:()=>'<g id="gravur"><text>Test</text></g>'};pilot.apply(directEngine,plates.product(direct,'direct','direct'));
 const steelSvg=directEngine.productionLayerSvg('steel');
 for(const path of m.cutPaths){assert.ok(steelSvg.includes(path));assert.ok(!engine.productionLayerSvg('steel').includes(path));}
 assert.ok(steelSvg.includes('<text>Test</text>'));assert.ok(!steelSvg.includes('<image'));assert.ok(steelSvg.includes('stroke="#FF0000"'));
 assert.throws(()=>directEngine.productionLayerSvg('acrylic'),/Keine Acrylebene/);
 assert.throws(()=>directEngine.productionLayerSvg('overview'),/Keine Acrylebene/);
 const dc=validateConfiguration({...c,geometry:direct});assert.match(configurationSummary(dc),/direkt auf Edelstahl/);assert.ok(!configurationSummary(dc).includes('Acrylebene:'));
 const footprint=plates.bellFootprint(direct);
 assert.throws(()=>plates.validate({...direct,assembly:{...direct.assembly,bell:{x:-footprint.x-1,y:40}}}),/Grundplatte/);
 assert.throws(()=>plates.validate({...direct,holeOverrides:[{x:direct.assembly.bell.x+footprint.x+footprint.width/2,y:direct.assembly.bell.y+footprint.y+footprint.height/2,locked:false},null,null,null]}),/Befestigungsbohrung/);
 assert.ok(plates.assemblyPreview(g).includes(m.imageUrl));assert.ok(fs.statSync('public'+m.imageUrl).size>1000);
 assert.throws(()=>plates.validate({...raw,assembly:{...raw.assembly,modelId:'unknown'}}));
 const f=plates.bellFootprint(g);assert.throws(()=>plates.validate({...raw,assembly:{...raw.assembly,bell:{x:a.x-f.x-1,y:a.y-f.y}}}));
}
// Browser and server must use exactly the same geometry/model definitions.
const browser={window:{}};vm.createContext(browser);
for(const f of ['doorbell-reference','doorbell-models','plate-geometry'])vm.runInContext(fs.readFileSync('public/werkstatt/'+f+'.js','utf8'),browser);
assert.equal(JSON.stringify(browser.window.GravuruDoorbellModels),JSON.stringify(plates.bellModels));
assert.equal(JSON.stringify(browser.window.GravuruPlateGeometry.initialAcrylic(baseGeometry)),JSON.stringify(plates.initialAcrylic(baseGeometry)));
console.log('PASS: Both mounting options for 42 models, exact source cut paths, model persistence, footprints, exports, image files, and browser/server parity.');
