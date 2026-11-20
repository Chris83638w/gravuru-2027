// Auftrag #265 (Weg A): Die Shop-Seite liest das Modell eines weiteren Designs derselben Sitzung,
// ohne Sitzung, Rahmen oder Adresse zu wechseln. Jede Abweichung der Produktzuordnung wird abgelehnt.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDesignSwitch} from './ui/shop-design-switch.mjs';

const binding={productId:'cfg_ts',productRevision:4,shopifyProductId:'gid://shopify/Product/1',shopifyVariantId:'gid://shopify/ProductVariant/11'};
const model=designId=>({editorPath:'/_merchant-editor.html',binding:{...binding},model:{name:'Türschild',configuration:{id:'cfg_ts',revision:4},universal:{profile:{designs:[{id:designId}]}},legacy:{}}});
function fixture(answer,fragment='s=gse1.a.b'){
 const calls=[],replaced=[],appended=[];
 const win={location:{origin:'https://test.example'},history:{replaceState(...args){replaced.push(args);}},addEventListener(){},removeEventListener(){},setTimeout,clearTimeout};
 const frame={style:{},contentWindow:{},remove(){}};
 const client={loadModel:async id=>{calls.push(['loadModel',id]);return answer(id);},switchDesign:async()=>{calls.push(['switchDesign']);throw Error('nicht erwartet');},loadDesignGallery:async()=>({items:[]})};
 let api,active;
 createDesignSwitch({initial:{client,data:model('d1'),resources:{},frame},fragment:new URLSearchParams(fragment),container:{append(node){appended.push(node);}},activate:(entry,a)=>{active=entry;api=a;},toDataUrl:async()=>'',win,doc:{createElement(){throw Error('kein neuer Rahmen erwartet');}}});
 return {api,calls,replaced,appended,frame,active:()=>active};
}

test('liest das Modell des weiteren Designs mit derselben Sitzung und lässt Rahmen, Sitzung und Adresse unverändert',async()=>{
 const f=fixture(id=>model(id)),before=f.active();
 const loaded=await f.api.loadDesign('d2');
 assert.deepEqual(loaded.universal.profile.designs.map(d=>d.id),['d2']);
 assert.deepEqual(f.calls,[['loadModel','d2']]);
 assert.equal(f.active(),before);assert.equal(f.active().frame,f.frame);
 assert.deepEqual(f.replaced,[]);assert.deepEqual(f.appended,[]);
 assert.equal(f.api.canGoBack(),false);
});

test('lehnt ein Modell mit anderer Produktzuordnung, anderem Produktstand oder ohne das Design ab',async()=>{
 const wrong=[
  id=>({...model(id),binding:{...binding,shopifyVariantId:'gid://shopify/ProductVariant/12'}}),
  id=>({...model(id),binding:{...binding,productRevision:5}}),
  id=>({...model(id),binding:{...binding,productId:'cfg_x'}}),
  id=>({...model(id),binding:{productId:binding.productId}}),
  id=>{const m=model(id);m.model.configuration.revision=5;return m;},
  id=>{const m=model(id);m.model.configuration.id='cfg_x';return m;},
  ()=>model('anderes-design')
 ];
 for(const answer of wrong){const f=fixture(answer);await assert.rejects(f.api.loadDesign('d2'),/Produktzuordnung|gehört nicht/);assert.deepEqual(f.appended,[]);assert.deepEqual(f.replaced,[]);}
 const failing=fixture(async()=>{throw Error('Sitzung abgelaufen');});
 await assert.rejects(failing.api.loadDesign('d2'),/Sitzung abgelaufen/);
});

test('beim Bearbeiten aus dem Warenkorb wird nichts nachgeholt: der Entwurf bleibt an sein Design gebunden',async()=>{
 for(const fragment of ['s=gse1.a.b&config=konfig_1&rev=2&line=abc','s=gse1.a.b&rev=2','s=gse1.a.b&line=abc']){
  const f=fixture(id=>model(id),fragment);
  await assert.rejects(f.api.loadDesign('d2'),/Warenkorb/);assert.deepEqual(f.calls,[]);
 }
});
