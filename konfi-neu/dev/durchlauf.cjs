// Vollständiger Kundenweg im Test-Shop: gestalten → Warenkorb → bearbeiten → Warenkorb.
// node dev/durchlauf.cjs [desktop|handy] [Ordner für Bildschirmfotos, sonst dist/durchlauf]
const {chromium, devices} = require('playwright');
const assert = require('node:assert');
(async () => {
  // Bildschirmfotos nie in den Arbeitsordner: dist/ ist vom Repository ausgenommen.
  const [profil = 'desktop', ordner = require('node:path').join(__dirname, '..', 'dist', 'durchlauf')] = process.argv.slice(2);
  require('node:fs').mkdirSync(ordner, {recursive: true});
  const handy = profil === 'handy';
  const browser = await chromium.launch();
  const ctx = await browser.newContext(handy ? {...devices['iPhone 13']} : {viewport: {width: 1360, height: 900}});
  const page = await ctx.newPage();
  const fehler = [];
  const anfragen = [];
  page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', e => fehler.push('PAGEERROR ' + e.message));
  page.on('request', r => { if (/\/api\/|\/cart\//.test(r.url())) anfragen.push(r.method() + ' ' + new URL(r.url()).pathname); });
  const k = page.locator('#gravuru-konfi');
  const bereit = () => page.waitForSelector('#gravuru-konfi[data-bereit]', {state: 'attached', timeout: 20000});
  const reiter = async name => { await k.locator('.gk-reiter button', {hasText: name}).click(); await page.waitForTimeout(250); };
  const zu = async () => { if (handy) { await k.locator('.gk-schliessen').click().catch(() => {}); await page.waitForTimeout(250); } };
  const preis = async () => (await k.locator(handy ? '.gk-info b' : '.gk-preis b').textContent()).trim();
  const bild = name => page.screenshot({path: `${ordner}/${profil}-${name}.png`});

  await page.request.post('http://127.0.0.1:8970/testshop/leeren');
  await page.goto('http://127.0.0.1:8970/testshop/produkt/katalog-formate-edelstahl-tuerschilder-familienschilder-eb5fe26624befe4a');
  await page.click('[data-gravuru-konfi]');
  await bereit();
  console.log('1 Start', await preis());

  await reiter('Ausführung');
  await bild('1-ausfuehrung');
  await k.locator('.gk-kachel', {hasText: 'Oval'}).first().click();
  await page.waitForTimeout(300);
  await k.locator('.gk-kachel', {hasText: 'Mit 2 Bohrlöchern'}).first().click();
  await page.waitForTimeout(200);
  console.log('2 Oval mit Bohrlöchern', await preis());
  await zu();

  await reiter('Designs');
  await k.locator('.gk-kachel.gk-design').first().waitFor({timeout: 10000});
  const anzahl = await k.locator('.gk-kachel.gk-design').count();
  await bild('2-designs');
  await k.locator('.gk-kachel.gk-design').nth(2).click();
  await page.waitForTimeout(800);
  console.log('3 Design gewählt, Kacheln:', anzahl, 'Elemente auf der Bühne:', await k.locator('svg.gk-buehne .gk-el').count());
  await zu();

  await reiter('Text');
  const feld = k.locator('textarea').first();
  await feld.click();
  await feld.fill('Familie Özdemir');
  await page.waitForTimeout(200);
  await bild('3-text');
  await zu();

  await reiter('Motive');
  await k.locator('.gk-motive button').first().waitFor({timeout: 10000});
  await k.locator('.gk-suche').fill('Herz');
  await page.waitForTimeout(200);
  await k.locator('.gk-motive button').first().click();
  await page.waitForTimeout(600);
  console.log('4 Motiv eingefügt', await preis());
  await zu();
  await bild('4-motiv');

  // Motiv auf der Bühne verschieben
  const motiv = k.locator('svg.gk-buehne .gk-el').last();
  const b = await motiv.boundingBox();
  if (process.env.DEBUG) console.log('  Treffer:', await page.evaluate(([x, y]) => { const r = document.querySelector('#gravuru-konfi').shadowRoot; return r.elementsFromPoint(x, y).slice(0, 4).map(e => e.tagName + '.' + (e.getAttribute('class') || '') + '[' + (e.getAttribute('data-griff') || e.closest('[data-id]')?.getAttribute('data-id') || '') + ']').join(' > '); }, [b.x + b.width / 2, b.y + b.height / 2]), JSON.stringify(b));
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 10, {steps: 6});
  if (process.env.DEBUG) console.log('  während:', JSON.stringify(await motiv.boundingBox()), await motiv.getAttribute('data-id'));
  await page.mouse.up();
  if (process.env.DEBUG) console.log('  danach:', JSON.stringify(await motiv.boundingBox()), await motiv.getAttribute('data-id'), 'Auswahl-Rahmen:', await k.locator('svg.gk-buehne rect[data-griff=bewegen]').count());
  const b2 = await motiv.boundingBox();
  assert(Math.abs(b2.x - b.x - 60) < 6, 'Motiv wurde nicht verschoben: ' + (b2.x - b.x));
  await zu();

  // Menge 3 → Staffel
  if (!handy) { await k.locator('.gk-menge button').last().click(); await k.locator('.gk-menge button').last().click(); }
  const editorPreis = await preis();
  console.log('5 vor Warenkorb', editorPreis);

  await (handy ? k.locator('.gk-reiter .gk-nur-mobil') : k.locator('.gk-fuss .gk-gruen')).click();
  await page.waitForURL('**/cart', {timeout: 20000});
  await bild('5-warenkorb');
  const summe = (await page.textContent('#summe')).replace('Summe: ', '');
  console.log('6 Warenkorb', summe, '|', await page.textContent('#kasse'), '| Zeilen:', await page.locator('tr[data-zeile]').count());
  assert.strictEqual(summe, editorPreis, 'Warenkorbsumme weicht vom Editorpreis ab');
  assert.match(await page.textContent('#kasse'), /frei/);
  assert((await page.locator('td img').first().evaluate(i => i.naturalWidth)) > 100, 'Vorschaubild fehlt');

  // Bearbeiten aus dem Warenkorb
  await page.click('a[data-bearbeiten]');
  await bereit();
  await reiter('Text');
  const wieder = await k.locator('textarea').first().inputValue();
  assert.strictEqual(wieder, 'Familie Özdemir', 'Text nach Bearbeiten nicht wiederhergestellt: ' + wieder);
  await k.locator('textarea').first().fill('Familie Yılmaz');
  await zu();
  await (handy ? k.locator('.gk-reiter .gk-nur-mobil') : k.locator('.gk-fuss .gk-gruen')).click();
  await page.waitForURL('**/cart', {timeout: 20000});
  const zeilen = await page.locator('tr[data-zeile]').count();
  console.log('7 nach Bearbeiten: Zeilen', zeilen, '|', (await page.textContent('tr[data-zeile]')).replace(/\s+/g, ' ').slice(0, 200));
  assert.strictEqual(zeilen, 1, 'Nach dem Bearbeiten muss genau eine Zeile im Warenkorb liegen');
  assert.match(await page.textContent('tr[data-zeile]'), /Yılmaz/);
  await bild('6-warenkorb-bearbeitet');
  console.log('Anfragen an Server und Warenkorb:', anfragen.join(', '));
  console.log('Fehler in der Konsole:', JSON.stringify(fehler));
  assert.deepStrictEqual(fehler, []);
  await browser.close();
  console.log('DURCHLAUF OK', profil);
})().catch(e => { console.error('DURCHLAUF FEHLGESCHLAGEN', e); process.exit(1); });
