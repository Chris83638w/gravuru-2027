import json,sys,re
d=json.load(open(sys.argv[1]))
k=d.get('korb') or {}
print('bereit',d.get('bereitNachMs'),'| im Korb nach ms',d.get('imKorbNachMs'),'| Stück',k.get('item_count'),'| Summe',k.get('total_price'),'| fehler',d.get('fehler'),'| abbruch',d.get('abbruch'))
if d.get('ueberRand'): print('  ueberRand',json.dumps(d['ueberRand'].get('danach'),ensure_ascii=False)[:260])
for v in d.get('verlauf',[]): print('  verlauf',v['sek'],v.get('meldung'),[x[:70] for x in (v.get('dialoge') or [])])
for a in d['anfragen']:
    if not re.search(r'acrylic-drafts|theme-cart|cart/data|cart/claim|cart/add',a['weg']): continue
    z={m.group(1):round(float(m.group(2))) for m in re.finditer(r'([a-z_]+);dur=([0-9.]+)',a['serverTiming'])}
    wichtig={n:v for n,v in z.items() if v>=20 and n not in('processing','fetch')}
    print(' ',a['m'],a['status'],a['dauerMs'],'ms',a['weg'].split('/')[-1],wichtig)
