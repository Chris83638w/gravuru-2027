const assert = require('node:assert/strict');
const {writeFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {chromium} = require('playwright');

const product = 'https://gravuru-design.myshopify.com/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert';
const output = process.argv[2];
assert(output, 'Ausgabedatei angeben');

async function openTab(editor, name) {
  const tab = editor.getByRole('tab', {name, exact: true});
  if (!await tab.isVisible()) {
    await editor.getByRole('button', {name: /Werkzeuge öffnen/}).first().click();
  }
  await tab.click();
}

async function readCards(editor) {
  await openTab(editor, 'Designs');
  // The active card commits typed text after a 250 ms pause. This is a content check.
  await editor.locator('[data-c-design]').first().waitFor();
  await editor.page().waitForTimeout(700);
  const cards = editor.locator('[data-c-design]');
  assert.equal(await cards.count(), 16);
  const drawings = new Map();
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    const label = (await card.getAttribute('aria-label')).replace(/^Design /, '');
    await card.locator('svg[aria-label=' + JSON.stringify(label) + '] path').first().waitFor({state: 'attached'});
    const drawing = await card.evaluate(async element => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const host = element.getRootNode().host;
      const id = element.dataset.cDesign;
      const template = host.uxSelectedProfile().designs.find(entry => entry.id === id);
      const usesCustomerText = host.uxThumbnailDesign(template).objects.some(entry =>
        entry.type === 'text' && entry.text === 'Koch');
      const contours = Array.from(element.querySelectorAll('svg path, svg g[transform]'), node =>
        [node.getAttribute('d'), node.getAttribute('transform')]);
      const bytes = new TextEncoder().encode(JSON.stringify(contours));
      const signature = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).join(',');
      return {id, usesCustomerText, signature};
    });
    drawings.set(drawing.id, drawing);
  }
  return drawings;
}

async function checkDevice(browser, mobile) {
  const device = mobile ? 'Mobil' : 'PC';
  const context = await browser.newContext({
    viewport: mobile ? {width: 390, height: 844} : {width: 1440, height: 960},
    isMobile: mobile, hasTouch: mobile, locale: 'de-DE',
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(product, {waitUntil: 'domcontentloaded'});
    assert.equal(response.status(), 200);
    await page.getByText('Jetzt personalisieren', {exact: true}).first().click();
    const isEditor = frame => new URL(frame.url() || 'about:blank').pathname === '/_merchant-acryl-editor.html';
    const editor = page.frames().find(isEditor) ||
      await page.waitForEvent('framenavigated', {predicate: isEditor, timeout: 40000});
    await editor.getByRole('tab', {name: 'Designs', exact: true}).waitFor({state: 'attached'});
    const before = await readCards(editor);
    await openTab(editor, 'Text');
    const field = editor.locator('textarea:visible').first();
    const original = await field.inputValue();
    assert(original && original !== 'Koch');
    await field.fill('Koch');
    await field.press('Tab');
    const edited = await readCards(editor);
    const expected = Array.from(edited.values()).filter(card => card.usesCustomerText).map(card => card.id);
    assert.equal(expected.length, 9);
    const changed = expected.filter(id => edited.get(id).signature !== before.get(id).signature);
    await openTab(editor, 'Text');
    await field.fill(original);
    await field.press('Tab');
    const back = await readCards(editor);
    const restored = expected.filter(id => back.get(id).signature === before.get(id).signature);
    assert.deepEqual(changed, expected);
    assert.deepEqual(restored, expected);
    return {device, cards: before.size, expected, changed, restored};
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({channel: 'chrome'});
  try {
    const results = [await checkDevice(browser, false), await checkDevice(browser, true)];
    writeFileSync(resolve(output), JSON.stringify(results, null, 2) + '\n', {flag: 'wx'});
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
