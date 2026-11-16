import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareSteelPurchaseGuard,STEEL_PURCHASE_GUARD,STEEL_PRODUCT,STEEL_PROFILE,STEEL_GUARD_SELECTORS,run} from '../../ops/shopify/prepare-steel-purchase-guard.mjs';
const gate=`{%- if product.id == ${STEEL_PRODUCT} and gv_konfi_id == '${STEEL_PROFILE}' -%}`;
const presentation='<script type="application/json" id="gravuru-konfi-presentation">{"ui":"prio-r15","variants":["58104606556540"]}</script>';
const liquid=gate+presentation+'{%- endif -%}<a data-gravuru-start href="/apps/konfigurator/start?variant=58104606556540&amp;ui=prio-r15">Jetzt personalisieren</a>';
const fixture=()=>({sections:{main:{blocks:{custom_liquid_mTPWzc:{settings:{custom_liquid:liquid}},buy_buttons:{settings:{show_dynamic_checkout:false}}}},foreign:{type:'recommendations'}},order:['main','foreign']});
test('guard changes exactly one custom-Liquid string and retains the existing link and metadata bytes',()=>{
 const before=fixture(),result=prepareSteelPurchaseGuard(JSON.stringify(before)),after=JSON.parse(result.text);
 const setting=after.sections.main.blocks.custom_liquid_mTPWzc.settings;
 assert.equal(setting.custom_liquid.replace(STEEL_PURCHASE_GUARD,''),liquid);
 setting.custom_liquid=liquid;assert.deepEqual(after,before);
 assert.equal(result.manifest.externalWrites,false);
});
test('guard is inside exact product/profile condition and every selector requires target product plus section',()=>{
 const result=prepareSteelPurchaseGuard(JSON.stringify(fixture())),start=result.liquid.indexOf(gate),style=result.liquid.indexOf(STEEL_PURCHASE_GUARD),end=result.liquid.indexOf('{%- endif -%}',start);
 assert(start>=0&&style>start&&style<end);
 assert(STEEL_GUARD_SELECTORS.every(v=>v.includes(`data-product-id="${STEEL_PRODUCT}"`)&&v.includes('{{ section.id }}')));
 assert.equal(STEEL_GUARD_SELECTORS.length,6);
 assert(!STEEL_PURCHASE_GUARD.includes('<script'));assert(!STEEL_PURCHASE_GUARD.includes(':has('));
 assert(STEEL_GUARD_SELECTORS.every(v=>v.endsWith('button[name="add"]')||v.endsWith('.shopify-payment-button')));
});
test('wrong product/profile, duplicate insertion and presentation outside the condition fail closed',()=>{
 for(const changed of [liquid.replace(STEEL_PRODUCT,'99'),liquid.replace(STEEL_PROFILE,'foreign'),presentation+gate+'{%- endif -%}',gate+'{%- endif -%}'+presentation,liquid+presentation,liquid+STEEL_PURCHASE_GUARD]){
  const data=fixture();data.sections.main.blocks.custom_liquid_mTPWzc.settings.custom_liquid=changed;assert.throws(()=>prepareSteelPurchaseGuard(JSON.stringify(data)));
 }
});
test('CLI refuses an unreviewed source before creating outputs or reading markup',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'steel-guard-test-')),file=path.join(dir,'changed.json');
 try{const out=path.join(dir,'output');fs.writeFileSync(file,JSON.stringify(fixture()));
  assert.throws(()=>run(['--theme',file,'--markup-root',dir,'--out',out]),/Pinned PR198 candidate changed/);assert.equal(fs.existsSync(out),false);
 }finally{if(fs.existsSync(file))fs.unlinkSync(file);fs.rmdirSync(dir);}
});
