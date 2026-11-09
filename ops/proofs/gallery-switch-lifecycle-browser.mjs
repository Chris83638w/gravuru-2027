import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),output=path.join(root,'.local-data/gallery-switch-lifecycle-proof'),port=8267;
fs.mkdirSync(output,{recursive:true});
const events=[];let sequence=0,mode='fail';
const send=(res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(typeof body==='string'?body:JSON.stringify(body));};
const binding=client=>({productId:'synthetic-'+client,productRevision:1,shopifyProductId:'gid://shopify/Product/2',shopifyVariantId:'gid://shopify/ProductVariant/22'});
const model=client=>({name:'Fixture '+client,configuration:{id:binding(client).productId,revision:1},universal:{profile:{id:'fixture',geometry:{width:220,height:140},defaultDesignId:'design-target',designs:[{id:'design-target',objects:[]}],optionGroups:[]}},legacy:{}});
const parent=String.raw`<!doctype html><html lang="de"><meta charset="utf-8"><title>Lokale Galerie-Wechselprüfung – isoliert</title><style>body{font:16px system-ui;margin:24px;background:#f5f8f7;color:#15352d}h1{font-size:24px}button{font:inherit;padding:12px 18px;background:#08624e;color:white;border:0;border-radius:8px;cursor:pointer}iframe{width:100%;height:430px;border:1px solid #9ab8ab;background:white}#editor{position:relative;max-width:880px}#result{white-space:pre-wrap;background:white;border:1px solid #9ab8ab;padding:16px;max-width:850px}small{display:block;max-width:870px;margin:12px 0}#phase{font-weight:bold;margin:12px 0}</style>
<h1>Galerie-Wechselprüfung · lokale Fixture</h1><small>Echte Galerie- und Gateway-Module aus dem Kandidaten; synthetische Karten und verzögerte lokale HTTP-Antworten. Kein Shop, keine Kundendaten, keine Konfi-Gestaltungsprüfung.</small><button id="run">Browser-Prüflauf starten</button><div id="phase">Bereit</div><div id="editor"></div><pre id="result">Noch nicht gestartet.</pre>
<script type="module">
import {createDesignSwitch} from '/app/workshop/ui/shop-design-switch.mjs';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const get=async url=>{const r=await fetch(url);const data=await r.json();if(!r.ok)throw Error(data.message||'Fixture request failed');return data;};
const client=id=>({loadDesignGallery:()=>get('/gallery?client='+id),loadDesignPreview:async(target,_url,signal)=>{const r=await fetch('/preview?client='+id+'&target='+encodeURIComponent(target),{signal});if(!r.ok)throw Error('preview failed');return r.blob();},switchDesign:target=>get('/choose?target='+encodeURIComponent(target)),loadModel:async()=>get('/model?client='+id),loadResources:async()=>({})});
const initialData=await get('/data?client=one'),frame=document.createElement('iframe');frame.title='Vorherige Galerie';
let current,api;window.proofReady=[];
const coordinator=createDesignSwitch({initial:{client:client('one'),data:initialData,resources:{},frame},fragment:new URLSearchParams(),container:document.querySelector('#editor'),activate(entry,gateway){current=entry;api=gateway;window.GravuruShopEntry={designGallery:gateway};window.fixtureData=entry.data;},toDataUrl:async()=>'',clientFactory:({token})=>client(token),timeoutMs:12000});
frame.src='/frame.html?client=one';document.querySelector('#editor').append(frame);
const phase=t=>document.querySelector('#phase').textContent=t,results=[];
const check=(ok,text)=>{results.push({pass:!!ok,text});document.querySelector('#result').textContent=results.map(r=>(r.pass?'PASS ':'FAIL ')+r.text).join('\n');if(!ok)throw Error(text);};
const images=f=>[...f.contentDocument.querySelectorAll('.ux-product-card img')];
const waitFor=async fn=>{for(let i=0;i<160;i++){if(fn())return;await pause(50);}throw Error('Fixture wait timed out');};
const stats=()=>get('/events');
document.querySelector('#run').onclick=async()=>{
 document.querySelector('#run').disabled=true;results.length=0;
 try{
  await waitFor(()=>window.proofReady.includes('one')&&images(frame).some(i=>i.src));
  const finished=images(frame).filter(i=>i.src).map(i=>[i,i.src]);const unfinished=images(frame).filter(i=>!i.src).length;
  check(finished.length>0&&unfinished>0,'Fertige und noch fehlende Bilder sind gleichzeitig vorhanden.');
  phase('1/3: Designwechsel wartet; alte Bilder müssen pausieren.');await get('/mode?value=fail');
  const before=await stats();frame.contentDocument.querySelectorAll('.ux-product-choose')[4].click();
  await pause(300);const atPause=await stats();await pause(700);const during=await stats();
  check(during.filter(e=>e.type==='preview-start'&&e.client==='one').length===atPause.filter(e=>e.type==='preview-start'&&e.client==='one').length,'Während des wartenden Wechsels starten keine weiteren alten Vorschaubilder.');
  check(during.some(e=>e.type==='preview-abort'&&e.time>=before.at(-1).time),'Laufende Browserabrufe der alten Galerie wurden abgebrochen.');
  await waitFor(()=>frame.contentDocument.querySelector('.ux-product-status').textContent.includes('Absichtlicher Testfehler'));
  check(current.frame===frame,'Der absichtliche Ladefehler stellt denselben alten Frame wieder her.');
  check(finished.every(([img,url])=>img.src===url),'Bereits fertige Blob-Bilder bleiben nach dem Fehler unverändert.');
  await pause(350);const resumed=await stats();check(resumed.filter(e=>e.type==='preview-start'&&e.client==='one').length>during.filter(e=>e.type==='preview-start'&&e.client==='one').length,'Fehlende Bilder werden nach dem Fehler weitergeladen.');
  phase('2/3: Erfolgreicher Wechsel; neue Bilder erst nach Ready.');await get('/mode?value=success');
  const oldCount=(await stats()).filter(e=>e.type==='preview-start'&&e.client==='one').length;
  frame.contentDocument.querySelectorAll('.ux-product-choose')[5].click();
  await waitFor(()=>current.frame!==frame&&window.proofReady.includes('two'));await pause(250);
  const switched=await stats();check(switched.filter(e=>e.type==='preview-start'&&e.client==='one').length===oldCount,'Der alte Frame startet während und nach dem erfolgreichen Wechsel keine neuen Bilder.');
  const ready=switched.find(e=>e.type==='frame-ready'&&e.client==='two'),firstNew=switched.find(e=>e.type==='preview-start'&&e.client==='two');
  check(ready&&firstNew&&firstNew.sequence>ready.sequence,'Die neue Galerie startet Vorschaubilder erst nach ihrem Ready-Signal.');
  phase('3/3: Zur vorherigen Gestaltung; fertige Bilder behalten.');
  current.frame.contentDocument.querySelector('.ux-product-back').click();await pause(350);
  const back=await stats();check(current.frame===frame&&frame.hidden===false,'Zurück zeigt denselben vorherigen Frame wieder.');
  check(finished.every(([img,url])=>img.src===url),'Zurück erhält die fertigen Bilder bytegleich über dieselben Blob-URLs.');
  check(back.filter(e=>e.type==='preview-start'&&e.client==='one').length>oldCount,'Zurück setzt nur fehlende Bilder wieder fort.');
  const finishedTargets=finished.map(([i])=>i.previewRequest.item.target);check(finishedTargets.every(target=>back.filter(e=>e.type==='preview-start'&&e.client==='one'&&e.target===target).length===1),'Fertige Bilder wurden nicht erneut angefordert.');
  phase('Abgeschlossen: '+results.length+'/'+results.length+' Prüfungen bestanden.');
 }catch(error){phase('Prüfung fehlgeschlagen: '+error.message);results.push({pass:false,text:error.stack});}
 finally{const evidence={browser:navigator.userAgent,source:'6c310120d48daef12b16e9568916a62ecd278597',results,events:await stats(),scope:'Real browser with real two modules; synthetic local HTTP and cards, no customer/production traffic'};window.testEvidence=evidence;await fetch('/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(evidence)});}
};
</script></html>`;
const frameHtml=String.raw`<!doctype html><html lang="de"><meta charset="utf-8"><style>body{font:15px system-ui;margin:12px}.ux-product-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ux-product-card img{max-width:100%;height:85px;object-fit:contain}.ux-product-back{padding:10px;background:#08624e;color:white}.ux-product-status{min-height:24px}.ux-choice-tile{border:1px solid #bdcec5;border-radius:8px}h2{font-size:18px}</style><div id="ux-panel-design"></div><script type="module">
import {installProductDesignGallery} from '/app/configurator/variant-m/product-design-gallery.mjs';
const client=new URLSearchParams(location.search).get('client'),model=parent.fixtureData.model,config=model.universal,r=document.body;
const el={state:{designId:'design-target',objects:[],mOptions:{}},sync(){},normalize(){},id:()=>crypto.randomUUID()};
await installProductDesignGallery({el,r,config,files:new Map(),say(){},dialog(){},esc:s=>s});
await fetch('/ready?client='+client);parent.proofReady.push(client);parent.postMessage({type:'gravuru-ux-ready'},location.origin);
</script></html>`;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port),client=url.searchParams.get('client')||'one';
 const event=(type,extra={})=>{const row={sequence:++sequence,type,time:Date.now(),client,...extra};events.push(row);return row;};
 try{
  if(req.method==='POST'&&url.pathname==='/evidence'){if(req.headers.origin!=='http://127.0.0.1:'+port)return send(res,403,{});let text='';for await(const c of req){text+=c;if(text.length>200000)throw Error('too large');}JSON.parse(text);fs.writeFileSync(path.join(output,'browser-evidence.json'),text+'\n');return send(res,200,{saved:true});}
  if(req.method!=='GET')return send(res,405,{});
  if(url.pathname==='/')return send(res,200,parent,'text/html; charset=utf-8');
  if(url.pathname==='/frame.html')return send(res,200,frameHtml,'text/html; charset=utf-8');
  if(url.pathname==='/events')return send(res,200,events);
  if(url.pathname==='/mode'){mode=url.searchParams.get('value');return send(res,200,{mode});}
  if(url.pathname==='/ready'){event('frame-ready');return send(res,200,{ready:true});}
  if(url.pathname==='/gallery'){event('gallery');return send(res,200,{status:'ready',hasTheme:false,total:40,nextPage:null,items:Array.from({length:40},(_,i)=>({target:'card-'+i,designId:'design-target',designName:'Fixture '+i,widthMm:220,heightMm:140,unitCents:1999,current:false}))});}
  if(url.pathname==='/choose'){const chosenMode=mode;event('switch-start',{mode:chosenMode});await new Promise(r=>setTimeout(r,2200));return send(res,200,{token:chosenMode==='fail'?'broken':'two',designId:'design-target',binding:binding(chosenMode==='fail'?'broken':'two')});}
  if(url.pathname==='/model'&&client==='broken'){event('model-failure');return send(res,503,{message:'Absichtlicher Testfehler'});}
  if(url.pathname==='/data'||url.pathname==='/model')return send(res,200,{binding:binding(client),editorPath:'/frame.html?client='+client,model:model(client)});
  if(url.pathname==='/preview'){const target=url.searchParams.get('target'),first=target==='card-0';event('preview-start',{target});const timer=setTimeout(()=>{event('preview-finish',{target});send(res,200,'<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140"><rect width="220" height="140" fill="#d9e9df"/><text x="12" y="75" font-size="22">'+client+' '+target+'</text></svg>','image/svg+xml');},first?30:300000);res.on('close',()=>{if(!res.writableEnded){clearTimeout(timer);event('preview-abort',{target});}});return;}
  let filename;if(url.pathname.startsWith('/app/'))filename=path.resolve(root,'.'+url.pathname);else if(url.pathname.startsWith('/configurator/'))filename=path.resolve(root,'app','.'+url.pathname);else return send(res,404,{});
  if(!filename.startsWith(path.join(root,'app')+path.sep)||!fs.existsSync(filename))return send(res,404,{});
  return send(res,200,fs.readFileSync(filename,'utf8'),filename.endsWith('.css')?'text/css':'text/javascript');
 }catch(error){send(res,500,{message:error.message});}
});
server.listen(port,'127.0.0.1',()=>console.log('Local browser fixture http://127.0.0.1:'+port));
