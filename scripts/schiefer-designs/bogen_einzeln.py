"""Einzel-Renderliste: je Design seine mittlere Größe → TSV für fastbogen (Zeile je Design-Gruppe)."""
import json,sys,collections
FAM={'SN':'schiefer-tafeln-natur','SP':'schiefer-tafeln-premium','SG':'schiefer-tafeln-geschnitten','SK':'schiefer-tafeln-kordel'}
kat,bericht,name=sys.argv[1:4]
g=collections.defaultdict(list)
for r in json.load(open(bericht)):
    if not r['ok']: continue
    d=json.load(open(f"{kat}/designs/{r['reihe']}/{r['id']}/design.json"))
    if not d.get('sizes'): continue
    s=d['sizes'][len(d['sizes'])//2]; g[(FAM[s.split('-')[1]],s)].append(d['id'])
for i,((f,s),ids) in enumerate(g.items()): print(f'{name}-{i:02d}\t{f}\t{s}\t{";".join(ids)}')
