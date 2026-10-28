import test from 'node:test';
import assert from 'node:assert/strict';
import {installRestoredNotice,motifTileSelected} from './ux-details.mjs';

function restoredFixture(hidden=true){
 let now=0,next=0,callback;const timers=new Map(),label={textContent:'old',setAttribute(){}},details={open:true,removeAttribute(){this.open=false;}};
 const note={hidden,classList:{add(){}},querySelector(selector){return selector==='.ux-restored'?details:label;}};
 class Observer{constructor(fn){callback=fn;}observe(){}disconnect(){callback=null;}}
 const stop=installRestoredNotice(note,{Observer,schedule(fn,ms){const id=++next;timers.set(id,{at:now+ms,fn});return id;},cancel:id=>timers.delete(id)});
 const visible=value=>{note.hidden=!value;callback?.();};
 const tick=ms=>{now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();callback?.();}};
 return {note,label,details,timers,visible,tick,stop,notify:()=>callback?.()};
}

test('restored notice starts on actual recovery and completely hides after four seconds',()=>{
 const f=restoredFixture();assert.equal(f.label.textContent,'✓ Stand wiederhergestellt');assert.equal(f.timers.size,0);
 f.visible(true);f.tick(3999);assert.equal(f.note.hidden,false);f.notify();
 f.tick(1);assert.equal(f.note.hidden,true);assert.equal(f.details.open,false);assert.equal(f.timers.size,0,'no empty or repeating toast');f.stop();
});

test('already restored state gets its full notice lifetime; dismiss/recover starts a fresh lifetime',()=>{
 const f=restoredFixture(false);f.tick(2000);f.visible(false);assert.equal(f.timers.size,0);
 f.visible(true);f.tick(3999);assert.equal(f.note.hidden,false);f.tick(1);assert.equal(f.note.hidden,true);
 f.visible(true);f.stop();assert.equal(f.timers.size,0);f.tick(5000);assert.equal(f.note.hidden,false,'cleanup does not change the restored design or dismiss another notice');
});

test('motif tile tick follows selection, Undo and deletion instead of hover or click history',()=>{
 const state={selected:'house',objects:[{id:'house',type:'motif',motif:'M-HOUSE'},{id:'heart',type:'motif',motif:'M-HEART'},{id:'name',type:'text',text:'Anna'}]};
 assert.equal(motifTileSelected(state,'M-HOUSE'),true);assert.equal(motifTileSelected(state,'M-HEART'),false);
 state.selected='heart';assert.equal(motifTileSelected(state,'M-HOUSE'),false);assert.equal(motifTileSelected(state,'M-HEART'),true);
 state.selected='name';assert.equal(motifTileSelected(state,'M-HEART'),false);
 state.selected='house';state.objects[0].uxHidden=true;assert.equal(motifTileSelected(state,'M-HOUSE'),false);
 state.objects=state.objects.filter(o=>o.id!=='house');assert.equal(motifTileSelected(state,'M-HOUSE'),false);
});
