import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedEditorDesign,editorDesignPath} from './ui/editor-design-link.mjs';
const designs=[{id:'katalog-D1'},{id:'katalog-D250'}];
test('review link selects exactly the requested design without changing the default',()=>{
 assert.equal(linkedEditorDesign('?configuration=cfg_a&design=katalog-D250','cfg_a',designs,'katalog-D1'),'katalog-D250');
 assert.deepEqual(designs,[{id:'katalog-D1'},{id:'katalog-D250'}]);
});
test('unknown design and different product use the actual default',()=>{
 assert.equal(linkedEditorDesign('?configuration=cfg_a&design=missing','cfg_a',designs,'katalog-D1'),'katalog-D1');
 assert.equal(linkedEditorDesign('?configuration=cfg_b&design=katalog-D250','cfg_a',designs,'katalog-D1'),'katalog-D1');
});
test('save/reload link retains explicit selection and the local gallery context',()=>{
 assert.equal(editorDesignPath('?reviewGallery=1','cfg_a','katalog-D250'),'/werkstatt/?configuration=cfg_a&design=katalog-D250&reviewGallery=1');
});
