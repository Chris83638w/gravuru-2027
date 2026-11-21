// #265, ENTSCHEIDUNGEN 3.56 („Vorab sichern“): Schlüssel, Kette, Wiederverwendung und Fehlerfälle ohne DOM.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCartPresave,presaveKey} from './shop-cart-presave.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
// Attrappe der Arbeit aus shop-cart.mjs: `stand.key` ist der jetzige Stand, jede Sicherung bekommt die nächste Revision.
function work(stand,log,{prepare,save}={}){
 const key=stand.key;
 return {current:()=>stand.key,
  prepare:prepare||(async()=>{log.push('prepare '+key);return {payload:key};}),
  save:save||(async payload=>{log.push('save '+payload.payload);return {saved:{revision:log.filter(l=>l.startsWith('save ')).length},payload:payload.payload};})};
}

test('Schlüssel: Gestaltung, Menge und die Identität der Warenkorbzeile – nicht der private Zugriff',()=>{
 const edit={configId:'konfig_a',rev:2,cartLineId:'theme',draftId:'adraft_a',draftToken:'t'.repeat(64),draftRevision:5};
 const base=presaveKey('{"objects":[]}',1,edit);
 assert.equal(presaveKey('{"objects":[]}',1,{...edit}),base);
 assert.equal(presaveKey('{"objects":[]}',1,{...edit,draftToken:'u'.repeat(64),draftRevision:6}),base,'Zugriff und Entwurfsrevision gehören nicht zum Schlüssel');
 assert.ok(!base.includes(edit.draftToken));
 assert.notEqual(presaveKey('{"objects":[1]}',1,edit),base);
 assert.notEqual(presaveKey('{"objects":[]}',2,edit),base);
 for(const patch of [{configId:'konfig_b'},{rev:3},{cartLineId:null},{draftId:'adraft_b'}])assert.notEqual(presaveKey('{"objects":[]}',1,{...edit,...patch}),base,JSON.stringify(patch));
 assert.notEqual(presaveKey('{"objects":[]}',1,null),base);
 assert.equal(presaveKey('{"objects":[]}',1,null),presaveKey('{"objects":[]}',1,undefined));
 // Menge und Gestaltung lassen sich nicht gegeneinander verschieben.
 assert.notEqual(presaveKey('1',11,null),presaveKey('11',1,null));
});

test('gleicher Schlüssel: genau eine Sicherung, das Ergebnis wird beim Klick verwendet',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[];
 assert.equal(presave.start('A',work(stand,log)),true);
 await flush();
 // Übersicht schließen und unverändert wieder öffnen.
 assert.equal(presave.start('A',work(stand,log)),false);
 await flush();
 assert.deepEqual(log,['prepare A','save A']);
 const early=presave.take('A');
 assert.equal(early.pending,false);
 assert.deepEqual(await early.saved,{saved:{revision:1},payload:'A'});
 assert.deepEqual(log,['prepare A','save A'],'der Klick sichert nicht noch einmal');
});

test('anderer Schlüssel: die neue Sicherung beginnt erst nach dem Ende der vorigen – auch wenn diese fehlschlägt',async()=>{
 for(const fails of [false,true]){
  const presave=createCartPresave(),stand={key:'A'},log=[],first=deferred();
  presave.start('A',work(stand,log,{save:payload=>{log.push('save '+payload.payload);return first.promise;}}));
  await flush();
  assert.deepEqual(log,['prepare A','save A']);
  stand.key='B';
  assert.equal(presave.start('B',work(stand,log)),true);
  await flush();
  assert.deepEqual(log,['prepare A','save A','prepare B'],'nie zwei Sicherungen gleichzeitig');
  if(fails)first.reject(Error('Netz'));else first.resolve({saved:{revision:1}});
  await flush();
  assert.deepEqual(log,['prepare A','save A','prepare B','save B']);
  assert.equal(presave.take('A'),null,'der ältere Stand passt nicht mehr');
  const early=presave.take('B');assert.equal(early.pending,false);assert.equal((await early.saved).payload,'B');
 }
});

test('ein laufender Vorab-Stand wird beim Klick abgewartet, ohne zweite Sicherung',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[],running=deferred();
 presave.start('A',work(stand,log,{save:payload=>{log.push('save '+payload.payload);return running.promise;}}));
 const early=presave.take('A');
 assert.equal(early.pending,true);
 let settled=false;early.saved.then(()=>{settled=true;},()=>{settled=true;});
 await flush();
 assert.equal(settled,false);assert.deepEqual(log,['prepare A','save A']);
 running.resolve({saved:{revision:1}});
 assert.deepEqual(await early.saved,{saved:{revision:1}});
 assert.deepEqual(log,['prepare A','save A']);
});

test('fehlgeschlagener Vorab-Stand bleibt still; der Klick sichert selbst und meldet seinen eigenen Fehler',async t=>{
 const unhandled=[],listen=reason=>unhandled.push(reason);process.on('unhandledRejection',listen);t.after(()=>process.off('unhandledRejection',listen));
 const presave=createCartPresave(),stand={key:'A'},log=[];
 presave.start('A',work(stand,log,{save:async()=>{log.push('save A');throw Error('Vorab-Fehler');}}));
 await flush();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(unhandled,[],'kein Fehler nach außen');
 assert.equal(presave.take('A'),null);
 assert.equal(presave.start('A',work(stand,log)),false,'derselbe Stand wird nicht ein zweites Mal vorab gesichert');
 await assert.rejects(presave.save('A',async()=>{log.push('click save A');throw Error('Die Gestaltung wurde inzwischen geändert. Bitte erneut sichern.');}),/inzwischen geändert/);
 assert.deepEqual(await presave.save('A',async()=>{log.push('click save A');return {saved:{revision:1}};}),{saved:{revision:1}});
 assert.deepEqual(log,['prepare A','save A','click save A','click save A']);
 // Schlägt er fehl, während der Klick schon wartet, erfährt der Klick das und sichert danach selbst.
 const later=createCartPresave(),running=deferred();
 later.start('A',work(stand,[],{save:()=>running.promise}));
 const early=later.take('A');assert.equal(early.pending,true);
 await flush();
 running.reject(Error('Vorab-Fehler'));
 assert.equal(await early.saved.catch(()=>null),null);
 assert.equal(await later.save('A',async()=>'vom Klick gesichert'),'vom Klick gesichert');
 assert.deepEqual(unhandled,[]);
});

test('Stand während des Vorab-Sicherns geändert: verworfen, nichts abgeschickt, derselbe Stand kann später neu gesichert werden',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[],preparing=deferred();
 presave.start('A',work(stand,log,{prepare:()=>{log.push('prepare A');return preparing.promise;}}));
 stand.key='B';
 preparing.resolve({payload:'A'});
 await flush();
 assert.deepEqual(log,['prepare A'],'nach dem Bilden des payload geprüft: kein Sicherungsabruf');
 assert.equal(presave.take('A'),null);assert.equal(presave.take('B'),null);
 stand.key='A';
 assert.equal(presave.start('A',work(stand,log)),true,'verworfen heißt vergessen');
 await flush();
 assert.deepEqual(log,['prepare A','prepare A','save A']);
 // Auch ein Fehler beim Bilden (print-export meldet die Änderung selbst) zählt bei geändertem Stand als verworfen.
 const other=createCartPresave(),state={key:'A'},failing=deferred();
 other.start('A',work(state,[],{prepare:()=>failing.promise}));
 state.key='B';failing.reject(Error('Die Gestaltung wurde geändert. Bitte den Download erneut starten.'));
 await flush();
 state.key='A';
 assert.equal(other.start('A',work(state,[])),true);
});

test('Stand geändert, während die vorige Sicherung noch läuft: der wartende Vorab-Stand wird nicht mehr abgeschickt',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[],first=deferred();
 presave.start('A',work(stand,log,{save:payload=>{log.push('save '+payload.payload);return first.promise;}}));
 await flush();
 stand.key='B';presave.start('B',work(stand,log));
 await flush();
 stand.key='C';
 first.resolve({saved:{revision:1}});
 await flush();
 assert.deepEqual(log,['prepare A','save A','prepare B'],'B wurde verworfen, bevor es abgeschickt wurde');
 assert.equal(presave.take('B'),null);
});

test('ein überholter Vorab-Stand sichert nicht mehr, auch wenn die Gestaltung wieder gleich aussieht',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[],slow=deferred();
 presave.start('A',work(stand,log,{prepare:()=>{log.push('prepare A (langsam)');return slow.promise;}}));
 stand.key='B';presave.start('B',work(stand,log));
 await flush();
 stand.key='A';presave.start('A',work(stand,log));
 slow.resolve({payload:'A (langsam)'});
 await flush();
 assert.deepEqual(log.filter(l=>l.startsWith('save ')),['save B','save A'],'der überholte erste Lauf sichert nicht (kein „save A (langsam)“)');
 assert.equal((await presave.take('A').saved).payload,'A');
});

test('ein verbrauchter Vorab-Stand wird nicht doppelt verwendet: der zweite Klick sichert wie bisher neu',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[];
 presave.start('A',work(stand,log));
 await flush();
 assert.ok(presave.take('A'));
 assert.equal(presave.take('A'),null,'eine Entwurfsrevision geht nur einmal an den Warenkorb');
 assert.equal(presave.start('A',work(stand,log)),false,'unverändert wieder geöffnet: kein zweites Vorab-Sichern');
 assert.deepEqual(await presave.save('A',async()=>{log.push('click save A');return {saved:{revision:2}};}),{saved:{revision:2}});
 assert.equal(presave.take('A'),null,'auch die Sicherung des Klicks ist verbraucht');
 assert.deepEqual(log,['prepare A','save A','click save A']);
});

test('die Sicherung des Klicks wartet auf eine laufende Vorab-Sicherung und ist danach der jüngste Stand',async()=>{
 const presave=createCartPresave(),stand={key:'A'},log=[],running=deferred();
 presave.start('A',work(stand,log,{save:payload=>{log.push('save '+payload.payload);return running.promise;}}));
 await flush();
 // Stand geändert, ohne die Übersicht neu zu öffnen: kein passender Vorab-Stand, der Klick sichert selbst.
 stand.key='B';
 assert.equal(presave.take('B'),null);
 const click=presave.save('B',async()=>{log.push('click save B');return {saved:{revision:2}};});
 await flush();
 assert.deepEqual(log,['prepare A','save A'],'die Sicherung des Klicks beginnt erst nach der laufenden');
 running.resolve({saved:{revision:1}});
 assert.deepEqual(await click,{saved:{revision:2}});
 assert.deepEqual(log,['prepare A','save A','click save B']);
 // Zurück zum ersten Stand: Revision 1 ist nicht mehr die aktuelle und darf nicht an den Warenkorb gehen.
 stand.key='A';
 assert.equal(presave.take('A'),null);
 assert.equal(presave.start('A',work(stand,log)),true);
 await flush();
 assert.deepEqual(log,['prepare A','save A','click save B','prepare A','save A']);
});
