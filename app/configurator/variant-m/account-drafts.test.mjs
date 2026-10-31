import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountDraftClient,loginUrl,loginRequired,accountUnavailable,AccountDraftError} from './account-draft-client.mjs';
import {installAccountDrafts} from './account-drafts.mjs';

const response=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});

test('updating a named draft with a blank title preserves its title and content; new copies use the product default',async t=>{
 const previous={document:globalThis.document,Image:globalThis.Image,FileReader:globalThis.FileReader};
 Object.assign(globalThis,{
  Image:class{naturalWidth=100;naturalHeight=80;async decode(){}},
  FileReader:class{async readAsDataURL(blob){this.result='data:image/png;base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}},
  document:{createElement:()=>({getContext:()=>({drawImage(){}}),toBlob:cb=>cb(new Blob(['preview'],{type:'image/png'}))})},
 });
 t.after(()=>Object.assign(globalThis,previous));
 const input={value:''},status={},root={querySelector:s=>s==='[data-ux-account-title]'?input:status,contains:()=>true,set innerHTML(value){input.value='';this.html=value;}};
 const dialog={querySelector:()=>root,addEventListener(){}},config={profile:{name:'Türschild',binding:{productId:'cfg_1'},revision:'cfg_1:3'}};
 const draft={objects:[{id:'name',type:'text',text:'Unser Zuhause'}]},writes=[];
 let savedTitle='Für Oma',fail=false;
 const client={list:async()=>({drafts:[{id:'one',title:savedTitle,productId:'cfg_1',profileRevision:'cfg_1:3'}]}),previewUrl:()=>'/preview',get:async()=>({title:savedTitle,draft,photos:[]}),
  update:async(id,payload)=>{if(fail)throw Error('offline');writes.push({id,payload});savedTitle=payload.title;return {draft:{id,title:savedTitle}};},
  create:async payload=>{writes.push({id:'new',payload});return {draft:{id:'new',title:payload.title}};}};
 const el={state:structuredClone(draft),sync(){},draftPayload:()=>structuredClone(el.state),png:async()=>new Blob(['full'],{type:'image/png'})};
 const ui=installAccountDrafts({el,config,files:new Map(),dialog,button:()=>'',esc:String,say(){},restoreDraft:d=>{el.state=structuredClone(d);},clientFactory:()=>client});
 await ui.refresh();await ui.load('one');await ui.save(false);
 assert.equal(writes[0].payload.title,'Für Oma');assert.deepEqual(writes[0].payload.draft,draft);
 assert.deepEqual(writes[0].payload.photos,[]);assert.equal(writes[0].payload.preview,Buffer.from('preview').toString('base64'));
 input.value='  Unser Schild  ';await ui.save(false);await ui.save(false);
 assert.deepEqual(writes.map(w=>w.payload.title),['Für Oma','Unser Schild','Unser Schild']);
 fail=true;input.value='Nicht gespeichert';await ui.save(false);assert.equal(writes.length,3);
 fail=false;input.value='';await ui.save(false);assert.equal(writes[3].payload.title,'Unser Schild');
 await ui.save(true);assert.deepEqual([writes[4].id,writes[4].payload.title],['new','Türschild']);
});

test('Konto-Client: Pfade, Fehlercodes und Anmeldelink ohne fremde Ziele',async()=>{
  const calls=[];
  const client=createAccountDraftClient({base:'/apps/gravuru/',fetchImpl:async(url,init)=>{calls.push([url,init.method]);if(url.endsWith('/account-drafts'))return response(401,{error:{code:'customer_login_required',message:'Bitte anmelden.'}});return response(503,{error:{code:'customer_account_disabled',message:'Nicht eingerichtet.'}});}});
  assert.equal(client.endpoint,'/apps/gravuru/api/workshop/account-drafts');
  await assert.rejects(client.list(),e=>e instanceof AccountDraftError&&loginRequired(e)&&e.message==='Bitte anmelden.');
  await assert.rejects(client.get('cdraft_'+'0'.repeat(36)),e=>accountUnavailable(e));
  await assert.rejects(client.get('../etc'),e=>e.code==='account_draft_id');
  assert.equal(client.previewUrl('cdraft_'+'a'.repeat(36)),'/apps/gravuru/api/workshop/account-drafts/cdraft_'+'a'.repeat(36)+'/preview.png');
  assert.equal(client.photoUrl('cdraft_'+'a'.repeat(36),'up 1','edited'),'/apps/gravuru/api/workshop/account-drafts/cdraft_'+'a'.repeat(36)+'/photos/up%201?variant=edited');
  assert.deepEqual(calls.map(c=>c[1]),['GET','GET']);
  assert.throws(()=>createAccountDraftClient({base:'https://evil.example'}));
  assert.equal(loginUrl(undefined,'/products/tuerschild?variant=1'),'/account/login?return_url=%2Fproducts%2Ftuerschild%3Fvariant%3D1');
  assert.equal(loginUrl('/account/login','https://evil.example/phish'),'/account/login?return_url=%2F');
  assert.equal(loginUrl('/kunden/login?x=1','/p'),'/kunden/login?x=1&return_url=%2Fp');
  const failing=createAccountDraftClient({fetchImpl:async()=>{throw Error('offline');}});
  await assert.rejects(failing.list(),e=>e.code==='network');
});

test('Dialog „Deine Entwürfe“: ohne Konto Anmeldelink, ohne Anbindung Hinweis, mit Konto Liste mit Laden/Löschen',async t=>{
  const previous={document:globalThis.document,location:globalThis.location,window:globalThis.window};
  Object.assign(globalThis,{document:{referrer:''},location:{href:'/products/schild'},window:{confirm:()=>true}});
  t.after(()=>Object.assign(globalThis,previous));
  const root={innerHTML:'',querySelector:()=>null,contains:()=>true},handlers=[];
  const dialog={querySelector:()=>root,addEventListener:(type,fn)=>handlers.push(fn)};
  const config={profile:{name:'Türschild',binding:{productId:'cfg_1'},revision:'cfg_1:3'},customerAccount:{apiBase:'/apps/gravuru'}};
  let mode='login',removed=[];
  const id='cdraft_'+'b'.repeat(36);
  const client={list:async()=>{if(mode==='login')throw new AccountDraftError('Bitte anmelden.',{status:401,code:'customer_login_required'});if(mode==='off')throw new AccountDraftError('x',{status:503,code:'customer_account_disabled'});return {drafts:[{id,title:'Für Oma',productId:'cfg_1',profileRevision:'cfg_1:3',updatedAt:'2026-10-19T10:00:00Z',photoCount:1},{id:'cdraft_'+'c'.repeat(36),title:'Anderes Produkt',productId:'cfg_2',profileRevision:'cfg_2:1',updatedAt:'2026-10-18T10:00:00Z',photoCount:0}],limit:50};},
    remove:async did=>{removed.push(did);return {deleted:true};},previewUrl:did=>'/apps/gravuru/api/workshop/account-drafts/'+did+'/preview.png'};
  const el={state:{objects:[]},sync(){}},said=[];
  const ui=installAccountDrafts({el,config,files:new Map(),dialog,button:(key,label,extra='')=>`<button data-ux="${key}" ${extra}>${label}</button>`,esc:v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),say:m=>said.push(m),restoreDraft(){},clientFactory:()=>client});
  assert.match(root.innerHTML,/Im Kundenkonto speichern/);
  await ui.refresh();
  assert.match(root.innerHTML,/href="\/account\/login\?return_url=%2Fproducts%2Fschild"/);assert.match(root.innerHTML,/Anmelden oder registrieren/);assert.doesNotMatch(root.innerHTML,/account-save/);
  mode='off';await ui.refresh();
  assert.match(root.innerHTML,/noch nicht eingerichtet/);assert.doesNotMatch(root.innerHTML,/account-save|account-login/);
  mode='ready';await ui.refresh();
  assert.match(root.innerHTML,/data-ux="account-save"/);assert.match(root.innerHTML,/Für Oma/);assert.match(root.innerHTML,/1 Foto</);assert.match(root.innerHTML,/Meine Entwürfe <small>\(2 von 50\)/);
  assert.match(root.innerHTML,new RegExp('src="/apps/gravuru/api/workshop/account-drafts/'+id+'/preview.png"'));
  assert.match(root.innerHTML,/data-ux="account-load" data-id="cdraft_c{36}" disabled/,'Entwurf eines anderen Produkts ist nicht ladbar');
  assert.match(root.innerHTML,/data-ux="account-load" data-id="cdraft_b{36}" >/);
  const click=target=>Promise.all(handlers.map(fn=>fn({target:{closest:()=>target}})));
  await click({dataset:{ux:'account-delete',id},disabled:false});await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(removed,[id]);assert.match(root.innerHTML,/Entwurf gelöscht\./);
});
