const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {
  devicePhotoReference,
  checkDevicePhoto,
  checkOriginalAngle,
} = require('./ring-preview-checks.cjs');
// Durchläuft das veröffentlichte Ring-Produkt mit zwei eigenen Testgestaltungen.
const [phase, mode, roundsArg = '3', outputRoot] = process.argv.slice(2);
const rounds = Number(roundsArg);
const contextPauseMs = Number(process.env.R15_CONTEXT_PAUSE_MS || 0);
assert(Number.isSafeInteger(contextPauseMs) && contextPauseMs >= 0 && contextPauseMs <= 120000);
assert(
  /^[a-z0-9-]+$/.test(phase) &&
    ['cart', 'editor'].includes(mode) &&
    [1, 2, 3].includes(rounds),
);
assert(
  outputRoot && path.isAbsolute(outputRoot),
  'Absoluten privaten Ausgabeordner außerhalb des Repositorys angeben',
);
const dir = path.join(outputRoot, phase);
const repository = path.resolve(__dirname, '../..');
const relativeOutput = path.relative(repository, dir);
assert(
  relativeOutput.startsWith('..' + path.sep) || path.isAbsolute(relativeOutput),
  'Für Messungen einen Ordner außerhalb des Repositorys verwenden',
);
const privateEvidence = process.env.R15_PRIVATE_EVIDENCE === '1';
fs.mkdirSync(outputRoot, { recursive: true });
// Ein eigener Ordner je Messrunde verhindert das Überschreiben paralleler Läufe.
fs.mkdirSync(dir, { mode: 0o700 });
const shop = 'https://gravuru-design.myshopify.com';
const appHost = 'app-2027.gravuru-designwerkstatt.de';
const link =
  shop + '/products/klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert';
const prio = process.env.R15_PRIO_UI === '1';
const protectedEntry = process.env.R15_PRIO_BETA === '1';
const betaOrigin = 'https://konfi-beta.gravuru-designwerkstatt.de';
assert(!protectedEntry || prio);
const now = () => Math.round(performance.now());
const digest = (s) => crypto.createHash('sha256').update(s).digest('hex');
const report = {
  phase,
  mode,
  started: new Date().toISOString(),
  samples: [],
  errors: [],
};
const persist = () =>
  fs.writeFileSync(
    path.join(dir, 'messung.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
const privateDrafts = [];
async function waitEditor(page) {
  const limit = now() + 42000;
  while (now() < limit) {
    const f = page.frames().find((f) => {
      const u = new URL(f.url() || 'about:blank');
      return (
        u.hostname === appHost && u.pathname === '/_merchant-acryl-editor.html'
      );
    });
    if (
      f &&
      (prio ? await f.locator('[data-demo-section="design"]').count() :
        await f.getByRole('tab', { name: 'Designs', exact: true }).count())
    )
      return f;
    await page.waitForTimeout(120);
  }
  throw Error('R15-Editor am freigegebenen Host nicht bereit');
}
async function gallery(page, row) {
  const response = await page.goto(protectedEntry ? betaOrigin + '/prio-pruefung.html' : link, {
    waitUntil: 'domcontentloaded',
    timeout: 45000,
  });
  assert.equal(response.status(), 200, 'Shop-Produkt');
  const click = now();
  await page
    .getByText(protectedEntry ? 'Ring-Klingelschild gestalten' : 'Jetzt personalisieren', { exact: true })
    .first()
    .click();
  const f = await waitEditor(page);
  row.editorMs = now() - click;
  const tab = prio ? f.locator('[data-demo-section="design"]:visible').first() : f.getByRole('tab', { name: 'Designs', exact: true });
  if (prio) {
    await f.parentFrame().waitForFunction(() => document.querySelector('#editor')?.inert === false && document.querySelector('#loading-screen')?.hidden);
    await f.waitForFunction(() => document.querySelector('gravuru-configurator')?.dataset.mobileDemo === 'sheet' && window.parent.GravuruShopEntry?.presentation === 'prio-r15');
    await tab.click({trial: true});
    row.prio = await f.evaluate(() => {
      const el = document.querySelector('gravuru-configurator');
      return {presentation:window.parent.GravuruShopEntry.presentation, tabs:[...el.shadowRoot.querySelectorAll('[data-demo-section]')].filter(b=>b.getClientRects().length).map(b=>b.dataset.demoSection), width:el.state.width, height:el.state.height, product:window.parent.GravuruShopEntry.shopifyProductId};
    });
    assert.equal(row.prio.product,'gid://shopify/Product/16126387257724');
    assert.equal(row.prio.width,160); assert.equal(row.prio.height,280);
    if (row.round === 1 && row.position === 1) await page.screenshot({path:path.join(dir,row.device+'-Prio-Ring.png'),animations:'disabled'});
  }
  if (!(await tab.isVisible())) {
    const open = f.getByRole('button', { name: /Werkzeuge öffnen/ });
    if (await open.count()) await open.first().click();
  }
  await tab.click({ timeout: 8000 });
  const card = f.locator('[data-c-design="FK-VERDECKT"]').first();
  await card.scrollIntoViewIfNeeded();
  row.card = await card.evaluate(async (c) => {
    const begin = performance.now();
    const label = c.getAttribute('aria-label').replace(/^Design /, '');
    const matches = () =>
      c.querySelector('svg')?.getAttribute('aria-label') === label &&
      !!c.querySelector('svg path');
    const initial = matches();
    while (!matches() && performance.now() - begin < 3000)
      await new Promise(requestAnimationFrame);
    if (matches()) {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    }
    return {
      initiallyVisible: initial,
      paintMs: matches() ? Math.round(performance.now() - begin) : null,
      deadlineMs: 3000,
    };
  });
  const target = row.position === 1 ? 'FK-SEITLICH' : 'FK-RUNDUM';
  const b = f.locator('[data-c-design="' + target + '"]').first();
  const was = await b.getAttribute('aria-pressed');
  await b.evaluate((el) =>
    el.addEventListener(
      'click',
      () => {
        window.r15ProbeClicked = performance.now();
      },
      { once: true, capture: true },
    ),
  );
  await b.click();
  row.switchMs = await f.evaluate(async (id) => {
    const start = window.r15ProbeClicked,
      host = document.querySelector('gravuru-configurator');
    const ok = () =>
      host.state.designId === id &&
      host.shadowRoot
        .querySelector('[data-c-design="' + id + '"]')
        ?.getAttribute('aria-pressed') === 'true';
    while (!ok() && performance.now() - start < 10000)
      await new Promise(requestAnimationFrame);
    if (!ok()) throw Error('Aktives Design wurde nicht bestätigt');
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return Math.round(performance.now() - start);
  }, target);
  row.previousTargetSelected = was === 'true';
  row.design = target;
  row.editorBundles = await f.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((r) => new URL(r.name).pathname)
      .filter((p) => /^\/_acryl-bundle\/editor-[a-f0-9]{16}\.mjs$/.test(p))
      .map((p) => p.split('/').pop()),
  );
  await (prio ? f.locator('[data-demo-section="text"]:visible').first() : f.getByRole('tab', { name: 'Text', exact: true })).click();
  const name = row.position === 1 ? 'Haus Nord 12' : 'Haus Süd 27';
  const field = prio ? f.locator('textarea[data-ux-text="name"]:visible').first() : f.locator('textarea:visible').first();
  if (prio && !await field.isVisible()) await f.locator('[data-ux="select-content"][data-id="name"]:visible').first().click();
  await field.fill(name);
  await field.press('Tab');
  assert.equal(await field.inputValue(), name);
  row.designCount = await f.locator('[data-c-design]').count();
  assert.equal(row.designCount, 16);
  return f;
}
function network(page, row) {
  const pending = [];
  function onResponse(resp) {
    const req = resp.request(),
      u = new URL(resp.url());
    const route = u.pathname.endsWith('/acrylic-drafts')
      ? 'speichern'
      : u.pathname.endsWith('/theme-cart')
        ? 'uebergabe'
        : u.pathname.endsWith('/cart/data')
          ? 'bilddaten'
          : u.pathname.endsWith('/cart/claim')
            ? 'bestaetigen'
            : u.hostname === 'gravuru-design.myshopify.com' &&
                u.pathname.endsWith('/cart/add.js')
              ? 'shopify-add'
              : null;
    if (!route) return;
    const task = (async () => {
      const endError = await resp.finished();
      const t = req.timing();
      const item = {
        route,
        status: resp.status(),
        ttfbMs: Math.round(t.responseStart - t.requestStart),
        fullyReceivedMs: Math.round(t.responseEnd - t.requestStart),
      };
      const header = (await resp.headerValue('server-timing')) || '';
      const allowed = new Set([
        'total',
        'draft_persist',
        'review_prepare',
        'body_read',
        'product_read',
        'model_build',
        'checkout_image_wait',
        'cart_prepare',
        'registry_document_digest',
        'review_validate',
        'customer_preview',
        'reference_preview',
        'preview_pair',
      ]);
      item.serverMs = Object.fromEntries(
        [...header.matchAll(/([a-z_]+);dur=([0-9.]+)/g)]
          .filter((x) => allowed.has(x[1]))
          .map((x) => [x[1], Number(x[2])]),
      );
      if (route === 'speichern' && resp.status() === 201 && privateEvidence &&
          process.env.R15_CAPTURE_PAIR === '1' && row.round === 1 && row.device === 'PC') {
        const { input } = req.postDataJSON();
        const ownText = row.position === 1 ? 'Haus Nord 12' : 'Haus Süd 27';
        assert(input.objects.some((object) => object.text === ownText));
        assert(typeof input.customerPreview === 'string' && typeof input.preview === 'string');
        fs.writeFileSync(path.join(dir, 'privat-bildpaar-' + row.position + '.json'),
          JSON.stringify({ customer: input.customerPreview, reference: input.preview }),
          { flag: 'wx', mode: 0o600 });
      }
      if (endError) item.networkError = true;
      row.requests.push(item);
      if (route === 'speichern' && resp.status() === 201) {
        const val = await resp.json();
        const id = val.id,
          snapshot = val.snapshotId;
        assert(
          typeof id === 'string' &&
            typeof snapshot === 'string' &&
            val.revision === 1,
          'Feste Revision fehlt',
        );
        privateDrafts.push({
          phase,
          round: row.round,
          device: row.device,
          position: row.position,
          id,
          snapshot,
        });
        row.confirmedRevision = val.revision;
        row.snapshotFingerprint = digest(snapshot).slice(0, 16);
      }
    })();
    task.catch(() => {});
    pending.push(task);
  }
  page.on('response', onResponse);
  return async () => {
    page.off('response', onResponse);
    await Promise.all(pending);
  };
}
// These are read-only image checks after the visible-cart timer has stopped.
async function readEvidenceImage(request, url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await request.get(url, { timeout: 15000 });
      return { status: response.status(), headers: response.headers(), body: await response.body() };
    } catch (error) {
      if (attempt >= 3 || !/aborted|ECONNRESET|ETIMEDOUT|timeout|socket hang up/i.test(error.message)) throw error;
      await new Promise(resolve => setTimeout(resolve, 300 * attempt));
    }
  }
}
async function cart(page, f, row, firstLine) {
  const photoPoints =
    process.env.R15_CHECK_PHOTO === '1' ? await devicePhotoReference(f) : null;
  await (prio ? f.locator('.completion-finish:visible').first() : f.getByRole('button', { name: 'In den Warenkorb', exact: true }).first()).click();
  const confirm = f
    .getByRole('button', { name: 'Jetzt in den Warenkorb', exact: true })
    .last();
  await confirm.waitFor({ state: 'visible', timeout: 12000 });
  const begin = now();
  await confirm.click();
  await page.waitForURL(
    (u) =>
      u.hostname === 'gravuru-design.myshopify.com' &&
      /^\/cart\/?$/.test(u.pathname),
    { timeout: 100000, waitUntil: 'domcontentloaded' },
  );
  const imgs = page.locator('main img.gravuru-cart-preview');
  await imgs
    .nth(row.position - 1)
    .waitFor({ state: 'visible', timeout: 12000 });
  const imageRows = await imgs.evaluateAll(async (imgs) => {
    await Promise.all(imgs.map((x) => x.decode()));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return imgs.map((x) => ({
      url: x.currentSrc,
      zoom: x.closest('a')?.href,
      size: [x.naturalWidth, x.naturalHeight],
      width: x.getBoundingClientRect().width,
      bodyBytes:
        performance.getEntriesByName(x.currentSrc).at(-1)?.encodedBodySize ||
        null,
    }));
  });
  row.cartMs = now() - begin;
  if (prio && row.round === 1 && row.position === 2) await page.screenshot({path:path.join(dir,row.device+'-Prio-Warenkorb.png'),animations:'disabled'});
  const data = await page.evaluate(async () => {
    const r = await fetch('/cart.js', { cache: 'no-store' });
    if (!r.ok) throw Error('Shopify-Lesefehler');
    return r.json();
  });
  assert.equal(data.items.length, row.position);
  assert.equal(data.total_price, 4999 * row.position);
  row.displayedPictures = [];
  const names = new Set(),
    ids = new Set();
  for (const i of data.items) {
    const attrs = i.properties;
    const personal = attrs._gravuru_bild;
    assert(
      i.variant_id === 57471227756924 &&
        i.quantity === 1 &&
        i.final_price === 4999 &&
        attrs._gravuru_rev === '1' &&
        attrs._gravuru_config,
    );
    const matching = imageRows.find(
      (x) => x.zoom === personal || x.zoom === attrs._Entwurf,
    );
    assert(
      matching && matching.size.every((n) => n > 100),
      'Die sichtbare Vorschau gehört nicht zur erwarteten Position',
    );
    const label = JSON.stringify(attrs);
    const name = label.includes('Haus Nord 12')
      ? 'Nord'
      : label.includes('Haus Süd 27')
        ? 'Süd'
        : null;
    assert(name, 'Eigener Testtext fehlt');
    names.add(name);
    ids.add(attrs._gravuru_config);
    const u = new URL(personal);
    assert(u.hostname === appHost && u.pathname.startsWith('/gestaltung/'));
    const bytes = await readEvidenceImage(page.request, personal);
    assert.equal(bytes.status, 200);
    const original = bytes.body;
    const sha = digest(original);
    let photoCheck;
    if (photoPoints) {
      const inspection = await page.context().newPage();
      try {
        await inspection.setContent(
          '<img alt="Gespeicherte Ring-Kundengestaltung">',
        );
        const savedImage = inspection.locator('img');
        await savedImage.evaluate(async (image, png) => {
          image.src = 'data:image/png;base64,' + png;
          await image.decode();
        }, original.toString('base64'));
        photoCheck = {
          matchedCameraPixels: await checkDevicePhoto(savedImage, photoPoints),
          decorativeLines: await checkOriginalAngle(savedImage, name === 'Süd'),
        };
      } finally {
        await inspection.close();
      }
    }
    const check = attrs._gravuru_checkout_image;
    assert(
      typeof check === 'string' &&
        new URL(check).hostname === 'cdn.shopify.com',
      'Shopify-Kassenbild fehlt',
    );
    const imageUrl = new URL(matching.url);
    imageUrl.searchParams.delete('width');
    assert(
      [check, personal, attrs._Entwurf].includes(imageUrl.href),
      'Die ausgelieferte Vorschau gehört zu einer anderen Revision',
    );
    if (privateEvidence && row.round === 1 && row.device === 'PC')
      fs.writeFileSync(
        path.join(dir, 'privat-eigene-Bildadressen-' + name + '.json'),
        JSON.stringify({
          display: matching.url,
          full: matching.zoom,
          shopify: check,
          saved: personal,
        }),
      );
    const remote = await readEvidenceImage(page.request, check);
    assert.equal(remote.status, 200);
    assert((remote.headers['content-type'] || '').startsWith('image/'));
    const servedWidth =
      Number(new URL(matching.url).searchParams.get('width')) || null;
    if (process.env.R15_SMALL === '1')
      assert.equal(
        servedWidth,
        160,
        'Shopify hat die kleine Anzeige nicht ausgeliefert',
      );
    row.displayedPictures.push({
      ...(photoCheck && { photoCheck }),
      name,
      sha256: sha,
      dimensions: matching.size,
      visibleWidth: Math.round(matching.width),
      cdnWidth: servedWidth,
      browserEncodedBytes: matching.bodyBytes,
      shopifyImageHttp: remote.status,
      shopifyImageBytes: remote.body.length,
    });
  }
  assert.equal(names.size, row.position);
  assert.equal(ids.size, row.position);
  assert.equal(
    new Set(row.displayedPictures.map((x) => x.sha256)).size,
    row.position,
  );
  if (row.position === 2)
    assert.equal(
      row.displayedPictures.find((x) => x.name === 'Nord').sha256,
      firstLine,
    );
  row.editLinks = await page
    .locator('main a.gravuru-cart-edit:visible')
    .count();
  if (process.env.R15_PREVIEW_ONLY === '1')
    assert.equal(row.editLinks, 0, 'Bearbeiten-Link ist noch sichtbar');
  row.totalCents = data.total_price;
  if (
    privateEvidence &&
    row.position === 2 &&
    row.round === 1 &&
    process.env.R15_SAVE_SESSION === '1'
  )
    await page.context().storageState({
      path: path.join(dir, 'privat-eigener-Warenkorb-' + row.device + '.json'),
    });
  return row.displayedPictures.find((x) => x.name === 'Nord').sha256;
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  report.browser = browser.version();
  try {
    for (let round = 1; round <= rounds; round++)
      for (const device of round % 2 ? ['PC', 'Mobil'] : ['Mobil', 'PC']) {
        const mobile = device === 'Mobil',
          saveData = mode === 'editor' || round !== 2;
        const ctx = await browser.newContext({
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1440, height: 960 },
          isMobile: mobile,
          hasTouch: mobile,
          deviceScaleFactor: 1,
          locale: 'de-DE',
          ...(protectedEntry ? {httpCredentials:{origin:betaOrigin,username:'astra',password:process.env.R15_BETA_PASSWORD}} : {}),
        });
        try {
          if (saveData)
            await ctx.addInitScript(() => {
              if (navigator.connection)
                Object.defineProperty(navigator.connection, 'saveData', {
                  get: () => true,
                });
            });
          const p = await ctx.newPage();
          let firstLine = null;
          for (const position of [1, 2]) {
            const row = {
              round,
              device,
              saveData,
              position,
              cache: position === 1 ? 'kalt' : 'warm',
              requests: [],
            };
            const finish = network(p, row);
            try {
              const f = await gallery(p, row);
              if (mode === 'cart') firstLine = await cart(p, f, row, firstLine);
            } finally {
              await finish();
              report.samples.push(row);
              persist();
              if (privateEvidence)
                fs.writeFileSync(
                  path.join(dir, 'privat-synthetische-revisionen.json'),
                  JSON.stringify(privateDrafts),
                );
            }
            console.log(
              round,
              device,
              position,
              row.card?.paintMs,
              row.switchMs,
              row.cartMs || '-',
              row.requests.find((x) => x.route === 'speichern')?.ttfbMs || '-',
            );
          }
        } finally {
          await ctx.close();
        }
        if (contextPauseMs)
          await new Promise(resolve => setTimeout(resolve, contextPauseMs));
      }
  } finally {
    await browser.close();
    report.finished = new Date().toISOString();
    persist();
  }
})().catch((err) => {
  const reason = err.message.split('\n')[0].replace(/\?[^ ]+/g, '?[privat]');
  report.errors.push(reason);
  persist();
  console.error(reason);
  process.exitCode = 1;
});
