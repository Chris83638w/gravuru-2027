#!/usr/bin/env python3
"""Zielprüfung aller AE-Designs über den echten Konfi-Endpunkt (reviewFit über alle Größen je Farbe)."""
import urllib.error, glob, json, os, sys, urllib.parse, urllib.request, concurrent.futures as cf
K, server = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:8971')
def one(p):
    d = json.load(open(p, encoding='utf-8')); reihe = p.split('/')[-3]; out = []
    for fam in ('ae-tuerschilder-schwarz', 'ae-tuerschilder-anthrazit'):
        qs = urllib.parse.urlencode({'reihe': reihe, 'id': d['id'], 'familie': fam})
        try:
            r = json.load(urllib.request.urlopen(server + '/api/workshop/designs/target-preview?' + qs, timeout=300))
            out.append((fam, r['reviewFit']['status'], r['reviewFit']['issues'][:3], len(r['reviewFit']['sizes'])))
        except urllib.error.HTTPError as e:
            out.append((fam, 'Fehler %s' % e.code, [e.read().decode()[:200]], 0))
    return d['id'], out
files = sorted(glob.glob(os.path.join(K, 'designs/ae-tuerschilder-*/*/design.json')))
res = {}
with cf.ThreadPoolExecutor(4) as ex:
    for did, out in ex.map(one, files):
        res[did] = out
bad = {k: v for k, v in res.items() if any(s != 'passt' for _, s, _, _ in v)}
print(len(res), 'Designs geprüft;', len(bad), 'nicht „passt“;', sum(n for v in res.values() for _, _, _, n in v), 'Größenprüfungen')
for k, v in list(bad.items())[:20]: print(' ', k, v)
json.dump(res, open(os.environ.get('OUT', '/dev/null'), 'w'), ensure_ascii=False)
