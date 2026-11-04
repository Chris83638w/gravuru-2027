import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {familyProductConfig} from './product-families.mjs';
import {productPreview} from './product-preview.mjs';

// Vorlagen-Renderer (scripts/render-vorlagen.mjs): gleiche Vorschau wie der Konfi (adapter.mjs)
// – Schraubenköpfe bei „mit Schrauben“, einmaliges Ausweichen nur auf ausdrücklichen Wunsch.
function signConfig(){
 const f=JSON.parse(fs.readFileSync(new URL('./test-fixtures/acryl3-rear/steel.json',import.meta.url))),size=f.sizes.find(s=>s.groupKey==='AB'&&s.widthMm===120&&s.heightMm===80);
 const config=familyProductConfig({...f,groups:f.groups.filter(g=>g.key===size.groupKey),sizes:[size],mountingRules:f.mountingRules.filter(r=>size.mounting.includes(r.id))},size,1);
 const values=config.profile.optionGroups.find(g=>g.id==='mounting').values;
 return {config,screws:values.find(v=>v.holes?.length&&/S$/.test(v.id))?.id,drilled:values.find(v=>v.holes?.length&&!/S$/.test(v.id))?.id};
}

test('workshop preview draws screw heads like the configurator, only for the screw option',()=>{
 const {config,screws,drilled}=signConfig();
 assert(screws&&drilled,'fixture offers drilled and screwed mounting');
 assert.match(productPreview({universal:config},{options:{mounting:screws}}),/data-m-screws="true"/);
 assert.doesNotMatch(productPreview({universal:config},{options:{mounting:drilled}}),/data-m-screws/);
 assert.doesNotMatch(productPreview({universal:config},{}),/data-m-screws/);
});

test('hole avoidance runs only when requested and never changes the saved design',()=>{
 const {config,drilled}=signConfig(),d=config.profile.designs.find(d=>d.id===config.profile.defaultDesignId)||config.profile.designs[0];
 const holes=config.profile.optionGroups.find(g=>g.id==='mounting').values.find(v=>v.id===drilled).holes;
 const text=d.objects.find(o=>o.type==='text');text.text='Familie Mustermann-Rosenberg';text.y=holes[0].y;text.w=config.profile.geometry.width;
 const before=structuredClone(config);
 const plain=productPreview({universal:config},{options:{mounting:drilled}}),placed=productPreview({universal:config},{options:{mounting:drilled},mountingPlacement:true});
 assert.notEqual(plain,placed,'text over a hole is moved for the template preview');
 assert.deepEqual(config,before,'preview works on a copy');
});
