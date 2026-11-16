import test from 'node:test';
import assert from 'node:assert/strict';
import {installDialogDismissal} from './dialog-dismiss.mjs';
function fixture(){const handlers={};installDialogDismissal({addEventListener:(name,fn)=>handlers[name]=fn});
 const dialog={open:true,closest(){return this;},getBoundingClientRect:()=>({left:100,right:300,top:100,bottom:300}),close(){this.open=false;}};
 const emit=(type,x,target=dialog,button=0)=>{const event={target,clientX:x,clientY:150,button,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};handlers[type]?.(event);return event;};return {dialog,emit};}
test('a later-created dialog closes on either backdrop side and consumes the click',()=>{
 for(const x of [50,350]){const f=fixture();f.emit('pointerdown',x);const click=f.emit('click',x);assert.equal(f.dialog.open,false);assert.equal(click.prevented,true);assert.equal(click.stopped,true);}
});
test('inside clicks, inside-to-outside drags, cancellation and right clicks keep the dialog open',()=>{
 for(const mode of ['inside','drag','cancel','right']){const f=fixture();f.emit('pointerdown',mode==='inside'||mode==='drag'?150:50,f.dialog,mode==='right'?2:0);if(mode==='cancel')f.emit('pointercancel',50);f.emit('click',mode==='inside'?150:50);assert.equal(f.dialog.open,true,mode);}
});
