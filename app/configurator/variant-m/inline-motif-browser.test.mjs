import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {installInlineMotifBrowser} from './inline-motif-browser.mjs';
import {SCREW_HEAD_IMAGE} from './screw-head-image.mjs';

function fixture(offered=true){
 const buttons=['bestsellers','discover-motifs'].map(action=>({dataset:{ux:action},attrs:{},setAttribute(k,v){this.attrs[k]=v;}}));
 const root={querySelectorAll:()=>buttons,addEventListener(type,fn){this.click=fn;}};
 const panel={hidden:false,search:{value:'Wasser'},category:{value:'Maritim'},scrollTop:120},bestsellers={hidden:!offered};
 installInlineMotifBrowser({root,panel,bestsellers});
 const click=action=>root.click({target:{closest:()=>action?{dataset:{ux:action}}:null}});
 return {panel,bestsellers,buttons,click};
}
test('library replaces Bestseller grid inline and retains the original search controls across switches',()=>{
 const f=fixture(),search=f.panel.search,category=f.panel.category;
 assert(f.panel.hidden);assert(!f.bestsellers.hidden);
 f.click('discover-motifs');assert(!f.panel.hidden);assert(f.bestsellers.hidden);assert.equal(f.buttons[1].attrs['aria-pressed'],'true');
 f.click(null);assert(!f.panel.hidden,'a motif click must not close the library');
 f.click('bestsellers');assert(f.panel.hidden);assert(!f.bestsellers.hidden);
 f.click('discover-motifs');assert.equal(f.panel.search,search);assert.equal(f.panel.category,category);assert.equal(search.value,'Wasser');assert.equal(category.value,'Maritim');assert.equal(f.panel.scrollTop,120);
});
test('a product without Bestseller suggestions exposes its library without inventing recommendations',()=>{
 const f=fixture(false);assert(!f.panel.hidden);assert(f.bestsellers.hidden);f.click('bestsellers');assert(!f.panel.hidden);assert(f.bestsellers.hidden);
});
test('photorealistic screw uses unchanged original WebP bytes',()=>{
 const original=fs.readFileSync(new URL('../../designs/aosu-labrador/runtime/images/gravuru-schraubenkopf-fotorealistisch.webp',import.meta.url));
 assert.deepEqual(Buffer.from(SCREW_HEAD_IMAGE.split(',')[1],'base64'),original);
});
test('custom size arrows use the real existing step handler and respect scale permission',()=>{
 const source=fs.readFileSync(new URL('./direct-editing.mjs',import.meta.url),'utf8');
 const a=source.indexOf("  for(const b of panel.querySelectorAll('[data-direct-step]'))b.addEventListener"),z=source.indexOf('\n',a);assert(a>=0&&z>a);
 const buttons=['bigger','smaller'].map(step=>({dataset:{directStep:step},addEventListener(type,fn){this.click=fn;}}));
 let allowed=true;const seen=[],object={id:'text'};
 const context={panel:{querySelectorAll:()=>buttons},selected:()=>object,can:(o,right)=>o===object&&right==='scale'&&allowed,r:{querySelector:selector=>({click:()=>seen.push(selector)})}};
 vm.runInNewContext(source.slice(a,z),context);buttons.forEach(b=>b.click());assert.deepEqual(seen,['[data-ux=bigger]','[data-ux=smaller]']);allowed=false;buttons.forEach(b=>b.click());assert.equal(seen.length,2);
});
