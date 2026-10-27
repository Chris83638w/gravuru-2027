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
