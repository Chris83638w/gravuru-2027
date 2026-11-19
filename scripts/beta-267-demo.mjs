// Local cart page for screenshots. No Shopify connection.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {quote,selectedProfile} from '../app/configurator/variant-m/contract.mjs';
import {createCartLedger,png,renderCustomerCart} from '../app/workshop/beta-267-cart.mjs';
import {createHash} from 'node:crypto';

const outDir=new URL('../docs/handoffs/2026-11-19-grok-beta-267/',import.meta.url);
fs.mkdirSync(outDir,{recursive:true});
const options={format:'16x28',frame:'FK-RUNDUM',color:'schwarz',mounting:'SIL',position:'standard'};
const config=doorbellFixture();
const design=selectedProfile(config,options).designs[0];
const price=quote(config,design.objects,design.id,options,1);
if(price.unitCents!==5498)throw Error('Unerwarteter Fixture-Preis: '+price.unitCents);
const GLYPHS={
 H:['10001','10001','11111','10001','10001'],
 A:['01110','10001','11111','10001','10001'],
 U:['10001','10001','10001','10001','01110'],
 S:['01111','10000','01110','00001','11110'],
 N:['10001','11001','10101','10011','10001'],
 O:['01110','10001','10001','10001','01110'],
 R:['11110','10001','11110','10100','10001'],
 D:['11100','10010','10001','10010','11100'],
 E:['11111','10000','11110','10000','11111'],
 '1':['00100','01100','00100','00100','01110'],
 '2':['01110','10001','00110','01000','11111'],
 '7':['11111','00001','00010','00100','00100']
};
function plate(word,ink){
 return png(320,220,(x,y)=>{
  if(x<16||y<16||x>303||y>203)return [244,241,234];
  const plateColor=ink==='nord'?[24,58,52]:[92,48,32];
  let on=false;
  const scale=5,startX=28,startY=78;
  let cursor=startX;
  for(const ch of word){
   if(ch===' '){cursor+=scale*3;continue;}
   const rows=GLYPHS[ch];if(!rows)throw Error('Zeichen fehlt: '+ch);
   for(let row=0;row<rows.length;row++)for(let col=0;col<5;col++)if(rows[row][col]==='1'){
    const left=cursor+col*scale,top=startY+row*scale;
    if(x>=left&&x<left+scale-1&&y>=top&&y<top+scale-1)on=true;
   }
   cursor+=6*scale;
  }
  return on?[236,228,210]:plateColor;
 });
}
const nord=plate('NORD 12','nord'),sued=plate('SUED 27','sued');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ledger=createCartLedger();
const variantId='fixture-16x28-FK-RUNDUM-schwarz-SIL';
const base={variantId,productTitle:'Funkklingel Fixture',designName:'Beispiel',options:[{label:'Format',value:'16×28 cm'},{label:'Rahmen',value:'FK-RUNDUM'},{label:'Farbe',value:'Schwarz'},{label:'Befestigung',value:'SIL'}],unitCents:price.unitCents,quantity:1,currency:'EUR'};
ledger.commit({...base,gravurtext:'Haus Nord 12',designSha256:sha(Buffer.from('Haus Nord 12')),previewPng:nord,snapshotId:'proof-nord'});
ledger.commit({...base,gravurtext:'Haus Süd 27',designSha256:sha(Buffer.from('Haus Süd 27')),previewPng:sued,snapshotId:'proof-sued'});
const html=renderCustomerCart(ledger.lines(),{title:'Warenkorb'});
fs.writeFileSync(new URL('./warenkorb.html',outDir),html);
const server=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);});
server.listen(0,'127.0.0.1');await once(server,'listening');
const port=server.address().port;
const chrome=spawn('google-chrome',['--headless=new','--disable-gpu','--no-sandbox','--remote-debugging-port=9222','--window-size=1365,900','about:blank'],{stdio:'ignore'});
async function debuggerUrl(){
 for(let i=0;i<50;i++){
  try{const version=await fetch('http://127.0.0.1:9222/json/version');if(version.ok)return (await version.json()).webSocketDebuggerUrl;}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Chrome-Debugging nicht erreichbar');
}
const browser=new WebSocket(await debuggerUrl());
await new Promise(resolve=>browser.addEventListener('open',resolve));
let id=0;const pending=new Map();
browser.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const messageId=++id;pending.set(messageId,message=>message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result));browser.send(JSON.stringify({id:messageId,method,params,sessionId}));});
const target=await send('Target.createTarget',{url:'http://127.0.0.1:'+port+'/'});
const attached=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
const session=attached.sessionId;
await send('Page.enable',{},session);
await send('Runtime.enable',{},session);
async function shot(name,width,height){
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700},session);
 await send('Page.reload',{},session);
 await new Promise(resolve=>setTimeout(resolve,400));
 const image=await send('Page.captureScreenshot',{format:'png'},session);
 fs.writeFileSync(new URL(name,outDir),Buffer.from(image.data,'base64'));
}
await shot('PC-Warenkorb.png',1365,900);
const desktop=await send('Runtime.evaluate',{expression:`(()=>{const before=document.querySelectorAll('article.line').length;document.querySelector('[data-enlarge]').click();const open=document.querySelector('#zoom').open;const alt=document.querySelector('#zoom img').alt;document.querySelector('#close-zoom').click();document.querySelector('[data-remove]').click();const texts=[...document.querySelectorAll('.text')].map(node=>node.textContent);return JSON.stringify({before,open,alt,after:document.querySelectorAll('article.line').length,texts,edit:document.body.innerHTML.includes('Bearbeiten')||document.body.innerHTML.includes('_gravuru_bearbeiten')});})()`,returnByValue:true},session);
await shot('Mobil-Warenkorb.png',390,844);
const mobile=await send('Runtime.evaluate',{expression:`JSON.stringify({lines:document.querySelectorAll('article.line').length,images:[...document.querySelectorAll('img')].map(img=>img.naturalWidth),edit:[...document.querySelectorAll('a,button')].map(node=>node.textContent.trim())})`,returnByValue:true},session);
fs.writeFileSync(new URL('./browser-pruefung.json',outDir),JSON.stringify({desktop:JSON.parse(desktop.result.value),mobile:JSON.parse(mobile.result.value),price:price.unitCents,variantId},null,2)+'\n');
console.log(desktop.result.value);console.log(mobile.result.value);
browser.close();chrome.kill();server.close();
