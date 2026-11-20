// Claude · 20.11.2026 · Gemeinsamer Nachbau für meine Prüfungen am echten Shop, nur in meinem Browser:
// ersetzt das Editor-Paket und stellt den neuen Server-Teil (Fingerabdruck der Startantwort, Abruf design-parts) aus echten
// Live-Antworten nach, mit den Funktionen aus dem Zweig. Höchstens drei Modellabrufe gleichzeitig an den echten Server.
import fs from 'node:fs';import zlib from 'node:zlib';import {pathToFileURL} from 'node:url';
const APP='https://app-2027.gravuru-designwerkstatt.de';const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function nachbau(ctx,page,res,{ALT=process.env.ALT_PAKET,NEU=process.env.NEU_PAKET,BAU_NEU=process.env.BAU_NEU,QUELLE=process.env.QUELLE||'/home/claude/work/prioD',fertig=new Map(),verzug=()=>0,ablage=process.env.ABLAGE||null}={}){
 // ablage: Ordner außerhalb des Repos, in dem geholte Modelle je Design liegen bleiben (nur zum schnelleren Wiederholen meiner Läufe).
 if(ablage){fs.mkdirSync(ablage,{recursive:true});for(const name of fs.readdirSync(ablage))if(name.endsWith('.json')){const id=decodeURIComponent(name.slice(0,-5));if(!fertig.has(id))fertig.set(id,Promise.resolve(JSON.parse(fs.readFileSync(ablage+'/'+name,'utf8'))));}res.ersatz.ausAblage=fertig.size;}
 const {acrylAssetText}=await import(pathToFileURL(QUELLE+'/app/workshop/acryl-employee-host.mjs'));
 const {shopDesignParts,shopDesignBase,hasDesignParts}=await import(pathToFileURL(QUELLE+'/app/workshop/shop-start-model.mjs'));
 res.ersatz??={};let frei=3;const schlange=[];const nehmen=()=>new Promise(ok=>{if(frei>0){frei--;ok();}else schlange.push(ok);});const geben=()=>{const n=schlange.shift();if(n)n();else frei++;};
 await page.route('**/_merchant-acryl-editor.html*',async route=>{let r,body='';for(let i=0;i<4&&!body.includes(ALT);i++){r=await route.fetch();body=await r.text();if(!body.includes(ALT))await sleep(1000);}if(!body.includes(ALT)){res.fehler.push('Editor-Seite nennt das erwartete Paket nicht');return route.fulfill({response:r});}res.ersatz.seite=true;return route.fulfill({response:r,body:body.split(ALT).join(NEU)});});
 await page.route('**/_acryl-bundle/'+NEU+'.mjs*',route=>{res.ersatz.paket=true;return route.fulfill({status:200,contentType:'text/javascript; charset=utf-8',body:acrylAssetText(fs.readFileSync(BAU_NEU+'/bundle/'+NEU+'.mjs','utf8'),'/_bundle/'+NEU+'.mjs')});});
 await page.route(u=>u.pathname==='/api/shop-entry/model',async route=>{
  if(route.request().headers()['x-claude-nachbau'])return route.continue();
  let r,data=null;for(let i=0;i<4&&!data;i++){r=await route.fetch();if(r.status()!==200)return route.fulfill({response:r});try{data=await r.json();}catch{await sleep(1200);}}
  if(hasDesignParts(data.model.universal)){data.designBase=shopDesignBase(data.model.universal);res.ersatz.fingerabdruck=data.designBase.slice(0,12);}
  return route.fulfill({response:r,body:JSON.stringify(data)});});
 await page.route(u=>u.pathname==='/api/shop-entry/design-parts',async route=>{
  const req=route.request(),ids=new URL(req.url()).searchParams.get('designs').split(','),session=req.headers()['x-gravuru-shop-session'],start=Date.now();
  await Promise.all(ids.map(async id=>{
   if(fertig.has(id))return fertig.get(id);
   const holen=(async()=>{await nehmen();try{let d=null;for(let i=0;i<3&&!d;i++){try{const r=await ctx.request.get(APP+'/api/shop-entry/model?design='+encodeURIComponent(id),{timeout:60000,headers:{'X-Gravuru-Shop-Session':session,Origin:APP,'x-claude-nachbau':'1'}});if(r.status()!==200){res.ersatz.modellFehler=(res.ersatz.modellFehler||0)+1;break;}d=await r.json();}catch{res.ersatz.wiederholt=(res.ersatz.wiederholt||0)+1;await sleep(800);}}if(d&&ablage)fs.writeFileSync(ablage+'/'+encodeURIComponent(id)+'.json',JSON.stringify(d));return d;}finally{geben();}})();
   fertig.set(id,holen);return holen;}));
  let binding=null,configuration=null;const designs=[];
  for(const id of ids){const d=await fertig.get(id);if(!d||d.model.universal.profile.defaultDesignId!==id)continue;binding=d.binding;configuration={id:d.model.configuration.id,revision:d.model.configuration.revision};designs.push({id,base:shopDesignBase(d.model.universal),parts:shopDesignParts(d.model.universal)});}
  if(!binding)for(const p of fertig.values()){const any=await p;if(any){binding=any.binding;configuration={id:any.model.configuration.id,revision:any.model.configuration.revision};break;}}
  const body=JSON.stringify({binding,configuration,designs});
  const rest=verzug()-(Date.now()-start);if(rest>0)await sleep(rest);
  (res.ersatz.teile??=[]).push({designs:designs.length,kB:Math.round(body.length/1024),brotliKB:Math.round(zlib.brotliCompressSync(Buffer.from(body),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:5}}).length/1024),nachMs:Date.now()-start});
  return route.fulfill({status:200,contentType:'application/json; charset=utf-8',headers:{'cache-control':'private, no-store'},body});});
 return fertig;
}
