"""Plan aus slate-sizes.mjs in design.json schreiben, ohne die übrige Formatierung anzufassen."""
import json, sys, re
plan = json.load(open(sys.argv[1]))
for f, p in plan.items():
    t = open(f, encoding='utf-8').read()
    d = json.loads(t)
    ind = re.search(r'\n([ \t]+)"', t).group(1)
    d['formatreihe'] = p['formatreihe']
    if p['sizes'] is not None:
        d['sizes'] = p['sizes']
    for k in ('provenance',):
        pass
    out = json.dumps(d, ensure_ascii=False, indent=len(ind)) + '\n'
    out = out.replace('scripts/schiefer-uebertrag/schiefer-uebertrag.py', 'gravuru-2027 scripts/schiefer-designs/schiefer-uebertrag.py')
    open(f, 'w', encoding='utf-8').write(out)
print(len(plan), 'Dateien')
