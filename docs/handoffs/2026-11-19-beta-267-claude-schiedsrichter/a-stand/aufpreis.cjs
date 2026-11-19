// Claude · eigene Probe am lokalen Prüfstand von Kandidat A: Befestigung mit Aufpreis bis in den Testwarenkorb.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
const origin='http://127.0.0.1:'+(process.argv[2]||18267),out=process.argv[3]||'aufpreis';
(async()=>{
  const browser=await chromium.launch({channel:'chrome'});const context=await browser.newContext({viewport:{width:1365,height:900},locale:'de-DE'});const page=await context.newPage();
  const result={mountings:[]};
  try{
    await page.goto(origin+'/?produkt=ring',{waitUntil:'domcontentloaded'});
    const fl=page.frameLocator('iframe');await fl.locator('[data-demo-section="text"]:visible').first().waitFor({timeout:60000});
    await fl.locator('[data-demo-section=options]:visible').first().click();
    const frame=page.frames().find(f=>f!==page.mainFrame());
    const read=()=>frame.evaluate(()=>{const el=document.querySelector('gravuru-configurator'),root=el.shadowRoot;const c=root.querySelector('select[data-m-option="mounting"],select[data-m-field="mounting"]');
      const price=[...root.querySelectorAll('*')].filter(n=>n.children.length===0&&/^\s*\d{1,4},\d{2}\s*€\s*$/.test(n.textContent)).map(n=>n.textContent.trim());
      return {value:c.value,choices:[...c.options].map(o=>({value:o.value,label:o.textContent.trim()})).filter(o=>o.value),price:[...new Set(price)]};});
    const first=await read();result.initial=first;
    for(const ch of first.choices){
      await frame.evaluate(v=>{const root=document.querySelector('gravuru-configurator').shadowRoot;const c=root.querySelector('select[data-m-option="mounting"],select[data-m-field="mounting"]');c.value=v;c.dispatchEvent(new Event('change',{bubbles:true}));},ch.value);
      await page.waitForTimeout(700);const r=await read();result.mountings.push({value:ch.value,label:ch.label,price:r.price});
    }
    // teuerste Befestigung wählen und in den Warenkorb legen
    const cents=p=>Math.max(0,...p.map(x=>Math.round(Number(x.replace(/[^\d,]/g,'').replace(',','.'))*100)));
    const pick=[...result.mountings].sort((a,b)=>cents(b.price)-cents(a.price))[0];result.pick=pick;
    await frame.evaluate(v=>{const root=document.querySelector('gravuru-configurator').shadowRoot;const c=root.querySelector('select[data-m-option="mounting"],select[data-m-field="mounting"]');c.value=v;c.dispatchEvent(new Event('change',{bubbles:true}));},pick.value);
    await page.waitForTimeout(800);await page.screenshot({path:path.join(out,'Editor-mit-Aufpreis.png')});
    await fl.locator('.completion-finish:visible').first().click();const confirm=fl.locator('[data-shop-cart]:visible').first();await confirm.waitFor();await confirm.click();
    await page.waitForURL(u=>u.pathname==='/beta/cart',{timeout:60000});await page.locator('#items article .image-box img').first().waitFor({timeout:60000});
    await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,'Warenkorb-mit-Aufpreis.png')});
    result.cart=await page.evaluate(async()=>(await fetch('/beta-warenkorb',{headers:{'X-Beta-Cart':sessionStorage.getItem('gravuru-beta-cart')}})).json());
    result.cartText=(await page.locator('#items').innerText()).slice(0,400);result.sum=await page.locator('#sum').innerText();
  }catch(e){result.error=String(e.message).split('\n')[0].slice(0,300);await page.screenshot({path:path.join(out,'Fehlerstelle.png')}).catch(()=>{});}
  fs.writeFileSync(path.join(out,'ergebnis.json'),JSON.stringify(result,null,1));
  const c=result.cart;console.log(JSON.stringify({initial:result.initial&&{value:result.initial.value,price:result.initial.price},mountings:result.mountings,pick:result.pick,cart:c&&{totalCents:c.totalCents,items:c.items.map(i=>({variant:i.variant,sku:i.sku,unitCents:i.unitCents??i.priceCents??null,quantity:i.quantity,keys:Object.keys(i)}))},sum:result.sum,text:result.cartText,error:result.error},null,1));
  await browser.close();
})();
