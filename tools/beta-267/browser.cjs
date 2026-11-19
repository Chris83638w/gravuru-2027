// Start preview.mjs on both revisions with the same catalog. Only loopback is used.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const out = path.resolve(process.argv[2] || 'beta-results');
const cases = [
  {name:'nativ',port:18268,native:true},
  {name:'r15-vorher',port:18268,native:false},
  {name:'beta',port:18267,native:false}
];
const devices = [
  {name:'PC',viewport:{width:1365,height:900}},
  {name:'Mobil',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
];

// Runs in the outer preview page, using actual editor controls and the same
// monotonic clock for the click, confirmed object state and a rendering opportunity.
async function customerSteps({native}) {
  const ms = () => performance.now();
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  async function until(probe,label) {
    const start = ms();
    while (ms()-start < 20000) {
      const found = probe();
      if (found) return found;
      await nextFrame();
    }
    throw Error('Zeitlimit: '+label);
  }
  const host = () => document.querySelector('iframe')?.contentDocument?.querySelector('gravuru-configurator');
  const tab = (root,key) => [...root.querySelectorAll(native?'#ux-tab-'+key:'[data-demo-section="'+key+'"]')].find(node => node.getClientRects().length && !node.disabled);
  const editor = await until(() => {
    const el = host();
    if (el?.uxLayoutReady && (native || el.dataset.mobileDemo==='sheet') && tab(el.shadowRoot,'design')) return el;
  },'bedienbarer Editor');
  const time = {entry:ms()};
  const root = editor.shadowRoot;
  const startGallery = ms();
  tab(root,'design').click();
  const readCards = () => [...root.querySelectorAll('#ux-design-search-results [data-c-design]')];
  await until(() => readCards().length===16,'16 Originaldesigns');
  const real = card => card.querySelector('svg[role=img]') && !/Design wird geladen|Vorschau wird geladen/i.test(card.querySelector('svg').textContent) && card.querySelector('svg')?.getAttribute('viewBox')==='-8 -8 176 296';
  await until(() => readCards().slice(0,2).every(real),'erste zwei Originalminiaturen');
  await nextFrame();
  time.firstTwo = ms()-startGallery;
  const realAtFirst = readCards().filter(real).length;
  async function select(id) {
    const currentButton = () => root.querySelector('[data-c-design="'+id+'"]');
    const button = currentButton();
    if(!button || !button.getClientRects().length || button.disabled) throw Error('Design nicht bedienbar: '+id);
    const start = ms();
    button.click();
    await until(() => editor.state.designId===id && currentButton()?.getAttribute('aria-pressed')==='true','aktive Auswahl '+id);
    await nextFrame(); await nextFrame();
    return ms()-start;
  }
  time.first = await select('FK-SEITLICH');
  time.second = await select('FK-RUNDUM');
  tab(root,'text').click();
  const field = await until(() => [...root.querySelectorAll('textarea[data-ux-text]')].find(node=>node.getClientRects().length),'Textfeld');
  const editStart = ms();
  field.focus(); field.value='Muster 267';
  field.dispatchEvent(new Event('input',{bubbles:true,composed:true}));
  field.dispatchEvent(new Event('change',{bubbles:true,composed:true}));
  await until(() => editor.state.objects.some(obj=>obj.id===field.dataset.uxText && obj.text==='Muster 267'),'Textübernahme');
  await nextFrame(); await nextFrame();
  time.text = ms()-editStart;
  return {time,realAtFirst,cards:readCards().length};
}

async function main() {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,...(process.env.CHROME267?{executablePath:process.env.CHROME267}:{})});
  const rows = [];
  try {
    const browserVersion = browser.version();
    const write = () => fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({browserVersion,rows},null,2));
    for (let run=0;run<3;run++) for (const device of devices) {
      const versions = [...cases.slice(run),...cases.slice(0,run)];
      for (const variant of versions) {
        const {name:deviceName,...settings} = device;
        const context = await browser.newContext({...settings,deviceScaleFactor:1,locale:'de-DE'});
        try {
          const page = await context.newPage();
          const cdp = await context.newCDPSession(page);
          await cdp.send('Network.enable');
          await cdp.send('Network.clearBrowserCache');
          await cdp.send('Emulation.setCPUThrottlingRate',{rate:device.isMobile?4:1});
          const url = 'http://127.0.0.1:'+variant.port+'/?produkt=ring'+(variant.native?'&ansicht=nativ':'');
          for (const cache of ['kalt','warm']) {
            await page.goto(url,{waitUntil:'domcontentloaded'});
            const result = await page.evaluate(customerSteps,{native:variant.native});
            rows.push({run:run+1,device:deviceName,version:variant.name,cache,...result});
            write();
            if(run===0 && variant.name==='beta' && cache==='warm') {
              await page.screenshot({path:path.join(out,deviceName+'-Text.png')});
              const frame=page.frames().find(f=>f!==page.mainFrame());
              await frame.locator('[data-demo-section=design]:visible').first().click();
              await page.screenshot({path:path.join(out,deviceName+'-Designs.png')});
            }
          }
        } finally {await context.close();}
      }
    }
    console.log(rows.length+' bestätigte Läufe mit 16 Originaldesigns.');
  } finally {await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
