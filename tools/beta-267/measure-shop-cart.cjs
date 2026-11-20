// Exercises the ordinary customer storefront in disposable, anonymous browser contexts.
// Cart creation can also persist drafts, offers and Shopify preview files. No checkout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const [switchName, output] = process.argv.slice(2);
assert.ok(switchName === '--shop-warenkorb' && output,
  'Aufruf für den echten Testwarenkorb: node measure-shop-cart.cjs --shop-warenkorb Ausgabedatei.json');
const shop = 'https://gravuru-design.myshopify.com';
const handle = 'klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert';
const product = shop + '/products/' + handle;
const elapsed = since => Math.round(performance.now() - since);
const isEditor = frame => /merchant.*editor/.test(new URL(frame.url(), shop).pathname);
const openEditor = page => page.frames().find(isEditor) || page.waitForEvent('framenavigated', {predicate:isEditor});
const profiles = {PC:{width:1440, height:960}, Mobil:{width:390, height:844}};
const report = {product, profiles, network:'ohne Drosselung', simulations:true, samples:[]};

// Persist timings and public route types only. Session IDs, query strings and properties stay in the browser.
function routeType(request) {
  const {pathname} = new URL(request.url());
  if (/\/cart\/add(\.js)?\/?$/.test(pathname)) return 'Shopify Position hinzufügen';
  if (/\/cart\/?$/.test(pathname)) return 'Shopify Warenkorbseite';
  if (/checkout[-_]image/.test(pathname)) return 'Vorschaubild für den Warenkorb';
  if (/cart[-_]handoff|\/handoff\/?$/.test(pathname)) return 'Übergabe an Shopify';
  if (/acrylic-drafts|\/drafts\/?$/.test(pathname)) return 'Entwurf speichern';
  if (/theme-cart\/?$/.test(pathname)) return 'Warenkorb vorbereiten';
  if (/\/claim\/?$/.test(pathname)) return 'Übergabe bestätigen';
  if (/\/cart\.js$/.test(pathname)) return 'Shopify Warenkorb lesen';
  return null;
}

async function choose(frame, id) {
  const button = frame.locator('[data-c-design="' + id + '"]');
  await button.evaluate(el => el.addEventListener('click', () => {
    window.betaMeasuredChoice = performance.now();
  }, {once:true, capture:true}));
  await button.click();
  await frame.locator('[data-c-design="' + id + '"][aria-pressed="true"]').waitFor();
  return frame.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return Math.round(performance.now() - window.betaMeasuredChoice);
  });
}

async function run(page, device, cache, repetition) {
  const requests = [];
  let measuringCart = false;
  const track = request => {
    if (!measuringCart) return;
    const route = routeType(request);
    if (route) requests.push({route, method:request.method(), ms:Math.round(request.timing().responseEnd)});
  };
  page.on('requestfinished', track);
  try {
    await page.goto(product, {waitUntil:'domcontentloaded'});
    const start = performance.now();
    await page.getByText('Jetzt personalisieren', {exact:true}).first().click();
    const frame = await openEditor(page);
    const tab = frame.getByRole('tab', {name:'Designs', exact:true});
    await tab.waitFor();
    const entryMs = elapsed(start);
    await tab.click();
    const firstChoiceMs = await choose(frame, 'FK-VERDECKT');
    const secondChoiceMs = await choose(frame, 'FK-SEITLICH');
    await frame.getByRole('tab', {name:'Text', exact:true}).click();
    const text = frame.locator('textarea:visible').first();
    const label = 'Test ' + repetition + (cache === 'kalt' ? 'A' : 'B');
    await text.fill(label);
    await text.press('Tab');
    assert.equal(await text.inputValue(), label);
    await frame.getByRole('button', {name:'In den Warenkorb', exact:true}).first().click();
    const confirm = frame.getByRole('button', {name:'Jetzt in den Warenkorb', exact:true}).last();
    await confirm.waitFor();
    measuringCart = true;
    const cartStart = performance.now();
    await confirm.click();
    await page.waitForURL(url => url.origin === shop && /^\/cart\/?$/.test(url.pathname),
      {waitUntil:'domcontentloaded', timeout:90000});
    await page.locator('main').waitFor();
    const cartVisibleMs = elapsed(cartStart);
    const numbers = await page.evaluate(async ({handle, label}) => {
      const response = await fetch('/cart.js', {cache:'no-store'});
      if (!response.ok) throw Error('Warenkorb wurde nicht bestätigt.');
      const cart = await response.json();
      const ids = cart.items.map(item => item.properties?._gravuru_config);
      const revisions = cart.items.map((item, index) => ids[index] + '/' + item.properties?._gravuru_rev);
      const match = cart.items.find(item => item.handle === handle && String(item.properties?.Gravurtext).includes(label));
      return {currency:cart.currency, lines:cart.items.length, unitCents:match?.final_price,
        quantity:match?.quantity, revision:Number(match?.properties?._gravuru_rev),
        sameConfiguration:ids.length > 1 && new Set(ids).size === 1,
        distinctRevisions:ids.every(Boolean) && new Set(revisions).size === revisions.length,
        distinctText:new Set(cart.items.map(item => item.properties?.Gravurtext)).size === cart.items.length};
    }, {handle, label});
    const cartVerifiedMs = elapsed(cartStart);
    assert.equal(numbers.currency, 'EUR');
    assert.equal(numbers.lines, cache === 'kalt' ? 1 : 2);
    assert.equal(numbers.unitCents, 4999);
    assert.equal(numbers.quantity, 1);
    assert.ok(numbers.revision >= 1 && numbers.distinctRevisions && numbers.distinctText);
    return {device, cache, repetition, entryMs, firstChoiceMs, secondChoiceMs, cartVisibleMs, cartVerifiedMs, requests, ...numbers};
  } finally { page.off('requestfinished', track); }
}

(async () => {
  const browser = await chromium.launch({channel:process.env.BETA_CHROME_CHANNEL || 'chrome'});
  try {
    report.browser = browser.version();
    fs.mkdirSync(path.dirname(output), {recursive:true});
    for (let repetition=1; repetition<=3; repetition++) {
      for (const [device, viewport] of Object.entries(profiles)) {
        const context = await browser.newContext({viewport, locale:'de-DE',
          isMobile:device === 'Mobil', hasTouch:device === 'Mobil', deviceScaleFactor:1});
        try {
          const page = await context.newPage();
          for (const cache of ['kalt', 'warm']) {
            report.samples.push(await run(page, device, cache, repetition));
            fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
            console.log(device, cache, repetition, report.samples.at(-1).cartVerifiedMs + ' ms');
          }
          fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
        } finally { await context.close(); }
      }
    }
  } finally { await browser.close(); }
})().catch(error => {
  console.error(String(error.message).split('Call log')[0].split('https://')[0].slice(0,500));
  process.exitCode=1;
});
