// Öffnet ein Produkt im Test-Shop, startet den Konfigurator und speichert ein Bildschirmfoto.
// node dev/sehen.cjs <produkt> <desktop|handy> <bild.png> [aktion]
const {chromium, devices} = require('playwright');
(async () => {
  const [produkt, profil = 'desktop', bild = 'sehen.png', aktion = ''] = process.argv.slice(2);
  const browser = await chromium.launch();
  const ctx = await browser.newContext(profil === 'handy' ? {...devices['iPhone 13']} : {viewport: {width: 1360, height: 900}, deviceScaleFactor: 1});
  const page = await ctx.newPage();
  const fehler = [];
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8970/testshop/produkt/' + produkt);
  await page.click('[data-gravuru-konfi]');
  await page.waitForSelector('#gravuru-konfi[data-bereit]', {timeout: 20000, state: 'attached'}).catch(() => fehler.push('nicht bereit'));
  console.log('bereit', await page.getAttribute('#gravuru-konfi', 'data-bereit'));
  if (aktion) await eval('(async () => {' + aktion + '})()');
  await page.waitForTimeout(400);
  await page.screenshot({path: bild});
  console.log('fehler', JSON.stringify(fehler));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
