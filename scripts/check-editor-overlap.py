"""Overlapping elements in the merchant editor (P1-2, Claude review 12.10.2026).

Local preview server with a fresh data directory copy, synthetic PDF (text above
a full-size frame), real Chromium. No Shopify login or live system involved.

Usage: start `node app/configurator/variant-m/server.mjs --port=PORT` from a
disposable copy of the repository, then
    python3 scripts/check-editor-overlap.py http://127.0.0.1:PORT
Writes .test-output/editor-overlap/report.json and a screenshot.
"""
import json, sys, tempfile, urllib.request
from pathlib import Path
import pymupdf
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/editor-overlap'; OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8961'
SEL = "document.querySelector('[data-editor-selection]')?.getAttribute('data-editor-selection')"
report = {'result': 'RUNNING', 'scope': 'local preview server, synthetic PDF, Chromium', 'checks': {}}

with tempfile.TemporaryDirectory() as tmp:
    pdf = Path(tmp) / 'text-unter-rahmen.pdf'
    doc = pymupdf.open(); page = doc.new_page(width=150*72/25.4, height=200*72/25.4); k = 72/25.4
    page.insert_text((40*k, 30*k), 'Familie Muster', fontsize=16)
    page.draw_rect(pymupdf.Rect(5*k, 5*k, 145*k, 195*k), color=(0, 0, 0), width=2)  # frame drawn later = on top
    doc.save(pdf)
    pid = json.load(urllib.request.urlopen(BASE + '/api/workshop/products'))['products'][0]['id']
    with sync_playwright() as pw:
        browser = pw.chromium.launch(); pg = browser.new_page(viewport={'width': 1440, 'height': 1800})
        pg.on('dialog', lambda d: d.accept())
        pg.goto(BASE + '/werkstatt/?configuration=' + pid); pg.wait_for_selector('#editor-preview > svg', timeout=30000)
        pg.click('#editor-design-actions [data-design-action="import"]')
        pg.set_input_files('#design-import-file', str(pdf))
        pg.click('#design-import-check'); pg.wait_for_selector('#design-import-apply:enabled', timeout=60000)
        pg.click('#design-import-apply'); pg.wait_for_timeout(5000)
        ids = pg.eval_on_selector_all('#editor-elements [data-editor-object]', 'ns=>ns.map(n=>n.dataset.editorObject)')
        box = lambda i: pg.locator(f'#editor-preview [data-object="{i}"]').bounding_box()
        area = lambda i: box(i)['width'] * box(i)['height']
        small, big = min(ids, key=area), max(ids, key=area)
        def click():
            b = box(small); pg.mouse.click(b['x'] + b['width']/2, b['y'] + b['height']/2); pg.wait_for_timeout(700); return pg.evaluate(SEL)
        seq = [click() for _ in range(4)]
        report['checks']['firstClickSelectsTextUnderFrame'] = seq[0] == small
        report['checks']['repeatedClickCyclesToFrameAndBack'] = seq == [small, big, small, big]
        # press again on the same spot and drag: moves the current selection, does not cycle
        before_small, before_big = box(small), box(big)
        b = box(small); x, y = b['x'] + b['width']/2, b['y'] + b['height']/2
        pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + 30, y + 20, steps=8); pg.mouse.up(); pg.wait_for_timeout(800)
        report['checks']['dragMovesSelectedFrameNotText'] = pg.evaluate(SEL) == big and box(small)['y'] == before_small['y'] and box(big)['y'] != before_big['y']
        pg.screenshot(path=str(OUT / 'overlap.png'))
        browser.close()
report['sequence'] = seq
report['result'] = 'PASS' if all(report['checks'].values()) else 'FAIL'
(OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
print(json.dumps(report, ensure_ascii=False))
sys.exit(0 if report['result'] == 'PASS' else 1)
