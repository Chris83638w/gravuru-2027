import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchNativeDraftHttp} from './patch-native-draft-http.mjs';
const source=readFileSync(new URL('./upstream/app/workshop/http.mjs',import.meta.url),'utf8');
test('HTTP patch changes existing native-draft path only, keeps original auth/CSRF/body and native prepare sequence',()=>{
  const patched=patchNativeDraftHttp(source);
  assert.ok(patched.includes("if(method!=='GET'&&!sameToken(req.headers['x-gravuru-csrf'],csrfToken))"));
  assert.ok(patched.includes("const merchantSession=verifySession?verifySession(req.headers.authorization,'merchant'):null"));
  assert.ok(patched.includes('body(req,100*1024*1024)'));
  const at=patched.indexOf('const acrylicDraftMatch'),end=patched.indexOf("      if(pathname==='/api/workshop/acrylic-reviews'",at);
  assert.equal(patched.slice(0,at).replace("import {hydratePhotoReopeningTransport} from './photo-persistence/photo-reopening-transport.mjs';\n",''),source.slice(0,source.indexOf('const acrylicDraftMatch')));
  assert.equal(patched.slice(end),source.slice(source.indexOf("      if(pathname==='/api/workshop/acrylic-reviews'",source.indexOf('const acrylicDraftMatch'))));
  const region=patched.slice(at,end);
  assert.ok(region.indexOf('acrylicDrafts.get(acrylicDraftMatch[1],token)')<region.indexOf('acrylicDrafts.reopening(draft.id,token)'));
  assert.ok(region.indexOf('await prepareAcrylicReview')<region.indexOf('await customerDrafts.acrylicDrafts.preparePhotoReopening'));
  assert.ok(region.indexOf('await customerDrafts.acrylicDrafts.preparePhotoReopening')<region.indexOf('acrylicDrafts.save('));
  assert.ok(region.includes('preparePhoto:prepareCustomerPhoto'));
  assert.ok(region.includes("['input','expectedRevision','reopening']:['input','reopening']"));
});
test('different HTTP revision cannot be patched without renewed source review',()=>{
  assert.throws(()=>patchNativeDraftHttp(source+'\n'),/Unrecognized HTTP source/);
});
