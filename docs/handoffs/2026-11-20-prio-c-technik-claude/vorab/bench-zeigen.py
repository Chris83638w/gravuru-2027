import json,sys
d=json.load(open(sys.argv[1]))
print(d['stand'],d['bank'])
for r in d['reihe']: print(f"{r['ms']:8.1f} ms (erster Byte {r['ersterByteMs']:7.1f}) {r['kB']:5d} kB {r['status']} {r['abruf']} {({k:v for k,v in r.items() if k in ('karten','gesamt','fehler','vorschauAdresse')}) or ''}\n            {r.get('bausteine')}")
