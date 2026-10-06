import test from 'node:test';import assert from 'node:assert/strict';
import {outputSpecification} from './output-specification.mjs';
import {specificationRows} from './ui/output-specification.mjs';
test('stored output reports suppressed bleed and frozen profile, without binary payload or private source metadata',()=>{
 const settings={profile:'mimaki',dpi:300,mirror:true,white:'motif',bleedMm:1,whiteBleedMm:1};
 const result={pdf:Buffer.from('not for JSON'),metadata:{settings:{...settings,bleedMm:0,whiteBleedMm:0},edgeInk:false,productionProfile:{revision:1,document:{name:'Gesicherter Stand',machine:'Testmaschine',rip:'Test-RIP',notes:'private notes'}},profileSettingsOverridden:true,photoSources:[{path:'private'}],warnings:['Kein Druck am Außenrand.']}};
 const spec=outputSpecification(result),rows=specificationRows({status:'completed',settings,outputSpecification:spec});
 assert.equal(rows.find(r=>r.key==='bleedMm').requested,'1 mm');assert.equal(rows.find(r=>r.key==='bleedMm').actual,'0 mm');assert.equal(rows.find(r=>r.key==='bleedMm').changed,true);assert.equal(spec.profile.revision,1);assert.equal(spec.edgeInk,false);assert.equal(spec.profileSettingsOverridden,true);assert.equal(spec.settings.mirror,true);
 assert.ok(!JSON.stringify(spec).includes('private'));assert.ok(!Object.hasOwn(spec,'pdf'));assert.equal(result.metadata.settings.bleedMm,0);
});
test('missing historical output metadata never masquerades as requested settings or defaults',()=>{
 assert.equal(outputSpecification(null),null);
 for(const outputSpecification of [null,{settings:{}}]){
  const rows=specificationRows({status:'completed',settings:{profile:'roland',dpi:300,mirror:false,white:'full',bleedMm:0},outputSpecification});
  assert.ok(rows.every(r=>r.actual==='Nicht dokumentiert'&&!r.changed));
 }
 assert.ok(specificationRows({status:'running',settings:{}}).every(r=>r.actual==='Noch keine fertige Ausgabe'));
});
test('vector engraving settings do not imply raster resolution, ink, white or bleed',()=>{
 const settings={mode:'vector',dpi:600,mirror:true},rows=specificationRows({status:'completed',settings,outputSpecification:outputSpecification({metadata:{settings}})});
 assert.deepEqual(rows.map(r=>r.key),['mode','dpi','mirror']);assert.equal(rows[1].actual,'Vektorpfade · keine Rasterauflösung');assert.equal(rows[2].actual,'Ja');
});
