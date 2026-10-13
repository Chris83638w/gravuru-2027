"""Materialübergreifende Familien (Gedenktafel 30 × 20) in der Werkstatt-Oberfläche.

Lokaler Vorschauserver aus einer Wegwerfkopie, echtes Chromium, kein Shop.
Prüft: Übernahme der mitgelieferten Familien, Hinweis auf offene Stammdaten,
gesperrtes Erzeugen bei Acryl/offenen Werten, Erzeugen bei Naturschiefer und
Öffnen des Schieferprodukts im Editor, Nachtragen offener Werte über „Bearbeiten“.

    python3 scripts/check-material-families.py http://127.0.0.1:PORT
Schreibt .test-output/material-families/report.json und Bildschirmfotos.
"""
import json, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.test-output/material-families'; OUT.mkdir(parents=True, exist_ok=True)
BASE = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else 'http://127.0.0.1:8987'
checks = {}
with sync_playwright() as pw:
    browser = pw.chromium.launch(); pg = browser.new_page(viewport={'width': 1440, 'height': 1600})
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '/werkstatt/familien'); pg.wait_for_selector('#family-bundled button')
    def take(fid):
        pg.click(f'[data-bundled="{fid}"]'); pg.wait_for_selector('#family-detail:not([hidden])'); pg.wait_for_timeout(600)
    take('gedenktafel-30x20-acryl-schwarz')
    gap = pg.locator('#family-gaps')
    checks['acrylShowsNotConnected'] = gap.is_visible() and 'noch nicht' in gap.inner_text()
    checks['acrylGenerateDisabled'] = pg.locator('#family-generate').is_disabled()
    checks['acrylListShowsOpenCount'] = 'Angaben offen' in pg.locator('#family-list').inner_text()
    pg.click('[data-preview="GT-AS-RE-300X200"]'); pg.wait_for_selector('#family-template img')
    checks['acrylTemplateRenders'] = True
    pg.screenshot(path=str(OUT / 'acryl-offen.png'), full_page=True)
    take('gedenktafel-30x20-edelstahl')
    checks['steelListsGaps'] = 'Materialstärke' in gap.inner_text() and 'Bohrbild' in gap.inner_text()
    # fill in the open values through the editor
    pg.click('#family-edit'); pg.wait_for_selector('#family-edit-form')
    pg.fill('[data-f="material.thicknessMm"]', '1.5'); pg.fill('[data-f="designArea.marginMm"]', '0')
    pg.fill('[data-r="0"][data-k="diameterMm"]', '4'); pg.fill('[data-r="0"][data-k="edgeMm"]', '8')
    pg.click('#family-edit-form button[type="submit"]'); pg.wait_for_selector('#family-editor', state='hidden'); pg.wait_for_timeout(800)
    checks['steelReadyAfterEdit'] = not pg.locator('#family-gaps').is_visible() and pg.locator('#family-generate').is_enabled()
    take('gedenktafel-30x20-schiefer-natur')
    checks['slateReady'] = not gap.is_visible() and pg.locator('#family-generate').is_enabled()
    pg.click('#family-generate'); pg.wait_for_selector('#family-sizes a[href*="configuration="]', timeout=30000)
    href = pg.locator('#family-sizes a[href*="configuration="]').first.get_attribute('href')
    pg.goto(BASE + href); pg.wait_for_selector('#editor-preview > svg', timeout=30000); pg.wait_for_timeout(1500)
    page_text = pg.inner_text('body')
    checks['slateProductOpensInEditor'] = 'Naturschiefer' in page_text
    checks['slateMountingOptions'] = all(x in page_text for x in ['2 Bohrlöcher Ø 5 mm', '4 Bohrlöcher Ø 5 mm'])
    pg.screenshot(path=str(OUT / 'schiefer-editor.png'), full_page=True)
    browser.close()
report = {'result': 'PASS' if all(checks.values()) else 'FAIL', 'scope': 'lokaler Vorschauserver, Chromium', 'checks': checks}
(OUT / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False)); print(json.dumps(report, ensure_ascii=False))
sys.exit(0 if report['result'] == 'PASS' else 1)
