import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectionIds,designFontSelection,initialTextFont} from './profile-selection.mjs';

// Execute the actual event-handler branch so a regression at the UI call site
// cannot hide behind a helper-only test. No browser or production data needed.
const source=fs.readFileSync(new URL('./ux.mjs',import.meta.url),'utf8');
const branch=source.split('\n').find(line=>line.trimStart().startsWith("if(action==='add-text')"));
assert.ok(branch);
const execute=new (Object.getPrototypeOf(async function(){}).constructor)('action','additions','config','profileChoices','selectionIds','el','say','showTab','fontSelection','initialTextFont',branch);
const run=(action,additions,config,profileChoices,selectionIds,el,say,showTab,design=null)=>execute(action,additions,config,profileChoices,selectionIds,el,say,showTab,()=>designFontSelection(profileChoices?.fonts,design),initialTextFont);

test('adding one text waits for its one font, not the 29-font profile',async()=>{
 const selected=Array.from({length:28},(_,i)=>'Font '+i).concat('Montserrat');
 const loaded=[],added=[],tabs=[];let complete;
 const pending=new Promise(resolve=>{complete=resolve;});
 const el={fontData:{},uxKnownFonts:()=>selected,uxEnsureFonts:async names=>{loaded.push(...names);await pending;for(const n of names)el.fontData[n]={};},add:o=>added.push(o)};
 const work=run('add-text',{text:true},{},{fonts:selected},selectionIds,el,()=>assert.fail('no error expected'),tab=>tabs.push(tab));
 assert.deepEqual(loaded,['Montserrat']);assert.equal(added.length,0);
 complete();await work;
 assert.equal(added.length,1);assert.equal(added[0].font,'Montserrat');assert.deepEqual(tabs,['text']);
});

test('failed loading never inserts a text and disabled text additions never request a font',async()=>{
 const errors=[],added=[],requests=[];
 const el={fontData:{},uxKnownFonts:()=>['Montserrat'],uxEnsureFonts:async names=>{requests.push(names);throw Error('offline');},add:o=>added.push(o)};
 await run('add-text',{text:true},{},{fonts:['Montserrat']},selectionIds,el,m=>errors.push(m),()=>assert.fail());
 assert.equal(added.length,0);assert.equal(errors.length,1);assert.deepEqual(requests,[['Montserrat']]);
 await run('add-text',{text:false},{},{fonts:['Montserrat']},selectionIds,el,m=>errors.push(m),()=>assert.fail());
 assert.equal(requests.length,1);assert.equal(added.length,0);
});

test('legacy text additions retain their existing Nunito start font',async()=>{
 const requested=[],added=[];
 await run('add-text',{text:true},null,null,selectionIds,{fontData:{Nunito:{}},uxEnsureFonts:async names=>requested.push(...names),add:o=>added.push(o)},()=>assert.fail(),()=>{});
 assert.deepEqual(requested,['Nunito']);assert.equal(added[0].font,'Nunito');
});

test('start font follows an explicit group without Montserrat, or the original design for an empty group',async()=>{
 for(const [group,design,wanted] of [
  [['Caveat','Lato'],null,'Caveat'],
  [[],{objects:[{type:'text',font:'Original'}]},'Original']
 ]){
  const loaded=[],added=[],el={fontData:{},uxKnownFonts:()=>['Lato','Caveat','Original','Montserrat'],uxEnsureFonts:async names=>{loaded.push(...names);for(const n of names)el.fontData[n]={};},add:o=>added.push(o)};
  await run('add-text',{text:true},{},{fonts:group},selectionIds,el,()=>assert.fail(),()=>{},design);
  assert.deepEqual(loaded,[wanted]);assert.equal(added[0].font,wanted);
 }
});

test('no loadable font or a loader that supplies no contours never inserts an invalid text',async()=>{
 for(const known of [[],['Missing file']]){
  const added=[],errors=[],el={fontData:{},uxKnownFonts:()=>known,uxEnsureFonts:async()=>{},add:o=>added.push(o)};
  await run('add-text',{text:true},{},{fonts:['Missing file']},selectionIds,el,m=>errors.push(m),()=>assert.fail());
  assert.equal(added.length,0);assert.equal(errors.length,1);
  assert.match(errors[0],/Die Schrift konnte nicht geladen werden/);
 }
});
