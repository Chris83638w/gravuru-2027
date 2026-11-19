#!/usr/bin/env python3
# Auswertung der Messreihe zu Issue #267: Median und Spanne je Produkt, Profil und Cachezustand.
import json,sys,statistics as st,collections
src=sys.argv[1] if len(sys.argv)>1 else 'messung.jsonl'
NAME={'klingelschild-ring-wired-pro-3-gen-5dfya2-personalisiert':'R Klingelschild','tuerschild-edelstahl-form-und-groesse-selbst-waehlen':'T Türschild Edelstahl','familienschild-acryl-baum-12x8-personalisiert':'F Familienschild Acryl'}
G=collections.defaultdict(list); AUS=[]
for l in open(src,encoding='utf-8'):
    r=json.loads(l); k=(NAME[r['handle']]+(' (Prio erzwungen)' if r['prio'] else ''),r['profil'],r['cache'])
    if not r.get('oeffnen'): AUS.append((k,r['lauf'],'Editor meldete binnen 90 s nicht bereit; Lauf ohne Werte')); continue
    if r['cache']=='warm' and not r.get('vorlauf'): AUS.append((k,r['lauf'],'Vorlauf ohne Bereitmeldung; als Warm-Lauf nicht gewertet')); continue
    G[k].append(r)
def val(r,path):
    cur=r
    for p in path.split('.'):
        if not isinstance(cur,dict) or cur.get(p) is None: return None
        cur=cur[p]
    return cur
def fmt(vals,div=1000,nd=1):
    v=[x for x in vals if isinstance(x,(int,float))]
    if not v: return '–'
    m=st.median(v)/div
    return f"{m:.{nd}f}".replace('.',',') if len(v)==1 else f"{m:.{nd}f} ({min(v)/div:.{nd}f}–{max(v)/div:.{nd}f})".replace('.',',')
ROWS=[('Produktseite: größtes Bild sichtbar (LCP)','oeffnen.lcpMs'),('Produktseite: fertig geladen','oeffnen.seiteLoadMs'),('Tipp „Jetzt personalisieren“ → Editor bedienbar','oeffnen.klickBisEditorMs'),
      ('Designkacheln gefüllt (ab Öffnen des Bereichs)','kacheln.ms'),('1. Designwechsel','wechsel1.ms'),('2. Designwechsel','wechsel2.ms'),('Tastendruck → Anzeige (Median je Lauf)','text.medianMs'),
      ('Erster Warenkorb-Tipp → Position im Warenkorb','warenkorb.abErstemKlickBisAddMs'),('Letzter Tipp → Position im Warenkorb','warenkorb.abLetztemKlickBisAddMs'),('Letzter Tipp → Warenkorb-Seite geladen','warenkorb.abLetztemKlickBisSeiteMs'),
      ('  davon Entwurf sichern','warenkorb.schritte.entwurf.dauerMs'),('  davon theme-cart','warenkorb.schritte.themeCart.dauerMs'),('  davon cart/data','warenkorb.schritte.cartData.dauerMs'),('  davon claim','warenkorb.schritte.claim.dauerMs'),('  davon cart/add.js (Shopify)','warenkorb.schritte.add.dauerMs'),
      ('  Summe der vier eigenen Serverschritte','warenkorb.eigeneServerMs')]
INFO=[('Startmodell (Bytes)','oeffnen.modelBytes'),('Daten vom Konfi-Server bis Editor bereit (Bytes)','oeffnen.appBytes'),('Entwurf, Sendegröße (Bytes)','warenkorb.schritte.entwurf.reqB')]
for prof,cache in (('mobil','kalt'),('mobil','warm'),('desktop','kalt'),('desktop','warm')):
    keys=[k for k in G if k[1]==prof and k[2]==cache]
    if not keys: continue
    keys.sort()
    print(f"\n### {prof.capitalize()}, {cache} – Sekunden, Median (Spanne), n je Spalte: "+', '.join(f"{k[0].split()[0]}={len(G[k])}" for k in keys)+"\n")
    print('| Messpunkt | '+' | '.join(k[0] for k in keys)+' |'); print('|---|'+'---:|'*len(keys))
    for lab,path in ROWS:
        cells=[fmt([val(r,path) for r in G[k]]) for k in keys]
        if all(c=='–' for c in cells): continue
        print(f"| {lab} | "+' | '.join(cells)+' |')
    for lab,path in INFO:
        cells=[fmt([val(r,path) for r in G[k]],div=1,nd=0) for k in keys]
        if all(c=='–' for c in cells): continue
        print(f"| {lab} | "+' | '.join(cells)+' |')
    arts={k[0]:sorted(set(str(val(r,'wechsel1.art')) for r in G[k])) for k in keys}; print('\nArt des Designwechsels: '+'; '.join(f"{a}: {', '.join(b)}" for a,b in arts.items()))
    errs=[(k[0],r['lauf'],r['fehler'] or [val(r,x+'.fehler') for x in ('kacheln','wechsel1','wechsel2','text','warenkorb') if val(r,x+'.fehler')]) for k in keys for r in G[k]]
    errs=[e for e in errs if e[2]]
    if errs: print('Auffälligkeiten: '+'; '.join(f"{a} Lauf {b}: {c}" for a,b,c in errs))

if AUS:
    print('\n### Nicht gewertete Läufe\n')
    for k,l,w in AUS: print(f'- {k[0]}, {k[1]}, {k[2]}, Lauf {l}: {w}')
