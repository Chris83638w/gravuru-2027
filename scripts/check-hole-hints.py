"""Drill-hole protection zone and text hint (Paket C): local preview server, Chromium.

Creates the steel family, generates the oval 90 x 60, moves its text next to a
hole in the merchant editor (hint + zone), saves, then opens the customer view
with "2 Bohrlöcher" (zone + hint) and moves the text back (hint disappears).
Usage: python3 scripts/check-hole-hints.py http://127.0.0.1:PORT  (fresh data copy)
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/hole-hints'; OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8961'
OVAL = 'GR-ES-OV-90X60-T15'; checks = {}; errors = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(); pg = browser.new_page(viewport={'width': 1440, 'height': 1400})
    pg.on('pageerror', lambda e: errors.append(str(e))); pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/werkstatt/familien/'); pg.wait_for_selector('#family-list')
    pid = pg.evaluate("""async(oval)=>{const s=await (await fetch('/api/workshop/session')).json(),h={'Content-Type':'application/json','X-Gravuru-CSRF':s.csrfToken};
      let r=await fetch('/api/workshop/families',{method:'POST',headers:h,body:JSON.stringify({bundled:'steel-door-signs'})});if(r.status!==201&&r.status!==409)throw Error('family '+r.status);
      const g=await (await fetch('/api/workshop/families/steel-door-signs/products',{method:'POST',headers:h,body:JSON.stringify({expectedRevision:1,sizeKeys:[oval]})})).json();return g.products[0].productId;}""", OVAL)
    # Merchant editor: choose 2 holes, move the text next to the left hole.
    pg.goto(BASE + '/werkstatt/?configuration=' + pid); pg.wait_for_selector('#editor-preview > svg', timeout=30000); pg.wait_for_timeout(1000)
    b02 = next(v for v, t in pg.eval_on_selector_all('#stage-options option', 'o=>o.map(x=>[x.value,x.textContent])') if 'Bohrl' in t)
    pg.select_option('#stage-options', b02); pg.wait_for_timeout(1500)
    pg.click('#editor-elements [data-editor-object]'); pg.wait_for_timeout(500)
    pg.fill('[data-editor-prop="x"]', '32'); pg.press('[data-editor-prop="x"]', 'Tab'); pg.wait_for_timeout(2500)
    checks['merchantZoneShown'] = pg.locator('#editor-preview [data-m-keepout] circle').count() == 2
    hint = pg.locator('#editor-hole-hint')
    checks['merchantHint'] = hint.count() == 1 and hint.is_visible() and 'Bohrloch' in hint.inner_text()
    pg.screenshot(path=str(OUT / 'merchant-hint.png'))
    pg.click('text=Änderungen speichern'); pg.wait_for_timeout(2000)
    # Customer view with the saved revision.
    pg.goto(BASE + '/?configuration=' + pid); pg.wait_for_timeout(5000)
    fr = pg.frame_locator('iframe').first
    sel = fr.locator('select[data-m-option="mounting"]')
    sel.select_option('B02'); pg.wait_for_timeout(1500)
    checks['customerZoneShown'] = fr.locator('[data-m-keepout] circle').count() >= 2
    ch = fr.locator('[data-m-hole-hint]')
    checks['customerHint'] = ch.count() == 1 and ch.is_visible() and 'Familie Muster' in ch.inner_text() and 'Bohrloch' in ch.inner_text()
    checks['customerDesignValid'] = fr.locator('[data-m-invalid]').inner_text().strip() == ''
    pg.screenshot(path=str(OUT / 'customer-hint.png'))
    sel.select_option('K00'); pg.wait_for_timeout(1500)
    checks['customerNoHolesNoHint'] = not ch.is_visible() and fr.locator('[data-m-keepout]').count() == 0
    checks['noPageErrors'] = not errors
    browser.close()
report = {'result': 'PASS' if all(checks.values()) else 'FAIL', 'checks': checks, 'errors': errors}
(OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)); print(json.dumps(report, ensure_ascii=False))
sys.exit(0 if report['result'] == 'PASS' else 1)
