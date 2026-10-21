import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {snapshotNativeInput} from './native-input-binding.mjs';
import {patchNativeReview} from './patch-native-review.mjs';
test('native input snapshot deeply detaches and freezes customer contents before asynchronous review work',async()=>{
  const input={productId:'fixture',objects:[{id:'text',text:'A',x:1.25}],options:{mounting:'K00'},media:[{id:'photo',original:'original-bytes'}]};
  const bound=snapshotNativeInput(input);await Promise.resolve();input.objects[0].text='B';input.media[0].original='replaced';
  assert.equal(bound.input.objects[0].text,'A');assert.equal(bound.input.media[0].original,'original-bytes');
  assert.throws(()=>{bound.input.objects[0].text='C';},TypeError);
  assert.notEqual(snapshotNativeInput(input).sha256,bound.sha256);
  assert.equal(snapshotNativeInput({options:{mounting:'K00'},media:bound.input.media,objects:bound.input.objects,productId:'fixture'}).sha256,bound.sha256);
});
test('native review patch binds digest in archived manifest before package SHA and freezes before validation/await',()=>{
  const source=readFileSync(new URL('./upstream/app/workshop/acrylic-review.mjs',import.meta.url),'utf8'),patched=patchNativeReview(source);
  const start=patched.indexOf('export async function prepareAcrylicReview'),region=patched.slice(start);
  assert.ok(region.indexOf('snapshotNativeInput(input)')<region.indexOf('validateAcrylicReview('));
  assert.ok(region.indexOf('snapshotNativeInput(input)')<region.indexOf('await preparePhoto('));
  assert.ok(region.indexOf('nativeInputSha256:boundInput.sha256')<region.indexOf("add('manifest.json'"));
  assert.ok(region.indexOf("add('manifest.json'")<region.indexOf('const archive=await zip(files)'));
  assert.throws(()=>patchNativeReview(source+'\n'),/Unrecognized/);
});
test('non-JSON hidden data cannot silently disappear from native input digest',()=>{
  for(const input of [{value:undefined},{value:NaN},{value:()=>{}},JSON.parse('{"__proto__":{"x":1}}')])assert.throws(()=>snapshotNativeInput(input),e=>e.code==='native_input_snapshot');
});
