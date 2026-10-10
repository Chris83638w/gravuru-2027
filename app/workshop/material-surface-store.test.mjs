import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createDesignAssetStore,sha256} from './design-assets.mjs';
import {prepareCustomerPhoto} from './customer-photo.mjs';
import {surfacePreview,validSurface} from '../configurator/variant-m/material-surface.mjs';

test('material import retains byte-identical original and immutable PNG preview across restart',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-surface-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const filename=path.join(dir,'design-assets.sqlite'),original=fs.readFileSync(new URL('./preview-assets/reference.jpg',import.meta.url));
 let store=createDesignAssetStore({filename});t.after(()=>store.close());
 const first=await store.importMaterialSurface(original.toString('base64'));
 assert.equal(first.sha256,sha256(original));assert.equal(validSurface(first.url),true);
 const preview=store.materialSurface(first.sha256);assert.equal(preview.subarray(1,4).toString(),'PNG');
 const second=await store.importMaterialSurface(original.toString('base64'));assert.deepEqual(second,first);
 store.close();store=createDesignAssetStore({filename});
 assert.deepEqual(store.materialSurface(first.sha256,true),original);assert.deepEqual(store.materialSurface(first.sha256),preview);
 assert.throws(()=>store.validateDocument({config:{materialSurface:'/api/workshop/material-surfaces/'+'0'.repeat(64)+'.png'}}),/fehlt/);
 assert.throws(()=>store.materialSurface('../private'),/fehlt/);
});

test('failed material image leaves solid plate visible and external addresses are not embedded',()=>{
 const svg='<svg><defs></defs><rect width="220" height="140" fill="#41494b"/><g/></svg>';
 const url='/api/workshop/material-surfaces/'+'a'.repeat(64)+'.png';
 const result=surfacePreview(svg,url,{width:220,height:140,shape:'rect'});
 assert.ok(result.includes('fill="#41494b"'));assert.ok(result.indexOf('fill="#41494b"')<result.indexOf('<image'));
 assert.equal(surfacePreview(svg,'https://example.test/private.png',{width:220,height:140}),svg);
});

test('large input reaches image validation without overflowing the JavaScript regexp stack',async()=>{
 const large=Buffer.alloc(8*1024*1024,100).toString('base64');
 await assert.rejects(prepareCustomerPhoto(large),error=>error.code==='invalid_customer_photo');
 for(const invalid of ['a===','aA=','aB==','abcd\n'])assert.throws(()=>prepareCustomerPhoto(invalid),error=>error.status===422);
});
