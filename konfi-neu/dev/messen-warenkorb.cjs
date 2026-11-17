// Misst „In den Warenkorb“ → Warenkorbseite steht, unter dem Handy-Netzprofil (150 ms, 200 KB/s).
const {chromium, devices} = require('playwright');
(async () => {
  const [produkt, laeufe = '5'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const zeiten = [], groessen = [];
  for (let i = 0; i < Number(laeufe); i++) {
    const ctx = await browser.newContext({...devices['iPhone 13']});
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024});
    let gesendet = 0;
    page.on('request', r => { if (r.url().includes('/api/gestaltungen') && r.method() === 'POST') gesendet = (r.postData() || '').length; });
    await page.goto('http://127.0.0.1:8970/testshop/produkt/' + produkt);
    await page.click('[data-gravuru-konfi]');
    await page.waitForSelector('#gravuru-konfi[data-bereit]', {state: 'attached'});
    await page.waitForLoadState('networkidle').catch(() => {});
    const t0 = Date.now();
    await page.locator('#gravuru-konfi .gk-reiter .gk-nur-mobil').click();
    await page.waitForURL('**/cart', {timeout: 60000, waitUntil: 'load'});
    zeiten.push(Date.now() - t0); groessen.push(Math.round(gesendet / 1024));
    await ctx.close();
  }
  zeiten.sort((a, b) => a - b);
  console.log(JSON.stringify({produkt, laeufe: zeiten.length, medianMs: zeiten[Math.floor(zeiten.length / 2)], spanne: [zeiten[0], zeiten.at(-1)], gesendetKB: groessen[0]}));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
