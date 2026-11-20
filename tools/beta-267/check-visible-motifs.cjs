const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

const product = 'https://gravuru-design.myshopify.com/products/tuerschild-edelstahl-form-und-groesse-selbst-waehlen';
const sizes = [[320,568], [360,640], [390,844], [1440,900]];
const output = path.resolve(process.argv[2] || 'motivpruefung');
const baseline = process.argv.includes('--vorher');

function readGrid() {
  const root = document.querySelector('gravuru-configurator').shadowRoot;
  const cards = [...root.querySelectorAll('[data-library-grid] button[data-motif]')];
  const rows = cards.map(card => {
    const bounds = card.getBoundingClientRect();
    const center = bounds.left + bounds.width / 2;
    const covered = y => !card.contains(root.elementFromPoint(center, y));
    const fullyVisible = bounds.width > 0 && bounds.left >= 0 && bounds.right <= innerWidth &&
      ![bounds.top + 2, bounds.top + bounds.height / 2, bounds.bottom - 2].some(covered);
    const img = card.querySelector('img');
    const painted = img ? img.complete && img.naturalWidth > 0 :
      Boolean(card.querySelector('svg :is(path,polygon,polyline,rect,circle,image,use,line,ellipse)'));
    return {fullyVisible, ready: painted && !card.disabled, y:Math.round(bounds.top)};
  });
  return {
    firstY: rows[0]?.y,
    completeCards: rows.filter(r => r.fullyVisible).length,
    completeImages: rows.filter(r => r.fullyVisible && r.ready).length,
    firstThreeReady: rows.length >= 3 && rows.slice(0,3).every(r => r.ready),
    scrollTop: root.querySelector('.ux-editor').scrollTop,
    searchFocused: root.activeElement?.matches('[data-library-search]') || false,
    price: root.querySelector('.ux-motif-pricing').textContent.trim()
  };
}

async function measure(browser, width, height) {
  const mobile = width < 768;
  const context = await browser.newContext({viewport:{width,height}, hasTouch:mobile, isMobile:mobile, locale:'de-DE'});
  try {
    const page = await context.newPage();
    const opened = await page.goto(product,{waitUntil:'domcontentloaded'});
    assert.equal(opened.status(), 200);
    await page.getByText('Jetzt personalisieren',{exact:true}).first().click();
    const isEditor = f => new URL(f.url() || 'about:blank').pathname === '/_merchant-acryl-editor.html';
    const frame = page.frames().find(isEditor) || await page.waitForEvent('framenavigated',{predicate:isEditor,timeout:45000});
    await frame.parentFrame().waitForFunction(() => !document.querySelector('#editor')?.inert && document.querySelector('#loading-screen')?.hidden, null,{timeout:75000});
    const tab = frame.locator('[data-demo-section="motif"]:visible').first();
    await tab.click();
    await frame.locator('[data-library-grid] button[data-motif]').first().waitFor();
    const initial = await frame.evaluate(readGrid);
    const start = Date.now();
    let settled = initial;
    while ((!settled.firstThreeReady || settled.completeImages < settled.completeCards) && Date.now()-start < 12000) {
      await page.waitForTimeout(100);
      settled = await frame.evaluate(readGrid);
    }
    const picturesWaitMs = Date.now()-start;
    await page.screenshot({path:path.join(output,`${width}x${height}.png`)});
    assert.equal(settled.scrollTop, 0);
    assert.equal(settled.searchFocused, false);
    assert.match(settled.price, /1,69/);
    if (!baseline) assert.ok(settled.completeImages >= 3, `${width} × ${height}: weniger als drei vollständige, geladene Motive`);
    return {width,height,initial,settled,picturesWaitMs};
  } finally {
    await context.close();
  }
}

async function main() {
  await fs.mkdir(output,{recursive:true});
  const browser = await chromium.launch({channel:process.env.BETA_CHROME_CHANNEL || 'chrome'});
  try {
    const rows = [];
    for (const [width,height] of sizes) {
      const row = await measure(browser,width,height);
      rows.push(row);
      console.log(`${width} × ${height}: ${row.settled.completeImages} sichtbare Motivbilder`);
    }
    await fs.writeFile(path.join(output,'motivsichten.json'),JSON.stringify({product,browser:browser.version(),rows}, null, 2)+'\n');
  } finally {
    await browser.close();
  }
}

main().catch(error => {console.error(error.message); process.exitCode = 1;});
