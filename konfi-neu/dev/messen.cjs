// Ladezeit des neuen Konfigurators messen: Klick auf „Jetzt personalisieren“ → bedienbar.
// Netzprofil „handy“ wie in den bisherigen Messungen (docs/handoffs/2026-11-16-p02-kernpaket):
// 150 ms Latenz, 200 KB/s (≈ 1,6 Mbit/s). Zusätzlich wählbar: CPU-Drosselung.
// node dev/messen.cjs <produkt> <handy|desktop> <cpu> <kalt|warm> [läufe]
const {chromium, devices} = require('playwright');
(async () => {
  const [produkt, profil = 'handy', cpu = '1', modus = 'kalt', laeufe = '5'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const ergebnisse = [];
  for (let i = 0; i < Number(laeufe); i++) {
    const ctx = await browser.newContext(profil === 'handy' ? {...devices['iPhone 13']} : {viewport: {width: 1440, height: 900}});
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    if (profil === 'handy') await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024});
    if (Number(cpu) > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: Number(cpu)});
    let bytes = 0, anfragen = 0, aktiv = false;
    cdp.on('Network.loadingFinished', e => { if (aktiv) { bytes += e.encodedDataLength; anfragen++; } });
    const url = 'http://127.0.0.1:8970/testshop/produkt/' + produkt;
    const einmal = async () => {
      await page.goto(url, {waitUntil: 'load'});
      await page.waitForTimeout(300); // Seite steht, Kunde hat noch nichts berührt
      aktiv = true; bytes = 0; anfragen = 0;
      const t0 = Date.now();
      await page.click('[data-gravuru-konfi]');
      await page.waitForSelector('#gravuru-konfi[data-bereit]', {state: 'attached', timeout: 120000});
      const bereit = Date.now() - t0;
      const intern = JSON.parse(await page.getAttribute('#gravuru-konfi', 'data-bereit'));
      await page.waitForLoadState('networkidle').catch(() => {});
      aktiv = false;
      return {bereitMs: bereit, plattenMs: intern.plattenMs, kB: Math.round(bytes / 1024), anfragen};
    };
    let r = await einmal();
    if (modus === 'warm') r = await einmal(); // zweiter Besuch mit gefülltem Zwischenspeicher
    ergebnisse.push(r);
    await ctx.close();
  }
  const median = feld => [...ergebnisse.map(e => e[feld])].sort((a, b) => a - b)[Math.floor(ergebnisse.length / 2)];
  console.log(JSON.stringify({produkt: produkt.slice(0, 30), profil, cpu: Number(cpu), modus, laeufe: ergebnisse.length, median: {bereitMs: median('bereitMs'), plattenMs: median('plattenMs'), kB: median('kB'), anfragen: median('anfragen')}, spanne: [Math.min(...ergebnisse.map(e => e.bereitMs)), Math.max(...ergebnisse.map(e => e.bereitMs))]}));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
