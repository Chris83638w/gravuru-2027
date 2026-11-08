import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {previewUploadDataURL} from './preview-uploads.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="#000000" d="M2 2H18V6H12V18H8V6H2Z"/></svg>';
const logo=()=>({file:new File([svg.replace('#000000','red')],'test.svg',{type:'image/svg+xml'}),blob:new Blob([svg],{type:'image/svg+xml'}),vectorLogo:{version:'svg-black-v1',outputSha256:hash(svg)}});
const content=data=>Buffer.from(data.split(',')[1],'base64');

test('preview embeds the checked black vector, not the original colored SVG',async()=>{
 const asset=logo(),before=await asset.file.text(),data=await previewUploadDataURL(asset);
 assert.match(data,/^data:image\/svg\+xml;base64,/);assert.equal(content(data).toString(),svg);
 assert.equal(await asset.file.text(),before);assert.equal(await asset.blob.text(),svg);
});
test('preview keeps accepted photo bytes and alpha bytes exact and prefers edits',async()=>{
 for(const type of ['image/png','image/jpeg','image/webp']){
  const original=Uint8Array.from([0,255,127,13,10]),edited=Uint8Array.from([255,0,34,0]);
  const asset={file:new Blob([original],{type})};
  assert.deepEqual(content(await previewUploadDataURL(asset)),Buffer.from(original));
  asset.blob=new Blob([edited],{type:'image/png'});
  assert.deepEqual(content(await previewUploadDataURL(asset)),Buffer.from(edited));
  assert.deepEqual(Buffer.from(await asset.file.arrayBuffer()),Buffer.from(original));
 }
});
test('unverified, altered, missing and oversized vector logos fail before rasterization',async()=>{
 const bad=[{file:logo().file},{...logo(),vectorLogo:undefined},{...logo(),vectorLogo:{version:'svg-black-v1',outputSha256:'0'.repeat(64)}},{...logo(),vectorLogo:{version:'other',outputSha256:hash(svg)}},{...logo(),blob:new Blob([new Uint8Array(2*1024*1024+1)],{type:'image/svg+xml'})}];
 for(const asset of bad)await assert.rejects(previewUploadDataURL(asset));
});
test('unsupported MIME, empty, missing and oversized photo data are not embedded',async()=>{
 for(const asset of [undefined,{file:{}},{file:new Blob(['x'],{type:'text/html'})},{file:new Blob([],{type:'image/png'})},{file:new Blob([new Uint8Array(15*1024*1024+1)],{type:'image/png'})}])await assert.rejects(previewUploadDataURL(asset));
});
