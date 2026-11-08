import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {targetSuggestions} from './design-target-dashboard.mjs';

test('target suggestions use only materials offered for the matching subcategory and never grant targets',()=>{
 const steel=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url))),aa=JSON.parse(fs.readFileSync(new URL('../designs/acrylic-standoff-signs/aa.json',import.meta.url)));
 const master={id:'source',themes:['names'],json:{ziele:[]}},sub={id:'names',themeId:'names'},line={id:'line',name:'Line',families:[steel.id],subcategories:[sub,{id:'other',themeId:'other',familyIdsOffered:[aa.id]}]},k={families:new Map([[steel.id,steel],[aa.id,aa]]),lines:new Map([[line.id,line]])};
 const actual=()=>targetSuggestions(master,k).filter(x=>x.familie).map(x=>x.familie);
 assert.deepEqual(actual(),[steel.id]);
 sub.familyIdsOffered=[];assert.deepEqual(targetSuggestions(master,k),[],'an intentional empty offer is not a missing-family prompt');
 sub.familyIdsOffered=[aa.id];assert.deepEqual(actual(),[aa.id]);assert.deepEqual(line.families,[steel.id]);assert.deepEqual(master.json.ziele,[]);
 sub.familyIdsOffered=null;assert.deepEqual(actual(),[steel.id]);
});
