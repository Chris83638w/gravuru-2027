// Playwright is supplied by the test environment. Only these local preview ports are used.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const [beforePort, afterPort, dest] = process.argv.slice(2);
assert.ok([beforePort, afterPort].every(value => /^\d+$/.test(value) && +value > 1023 && +value < 65536));
assert.ok(dest, 'Ausgabeordner angeben');
fs.mkdirSync(dest, {recursive:true});
const profiles = {PC:{width:1440, height:960}, Mobil:{width:390, height:844}};
const lookup = {vorher:beforePort, nachher:afterPort};
const samples = [];
const limit = 3000;
const target = 'FK-VERDECKT';

async function sample(page, tag, profile, cache, run) {
  await page.goto('http://127.0.0.1:' + lookup[tag] + '/?produkt=ring', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => Number.isFinite(window.betaEditorReady));
  const frame = page.frames().find(f => f.url().includes('/editor.html'));
  const designs = frame.getByRole('button', {name:'Designs', exact:true}).first();
  if (!await designs.isVisible()) await frame.getByRole('button', {name:'Werkzeuge öffnen'}).click();
  await designs.click();
  const card = frame.locator('[data-c-design="' + target + '"]');
  await card.scrollIntoViewIfNeeded();
  const actual = await card.evaluate(async (element, deadline) => {
    const start = performance.now();
    const svg = () => element.querySelector('svg');
    const label = element.getAttribute('aria-label').replace(/^Design /, '');
    const ready = () => svg()?.getAttribute('aria-label') === label && !!svg()?.querySelector('path');
    const initiallyReady = ready();
    // The second animation frame lets the new SVG reach a rendering opportunity.
    while (!ready() && performance.now() - start < deadline) await new Promise(requestAnimationFrame);
    if (ready()) {await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);}
    return {initiallyReady, targetPaintMs:ready() ? Math.round(performance.now() - start) : null};
  }, limit);
  const metrics = await page.evaluate(() => ({editorReadyMs:Math.round(window.betaEditorReady)}));
  const bundle = await frame.evaluate(() => performance.getEntriesByType('resource')
    .map(r => new URL(r.name).pathname).find(name => /\/_bundle\/editor-[a-f0-9]+\.mjs/.test(name)));
  assert.ok(bundle,'Produktbundle fehlt');
  const choices = [];
  for (const id of ['FK-VERDECKT','FK-SEITLICH']) {
    const button = frame.locator('[data-c-design="' + id + '"]');
    await button.evaluate(el => el.addEventListener('click', () => {window.betaDesignClick = performance.now();}, {once:true,capture:true}));
    await button.click();
    const duration=await frame.evaluate(async current => {
      const host = document.querySelector('gravuru-configurator');
      const active=() => host.state.designId === current && host.shadowRoot.querySelector('[data-c-design="'+current+'"]').getAttribute('aria-pressed')==='true';
      while (!active() && performance.now()-window.betaDesignClick<8000) await new Promise(requestAnimationFrame);
      if(!active())throw Error('Designwechsel wurde nicht bestätigt.');
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      return Math.round(performance.now()-window.betaDesignClick);
    }, id);
    choices.push(duration);
  }
  if(tag==='nachher' && run===1 && cache==='kalt') await page.screenshot({path:path.join(dest,'Designkarten-'+profile+'.png')});
  samples.push({tag,profile,cache,run,bundle,...metrics,...actual,firstChoiceMs:choices[0],secondChoiceMs:choices[1]});
  fs.writeFileSync(path.join(dest,'Designkarten-Messwerte.json'),JSON.stringify({
    mode:'Chromium mit erzwungenem navigator.connection.saveData=true, lokale Katalogkopie, keine Netzwerk- oder CPU-Drosselung',
    browser:page.context().browser().version(), target, deadlineMs:limit, viewports:profiles, samples
  },null,2)+'\n');
}
(async()=>{
 const browser = await chromium.launch({channel:process.env.BETA_CHROME_CHANNEL||'chrome'});
 try {
  for(let run=1;run<=3;run++) for(const [profile,viewport] of Object.entries(profiles)){
   for(const tag of run%2 ? ['vorher','nachher'] : ['nachher','vorher']){
    const context=await browser.newContext({viewport,isMobile:profile==='Mobil',hasTouch:profile==='Mobil',deviceScaleFactor:1});
    try {
     await context.addInitScript(()=>{
      if(navigator.connection) Object.defineProperty(navigator.connection,'saveData',{get:()=>true});
      if(window===window.top) window.addEventListener('message',event=>{
       if(event.origin===location.origin && event.source===document.querySelector('iframe')?.contentWindow && event.data?.type==='gravuru-ux-ready') window.betaEditorReady=performance.now();
      });
     });
     const page=await context.newPage();
     for(const cache of ['kalt','warm']) await sample(page,tag,profile,cache,run);
    } finally {await context.close();}
   }
  }
 } finally {await browser.close();}
 console.log(samples.length+' Läufe abgeschlossen.');
})().catch(error=>{console.error(error);process.exitCode=1;});
