import test from 'node:test';
import assert from 'node:assert/strict';
import {customerFieldLabel} from './text-fields.mjs';
import {textLimits,textLimitIssue,clampText,textLimitCount} from '../../workshop/theme-limits.mjs';

test('a new revision allows 50 characters on each line; old revisions keep their limits',()=>{
 const object={text:'Anna',maxLength:32,maxLines:2},design={themes:['namensschilder']};
 const old=textLimits(object,design,{}),next=textLimits(object,design,{},{textRules:{maxCharsPerLine:50}});
 assert.equal(textLimitIssue('x'.repeat(33),old),'Text zu lang: höchstens 32 Zeichen.');
 const two='x'.repeat(50)+'\n'+'y'.repeat(50);
 assert.equal(textLimitIssue(two,next),'');assert.equal(clampText(two,next),two);assert.equal(textLimitCount(two,next),50);
 assert.match(textLimitIssue('x'.repeat(51)+'\ny',next),/50 Zeichen je Zeile/);
 assert.equal(clampText('x'.repeat(51)+'\n'+'y'.repeat(51),next),two);
 assert.match(textLimitIssue('x\ny\nz',next),/Höchstens 2 Zeilen/);
 assert.equal(clampText('x\ny\nz',next,'vorher'),'vorher');
 assert.match(textLimitIssue('😀'.repeat(51),next),/50 Zeichen/);
 assert.equal(clampText('😀'.repeat(51),next),'😀'.repeat(50));
 assert.equal(textLimitIssue('x'.repeat(50)+'\r\n'+'y'.repeat(50),next),'');
});
test('customer labels use template semantics even after editing the customer text',()=>{
 const design={objects:[{id:'family',type:'text',fieldKey:'name',text:'Meyer'},{id:'first',type:'text',text:'Kerstin & Ralf'},{id:'from',type:'text',text:'von'},{id:'street',type:'text',text:'Seeblickstraße 32'}],customerFields:[{id:'family',label:'Name'},{id:'first',label:'Text 2'}]};
 assert.deepEqual(design.objects.map((o,i)=>customerFieldLabel({...o,text:'Geändert'},i,design)),['Nachname','Vornamen','Zeile „von“','Adresse']);
 assert.equal(customerFieldLabel({id:'other',text:'Noch unbekannt'},0,{customerFields:[{id:'other',label:'Eigene Überschrift'}]}),'Eigene Überschrift');
 const pair={objects:[{id:'text-1',type:'text',fieldKey:'name',text:'Thorsten & Marion'}],customerFields:[{id:'text-1',label:'Name'}]};
 assert.equal(customerFieldLabel({...pair.objects[0],text:'Neue Eingabe'},0,pair),'Vornamen');
 pair.customerFields[0].label='Ansprechpartner';
 assert.equal(customerFieldLabel(pair.objects[0],0,pair),'Ansprechpartner');
});
