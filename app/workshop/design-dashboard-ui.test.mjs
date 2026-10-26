import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const uiURL=new URL('./ui/design-dashboard-ui.mjs',import.meta.url);
const html=fs.readFileSync(new URL('./ui/design-dashboard.html',import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};

// Execute the real dashboard and media/request modules with a small DOM and a
// controlled fetch. Only browser platform objects are simulated.
class Element {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.localName=tag;this.children=[];this.parentElement=null;
  this.attributes=new Map();this.listeners=new Map();this.dataset={};this._text='';
  this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;
  this.selectionStart=0;this.selectionEnd=0;this.selectionDirection='none';
  this.className='';this.id='';this.naturalWidth=0;this.naturalHeight=0;this.complete=false;
  this.classList={add:(...names)=>{this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...names])].join(' ');},remove:(...names)=>{this.className=this.className.split(/\s+/).filter(name=>!names.includes(name)).join(' ');},contains:name=>this.className.split(/\s+/).includes(name),toggle:(name,force)=>{const add=force??!this.classList.contains(name);add?this.classList.add(name):this.classList.remove(name);return add;}};
 }
 get isConnected(){let node=this;while(node.parentElement)node=node.parentElement;return node.localName==='document';}
 get textContent(){return this._text+this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
 set textContent(value){this.replaceChildren();this._text=String(value??'');}
 get title(){return this.attributes.get('title')??'';}
 set title(value){this.setAttribute('title',value);}
 get content(){return this.getAttribute('content')??'';}
 get loading(){return this.getAttribute('loading')??'';}
 set loading(value){this.setAttribute('loading',value);}
 get src(){return this.attributes.get('src')??'';}
 set src(value){this.setAttribute('src',value);}
 adopt(document){this.ownerDocument=document;for(const child of this.children)if(child instanceof Element)child.adopt(document);}
 append(...children){for(const child of children){if(child instanceof Element){child.remove();child.parentElement=this;child.adopt(this.ownerDocument);}this.children.push(typeof child==='number'?String(child):child);}this.ownerDocument?.changed('childList');}
 appendChild(child){this.append(child);return child;}
 replaceChildren(...children){for(const child of this.children)if(child instanceof Element)child.parentElement=null;this.children=[];this._text='';this.append(...children);}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.ownerDocument?.changed('childList');}this.parentElement=null;}
 replaceWith(next){if(!this.parentElement)return;const parent=this.parentElement,index=parent.children.indexOf(this);next.remove();parent.children[index]=next;next.parentElement=parent;next.adopt(this.ownerDocument);this.parentElement=null;this.ownerDocument?.changed('childList');}
 setAttribute(name,value){value=String(value);this.attributes.set(name,value);if(name==='id')this.id=value;if(name==='class')this.className=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=value;if(name==='src'){this.complete=false;this.naturalWidth=0;this.ownerDocument?.srcAssignments.push({element:this,value});}this.ownerDocument?.changed('attributes',name);}
 getAttribute(name){if(name.startsWith('data-'))return this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]??null;return name==='id'?this.id||null:name==='class'?this.className||null:this.attributes.get(name)??null;}
 removeAttribute(name){this.attributes.delete(name);if(name.startsWith('data-'))delete this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())];if(name==='src'){this.complete=false;this.naturalWidth=0;}this.ownerDocument?.changed('attributes',name);}
 addEventListener(type,listener,options={}){const listeners=this.listeners.get(type)||[];listeners.push({listener,once:Boolean(options.once)});this.listeners.set(type,listeners);}
 removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(entry=>entry.listener!==listener));}
 async emit(type,extra={}){
  if(type==='click'&&this.disabled)return;
  const event={type,target:this,currentTarget:this,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){},...extra};
  for(const entry of [...(this.listeners.get(type)||[])]){if(entry.once)this.removeEventListener(type,entry.listener);await entry.listener(event);}
  if(typeof this['on'+type]==='function')await this['on'+type](event);
  return event;
 }
 dispatchEvent(event){void this.emit(event.type);return true;}
 matches(selector){
  if(selector.includes(','))return selector.split(',').some(part=>this.matches(part.trim()));
  if(selector.includes(' ')){const parts=selector.trim().split(/\s+/);if(!this.matches(parts.pop()))return false;let ancestor=this.parentElement;while(parts.length){const part=parts.pop();while(ancestor&&!ancestor.matches(part))ancestor=ancestor.parentElement;if(!ancestor)return false;ancestor=ancestor.parentElement;}return true;}
  const id=selector.match(/#([\w-]+)/),cls=[...selector.matchAll(/\.([\w-]+)/g)].map(m=>m[1]),tag=selector.match(/^[\w-]+/)?.[0];
  if(id&&this.id!==id[1]||tag&&this.localName!==tag||cls.some(name=>!this.classList.contains(name)))return false;
  for(const [,name,value]of selector.matchAll(/\[([^=\]]+)(?:=['"]?([^'"\]]*)['"]?)?\]/g)){const actual=this.getAttribute(name)??this[name];if(value===undefined?actual===undefined||actual===null:String(actual)!==value)return false;}
  return true;
 }
 querySelectorAll(selector){return this.children.flatMap(child=>child instanceof Element?[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]:[]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 closest(selector){return this.matches(selector)?this:this.parentElement?.closest(selector)??null;}
 showModal(){this.open=true;}
 close(){this.open=false;void this.emit('close');}
 focus(options){this.ownerDocument.activeElement=this;this.focusOptions=options;}
 setSelectionRange(start,end,direction='none'){this.selectionStart=start;this.selectionEnd=end;this.selectionDirection=direction;}
 scrollIntoView(options){this.ownerDocument.scrolls.push({element:this,options});}
 reportValidity(){return true;}
}

function documentFixture({embedded=false}={}){
 const root=new Element('document'),stack=[root],voidTags=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 const decode=text=>text.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,'\u00a0');
 for(const token of html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g)||[]){
  if(token.startsWith('<!'))continue;
  if(token.startsWith('</')){const tag=token.match(/^<\/([\w-]+)/)?.[1];while(stack.length>1){const current=stack.pop();if(current.localName===tag)break;}continue;}
  if(token.startsWith('<')){
   const [,tag,attributes]=token.match(/^<([\w-]+)([\s\S]*?)\/?>$/)||[];if(!tag)continue;
   const element=new Element(tag);for(const [,name,quoted,single,plain]of attributes.matchAll(/([\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){const value=decode(quoted??single??plain??'');element.setAttribute(name,value);if(['hidden','disabled','checked'].includes(name))element[name]=true;if(['type','value'].includes(name))element[name]=value;}
   stack.at(-1).append(element);if(!voidTags.has(tag)&&!token.endsWith('/>'))stack.push(element);
  }else stack.at(-1).append(decode(token));
 }
 if(embedded){const meta=new Element('meta');meta.setAttribute('name','gravuru-merchant-auth');meta.setAttribute('content','required');root.querySelector('head').append(meta);}
 const observers=new Set(),events=[],srcAssignments=[];
 const document={body:root.querySelector('body'),documentElement:root.querySelector('html'),events,srcAssignments,observers,scrolls:[],activeElement:null,
  createElement(tag){const element=new Element(tag);element.adopt(document);return element;},
  querySelector:selector=>root.querySelector(selector),querySelectorAll:selector=>root.querySelectorAll(selector),
  addEventListener(){},dispatchEvent(event){events.push(event.type);return true;},
  changed(type,attributeName){for(const observer of observers){if(type==='attributes'&&(!observer.options.attributes||!observer.options.attributeFilter.includes(attributeName)))continue;if(type==='childList'&&!observer.options.childList)continue;if(observer.queued)continue;observer.queued=true;queueMicrotask(()=>{observer.queued=false;if(observers.has(observer))observer.callback();});}}
 };
 root.adopt(document);return document;
}

const row=(id,overrides={})=>({id,name:'Design '+id,nameSheet:'',reihe:'Test',formatreihe:'Test',material:'Edelstahl',process:'Gravur',form:'Rechteck',plate:[90,60],status:'ok',reasons:[],selectable:true,released:false,hidden:false,lieferform2:{reihe:'test'},files:{png:'/preview/'+id+'.png',svg:'/preview/'+id+'.svg'},fonts:[{name:'Testfont',status:'vorhanden',file:true}],texts:{count:1,sample:['Anna']},themes:[{name:'Namensschilder'}],isStartDesign:true,mainProducts:[{id:'1000-'+id,name:'Hauptprodukt '+id,sizeKey:'SIZE-90X60',sizeLabel:'9 × 6 cm',basePriceCents:1499,fit:{status:'ok',issues:[]},blockers:[]}],...overrides});
const dataset=rows=>({linie:'test',rows,counts:{total:rows.length,ok:rows.filter(r=>r.status==='ok').length,'prüfen':rows.filter(r=>r.status==='prüfen').length,fehlt:rows.filter(r=>r.status==='fehlt').length,freigegeben:rows.filter(r=>r.released).length,lieferform2:rows.length,selectable:rows.filter(r=>r.selectable).length},reihen:[{key:'Test',counts:{total:rows.length,ok:rows.length,'prüfen':0,fehlt:0}}],materials:[{key:'Edelstahl',counts:{total:rows.length}}],notes:[],bestand:{overviews:[],sheets:[]},startDesignSummary:{references:new Set(rows.filter(r=>r.isStartDesign).flatMap(r=>r.mainProducts.map(p=>JSON.stringify([p.lineId??'test',p.id])))).size,rows:rows.filter(r=>r.isStartDesign).length,assignments:rows.filter(r=>r.isStartDesign).reduce((n,r)=>n+r.mainProducts.length,0),missingReferences:0,fitChecked:true}});

async function harness({rows=[row('A'),row('B')],storage=new Map(),onPatch,onMedia,onLine,onTargetPreview,onVariant,embedded=false,visibleThumbnails=false,search='?linie=test',width=1280}={}){
 const document=documentFixture({embedded}),requests=[],patches=[],mediaRequests=[],originals=structuredClone(rows),tokens=[],made=[],revoked=[],blobCalls=new WeakMap(),windowEvents=new Map(),intersections=new Set();
 const location={origin:'http://fixture.invalid',pathname:'/werkstatt/designs/',search,get href(){return this.origin+this.pathname+this.search;}};
 const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
 const responseJSON=value=>({ok:true,status:200,json:async()=>structuredClone(value)});
 let lineReads=0;const queries=new Map();
 const matchMedia=query=>{if(!queries.has(query)){const limit=Number(query.match(/max-width:\s*(\d+)px/)?.[1]);queries.set(query,{media:query,get matches(){return width<=limit;},listeners:[],addEventListener(type,listener){if(type==='change')this.listeners.push(listener);}});}return queries.get(query);};
 const resize=next=>{const previous=new Map([...queries].map(([query,media])=>[query,media.matches]));width=next;for(const [query,media] of queries)if(previous.get(query)!==media.matches)for(const listener of media.listeners)listener({matches:media.matches,media:query});};
 const fetch=async(url,options={})=>{
  const normalizedHeaders=new Headers(options.headers),headers=Object.fromEntries(normalizedHeaders);if(normalizedHeaders.has('X-Gravuru-CSRF'))headers['X-Gravuru-CSRF']=normalizedHeaders.get('X-Gravuru-CSRF');
  const call={url,method:options.method||'GET',headers,authorization:normalizedHeaders.get('Authorization'),body:options.body?JSON.parse(options.body):null,signal:options.signal,credentials:options.credentials};requests.push(call);
  if(call.method==='PATCH'){
   patches.push(call);const result=await onPatch?.(call,patches.length);
   if(result?.error)return {ok:false,status:422,json:async()=>({error:{message:result.error}})};
   const design=originals.find(candidate=>candidate.id===call.body.designId);if(design&&Object.hasOwn(call.body,'freigegeben'))design.released=call.body.freigegeben;
   return responseJSON({changed:true,files:['design.json']});
  }
  if(url.startsWith('/api/workshop/designs/variant')){const result=await onVariant?.(call);if(result?.error)return {ok:false,status:409,json:async()=>({error:{message:result.error}})};return responseJSON(result);}
  if(url==='/api/workshop/session')return responseJSON({csrfToken:'synthetic-csrf'});
  if(url==='/api/workshop/designs')return responseJSON({linien:[{id:'test',name:'Testlinie',designsLieferform2:originals.length,bestand:[]}],themes:[{id:'namensschilder',name:'Namensschilder'},{id:'hundeschilder',name:'Hundeschilder'}]});
  if(url.startsWith('/api/workshop/designs/target-preview?')){const result=await onTargetPreview?.(call);if(result?.error)return {ok:false,status:result.status??422,json:async()=>({error:{message:result.error}})};return responseJSON(result??{svg:'<svg xmlns="http://www.w3.org/2000/svg"/>',checksum:'target-snapshot',fit:{status:'passt',issues:[]},reviewFit:{status:'passt',issues:[]},size:{key:'S',label:'9 × 6 cm'},sizes:[{key:'S',label:'9 × 6 cm'}]});}
  if(url.startsWith('/api/workshop/designs?'))return responseJSON(await onLine?.(++lineReads)??dataset(originals));
  if(url.startsWith('/api/workshop/designs/svg?')){
   mediaRequests.push(call);
   const response=await onMedia?.(call,mediaRequests.length)??new Response(url.includes('file=design.svg')?'<svg xmlns="http://www.w3.org/2000/svg"/>':'synthetic PNG',{headers:{'content-type':url.includes('file=design.svg')?'image/svg+xml':'image/png'}});
   const readBlob=response.blob.bind(response);response.blob=async()=>{const blob=await readBlob();blobCalls.set(blob,call);return blob;};return response;
  }
  throw Error('Unexpected test request: '+url);
 };
 class TestURL extends URL {static createObjectURL(blob){const url='blob:dashboard-test/'+made.length;made.push({url,blob,call:blobCalls.get(blob)});return url;}static revokeObjectURL(url){revoked.push(url);}}
 class MutationObserver {constructor(callback){this.callback=callback;this.queued=false;}observe(_root,options){this.options=options;document.observers.add(this);}disconnect(){document.observers.delete(this);}}
 class IntersectionObserver {constructor(callback){this.callback=callback;this.targets=new Set();intersections.add(this);}observe(target){this.targets.add(target);if(visibleThumbnails)queueMicrotask(()=>{if(this.targets.has(target))this.callback([{target,isIntersecting:true}]);});}unobserve(target){this.targets.delete(target);}disconnect(){this.targets.clear();intersections.delete(this);}}
 const context=vm.createContext({document,location,matchMedia,history:{replaceState(_state,_title,url){location.search=new URL(url,location.href).search;}},localStorage,URL:TestURL,URLSearchParams,Intl,Headers,Response,Blob,AbortController,Event,MutationObserver,IntersectionObserver,fetch,setTimeout,clearTimeout,console,
  addEventListener(type,listener){const listeners=windowEvents.get(type)||[];listeners.push(listener);windowEvents.set(type,listeners);},
  ...(embedded?{shopify:{async idToken(){tokens.push('synthetic-session-token');return 'synthetic-session-token';}}}:{})});
 context.window=context;context.parent=context;
 const modules=new Map();
 async function loadModule(url){
  if(modules.has(url.href))return modules.get(url.href);
  let source=fs.readFileSync(url,'utf8');const imports={},exports=[...source.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+(\w+)/gm)].map(match=>match[1]);
  for(const match of source.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm)){
   const module=await loadModule(new URL(match[2],url));for(const entry of match[1].split(',')){const [name,alias]=entry.trim().split(/\s+as\s+/);imports[alias||name]=module[name];}
  }
  source=source.replace(/^import\s*\{[^}]+\}\s*from\s*['"][^'"]+['"];?\s*$/gm,'').replace(/^export\s+/gm,'');
  context.moduleImports=imports;
  const result=await vm.runInContext('(async({'+Object.keys(imports).join(',')+'})=>{'+source+'\nreturn {'+exports.join(',')+'};})(moduleImports)',context,{filename:url.pathname.split('/').at(-1)});
  modules.set(url.href,result);return result;
 }
 await loadModule(uiURL);await tick();
 const element=id=>{const value=document.querySelector('#'+id);assert.ok(value,'missing UI element #'+id);return value;};
 const buttons=(text,within=document.body)=>within.querySelectorAll('button').filter(button=>button.textContent===text);
 const button=(text,within=document.body)=>{const found=buttons(text,within);assert.equal(found.length,1,'expected one button '+JSON.stringify(text));return found[0];};
 const dispose=()=>{for(const listener of windowEvents.get('pagehide')||[])listener({type:'pagehide'});};
 return {document,element,button,buttons,requests,patches,originals,storage,location,tokens,mediaRequests,made,revoked,dispose,resize,async storageChanged(newValue){for(const listener of windowEvents.get('storage')||[])listener({key:'gravuru-katalog-design-updated',newValue});await tick();},async pageShow(persisted){for(const listener of windowEvents.get('pageshow')||[])listener({persisted});await tick();},intersect(element,visible=true,ratio=1){for(const observer of intersections)if(observer.targets.has(element))observer.callback([{target:element,isIntersecting:visible,intersectionRatio:ratio}]);},showThumbnails(){for(const observer of intersections)observer.callback([...observer.targets].map(target=>({target,isIntersecting:true})));}};
}

const keyed=(h,tag,key,id)=>{
 const found=h.document.querySelectorAll(tag).filter(element=>element.dataset[key]&&JSON.parse(element.dataset[key])[1]===id);
 assert.equal(found.length,1,'expected one '+key+' control for '+id);return found[0];
};
const selection=(h,id)=>keyed(h,'input','designKey',id);
const release=(h,id)=>keyed(h,'button','releaseKey',id);
const previewButton=(h,id)=>keyed(h,'button','previewKey',id);
async function preview(h,id,{load=true}={}){
 await previewButton(h,id).emit('click');assert.equal(h.element('preview-dialog').open,true);
 const image=h.element('preview-image');
 if(load){image.naturalWidth=900;image.naturalHeight=600;image.complete=true;await image.emit('load');}
 return image;
}
async function reviewed(h,id){await preview(h,id);await h.element('preview-close').emit('click');}
async function select(h,id){const input=selection(h,id);assert.equal(input.disabled,false,id+' can be selected only after its preview');input.checked=true;await input.emit('change');}
async function filter(h,id,value,type='change'){const input=h.element(id);if(typeof value==='boolean')input.checked=value;else input.value=value;await input.emit(type);}

test('loading a thumbnail or opening a dialog without a successful image does not permit approval',async()=>{
 const h=await harness({rows:[row('A')]});
 assert.equal(selection(h,'A').disabled,true);assert.equal(release(h,'A').disabled,true);assert.equal(h.element('release-selected').disabled,true);
 const thumb=previewButton(h,'A').querySelector('img');thumb.naturalWidth=90;await thumb.emit('load');
 assert.equal(selection(h,'A').disabled,true,'thumbnail loading is not a review');
 const image=await preview(h,'A',{load:false});
 assert.equal(selection(h,'A').disabled,true);assert.equal(release(h,'A').disabled,true);
 image.naturalWidth=900;await image.emit('load');
 assert.equal(selection(h,'A').disabled,false);assert.equal(release(h,'A').disabled,false);
 assert.equal(h.patches.length,0,'reviewing a preview never writes the catalog');
});

test('failed image and SVG fallback stay blocked; late load after close cannot grant review',async()=>{
 const h=await harness({rows:[row('A')]});
 const image=await preview(h,'A',{load:false}),oldLoad=image.onload;
 await image.emit('error');assert.match(image.src,/A\.svg$/);await image.emit('error');
 assert.match(h.element('preview-status').textContent,/nicht geladen/);
 assert.equal(selection(h,'A').disabled,true);assert.equal(release(h,'A').disabled,true);
 await h.element('preview-close').emit('click');image.naturalWidth=900;oldLoad();
 assert.equal(selection(h,'A').disabled,true,'closed preview load cannot change approval eligibility');
 assert.equal(h.patches.length,0);
});

test('missing fonts block approval after review; supported replacement fonts retain the existing contract',async()=>{
 const h=await harness({rows:[row('Missing',{status:'prüfen',fonts:[{name:'Missing font',status:'fehlt',file:false}]}),row('Replacement',{fonts:[{name:'Old font',status:'ersatz',file:false,replacement:'Testfont'}]})]});
 await reviewed(h,'Missing');assert.equal(selection(h,'Missing').disabled,true);assert.equal(release(h,'Missing').disabled,true);assert.match(release(h,'Missing').title,/Schrift fehlt/);
 const blocked=selection(h,'Missing');blocked.checked=true;await blocked.emit('change');
 assert.equal(blocked.checked,false,'a forged checkbox event cannot bypass the font guard');
 await reviewed(h,'Replacement');assert.equal(selection(h,'Replacement').disabled,false);assert.equal(release(h,'Replacement').disabled,false);
 assert.equal(h.element('release-selected').disabled,true);assert.equal(h.patches.length,0);
});

test('confirmation shows the exact selected count and cancel performs zero PATCH requests',async()=>{
 const h=await harness();for(const id of ['A','B']){await reviewed(h,id);await select(h,id);}
 assert.doesNotMatch(h.element('release-selected').title,/Erst Vorschauen/,'enabled bulk action must not retain the earlier blocked tooltip');
 await h.element('release-selected').emit('click');
 assert.equal(h.element('release-dialog').open,true);assert.equal(h.element('release-count').textContent,'2 Designs freigeben?');
 assert.deepEqual(h.element('release-list').children.map(item=>item.textContent),['A · Design A','B · Design B']);
 assert.equal(h.patches.length,0);
 await h.element('release-cancel').emit('click');await h.element('release-confirm').emit('click');await tick();
 assert.equal(h.element('release-dialog').open,false);assert.equal(h.patches.length,0);
 assert.match(h.element('selection-summary').textContent,/^2 ausgewählt/);
});

test('confirmed bulk approval calls the existing PATCH sequentially, once for each unique design',async()=>{
 const first=deferred(),second=deferred();
 const h=await harness({rows:[row('A',{mainProducts:[...row('A').mainProducts,{...row('A').mainProducts[0],sizeKey:'SIZE-120X80',sizeLabel:'12 × 8 cm'}]}),row('B')],onPatch:(_call,index)=>(index===1?first:second).promise});
 for(const id of ['A','B']){await reviewed(h,id);await select(h,id);}
 await h.element('release-selected').emit('click');const confirming=h.element('release-confirm').emit('click');await tick();
 assert.equal(h.patches.length,1);assert.equal(h.element('release-selected').disabled,true);
 assert.equal(selection(h,'B').disabled,true,'editing is blocked while an approved batch is running');
 await h.element('release-confirm').emit('click');assert.equal(h.patches.length,1,'a second confirmation cannot duplicate writes');
 first.resolve();await tick();assert.equal(h.patches.length,2);
 assert.deepEqual(h.patches.map(call=>call.body),[{reihe:'test',designId:'A',freigegeben:true},{reihe:'test',designId:'B',freigegeben:true}]);
 for(const call of h.patches){assert.equal(call.url,'/api/workshop/designs');assert.equal(call.headers['X-Gravuru-CSRF'],'synthetic-csrf');assert.equal(Object.hasOwn(call.body,'actor'),false,'the authenticated server, not the browser, determines the actor');}
 second.resolve();await confirming;
 assert.equal(h.patches.length,2);assert.equal(release(h,'A').textContent,'Freigabe zurücknehmen');assert.equal(release(h,'B').textContent,'Freigabe zurücknehmen');
 assert.match(h.element('status').textContent,/^2 freigegeben\./);assert.match(h.element('selection-summary').textContent,/^0 ausgewählt/);
});

test('partial failure keeps successful approvals, continues sequentially and retries only the failed selected design',async()=>{
 const h=await harness({rows:['A','B','C'].map(id=>row(id)),onPatch:(call,index)=>call.body.designId==='B'&&index===2?{error:'Synthetischer Schreibfehler'}:undefined});
 for(const id of ['A','B','C']){await reviewed(h,id);await select(h,id);}
 await h.element('release-selected').emit('click');await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches.map(call=>call.body.designId),['A','B','C']);
 assert.equal(release(h,'A').textContent,'Freigabe zurücknehmen');assert.equal(release(h,'C').textContent,'Freigabe zurücknehmen');assert.equal(release(h,'B').textContent,'Freigeben');
 assert.equal(selection(h,'A').checked,false);assert.equal(selection(h,'B').checked,true);assert.equal(selection(h,'C').checked,false);
 assert.match(h.element('status').textContent,/2 freigegeben\. 1 nicht freigegeben: B: Synthetischer Schreibfehler/);
 await h.element('release-selected').emit('click');assert.equal(h.element('release-count').textContent,'1 Design freigeben?');await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches.map(call=>call.body.designId),['A','B','C','B']);
});

test('start-design filter retains broken references, displays distinct products and every size/blocker',async()=>{
 const bindings=[{...row('A').mainProducts[0],id:'6400000',customizationId:'CUSTOM-64',lineId:'test',sizeLabel:'9 × 6 cm',blockers:[{code:'size_fit',message:'Element außerhalb der Platte'}]},{...row('A').mainProducts[0],id:'6400000',customizationId:'CUSTOM-64',lineId:'test',sizeKey:'SIZE-120X80',sizeLabel:'12 × 8 cm',blockers:[{code:'price_open',message:'Grundpreis offen'}]}];
 const h=await harness({rows:[row('A',{mainProducts:bindings}),row('Other',{isStartDesign:false,mainProducts:[]}),row('Missing',{lieferform2:null,status:'fehlt',selectable:false,fonts:[],files:{png:null,svg:null}})]});
 await filter(h,'filter-start-designs',true);
 assert.equal(h.element('filter-selectable').checked,false);assert.equal(h.element('filter-selectable').disabled,true);
 assert.match(h.location.search,/startDesigns=true/);
 assert.match(h.element('summary').textContent,/insgesamt 2 Hauptprodukt-Zuordnungen in dieser Linie/,'product references are distinct from size assignments');
 const text=h.element('rows').textContent;
 assert.match(text,/Design A/);assert.match(text,/Design Missing/);assert.doesNotMatch(text,/Design Other/);
 assert.match(text,/Startdesign für 1 Hauptprodukt/);assert.match(text,/6400000/);assert.match(text,/CUSTOM-64/);assert.match(text,/9 × 6 cm/);assert.match(text,/12 × 8 cm/);
 assert.match(text,/Element außerhalb der Platte/);assert.match(text,/Grundpreis offen/);
 assert.equal(previewButton(h,'Missing').disabled,true);assert.equal(selection(h,'Missing').disabled,true);
 await reviewed(h,'A');assert.equal(release(h,'A').disabled,false,'product fit/price blockers remain visible without becoming a new design approval policy');
});

test('filtering clears hidden selections and confirmation cannot approve rows no longer visible',async()=>{
 const h=await harness();for(const id of ['A','B']){await reviewed(h,id);await select(h,id);}
 await filter(h,'search','Design A','input');assert.match(h.element('selection-summary').textContent,/^1 ausgewählt/);
 await h.element('release-selected').emit('click');assert.equal(h.element('release-count').textContent,'1 Design freigeben?');
 // A real modal prevents this user interaction; revalidation must still make a
 // delayed/programmatic filter change safe before the request is sent.
 await filter(h,'search','Design B','input');await h.element('release-confirm').emit('click');
 assert.equal(h.patches.length,0);assert.match(h.element('status').textContent,/Auswahl hat sich geändert/);
 await filter(h,'search','','input');assert.equal(selection(h,'A').checked,false);assert.equal(selection(h,'B').checked,false);
 await select(h,'B');await h.element('release-selected').emit('click');await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches.map(call=>call.body.designId),['B']);
});

test('new page session and explicit refresh discard review/selection even with the same local storage',async()=>{
 const storage=new Map(),h=await harness({storage});await reviewed(h,'A');await select(h,'A');
 await filter(h,'view','tiles');assert.equal(selection(h,'A').disabled,false);
 const fresh=await harness({storage});assert.equal(fresh.element('view').value,'tiles');assert.equal(selection(fresh,'A').disabled,true);assert.equal(release(fresh,'A').disabled,true);assert.equal(fresh.element('release-selected').disabled,true);
 await h.element('refresh').emit('click');assert.equal(selection(h,'A').disabled,true);assert.equal(selection(h,'A').checked,false);assert.equal(h.element('release-selected').disabled,true);
 assert.equal(h.patches.length,0);assert.equal(fresh.patches.length,0);
});

test('individual approval uses a one-design confirmation; withdrawal remains individual without requiring a new preview',async()=>{
 const h=await harness({rows:[row('A'),row('Released',{released:true,status:'prüfen',fonts:[{name:'Missing font',status:'fehlt',file:false}]})]});
 await reviewed(h,'A');await release(h,'A').emit('click');assert.equal(h.element('release-count').textContent,'1 Design freigeben?');assert.equal(h.patches.length,0);
 await h.element('release-cancel').emit('click');
 assert.equal(release(h,'Released').disabled,false);await release(h,'Released').emit('click');
 assert.deepEqual(h.patches.map(call=>call.body),[{reihe:'test',designId:'Released',freigegeben:false}]);
 assert.equal(release(h,'Released').textContent,'Freigeben');assert.equal(release(h,'Released').disabled,true);
 assert.equal(h.originals.find(row=>row.id==='A').released,false);
});

test('direct start-design URL exposes non-selectable broken references and cannot approve them',async()=>{
 const h=await harness({search:'?linie=test&startDesigns=true',rows:[row('Broken',{lieferform2:null,status:'fehlt',selectable:false,fonts:[],files:{png:null,svg:null}}),row('Other',{isStartDesign:false,mainProducts:[]})]});
 assert.equal(h.element('filter-start-designs').checked,true);assert.equal(h.element('filter-selectable').checked,false);assert.equal(h.element('filter-selectable').disabled,true);
 assert.match(h.element('rows').textContent,/Design Broken/);assert.doesNotMatch(h.element('rows').textContent,/Design Other/);
 assert.equal(selection(h,'Broken').disabled,true);assert.equal(previewButton(h,'Broken').disabled,true);assert.equal(h.element('release-selected').disabled,true);assert.equal(h.patches.length,0);
});

const privateRow=(id,overrides={})=>row(id,{files:{png:'/api/workshop/designs/svg?reihe=test&id='+id+'&file=preview.png',svg:'/api/workshop/designs/svg?reihe=test&id='+id+'&file=design.svg'},...overrides});
const svgResponse=()=>new Response('<svg xmlns="http://www.w3.org/2000/svg"/>',{headers:{'content-type':'image/svg+xml'}});
const privateBlob=(h,image)=>{const found=h.made.find(entry=>entry.url===image.src);assert.ok(found,'dialog/thumbnail must receive its authenticated response as a Blob URL');return found;};
function assertPrivateRequests(h){
 assert.ok(h.tokens.length>0,'embedded requests must ask App Bridge for a session token');
 for(const call of h.requests){assert.equal(call.authorization,'Bearer synthetic-session-token');assert.equal(call.credentials,'same-origin');assert.ok(!call.url.includes('synthetic-session-token'));}
 for(const {value}of h.document.srcAssignments)assert.ok(value.startsWith('blob:'),'private images must never use an anonymous API src: '+value);
 assert.ok(!JSON.stringify([...h.storage]).includes('synthetic-session-token'));
}
async function privatePreview(h,id,{load=false}={}){
 const image=await preview(h,id,{load:false});await tick();
 if(load){assert.ok(image.src.startsWith('blob:'));image.naturalWidth=900;image.naturalHeight=600;image.complete=true;await image.emit('load');}
 return image;
}

test('embedded thumbnails use the real merchant media loader with authenticated PNG-to-SVG fallback',async()=>{
 const h=await harness({embedded:true,rows:[privateRow('A')],onMedia:call=>call.url.includes('file=preview.png')?new Response('missing PNG',{status:404}):svgResponse()});
 assert.equal(h.document.querySelector('meta[name=gravuru-merchant-auth]').content,'required');
 assert.equal(h.mediaRequests.length,0,'lazy thumbnail waits until visible');
 const image=previewButton(h,'A').querySelector('img');
 assert.equal(image.getAttribute('src'),null);assert.match(image.getAttribute('data-merchant-src'),/file=preview\.png$/);
 h.showThumbnails();await tick();
 assert.deepEqual(h.mediaRequests.map(call=>new URL(call.url,h.location.origin).searchParams.get('file')),['preview.png','design.svg']);
 assert.equal(privateBlob(h,image).blob.type,'image/svg+xml');assert.equal(h.mediaRequests[0].signal.aborted,true,'switching thumbnail sources releases the previous request');
 image.naturalWidth=90;await image.emit('load');
 assert.equal(selection(h,'A').disabled,true,'authenticated thumbnail load still is not a deliberate review');
 assert.equal(h.patches.length,0);assertPrivateRequests(h);const url=image.src;h.dispose();assert.ok(h.revoked.includes(url));
});

test('embedded dialog fetches a private Blob but remains blocked until its current visible image really loads',async()=>{
 const h=await harness({embedded:true,rows:[privateRow('A')]});
 const image=await privatePreview(h,'A'),loaded=privateBlob(h,image);
 assert.equal(h.mediaRequests.length,1);assert.equal(loaded.call,h.mediaRequests[0]);
 assert.equal(image.getAttribute('data-merchant-src'),null,'dialog owns fresh media; it must not use the thumbnail deduplication cache');
 assert.equal(selection(h,'A').disabled,true);assert.equal(release(h,'A').disabled,true);
 await image.emit('load');assert.equal(selection(h,'A').disabled,true,'zero natural width is not a usable image');
 image.naturalWidth=900;image.currentSrc='blob:previous-image';await image.emit('load');assert.equal(selection(h,'A').disabled,true,'old decoded pixels cannot approve the new source');
 image.currentSrc=image.src;await image.emit('load');assert.equal(selection(h,'A').disabled,false);assert.equal(release(h,'A').disabled,false);
 assert.equal(h.patches.length,0);assertPrivateRequests(h);
 await h.element('preview-close').emit('click');assert.equal(loaded.call.signal.aborted,true);assert.ok(h.revoked.includes(loaded.url));assert.equal(image.getAttribute('src'),null);h.dispose();
});

for(const format of ['png','svg'])test('embedded '+format+' dialog reopening requests fresh bytes and requires a fresh load event',async()=>{
 const source=privateRow('A');if(format==='svg')source.files.png=null;
 const h=await harness({embedded:true,rows:[source]});
 const image=await privatePreview(h,'A',{load:true}),oldLoad=image.onload,first=privateBlob(h,image);
 await h.element('preview-close').emit('click');await select(h,'A');assert.equal(selection(h,'A').checked,true);
 await privatePreview(h,'A');const second=privateBlob(h,image);
 assert.notEqual(second.url,first.url);assert.equal(h.mediaRequests.length,2);assert.equal(first.call.signal.aborted,true);assert.ok(h.revoked.includes(first.url));
 assert.equal(selection(h,'A').disabled,true);assert.equal(selection(h,'A').checked,false);assert.equal(h.element('release-selected').disabled,true);
 image.naturalWidth=900;oldLoad();assert.equal(selection(h,'A').disabled,true,'previous opening cannot unlock the current review');
 await h.element('preview-dialog').emit('close');assert.equal(second.call.signal.aborted,false,'a queued old close cannot cancel an already reopened dialog');
 await image.emit('load');assert.equal(selection(h,'A').disabled,false);assert.equal(h.patches.length,0);assertPrivateRequests(h);
 await h.element('preview-close').emit('click');assert.ok(h.revoked.includes(second.url));h.dispose();
});

for(const status of [401,403])test('embedded '+status+' on reopening clears previous review and selection without an anonymous or SVG retry',async()=>{
 let deny=false;const h=await harness({embedded:true,rows:[privateRow('A')],onMedia:()=>deny?new Response('private error detail',{status}):undefined});
 const image=await privatePreview(h,'A',{load:true});await h.element('preview-close').emit('click');await select(h,'A');deny=true;
 const before=h.mediaRequests.length;await privatePreview(h,'A');
 assert.equal(h.mediaRequests.length,before+1,'auth denial is terminal for this dialog request');
 assert.equal(image.getAttribute('src'),null);assert.equal(image.hidden,true);assert.equal(selection(h,'A').disabled,true);assert.equal(selection(h,'A').checked,false);assert.equal(release(h,'A').disabled,true);assert.equal(h.element('release-selected').disabled,true);
 assert.match(h.element('preview-status').textContent,/Anmeldung prüfen/);assert.doesNotMatch(h.element('preview-status').textContent,/private error detail/);
 if(status===401)assert.ok(h.document.events.includes('workshop-session-failed'));
 assert.equal(h.patches.length,0);assertPrivateRequests(h);await h.element('preview-close').emit('click');h.dispose();
});

test('embedded dialog PNG HTTP failure falls back to a separately authenticated SVG request',async()=>{
 const h=await harness({embedded:true,rows:[privateRow('A')],onMedia:call=>call.url.includes('file=preview.png')?new Response('no PNG',{status:404}):svgResponse()});
 const image=await privatePreview(h,'A');
 assert.deepEqual(h.mediaRequests.map(call=>new URL(call.url,h.location.origin).searchParams.get('file')),['preview.png','design.svg']);
 assert.equal(h.mediaRequests[0].signal.aborted,true);assert.equal(privateBlob(h,image).blob.type,'image/svg+xml');assert.equal(selection(h,'A').disabled,true);
 image.naturalWidth=900;await image.emit('load');assert.equal(selection(h,'A').disabled,false);assertPrivateRequests(h);await h.element('preview-close').emit('click');h.dispose();
});

test('embedded dialog PNG decode failure revokes its Blob and authenticates the SVG fallback before approval',async()=>{
 const h=await harness({embedded:true,rows:[privateRow('A')]}),image=await privatePreview(h,'A'),oldLoad=image.onload,first=privateBlob(h,image);
 await image.emit('error');await tick();const second=privateBlob(h,image);
 assert.equal(h.mediaRequests.length,2);assert.match(second.call.url,/file=design\.svg$/);assert.equal(first.call.signal.aborted,true);assert.ok(h.revoked.includes(first.url));assert.equal(selection(h,'A').disabled,true);
 image.naturalWidth=900;oldLoad();assert.equal(selection(h,'A').disabled,true);await image.emit('load');assert.equal(selection(h,'A').disabled,false);
 assert.equal(h.patches.length,0);assertPrivateRequests(h);await h.element('preview-close').emit('click');h.dispose();
});

test('closing an embedded dialog aborts its pending request and ignores a late successful response',async()=>{
 const pending=deferred(),h=await harness({embedded:true,rows:[privateRow('A')],onMedia:()=>pending.promise});
 const image=await privatePreview(h,'A');assert.equal(h.mediaRequests.length,1);assert.equal(image.getAttribute('src'),null);
 await h.element('preview-close').emit('click');assert.equal(h.mediaRequests[0].signal.aborted,true);
 pending.resolve(svgResponse());await tick();assert.equal(h.made.length,0);assert.equal(image.getAttribute('src'),null);assert.equal(selection(h,'A').disabled,true);assert.equal(h.patches.length,0);h.dispose();
});

test('changing embedded previews aborts the previous design and a late response cannot overwrite or approve the next one',async()=>{
 const waits=[],h=await harness({embedded:true,rows:[privateRow('A'),privateRow('B')],onMedia:call=>{const wait=deferred();waits.push({call,...wait});return wait.promise;}});
 await privatePreview(h,'A');const image=await privatePreview(h,'B');
 assert.equal(waits.length,2);assert.equal(waits[0].call.signal.aborted,true);assert.equal(waits[1].call.signal.aborted,false);
 waits[0].resolve(svgResponse());await tick();assert.equal(h.made.length,0);assert.equal(image.getAttribute('src'),null);
 waits[1].resolve(svgResponse());await tick();assert.match(privateBlob(h,image).call.url,/id=B&/);
 image.naturalWidth=900;await image.emit('load');assert.equal(selection(h,'A').disabled,true);assert.equal(selection(h,'B').disabled,false);
 assert.equal(h.patches.length,0);assertPrivateRequests(h);await h.element('preview-close').emit('click');h.dispose();
});

test('closing an embedded dialog while its response body is pending creates no late Blob URL or review state',async()=>{
 const bytes=deferred(),response=svgResponse();response.blob=()=>bytes.promise;
 const h=await harness({embedded:true,rows:[privateRow('A')],onMedia:()=>response}),image=await privatePreview(h,'A');
 await h.element('preview-dialog').emit('cancel');h.element('preview-dialog').close();assert.equal(h.mediaRequests[0].signal.aborted,true);
 bytes.resolve(new Blob(['<svg/>'],{type:'image/svg+xml'}));await tick();
 assert.equal(h.made.length,0);assert.equal(image.getAttribute('src'),null);assert.equal(selection(h,'A').disabled,true);assert.equal(h.patches.length,0);h.dispose();
});


test('phone defaults to tiles independently of desktop preference and keeps review gates',async()=>{
 const storage=new Map([['gravuru-designs-view','table']]),h=await harness({width:360,storage});
 assert.equal(h.element('view').value,'tiles');assert.equal(h.element('rows').querySelectorAll('article.tile').length,2);assert.equal(h.element('rows').querySelector('table'),null);
 assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(h.element('main').classList.contains('filters-open'),false);
 assert.equal(selection(h,'A').disabled,true);assert.equal(release(h,'A').disabled,true);
 await reviewed(h,'A');await select(h,'A');assert.equal(h.document.querySelector('.selection-bar').classList.contains('has-selection'),true);
 await release(h,'A').emit('click');assert.equal(h.element('release-dialog').open,true);assert.equal(h.patches.length,0);
 await h.element('release-cancel').emit('click');assert.equal(h.patches.length,0);
});

test('compact picker closes after a filter choice and focuses the visible result summary',async()=>{
 for(const id of ['reihen','materials']){
  const h=await harness({width:900});await h.element('filter-toggle').emit('click');
  assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'true');assert.equal(h.element('main').classList.contains('filters-open'),true);
  await h.element(id).querySelectorAll('button').at(-1).emit('click');
  assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(h.element('main').classList.contains('filters-open'),false);
  assert.equal(h.document.activeElement,h.element('summary'));assert.equal(h.document.scrolls.length,1);assert.equal(h.document.scrolls[0].element,h.element('summary'));
  assert.equal(h.document.scrolls[0].options.block,'start');assert.equal(h.patches.length,0);
 }
});

test('line picker returns to results only after the requested line finishes loading',async()=>{
 const pending=deferred(),h=await harness({width:390,onLine:index=>index===2?pending.promise:undefined});
 await h.element('filter-toggle').emit('click');await h.element('lines').querySelector('button').emit('click');
 assert.equal(h.element('main').getAttribute('aria-busy'),'true');assert.equal(h.document.scrolls.length,0);
 pending.resolve(dataset([row('Loaded')]));await tick();
 assert.equal(h.element('main').getAttribute('aria-busy'),'false');assert.match(h.element('rows').textContent,/Design Loaded/);assert.equal(h.document.scrolls.length,1);assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(h.patches.length,0);
});

test('compact status and release filters return to the list without approving designs',async()=>{
 for(const [id,value]of [['filter-status','ok'],['filter-freigabe','nein'],['filter-selectable',false],['filter-start-designs',true]]){
  const h=await harness({width:412});await h.element('filter-toggle').emit('click');await filter(h,id,value);
  assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(h.document.scrolls.length,1);assert.equal(h.document.activeElement,h.element('summary'));assert.equal(h.patches.length,0);assert.equal(selection(h,'A').disabled,true);
 }
});

test('search keeps typing stable and returns to results after Enter or committed change',async()=>{
 const h=await harness({width:360});await h.element('filter-toggle').emit('click');await filter(h,'search','Design A','input');
 assert.equal(h.document.scrolls.length,0);assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'true');assert.match(h.element('rows').textContent,/Design A/);assert.doesNotMatch(h.element('rows').textContent,/Design B/);
 const event=await h.element('search').emit('keydown',{key:'Enter'});assert.equal(event.defaultPrevented,true);assert.equal(h.document.scrolls.length,1);assert.equal(h.document.activeElement,h.element('summary'));
 await h.element('filter-toggle').emit('click');await h.element('search').emit('change');assert.equal(h.document.scrolls.length,2);assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');assert.equal(h.patches.length,0);
});

test('desktop view and filter behavior stay unchanged across mobile preferences and resize',async()=>{
 const storage=new Map(),h=await harness({width:1280,storage});assert.equal(h.element('view').value,'table');assert.ok(h.element('rows').querySelector('table'));
 await filter(h,'filter-status','ok');assert.equal(h.document.scrolls.length,0);
 await filter(h,'view','tiles');assert.equal(storage.get('gravuru-designs-view'),'tiles');h.resize(360);assert.equal(h.element('view').value,'tiles');
 await filter(h,'view','table');assert.equal(storage.get('gravuru-designs-mobile-view'),'table');assert.equal(storage.get('gravuru-designs-view'),'tiles');
 const cells=h.element('rows').querySelectorAll('td');assert.equal(cells[0].dataset.label,'Vorschau');assert.equal(cells[9].dataset.label,'Aktionen');
 h.resize(1280);assert.equal(h.element('view').value,'tiles');h.resize(360);assert.equal(h.element('view').value,'table');assert.equal(h.patches.length,0);
});


test('phone rotation with the same view preserves the live rename input and selected text',async()=>{
 const h=await harness({rows:[row('A')],width:390,storage:new Map([['gravuru-designs-view','tiles']])});
 await h.button('Name ändern').emit('click');const input=h.element('rows').querySelector('.rename input');
 input.value='Familie Müller';input.focus();input.setSelectionRange(8,14,'backward');
 h.resize(844);await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(h.element('view').value,'tiles');assert.equal(h.element('rows').querySelector('.rename input'),input);
 assert.equal(input.value,'Familie Müller');assert.equal(h.document.activeElement,input);
 assert.deepEqual([input.selectionStart,input.selectionEnd,input.selectionDirection],[8,14,'backward']);assert.equal(h.patches.length,0);
});

test('phone rotation between tiles and table preserves the rename draft caret and submitted value',async()=>{
 const h=await harness({rows:[row('A')],width:390});
 await h.button('Name ändern').emit('click');const previous=h.element('rows').querySelector('.rename input');
 previous.value='Familie Müller';previous.focus();previous.setSelectionRange(7,13,'forward');
 h.resize(844);await new Promise(resolve=>setTimeout(resolve,1));
 const input=h.element('rows').querySelector('.rename input');assert.notEqual(input,previous);assert.equal(h.element('view').value,'table');
 assert.equal(input.value,'Familie Müller');assert.equal(h.document.activeElement,input);
 assert.deepEqual([input.selectionStart,input.selectionEnd,input.selectionDirection],[7,13,'forward']);assert.equal(h.patches.length,0);
 await input.closest('form').emit('submit');assert.equal(h.patches.length,1);assert.equal(h.patches[0].body.name,'Familie Müller');assert.equal(Object.hasOwn(h.patches[0].body,'freigegeben'),false);
});

test('responsive rerender preserves rename button focus and does not steal focus from an open filter',async()=>{
 const h=await harness({rows:[row('A')],width:390});
 await h.button('Name ändern').emit('click');let input=h.element('rows').querySelector('.rename input');
 input.value='Neuer Name';input.setSelectionRange(2,5,'forward');h.button('Speichern').focus();
 h.resize(844);await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(h.document.activeElement,h.button('Speichern'));input=h.element('rows').querySelector('.rename input');assert.equal(input.value,'Neuer Name');assert.deepEqual([input.selectionStart,input.selectionEnd],[2,5]);
 await h.element('filter-toggle').emit('click');h.element('search').focus();h.resize(390);await new Promise(resolve=>setTimeout(resolve,1));
 assert.equal(h.element('main').classList.contains('filters-open'),true);assert.equal(h.document.activeElement,h.element('search'));
 input=h.element('rows').querySelector('.rename input');assert.equal(input.value,'Neuer Name');assert.deepEqual([input.selectionStart,input.selectionEnd],[2,5]);assert.equal(h.patches.length,0);
});

test('compact resize moves focus out of hidden filters and desktop resize out of the hidden toggle',async()=>{
 for(const selector of ['#search','#lines button']){
  const h=await harness({width:1280});h.document.querySelector(selector).focus();h.resize(900);
  assert.equal(h.element('main').classList.contains('filters-open'),false);assert.equal(h.element('filter-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(h.document.activeElement,h.element('filter-toggle'));assert.equal(h.document.scrolls.length,0);
  h.resize(1280);assert.equal(h.document.activeElement,h.element('summary'));assert.equal(h.document.scrolls.length,0);assert.equal(h.patches.length,0);
 }
});


test('Lieferform 2 opens the shared catalog editor without an imported product and keeps only public embedding context',async()=>{
 const h=await harness({rows:[row('A & B'),row('Legacy',{lieferform2:null})],search:'?linie=test&host=public-host&shop=demo.myshopify.com&embedded=1&id_token=never-link&session=never-link&hmac=never-link',embedded:true,width:390});
 const links=h.document.querySelectorAll('a').filter(e=>e.dataset.catalogEdit);
 assert.equal(links.length,1);assert.equal(links[0].textContent,'Bearbeiten');
 const target=new URL(links[0].href);assert.equal(target.pathname,'/werkstatt/designs/bearbeiten/');assert.equal(target.searchParams.get('katalogLinie'),'test');assert.equal(target.searchParams.get('katalogReihe'),'test');assert.equal(target.searchParams.get('katalogDesign'),'A & B');
 for(const [key,value] of [['host','public-host'],['shop','demo.myshopify.com'],['embedded','1']])assert.equal(target.searchParams.get(key),value);
 for(const key of ['id_token','session','hmac','configuration'])assert.equal(target.searchParams.has(key),false);
 assert.equal(h.patches.length,0);assert.equal(selection(h,'A & B').disabled,true,'editing link does not bypass the preview gate');
});

test('returning through browser cache reloads catalog data and invalidates the earlier preview review',async()=>{
 let reads=0;const original=row('A');const h=await harness({rows:[original],onLine:()=>{reads++;return dataset([row('A',{name:reads>1?'Gespeicherter Katalogtext':'Vorher',released:false})]);}});
 await preview(h,'A');assert.equal(selection(h,'A').disabled,false);
 await h.pageShow(true);assert.equal(reads,2);assert.equal(selection(h,'A').disabled,true);assert.ok(h.document.body.textContent.includes('Gespeicherter Katalogtext'));assert.equal(h.patches.length,0);
});


test('editing in another tab invalidates review and reloads the matching catalog design',async()=>{
 let reads=0;const h=await harness({rows:[row('A')],onLine:()=>{reads++;return dataset([row('A',{name:reads>1?'Neuer Inhalt':'Vorher'})]);}});
 await preview(h,'A');assert.equal(selection(h,'A').disabled,false);
 await h.storageChanged(JSON.stringify({reihe:'test',id:'A',checksum:'changed'}));
 assert.equal(reads,2);assert.equal(selection(h,'A').disabled,true);assert.ok(h.document.body.textContent.includes('Neuer Inhalt'));assert.equal(h.patches.length,0);
});

test('another-tab edit preserves an unfinished rename while invalidating preview permission',async()=>{
 const h=await harness({rows:[row('A')]});await preview(h,'A');
 await h.button('Name ändern').emit('click');const old=h.element('rows').querySelector('.rename input');old.value='Entwurf behalten';old.focus();old.setSelectionRange(3,9,'forward');
 await h.storageChanged(JSON.stringify({reihe:'test',id:'A',checksum:'changed'}));
 const input=h.element('rows').querySelector('.rename input');assert.equal(input.value,'Entwurf behalten');assert.equal(h.document.activeElement,input);assert.deepEqual([input.selectionStart,input.selectionEnd],[3,9]);assert.equal(selection(h,'A').disabled,true);assert.equal(h.patches.length,0);
});

const target=(familie,extra={})=>({familie,name:familie,material:'Testmaterial',process:'Gravur',inLine:true,released:false,freigabe:null,previewUrl:'/api/workshop/designs/target-preview?reihe=test&id=A&familie='+familie,...extra});
const targetControl=(h,tag,key,familie)=>{const found=h.document.querySelectorAll(tag).filter(e=>e.dataset[key]&&JSON.parse(e.dataset[key])[2]===familie);assert.equal(found.length,1);return found[0];};
async function targetPreview(h,familie){await targetControl(h,'button','targetPreview',familie).emit('click');await tick();const img=h.element('preview-image');img.naturalWidth=900;await img.emit('load');await h.element('preview-close').emit('click');}
test('target approval requires its own successful authenticated preview; source or other material does not unlock it',async()=>{
 const h=await harness({rows:[row('A',{ziele:[target('steel'),target('slate')],zielVorschlaege:[]})],embedded:true,width:1280});
 await reviewed(h,'A');assert.equal(targetControl(h,'input','designKey','steel').disabled,true);
 await targetPreview(h,'steel');assert.equal(targetControl(h,'input','designKey','steel').disabled,false);assert.equal(targetControl(h,'input','designKey','slate').disabled,true);
 const call=h.requests.find(r=>r.url.includes('target-preview'));assert.equal(call.authorization,'Bearer synthetic-session-token');
 await targetControl(h,'button','releaseKey','steel').emit('click');assert.match(h.element('release-list').textContent,/steel/);await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches.map(p=>p.body),[{reihe:'test',designId:'A',familie:'steel',checksum:'target-snapshot',freigegeben:true}]);assert.equal(targetControl(h,'button','releaseKey','slate').disabled,true);h.dispose();
});
test('target fit failure and missing fonts block approval after image load, while prüfen remains reviewable',async()=>{
 for(const [fit,fonts,blocked]of [['passt nicht',[{name:'Testfont',status:'vorhanden'}],true],['prüfen',[{name:'Testfont',status:'fehlt'}],true],['prüfen',[{name:'Testfont',status:'vorhanden'}],false]]){
 const h=await harness({rows:[row('A',{fonts,ziele:[target('steel')]})],onTargetPreview:()=>({svg:'<svg/>',fit:{status:fit,issues:['Befund']},reviewFit:{status:fit,issues:['Befund']},sizes:[]})});await targetPreview(h,'steel');assert.equal(targetControl(h,'button','releaseKey','steel').disabled,blocked,'prüfen stays available only as an individual action after opening');assert.equal(targetControl(h,'input','designKey','steel').disabled,true,'prüfen is never selectable for a bulk approval');assert.equal(h.patches.length,0);h.dispose();}
});
test('failed target reopen clears its previous review without unlocking another target or retaining a selection',async()=>{
 let count=0;const h=await harness({rows:[row('A',{ziele:[target('steel'),target('slate')]})],onTargetPreview:()=>++count>1?{error:'Sitzung abgelaufen',status:401}:undefined});await targetPreview(h,'steel');
 const input=targetControl(h,'input','designKey','steel');input.checked=true;await input.emit('change');assert.equal(h.element('release-selected').disabled,false);
 await targetControl(h,'button','targetPreview','steel').emit('click');await tick();assert.equal(targetControl(h,'input','designKey','steel').disabled,true);assert.equal(h.element('release-selected').disabled,true);assert.equal(targetControl(h,'input','designKey','slate').disabled,true);h.dispose();
});
test('two family targets on one design remain distinct in sequential bulk approval and individual withdrawal',async()=>{
 const h=await harness({rows:[row('A',{ziele:[target('steel'),target('slate')]})]});
 for(const family of ['steel','slate']){await targetPreview(h,family);const input=targetControl(h,'input','designKey',family);input.checked=true;await input.emit('change');}
 await h.element('release-selected').emit('click');assert.match(h.element('release-count').textContent,/^2 /);await h.element('release-confirm').emit('click');assert.deepEqual(h.patches.map(p=>p.body.familie),['steel','slate']);
 await targetControl(h,'button','releaseKey','steel').emit('click');assert.equal(h.patches.at(-1).body.freigegeben,false);assert.equal(h.patches.at(-1).body.familie,'steel');assert.equal(targetControl(h,'button','releaseKey','slate').textContent,'Zielfreigabe zurücknehmen');h.dispose();
});
test('suggested targets require explicit confirmation and never approve; missing families have no selectable fabricated id',async()=>{
 const h=await harness({rows:[row('A',{ziele:[target('steel')],zielVorschlaege:[target('slate',{reason:['namensschilder']}),{familie:null,name:'Edelstahl Druck',missing:true,reason:['namensschilder']} ]})]});
 const choices=h.document.querySelectorAll('input[data-suggested-family]');assert.equal(choices.length,1);assert.equal(choices[0].dataset.suggestedFamily,'slate');choices[0].checked=true;await choices[0].emit('change');assert.equal(h.patches.length,0);await h.button('Ausgewählte Ziele übernehmen').emit('click');assert.equal(h.patches.length,0);await h.button('Ziele bestätigen – noch nicht freigeben').emit('click');assert.deepEqual(h.patches[0].body,{reihe:'test',designId:'A',zieleHinzufuegen:['slate']});h.dispose();
});
test('theme checkboxes use catalogue theme ids and the existing PATCH',async()=>{
 const h=await harness({rows:[row('A',{themes:[{id:'namensschilder',name:'Namensschilder'}],ziele:[target('steel')]})]});const input=h.document.querySelector('input[data-theme="hundeschilder"]');input.checked=true;await input.emit('change');await h.button('Themen speichern').emit('click');assert.deepEqual(h.patches[0].body,{reihe:'test',designId:'A',themes:['namensschilder','hundeschilder']});h.dispose();
});

test('late target response after close or switching material cannot count as a viewed target',async()=>{
 const pending=deferred(),h=await harness({rows:[row('A',{ziele:[target('steel'),target('slate')]})],onTargetPreview:call=>call.url.includes('familie=steel')?pending.promise:undefined});
 await targetControl(h,'button','targetPreview','steel').emit('click');await tick();await h.element('preview-close').emit('click');await targetPreview(h,'slate');
 pending.resolve({svg:'<svg/>',fit:{status:'passt',issues:[]},sizes:[]});await tick();assert.equal(targetControl(h,'input','designKey','steel').disabled,true);assert.equal(targetControl(h,'input','designKey','slate').disabled,false);h.dispose();
});

const variantFamilies=[{id:'steel',name:'Stahl',sizes:[{key:'S',label:'9 × 6 cm'},{key:'L',label:'30 × 20 cm'}],linien:[{id:'test',name:'Testlinie'}]}];
const variantPlan=(action='create-variant')=>({action,message:'Plan geprüft',identity:{id:'VAR-TEST-D1'},source:{checksum:'source-snapshot'},checksum:'plan-snapshot',transform:{deviationPercent:4.76},fit:{status:'prüfen',issues:['Text prüfen']},svg:'<svg/>',editor:{reihe:'test-variante',id:'VAR-TEST-D1'}});
test('variant preparation is read-only, displays source-derived identity and deviation, and creation confirms both checksums without approving',async()=>{
 const rows=[row('A',{ziele:[target('steel')]})],calls=[];const h=await harness({rows,onLine:()=>({...dataset(rows),familien:variantFamilies}),onVariant:call=>{calls.push(call);return variantPlan();},embedded:true,width:390});
 await h.button('Für anderes Ziel einpassen').emit('click');assert.equal(h.element('variant-confirm').disabled,true);await h.element('variant-prepare').emit('click');assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/workshop/designs/variant/prepare');assert.equal(calls[0].authorization,'Bearer synthetic-session-token');assert.match(h.element('variant-result').textContent,/VAR-TEST-D1/);assert.match(h.element('variant-result').textContent,/4,8 %/);assert.equal(h.patches.length,0);
 await h.element('variant-confirm').emit('click');assert.equal(calls.length,2);assert.deepEqual(calls[1].body,{source:{reihe:'test',id:'A',checksum:'source-snapshot'},target:{familyId:'steel',sizeKey:'S',lineId:'test'},checksum:'plan-snapshot'});assert.equal(h.patches.length,0);assert.match(h.element('variant-result').querySelector('a').href,/katalogReihe=test-variante/);h.dispose();
});
test('blocked existing source and changed variant options cannot be confirmed from an obsolete plan',async()=>{
 const rows=[row('A',{ziele:[target('steel')]})],h=await harness({rows,onLine:()=>({...dataset(rows),familien:variantFamilies}),onVariant:()=>({...variantPlan('blocked'),svg:null,previewUrl:'data:image/png;base64,iVBORw0KGgo=',message:'Bestandsfassung vorhanden'})});
 await h.button('Für anderes Ziel einpassen').emit('click');await h.element('variant-prepare').emit('click');assert.match(h.element('variant-status').textContent,/Bestandsfassung vorhanden/);assert.equal(h.element('variant-image').src,'data:image/png;base64,iVBORw0KGgo=');assert.equal(h.element('variant-confirm').disabled,true);h.dispose();
 const h2=await harness({rows,onLine:()=>({...dataset(rows),familien:variantFamilies}),onVariant:()=>variantPlan()});await h2.button('Für anderes Ziel einpassen').emit('click');await h2.element('variant-prepare').emit('click');assert.equal(h2.element('variant-confirm').disabled,false);await filter(h2,'variant-size','L');assert.equal(h2.element('variant-confirm').disabled,true);assert.equal(h2.element('variant-result').textContent,'');h2.dispose();
});
test('an unavailable physical target explains the gap without counting as a successful review',async()=>{
 const h=await harness({rows:[row('A',{ziele:[target('steel')]})],onTargetPreview:()=>({svg:null,fit:{status:'passt nicht',issues:['Vorschau offen: Stärke']},sizes:[]})});await targetControl(h,'button','targetPreview','steel').emit('click');await tick();assert.match(h.element('preview-status').textContent,/Vorschau offen: Stärke/);assert.equal(targetControl(h,'input','designKey','steel').disabled,true);assert.equal(h.made.length,0);h.dispose();
});


test('foreign LF2 collision compares both sources and needs a newly prepared explicit target-addition plan',async()=>{
 const rows=[row('A',{ziele:[target('steel')]})],calls=[],blocked={...variantPlan('blocked'),svg:null,allowAddTarget:true,existing:{reihe:'existing',id:'EXIST-D1'},sourceSvg:'<svg id="source"/>',existingSvg:'<svg id="existing"/>',sourceFit:{status:'prüfen',issues:['Quelle prüfen']},existingFit:{status:'passt',issues:[]}};
 const h=await harness({rows,onLine:()=>({...dataset(rows),familien:variantFamilies}),onVariant:call=>{calls.push(call);return call.body.resolution?{...variantPlan('add-target'),source:{checksum:'new-source'},checksum:'new-plan',existing:blocked.existing,editor:blocked.existing}:blocked;},embedded:true,width:390});
 await h.button('Für anderes Ziel einpassen').emit('click');await h.element('variant-prepare').emit('click');
 assert.equal(h.element('variant-confirm').disabled,true);assert.equal(calls.length,1);assert.equal(calls[0].body.resolution,undefined);const figures=h.element('variant-result').querySelectorAll('figure');assert.equal(figures.length,2);assert.match(figures[0].textContent,/Quelle A/);assert.match(figures[1].textContent,/Vorhandenes Design EXIST-D1/);assert.ok(figures.every(f=>f.querySelector('img').src.startsWith('blob:')));
 const comparisonUrls=figures.map(f=>f.querySelector('img').src);await h.button('Ziel zu EXIST-D1 hinzufügen').emit('click');assert.equal(calls.length,2);assert.equal(calls[1].url,'/api/workshop/designs/variant/prepare');assert.equal(calls[1].body.resolution,'add-target-to-existing');assert.equal(h.element('variant-confirm').disabled,false);assert.match(h.element('variant-result').textContent,/Vorhandenes Design: EXIST-D1/);assert.equal(h.patches.length,0);
 await h.element('variant-confirm').emit('click');assert.equal(calls.length,3);assert.equal(calls[2].body.resolution,'add-target-to-existing');assert.equal(calls[2].body.checksum,'new-plan');assert.equal(calls[2].body.source.checksum,'new-source');assert.equal(calls[2].body.freigegeben,undefined);assert.equal(calls[2].authorization,'Bearer synthetic-session-token');assert.equal(h.patches.length,0);
 assert.ok(comparisonUrls.every(url=>h.revoked.includes(url)));h.dispose();
});

test('changing target after a foreign LF2 choice clears its resolution and obsolete confirmation',async()=>{
 const rows=[row('A',{ziele:[target('steel')]})],calls=[],h=await harness({rows,onLine:()=>({...dataset(rows),familien:variantFamilies}),onVariant:call=>{calls.push(call);return call.body.resolution?variantPlan('add-target'):{...variantPlan('blocked'),svg:null,allowAddTarget:true,existing:{reihe:'existing',id:'EXIST-D1'},sourcePreviewError:'Schrift fehlt',existingPreviewError:'Vorschau offen'};}});
 await h.button('Für anderes Ziel einpassen').emit('click');await h.element('variant-prepare').emit('click');assert.match(h.element('variant-result').textContent,/Schrift fehlt/);await h.button('Ziel zu EXIST-D1 hinzufügen').emit('click');assert.equal(h.element('variant-confirm').disabled,false);await filter(h,'variant-size','L');assert.equal(h.element('variant-confirm').disabled,true);await h.element('variant-prepare').emit('click');assert.equal(calls.at(-1).body.resolution,undefined);assert.equal(calls.at(-1).body.target.sizeKey,'L');h.dispose();
});


const tileTargetRow=(id,{fit='passt',checksum='revision-'+id,families=['steel'],...overrides}={})=>row(id,{ziele:families.map(familie=>target(familie,{sourceRevision:checksum+'-'+familie,previewUrl:'/api/workshop/designs/target-preview?'+new URLSearchParams({reihe:'test',id,familie})})),...overrides});
const tileResult=call=>{const params=new URL(call.url,'http://fixture.invalid').searchParams,id=params.get('id'),familie=params.get('familie');return {svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 60"><ellipse cx="45" cy="30" rx="45" ry="30"/><circle cx="8" cy="30" r="2"/></svg>',checksum:'revision-'+id+'-'+familie,fit:{status:'passt',issues:[]},reviewFit:{status:'passt',issues:[]},size:{key:'OV-90X60',label:'9 × 6 cm · Oval',groupKey:'OV',groupName:'Oval',compatible:true},sizes:[{key:'OV-90X60',label:'9 × 6 cm · Oval',groupKey:'OV',groupName:'Oval',compatible:true}]};};
const tileSurface=(h,id)=>h.element('rows').querySelectorAll('.target-tile').find(card=>JSON.parse(card.dataset.designRow)[1]===id)?.querySelector('.target-preview-surface');
async function loadTile(h,id){const surface=tileSurface(h,id);assert.ok(surface);h.intersect(surface);await tick();await tick();const image=surface.querySelector('img');image.naturalWidth=900;image.naturalHeight=600;await image.emit('load');return {surface,image};}

test('R2 target tile needs the actual image loaded and at least half visible, with session-token requests',async()=>{
 const h=await harness({rows:[tileTargetRow('A')],embedded:true,width:390,onTargetPreview:tileResult});
 assert.equal(h.requests.filter(call=>call.url.includes('target-preview')).length,0,'below-fold tiles are not requested before intersection');
 const surface=tileSurface(h,'A');h.intersect(surface,true,.25);await tick();assert.equal(h.requests.filter(call=>call.url.includes('target-preview')).length,0,'sliver visibility is not a review');
 h.intersect(surface,true,1);await tick();await tick();const img=surface.querySelector('img');assert.match(img.src,/^blob:/);assert.equal(h.element('release-seen').disabled,true,'fetch completion alone is not review');
 h.intersect(surface,false,0);img.naturalWidth=900;await img.emit('load');assert.equal(h.element('release-seen').disabled,true,'loading after it left the viewport is not review');
 h.intersect(surface,true,1);assert.equal(h.element('release-seen').disabled,false);assert.equal(h.requests.find(call=>call.url.includes('target-preview')).authorization,'Bearer synthetic-session-token');
 assert.match(await h.made.at(-1).blob.text(),/<ellipse/);assert.match(await h.made.at(-1).blob.text(),/<circle/,'uses the supplied contour/holes SVG without replacing it');
 await h.element('release-seen').emit('click');assert.match(h.element('release-count').textContent,/^1 Ziel/);await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches[0].body,{reihe:'test',designId:'A',familie:'steel',checksum:'revision-A-steel',freigegeben:true,onlyPassing:true});h.dispose();
});

test('R2 prüfen remains blocked for bulk after tile review and needs explicit opening for individual approval',async()=>{
 const h=await harness({rows:[tileTargetRow('A')],width:390,onTargetPreview:call=>({...tileResult(call),fit:{status:'prüfen',issues:['Motivlinie unter 0,5 mm']},reviewFit:{status:'prüfen',issues:['Motivlinie unter 0,5 mm']}})});
 await loadTile(h,'A');assert.equal(h.element('release-seen').disabled,true);assert.equal(targetControl(h,'button','releaseKey','steel').disabled,true);assert.equal(targetControl(h,'input','designKey','steel').disabled,true);
 await previewButton(h,'A').emit('click');await tick();const image=h.element('preview-image');image.naturalWidth=900;await image.emit('load');await h.element('preview-close').emit('click');assert.equal(targetControl(h,'button','releaseKey','steel').disabled,false);assert.equal(targetControl(h,'input','designKey','steel').disabled,true);
 await targetControl(h,'button','releaseKey','steel').emit('click');await h.element('release-confirm').emit('click');assert.equal(h.patches.length,1);assert.equal(Object.hasOwn(h.patches[0].body,'onlyPassing'),false);h.dispose();
});

test('R2 paginates 100 target tiles and retains only reviewed passing designs across visited pages',async()=>{
 const rows=Array.from({length:100},(_,i)=>tileTargetRow(String(i+1).padStart(3,'0'))),h=await harness({rows,width:390,onTargetPreview:tileResult});
 assert.equal(h.element('rows').querySelectorAll('.target-tile').length,24);assert.match(h.element('target-page-summary').textContent,/Seite 1 von 5/);
 await loadTile(h,'001');await h.element('target-page-next').emit('click');assert.equal(h.element('rows').querySelectorAll('.target-tile').length,24);await loadTile(h,'025');
 await h.element('target-page-previous').emit('click');const calls=h.requests.filter(call=>call.url.includes('target-preview')).length;await loadTile(h,'001');assert.equal(h.requests.filter(call=>call.url.includes('target-preview')).length,calls,'unchanged checksums reuse decoded source data across pages');
 await h.element('release-seen').emit('click');assert.match(h.element('release-count').textContent,/^2 Ziele/);await h.element('release-confirm').emit('click');assert.deepEqual(h.patches.map(call=>call.body.designId),['001','025']);
 for(let i=0;i<4;i++)await h.element('target-page-next').emit('click');assert.equal(h.element('rows').querySelectorAll('.target-tile').length,4);assert.match(h.element('target-page-summary').textContent,/Seite 5 von 5/);h.dispose();
});

test('R2 a late previous-family preview cannot unlock the newly selected family',async()=>{
 const pending=deferred(),h=await harness({rows:[tileTargetRow('A',{families:['steel','slate']})],width:390,onTargetPreview:call=>call.url.includes('familie=steel')?pending.promise:tileResult(call)});
 const old=tileSurface(h,'A');h.intersect(old);await tick();await filter(h,'target-family','slate');const current=tileSurface(h,'A');assert.notEqual(current,old);
 pending.resolve(tileResult({url:'/api/workshop/designs/target-preview?reihe=test&id=A&familie=steel'}));await tick();assert.equal(current.querySelector('img').src,'');assert.equal(h.element('release-seen').disabled,true);
 await loadTile(h,'A');await h.element('release-seen').emit('click');await h.element('release-confirm').emit('click');assert.deepEqual(h.patches.map(call=>call.body.familie),['slate']);h.dispose();
});

test('R2 changed source checksum invalidates only that design and keeps other cached card nodes',async()=>{
 let reads=0,changed=false;const initial=[tileTargetRow('A'),tileTargetRow('B')],h=await harness({rows:initial,width:390,onLine:()=>dataset(++reads===1?initial:[tileTargetRow('A',{checksum:'changed-A'}),tileTargetRow('B')]),onTargetPreview:call=>({...tileResult(call),...(changed&&call.url.includes('id=A')?{checksum:'changed-A-steel'}:{})})});
 await loadTile(h,'A');await loadTile(h,'B');const other=tileSurface(h,'B');changed=true;await h.storageChanged(JSON.stringify({reihe:'test',id:'A',checksum:'changed'}));
 assert.equal(tileSurface(h,'B'),other,'unmodified card and loaded image stay in the DOM');assert.equal(h.element('release-seen').disabled,false);
 await h.element('release-seen').emit('click');assert.match(h.element('release-count').textContent,/^1 Ziel/);assert.match(h.element('release-list').textContent,/B/);await h.element('release-cancel').emit('click');await loadTile(h,'A');assert.equal(h.requests.filter(call=>call.url.includes('target-preview')&&call.url.includes('id=A')).length,2);h.dispose();
});


test('R2 current family and search filters limit bulk approval to the matching reviewed designs',async()=>{
 const h=await harness({rows:[tileTargetRow('A',{families:['steel','slate']}),tileTargetRow('B',{families:['steel','slate']})],width:390,onTargetPreview:tileResult});
 await loadTile(h,'A');await loadTile(h,'B');await filter(h,'target-family','slate');assert.equal(h.element('release-seen').disabled,true,'review of steel never counts for slate');
 await loadTile(h,'A');await loadTile(h,'B');await filter(h,'search','Design A','input');
 await h.element('release-seen').emit('click');assert.match(h.element('release-count').textContent,/^1 Ziel/);await h.element('release-confirm').emit('click');
 assert.deepEqual(h.patches.map(call=>[call.body.designId,call.body.familie]),[['A','slate']]);h.dispose();
});

test('R2 target size selector groups the source-provided form names without dropping size labels',async()=>{
 const h=await harness({rows:[tileTargetRow('A')],width:390,onTargetPreview:call=>({...tileResult(call),sizes:[{key:'OV-90X60',label:'9 × 6 cm · Oval',groupKey:'OV',groupName:'Oval',compatible:true},{key:'RE-120X80',label:'12 × 8 cm · Abgerundete Ecken R5',groupKey:'RE',groupName:'Abgerundete Ecken R5',compatible:false}]})});
 await previewButton(h,'A').emit('click');await tick();const groups=h.element('target-size-control').querySelectorAll('optgroup');
 assert.deepEqual(groups.map(group=>group.label),['Oval','Abgerundete Ecken R5']);assert.deepEqual(groups.map(group=>group.querySelector('option').textContent),['9 × 6 cm · Oval','12 × 8 cm · Abgerundete Ecken R5']);h.dispose();
});


test('R2 a saved target invalidates cached previews of every family belonging to the changed design',async()=>{
 const h=await harness({rows:[tileTargetRow('A',{families:['steel','slate']})],width:390,onTargetPreview:tileResult});
 await loadTile(h,'A');await filter(h,'target-family','slate');await loadTile(h,'A');
 await h.element('release-seen').emit('click');await h.element('release-confirm').emit('click');
 await filter(h,'target-family','steel');assert.equal(h.element('release-seen').disabled,true,'a write changed the design checksum even for its other family');
 await loadTile(h,'A');assert.equal(h.requests.filter(call=>call.url.includes('target-preview')&&call.url.includes('familie=steel')).length,2,'the old family result is fetched again');assert.equal(h.element('release-seen').disabled,false);h.dispose();
});


test('R2 shows source-provided empty forms explicitly as family totals even under a search filter',async()=>{
 const rows=[tileTargetRow('A',{families:['steel','slate']})],h=await harness({rows,width:390,onLine:()=>({...dataset(rows),availableFormGroups:[{familyId:'steel',familyName:'Stahl',groupKey:'OV',groupName:'Oval',count:8},{familyId:'steel',familyName:'Stahl',groupKey:'RU',groupName:'Rund',count:0},{familyId:'slate',familyName:'Schiefer',groupKey:'RE',groupName:'Rechteck',count:1}]})});
 assert.match(h.element('target-form-summary').textContent,/Gesamtbestand der Familie/);assert.match(h.element('target-form-summary').textContent,/Rund: 0 Designs – keine kompatible Designreihe vorhanden/);
 await filter(h,'search','Design A','input');assert.match(h.element('target-form-summary').textContent,/Oval: 8 Designs/,'the labels clearly remain totals, not filtered counts');
 await filter(h,'target-family','slate');assert.doesNotMatch(h.element('target-form-summary').textContent,/Rund/);assert.match(h.element('target-form-summary').textContent,/Rechteck: 1 Design/);h.dispose();
});
