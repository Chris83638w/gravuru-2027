import test from 'node:test';
import assert from 'node:assert/strict';
import {shopCartRequest,checkoutTarget,themeCartTarget,installShopCart} from './shop-cart.mjs';

test('native cart checks required text only on completion and before any image or server work',async()=>{
 const previous={window:globalThis.window,document:globalThis.document};
 const binding={productId:'product',productRevision:1};let attempted=false,revealed=null,work=0;
 const create=()=>({dataset:{},textContent:'',hidden:false,events:{},setAttribute(){},addEventListener(name,handler){this.events[name]=handler;}});
 try{
  globalThis.window={parent:{GravuruWorkshopReview:binding}};globalThis.document={createElement:create};
  const el={sync(){},uxAttemptTextValidation(){attempted=true;},uxTextIssues:()=>[{id:'name',message:'Bitte Name ausfüllen.'}],uxRevealTextIssue:id=>{revealed=id;},uxCheckLayout(){work++;}};
  const gate={...binding,submitCart(){work++;},request(){work++;}};
  const result=installShopCart({el,r:{querySelector:()=>null}},{querySelectorAll:()=>[],append(){}},gate);
  assert.equal(attempted,false);assert.equal(result.status.hidden,true);
  await result.button.events.click();
  assert.equal(attempted,true);assert.equal(revealed,'name');assert.equal(work,0);
  assert.equal(result.status.textContent,'Bitte Name ausfüllen.');assert.equal(result.button.disabled,false);
  assert.equal('busy' in result.status.dataset,false,'V4: Fehlermeldung ohne Ladesymbol');
 }finally{
  for(const key of ['window','document'])if(previous[key]===undefined)delete globalThis[key];else globalThis[key]=previous[key];
 }
});

const konfig='konfig_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),line='gid://shopify/CartLine/1?cart=x';
const saved={draftId:'adraft_a',revision:3,draftToken:'t'.repeat(64)};

test('K8: only the cart line of the same draft is replaced; other drafts are added fresh',()=>{
 assert.deepEqual(shopCartRequest({saved,cartEdit:null,quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:line,draftId:'adraft_a'},quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2,configId:konfig,cartLineId:line});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:null,draftId:'adraft_a'},quantity:1}),{draftId:'adraft_a',expectedRevision:3,quantity:1,configId:konfig});
 assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:line,draftId:'adraft_other'},quantity:1}),{draftId:'adraft_a',expectedRevision:3,quantity:1});
 assert.ok(!JSON.stringify(shopCartRequest({saved,cartEdit:null,quantity:1})).includes(saved.draftToken));
});
test('the customer is only forwarded to the confirmed shop checkout',()=>{
 const good={checkoutUrl:'https://gravuru-design.myshopify.com/checkouts/cn/abc?key=1',paymentConfirmed:false,totalCents:1148};
 assert.equal(checkoutTarget(good,'gravuru-design.myshopify.com'),good.checkoutUrl);
 for(const bad of [{...good,checkoutUrl:'https://evil.example/checkout'},{...good,checkoutUrl:'http://gravuru-design.myshopify.com/checkout'},{...good,paymentConfirmed:true},{...good,totalCents:'11.48'},{...good,checkoutUrl:'https://user:pw@gravuru-design.myshopify.com/x'},{},null])assert.throws(()=>checkoutTarget(bad,'gravuru-design.myshopify.com'),/nicht bestätigt/);
});

test('theme transfer accepts only this shop and its signed-proxy handoff path',()=>{
 const path='/apps/konfigurator/cart',shop='test.myshopify.com',result={mode:'theme',paymentConfirmed:false,totalCents:1499,handoffUrl:'https://'+shop+path+'#handoff='+'a'.repeat(64)};
 assert.equal(themeCartTarget(result,shop,path),result.handoffUrl);
 for(const handoffUrl of ['http://'+shop+path+'#handoff='+'a'.repeat(64),'https://evil.example'+path+'#handoff='+'a'.repeat(64),'https://'+shop+'/cart#handoff='+'a'.repeat(64),result.handoffUrl.replace('#','?bad=1#'),result.handoffUrl.slice(0,-1)])assert.throws(()=>themeCartTarget({...result,handoffUrl},shop,path));
 for(const patch of [{mode:'storefront'},{paymentConfirmed:true},{totalCents:NaN}])assert.throws(()=>themeCartTarget({...result,...patch},shop,path));
});

test('theme edits carry the actual cart revision even after abandoned preparation',()=>{assert.deepEqual(shopCartRequest({saved,cartEdit:{configId:konfig,rev:1,cartLineId:'theme',draftId:'adraft_a'},quantity:2}),{draftId:'adraft_a',expectedRevision:3,quantity:2,configId:konfig,cartLineId:'theme',cartRevision:1});});

test('only the approved theme-cart presentation crosses from the current editor context',()=>{
 const input={saved,cartEdit:{configId:konfig,rev:1,cartLineId:'theme',draftId:saved.draftId},quantity:2};
 const baseline=shopCartRequest(input);
 assert.deepEqual(shopCartRequest({...input,cartMode:'theme',presentation:'prio-r15'}),{...baseline,presentation:'prio-r15'});
 for(const presentation of [undefined,null,'demo','PRIO-R15','https://evil.example/ui.mjs',['prio-r15'],{ui:'prio-r15'}])assert.deepEqual(shopCartRequest({...input,cartMode:'theme',presentation}),baseline);
 for(const cartMode of [undefined,'storefront','legacy'])assert.deepEqual(shopCartRequest({...input,cartMode,presentation:'prio-r15'}),baseline,'legacy cart payload remains byte-for-byte compatible');
});

// #265, ENTSCHEIDUNGEN 3.56 („Vorab sichern“): Ablauf mit Schein-DOM – Übersicht öffnen, sichern, einlegen.
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const until=async(ready,label)=>{for(let i=0;i<200;i++){if(ready())return;await tick();}assert.fail('nicht erreicht: '+label);};
// Ausgangswerte einmal merken: Ein Test darf mehrere Abläufe anlegen, danach gilt wieder genau der Stand von vorher.
const browserGlobals=['window','document','MutationObserver','requestAnimationFrame','Image','FileReader','DOMParser','XMLSerializer','sessionStorage','setTimeout'].map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
function cartFlow(t,{issues=()=>[],pending=()=>false,quantity='1',respond=null,submit=null}={}){
 t.after(()=>{for(const [name,descriptor] of browserGlobals)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];});
 const set=(name,value)=>Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
 const binding={productId:'product',productRevision:1},said=[],calls={save:[],cart:[],png:0,checks:[],assigned:[]},observers=[],frames=[],stored=new Map(),shown=[];
 // V4: Der Hinweis „dauert etwas länger“ (12 s) soll den Testlauf nicht offen halten.
 const timeout=browserGlobals.find(([name])=>name==='setTimeout')[1].value;set('setTimeout',(callback,ms,...rest)=>{const timer=timeout(callback,ms,...rest);if(ms>=1000)timer.unref();return timer;});
 const element=tag=>tag==='canvas'?{getContext:()=>({drawImage(){}}),toDataURL:()=>'data:image/png;base64,UkVG'}:
  {tag,dataset:{},hidden:false,disabled:false,events:{},setAttribute(){},addEventListener(name,handler){this.events[name]=handler;},text:'',get textContent(){return this.text;},set textContent(value){this.text=value;if(tag==='p')said.push(value);}};
 set('window',{parent:{GravuruWorkshopReview:binding},top:{location:{assign:url=>calls.assigned.push(url)}},addEventListener:(name,handler)=>{if(name==='pageshow')shown.push(handler);}});
 set('document',{createElement:element});
 set('MutationObserver',class{constructor(callback){this.callback=callback;}observe(node,options){observers.push({callback:this.callback,node,options});}});
 set('requestAnimationFrame',callback=>{frames.push(callback);});
 set('Image',class{decode(){return Promise.resolve();}});
 set('FileReader',class{readAsDataURL(blob){this.result='data:'+blob.type+';base64,QklMRA==';queueMicrotask(()=>this.onload());}});
 set('DOMParser',class{parseFromString(){return {querySelector:()=>null,querySelectorAll:()=>[]};}});
 set('XMLSerializer',class{serializeToString(){return '<svg xmlns="http://www.w3.org/2000/svg"/>';}});
 set('sessionStorage',{getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)});
 const draft='adraft_'+'1'.repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),token='c'.repeat(64);
 const el={state:{designId:'design',objects:[],mOptions:{},selected:null},cartEdit:null,sync(){},uxTextIssues:issues,
  uxAttemptTextValidation(){calls.checks.push('text');},uxRevealTextIssue(id){calls.checks.push('reveal '+id);},async uxCheckLayout(){calls.checks.push('layout');return true;},
  async uxEnsureDraftResources(){},async png(){calls.png++;return new Blob(['bild'],{type:'image/webp'});}};
 const gate={...binding,csrfToken:'shop-entry',cartMode:'theme',shopDomain:'test.myshopify.com',themeCartPath:'/apps/konfigurator/cart',
  async request(url,options){
   const body=JSON.parse(options.body),call={url,expectedRevision:body.expectedRevision??null,input:body.input};calls.save.push(call);
   const answer=await respond?.(call,calls.save.length);if(answer)return answer;
   const revision=(body.expectedRevision??0)+1;return Response.json({id:draft,...(revision===1?{token}:{}),revision,snapshotId:'proof_'+revision});
  },
  async submitCart(body,access){
   calls.cart.push({body,access});const answer=await submit?.(body,calls.cart.length);if(answer)return answer;
   return {mode:'theme',paymentConfirmed:false,totalCents:1499,handoffUrl:'https://test.myshopify.com/apps/konfigurator/cart#handoff='+'a'.repeat(64),configuration:{id:konfig,rev:calls.cart.length},lineId:'theme'};
  }};
 const overview={open:false},field={value:quantity};
 const footer={querySelectorAll:()=>[],append(){},closest:selector=>selector==='dialog'?overview:null};
 const api={el,r:{querySelector:selector=>selector==='[data-fk-quantity]'?field:null},config:{profile:{geometry:{width:100,height:60},optionGroups:[],designs:[]}},files:new Map(),pending};
 const cart=installShopCart(api,footer,gate);
 // completion.mjs: showModal() setzt das open-Attribut; der Browser meldet es dem Beobachter und zeichnet danach.
 const open=async()=>{overview.open=true;for(const observer of observers)observer.callback();const drawn=frames.length;await tick();assert.equal(frames.length,drawn);for(const frame of frames.splice(0))frame();await tick();await tick();};
 const close=()=>{overview.open=false;for(const observer of observers)observer.callback();};
 return {el,gate,cart,calls,said,observers,frames,overview,field,open,close,draft,token,click:()=>cart.button.events.click(),pageshow:persisted=>{for(const handler of shown)handler({persisted});}};
}
const quiet=flow=>{assert.deepEqual(flow.said,[]);assert.equal(flow.cart.status.hidden,true);assert.equal(flow.cart.button.disabled,false);assert.equal(flow.cart.button.textContent,'Jetzt in den Warenkorb');assert.deepEqual(flow.calls.checks,[]);};

test('Vorab sichern: Übersicht öffnen sichert einmal im Hintergrund; der Klick legt nur noch ein',async t=>{
 const flow=cartFlow(t);
 assert.equal(flow.observers.length,1);assert.equal(flow.observers[0].node,flow.overview);assert.deepEqual(flow.observers[0].options,{attributes:true,attributeFilter:['open']});
 // Erst nach dem gezeichneten Bild: Das Öffnen selbst löst noch keine Arbeit aus.
 flow.overview.open=true;flow.observers[0].callback();
 assert.equal(flow.frames.length,1);await tick();assert.equal(flow.calls.png,0);assert.equal(flow.calls.save.length,0);
 flow.frames.splice(0)[0]();
 await until(()=>flow.calls.save.length===1,'Sicherungsabruf nach dem Öffnen');
 await tick();
 assert.equal(flow.calls.save[0].url,'/api/workshop/acrylic-drafts');assert.equal(flow.calls.save[0].expectedRevision,null);
 assert.deepEqual(Object.keys(flow.calls.save[0].input).sort(),['customerPreview','designId','media','objects','options','preview','productId','productRevision','quantity','textOnTop']);
 assert.equal(flow.calls.save[0].input.quantity,1);assert.equal(flow.calls.save[0].input.preview,'UkVG');assert.equal(flow.calls.save[0].input.customerPreview,'QklMRA==');
 quiet(flow);assert.equal(flow.calls.cart.length,0,'bei Shopify und im Warenkorb entsteht beim Öffnen nichts');
 // Schließen und unverändert wieder öffnen: kein zweiter Abruf.
 flow.close();await flow.open();
 assert.equal(flow.calls.save.length,1);quiet(flow);
 await flow.click();
 assert.equal(flow.calls.save.length,1,'der Klick sichert nicht noch einmal');
 assert.deepEqual(flow.calls.cart,[{body:{draftId:flow.draft,expectedRevision:1,quantity:1},access:{draftToken:flow.token}}]);
 assert.deepEqual(flow.calls.checks,['text','layout'],'alle Prüfungen vor dem Klick bleiben');
 assert.deepEqual(flow.said,['3 von 4 · Warenkorb wird vorbereitet …','4 von 4 · Deine Gestaltung ist gesichert und wird in den Warenkorb gelegt …']);
 assert.deepEqual(flow.calls.assigned,['https://test.myshopify.com/apps/konfigurator/cart#handoff='+'a'.repeat(64)]);
 assert.equal(flow.el.cartEdit.draftRevision,1);assert.equal(flow.cart.button.textContent,'Warenkorb aktualisieren');
});

test('Vorab sichern: ein verbrauchter Stand wird nicht noch einmal eingelegt – der zweite Klick sichert wie bisher neu',async t=>{
 const flow=cartFlow(t,{submit:(body,n)=>{if(n===1)throw Error('Der Warenkorb ist gerade nicht erreichbar.');}});
 await flow.open();await until(()=>flow.calls.save.length===1,'Vorab-Sicherung');await tick();
 await flow.click();
 assert.equal(flow.said.at(-1),'Der Warenkorb ist gerade nicht erreichbar.');assert.equal(flow.calls.save.length,1);assert.equal(flow.calls.cart[0].body.expectedRevision,1);
 flow.close();await flow.open();
 assert.equal(flow.calls.save.length,1,'unverändert wieder geöffnet: kein zweites Vorab-Sichern');
 flow.said.length=0;
 await flow.click();
 assert.equal(flow.calls.save.length,2);assert.equal(flow.calls.save[1].url,'/api/workshop/acrylic-drafts/'+flow.draft);assert.equal(flow.calls.save[1].expectedRevision,1);
 assert.equal(flow.calls.cart[1].body.expectedRevision,2);
 assert.deepEqual(flow.said.map(text=>text.slice(0,7)),['1 von 4','2 von 4','3 von 4','4 von 4']);
});

test('Vorab sichern: nach einer Änderung passt der Schlüssel nicht mehr – der Klick geht den bisherigen Weg',async t=>{
 const flow=cartFlow(t);
 await flow.open();await until(()=>flow.calls.save.length===1,'Vorab-Sicherung');await tick();
 flow.field.value='3';
 await flow.click();
 assert.deepEqual(flow.said.map(text=>text.slice(0,7)),['1 von 4','2 von 4','3 von 4','4 von 4']);
 assert.equal(flow.calls.save.length,2);assert.equal(flow.calls.save[1].expectedRevision,1,'nacheinander: die Sicherung des Klicks baut auf der Vorab-Revision auf');
 assert.equal(flow.calls.save[1].input.quantity,3);
 assert.deepEqual(flow.calls.cart.map(call=>call.body),[{draftId:flow.draft,expectedRevision:2,quantity:3}]);
});

test('Vorab sichern: der Klick wartet auf eine laufende Sicherung und schickt keine zweite',async t=>{
 let release;const flow=cartFlow(t,{respond:(call,n)=>n===1?new Promise(resolve=>{release=()=>resolve(null);}):null});
 await flow.open();await until(()=>flow.calls.save.length===1,'laufende Vorab-Sicherung');
 quiet(flow);
 const clicked=flow.click();
 await until(()=>flow.said.length===1,'Statustext des Klicks');
 assert.deepEqual(flow.said,['2 von 4 · Gestaltung wird gesichert …']);assert.equal(flow.cart.button.disabled,true);assert.equal(flow.calls.cart.length,0);
 release();await clicked;
 assert.equal(flow.calls.save.length,1);assert.equal(flow.calls.cart.length,1);assert.equal(flow.calls.cart[0].body.expectedRevision,1);
 assert.deepEqual(flow.said.map(text=>text.slice(0,7)),['2 von 4','3 von 4','4 von 4']);
});

test('Vorab sichern: ein Fehler bleibt still; der Klick sichert selbst und zeigt dessen Meldung wie bisher',async t=>{
 const busy=()=>Response.json({error:{message:'Eine Gestaltung wird gerade gesichert. Bitte kurz warten.'}},{status:409});
 const flow=cartFlow(t,{respond:(call,n)=>n<=2?busy():null});
 await flow.open();await until(()=>flow.calls.save.length===1,'Vorab-Sicherung');await tick();await tick();
 quiet(flow);
 flow.close();await flow.open();
 assert.equal(flow.calls.save.length,1,'kein zweiter Versuch für denselben Stand');
 await flow.click();
 assert.equal(flow.calls.save.length,2);assert.equal(flow.calls.cart.length,0);
 assert.deepEqual(flow.said,['1 von 4 · Vorschau wird erstellt …','2 von 4 · Gestaltung wird gesichert …','Eine Gestaltung wird gerade gesichert. Bitte kurz warten.']);
 assert.equal('busy' in flow.cart.status.dataset,false);assert.equal(flow.cart.button.disabled,false);
 await flow.click();
 assert.equal(flow.calls.save.length,3);assert.deepEqual(flow.calls.cart.map(call=>call.body.expectedRevision),[1]);
});

test('Vorab sichern: nur ohne Textproblem, ohne ladendes Foto und mit Menge 1–99 – und nie neben einem laufenden Klick',async t=>{
 for(const options of [{issues:()=>[{id:'name',message:'Bitte Name ausfüllen.'}]},{pending:()=>true},{quantity:'0'},{quantity:'100'},{quantity:'1.5'}]){
  const flow=cartFlow(t,options);
  await flow.open();await tick();await tick();
  assert.equal(flow.calls.png,0,JSON.stringify(options));assert.equal(flow.calls.save.length,0);quiet(flow);
 }
 // Geöffnet und sofort wieder geschlossen: nichts sichern.
 const closed=cartFlow(t);closed.overview.open=true;closed.observers[0].callback();closed.close();closed.frames.splice(0)[0]();await tick();await tick();
 assert.equal(closed.calls.png,0);assert.equal(closed.calls.save.length,0);
 // Klick noch vor dem Beginn des Vorab-Sicherns: Es gibt genau eine Sicherung, die des Klicks.
 let release;const fast=cartFlow(t,{respond:()=>new Promise(resolve=>{release=()=>resolve(null);})});
 fast.overview.open=true;fast.observers[0].callback();
 const clicked=fast.click();
 await until(()=>fast.calls.save.length===1,'Sicherung des Klicks');
 fast.frames.splice(0)[0]();await tick();await tick();
 assert.equal(fast.calls.png,1,'neben dem laufenden Klick beginnt keine zweite Vorbereitung');
 release();await clicked;
 assert.equal(fast.calls.save.length,1);assert.equal(fast.calls.cart.length,1);assert.equal(fast.calls.png,1);
});

test('Vorab sichern: nach der Übergabe keine weitere Sicherung, solange die Weiterleitung läuft; nach „Zurück“ wieder',async t=>{
 const flow=cartFlow(t);
 await flow.open();await until(()=>flow.calls.save.length===1,'Vorab-Sicherung');await tick();
 await flow.click();
 assert.equal(flow.calls.assigned.length,1);
 // Die Seite ist noch bedienbar, bis der Warenkorb geladen ist: Eine neue Sicherung machte die übergebene Revision ungültig.
 flow.close();await flow.open();
 assert.equal(flow.calls.save.length,1);assert.equal(flow.calls.png,1);
 flow.pageshow(false);flow.close();await flow.open();
 assert.equal(flow.calls.save.length,1);
 // Zurück aus dem Warenkorb (Seite vom Browser aufbewahrt): Der Stand gehört jetzt zur Warenkorbzeile und wird vorab gesichert.
 flow.pageshow(true);flow.close();await flow.open();
 await until(()=>flow.calls.save.length===2,'Vorab-Sicherung nach der Rückkehr');await tick();
 assert.equal(flow.calls.save[1].url,'/api/workshop/acrylic-drafts/'+flow.draft);assert.equal(flow.calls.save[1].expectedRevision,1);
 await flow.click();
 assert.equal(flow.calls.save.length,2);
 assert.deepEqual(flow.calls.cart[1].body,{draftId:flow.draft,expectedRevision:2,quantity:1,configId:konfig,cartLineId:'theme',cartRevision:1});
});

test('Vorab sichern: die Schein-Umgebung der Abläufe ist nach den Tests wieder entfernt',()=>{
 for(const [name,descriptor] of browserGlobals)assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,name),descriptor,name);
});
