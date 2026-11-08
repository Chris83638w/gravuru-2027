import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Explicit local test dependency only; never copied to Shopify or the customer runtime.
// LiquidJS 10.30.1, npm tarball integrity is recorded in the handoff.
const root=fileURLToPath(new URL('../../',import.meta.url));
const {Liquid}=createRequire(import.meta.url)(process.env.GRAVURU_LIQUIDJS_MODULE||path.join(root,'.local-data/liquidjs/package/dist/liquid.browser.umd.js'));
const engine=new Liquid({strictFilters:true});
engine.registerFilter('t',key=>key==='general.cart.edit'?'Bearbeiten':'Schließen');
engine.registerFilter('asset_url',name=>'https://cdn.shopify.com/assets/'+name);
for(const name of ['image_url','image_tag'])engine.registerFilter(name,()=>assert.fail('The unrelated Shopify product-image fallback is not used by these fixtures.'));
const before=fs.readFileSync(new URL('./theme-block/test-fixtures/cart-edit-live-before.liquid',import.meta.url),'utf8');
const repo=fs.readFileSync(new URL('./theme-block/snippets/gravuru-warenkorb-bearbeiten.liquid',import.meta.url),'utf8');
// Exactly the production delta is transplanted onto the freshly exported live file.
const addition=repo.match(/  assign gv_edit_link = [\s\S]*?\n-%}/)?.[0].replace(/\n-%}$/,'');
assert.ok(addition);
const suffix='{% if gv_ui_count == 1 and gv_ui_prio %}&amp;ui=prio-r15{% endif %}';
const marker="&amp;back={{ item.product.url | split: '?' | first | url_encode }}";
assert.equal(before.split(marker).length,2);
const live=before.replace('\n-%}', '\n'+addition+'\n-%}').replace(marker,marker+suffix);
const item=()=>({key:'123:cart-key',properties:{_gravuru_config:'konfig_11111111-1111-1111-1111-111111111111',_gravuru_rev:'4',_Entwurf:'https://cdn.shopify.com/s/files/1/uploads/preview.png'},product:{id:101,url:'/products/door?variant=202',title:'Türschild'},variant:{id:202}});
const base='https://gravuru-design.myshopify.com/apps/konfigurator/start?product=101&variant=202&config=konfig_11111111-1111-1111-1111-111111111111&rev=4&line=theme';
const render=(source,item)=>engine.parseAndRender(source.replace(/\{% doc %\}[\s\S]*?\{% enddoc %\}/,'').replace(/\{% stylesheet %\}/,'<style>').replace(/\{% endstylesheet %\}/,'</style>'),{item});
const link=html=>new URL(html.match(/class="gravuru-cart-edit"[\s\S]*?href="([^"]+)"/)[1].replaceAll('&amp;','&'),'https://gravuru-design.myshopify.com');

test('the deployable patch changes only the allowlisted edit flag on the exact live export',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'7867ca8c4e3dd72e2edf1b33ca9ca2dc667c42cd682eec5863a59e155d7c9cfd');
 assert.equal(live.replace(addition+'\n','').replace(suffix,''),before);
 const target=process.env.GRAVURU_THEME_PATCH_OUTPUT;
 if(target){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,live);}
});

for(const [name,source]of [['live',live],['repository',repo]]){
 test(name+': exact saved R15 choice survives real Liquid rendering without taking over saved URL or identities',async()=>{
  const row=item();row.properties._gravuru_bearbeiten=base+'&ui=prio-r15';
  const html=await render(source,row),edit=link(html);
  assert.equal(edit.origin,'https://gravuru-design.myshopify.com');assert.equal(edit.pathname,'/apps/konfigurator/start');
  assert.equal(edit.searchParams.get('ui'),'prio-r15');
  for(const [key,value]of Object.entries({product:'101',variant:'202',config:row.properties._gravuru_config,rev:'4',line:'theme',back:'/products/door'}))assert.equal(edit.searchParams.get(key),value);
  row.properties._gravuru_bearbeiten='https://evil.example/wrong?product=999&variant=999&config=other&back=https://evil.example&ui=prio-r15';
  const hostile=link(await render(source,row));assert.equal(hostile.href,edit.href,'saved URL supplies only the cosmetic allowlisted flag');
 });
 test(name+': missing, invalid, duplicate and fragment-only presentation cannot select R15',async()=>{
  for(const value of [undefined,'',base,base+'&ui=demo',base+'&ui=PRIO-R15',base+'&ui=prio-r15x',base+'&ui=prio-r15&ui=prio-r15',base+'&ui=demo&ui=prio-r15',base+'#ui=prio-r15',base+'#?ui=prio-r15',base+'&ui=prio-r15%26foo%3D1','ui=prio-r15',base+'&ui=prio-r15?ui=prio-r15']){
   const row=item();row.properties._gravuru_bearbeiten=value;
   assert.equal(link(await render(source,row)).searchParams.get('ui'),null,String(value));
  }
 });
 test(name+': legacy path and native non-R15 rendered content remain unchanged',async()=>{
  const native=item();assert.equal(await render(source,native),await render(name==='live'?before:repo.replace(addition+'\n','').replace(suffix,''),native));
  const legacy=item();legacy.properties={'_Gravuru Vorgang':'legacy-id','Bearbeitbarer Entwurf':'https://cdn.shopify.com/draft.json',Entwurf:'https://cdn.shopify.com/preview.png',_gravuru_bearbeiten:base+'&ui=prio-r15'};
  const edit=link(await render(source,legacy));assert.equal(edit.pathname,'/products/door');assert.equal(edit.searchParams.get('ui'),null);assert.ok(edit.href.includes('gravuru_cart='));
 });
}
