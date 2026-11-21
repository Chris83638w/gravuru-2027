// #265 (ENTSCHEIDUNGEN 3.56): Sicherungsplätze. Nie mehr gleichzeitige Sicherungen als erlaubt; eine weitere wartet kurz in der
// Reihe statt sofort abgelehnt zu werden; ohne Wartezeit gilt das bisherige Verhalten (sofortiger Fehler).
import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewSlots} from './review-slots.mjs';
const busy=()=>Object.assign(Error('Eine Gestaltung wird gerade gesichert. Bitte kurz warten.'),{status:409,code:'review_busy'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('ohne Wartezeit wie bisher: der dritte Versuch wird sofort abgelehnt, nach dem Freigeben ist wieder Platz',()=>{
 const slots=createReviewSlots({max:2,busy}),a=slots.acquire(),b=slots.acquire();
 assert.equal(typeof a,'symbol');assert.equal(slots.active,2);
 assert.throws(()=>slots.acquire(),{status:409,code:'review_busy'});
 slots.release(a);assert.equal(slots.active,1);assert.equal(typeof slots.acquire(),'symbol');
 slots.release(Symbol('fremd'));slots.release(a);assert.equal(slots.active,2,'unbekannte oder schon freigegebene Plätze ändern nichts');
 slots.release(b);assert.equal(slots.active,1);
});

test('mit Wartezeit: weitere Sicherungen warten in der Reihe und bekommen den Platz in der Reihenfolge ihres Eintreffens',async()=>{
 const slots=createReviewSlots({max:2,waitMs:500,queue:3,busy}),a=slots.acquire(),b=slots.acquire(),order=[];
 const c=slots.acquire(),d=slots.acquire();
 assert.ok(c instanceof Promise&&d instanceof Promise);assert.equal(slots.waiting,2);
 c.then(job=>order.push(['c',job]));d.then(job=>order.push(['d',job]));
 slots.release(a);await sleep(5);
 assert.deepEqual(order.map(o=>o[0]),['c'],'der ältere Wartende zuerst');assert.equal(slots.active,2,'nie mehr als erlaubt');assert.equal(slots.waiting,1);
 // Ein Neuer überholt den Wartenden nicht, auch wenn rechnerisch gleich ein Platz frei wird.
 const e=slots.acquire();assert.ok(e instanceof Promise);
 slots.release(b);await sleep(5);
 assert.deepEqual(order.map(o=>o[0]),['c','d']);assert.equal(slots.active,2);
 slots.release(order[0][1]);const last=await e;assert.equal(typeof last,'symbol');assert.equal(slots.active,2);assert.equal(slots.waiting,0);
 slots.release(order[1][1]);slots.release(last);assert.equal(slots.active,0);
 assert.equal(typeof slots.acquire(),'symbol','danach wieder sofort');
});

test('wer zu lange wartet oder keine Reihe mehr findet, bekommt den bisherigen Fehler; sein Platz in der Reihe verfällt',async()=>{
 const slots=createReviewSlots({max:1,waitMs:30,queue:1,busy}),a=slots.acquire();
 const waiting=slots.acquire();
 assert.throws(()=>slots.acquire(),{status:409,code:'review_busy'},'Reihe voll');
 await assert.rejects(waiting,{status:409,code:'review_busy'});
 assert.equal(slots.waiting,0);assert.equal(slots.active,1);
 slots.release(a);assert.equal(slots.active,0,'der verfallene Wartende bekommt keinen Platz mehr');
 assert.throws(()=>createReviewSlots({max:0,busy}),RangeError);assert.throws(()=>createReviewSlots({max:1}),RangeError);
});
