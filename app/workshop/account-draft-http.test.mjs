import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {Readable} from 'node:stream';
import {build} from '../configurator/variant-m/build.mjs';
import {createWorkshop} from './http.mjs';
import {saveDraft} from '../configurator/variant-m/contract.mjs';
import {appProxySignature} from './shopify-app-proxy.mjs';

const secret='synthetic-app-proxy-secret-0123456789',shop='gravuru-synthetic.myshopify.com';
// Signierte Proxy-Anfrage wie Shopify sie weiterleitet (Testschlüssel).
function signedParams({customer='456'}={},key=secret){
  const params=new URLSearchParams({shop,path_prefix:'/apps/gravuru',timestamp:String(Math.floor(Date.now()/1000)),logged_in_customer_id:customer});
  params.set('signature',appProxySignature(params,key));return params;
}
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
// Realer Routen-Handler mit Streams, ohne Socket (wie acrylic-draft-http.test.mjs).
async function request(workshop,pathname,method='GET',input,{query,headers={}}={}){
  const req=Readable.from(input===undefined?[]:[Buffer.from(JSON.stringify(input))]);
  req.method=method;req.headers={'content-type':'application/json',...headers};
  const res={headersSent:false,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;return this;},end(bytes){this.raw=Buffer.from(bytes);try{this.body=JSON.parse(this.raw.toString());}catch{this.body=null;}}};
  const url=new URL(pathname,'http://127.0.0.1');if(query)for(const [k,v] of query)url.searchParams.append(k,v);
  await workshop.handle(req,res,url);return res;
}

test('Konto-Entwürfe: 503 ohne Anbindung, 401 ohne gültige Signatur/Anmeldung, CRUD nur für den angemeldeten Kunden', async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'g27-account-draft-http-'));
  build({outputDirectory:directory});
  const seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0],filename=path.join(directory,'workshop.sqlite');
  const plain=createWorkshop({filename:path.join(directory,'plain.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  assert.equal((await request(plain,'/api/workshop/account-drafts')).status,503);
  assert.equal((await request(plain,'/api/workshop/account-drafts')).body.error.code,'customer_account_disabled');
  plain.close();
  const w=createWorkshop({filename,seedConfig:seed.universal,legacy:seed.legacy,appProxy:{shopDomain:shop,secret}});
  t.after(()=>w.close());
  const record=w.repository.copy(w.defaultId,{expectedRevision:1,name:'Synthetischer Konto-Entwurf',kind:'product'});
  const config=w.model(record.id,record.revision).universal,source=config.profile.designs[0];
  const state={designId:source.id,objects:structuredClone(source.objects),mOptions:{}};
  Object.assign(state.objects.find(o=>o.type==='photoSlot'),{uxUploadId:'synthetic-photo',uxUploadKind:'photo'});
  const draft=saveDraft(config,state,{},config.localResources.fonts,config.localResources.motifs,{draft:true});
  const payload={title:'Für Oma',draft,photos:[{uploadId:'synthetic-photo',kind:'photo',name:'oma.png',mime:'image/png',original:PNG}],preview:PNG};
  const anna=()=>({query:signedParams({customer:'456'},secret)}),ben=()=>({query:signedParams({customer:'789'},secret)});
  // Ohne Signatur, mit falscher Signatur, ohne Anmeldung: nichts lesbar oder schreibbar.
  assert.equal((await request(w,'/api/workshop/account-drafts')).status,401);
  assert.equal((await request(w,'/api/workshop/account-drafts')).body.error.code,'app_proxy_signature');
  assert.equal((await request(w,'/api/workshop/account-drafts','GET',undefined,{query:signedParams({customer:'456'},'wrong-secret-0123456789abcdef')})).status,401);
  const anonymous=await request(w,'/api/workshop/account-drafts','GET',undefined,{query:signedParams({customer:''},secret)});
  assert.equal(anonymous.status,401);assert.equal(anonymous.body.error.code,'customer_login_required');
  assert.equal((await request(w,'/api/workshop/account-drafts','POST',payload,{query:signedParams({customer:''},secret)})).status,401);
  const tampered=signedParams({customer:''},secret);tampered.set('logged_in_customer_id','456');
  assert.equal((await request(w,'/api/workshop/account-drafts','GET',undefined,{query:tampered})).status,401);
  // Angemeldet: leere Liste, anlegen, lesen, Foto/Vorschau, löschen.
  const empty=await request(w,'/api/workshop/account-drafts','GET',undefined,anna());
  assert.equal(empty.status,200);assert.deepEqual(empty.body,{drafts:[],limit:50,ttlDays:90});assert.equal(empty.headers['Cache-Control'],'no-store');
  assert.equal((await request(w,'/api/workshop/account-drafts','PATCH',payload,anna())).status,405);
  const created=await request(w,'/api/workshop/account-drafts','POST',payload,anna());
  assert.equal(created.status,201,JSON.stringify(created.body));
  const id=created.body.draft.id;assert.match(id,/^cdraft_/);assert.equal(created.body.draft.productId,record.id);assert.equal(created.body.draft.profileRevision,config.profile.revision);
  const list=await request(w,'/api/workshop/account-drafts','GET',undefined,anna());
  assert.deepEqual(list.body.drafts.map(d=>d.id),[id]);assert.equal(list.body.drafts[0].photoCount,1);
  const loaded=await request(w,'/api/workshop/account-drafts/'+id,'GET',undefined,anna());
  assert.equal(loaded.status,200);assert.deepEqual(loaded.body.draft,draft);assert.deepEqual(loaded.body.photos,[{uploadId:'synthetic-photo',kind:'photo',name:'oma.png',mime:'image/png',edited:false}]);
  const photo=await request(w,'/api/workshop/account-drafts/'+id+'/photos/synthetic-photo','GET',undefined,anna());
  assert.equal(photo.status,200);assert.equal(photo.headers['Content-Type'],'image/png');assert.deepEqual(photo.raw,Buffer.from(PNG,'base64'));
  assert.equal((await request(w,'/api/workshop/account-drafts/'+id+'/photos/synthetic-photo','GET',undefined,{query:(q=>{q.set('variant','edited');q.set('signature',q.get('signature'));return q;})(anna().query)})).status,401); // variant ist Teil der Signatur
  const preview=await request(w,'/api/workshop/account-drafts/'+id+'/preview.png','GET',undefined,anna());
  assert.equal(preview.status,200);assert.equal(preview.headers['Content-Type'],'image/png');
  // Anderer Kunde sieht nichts davon.
  assert.deepEqual((await request(w,'/api/workshop/account-drafts','GET',undefined,ben())).body.drafts,[]);
  assert.equal((await request(w,'/api/workshop/account-drafts/'+id,'GET',undefined,ben())).status,404);
  assert.equal((await request(w,'/api/workshop/account-drafts/'+id,'DELETE',undefined,ben())).status,404);
  // Ungültige Entwürfe werden mit derselben Vertragsprüfung wie im Editor abgewiesen.
  const foreign=structuredClone(payload);foreign.draft.profileRevision=record.id+':99';
  assert.equal((await request(w,'/api/workshop/account-drafts','POST',foreign,anna())).status,422);
  const broken=structuredClone(payload);broken.draft.design.objects.push({id:'x',type:'image',x:1,y:1,w:10,h:10});
  const rejected=await request(w,'/api/workshop/account-drafts','POST',broken,anna());
  assert.equal(rejected.status,422);assert.equal(rejected.body.error.code,'customer_draft_invalid');
  const orphan=structuredClone(payload);orphan.photos[0].uploadId='unbekannt';
  assert.equal((await request(w,'/api/workshop/account-drafts','POST',orphan,anna())).status,422);
  const badBytes=structuredClone(payload);badBytes.photos[0].mime='image/jpeg';
  assert.equal((await request(w,'/api/workshop/account-drafts','POST',badBytes,anna())).status,422);
  // Überschreiben und löschen durch den Eigentümer.
  const updated=await request(w,'/api/workshop/account-drafts/'+id,'POST',{...payload,title:'Für Opa',photos:[]},anna());
  assert.equal(updated.status,200);assert.equal(updated.body.draft.title,'Für Opa');assert.equal(updated.body.draft.photoCount,0);
  assert.equal((await request(w,'/api/workshop/account-drafts/'+id,'DELETE',undefined,anna())).status,200);
  assert.deepEqual((await request(w,'/api/workshop/account-drafts','GET',undefined,anna())).body.drafts,[]);
  assert.ok(!JSON.stringify(created.body).includes(secret));
});
