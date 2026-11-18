import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionIds, designFontSelection, motifChoices, bestsellerChoices, colorPalettes} from './profile-selection.mjs';
import {captureDesignContent,carryDesignContent} from './design-content-transfer.mjs';

test('design change carries customer text, takes target fonts and restores the source list with undo state',()=>{
 const source={id:'a',objects:[{id:'name',type:'text',fieldKey:'name',text:'Anna',font:'Original A',customerEditable:true,x:20,y:20,w:20,h:5,size:5}]};
 const target={id:'b',objects:[{...source.objects[0],text:'Maria',font:'Original B'}]};
 const config={profile:{geometry:{width:120,height:80}},photo:{enabled:false}};
 const previous={designId:source.id,objects:structuredClone(source.objects)};previous.objects[0].text='Chris';
 const next={designId:target.id,...carryDesignContent(captureDesignContent(previous.objects,source),target,config)};
 const templates=[source,target],choices=state=>designFontSelection(['Group'],templates.find(d=>d.id===state.designId));
 assert.equal(next.objects[0].text,'Chris');assert.equal(next.objects[0].font,'Original B');
 assert.deepEqual(choices(next),['Group','Original B']);
 assert.deepEqual(choices(previous),['Group','Original A']);assert.equal(previous.objects[0].font,'Original A');
});

test('font choices include only the open original design, with no truncation or resource mutation',()=>{
 const group=Object.freeze(Array.from({length:29},(_,i)=>'Group '+i));
 const a=Object.freeze({objects:[{type:'text',font:'Original A'},{type:'text',font:'Original B'},{type:'text',font:'Original A'},{type:'motif',font:'not a typeface'}]});
 const b=Object.freeze({objects:[{type:'text',font:'Original C'}]});
 const all=[...group,'Original A','Original B','Original C','Customer injection'];
 const before=JSON.stringify({group,a,b});
 assert.deepEqual(designFontSelection(group,a),[...group,'Original A','Original B']);
 assert.deepEqual(selectionIds(all,designFontSelection(group,b)),[...group,'Original C']);
 assert.deepEqual(designFontSelection([],a),['Original A','Original B']);
 assert.equal(designFontSelection(null,a),null);
 assert.equal(designFontSelection(undefined,a),null);
 assert.throws(()=>designFontSelection('Original A',a),/Profilauswahl/);
 assert.equal(JSON.stringify({group,a,b}),before);
});

test('missing/null keeps choices, empty disables new choices, explicit order is preserved', () => {
  const available = ['Default Font', 'Script', 'Default Font', 'Serif'];
  assert.deepEqual(selectionIds(available), ['Default Font', 'Script', 'Serif']);
  assert.deepEqual(selectionIds(available, null), ['Default Font', 'Script', 'Serif']);
  assert.deepEqual(selectionIds(available, []), []);
  assert.deepEqual(selectionIds(available, ['Serif', 'missing', 'Script', 'Serif']), ['Serif', 'Script']);
  assert.throws(() => selectionIds(available, 'Script'), /Profilauswahl/);
});

test('library choices omit embedded template motifs without deleting their resource or object', () => {
  const entries = Object.freeze([{key:'heart', category:'Love'}, {key:'house', category:'Home'}, {key:'fixed', embeddedOnly:true}, {key:'heart', category:'Duplicate'}].map(Object.freeze));
  const resources = Object.freeze(Object.fromEntries(entries.map(entry => [entry.key, '<path/>'])));
  const design = Object.freeze({objects:Object.freeze([{type:'motif', motif:'fixed'}, {type:'text', font:'Unlisted Font'}])});
  const before = JSON.stringify({entries, resources, design});
  const choices = motifChoices(entries, ['house', 'fixed', 'heart'], new Set(['fixed']));
  assert.deepEqual(choices.map(entry => entry.key), ['house', 'heart']);
  assert.equal(choices[1].category, 'Love');
  assert.equal(JSON.stringify({entries, resources, design}), before);
});

test('bestsellers respect configured order, empty and allowed motif intersection', () => {
  const choices = [{key:'heart'}, {key:'flower'}];
  const fallback = [{key:'house'}, {key:'heart'}];
  assert.deepEqual(bestsellerChoices(choices, fallback), [{key:'heart'}]);
  assert.deepEqual(bestsellerChoices(choices, fallback, []), []);
  assert.deepEqual(bestsellerChoices(choices, fallback, ['flower','house','heart']), [{key:'flower'},{key:'heart'}]);
  assert.deepEqual(bestsellerChoices([], fallback, ['heart']), []);
});

test('Grundmotive disappear from selection and bestsellers while template resources remain intact',()=>{
 const entries=Object.freeze([{key:'base-heart',category:'Grundmotive'},{key:'flower',category:'Blumen'}].map(Object.freeze));
 const template=Object.freeze({objects:Object.freeze([{type:'motif',motif:'base-heart'}])}),before=JSON.stringify({entries,template});
 const choices=motifChoices(entries,['base-heart','flower']);
 assert.deepEqual(choices.map(m=>m.key),['flower']);
 assert.deepEqual(bestsellerChoices(choices,[{key:'base-heart'},{key:'flower'}]),[{key:'flower'}]);
 assert.equal(JSON.stringify({entries,template}),before);
});

test('preset colors normalize/dedupe while null inherits and empty has no presets', () => {
  const fallback = [['Standardfarben', [['Rot','#ff0000'], ['Schwarz','#000000']]]];
  const before = structuredClone(fallback);
  assert.deepEqual(colorPalettes(fallback), fallback);
  assert.notEqual(colorPalettes(fallback), fallback);
  assert.deepEqual(colorPalettes(fallback, []), []);
  assert.deepEqual(colorPalettes(fallback, ['#AABBCC','#ff0000','#aabbcc']), [['Empfohlene Farben', [['#AABBCC','#aabbcc'],['Rot','#ff0000']]]]);
  assert.deepEqual(fallback, before);
  assert.throws(() => colorPalettes(fallback, ['red']), /Profilfarbe/);
});

test('starter grid fills from allowed existing motifs while preserving curated bestseller lists',()=>{
 const available=Array.from({length:24},(_,i)=>({key:'motif-'+i})),fallback=[{key:'blocked'},{key:'motif-5'},{key:'motif-1'}];
 const before=JSON.stringify({available,fallback}),filled=bestsellerChoices(available,fallback,null,{fillTo:18});
 assert.equal(filled.length,18);assert.deepEqual(filled.slice(0,2),[{key:'motif-5'},{key:'motif-1'}]);assert.equal(new Set(filled.map(m=>m.key)).size,18);assert.ok(filled.every(m=>available.some(a=>a.key===m.key)));
 assert.deepEqual(bestsellerChoices(available,fallback,[],{fillTo:18}),[]);
 assert.deepEqual(bestsellerChoices(available,fallback,['motif-9','blocked','motif-2'],{fillTo:18}),[{key:'motif-9'},{key:'motif-2'}]);
 assert.equal(bestsellerChoices(available.slice(0,3),fallback,null,{fillTo:18}).length,3);
 assert.equal(JSON.stringify({available,fallback}),before);
});
