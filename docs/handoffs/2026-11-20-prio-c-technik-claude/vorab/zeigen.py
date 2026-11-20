import json,sys
d=json.load(open(sys.argv[1]))
print('ersatz',d.get('ersatz'));print({k:d[k] for k in ['ansicht','uhr','seiteDomMs','knopfDaMs','vorabRuheNachMs','vorabAbrufe','vorabkB','antippenBisBereitMs']})
print('Meldungen',d['meldungenVor'])
grp={}
for a in d['vor']:
    w=a['weg']
    if 'schriften' in w and '-v' not in sys.argv: 
        g=grp.setdefault('schriften',[]);g.append(a);continue
    if 'design-parts' in w and '-v' not in sys.argv:
        g=grp.setdefault('design-parts',[]);g.append(a);continue
    print(f"{a['startMs']:6d} +{a['wartenMs']:5d}w → {a['endeMs']:6d} {a['kB']:6.1f}kB {a.get('http',''):5s} verb {a.get('verbindenMs',0):4d} {w[-44:]}  {a['server'][:120]}")
for k,g in grp.items():
    print(f"  {k}: {len(g)} Abrufe, Start {min(x['startMs'] for x in g)}–{max(x['startMs'] for x in g)}, Ende bis {max(x['endeMs'] for x in g)}, Warten {min(x['wartenMs'] for x in g)}–{max(x['wartenMs'] for x in g)} ms, {round(sum(x['kB'] for x in g))} kB")
if d.get('nach'): print('nach Antippen:',len(d['nach']),'Abrufe')
for e in d.get('einzeln') or []: print('  einzeln',e)
