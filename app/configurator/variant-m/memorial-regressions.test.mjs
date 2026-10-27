import test from 'node:test';
import assert from 'node:assert/strict';
import {measureText,textPaths} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {validateDesignContent} from '../../platform/sources/app/shared/models/design-content.mjs';
import {commerceStatus} from './commerce-status.mjs';
import {completeFontGlyphs} from '../../workshop/complete-font-glyphs.mjs';
import {physicalTextSize} from './usability-model.mjs';
const glyph={a:500,d:'M0 0V700H450V0Z'};
const incomplete={regular:{units:1000,glyphs:{W:glyph,u:glyph,n:glyph,s:glyph,h:glyph,m:glyph,a:glyph}}};
const object=()=>({id:'name',type:'text',text:'Wunschmann',font:'Poppins',size:22.39,w:59.82608,h:26.868,x:110,y:30,rotation:0});
test('missing glyph cannot leave a stale frame or vanish from the preview',()=>{
 const o=object();assert.throws(()=>measureText(o,{Poppins:incomplete}),/Zeichen „c“/);
 assert.equal(o.w,(9*500+600)*22.39/1000);
 const paths=textPaths(o,{Poppins:incomplete});assert.equal((paths.match(/<path /g)||[]).length,10);
 assert.equal(o.h,22.39*1.2);
});
test('complete original face keeps every existing outline and advance',()=>{
 const original=structuredClone(incomplete),full=structuredClone(incomplete);full.regular.glyphs.c={a:480,d:'M40 0V700'};
 const result=completeFontGlyphs(original,full);assert.equal(result.added,1);assert.deepEqual(original,incomplete);
 for(const c of Object.keys(incomplete.regular.glyphs))assert.deepEqual(result.font.regular.glyphs[c],incomplete.regular.glyphs[c]);
 const o=object();assert.doesNotThrow(()=>measureText(o,{Poppins:result.font}));assert.equal(o.w,(9*500+480)*22.39/1000);
 assert.equal((textPaths(o,{Poppins:result.font}).match(/<path /g)||[]).length,10);
});
test('another font, missing cut or mismatching units cannot supplement the original',()=>{
 const bad=structuredClone(incomplete);bad.regular.glyphs.W={...glyph,a:510};assert.throws(()=>completeFontGlyphs(incomplete,bad),/Zeichenbreiten/);
 bad.regular.units=2048;assert.throws(()=>completeFontGlyphs(incomplete,bad),/Einheiten/);
 assert.throws(()=>completeFontGlyphs({...incomplete,bold:incomplete.regular},incomplete),/Schriftschnitt/);
});
test('customer size is shown in whole physical millimetres, including scaled plates',()=>{
 assert.equal(physicalTextSize({size:22.38999938964844}),22);
 assert.equal(physicalTextSize({size:22.6}),23);
 assert.equal(physicalTextSize({size:7.6},2),15);
});
test('geometry and rotation errors identify the actual defect without weakening validation',()=>{
 const d={id:'D1',objects:[object()]};assert.doesNotThrow(()=>validateDesignContent(d));
 d.objects[0].w=0;assert.throws(()=>validateDesignContent(d),/Breite und Höhe/);
 d.objects[0].w=50;d.objects[0].rotation=361;assert.throws(()=>validateDesignContent(d),/Drehung/);
 d.objects[0].rotation=0;d.objects[0].x=NaN;assert.throws(()=>validateDesignContent(d),/Position/);
 d.objects[0].x=110;assert.doesNotThrow(()=>validateDesignContent(d));
});
test('editing after a rejected cart attempt clears its obsolete error; selection does not',()=>{
 const status=commerceStatus();status.fail('Drehung ist ungültig','design-A');
 assert.equal(status.message('design-A'),'Drehung ist ungültig');assert.equal(status.message('design-B'),'');
 status.fail('Schrift fehlt','design-B');status.clear();assert.equal(status.message('design-B'),'');
});

import {patchPreviewManifest} from '../../../legacy-patches/memorial-editor-compat.mjs';
test('preview repair updates the sealed file list and preserves all product metadata',()=>{
 const source={schema:'gravuru-product-preview/v1',orderEnabled:false,shopifyProductId:'16138083107196',designIds:['GT-S-2-2'],files:[{path:'models.json',bytes:20,sha256:'old'},{path:'photo.webp',bytes:8,sha256:'photo'}]};
 const result=patchPreviewManifest(source,[{path:'models.json',before:'old',beforeBytes:20,after:'new',bytes:30},{path:'configurator/variant-m/commerce-status.mjs',before:null,after:'status',bytes:5}]);
 assert.deepEqual(result.files,[{path:'models.json',bytes:30,sha256:'new'},{path:'photo.webp',bytes:8,sha256:'photo'},{path:'configurator/variant-m/commerce-status.mjs',bytes:5,sha256:'status'}]);
 assert.deepEqual({...result,files:source.files},source);assert.equal(source.files[0].sha256,'old');
 assert.throws(()=>patchPreviewManifest(source,[{path:'models.json',before:'wrong',beforeBytes:20,after:'new',bytes:30}]),/nicht überein/);
 assert.throws(()=>patchPreviewManifest(source,[{path:'models.json',before:null,after:'new',bytes:30}]),/bereits/);
 assert.throws(()=>patchPreviewManifest({...source,orderEnabled:true},[]),/Unbekanntes/);
});

import {patchMemorialWorkflow} from '../../../legacy-patches/memorial-editor-compat.mjs';
test('legacy workflow cannot overwrite whole customer millimetres after synchronization',()=>{
 const source="$('#ux-size').step='.01';$('#ux-size').value=selected().size;";
 const patched=patchMemorialWorkflow(source);
 function run(embedded){const field={};new Function('$','selected','config',patched)(()=>field,()=>({size:22.53}),{workbench:{embedded}});return field;}
 assert.deepEqual(run(false),{step:'1',value:23});assert.deepEqual(run(true),{step:'.01',value:22.53});
});
