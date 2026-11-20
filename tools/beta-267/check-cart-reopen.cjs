// Real R15 startup in the browser. Only the selected synthetic cart revision is supplied by the fixture.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
const [port, output] = process.argv.slice(2);
assert.ok(/^\d+$/.test(port) && Number(port) > 1023 && Number(port) < 65536 && output);
const cases = [];
const configuration = 'konfig_11111111-1111-4111-8111-111111111111';

(async () => {
  const browser = await chromium.launch({channel:process.env.BETA_CHROME_CHANNEL || 'chrome'});
  try {
    for (const [device, viewport] of Object.entries({PC:{width:1440,height:960},Mobil:{width:390,height:844}})) {
      const context = await browser.newContext({viewport,isMobile:device==='Mobil',hasTouch:device==='Mobil'});
      try {
        // Hold only the cart file import. No customer request, browser action or simulated time is involved.
        await context.addInitScript(() => {
          if (window === top) return;
          const read = File.prototype.text;
          File.prototype.text = async function () {
            if (this.name === 'revision-1.json') await new Promise(resolve => setTimeout(resolve, 1200));
            return read.call(this);
          };
        });
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:' + port + '/?produkt=ring');
        const iframe = page.frameLocator('iframe').first();
        await iframe.locator('gravuru-configurator[data-mobile-demo]').waitFor();
        const makeState = await page.evaluate(() => {
          const editor = document.querySelector('iframe').contentDocument.querySelector('gravuru-configurator');
          const newest = editor.draftPayload({draft:true});
          const first = newest.design.objects.find(object => object.type === 'text' && object.customerEditable !== false);
          first.text = 'Sued';
          editor.restoreDraft(newest, {draft:true});
          const latest = editor.draftPayload({draft:true});
          first.text = 'Nord';
          editor.restoreDraft(newest, {draft:true});
          const earlier = editor.draftPayload({draft:true});
          editor.restoreDraft(latest, {draft:true});
          return {earlier,latest,field:first.id};
        });
        for (const wrongRevision of [false,true]) {
          const result = await page.evaluate(async ({configuration,makeState,wrongRevision}) => {
            const frame = document.querySelector('iframe');
            const gate = window.GravuruShopEntry;
            window.GravuruShopEntry = Object.freeze({...gate,cartRevision:() => ({
              configuration:{id:configuration,rev:wrongRevision ? 2 : 1,latestRev:2,cartLineId:null},
              document:wrongRevision ? makeState.latest : makeState.earlier,
              draft:{id:'adraft_11111111-1111-4111-8111-111111111111',revision:2},
              token:'1'.repeat(64),editorKind:'native',photos:[],hints:['Im Warenkorb liegt bereits Revision 2 dieser Gestaltung. Geladen wurde Revision 1.'],quantity:1
            })});
            const started = performance.now();
            return await new Promise((resolve,reject) => {
              const timer = setTimeout(() => { window.removeEventListener('message', receive); reject(Error('Kein Editor-Ergebnis')); },25000);
              function receive(event) {
                if (event.source!==frame.contentWindow || event.origin!==location.origin ||
                    !['gravuru-ux-ready','gravuru-ux-failed'].includes(event.data?.type)) return;
                clearTimeout(timer); window.removeEventListener('message',receive);
                const editor=frame.contentDocument.querySelector('gravuru-configurator');
                resolve({event:event.data.type, selectedRevision:editor?.cartEdit?.rev || null,
                  text:editor?.state?.objects?.find(o=>o.id===makeState.field)?.text || null,
                  durationMs:Math.round(performance.now()-started)});
              }
              window.addEventListener('message',receive);
              frame.src='/editor.html?'+new URLSearchParams({config:configuration,rev:'1',line:'theme',case:wrongRevision?'different':'selected'});
            });
          }, {configuration,makeState,wrongRevision});
          cases.push({device,wrongRevision,...result});
          fs.writeFileSync(output,JSON.stringify({source:'Lokaler R15-Browser, synthetische Revisionsantwort, um 1200 ms verzögerter Dateiimport',cases},null,2)+'\n');
          if (wrongRevision) assert.equal(result.event,'gravuru-ux-failed');
          else {
            assert.equal(result.event,'gravuru-ux-ready');
            assert.equal(result.selectedRevision,1);
            assert.equal(result.text,'Nord');
          }
        }
      } finally { await context.close(); }
    }
    console.log('4 Startprüfungen bestanden');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
