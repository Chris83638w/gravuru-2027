// Read-only replay of Issue #48/34 with the catalogue's original Italianno.
// No font bytes are stored in the code repository. Usage and provenance: handoff.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {convertFont} from '../app/workshop/font-library.mjs';
import {workshopResources} from '../app/workshop/catalog.mjs';
import {katalogDesignToTemplate,katalogFamilyToProduct,templateFit} from '../app/workshop/katalog-convert.mjs';
import {validateProductDesign} from '../app/workshop/product-model.mjs';
import {surfaceObjectIssue,objectIssue} from '../app/platform/sources/app/shared/models/design-content.mjs';
import {textPaths} from '../app/platform/sources/app/shared/models/doorbell-preview.mjs';
import {fitText} from '../app/configurator/variant-m/workflow-model.mjs';
import {clampToContour} from '../app/configurator/variant-m/edge-clamp.mjs';

if(!process.argv[2])throw Error('Provide the catalogue path to Italianno-Regular.ttf. Nothing is written.');
const bytes=fs.readFileSync(process.argv[2]);
const fontBlob=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
assert.equal(fontBlob,'7b4182a068009d2ff53053f2b9fc63c353910180','Original catalogue font required');
const fonts={...workshopResources().fonts,Italianno:(await convertFont(bytes.toString('base64'))).font};
const source=JSON.parse(fs.readFileSync(new URL('../app/workshop/fixtures/oval-pielstaedt.json',import.meta.url)));
// Exact text layers from design.svg; motifs intentionally outside this text regression.
const svg='<svg viewBox="0 0 90 60"><text id="text-1" data-feld="spruch" x="31.84" y="25.57" font-family="Cinzel" font-size="7.06" fill="#000000" text-anchor="start"><tspan x="31.84" dy="0.00">Familie</tspan></text><text id="text-2" data-feld="name" x="15.59" y="47.22" font-family="Italianno" font-size="22.23" fill="#000000" text-anchor="start"><tspan x="15.59" dy="0.00">Pielstädt</tspan></text></svg>';
const family=JSON.parse(fs.readFileSync(new URL('../app/workshop/fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url)));
family.groups=[{key:'OV',name:'Oval',shape:'ellipse',cornerRadiusMm:0}];
const size={...family.sizes[0],groupKey:'OV'};family.sizes=[size];
const converted=katalogDesignToTemplate({...source,name:'Oval text regression',source:'master',plateMm:[90,60]},family,null,{fonts,svgText:svg});
const template=converted.template,o=template.objects.find(o=>o.text==='Pielstädt');
const profile={kind:'universal-product',material:{kind:'steel'},geometry:{shape:'ellipse',width:90,height:60,safeMarginMm:0,holes:[]}};
const original=structuredClone(o),before=objectIssue(o,profile),rendered=textPaths(o,fonts);
assert.match(before,/ovale/);
assert.equal(surfaceObjectIssue(o,profile,{fonts}),'');
assert.deepEqual(templateFit(template,family,size,fonts),{status:'passt',issues:[]});
assert.equal(fitText(o,{x:-o.w/2,y:-o.h/2,width:o.w,height:o.h},profile.geometry,3,fonts),o.size);
assert.equal(clampToContour(o,profile.geometry,null,null,fonts),false);
assert.deepEqual(o,original);assert.equal(textPaths(o,fonts),rendered);
const {document}=katalogFamilyToProduct(family,{id:'test',name:'Test'},{id:'oval',name:'Oval'},
 {size,fonts,templates:[converted]});
assert.equal(document.config.profile.features.orderEnabled,false);
const design=document.config.profile.designs[0];
assert.doesNotThrow(()=>validateProductDesign(document,design,{template:true}));
const outside=structuredClone(design);outside.objects.find(o=>o.text==='Pielstädt').y+=12;
assert.throws(()=>validateProductDesign(document,outside,{template:true}),/hinaus/);
assert.equal(templateFit(outside,family,size,fonts).status,'passt nicht');
console.log(JSON.stringify({design:source.id,fontBlob,before,after:'passt',actualOverhang:'passt nicht',
 workshopAndCustomer:true,placementUnchanged:true,glyphSvgUnchanged:true,live:false},null,2));
