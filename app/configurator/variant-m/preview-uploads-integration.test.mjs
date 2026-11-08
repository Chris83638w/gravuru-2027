import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {prepareCustomerVectorLogo} from '../../workshop/customer-vector-logo.mjs';
import {prepareCustomerPhoto} from '../../workshop/customer-photo.mjs';
import {previewUploadDataURL} from './preview-uploads.mjs';

test('server-approved vector output is embedded byte-for-byte, preserving holes and original evidence',async()=>{
 const original=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="red" d="M2 2H18V6H12V18H8V6H2Z"/><rect x="9" y="8" width="2" height="3" fill="white"/></svg>');
 const checked=await prepareCustomerVectorLogo({name:'test-T.svg',bytes:original});
 const asset={file:new File([original],'test-T.svg',{type:'image/svg+xml'}),blob:new Blob([checked.svg],{type:'image/svg+xml'}),vectorLogo:{version:checked.version,sourceSha256:checked.sourceSha256,outputSha256:checked.outputSha256}};
 const data=await previewUploadDataURL(asset),embedded=Buffer.from(data.split(',')[1],'base64');
 assert.deepEqual(embedded,checked.svg);assert.deepEqual(Buffer.from(await asset.file.arrayBuffer()),original);
 assert.equal(checked.width,20);assert.equal(checked.height,20);
 assert.match(embedded.toString(),/fill="#000000"/);assert.doesNotMatch(embedded.toString(),/fill="(?:red|white)"/);
});

test('accepted PNG keeps actual transparency and all pixels when embedded, without resizing or cropping',async()=>{
 // Existing synthetic red 4x4, 50% alpha fixture from photo-color-export.test.mjs.
 const encoded='iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8z8DQwIAEmJA5xAkAAGQRAYepirHLAAAAAElFTkSuQmCC';
 const checked=await prepareCustomerPhoto(encoded),original=checked.original;
 const data=await previewUploadDataURL({file:new File([original],'transparent.png',{type:'image/png'})});
 const output=Buffer.from(data.split(',')[1],'base64');assert.deepEqual(output,original);
 const result=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c','import io,json,sys\nfrom PIL import Image\na=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGBA")\nprint(json.dumps({"size":a.size,"pixels":list(a.getdata())}))'],{input:output,windowsHide:true,timeout:10000});
 assert.equal(result.status,0,result.stderr?.toString());
 const image=JSON.parse(result.stdout);assert.deepEqual(image.size,[4,4]);assert.equal(image.pixels.length,16);
 for(const pixel of image.pixels)assert.deepEqual(pixel,[255,0,0,128]);
});
