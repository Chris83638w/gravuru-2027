import test from 'node:test';
import assert from 'node:assert/strict';
import {slateGalleryHtml} from './lib/slate-review-gallery.mjs';
const row={id:'GT-S-30x20-D1',group:'Menschen',subcategory:'Allgemein',process:'Gravur',photoSlots:1,files:[{name:'preview.png'}],targets:[{mm:[300,200],sizeKey:'large',status:'prepared'},{mm:[220,140],sizeKey:'small',status:'prepared'}]};
const imported={products:[{key:'large:Menschen',productId:'cfg_a',designIds:[row.id]},{key:'small:Menschen',productId:'cfg_b',designIds:[row.id]}]};
test('both sizes open their actual imported product and the original design',()=>{
 const html=slateGalleryHtml({originals:[row]},imported);
 assert.match(html,/configuration=cfg_a&amp;design=katalog-GT-S-30x20-D1&amp;reviewGallery=1/);
 assert.match(html,/configuration=cfg_b&amp;design=katalog-GT-S-30x20-D1&amp;reviewGallery=1/);
 assert.match(html,/\/api\/workshop\/products\/cfg_a\/preview.svg\?designId=/);
 assert.doesNotMatch(html,/(?:\?|&(?:amp;)?)revision=/); // The gallery must show subsequent saved changes.
});
test('incomplete print sources stay visible as print without an invented editor',()=>{
 const html=slateGalleryHtml({originals:[{...row,process:'UV',targets:[],reason:'Bilddatei fehlt'}]},imported);
 assert.match(html,/UV-Druck/);assert.match(html,/Bilddatei fehlt/);assert.doesNotMatch(html,/class="edit"/);
});
test('partial preparation offers editing only for the available size',()=>{
 const html=slateGalleryHtml({originals:[{...row,targets:[row.targets[0],{...row.targets[1],status:'open',reason:'Schrift fehlt'}]}]},imported);
 assert.match(html,/30 × 20 bearbeiten/);assert.doesNotMatch(html,/22 × 14 bearbeiten/);assert.match(html,/Schrift fehlt/);
});
