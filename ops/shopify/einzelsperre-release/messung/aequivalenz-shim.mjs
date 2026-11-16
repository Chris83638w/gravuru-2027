import assert from 'node:assert/strict';
import {cartTransformRun as aktiv} from './aktiv_ctr.mjs';
import {cartTransformRun as neu,cartTransformStrict as streng,rejectedPricingLines} from './neu_ctr.mjs';
export const stats={gleich:0,abgewiesen:0};
export function cartTransformRun(input){
 let out,err;try{out=aktiv(structuredClone(input));}catch(e){err=e;}
 if(err){
  assert.throws(()=>streng(structuredClone(input)),e=>e.message===err.message);
  const rej=rejectedPricingLines(structuredClone(input));assert.ok(rej.length>0);
  const ops=neu(structuredClone(input)).operations;
  for(const r of rej)assert.ok(!ops.some(o=>o.lineUpdate?.cartLineId===r.lineId&&o.lineUpdate.price));
  // jede einzeln gültige Position bekommt denselben Preis wie bei der aktiven Version allein
  input.cart.lines.forEach((l,i)=>{if(rej.some(r=>r.index===i))return;assert.deepEqual(ops.filter(o=>o.lineUpdate?.cartLineId===l.id||o.lineExpand?.cartLineId===l.id),aktiv({...structuredClone(input),cart:{...input.cart,lines:[structuredClone(l)]}}).operations.filter(o=>o.lineUpdate?.cartLineId===l.id||o.lineExpand?.cartLineId===l.id));});
  stats.abgewiesen++;throw err;
 }
 assert.deepEqual(neu(structuredClone(input)),out);assert.deepEqual(streng(structuredClone(input)),out);assert.deepEqual(rejectedPricingLines(structuredClone(input)),[]);
 stats.gleich++;return out;
}
process.on('exit',()=>console.error('VERGLEICH',JSON.stringify(stats)));
