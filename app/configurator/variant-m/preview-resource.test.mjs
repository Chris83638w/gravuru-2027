import test from 'node:test';
import assert from 'node:assert/strict';
import {previewResourceURL,previewResourceMarkup} from './preview-resource.mjs';
import {artworkFragment,isArtworkResource} from './artwork-resource.mjs';
const path='/api/workshop/design-assets/'+'a'.repeat(64)+'/preview.svg';
test('private renderer uses authenticated parent image bytes and keeps unresolved resources unchanged',t=>{
 const old=globalThis.window;t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
 const png='data:image/png;base64,aGVsbG8=';globalThis.window={parent:{GravuruPreviewResources:{[path]:png}}};assert.equal(previewResourceURL(path),png);assert.equal(previewResourceURL('/acrylic-assets/reference.png'),'/acrylic-assets/reference.png');
 for(const value of ['javascript:alert(1)','https://foreign.invalid/image','data:text/html;base64,aGVsbG8=']){window.parent.GravuruPreviewResources[path]=value;assert.equal(previewResourceURL(path),path);}
 Object.defineProperty(window,'parent',{get(){throw Error('cross origin');}});assert.equal(previewResourceURL(path),path);
});
test('render catalog embeds private artwork without invalidating immutable product descriptors',t=>{
 const old=globalThis.window;t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
 const assetId='a'.repeat(64),svgFragment=artworkFragment(assetId,20,30),resource={key:'artwork-'+assetId,bounds:[0,0,20,30],embeddedOnly:true,svgFragment,artwork:{schema:'gravuru-imported-artwork/v1',assetId,sourceSha256:'b'.repeat(64),previewSha256:'c'.repeat(64),format:'pdf',page:1,pageCount:1,widthMm:20,heightMm:30}};
 const original=JSON.stringify(resource),data='data:image/svg+xml;base64,PHN2Zy8+';
 globalThis.window={parent:{GravuruPreviewResources:{[path]:data}}};
 const catalog={...resource,svgFragment:previewResourceMarkup(resource.svgFragment)};
 assert.ok(isArtworkResource(resource));assert.equal(JSON.stringify(resource),original);
 assert.ok(catalog.svgFragment.includes(data));assert.ok(!catalog.svgFragment.includes('/api/workshop/'));
 assert.equal(catalog.artwork.sourceSha256,resource.artwork.sourceSha256);
});
