import fs from 'node:fs';import assert from 'node:assert/strict';
import {pageConfig,currentVariant,startHref} from './over250-patch/app/workshop/ui/shop-embed.mjs';
const inventory=JSON.parse(fs.readFileSync(new URL('./main-target-preview/variant-mapping.preview.json',import.meta.url)));
const ids=inventory.shopifySnapshotPages.flatMap(p=>p.variantIds).map(s=>s.split('/').at(-1));
const selected='58104626479484',productId='16190784602492';assert.equal(ids.indexOf(selected)+1,331);
function doc(variantId){const form={value:variantId,querySelector:s=>s==='[name="id"]'?{value:form.value}:s==='[type="submit"],[name="add"]'?{}:null,closest:()=>null};return {form,getElementById:key=>key==='gravuru-konfi'?{textContent:JSON.stringify({productId,variantId,variants:ids.slice(0,250),back:'/products/target'})}:null,querySelectorAll:()=>[form]};}
const direct=doc(selected),directConfig=pageConfig(direct);assert.equal(directConfig.variantId,selected);assert.equal(directConfig.variants.length,250);
const actual=new URL(startHref(directConfig,currentVariant(directConfig,direct),''),'https://shop.example/').searchParams.get('variant');assert.equal(actual,selected);
const changed=doc(ids[0]),changedConfig=pageConfig(changed);assert.equal(currentVariant(changedConfig,changed),ids[0]);changed.form.value=selected;assert.equal(currentVariant(changedConfig,changed),selected);
assert.equal(new URL(startHref(changedConfig,selected,''),'https://shop.example/').searchParams.get('variant'),selected);
console.log(JSON.stringify({sourceVariantCount:ids.length,targetPosition:331,directStartVariant:actual,changedFormStartVariant:selected,listLength:directConfig.variants.length,liveWrites:false}));
