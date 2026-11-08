import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sourcePreviewRelative,sourcePreviewFont,sourcePreviewGlyphCheck} from './prepare-source-preview-supplement.mjs';

test('source image references remain within the pinned designs tree',()=>{
 assert.equal(sourcePreviewRelative('designs/series/id','foto-1.png'),'designs/series/id/foto-1.png');
 assert.equal(sourcePreviewRelative('designs/series/id','../shared.png'),'designs/series/shared.png');
 for(const ref of ['https://example.invalid/photo.png','file:///secret','/secret','..\\secret','../../../secret','x.png?query'])assert.throws(()=>sourcePreviewRelative('designs/series/id',ref));
});
test('source font resolution uses only explicit supplied files or documented substitutions',()=>{
 const supplied=[{name:'Original',datei:'schriften/original.ttf',art:'original'}],registry=[{name:'Allowed',file:'schriften/allowed.ttf'}];
 assert.deepEqual(sourcePreviewFont('Original',supplied,registry,{}),{name:'Original',sourceName:'Original',file:'schriften/original.ttf',substitution:false});
 const replacement=sourcePreviewFont('Missing',supplied,registry,{Missing:'Allowed'});
 assert.equal(replacement.name,'Missing');assert.equal(replacement.sourceName,'Allowed');assert.equal(replacement.substitution,true);
 assert.throws(()=>sourcePreviewFont('Guess',supplied,registry,{}),/Unresolved/);
 assert.throws(()=>sourcePreviewFont('Missing',supplied,[],{Missing:'Allowed'}),/Unresolved/);
});
test('glyph coverage refuses a browser fallback, including supplementary-plane characters',()=>{
 sourcePreviewGlyphCheck('A\n B',[65,66]);
 assert.throws(()=>sourcePreviewGlyphCheck('Aä',[65]),/U\+E4/);
 assert.throws(()=>sourcePreviewGlyphCheck('A😀',[65]),/U\+1F600/);
 sourcePreviewGlyphCheck('😀',[0x1f600]);
});
