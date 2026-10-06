import test from 'node:test';
import assert from 'node:assert/strict';
import {createMerchantMediaLoader,merchantImageAttribute,setMerchantImage} from './ui/merchant-media.mjs';
import {createMerchantRequest} from './ui/merchant-request.mjs';
import {productCards} from './ui/product-overview-ui.mjs';
const path='/api/workshop/products/cfg_123/preview.svg?revision=1&layout=card';
const svg='<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h5"/></svg>';
class Element extends EventTarget{constructor(localName='img'){super();this.localName=localName;this.attrs=new Map();this.isConnected=true;}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}}
const response=()=>new Response(svg,{headers:{'content-type':'image/svg+xml'}});
function harness(request=async()=>response()){
 const made=[],revoked=[],loader=createMerchantMediaLoader({request,createURL:b=>{const url='blob:fixture/'+made.length;made.push({url,blob:b});return url;},revokeURL:u=>revoked.push(u)});return {loader,made,revoked};
}
test('embedded markup has no anonymous src/href; local markup and escaping remain correct',()=>{
 assert.equal(merchantImageAttribute(path,false,true),'data-merchant-src="'+path.replace('&','&amp;')+'"');
 assert.match(merchantImageAttribute(path,false,false),/^src=/);assert.match(merchantImageAttribute(path,true,false),/^href=/);
 assert.ok(!merchantImageAttribute('" onerror="bad',false,true).includes('="bad'));
 const img=new Element();img.setAttribute('src','old');setMerchantImage(img,path,true);assert.equal(img.getAttribute('src'),null);assert.equal(img.getAttribute('data-merchant-src'),path);
});
test('real product card uses private media in embedded mode and preserves version/labels',()=>{
 const previous=globalThis.document;globalThis.document={querySelector:()=>({content:'required'})};
 try{const html=productCards([{id:'cfg_123',name:'Produkt',revision:7,overview:{defaultDesignName:'Unser Design'}}],()=> 'Entwurf');assert.match(html,/data-merchant-src="\/api\/workshop\/products\/cfg_123\/preview.svg\?revision=7&amp;layout=card"/);assert.doesNotMatch(html,/<img[^>]*\ssrc="\/api\/workshop\//);assert.match(html,/Unser Design/);}finally{globalThis.document=previous;}
});
test('image and inline SVG image receive the original authenticated bytes without token attributes',async()=>{
 for(const type of ['img','image']){let tokens=0;const client=createMerchantRequest({required:()=>true,bridge:()=>({idToken:async()=>{tokens++;return 'synthetic-token';}}),fetchImpl:async(p,o)=>{assert.equal(p,path);assert.equal(o.headers.get('Authorization'),'Bearer synthetic-token');assert.equal(o.cache,'no-store');return response();}});
 const h=harness(client),element=new Element(type);assert.equal(await h.loader.load(element,path),true);assert.equal(await h.made[0].blob.text(),svg);assert.equal(tokens,1);assert.equal(element.getAttribute(type==='img'?'src':'href'),'blob:fixture/0');assert.ok(!JSON.stringify([...element.attrs]).includes('token'));h.loader.dispose();assert.deepEqual(h.revoked,['blob:fixture/0']);}
});
test('same element/source deduplicates loads; different revision loads fresh and revokes old blob',async()=>{
 let calls=0;const h=harness(async()=>{calls++;return response();}),el=new Element();const a=h.loader.load(el,path),b=h.loader.load(el,path);assert.equal(a,b);await a;await h.loader.load(el,path);assert.equal(calls,1);
 await h.loader.load(el,path.replace('revision=1','revision=2'));assert.equal(calls,2);assert.deepEqual(h.revoked,['blob:fixture/0']);assert.equal(el.getAttribute('src'),'blob:fixture/1');h.loader.dispose();
});
test('late previous response cannot overwrite a newly selected design even when abort is ignored',async()=>{
 const waits=[];const h=harness(()=>new Promise(resolve=>waits.push(resolve))),el=new Element();const old=h.loader.load(el,path),current=h.loader.load(el,path.replace('revision=1','revision=2'));
 waits[1](response());assert.equal(await current,true);waits[0](response());assert.equal(await old,false);assert.equal(h.made.length,1);assert.equal(el.getAttribute('src'),'blob:fixture/0');
});
test('removal aborts outstanding requests and never creates a detached preview',async()=>{
 let resolve,signal;const h=harness((_,o)=>{signal=o.signal;return new Promise(r=>resolve=r);}),el=new Element();const pending=h.loader.load(el,path);el.isConnected=false;h.loader.prune();assert.equal(signal.aborted,true);resolve(response());assert.equal(await pending,false);assert.equal(h.made.length,0);
});
test('disposal clears owned URLs but preserves images another editor has replaced',async()=>{
 const h=harness(),one=new Element(),two=new Element();await h.loader.load(one,path);await h.loader.load(two,path);two.setAttribute('src','data:image/png;base64,other');h.loader.dispose();assert.equal(one.getAttribute('src'),null);assert.equal(two.getAttribute('src'),'data:image/png;base64,other');assert.equal(h.revoked.length,2);
});
test('untrusted targets never request a token or network resource',async()=>{
 let calls=0;const h=harness(()=>{calls++;});for(const p of ['https://other.invalid/'+path,'//other.invalid/','/api/workshop/orders','/api/workshop/products/cfg_123/preview.svg?x=%2fsecret','/api/workshop/products/cfg_123/../original'])await assert.rejects(h.loader.load(new Element(),p));assert.equal(calls,0);
});
for(const label of ['unauthorized','json','html','network'])test('failed preview remains private and shows a sanitized failure: '+label,async()=>{
 const h=harness(async()=>{if(label==='network')throw Error('private-server-secret');return label==='unauthorized'?new Response('private-server-secret',{status:401}):new Response('private-server-secret',{headers:{'content-type':label==='json'?'application/json':'text/html'}});});
 const el=new Element();let errors=0;el.addEventListener('error',()=>errors++);assert.equal(await h.loader.load(el,path),false);assert.equal(errors,1);assert.equal(el.getAttribute('src'),null);assert.ok(!el.getAttribute('data-media-error').includes('secret'));assert.equal(h.made.length,0);
});
