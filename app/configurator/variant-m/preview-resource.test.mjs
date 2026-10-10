import test from 'node:test';
import assert from 'node:assert/strict';
import {previewResourceURL} from './preview-resource.mjs';
const path='/api/workshop/design-assets/'+'a'.repeat(64)+'/preview.svg';
test('private renderer uses authenticated parent image bytes and keeps unresolved resources unchanged',t=>{
 const old=globalThis.window;t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
 const png='data:image/png;base64,aGVsbG8=';globalThis.window={parent:{GravuruPreviewResources:{[path]:png}}};assert.equal(previewResourceURL(path),png);assert.equal(previewResourceURL('/acrylic-assets/reference.png'),'/acrylic-assets/reference.png');
 for(const value of ['javascript:alert(1)','https://foreign.invalid/image','data:text/html;base64,aGVsbG8=']){window.parent.GravuruPreviewResources[path]=value;assert.equal(previewResourceURL(path),path);}
 Object.defineProperty(window,'parent',{get(){throw Error('cross origin');}});assert.equal(previewResourceURL(path),path);
});
