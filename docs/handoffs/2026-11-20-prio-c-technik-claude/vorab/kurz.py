import json,sys
d=json.load(open(sys.argv[1]))
b=[m[1] for m in d['meldungenVor'] if m[0]=='gravuru-shop-editor-ready']
def w(pat,alle=False):
    r=[a for a in d['vor'] if pat in a['weg']]
    if not r: return '-'
    return '/'.join(str(a['wartenMs']) for a in r) if alle else str(r[0]['wartenMs'])+' (gesamt '+str(r[0]['endeMs']-r[0]['startMs'])+')'
print(d['ansicht'],d['uhr'][11:19],'| bereit',b[0] if b else None,'| alles geladen',d['vorabRuheNachMs'],'| Abrufe',d['vorabAbrufe'])
print('  start',w('/start'),'| modell',w('shop-entry/model'),'| editor-seite',w('_merchant-acryl-editor.html'),'| designliste',w('design-gallery',False) if False else '/'.join(str(a['wartenMs']) for a in d['vor'] if a['weg'].endswith('design-gallery')),'| vorschau',w('design-gallery-preview',True),'| design-teile',w('design-parts',True))
for e in d.get('einzeln') or []: print('  einzeln',e['seite'],e['thema'],e['ms'],'ms')
