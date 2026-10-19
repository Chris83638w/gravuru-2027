import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createCustomerDraftStore,CUSTOMER_DRAFT_LIMIT,CUSTOMER_DRAFT_TTL_DAYS} from './customer-draft-store.mjs';

const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
const JPEG=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(32)]);
const anna={shopDomain:'gravuru-synthetic.myshopify.com',customerId:'gid://shopify/Customer/456'};
const ben={shopDomain:'gravuru-synthetic.myshopify.com',customerId:'gid://shopify/Customer/789'};
const otherShop={shopDomain:'other-shop.myshopify.com',customerId:'gid://shopify/Customer/456'};
const draft=(text='Mira')=>({schema:'gravuru-universal-customer-draft/v1',productId:'cfg_1',profileRevision:'cfg_1:3',design:{id:'d1',objects:[{id:'names',type:'text',text},{id:'photo-main',type:'photoSlot',uxUploadId:'up-1',uxUploadKind:'photo'}]},options:{}});
const input=(overrides={})=>({productId:'cfg_1',profileRevision:'cfg_1:3',title:'Für Oma',draft:draft(),photos:[{uploadId:'up-1',kind:'photo',name:'oma.jpg',mime:'image/jpeg',original:JPEG,edited:PNG}],preview:PNG,...overrides});
function setup(){
  let now=Date.parse('2026-10-19T10:00:00Z');
  const db=new DatabaseSync(':memory:'),store=createCustomerDraftStore({database:db,clock:()=>now});
  return {db,store,advance(ms){now+=ms;},get now(){return now;}};
}

test('Konto-Entwurf: anlegen, laden mit Fotos, überschreiben, löschen', ()=>{
  const {store}=setup();
  const created=store.create(anna,input());
  assert.match(created.id,/^cdraft_[a-f0-9-]{36}$/);assert.equal(created.title,'Für Oma');assert.equal(created.photoCount,1);assert.equal(created.previewAvailable,true);
  assert.equal(created.expiresAt,new Date(Date.parse(created.createdAt)+CUSTOMER_DRAFT_TTL_DAYS*86_400_000).toISOString());
  const loaded=store.get(anna,created.id);
  assert.deepEqual(loaded.draft,draft());assert.deepEqual(loaded.photos,[{uploadId:'up-1',kind:'photo',name:'oma.jpg',mime:'image/jpeg',edited:true}]);
  assert.deepEqual(store.photo(anna,created.id,'up-1'),{mime:'image/jpeg',bytes:JPEG});
  assert.deepEqual(store.photo(anna,created.id,'up-1','edited'),{mime:'image/png',bytes:PNG});
  assert.deepEqual(store.preview(anna,created.id),PNG);
  assert.throws(()=>store.photo(anna,created.id,'up-2'),e=>e.status===404);
  const saved=store.save(anna,created.id,input({title:'Für Opa',draft:draft('Max'),photos:[]}));
  assert.equal(saved.id,created.id);assert.equal(saved.title,'Für Opa');assert.equal(saved.photoCount,0);
  assert.equal(store.get(anna,created.id).draft.design.objects[0].text,'Max');
  assert.throws(()=>store.photo(anna,created.id,'up-1'),e=>e.status===404);
  assert.throws(()=>store.save(anna,created.id,input({profileRevision:'cfg_1:4'})),e=>e.status===409);
  assert.deepEqual(store.remove(anna,created.id),{id:created.id,deleted:true});
  assert.deepEqual(store.list(anna),[]);
  assert.throws(()=>store.get(anna,created.id),e=>e.status===404);
});

test('Kunde sieht nur eigene Entwürfe; Shop gehört zur Identität', ()=>{
  const {store}=setup();
  const a=store.create(anna,input()),b=store.create(ben,input({title:'Bens Entwurf'}));
  assert.deepEqual(store.list(anna).map(d=>d.id),[a.id]);assert.deepEqual(store.list(ben).map(d=>d.id),[b.id]);
  for(const principal of [ben,otherShop,null,{shopDomain:anna.shopDomain},{shopDomain:anna.shopDomain,customerId:'456'}]){
    assert.throws(()=>store.get(principal,a.id),e=>e.status===404);
    assert.throws(()=>store.remove(principal,a.id),e=>e.status===404);
    assert.throws(()=>store.preview(principal,a.id),e=>e.status===404);
    assert.throws(()=>store.save(principal,a.id,input()),e=>e.status===404);
  }
  assert.throws(()=>store.list(null),e=>e.status===404);
  assert.equal(store.get(anna,a.id).title,'Für Oma');
});

test('Limit 50 je Kunde, Ablauf nach 90 Tagen, Frist beginnt beim Überschreiben neu', ()=>{
  const {store,advance}=setup();
  for(let i=0;i<CUSTOMER_DRAFT_LIMIT;i++)store.create(anna,input({title:'Entwurf '+i,photos:[],preview:undefined}));
  assert.equal(store.list(anna).length,CUSTOMER_DRAFT_LIMIT);
  assert.throws(()=>store.create(anna,input({photos:[]})),e=>e.status===409&&/50 Entwürfe/.test(e.message));
  assert.equal(store.create(ben,input({photos:[]})).title,'Für Oma'); // Limit gilt je Kunde.
  advance(CUSTOMER_DRAFT_TTL_DAYS*86_400_000-60_000);
  assert.equal(store.list(anna).length,CUSTOMER_DRAFT_LIMIT); // kurz vor Ablauf noch alle da
  const last=store.list(anna)[CUSTOMER_DRAFT_LIMIT-1],expired=store.list(anna)[0];
  const refreshed=store.save(anna,last.id,input({title:'verlängert',photos:[]}));
  advance(120_000);
  assert.deepEqual(store.list(anna).map(d=>d.id),[refreshed.id]);
  assert.throws(()=>store.get(anna,expired.id),e=>e.status===404);
  assert.throws(()=>store.save(anna,expired.id,input({photos:[]})),e=>e.status===404);
  assert.equal(store.purgeExpired(),0); // list() hat bereits aufgeräumt
  assert.equal(store.create(anna,input({title:'wieder Platz',photos:[]})).title,'wieder Platz');
  advance(CUSTOMER_DRAFT_TTL_DAYS*86_400_000);
  assert.deepEqual(store.list(anna),[]);
});

test('Fotos: Typ per Dateikopf, Größe, Anzahl und Zuordnung geprüft; Vorschau nur PNG', ()=>{
  const {store}=setup();
  const photo=overrides=>input({photos:[{uploadId:'up-1',kind:'photo',name:'x',mime:'image/jpeg',original:JPEG,...overrides}]});
  assert.throws(()=>store.create(anna,photo({original:PNG})),e=>e.status===422); // PNG-Bytes als JPEG deklariert
  assert.throws(()=>store.create(anna,photo({mime:'image/gif',original:Buffer.from('GIF89a')})),e=>e.status===422);
  assert.throws(()=>store.create(anna,photo({edited:JPEG})),e=>e.status===422);
  assert.throws(()=>store.create(anna,photo({uploadId:'../x'})),e=>e.status===422);
  assert.throws(()=>store.create(anna,input({photos:Array.from({length:5},(_,i)=>({uploadId:'up-'+i,kind:'photo',mime:'image/jpeg',original:JPEG}))})),e=>e.status===422);
  assert.throws(()=>store.create(anna,input({preview:JPEG})),e=>e.status===422);
  assert.throws(()=>store.create(anna,input({title:''})),e=>e.status===422);
  assert.throws(()=>store.create(anna,input({title:'x'.repeat(81)})),e=>e.status===422);
  assert.equal(store.create(anna,photo({mime:'image/png',original:PNG})).photoCount,1);
  assert.equal(store.list(anna).length,1);
});
