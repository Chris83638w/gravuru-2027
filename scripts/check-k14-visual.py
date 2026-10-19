# K14 Sichtprüfung: Staffel neben der Menge, Zusatzfelder im Reiter Optionen, Reiter Vorder-/Rückseite.
# Aufruf: node scripts/k14-sichtpruefung-produkt.mjs <repo> produkt.json (legt Prüfprodukt in .local-data an),
# dann Server starten (--port=8975) und: python3 scripts/check-k14-visual.py http://127.0.0.1:8975 produkt.json deliverables/konfi-neu-K14
import json, sys, pathlib
from playwright.sync_api import sync_playwright
base, product, out = sys.argv[1], json.loads(pathlib.Path(sys.argv[2]).read_text()), pathlib.Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
report = {'checks': []}
def check(name, ok, detail=''):
    report['checks'].append({'name': name, 'ok': bool(ok), 'detail': detail}); print(('OK ' if ok else 'FEHLER ') + name, detail)
JS = """(src)=>{const r=document.querySelector('gravuru-configurator').shadowRoot;const el=r.host;return (new Function('r','el',src))(r,el);}"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for label, viewport, mobile in [('desktop', {'width': 1280, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
        page = b.new_page(viewport=viewport, is_mobile=mobile, has_touch=mobile, locale='de-DE')
        errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(f"{base}/?configuration={product['id']}&revision={product['revision']}")
        frame = page.wait_for_selector('#editor iframe', timeout=60000).content_frame()
        frame.wait_for_function("()=>!!document.querySelector('gravuru-configurator')?.shadowRoot?.querySelector('.scene [data-object]')", timeout=60000)
        page.wait_for_timeout(1500)
        q = lambda src: frame.evaluate(JS, src)
        check(label + ': Reiter Vorderseite/Rückseite vorhanden', q("return [...r.querySelectorAll('[data-ux-surface]')].map(b=>b.textContent.trim()).join('|')") == 'Vorderseite|Rückseite')
        check(label + ': Staffel neben der Menge', 'ab 5 Stück −10 %' in (q("return r.querySelector('[data-ux-tiers]')?.textContent||''")), q("return r.querySelector('[data-ux-tiers]')?.textContent||''"))
        fields = q("return [...r.querySelectorAll('[data-m-field-row]')].filter(n=>!n.hidden).map(n=>n.dataset.mFieldRow)")
        check(label + ': Zusatzfelder sichtbar (Kordel nur ohne Sockel)', fields == ['widmung', 'kordel', 'termin', 'karte'], json.dumps(fields))
        page.screenshot(path=str(out / f'{label}-1-optionen.png'))
        # Sockel wählen → Kordel verschwindet
        q("const s=r.querySelector('select[data-m-option=base]');s.value=[...s.options].find(o=>o.value!=='none').value;s.dispatchEvent(new Event('change',{bubbles:true}));return 1")
        page.wait_for_timeout(500)
        fields2 = q("return [...r.querySelectorAll('[data-m-field-row]')].filter(n=>!n.hidden).map(n=>n.dataset.mFieldRow)")
        check(label + ': bedingtes Feld blendet aus', 'kordel' not in fields2, json.dumps(fields2))
        q("const s=r.querySelector('select[data-m-option=base]');s.value='none';s.dispatchEvent(new Event('change',{bubbles:true}));return 1")
        # Menge 5 → Preis sinkt
        before = q("return r.querySelector('[data-fk-total]').textContent")
        q("const i=r.querySelector('[data-fk-quantity]');i.value='5';i.dispatchEvent(new Event('input',{bubbles:true}));return 1")
        page.wait_for_timeout(500)
        after = q("return r.querySelector('[data-fk-total]').textContent")
        check(label + ': Menge 5 rechnet Staffel', before != after, before + ' → ' + after)
        # Rückseite wählen
        q("r.querySelector('[data-ux-surface=back]').click();return 1"); page.wait_for_timeout(800)
        check(label + ': Rückseite gewählt, Vorlagentext ausgeblendet', q("return r.host.state?.uxSurface||el.state.uxSurface") == 'back' and q("return r.querySelectorAll('.scene [data-object]').length") == 0, str(q("return r.querySelectorAll('.scene [data-object]').length")))
        q("const t=r.querySelector('[data-ux-tab=text]');t&&t.click();return 1"); page.wait_for_timeout(300)
        q("const b=r.querySelector('[data-ux=add-text]');b&&!b.hidden&&b.click();return 1"); page.wait_for_timeout(800)
        surf = q("return el.state.objects.filter(o=>o.surfaceId==='back').length")
        check(label + ': neuer Text liegt auf der Rückseite', surf >= 1, str(surf))
        page.screenshot(path=str(out / f'{label}-2-rueckseite.png'))
        check(label + ': keine Skriptfehler', not errors, '; '.join(errors)[:300])
        page.close()
    b.close()
(out / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
print('FERTIG', sum(c['ok'] for c in report['checks']), '/', len(report['checks']))
