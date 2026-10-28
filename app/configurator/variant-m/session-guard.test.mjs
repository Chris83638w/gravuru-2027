import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createSessionGuard,uploadReferences,sessionGuardKey,SESSION_GUARD_SCHEMA,SESSION_GUARD_TTL_MS} from './session-guard.mjs';
import {makeAcrylicConfig} from './acrylic-product.mjs';
import {prepareConfig,saveDraft,readDraft,DRAFT_SCHEMA} from './contract.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';

// Echte Handler aus ux.mjs mit deterministischen DOM-Ports (wie ui-event-regressions.test.mjs).
const source=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8').replaceAll('\r\n','\n');
const line=(name,marker)=>{const rows=source(name).split('\n').filter(s=>s.includes(marker));assert.equal(rows.length,1,marker+' must identify one UI handler');return rows[0];};
function block(name,start,end){const text=source(name),i=text.indexOf(start);assert(i>=0,start);const j=text.indexOf(end,i);assert(j>=0,end);return text.slice(i,j+end.length);}
const clone=v=>structuredClone(v);
// localStorage-Ersatz: speichert Strings, kann optional bei jedem Zugriff werfen.
function fakeStorage(initial={}){const data=new Map(Object.entries(initial));return {data,failing:false,getItem(k){if(this.failing)throw Error('blocked');return data.has(k)?data.get(k):null;},setItem(k,v){if(this.failing)throw Error('blocked');data.set(k,String(v));},removeItem(k){if(this.failing)throw Error('blocked');data.delete(k);}};}
function acrylicConfig(){
  const resources=JSON.parse(fs.readFileSync(new URL('../../designs/acrylic-unser-anfang/resources.json',import.meta.url),'utf8'));
  const config=makeAcrylicConfig({profile:{kind:'universal-product',schemaVersion:2}},resources,'a'.repeat(64));
  for(const o of config.profile.designs[0].objects.filter(o=>o.type==='text')){measureText(o,resources.fonts);if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}}
  return {config:prepareConfig(config),resources};
}
// Minimaler Editor: Adapter-Hooks (draftPayload/restoreDraft) mit dem echten Vertrag.
function editor(config,resources){
  const design=config.profile.designs[0];
  const el={state:{designId:design.id,objects:clone(design.objects),mOptions:{},selected:null},fontData:resources.fonts,synced:0,
    draftPayload({draft=false}={}){return saveDraft(config,this.state,this.state.mOptions,resources.fonts,resources.motifs,{draft});},
    restoreDraft(input,{draft=false}={}){const r=readDraft(config,input,resources.fonts,resources.motifs,{draft});this.state.objects=r.design.objects;this.state.designId=r.design.id;this.state.mOptions=clone(r.options);this.state.selected=null;this.sync();return r;},
    chooseDesign(id){this.state.designId=id;this.state.objects=clone(config.profile.designs.find(d=>d.id===id).objects);this.sync();},
    sync(){this.synced++;},record(){}};
  return el;
}
// Lädt die K7-Blöcke aus ux.mjs in einen Kontext: Guard anlegen, Sync-Hook, Wiederherstellung beim Start, „Neu beginnen“.
function mountUx({config,resources,storage,timers,pendingDesignTransfer=false}){
  const el=editor(config,resources),said=[],banner={hidden:true},files=new Map();
  const env={el,config,profile:config.profile,files,uploadReferences,say:m=>said.push(m),said,banner,$:s=>s==='[data-ux-session]'?banner:{hidden:true},update(){},notifyCorrection(){},
    installAccountDrafts:()=>null,dialogs:{account:{}},button(){},esc:v=>v,uploadPending:false,URL:{revokeObjectURL(){}},location:{reload(){env.reloaded=true;}},
    window:{parent:{GravuruShopEntry:{designGallery:{hasPendingTransfer:()=>pendingDesignTransfer}}},localStorage:storage,addEventListener(type,fn){(env.listeners[type]||=[]).push(fn);}},listeners:{},
    createSessionGuard:options=>createSessionGuard({...options,schedule:fn=>{timers.queued=fn;return 1;},cancel:()=>{timers.queued=null;}})};
  vm.createContext(env);
  vm.runInContext(line('ux.mjs','const chosenProfile='),env);
  vm.runInContext(line('ux.mjs',"const oldSync=el.sync;el.sync=function(...args){"),env);
  vm.runInContext(block('ux.mjs','  function restoreDraft(draft){','\n  }'),env);
  vm.runInContext(block('ux.mjs','  let sessionGuard=null,initialDraft=null,accountDrafts=null;','\n  }'),env);
  vm.runInContext(line('ux.mjs','const pendingDesignTransfer='),env);
  vm.runInContext(block('ux.mjs','  if(sessionGuard&&!config?.workbench){','  }else sessionGuard=null;'),env);
  vm.runInContext(line('ux.mjs',"if(config&&!config.workbench&&typeof el.draftPayload==='function')accountDrafts=installAccountDrafts("),env);
  env.restart=()=>{env.action='session-restart';vm.runInContext('(function(){'+line('ux.mjs',"if(action==='session-restart')")+'})()',env);};
  env.guard=()=>vm.runInContext('sessionGuard',env);
  return env;
}
const text=el=>el.state.objects.find(o=>o.id==='names').text;

test('Sitzungsschutz: Änderung wird entprellt gespeichert, Neuladen stellt den Stand wieder her, „Neu beginnen“ setzt zurück',()=>{
  const {config,resources}=acrylicConfig(),storage=fakeStorage(),timers={queued:null};
  const key=sessionGuardKey(config.profile.binding.productId,config.profile.revision);
  const first=mountUx({config,resources,storage,timers});
  assert.ok(first.guard());assert.equal(first.banner.hidden,true);assert.equal(storage.data.size,0);
  assert.equal(timers.queued,null,'Start ohne Änderung speichert nichts');
  const original=text(first.el);
  first.el.state.objects.find(o=>o.id==='names').text='Lena & Max';first.el.sync();
  assert.equal(typeof timers.queued,'function','Änderung plant eine entprellte Speicherung');
  assert.equal(storage.data.size,0,'vor Ablauf der Entprellung liegt nichts im Speicher');
  timers.queued();timers.queued=null;
  const stored=JSON.parse(storage.data.get(key));
  assert.equal(stored.schema,SESSION_GUARD_SCHEMA);assert.equal(stored.draft.schema,DRAFT_SCHEMA);assert.equal(stored.productId,config.profile.binding.productId);
  assert.equal(stored.draft.design.objects.find(o=>o.id==='names').text,'Lena & Max');assert.deepEqual(stored.uploads,[]);
  assert.ok(!JSON.stringify(stored).includes('blob:'),'keine Bilddaten im Speicher');
  // Neuladen desselben Produkts auf demselben Gerät.
  const second=mountUx({config,resources,storage,timers});
  assert.equal(text(second.el),'Lena & Max');assert.equal(second.banner.hidden,false);assert.deepEqual(second.said,[]);
  assert.equal(second.el.state.selected,null);
  // „Neu beginnen“: Speicher leer, Startzustand zurück, Hinweis weg.
  second.restart();
  assert.equal(text(second.el),original);assert.equal(storage.data.has(key),false);assert.equal(second.banner.hidden,true);assert.equal(second.said.at(-1),'Neu begonnen.');
  assert.equal(timers.queued,null,'der Rücksprung selbst wird nicht als Änderung gespeichert');
  // Danach greift der Schutz wieder.
  second.el.state.objects.find(o=>o.id==='names').text='Neu';second.el.sync();timers.queued();
  assert.equal(JSON.parse(storage.data.get(key)).draft.design.objects.find(o=>o.id==='names').text,'Neu');
});

test('Sitzungsschutz: Foto-Referenzen bleiben, Bilder nicht – Hinweis zum erneuten Hochladen',()=>{
  const {config,resources}=acrylicConfig(),storage=fakeStorage(),timers={queued:null};
  const first=mountUx({config,resources,storage,timers});
  first.files.set('upload-1',{file:{name:'oma.jpg'},url:'blob:x',width:10,height:10});
  const slot=first.el.state.objects.find(o=>o.type==='photoSlot');Object.assign(slot,{uxUploadId:'upload-1',uxUploadKind:'photo'});first.el.sync();timers.queued();
  const stored=JSON.parse(storage.data.get(first.guard().key));
  assert.deepEqual(stored.uploads,[{objectId:slot.id,uploadId:'upload-1',kind:'photo',name:'oma.jpg'}]);
  const second=mountUx({config,resources,storage,timers});
  assert.equal(second.el.state.objects.find(o=>o.type==='photoSlot').uxUploadId,'upload-1');
  assert.equal(second.files.size,0);assert.match(second.said.at(-1),/Foto bitte erneut hochladen/);
});

test('Sitzungsschutz: laufende Designübernahme hat Vorrang; alte Sitzung bleibt bis zur nächsten gültigen Änderung erhalten',()=>{
  const {config,resources}=acrylicConfig(),storage=fakeStorage(),timers={queued:null};
  const previous=mountUx({config,resources,storage,timers});
  previous.el.state.objects.find(o=>o.id==='names').text='Lena & Max';previous.el.sync();assert.equal(timers.queued(),true);timers.queued=null;
  const key=previous.guard().key,stored=storage.data.get(key);
  const incoming=mountUx({config,resources,storage,timers,pendingDesignTransfer:true});
  assert.equal(text(incoming.el),config.profile.designs[0].objects.find(o=>o.id==='names').text,'ausstehende Übernahme wird nicht durch den alten Stand ersetzt');
  assert.equal(incoming.banner.hidden,true);assert.deepEqual(incoming.said,[]);
  assert.equal(storage.data.get(key),stored,'übersprungene Wiederherstellung löscht keinen gültigen Stand');
  assert.equal(timers.queued,null,'Start ohne Änderung überschreibt den alten Stand nicht');
  incoming.el.state.objects.find(o=>o.id==='names').text='Mia & Ben';incoming.el.sync();
  assert.equal(typeof timers.queued,'function','nach der Übernahme bleibt der Sitzungsschutz aktiv');assert.equal(timers.queued(),true);timers.queued=null;
  const reopened=mountUx({config,resources,storage,timers});
  assert.equal(text(reopened.el),'Mia & Ben');assert.equal(reopened.banner.hidden,false);
});

test('Sitzungsschutz: ungültige, fremde oder abgelaufene Stände werden still verworfen; gesperrter Speicher stört nicht',()=>{
  const {config,resources}=acrylicConfig(),timers={queued:null};
  const key=sessionGuardKey(config.profile.binding.productId,config.profile.revision);
  const valid=()=>{const storage=fakeStorage();const env=mountUx({config,resources,storage,timers});env.el.state.objects.find(o=>o.id==='names').text='Gültig';env.el.sync();timers.queued();return JSON.parse(storage.data.get(key));};
  const cases={
    kaputt:'{nicht json',
    schema:JSON.stringify({...valid(),schema:'anders/v9'}),
    abgelaufen:JSON.stringify({...valid(),savedAt:Date.now()-SESSION_GUARD_TTL_MS-1}),
    zukunft:JSON.stringify({...valid(),savedAt:Date.now()+3_600_000}),
    fremdesProdukt:JSON.stringify((d=>({...d,draft:{...d.draft,productId:'cfg_other'}}))(valid())),
    andereRevision:JSON.stringify((d=>({...d,draft:{...d.draft,profileRevision:'x:99'}}))(valid())),
    manipuliert:JSON.stringify((d=>{d.draft.design.objects.push({id:'x',type:'image',x:1,y:1,w:5,h:5});return d;})(valid())),
    fremdesDesign:JSON.stringify((d=>{d.draft.design.id='gibt-es-nicht';return d;})(valid())),
  };
  for(const [name,raw] of Object.entries(cases)){
    const storage=fakeStorage({[key]:raw}),env=mountUx({config,resources,storage,timers});
    assert.notEqual(text(env.el),'Gültig',name);assert.equal(env.banner.hidden,true,name);assert.equal(env.said.length,0,name);
    assert.equal(storage.data.has(key),false,name+': verworfener Stand wird entfernt');
  }
  const good=fakeStorage({[key]:JSON.stringify(valid())}),restored=mountUx({config,resources,storage:good,timers});
  assert.equal(text(restored.el),'Gültig');
  // Speicher wirft bei jedem Zugriff (privates Fenster, gesperrte Daten): Editor läuft normal weiter.
  const blocked=fakeStorage();blocked.failing=true;
  const env=mountUx({config,resources,storage:blocked,timers});
  assert.equal(env.banner.hidden,true);env.el.state.objects.find(o=>o.id==='names').text='Trotzdem';env.el.sync();
  assert.equal(timers.queued(),false);assert.equal(text(env.el),'Trotzdem');
  env.restart();assert.equal(env.said.at(-1),'Neu begonnen.');
});

test('createSessionGuard: ungültiger Zwischenstand lässt den letzten gültigen stehen; Zeitgeber wird entprellt',()=>{
  const storage=fakeStorage(),calls=[];let payload={draft:{a:1},uploads:[]},queue=[];
  const guard=createSessionGuard({storage,productId:'cfg_1',profileRevision:'cfg_1:1',payload:()=>{if(payload instanceof Error)throw payload;return payload;},restore:d=>calls.push(d),clock:()=>1000,delayMs:2000,schedule:(fn,ms)=>{queue.push({fn,ms});return queue.length;},cancel:id=>{queue[id-1]=null;}});
  guard.touch();assert.equal(queue.length,0,'vor arm() wird nichts geplant');
  guard.arm();guard.touch();guard.touch();guard.touch();
  assert.deepEqual(queue.map(q=>q&&q.ms),[null,null,2000],'nur der letzte Zeitgeber bleibt');
  assert.equal(guard.pending(),true);queue[2].fn();assert.equal(guard.pending(),false);
  assert.deepEqual(JSON.parse(storage.data.get(guard.key)).draft,{a:1});
  payload=Error('ungültig');assert.equal(guard.flush(),false);
  assert.deepEqual(JSON.parse(storage.data.get(guard.key)).draft,{a:1},'letzter gültiger Stand bleibt');
  payload={draft:{a:2},uploads:[{objectId:'o',uploadId:'u',kind:'logo',name:'l.png',extra:'nicht speichern'}]};assert.equal(guard.flush(),true);
  assert.deepEqual(JSON.parse(storage.data.get(guard.key)).uploads,[{objectId:'o',uploadId:'u',kind:'logo',name:'l.png'}]);
  assert.deepEqual(guard.recover(),{uploads:[{objectId:'o',uploadId:'u',kind:'logo',name:'l.png'}],savedAt:1000});assert.deepEqual(calls,[{a:2}]);
  assert.deepEqual(uploadReferences([{id:'p',uxUploadId:'u1',uxUploadKind:'photo'},{id:'t',type:'text'}],new Map([['u1',{file:{name:'f.jpg'}}]])),[{objectId:'p',uploadId:'u1',kind:'photo',name:'f.jpg'}]);
  assert.throws(()=>createSessionGuard({storage,productId:'',profileRevision:'r',payload(){},restore(){}}));
});
