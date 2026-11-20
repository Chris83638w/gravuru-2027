import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../../',import.meta.url));
const {Liquid}=createRequire(import.meta.url)(process.env.GRAVURU_LIQUIDJS_MODULE||path.join(root,'.local-data/liquidjs/package/dist/liquid.browser.umd.js'));
const engine=new Liquid({strictFilters:true});
engine.registerFilter('asset_url',name=>'https://cdn.shopify.com/assets/'+name);
const source=fs.readFileSync(new URL('./theme-block/snippets/gravuru-warenkorb-bearbeiten.liquid',import.meta.url),'utf8');
const body=source.replace(/{% doc %}[\s\S]*?{% enddoc %}/,'').replace(/{% stylesheet %}[\s\S]*?{% endstylesheet %}/,'');
const render=properties=>engine.parseAndRender(body,{item:{variant:{id:202},product:{title:'Türschild',url:'/products/door'},properties}});
const native={_gravuru_config:'konfig_11111111-1111-1111-1111-111111111111',_gravuru_rev:'1',_gravuru_bearbeiten:'https://example.test/edit?ui=prio-r15'};
const personal='https://app-2027.gravuru-designwerkstatt.de/gestaltung/';
const uploaded='https://cdn.shopify.com/s/files/1/uploads/personal.png';
const hosted='https://cdn.shopify.com/s/files/1/0001/0002/0003/files/gravuru-gestaltung-'+'a'.repeat(64)+'.png';
const image=html=>html.match(/<img src="([^"]+)"/)?.[1];
const safe=html=>assert.doesNotMatch(html,/gravuru-cart-edit|weiter gestalten|>Bearbeiten<|\/start\?|gravuru_cart=|example.test\/edit/i);

test('two lines with the same variant retain separate saved previews and image-only links',async()=>{
  for(const name of ['nord','sued']){
    const uri=personal+name+'.png',html=await render({...native,_Entwurf:uploaded,_gravuru_bild:uri});
    assert.equal(image(html),uri);assert.ok(html.includes('href="'+uri+'"'));assert.match(html,/wird geladen/);safe(html);
  }
});
test('Shopify upload, registered checkout PNG and legacy upload render their line-specific image',async()=>{
  for(const [props,url] of [[{...native,_Entwurf:uploaded},uploaded],[{...native,_gravuru_checkout_image:hosted+'?v=1'},hosted],
     [{'_Gravuru Vorgang':'old','Bearbeitbarer Entwurf':'draft.json',Entwurf:'/uploads/alt.png',Bearbeiten:'old-edit'},'/uploads/alt.png']]){
    const html=await render(props);assert.equal(image(html),url);safe(html);
  }
});
test('a missing personal image has an explicit status and never shows the product image',async()=>{
  for(const props of [native,{...native,_gravuru_bild:'https://images.example.test/product.png',_Entwurf:'//example.test/cart.png'},
    {...native,_gravuru_checkout_image:'https://cdn.shopify.com/s/files/1/2/3/files/product.png'}]){
    const html=await render(props);assert.equal(image(html),undefined);assert.match(html,/nicht verfügbar/);assert.doesNotMatch(html,/<a /);safe(html);
  }
  assert.equal((await render({})).trim(),'');
});
test('responsive cart previews use only the confirmed file for this line and preserve the full-size link',async()=>{
  const file='https://cdn.shopify.com/s/files/1/0920/5550/3228/files/gravuru-gestaltung-'+'c'.repeat(64)+'.png';
  for(const version of ['', '?v=12']){
    const full=file+version,query=version?'&amp;width=':'?width=';
    const html=await render({...native,_Entwurf:full,_gravuru_checkout_image:full,_gravuru_bild:personal+'nord.png'});
    assert.ok(html.includes('href="'+personal+'nord.png"'));
    for(const scale of [1,2,3])assert.ok(html.includes(full+query+String(160*scale)+' '+scale+'x'));
  }
  for(const props of [{...native,_Entwurf:uploaded,_gravuru_checkout_image:file},{...native,_Entwurf:hosted,_gravuru_checkout_image:hosted}]){
    assert.doesNotMatch(await render(props),/srcset=/);
  }
});
test('both theme sections select the same line-specific renderer and keep the theme-owned ordinary items',()=>{
  const patch=fs.readFileSync(new URL('./theme-block/cart-media-placement.patch',import.meta.url),'utf8');
  const sections=patch.split('diff --git').slice(1);assert.equal(sections.length,2);
  for(const section of sections){
    assert.match(section,/if gv_personalized/);assert.match(section,/render 'gravuru-warenkorb-bearbeiten', item: item/);
    assert.match(section,/if item.image/);assert.match(section,/property.first == 'Bearbeiten'/);
  }
});
