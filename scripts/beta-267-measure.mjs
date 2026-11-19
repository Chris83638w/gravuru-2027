// Local timings for beta #267. Not a live-shop measurement.
import {performance} from 'node:perf_hooks';
import http from 'node:http';
import {once} from 'node:events';
import {doorbellFixture} from '../app/workshop/test-fixtures/doorbell-config.mjs';
import {selectedDoorbellProfile} from '../app/configurator/variant-m/doorbell-selection.mjs';
import {resolveCheckoutPreview} from '../app/workshop/beta-267-checkout-preview.mjs';
import {createShopEntry} from '../app/workshop/shop-entry.mjs';
import fs from 'node:fs';

const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
const round=n=>Math.round(n*100)/100;

function inflate(config){
 const extra=[];
 for(let i=0;i<2500;i++)extra.push({id:'bulk-'+i,type:'motif',motif:'example',x:40,y:40,w:8,h:8,rotation:0,customerEditable:true,templateOrigin:true});
 for(const profile of [config.profile,...config.doorbell.formats.map(format=>format.profile)]){
  const design=profile.designs[0];
  design.objects=design.objects.concat(extra.map((object,index)=>({...object,id:object.id+'-'+profile.geometry.width+'-'+index})));
 }
 return config;
}
function profileRound(){
 const cold=doorbellFixture();inflate(cold);
 const started=performance.now();
 selectedDoorbellProfile(cold,{format:'24x20',position:'opposite',frame:'FK-SEITLICH',color:'anthrazit',mounting:'B04S'});
 const coldMs=performance.now()-started;
 const warm=[];
 for(let i=0;i<8;i++){
  const t=performance.now();
  selectedDoorbellProfile(cold,{format:'24x20',position:'opposite',frame:'FK-SEITLICH',color:'anthrazit',mounting:'B04S'});
  warm.push(performance.now()-t);
 }
 return {coldMs,warmMs:median(warm)};
}
async function previewRound(){
 const image=()=>new Promise(resolve=>setTimeout(()=>resolve('https://cdn.shopify.com/s/files/1/0/files/gravuru.png'),2000));
 const fastStart=performance.now();
 const fast=await resolveCheckoutPreview({checkoutImage:image,source:'https://app.example/gestaltung/a.png',hasSecuredPreview:true,previewFirst:true,budgetMs:0});
 const fastMs=performance.now()-fastStart;
 const slowStart=performance.now();
 const slow=await resolveCheckoutPreview({checkoutImage:image,source:'https://app.example/gestaltung/a.png',hasSecuredPreview:true,previewFirst:false});
 return {fastMs,slowMs:performance.now()-slowStart,fastStatus:fast.status,slowStatus:slow.status};
}
async function pageRound(){
 const origin='https://app.example',shopDomain='gravuru-design.myshopify.com',secret='synthetic-app-secret-value';
 const store={storeId:'acryl',registry:{resolve(){throw Object.assign(Error('keine Zuordnung'),{status:404,code:'shop_binding_active_not_found'});}},workshop:{tenantId:'gravuru',sessionContext:{shopDomain},model(){throw Error('kein Modell');},repository:{get(){return {id:'x',revision:1,status:'draft',document:{}};}},assets:{read(){throw Error('kein Asset');}},customerDrafts:{acrylicDrafts:{get(){throw Error('kein Entwurf');},create(){throw Error('nein');},save(){throw Error('nein');}},review(){return {manifest:{}};},cartConfigurations:{forDraft(){return null;}}},orderIntake:{bindings(){return [];}}},apiPrefix:'/api/workshop/acryl/',nativeEditorPath:'/_merchant-acryl-editor.html',formEditorPath:'/_merchant-acryl-form-editor.html',cart:async()=>{throw Error('kein Warenkorb');}};
 const entry=createShopEntry({origin,shopDomain,secret,stores:[store],proxyPath:'/apps/konfigurator',clock:()=>1_800_000_000_000,modelSlimmer:null});
 const server=http.createServer((req,res)=>entry.handle(req,res,new URL(req.url,origin)));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const port=server.address().port;
 const get=(headers={})=>new Promise((resolve,reject)=>{
  const started=performance.now();
  const req=http.request({host:'127.0.0.1',port,path:'/konfigurator/shop/shop-entry-page.mjs',headers:{Host:'app.example','X-Forwarded-Proto':'https','Sec-Fetch-Site':'same-origin',...headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,bytes:Buffer.concat(chunks).length,etag:res.headers.etag,cache:res.headers['cache-control'],ms:performance.now()-started}));});
  req.on('error',reject);req.end();
 });
 const full=await get();
 const again=await get({'If-None-Match':full.etag});
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 return {full,again};
}
const profiles=[];
for(let i=0;i<3;i++)profiles.push(profileRound());
const previews=[];
for(let i=0;i<3;i++)previews.push(await previewRound());
const pages=[];
for(let i=0;i<3;i++)pages.push(await pageRound());
const report={
 measuredAt:'2026-11-19',
 host:'local cloud VM, not Chris device, not the live shop',
 definition:{
  technicalWait:'Sum of caused waits on the customer path. Free editing time is excluded. This run measures the two code waits that were changed, plus repeat loading of a static page module.',
  notIncluded:'Live network, Shopify fileCreate, real phone, full editor start. Those remain the earlier issue comment figures.'
 },
 profileCache:{
  note:'Synthetic enlargement of the doorbell fixture (2500 extra template objects) so the clone cost is visible. The live ring profile was not loaded.',
  runs:profiles,
  medianColdMs:round(median(profiles.map(row=>row.coldMs))),
  medianWarmMs:round(median(profiles.map(row=>row.warmMs)))
 },
 checkoutPreview:{
  note:'Simulated Shopify image that takes 2000 ms. Preview-first returns the secured personal preview. The blocking path waits for the image. No Shopify call.',
  runs:previews,
  medianPreviewFirstMs:round(median(previews.map(row=>row.fastMs))),
  medianBlockingMs:round(median(previews.map(row=>row.slowMs)))
 },
 pageModule:{
  note:'shop-entry-page.mjs over local HTTP. First response is the full file. The next request sends the ETag and should be 304.',
  runs:pages,
  medianFullMs:round(median(pages.map(row=>row.full.ms))),
  medianRevalidatedMs:round(median(pages.map(row=>row.again.ms))),
  fullBytes:pages[0].full.bytes,
  revalidatedBytes:pages[0].again.bytes,
  revalidatedStatus:pages[0].again.status,
  cache:pages[0].full.cache
 }
};
fs.mkdirSync(new URL('../docs/handoffs/2026-11-19-grok-beta-267/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/handoffs/2026-11-19-grok-beta-267/messwerte.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
