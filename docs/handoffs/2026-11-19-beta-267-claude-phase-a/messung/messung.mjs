// Issue #267, Phase A – Messlauf Kundenweg im Live-Shop (nur lesend bis auf Testentwurf und Wegwerf-Warenkorb, keine Bestellung).
// Aufruf: node messung.mjs <handle> <mobil|desktop> <kalt|warm> <laufnummer> [--cart] [--prio] [--shots=<kürzel>]
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');
const {chromium}=require('playwright');
const [,, handle, profil='mobil', cache='kalt', lauf='1', ...flags]=process.argv;
const CART=flags.includes('--cart'), PRIO=flags.includes('--prio'), SHOTS=(flags.find(f=>f.startsWith('--shots='))||'').slice(8);
const SHOP='https://gravuru-design.myshopify.com', OUT=process.env.OUT||'./out';
const MOBIL=profil==='mobil';
const NET={offline:false,latency:150,downloadThroughput:1.6e6/8,uploadThroughput:750e3/8};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},
  args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',
  userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const res={handle,profil,cache,lauf:+lauf,prio:PRIO,chrome:browser.version(),start:new Date().toISOString(),fehler:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function neueSeite(){
  const page=await ctx.newPage();
  const cdp=await ctx.newCDPSession(page);
  if(MOBIL){await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',NET);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.__lcp=0;
    window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push({t:performance.timeOrigin+performance.now(),type:t});},true);
    try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});}catch{}});
  if(PRIO)await page.route('**/apps/konfigurator/start?*',r=>{const u=r.request().url();r.continue({url:u.includes('ui=prio-r15')?u:u+'&ui=prio-r15'});});
  return page;
}
const reqs=[];
function horche(page){page.on('requestfinished',async r=>{const u=r.url();if(u.startsWith('blob:')||u.startsWith('data:'))return;try{const tm=r.timing(),s=await r.sizes().catch(()=>null),rs=await r.response();
  reqs.push({ende:tm.startTime+Math.max(tm.responseEnd,0),beginn:tm.startTime,m:r.method(),u:u.replace(SHOP,'SHOP').replace('https://app-2027.gravuru-designwerkstatt.de','APP').slice(0,140),st:rs?.status(),req:s?.requestBodySize??0,res:s?.responseBodySize??0,ttfb:tm.responseStart>0?Math.round(tm.responseStart-tm.requestStart):null,dauer:Math.round(Math.max(tm.responseEnd,0))});}catch{}});}
const pfad=f=>{try{return new URL(f.url()).pathname;}catch{return '';}};
const editor=page=>page.frames().filter(f=>pfad(f)==='/_merchant-acryl-editor.html'&&!f.isDetached()).at(-1); // nach einem Server-Designwechsel bleibt das alte Fenster im Dokument stehen
const meldungen=page=>page.evaluate(()=>window.__gv||[]).catch(()=>[]);
async function warteMeldung(page,typ,abIndex,timeout=90000){const t0=Date.now();while(Date.now()-t0<timeout){const m=await meldungen(page);const hit=m.slice(abIndex).find(x=>x.type===typ);if(hit)return hit.t;await sleep(40);}return null;}
const KACHEL='button[aria-label^="Design "]';
async function sichtbareKacheln(ed){const tiles=ed.locator(KACHEL);const n=await tiles.count();const vis=[];for(let i=0;i<n&&vis.length<8;i++)if(await tiles.nth(i).isVisible().catch(()=>false))vis.push(i);return {tiles,n,vis};}
async function oeffneDesigns(page){const ed=editor(page);let k=await sichtbareKacheln(ed);if(k.vis.length>=2)return {geklickt:false,t:Date.now()};
  const tabs=ed.locator('button[data-ux-tab="design"], button:has-text("Designs")');const c=await tabs.count();
  for(let i=0;i<c;i++)if(await tabs.nth(i).isVisible().catch(()=>false)){const t=Date.now();await tabs.nth(i).click();return {geklickt:true,t};}
  return {geklickt:false,t:Date.now()};}
async function kachelnGefuellt(page,abT,timeout=60000){const t0=Date.now();while(Date.now()-t0<timeout){const ed=editor(page);if(ed){const ok=await ed.evaluate(sel=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
    const tiles=all.filter(e=>e.matches(sel)).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top+r.height*0.5<innerHeight&&r.bottom>0;});
    if(tiles.length<2)return null;const voll=tiles.filter(e=>{const img=e.querySelector('img');if(img)return img.complete&&img.naturalWidth>0;return !!e.querySelector('svg')&&!/wird geladen/.test(e.getAttribute('aria-label')||'')&&!/wird geladen/.test(e.innerText||'');});
    return {sichtbar:tiles.length,voll:voll.length};},KACHEL).catch(()=>null);
    if(ok&&ok.voll===ok.sichtbar)return {ms:Date.now()-abT,...ok};}await sleep(50);}return null;}
async function wechsel(page,index){ // index = n-te sichtbare Kachel
  await oeffneDesigns(page);await sleep(600);const ed=editor(page);const {tiles,vis,n}=await sichtbareKacheln(ed);if(vis.length<=index)return {fehler:`nur ${vis.length} sichtbare Kacheln`};
  const ziel=tiles.nth(vis[index]);const name=await ziel.getAttribute('aria-label');const m0=(await meldungen(page)).length;const r0=reqs.length;
  const t=Date.now();await ziel.click();let lokal=null,server=false;
  while(Date.now()-t<90000){
    if(!server&&reqs.slice(r0).some(r=>/design-switch/.test(r.u)))server=true;
    if(!server){const ed2=editor(page);const pressed=ed2?await ed2.locator(`button[aria-label="${name.replace(/"/g,'\\"')}"]`).first().getAttribute('aria-pressed').catch(()=>null):null;
      const pressed2=pressed==='true'||(ed2?await ed2.locator(KACHEL+'[aria-pressed="true"]').count().catch(()=>0):0)>0&&await ziel.getAttribute('aria-pressed').catch(()=>null)==='true';
      if((pressed==='true'||pressed2)&&lokal===null)lokal=Date.now()-t;
      if(lokal!==null&&Date.now()-t>lokal+700&&!reqs.slice(r0).some(r=>/design-switch/.test(r.u)))return {name,art:'lokal',ms:lokal,anfragen:reqs.slice(r0).filter(r=>/APP\/api/.test(r.u)).length,kacheln:n};}
    else{const m=await meldungen(page);const hit=m.slice(m0).find(x=>x.type==='gravuru-shop-editor-ready');if(hit){const sw=reqs.slice(r0).find(r=>/design-switch/.test(r.u)),mo=reqs.slice(r0).find(r=>/shop-entry\/model/.test(r.u));
        return {name,art:'server',ms:Math.round(hit.t-t),designSwitchMs:sw?.dauer??null,modelMs:mo?.dauer??null,modelBytes:mo?.res??null,anfragen:reqs.slice(r0).filter(r=>/^APP/.test(r.u)).length,kacheln:n};}}
    await sleep(30);}
  return {name,fehler:'Zeitüberschreitung',server};}
async function textMessen(page){const ed=editor(page);const tabs=ed.locator('button[data-ux-tab="text"], button:has-text("Text")');const c=await tabs.count();let auf=false;
  for(let i=0;i<c;i++)if(await tabs.nth(i).isVisible().catch(()=>false)){await tabs.nth(i).click();auf=true;break;}
  await sleep(900);const tas=ed.locator('textarea');const n=await tas.count();let ta=null;for(let i=0;i<n;i++)if(await tas.nth(i).isVisible().catch(()=>false)){ta=tas.nth(i);break;}
  if(!ta){ // Prio-Darstellung: Text erst nach Auswahl einer Zeile editierbar
    const zeile=ed.locator('button:has-text("bearbeiten"), button[aria-label*="Text"]').first();if(await zeile.isVisible().catch(()=>false)){await zeile.click().catch(()=>{});await sleep(700);}
    for(let i=0;i<await tas.count();i++)if(await tas.nth(i).isVisible().catch(()=>false)){ta=tas.nth(i);break;}}
  if(!ta)return {fehler:'kein sichtbares Textfeld',reiterOffen:auf};
  const vorher=await ta.inputValue();await ta.fill('Testmessung');await sleep(500);const zeiten=[];
  for(const ch of 'abcde'){const t=Date.now();await ta.press(ch);await ed.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));zeiten.push(Date.now()-t);}
  zeiten.sort((a,b)=>a-b);return {vorher,medianMs:zeiten[2],maxMs:zeiten[4]};}
async function warenkorb(page){const ed=editor(page);const r0=reqs.length;
  const kandidaten=ed.locator('button.completion-finish');let erster=null;
  for(let i=0;i<await kandidaten.count();i++){const b=kandidaten.nth(i);if(await b.isVisible().catch(()=>false)&&!(await b.isDisabled().catch(()=>false))){erster=b;break;}}
  if(!erster)return {fehler:'kein Warenkorb-Knopf sichtbar'};
  const tErster=Date.now();const tx1=(await erster.innerText().catch(()=>''))||'';await erster.click();let tLetzter=tErster,klicks=[tx1.trim().replace(/\s+/g,' ')];
  const ende=Date.now()+150000;let hinweis=null;
  while(Date.now()<ende){
    if(new URL(page.url()).pathname.replace(/\/$/,'')==='/cart')break;
    const ed2=editor(page);
    if(ed2&&!reqs.slice(r0).some(r=>/acrylic-drafts|theme-cart/.test(r.u))){
      const jetzt=ed2.locator('button.completion-cart');
      for(let i=0;i<await jetzt.count().catch(()=>0);i++){const b=jetzt.nth(i);if(await b.isVisible().catch(()=>false)&&!(await b.isDisabled().catch(()=>false))){const tx=(await b.innerText().catch(()=>'')).trim().replace(/\s+/g,' ');tLetzter=Date.now();await b.click().catch(()=>{});klicks.push(tx);await sleep(400);break;}}
      if(Date.now()-tErster>8000&&klicks.length===1&&!hinweis){hinweis=await ed2.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
        return all.filter(e=>e.matches('button,[role=alert],[role=status],.error,[aria-live]')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0;}).map(e=>(e.innerText||'').trim().replace(/\s+/g,' ').slice(0,60)).filter(Boolean).slice(0,40);}).catch(()=>null);}
    }
    await sleep(60);}
  const imKorb=new URL(page.url()).pathname.replace(/\/$/,'')==='/cart';
  const R=reqs.slice(r0);const f=re=>R.find(r=>re.test(r.u));const add=f(/SHOP\/cart\/add\.js/),drafts=f(/acrylic-drafts/),theme=f(/shop-entry\/theme-cart/),data=f(/konfigurator\/cart\/data/),claim=f(/konfigurator\/cart\/claim/);
  let seiteGeladen=null,cartJson=null;
  if(imKorb){await page.waitForLoadState('load',{timeout:60000}).catch(()=>{});seiteGeladen=Date.now();cartJson=await page.evaluate(async()=>{const r=await fetch('/cart.js',{cache:'no-store'});const j=await r.json();return {anzahl:j.item_count,preis:j.items?.[0]?.final_line_price,menge:j.items?.[0]?.quantity,eigenschaften:Object.keys(j.items?.[0]?.properties||{}).sort()};}).catch(e=>({fehler:String(e).slice(0,80)}));}
  const rel=r=>r?{beginn:Math.round(r.beginn-tErster),dauerMs:r.dauer,ttfb:r.ttfb,reqB:r.req,resB:r.res,st:r.st}:null;
  return {klicks,imKorb,hinweis,abErstemKlickBisAddMs:add?Math.round(add.ende-tErster):null,abLetztemKlickBisAddMs:add?Math.round(add.ende-tLetzter):null,abLetztemKlickBisSeiteMs:seiteGeladen?seiteGeladen-tLetzter:null,
    schritte:{entwurf:rel(drafts),themeCart:rel(theme),cartData:rel(data),claim:rel(claim),add:rel(add)},eigeneServerMs:[drafts,theme,data,claim].reduce((a,r)=>a+(r?.dauer||0),0),cartJson};}
async function oeffnen(page,messen=true){
  const tNav=Date.now();await page.goto(`${SHOP}/products/${handle}`,{waitUntil:'load',timeout:120000});const tLoad=Date.now();
  const start=page.locator('[data-gravuru-personalisieren] a[data-gravuru-start]').first();await start.waitFor({state:'visible',timeout:60000});const tKnopf=Date.now();
  await sleep(MOBIL?2500:1500); // Startkarte und Vorwärmung dürfen wie beim echten Besucher anlaufen
  const lcp=await page.evaluate(()=>Math.round(window.__lcp||0));
  const m0=(await meldungen(page)).length;const r0=reqs.length;const tKlick=Date.now();await start.click();
  const tShell=await warteMeldung(page,'gravuru-shop-ready',m0),tEd=await warteMeldung(page,'gravuru-shop-editor-ready',m0);
  if(!tEd){res.fehler.push('Editor meldet nicht bereit');return null;}
  const R=reqs.slice(r0).filter(r=>r.beginn<tEd);const modell=R.find(r=>/shop-entry\/model/.test(r.u));
  const o={seiteLoadMs:tLoad-tNav,knopfSichtbarMs:tKnopf-tNav,lcpMs:lcp,klickBisRahmenMs:tShell?Math.round(tShell-tKlick):null,klickBisEditorMs:Math.round(tEd-tKlick),
    anfragenBisEditor:R.length,appAnfragen:R.filter(r=>/^APP/.test(r.u)).length,appBytes:R.filter(r=>/^APP/.test(r.u)).reduce((a,r)=>a+r.res,0),modelBytes:modell?.res??null,modelMs:modell?.dauer??null,modelTtfb:modell?.ttfb??null,tEd};
  return o;}
try{
  let page=await neueSeite();horche(page);
  if(cache==='warm'){const v=await oeffnen(page,false);res.vorlauf=v?{klickBisEditorMs:v.klickBisEditorMs}:null;await sleep(4000);await page.close();page=await neueSeite();horche(page);}
  const o=await oeffnen(page);res.oeffnen=o;
  if(o){
    const d=await oeffneDesigns(page);const k=await kachelnGefuellt(page,d.geklickt?d.t:o.tEd);res.kacheln=k?{...k,ab:d.geklickt?'Klick Designs':'Editor bereit'}:{fehler:'nicht gefüllt'};
    if(SHOTS)await page.screenshot({path:`${OUT}/${SHOTS}-designs.png`});
    res.wechsel1=await wechsel(page,1);await sleep(1200);
    res.wechsel2=await wechsel(page,2);await sleep(1200);
    if(SHOTS)await page.screenshot({path:`${OUT}/${SHOTS}-nach-wechsel.png`});
    res.text=await textMessen(page).catch(e=>({fehler:String(e.message).slice(0,120)}));await sleep(800);
    if(SHOTS)await page.screenshot({path:`${OUT}/${SHOTS}-text.png`});
    if(CART){res.warenkorb=await warenkorb(page).catch(e=>({fehler:String(e.message).slice(0,160)}));if(SHOTS)await page.screenshot({path:`${OUT}/${SHOTS}-warenkorb.png`});}
    delete o.tEd;}
}catch(e){res.fehler.push(String(e.message||e).slice(0,300));}
res.ende=new Date().toISOString();
fs.appendFileSync(`${OUT}/messung.jsonl`,JSON.stringify(res)+'\n');
console.log(JSON.stringify(res));
await browser.close();
