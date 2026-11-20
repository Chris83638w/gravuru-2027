// #267 · Claude · Ansicht der drei Einstiege (nur lesend: kein Speichern, kein Warenkorb, keine Bestellung).
// Aufruf: node ansicht.mjs <demo|ring|edelstahl> <pc|mobil> [--prio]
import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const [,,ziel,profil='pc',...flags]=process.argv;const PRIO=flags.includes('--prio');const OUT=process.env.OUT||'out';
const SHOP='https://gravuru-design.myshopify.com',APP='https://app-2027.gravuru-designwerkstatt.de';
const URLS={demo:APP+'/konfi-demo/mobil-20261107-r15/22x14.html?fresh=1',ring:SHOP+'/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert',edelstahl:SHOP+'/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen'};
const MOBIL=profil==='mobil';const name=`${ziel}${PRIO?'-prio-erzwungen':''}-${profil}`;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY},args:['--disable-features=IsolateOrigins,site-per-process','--disable-site-isolation-trials']});
const ctx=await browser.newContext(MOBIL?{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,locale:'de-DE',userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36'}:{viewport:{width:1366,height:900},locale:'de-DE'});
const page=await ctx.newPage();const res={ziel,profil,prioErzwungen:PRIO,zeit:new Date().toISOString(),url:URLS[ziel],anfragen:[]};
await page.addInitScript(()=>{if(window.top!==window)return;window.__gv=[];window.addEventListener('message',e=>{const t=e.data?.type;if(typeof t==='string'&&t.startsWith('gravuru'))window.__gv.push(t);},true);});
page.on('request',r=>{const u=r.url();if(/apps\/konfigurator\/start|konfigurator\/shop\/|_merchant-acryl-editor|editor-[0-9a-f]+\.mjs|konfi-demo\/|shop-embed|shop-entry\/model|\/cart\/|acrylic-drafts|theme-cart/.test(u)&&!/\.(png|jpg|webp|svg|woff2?)(\?|$)/.test(u))res.anfragen.push(r.method()+' '+u.replace(SHOP,'SHOP').replace(APP,'APP').replace(/([?&#](?:s|ticket|token|sig|signature|key)=)[^&#]+/g,'$1…').slice(0,170));});
if(PRIO)await page.route('**/apps/konfigurator/start?*',r=>{const u=r.request().url();r.continue({url:u.includes('ui=prio-r15')?u:u+'&ui=prio-r15'});});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fingerabdruck=fr=>fr.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
  const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none';};
  const kn=all.filter(e=>e.matches('button,[role=tab],[role=button],a[href]')).filter(sicht).map(e=>((e.getAttribute('aria-label')||e.innerText||e.title||'').trim().replace(/\s+/g,' ').slice(0,34))).filter(Boolean);
  const host=all.find(e=>e.tagName==='GRAVURU-CONFIGURATOR');
  return {knoepfe:[...new Set(kn)].slice(0,60),hostAttribute:host?Object.fromEntries([...host.attributes].map(a=>[a.name,a.value.slice(0,60)])):null,
    uxTabs:[...new Set(all.filter(e=>e.hasAttribute&&e.hasAttribute('data-ux-tab')).map(e=>e.getAttribute('data-ux-tab')))],
    prioMerkmale:{htmlKlassen:document.documentElement.className.slice(0,120),bodyKlassen:document.body.className.slice(0,160),datenUi:document.documentElement.dataset.ui||document.body.dataset.ui||host?.dataset.ui||host?.getAttribute('ui')||host?.getAttribute('presentation')||null},
    warenkorbKnopf:all.filter(e=>e.matches('button')).filter(e=>/warenkorb|fertig|bestellen/i.test((e.innerText||'')+(e.getAttribute('aria-label')||''))).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,40),gesperrt:e.disabled||e.getAttribute('aria-disabled')==='true',sichtbar:sicht(e)})).slice(0,6)};}).catch(e=>({fehler:String(e.message).slice(0,160)}));
try{
  await page.goto(URLS[ziel],{waitUntil:'domcontentloaded',timeout:90000});
  if(ziel==='demo'){
    await page.waitForFunction(()=>{const h=document.querySelector('gravuru-configurator');return !!h&&!!h.shadowRoot&&h.shadowRoot.querySelectorAll('button').length>3;},null,{timeout:90000}).catch(()=>{});await sleep(2500);
    res.titel=await page.title();res.skripte=await page.evaluate(()=>[...document.querySelectorAll('script[src],link[rel=modulepreload]')].map(s=>(s.src||s.href).replace(location.origin,'')).slice(0,20));
    await page.screenshot({path:`${OUT}/${name}-editor.png`});res.ui=await fingerabdruck(page.mainFrame());
  }else{
    await page.waitForSelector('[data-gravuru-personalisieren] a[data-gravuru-start]',{timeout:60000});
    res.praesentation=await page.evaluate(()=>{const e=document.querySelector('#gravuru-konfi-presentation');return e?e.textContent.trim().slice(0,400):null;});
    res.startHref=await page.evaluate(()=>{const a=document.querySelector('[data-gravuru-personalisieren] a[data-gravuru-start]');return a?a.getAttribute('href').replace(/([?&](?:ticket|token|sig|s)=)[^&#]+/g,'$1…').slice(0,260):null;});
    res.produkt=await page.evaluate(()=>document.querySelector('h1')?.innerText.trim().slice(0,90));
    await sleep(1200);await page.click('[data-gravuru-personalisieren] a[data-gravuru-start]');
    const t0=Date.now();let bereit=false;while(Date.now()-t0<90000){const m=await page.evaluate(()=>window.__gv||[]).catch(()=>[]);if(m.includes('gravuru-shop-editor-ready')){bereit=true;break;}await sleep(100);}
    res.editorBereit=bereit;res.oeffnenMs=Date.now()-t0;await sleep(2500);
    const ed=page.frames().filter(f=>{try{return new URL(f.url()).pathname==='/_merchant-acryl-editor.html'&&!f.isDetached();}catch{return false;}}).at(-1);
    res.rahmen=page.frames().map(f=>{try{const u=new URL(f.url());return u.origin.replace(APP,'APP').replace(SHOP,'SHOP')+u.pathname+(u.search?'?'+[...u.searchParams.keys()].join('&'):'')+(u.hash?'#'+u.hash.slice(1,4)+'…':'');}catch{return f.url().slice(0,40);}});
    await page.screenshot({path:`${OUT}/${name}-editor.png`});if(ed)res.ui=await fingerabdruck(ed);
    if(flags.includes('--tiefe')&&ed){
      const klick=async(texte)=>ed.evaluate(texte=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
        const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none';};
        for(const t of texte){const b=all.filter(e=>e.matches('button,[role=tab]')).filter(sicht).find(e=>((e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' '))===t);if(b){b.click();return t;}}return null;},texte);
      const karten=()=>ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
        const k=all.filter(e=>e.matches('[data-c-design],button[aria-label^="Design "]'));const u=[...new Set(k)];
        const sicht=e=>{const r=e.getBoundingClientRect();return r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;};
        const fertig=c=>{const sv=c.querySelector('svg');return !!sv&&!!sv.querySelector('path')&&!/wird geladen/.test((c.innerText||'')+(sv.getAttribute('aria-label')||''));};
        return {gesamt:u.length,sichtbar:u.filter(sicht).length,sichtbarFertig:u.filter(sicht).filter(fertig).length,namen:u.slice(0,16).map(c=>(c.getAttribute('aria-label')||'').replace(/^Design /,'')),gewaehlt:u.filter(c=>c.getAttribute('aria-pressed')==='true').map(c=>c.getAttribute('aria-label'))};});
      res.tiefe={};
      res.tiefe.designsGeklickt=await klick(['Designs']);await sleep(3500);await page.screenshot({path:`${OUT}/${name}-designs.png`});res.tiefe.karten=await karten();
      res.tiefe.ausfuehrungGeklickt=await klick(['Fertig','Schließen'])||null;await sleep(400);
      res.tiefe.ausfuehrung=await klick(['Ausführung & Größe','Ausführung','Ausführungen']);await sleep(2500);await page.screenshot({path:`${OUT}/${name}-ausfuehrung.png`});
      if(flags.includes('--reiter')){res.tiefe.reiter={};
        const lesen=()=>ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
          const sicht=e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>4&&r.height>4&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none';};
          return {wahl:all.filter(e=>e.tagName==='SELECT').filter(sicht).map(s=>({feld:s.getAttribute('data-m-option')||s.getAttribute('data-m-field')||'',wert:s.options[s.selectedIndex]?.textContent.trim(),anzahl:s.options.length})),
            knoepfe:[...new Set(all.filter(e=>e.matches('button,[role=radio],label')).filter(sicht).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,44)).filter(Boolean))].slice(0,40),
            ueberschriften:all.filter(e=>e.matches('h2,h3,h4,legend,label')).filter(sicht).map(e=>e.innerText.trim().slice(0,40)).filter(Boolean).slice(0,14)};});
        for(const r of ['Material','Form','Größe','Befestigung']){const k=await klick([r]);if(!k)continue;await sleep(1300);await page.screenshot({path:`${OUT}/${name}-reiter-${r}.png`});res.tiefe.reiter[r]=await lesen();}
        await klick(['Fertig']);await sleep(500);const t=await klick(['Text']);await sleep(1800);await page.screenshot({path:`${OUT}/${name}-text.png`});res.tiefe.text=t?await lesen():null;
        await klick(['Fertig']);await sleep(500);const mo=await klick(['Motive']);await sleep(2200);await page.screenshot({path:`${OUT}/${name}-motive.png`});res.tiefe.motive=mo?await lesen():null;}
      res.tiefe.optionen=await ed.evaluate(()=>{const all=[];const walk=r=>{for(const e of r.querySelectorAll('*')){all.push(e);if(e.shadowRoot)walk(e.shadowRoot);}};walk(document);
        return all.filter(e=>e.tagName==='SELECT').map(s=>({feld:s.getAttribute('data-m-option')||s.getAttribute('data-m-field')||s.name||s.id||'',wert:s.value,auswahl:[...s.options].map(o=>o.textContent.trim().slice(0,40))})).filter(o=>o.auswahl.length).slice(0,10);});
    }
  }
}catch(e){res.fehler=String(e.message).split('\n')[0].slice(0,220);await page.screenshot({path:`${OUT}/${name}-fehler.png`}).catch(()=>{});}
fs.writeFileSync(`${OUT}/${name}.json`,JSON.stringify(res,null,1));
console.log(JSON.stringify({name,tiefe:res.tiefe,fehler:res.fehler,praesentation:res.praesentation,startHref:res.startHref,editorBereit:res.editorBereit,oeffnenMs:res.oeffnenMs,rahmen:res.rahmen,uxTabs:res.ui?.uxTabs,knoepfe:res.ui?.knoepfe?.slice(0,26),warenkorb:res.ui?.warenkorbKnopf,host:res.ui?.hostAttribute,merkmale:res.ui?.prioMerkmale,start:res.anfragen.filter(a=>/start\?/.test(a)).slice(0,2),bundles:[...new Set(res.anfragen.filter(a=>/editor-[0-9a-f]+\.mjs|konfi-demo\/.*\.(m?js)/.test(a)).map(a=>a.split(' ')[1].split('?')[0]))].slice(0,8)},null,1));
await browser.close();
