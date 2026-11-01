#!/usr/bin/env python3
"""Issue 85, user 2026-11-01: publish the approved prefix TR; no releases/import.
72 masters: 69 reference compositions and three new typographic designs.
The acrylic families must already exist (catalogue PR 11 dependency).
"""
import argparse, copy, importlib.util, json, re, subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('round_studies',HERE/'rund-studien.py')
layout=importlib.util.module_from_spec(spec);spec.loader.exec_module(layout)
SERIES='edelstahl-gravur-65x65-rund'
TARGETS=['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']
def read(p): return json.loads(p.read_text(encoding='utf-8-sig'))
def write(p,d): p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes((json.dumps(d,ensure_ascii=False,indent=1)+'\n').encode('utf-8'))
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--katalog',required=True,type=Path);a=ap.parse_args();root=a.katalog
 families={d['id']:d for p in (root/'familien').glob('*/*.json') if (d:=read(p)).get('schema')=='gravuru-product-family/v2'}
 assert all(t in families for t in TARGETS),'Acrylfamilien aus PR 11 fehlen'
 steel=families[TARGETS[0]];sizes=[s['key'] for s in steel['sizes'] if s['groupKey']=='R'];assert len(sizes)==5
 source=root/'designs/edelstahl-gravur-80x80';studies=root/'auftraege/2026-10-31-rund-studien/rund-studien';out=root/'designs'/SERIES
 fonts={f['name']:root/f['file'] for f in read(root/'schriften/schriften.json')['fonts'] if f.get('file')}
 prepared=[];mapping=[]
 for row in read(studies/'zuordnung.json'):
  if not row.get('study'):
   mapping.append({'source':row['source'],'target':None,'status':'ausgenommen','reason':'Welcome laut schriften/README.md ohne Ersatz entfernt (Chris, 23.10.2026).'});continue
  d=read(studies/row['study']/'studie.json');original=read(source/row['source']/'design.json');n=original['designNo']
  d={k:d[k] for k in ['name','plate','plateMm','form','texts','motifs','photos','fonts','deviations']}
  d.update(designNo=n,varianteVon=original['id'],source=original['source'],themes=original['themes'],mode='Referenz',
   transfer={'from':original['id'],'fromKey':original['id'],'scale':None,'offsetMm':None,'mode':'neu komponiert','decided':'2026-11-01','by':'Chris: Ja nimm TR und mach weiter mit Issue 85'})
  if n==25:layout.place_text(d['texts'][0],[23,52,28,3.5],fonts)
  if n==29:layout.place_text(d['texts'][1],[32.5,13,42,4],fonts)
  prepared.append(d)
  mapping.append({'source':original['id'],'target':f'TR-V2A-6.5x6.5-D{n}','mode':'Referenz','fonts':d['fonts'],'motifs':f'{original["id"]}: motiv-1 bis motiv-{len(original["motifs"])}' if original['motifs'] else [],'deviations':d['deviations']})
 # New design ideas without a complete source layout; no new motif or font assets.
 fresh=[
  (74,'Praxis · klare Namenshierarchie',['firmenschilder'],[('PRAXIS','Raleway',[32.5,16,30,4]),('Dr. Miriam','Bellefair',[32.5,30,42,6]),('Winter','Bellefair',[32.5,42,47,10]),('Herzlich willkommen','Raleway',[32.5,53,33,3])]),
  (75,'Zimmer 1 · asymmetrische Orientierung',['hinweisschilder'],[('ZIMMER','Montserrat Light',[30,17,30,4]),('1','Antic Slab',[23,36,19,23]),('Bitte','Montserrat Light',[44,33,15,4]),('eintreten','Montserrat Light',[44,41,21,4])]),
  (76,'Hausnummer 12 · feine Ziffern',['hausnummern'],[('12','Poiret One',[31,28,39,25]),('AM LINDENWEG','Montserrat Light',[32.5,46,39,3.8]),('Familie Berger','Montserrat Light',[32.5,54,30,3])])]
 for n,name,themes,texts in fresh:
  d={'designNo':n,'name':name,'plate':{'widthMm':65,'heightMm':65},'plateMm':[65,65],'form':'Rund','themes':themes,'mode':'neu','source':'ohne Vorlage; neuer typografischer Entwurf nach Design-Master, 2026-11-01','texts':[],'motifs':[],'photos':[],'fonts':list(dict.fromkeys(t[1] for t in texts)),'deviations':[]}
  for text,font,slot in texts:
   t={'text':text,'font':font,'color':'#000000'};layout.place_text(t,slot,fonts)
   # The native editor supports up to 100 mm type. Keep the 200 mm derivative
   # within that existing limit, including the large room/house numerals.
   if t['sizePt']*layout.PT>32:
    factor=32/(t['sizePt']*layout.PT);cx,cy,w,h=slot;layout.place_text(t,[cx,cy,w*factor,h*factor],fonts)
   d['texts'].append(t)
  prepared.append(d);mapping.append({'source':'ohne Vorlage','target':f'TR-V2A-6.5x6.5-D{n}','mode':'neu','fonts':d['fonts'],'motifs':[],'deviations':[]})
 ids={f'TR-V2A-6.5x6.5-D{d["designNo"]}' for d in prepared};assert len(ids)==72
 # Check all existing IDs, including source inventory and series indices, before writing.
 scan=subprocess.run(['rg','--no-ignore','--glob','design.json','--glob','index.json','--files-with-matches',r'"(id|key)"\s*:\s*"TR-V2A-6\.5x6\.5-D\d+"',str(root/'designs')],capture_output=True,text=True,encoding='utf-8')
 assert scan.returncode in (0,1),scan.stderr
 for name in scan.stdout.splitlines():
  p=Path(name)
  assert out.resolve() in p.resolve().parents,f'Kennung belegt: {p}'
 for p in (root/'designs').glob('*/index.json'):
  if p.parent==out:continue
  rows=read(p)
  if isinstance(rows,list):assert not any(r.get('key') in ids for r in rows),f'Indexkollision {p}'
 for d in prepared:
  n=d['designNo'];d.update(id=f'TR-V2A-6.5x6.5-D{n}',material='Edelstahl',process='Gravur',formatreihe='Rund',movable=True,sizes=sizes,ziele=[{'familie':t,'freigabe':None} for t in TARGETS],
   masterSheet={'base':'TR-V2A-6.5x6.5','key':f'TR-V2A-6.5x6.5-D{n}','familySize':sizes[0],'plateMm':[65,65]},
   katalog={'key':f'{SERIES}-D{n}','series':SERIES,'themen':d['themes'],'zielgruppe':'offen','unterkategorie':'offen'})
  d['plate']['source']='Kreis 65 mm aus steel-door-signs, Gruppe R; Issue 85 Nachricht 4'
  dest=out/d['id'];write(dest/'design.json',d);(dest/'design.svg').write_bytes(layout.svg(d).encode('utf-8'))
 index=[{'key':d['id'],'pfad':d['id'],'name':d['name'],'quelle':d.get('varianteVon','ohne Vorlage'),'plateMm':[65,65],'themen':d['themes'],'groessen':sizes,'texte':len(d['texts']),'motive':len(d['motifs']),'schriften':d['fonts'],'modus':d['mode']} for d in prepared]
 write(out/'index.json',index);write(out/'zuordnung.json',mapping)
 print('72 runde Master, 216 offene Materialziele; D14 dokumentiert ausgenommen.')
if __name__=='__main__':main()
