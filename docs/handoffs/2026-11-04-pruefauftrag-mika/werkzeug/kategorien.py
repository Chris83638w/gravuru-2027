import subprocess,json,collections,re
K='/home/claude/gravuru-katalog'
def git(*a): return subprocess.run(['git','-C',K,*a],capture_output=True,text=True).stdout
def read(rev,paths):
    if not paths: return []
    out=subprocess.run(['git','-C',K,'cat-file','--batch'],input=''.join(f'{rev}:{p}\n' for p in paths).encode(),capture_output=True).stdout
    res=[];i=0
    for p in paths:
        nl=out.index(b'\n',i);h=out[i:nl].split()
        if h[-1]==b'missing': res.append({});i=nl+1;continue
        size=int(h[2]);body=out[nl+1:nl+1+size];i=nl+2+size
        try:res.append(json.loads(body))
        except:res.append({})
    return res
MAT={'Acryl + Edelstahl':'Acryl auf Edelstahl (AE)','Acryl+Edelstahl':'Acryl auf Edelstahl (AE)','Aludibond':'Alu-Dibond','':'(ohne Angabe)'}
UK=[('grabstecker','Grabstecker'),('grabkreuz','Grabkreuze'),('bestand/kreuze','Grabkreuze'),('kreuz','Gedenktafel Kreuz'),('monogramm','Monogramme'),('hausnummer','Hausnummern'),('hinweis','Hinweisschilder'),('boxen','Pferde-/Boxenschilder'),('pferd','Pferde-/Boxenschilder'),('firmen','Firmenschilder'),('praxis','Firmenschilder'),('hochzeit','Hochzeitsschilder'),('willkommen','Willkommensschilder'),('familie','Familienschilder'),('rasse','Rasseschilder'),('hund','Hundeschilder'),('katze','Katzenschilder'),('andenken','Andenkenschilder'),('brettchen','Brettchen'),('gedenk','Gedenktafeln'),('kordel','Kordelschilder')]
THEME={'andenkenschilder':'Andenkenschilder','tiergedenktafeln':'Gedenktafeln Tiere','familienschilder':'Familienschilder','hundeschilder':'Hundeschilder','hinweisschilder':'Hinweisschilder','hundegedenktafeln':'Gedenktafeln Hunde','namensschilder':'Namens-/Türschilder','katzengedenktafeln':'Gedenktafeln Katzen','katzenschilder':'Katzenschilder','willkommensschilder':'Willkommensschilder','gedenktafeln':'Gedenktafeln','hausnummern':'Hausnummern','hochzeitsschilder':'Hochzeitsschilder','pferdeschilder':'Pferde-/Boxenschilder','monogramme':'Monogramme','firmenschilder':'Firmenschilder','geschenkartikel':'Geschenkartikel'}
def serie(p):
    s=p.split('/'); return '/'.join(s[1:5]) if s[1]=='bestand' else s[1]
def linie(p,d,mat):
    s=p.lower()
    if '/bestand/' in s: return 'Bestand (Corel-Altbestand)'
    if 'grabstecker' in s: return 'Grabstecker Edelstahl'
    if 'grabkreuz' in s: return 'Grabkreuze'
    if 'schiefer' in s or 'monogramme-schiefer' in s or (mat=='Schiefer'): return 'Schiefer-Gedenktafeln/-Schilder'
    if 'gedenktafeln-ae' in s: return 'Gedenktafeln AE'
    if 'gedenktafeln-edelstahl' in s: return 'Gedenktafeln Edelstahl'
    if 'acryl-abstandshalter' in s or s.startswith('designs/acryl-a'): return 'Acryl mit Abstandshaltern (AA/AS/S/S)'
    if 'ae-' in s and 'tuer' in s or re.search(r'designs/ae-',s): return 'AE-Türschilder'
    if 'brettchen' in s: return 'Holz-Brettchen'
    if 'edelstahl-gravur' in s or 'hinweise-' in s or 'boxenschilder' in s or 'rasse' in s or 'tr-' in s: return 'Edelstahl-Schilder (+ Acryl 3 mm)'
    if '_testlauf' in s: return 'Testbeispiele (kein Produkt)'
    if mat.startswith('Edelstahl') or mat.startswith('Acryl'): return 'Edelstahl-Schilder (+ Acryl 3 mm)'
    return 'Sonstige'
def uk(p,d):
    if '/bestand/' in p:
        parts=p.split('/'); return 'Bestand: '+parts[2]+(' / '+parts[3] if len(parts)>4 else '')
    th=d.get('themes') or []
    if th: return THEME.get(th[0],th[0])
    s=p.lower()
    if 'schiefer-tiere' in s: return 'Gedenktafeln Tiere'
    if 'menschen' in s: return 'Gedenktafeln Menschen'
    if 'sternenkinder' in s: return 'Gedenktafeln Sternenkinder'
    if '/bestand/' in s:
        parts=p.split('/'); return 'Bestand: '+parts[2]+(' / '+parts[3] if len(parts)>4 else '')
    for k,v in UK:
        if k in s: return v
    return '(unklar)'
def zg(p,d):
    tg=d.get('targetGroup')
    if tg: return tg.capitalize()
    s=p.lower()
    for k,v in [('sternenkind','Sternenkinder'),('menschen','Menschen'),('hunde','Hunde'),('hund','Hunde'),('katze','Katzen'),('pferd','Pferde'),('boxen','Pferde'),('tiere','Tiere')]:
        if k in s: return v
    return '–'
def foto(p,d):
    if d.get('withPhoto') is not None: return 'mit Foto' if d['withPhoto'] else 'ohne Foto'
    s=p.lower()
    if 'mit-foto' in s: return 'mit Foto'
    if 'ohne-foto' in s: return 'ohne Foto'
    ph=d.get('photos') or d.get('photoFiles')
    return 'mit Foto' if ph else 'ohne Foto'
def status(d):
    z=d.get('ziele') or []
    fr=any(isinstance(x,dict) and isinstance(x.get('freigabe'),dict) and x['freigabe'].get('status')=='freigegeben' for x in z) or bool(d.get('freigabe'))
    fam=sorted({x.get('familie') for x in z if isinstance(x,dict) and x.get('familie')})
    return len(z),fr,fam
rows=[];seen=set()
def add(p,d,quelle):
    if p in seen: return
    seen.add(p)
    mat=d.get('material') or ''; mat=MAT.get(mat,mat)
    nz,fr,fam=status(d)
    u=uk(p,d)
    if quelle=='PR #8': u='Rasseschilder PR #8 (Oktober, evtl. überholt)'
    rows.append({'id':d.get('id') or p.split('/')[-2],'pfad':p.rsplit('/',1)[0],'quelle':quelle,'material':mat,'verfahren':d.get('process') or '','linie':linie(p,d,mat),'unterkategorie':u,'zielgruppe':zg(p,d),'form':d.get('form') or '','reihe':d.get('formatreihe') or serie(p),'foto':foto(p,d),'ziele':nz,'familien':', '.join(fam),'freigegeben':'ja' if fr else 'nein','nichtAngeboten':'ja' if d.get('nichtAngeboten') else ''})
main=[l.strip() for l in open('../woche/main-designs.txt')]
for p,d in zip(main,read('origin/main',main)): add(p,d,'main')
O=json.load(open('open.json'))
for pr in sorted(O,key=lambda x:x['n']):
    rev=f"pr/{pr['n']}"; mb=git('merge-base','origin/main',rev).strip()
    if not mb: continue
    added=[l for l in git('diff','--name-only','--diff-filter=A',mb,rev,'--','designs/').split('\n') if l.endswith('/design.json')]
    for p,d in zip(added,read(rev,added)): add(p,d,f"PR #{pr['n']}")
json.dump(rows,open('kategorien.json','w'),ensure_ascii=False)
print(len(rows))
c=collections.Counter((r['linie'],r['unterkategorie']) for r in rows if not r['linie'].startswith('Bestand'))
for k,v in sorted(c.items()): print(v,k)
print('unklar',sum(1 for r in rows if r['unterkategorie']=='(unklar)'), collections.Counter(r['reihe'] for r in rows if r['unterkategorie']=='(unklar)').most_common(10))
