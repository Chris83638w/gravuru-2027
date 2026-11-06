import test from 'node:test';
import assert from 'node:assert/strict';
import {slateGalleryHtml} from './lib/slate-review-gallery.mjs';
const row={id:'GT-S-30x20-D1',group:'Menschen',subcategory:'Allgemein',process:'Gravur',photoSlots:1,files:[{name:'preview.png'}],targets:[{mm:[300,200],sizeKey:'large',status:'prepared'},{mm:[220,140],sizeKey:'small',status:'prepared'}]};
const imported={products:[{key:'large:Menschen',productId:'cfg_a',designIds:[row.id]},{key:'small:Menschen',productId:'cfg_b',designIds:[row.id]}]};
test('one configurator preview per card with inline movement and the full workshop link',()=>{
 const html=slateGalleryHtml({originals:[row]},imported);
 assert.match(html,/configuration=cfg_a&amp;design=katalog-GT-S-30x20-D1&amp;reviewGallery=1/);
 assert.match(html,/configuration=cfg_b&amp;design=katalog-GT-S-30x20-D1&amp;reviewGallery=1/);
 assert.doesNotMatch(html,/reviewQuick/);
 assert.match(html,/data-inline-open/);assert.match(html,/data-inline-save disabled>Speichern/);
 assert.match(html,/data-product-id="cfg_a" data-design-id="katalog-GT-S-30x20-D1"/);
 assert.match(html,/>Bearbeiten<\/a>/);
 assert.match(html,/\/api\/workshop\/products\/cfg_a\/preview.svg\?designId=/);
 assert.equal((html.match(/<img /g)||[]).length,1);
 assert.match(html,/<select data-format/);
 assert.match(html,/id="design-GT-S-30x20-D1"/);
 assert.doesNotMatch(html,/\/files\/originals\//);
 assert.doesNotMatch(html,/(?:\?|&(?:amp;)?)revision=/); // The gallery must show subsequent saved changes.
});
test('incomplete print sources stay visible as print without an invented editor',()=>{
 const html=slateGalleryHtml({originals:[{...row,process:'UV',targets:[],reason:'Bilddatei fehlt'}]},imported);
 assert.match(html,/UV-Druck/);assert.match(html,/Bilddatei fehlt/);assert.doesNotMatch(html,/class="edit"|<img /);
});
test('partial preparation offers editing only for the available size',()=>{
 const html=slateGalleryHtml({originals:[{...row,targets:[row.targets[0],{...row.targets[1],status:'open',reason:'Schrift fehlt'}]}]},imported);
 assert.match(html,/30 × 20 cm/);assert.doesNotMatch(html,/<select data-format|configuration=cfg_b/);assert.match(html,/22 × 14 cm: Schrift fehlt/);
});

test('theme sections follow catalogue photo categories in the requested order',()=>{
 const rows=[{...row,id:'person',photoSlots:0},{...row,id:'dog-photo',group:'Tiere',subcategory:'Hund'},{...row,id:'dog',group:'Tiere',subcategory:'Hund',photoSlots:0}];
 const html=slateGalleryHtml({originals:rows},{products:[]});
 assert(html.indexOf('<h2>Hunde ohne Foto')<html.indexOf('<h2>Hunde mit Foto'));
 assert(html.indexOf('<h2>Hunde mit Foto')<html.indexOf('<h2>Menschen ohne Foto'));
 assert.equal((html.match(/class="card-grid"/g)||[]).length,3);
});
