import test from 'node:test';
import assert from 'node:assert/strict';
import {installTemplateDeletion} from './template-deletion.mjs';

function fixture(t){
 const prior=globalThis.document;t.after(()=>{globalThis.document=prior;});
 globalThis.document={createElement:()=>({setAttribute(){}})};
 const objects=[{id:'name',type:'text',required:true,text:'Tebby'},{id:'locked',type:'motif',technicalLocked:true},{id:'anchor',type:'motif',customerEditable:true}];
 const config={profile:{designs:[{id:'dog',objects:structuredClone(objects.slice(0,2))}]},workshopElementRights:{dog:{name:{delete:true},locked:{delete:false}}}};
 const control={disabled:false,dataset:{ux:'delete'},closest(){return this;}},listeners={},undo=[];
 const r={addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:s=>s.includes('content-row')?[]:[control],querySelector:()=>({append(){}})};
 const el={state:{designId:'dog',selected:'name',objects},sync(){},render(){}};
 const selected=()=>el.state.objects.find(o=>o.id===el.state.selected);
 installTemplateDeletion({el,r,config,selected,mutate:fn=>{undo.push(structuredClone(el.state));fn();el.sync();},say(){}})();
 return {el,control,undo,select(id){el.state.selected=id;el.sync();},remove(){assert.equal(control.disabled,false);listeners.click({target:control,preventDefault(){},stopImmediatePropagation(){}});}};
}
test('required text with delete permission is removed and ordinary undo restores it',t=>{
 const h=fixture(t);h.remove();assert(!h.el.state.objects.some(o=>o.id==='name'));
 h.el.state=h.undo.pop();h.el.sync();assert.equal(h.el.state.objects.find(o=>o.id==='name').text,'Tebby');
});
test('a protected selection cannot leave the next added motif trash disabled',t=>{
 const h=fixture(t);h.select('locked');assert.equal(h.control.disabled,true);
 h.select('anchor');assert.equal(h.control.disabled,false);h.remove();assert(!h.el.state.objects.some(o=>o.id==='anchor'));
 assert(h.el.state.objects.some(o=>o.id==='locked'));h.select('name');h.remove();assert(!h.el.state.objects.some(o=>o.id==='name'));
});
