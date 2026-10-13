"""Product families page (Paket A): local preview server, real Chromium.

Start `node app/configurator/variant-m/server.mjs --port=PORT` from a disposable
copy with fresh data, then: python3 scripts/check-product-families.py http://127.0.0.1:PORT
No Shopify login, live system or publication involved.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/product-families'; OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8961'
checks = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(); pg = browser.new_page(viewport={'width': 1440, 'height': 1400})
    errors = []; pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/werkstatt/familien/'); pg.wait_for_selector('#family-list .empty-state, #family-list [data-family]')
    pg.click('[data-bundled="steel-door-signs"]'); pg.wait_for_selector('#family-detail:not([hidden]) #family-sizes tr')
    checks['familyImported'] = '61 Größen' in pg.inner_text('#family-summary')
    pg.select_option('#family-group', 'OV'); pg.wait_for_timeout(300)
    checks['ovalFilter'] = pg.locator('#family-sizes tr').count() == 10
    pg.click('[data-preview="GR-ES-OV-90X60-T15"]'); pg.wait_for_selector('#family-template img'); pg.wait_for_timeout(500)
    checks['templateShown'] = pg.locator('#family-template img').evaluate('i=>i.naturalWidth>0')
    for key in ['GR-ES-OV-90X60-T15', 'GR-ES-OV-120X80-T15', 'GR-ES-OV-150X100-T15']: pg.check(f'[data-pick="{key}"]')
    checks['selectionLabel'] = pg.inner_text('#family-generate') == '3 ausgewählte Produkte erzeugen'
    pg.screenshot(path=str(OUT / 'families.png'))
    pg.click('#family-generate'); pg.wait_for_selector('#family-notice:not([hidden])'); pg.wait_for_timeout(800)
    checks['generated'] = '3 neue Produktentwürfe' in pg.inner_text('#family-notice')
    with pg.expect_download() as d: pg.click('#family-briefing')
    checks['briefingDownload'] = d.value.suggested_filename == 'Briefing-steel-door-signs-Stand-1.zip'
    href = pg.locator('#family-sizes tr[data-size="GR-ES-OV-90X60-T15"] a').get_attribute('href')
    pg.goto(BASE + href); pg.wait_for_selector('#editor-preview > svg', timeout=30000); pg.wait_for_timeout(1500)
    opts = pg.eval_on_selector_all('#stage-options option', 'o=>o.map(x=>[x.value,x.textContent])')
    b02 = next(v for v, t in opts if 'Bohrl' in t); pg.select_option('#stage-options', b02); pg.wait_for_timeout(2000)
    holes = pg.evaluate("(()=>{const s=document.querySelector('#editor-preview svg').outerHTML;return (s.match(/<circle[^>]*r=\"2\"/g)||[]).length})()")
    checks['editorShowsHoles'] = holes >= 2
    pg.screenshot(path=str(OUT / 'editor-oval-b02.png'))
    checks['noPageErrors'] = not errors
    browser.close()
report = {'result': 'PASS' if all(checks.values()) else 'FAIL', 'checks': checks, 'errors': errors}
(OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)); print(json.dumps(report, ensure_ascii=False))
sys.exit(0 if report['result'] == 'PASS' else 1)
