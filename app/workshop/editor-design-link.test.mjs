import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedEditorDesign,editorDesignPath,quickReviewRequested,reviewGalleryPath} from './ui/editor-design-link.mjs';
const designs=[{id:'katalog-D1'},{id:'katalog-D250'}];
test('review link selects exactly the requested design without changing the default',()=>{
 assert.equal(linkedEditorDesign('?configuration=cfg_a&design=katalog-D250','cfg_a',designs,'katalog-D1'),'katalog-D250');
 assert.deepEqual(designs,[{id:'katalog-D1'},{id:'katalog-D250'}]);
});
test('unknown design and different product use the actual default',()=>{
 assert.equal(linkedEditorDesign('?configuration=cfg_a&design=missing','cfg_a',designs,'katalog-D1'),'katalog-D1');
 assert.equal(linkedEditorDesign('?configuration=cfg_b&design=katalog-D250','cfg_a',designs,'katalog-D1'),'katalog-D1');
});
test('quick review distinguishes a loaded design from a missing one using product data without gallery tiles',()=>{
 const search=new URLSearchParams({configuration:'cfg_a',design:'katalog-D250',reviewGallery:'1',reviewQuick:'1'});
 assert.equal(linkedEditorDesign(search,'cfg_a',designs,null),'katalog-D250');
 search.set('design','katalog-missing');
 assert.equal(linkedEditorDesign(search,'cfg_a',designs,null),null);
});
test('save/reload link retains explicit selection and the local gallery context',()=>{
 assert.equal(editorDesignPath('?reviewGallery=1','cfg_a','katalog-D250'),'/werkstatt/?configuration=cfg_a&design=katalog-D250&reviewGallery=1');
});
test('quick editing survives saving without leaking into regular workshop navigation',()=>{
 const path=editorDesignPath('?reviewGallery=1&reviewQuick=1&session=secret','cfg_a','katalog-D250');
 assert.equal(path,'/werkstatt/?configuration=cfg_a&design=katalog-D250&reviewGallery=1&reviewQuick=1');
 assert.equal(quickReviewRequested(new URL(path,'https://review.test').search),true);
 assert.equal(quickReviewRequested('?reviewQuick=1'),false);
 assert.equal(quickReviewRequested('?reviewGallery=1&reviewQuick=0'),false);
 assert.equal(editorDesignPath('?reviewQuick=1','cfg_a','katalog-D250'),'/werkstatt/?configuration=cfg_a&design=katalog-D250');
});
test('review return addresses the exact catalogue card without external destinations',()=>{
 assert.equal(reviewGalleryPath('katalog-D250'),'/originale/#design-D250');
 assert.equal(reviewGalleryPath('katalog-Hund 2'),'/originale/#design-Hund%202');
 assert.equal(reviewGalleryPath('https://outside.test'),'/originale/');
 assert.equal(reviewGalleryPath(undefined),'/originale/');
});
