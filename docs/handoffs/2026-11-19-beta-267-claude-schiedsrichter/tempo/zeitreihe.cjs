// Claude · gleiche Zeitreihe an mehreren lokalen Prüfständen (Vorher/Nachher), Ring-Schild.
// Aufruf: node zeitreihe.cjs <Port> <Ausgabe.json> [--drossel] [--mobil] [--runs=3]
// Messpunkte (technische Wartezeit, ohne Tippzeit):
//  editor   Seitenaufruf bis Editor bedienbar (Text-Reiter sichtbar)
//  karten   Klick auf „Designs“ bis alle im Sichtfeld liegenden Designkarten gezeichnet sind
//  wechsel  Klick auf eine andere Designkarte bis sie als gewählt gilt und zwei Bilder gezeichnet wurden (hin und zurück)
//  korb1/2  letzter Klick bis alle persönlichen Warenkorbbilder geladen, dekodiert und gezeichnet sind (1 bzw. 2 Positionen)
const {chromium}=require('playwright');const fs=require('node:fs');
const args=process.argv.slice(2),port=args[0],out=args[1],drossel=args.includes('--drossel'),mobil=args.includes('--mobil')||drossel;
const runs=Number((args.find(a=>a.startsWith('--runs='))||'--runs=3').split('=')[1]);const sparen=args.includes('--sparen');
const origin='http://127.0.0.1:'+port;const now=()=>performance.now();
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});const result={origin,drossel,mobil,sparen,browser:browser.version(),runs:[]};
  for(let run=1;run<=runs;run++){
    const viewport=mobil?{width:390,height:844}:{width:1365,height:900};
    const context=await browser.newContext({viewport,isMobile:mobil,hasTouch:mobil,deviceScaleFactor:1,locale:'de-DE'});
    const page=await context.newPage();page.setDefaultTimeout(120000);
    await page.addInitScript(()=>{const o=URL.createObjectURL.bind(URL);window.__bilder=[];URL.createObjectURL=b=>{if(b&&b.type==='image/png')window.__bilder.push(b.size);return o(b);};});
    if(sparen){const c2=await context.newCDPSession(page);await c2.send('Emulation.setDataSaverOverride',{dataSaverEnabled:true});}
    if(drossel){const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:0.75*1024*1024/8});}
    const row={run,posts:[],images:[]};result.runs.push(row);
    page.on('request',req=>{if(req.method()==='POST'){const b=req.postData()||'';let o={};try{const j=JSON.parse(b);const w=j.input||j;o={customerPreview:(w.customerPreview||'').length||undefined,preview:(w.preview||'').length||undefined};}catch{}
      row.posts.push({path:new URL(req.url()).pathname.replace(/[a-f0-9-]{20,}/gi,'ID'),bytes:b.length,...o});}});
    page.on('response',async res=>{const ct=res.headers()['content-type']||'';if(/^image\/png/.test(ct)&&/vorschau|gestaltung/.test(res.url())){let len=0;try{len=(await res.body()).length;}catch{}row.images.push({path:new URL(res.url()).pathname,bytes:len});}});
    const fl=page.frameLocator('iframe');const tab=id=>fl.locator('[data-demo-section="'+id+'"]:visible').first();
    const frame=()=>page.frames().find(f=>f!==page.mainFrame());
    const field=async(id,value)=>{const t=fl.locator('textarea[data-ux-text="'+id+'"]');if(!await t.isVisible())await fl.locator('[data-ux=select-content][data-id="'+id+'"]:visible').first().click();await t.fill(value);await t.press('Tab');};
    try{
      for(const [n,person] of [[1,{name:'Nord',number:'12',design:'FK-SEITLICH',other:'FK-RUNDUM'}],[2,{name:'Süd',number:'27',design:'FK-RUNDUM',other:'FK-SEITLICH'}]]){
        let t=now();const tNav=t;await page.goto(origin+'/?produkt=ring',{waitUntil:'domcontentloaded'});await tab('text').waitFor();row['editor'+n]=now()-t;
        t=now();await tab('design').click();
        const karten=scroll=>frame().evaluate(async scroll=>{const start=performance.now();const root=document.querySelector('gravuru-configurator').shadowRoot;
          const all=()=>[...root.querySelectorAll('[data-c-design]')];
          if(scroll){const last=all().at(-1);last.scrollIntoView({block:'end'});}
          const inView=e=>{const r=e.getBoundingClientRect();const h=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));return r.width>0&&r.height>0&&h>=r.height/2;};
          const ready=c=>{const s=c.querySelector('svg'),label=(c.getAttribute('aria-label')||'').replace(/^Design /,'');return !!s&&s.getAttribute('aria-label')===label&&!!s.querySelector('path');};
          for(;;){const cards=all().filter(inView);if(cards.length&&cards.every(ready)){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {ms:performance.now()-start,sichtbar:cards.length,fertig:cards.length,gesamt:all().length};}
            if(performance.now()-start>8000)return {ms:null,sichtbar:cards.length,fertig:cards.filter(ready).length,gesamt:all().length};await new Promise(r=>setTimeout(r,16));}},scroll);
        row['karten'+n]=await karten(false);row['kartenAbEinstieg'+n]=now()-tNav;
        row['kartenScroll'+n]=await karten(true);
        await frame().evaluate(()=>{const root=document.querySelector('gravuru-configurator').shadowRoot;root.querySelector('[data-c-design]').scrollIntoView({block:'start'});});
        const pressed=async id=>(await fl.locator('[data-c-design="'+id+'"]:visible').first().getAttribute('aria-pressed'))==='true';
        const sw=async id=>{const card=fl.locator('[data-c-design="'+id+'"]:visible').first();const s=now();await card.click();
          await fl.locator('[data-c-design="'+id+'"][aria-pressed=true]').first().waitFor({state:'attached'});await frame().evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return now()-s;};
        const erst=await pressed(person.design)?person.other:person.design,zweit=erst===person.design?person.other:person.design;
        row['wechsel'+n]=[await sw(erst),await sw(zweit)];
        if(!await pressed(person.design))await sw(person.design);
        await tab('text').click();await field('name','Haus');await field('quote',person.name);await field('number',person.number);
        await fl.locator('.completion-finish:visible').first().click();const confirm=fl.locator('[data-shop-cart]:visible').first();await confirm.waitFor();
        t=now();await confirm.click();await page.waitForURL(u=>u.pathname==='/beta/cart',{waitUntil:'domcontentloaded'});
        await page.locator('#items article .image-box img').nth(n-1).waitFor();
        await page.locator('#items article img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())).then(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))));
        row['korb'+n]=now()-t;
        row['bildBytes'+n]=await page.evaluate(()=>window.__bilder||[]);
        row['bild'+n]=await page.locator('#items article .image-box img').evaluateAll(async imgs=>{const sha=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');const o=[];
          for(const img of imgs){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);o.push({w:c.width,h:c.height,pixel:(await sha(x.getImageData(0,0,c.width,c.height).data)).slice(0,16)});}return o;});
      }
      if(run===1)await page.screenshot({path:out.replace(/\.json$/,'-korb.png')});
      row.ok=true;
    }catch(e){row.fehler=String(e.message).split('\n')[0].slice(0,240);}
    await context.close();console.log(JSON.stringify({run,ok:row.ok||false,fehler:row.fehler,editor:[row.editor1,row.editor2].map(x=>x&&Math.round(x)),karten:[row.karten1,row.karten2].map(k=>k&&{ms:k.ms&&Math.round(k.ms),fertig:k.fertig+'/'+k.sichtbar}),scroll:[row.kartenScroll1,row.kartenScroll2].map(k=>k&&{ms:k.ms&&Math.round(k.ms),fertig:k.fertig+'/'+k.sichtbar}),abEinstieg:[row.kartenAbEinstieg1,row.kartenAbEinstieg2].map(x=>x&&Math.round(x)),wechsel:[row.wechsel1,row.wechsel2].map(w=>w&&w.map(Math.round)),korb:[row.korb1,row.korb2].map(x=>x&&Math.round(x)),bild:row.bild2||row.bild1}));
  }
  fs.writeFileSync(out,JSON.stringify(result,null,1));await browser.close();
})();
