"""Issue 85: reviewed stock horse layouts, explicit deduplication, no import/release.

Uses the existing stock converter. Missing fonts and damaged source copies stay open.
The first three original designs required by DESIGN-MASTER were already supplied as
D79–D81 in #63; this stock package does not duplicate them.
"""
import argparse, importlib.util, json, re, shutil, tempfile, subprocess
from pathlib import Path
import xml.etree.ElementTree as ET
from fontTools.svgLib.path import parse_path
from fontTools.pens.svgPathPen import SVGPathPen

p=argparse.ArgumentParser();p.add_argument('--katalog',required=True);p.add_argument('--out',required=True)
a=p.parse_args();root=Path(a.katalog).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('read-bestand-designs.py'))
stock=importlib.util.module_from_spec(spec);spec.loader.exec_module(stock)
src=root/'designs/bestand/boxenschilder';folders={p.parent.name:p.parent for p in src.rglob('design.json')}
registry=json.loads((root/'schriften/schriften.json').read_text(encoding='utf-8'))
replacements={f['from']:f['to'] for f in registry['replacements']};files=stock.font_files(root)
groups=[
 ('BS-A-D3',['BS-AV2A-D1','BS-KS-D2']),('BS-A-D4',['BS-KS-D3']),
 ('BS-A-D2',['BS-KS-D1','BS-S-D6']),('BS-A-D1',['BS-AV2A-D2','BS-KS-D0','BS-S-D5']),
 ('BS-AV2A-D3',['BS-KS-D5','BS-S-D4']),('BS-A-D14',['BS-S-D10']),
 ('BS-A-D8',['BS-S-D9']),('BS-A-D12',['BS-S-D12']),('BS-A-D10',['BS-S-D15']),
 ('BS-A-D9',['BS-S-D17']),('BS-A-D13',['BS-S-D14']),('BS-KS-D4',['BS-S-D1']),
 ('BS-A-D11',['BS-S-D11']),
 *[(f'BSUV-A-D{n}',[f'BSUV-AD-D{n}']) for n in [1,2,3,4,6,7,25,26,27]],
 ('BSUV-A-D19',['BSUV-AV2A-D11']),('BSUV-A-D11',['BSUV-AV2A-D10']),
 ('BSUV-A-D20',['BSUV-A-D21'])]
canonical={key:master for master,others in groups for key in [master,*others]}
existing={'BS-A-D8':'TRE-V2A-12x8-D74','BS-A-D14':'TRE-V2A-12x8-D75','BS-A-D12':'TRE-V2A-12x8-D76'}
chosen=['BS-A-D1','BS-A-D9','BS-A-D10','BS-A-D13','BS-AV2A-D3','BS-KS-D4','BSUV-A-D28','BSUV-A-D29','BSUV-A-D30','BS-V2A-D3','BS-V2A-D6','BS-V2A-D7','BS-V2A-D9']
# Fictional examples: distinct horses and contacts; no copied stock phone numbers.
samples={
 'BS-A-D1':('Aurelia','Nora Sommer'), 'BS-A-D9':('Nordwind','Jonas Winter'),
 'BS-A-D10':('Sternentanz','Mara Linden'), 'BS-A-D13':('Bellissimo','Lena Faber'),
 'BS-AV2A-D3':('Falkenherz','Milan Berger'), 'BS-KS-D4':('Rosalie','Lina West'),
 'BSUV-A-D28':('Valentina','Noah Seidel'), 'BSUV-A-D29':('Finja','Mia Kern'),
 'BSUV-A-D30':('Saphira','Luca Frank'), 'BS-V2A-D3':('Velvet','Jule Sand'),
 'BS-V2A-D6':('Merlin','Finn Falk'), 'BS-V2A-D7':('Donatello','Alina Stein'), 'BS-V2A-D9':('Allegra','Lea König')}
family=json.loads((root/'familien/edelstahl/steel-door-signs.json').read_text(encoding='utf-8'))
rows=[];index=[];converted={}
# No silent overwrite, including collisions with the stock IDs.
candidate_ids=[json.loads((folders[key]/'design.json').read_text(encoding='utf-8'))['id'].rsplit('-D',1)[0].rsplit('-',1)[0]+('-15x8-D' if key.startswith('BS-V2A') else '-8x5-D')+str(json.loads((folders[key]/'design.json').read_text(encoding='utf-8'))['katalog']['designNo']) for key in chosen]
# The catalog has very large stock JSON files. Search the exact candidate IDs first,
# then parse matching JSON, rather than loading the entire unrelated stock library.
search=subprocess.run(['git','grep','-l','-F',*[v for did in candidate_ids for v in ['-e',did]],'--','designs/**/design.json','designs/**/index.json'],cwd=root,capture_output=True,text=True,encoding='utf-8')
assert search.returncode in [0,1],search.stderr
all_ids=set()
for name in search.stdout.splitlines():
 content=json.loads((root/name).read_text(encoding='utf-8'))
 if isinstance(content,dict):all_ids.add(content.get('id'))
 elif isinstance(content,list):all_ids.update(x.get('key') for x in content if isinstance(x,dict))
for key in chosen:
 folder=folders[key];meta=json.loads((folder/'design.json').read_text(encoding='utf-8'))
 oval=key.startswith('BS-V2A');plate=[150,80] if oval else [80,53.3]
 series='boxenschilder-gravur-oval-150x80' if oval else 'boxenschilder-gravur-80x53';dest=root/'designs'/series;dest.mkdir(parents=True,exist_ok=True)
 sizes=[s['key'] for s in family['sizes'] if (s['groupKey']=='OV' and abs(s['widthMm']/s['heightMm']/1.875-1)<=.01 if oval else s['groupKey']=='RE' and abs(s['widthMm']/s['heightMm']/1.5-1)<=.01)]
 assert all(replacements.get(f,f) in files for f in meta['fonts']),key
 prefix=meta['id'].rsplit('-D',1)[0].rsplit('-',1)[0]+('-15x8' if oval else '-8x5');did=prefix+'-D'+str(meta['katalog']['designNo'])
 assert did not in all_ids or did==meta['id'] or (dest/did/'design.json').is_file(),f'Kennung belegt: {did}'
 # Strip only the full plate/bleed rectangles, never ornaments or motif paths.
 with tempfile.TemporaryDirectory() as tmp:
  clean=Path(tmp);shutil.copy(folder/'design.json',clean/'design.json');tree=ET.parse(folder/'design.svg');svg=tree.getroot();removed=[]
  W,H=meta['plate']['widthMm'],meta['plate']['heightMm']
  if oval:
   # The old reader cropped a centre-origin Corel canvas to its upper-right
   # quadrant/ink bounds. Use the existing 150x80 oval family; keep every design
   # element and recompose below. Red cutting/drilling paths are technical guides.
   dx=75 if W==75 else 10
   for el in svg.iter():
    if el.tag.endswith('path') and el.get('d'):el.set('d',stock.transform_path(el.get('d'),1,dx,0))
    if el.tag.endswith(('text','tspan')) and el.get('x'):el.set('x',str(float(el.get('x'))+dx))
   cleaned_meta=dict(meta,plate={'widthMm':150,'heightMm':80,'source':'Referenz auf vorhandene Oval-Familie 150x80; alte Lesekopie angeschnitten'})
   (clean/'design.json').write_text(json.dumps(cleaned_meta,ensure_ascii=False),encoding='utf-8')
   svg.set('viewBox','0 0 150 80');W,H=150,80
  for parent in svg.iter():
   for el in list(parent):
    if el.tag.endswith('path') and (el.get('id') or '').startswith('motiv'):
     if el.get('stroke')=='#ff0000' and el.get('fill') in [None,'none']:removed.append(el.get('id'));parent.remove(el);continue
     if re.search('[Aa]',el.get('d','')):
      pen=SVGPathPen(None);parse_path(el.get('d'),pen);el.set('d',pen.getCommands())
     b=stock.path_box(el.get('d',''))
     plate_rect=b and len(el.get('d',''))<150 and el.get('fill') not in [None,'none'] and b[2]>=W*.9 and b[3]>=H*.9
     if b and (b[2]>=W*.97 and b[3]>=H*.97 or plate_rect):
      removed.append(el.get('id'));parent.remove(el)
  tree.write(clean/'design.svg',encoding='utf-8')
  stock.OUT=dest;d=stock.convert(clean,plate,prefix,replacements,files)
 original_main=max(d['texts'],key=lambda t:t['sizePt'])['text'];horse,owner=samples[key]
 for t in d['texts']:
  if t['text']==original_main:t['text']=horse
  t['text']=re.sub(r'(Besitzer(?:in)?\s*:\s*)([^\n,]+)',lambda m:m[1]+owner,t['text'])
  t['text']=re.sub(r'(?<!\d)(?:0[\d /-]{7,}\d)(?!\d)','030 23125 000',t['text'])
  t['color']='#000000'
 # Replace all residual source contact names, retain pedigree names and labels.
 for t in d['texts']:
  t['text']=t['text'].replace('Paul Hoffmann','Dr. Robin Tal').replace('Dr. Feldmann','Dr. Robin Tal').replace('Dr. Mindner','Dr. Robin Tal').replace('Dr. Wolf','Dr. Robin Tal').replace('Ralf Zimmermann',owner).replace('Dr. Wiechmann','Dr. Robin Tal')
 for m in d['motifs']:
  for q in m['paths']:
   if q['fill']:q['fill']='#000000'
   if q['stroke']:q['stroke']='#000000'
 d.update(name=horse+' · '+{'BS-A-D1':'Mehrgenerationen','BS-A-D9':'Galoppranke','BS-A-D10':'Stammbaum','BS-A-D13':'Herkunftskreis','BS-AV2A-D3':'Lorbeer','BS-KS-D4':'Pferdeprofil','BSUV-A-D28':'Futterplan','BSUV-A-D29':'Doppelwappen','BSUV-A-D30':'Pferdekopf','BS-V2A-D3':'Shetlandpony','BS-V2A-D6':'Holsteiner','BS-V2A-D7':'Steigendes Pferd','BS-V2A-D9':'Futterhinweis'}[key],themes=['pferdeschilder'],sizes=sizes,form='Oval' if oval else 'Rechteck',process='Gravur',freigabe=None,ziele=[{'familie':fid,'freigabe':None} for fid in ['steel-door-signs','acryl-3mm-tuerschilder-schwarz','acryl-3mm-tuerschilder-anthrazit']],varianteVon=None if did==meta['id'] else meta['id'])
 if d['varianteVon'] is None:del d['varianteVon']
 d['source']='designs/bestand/boxenschilder/'+folder.relative_to(src).as_posix()
 d['katalog']={'key':did,'series':series,'themen':['pferdeschilder']}
 d['transfer'].update(decided='2026-11-01',by='Nutzerauftrag Issue 85',fromKey=key)
 d['review']={'mode':'Referenz','sourceId':meta['id'],'sourcePath':d['source'],'platePathsRemoved':removed,'exampleData':'fiktiv; Kontakt: BNetzA-Drama-Nummer 030 23125 000','acrylTargets':'Abhängigkeit: Katalog-PR 11, Familienstand 489fd3292','defaultMounting':'K00 – ohne Befestigung','note':'Vorlagenanordnung und Motivpfade erhalten; Beispieltexte ausgetauscht; UV-Vorlagen einfarbig für Gravur. Kleinster Master 80 × 53,3 mm, historische Formatkennung 8x5.'}
 tgt=dest/did;tgt.mkdir(exist_ok=True)
 (tgt/'design.svg').write_text(stock.rpd.design_svg(d),encoding='utf-8')
 (tgt/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
 shutil.copy(folder/'preview.png',tgt/'original.png')
 d['review']['nominalSourceCanvas']='150 × 80 mm laut BS-V2A-15x8; Referenz neu komponiert' if oval else '300 × 200 mm bzw. UV-Beschnitt'
 (tgt/'design.json').write_text(json.dumps(d,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
 converted[key]=did;index.append({'key':did,'name':d['name'],'pfad':did,'quelle':key,'plateMm':plate,'groessen':sizes,'themen':['pferdeschilder'],'schriften':d['fonts'],'mode':'Referenz','freigabe':None,'series':series})
 print(did,len(d['texts']),len(d['motifs']),d['fonts'])
for key,folder in sorted(folders.items()):
 meta=json.loads((folder/'design.json').read_text(encoding='utf-8'));master=canonical.get(key,key)
 source_meta=json.loads((folders[master]/'design.json').read_text(encoding='utf-8'))
 missing=[f for f in source_meta['fonts'] if replacements.get(f,f) not in files]
 target=converted.get(master) or existing.get(master)
 if key!=master:status='Dubletten-Zuordnung';reason='Sichtvergleich: Material-/Farb-/Befestigungsfassung desselben Layouts; Master bevorzugt V2A, sofern passende Vorlage vorhanden.'
 elif master in existing:status='Bereits #63';reason='Vorlage bereits in D74–D76 übernommen; keine zweite Fassung.'
 elif target:status='Übernommen';reason='Editierbarer Master, Vorlagenmotive erhalten, eigene Beispieldaten, offene Freigabe.'
 else:
  status='Offen';reason='; '.join((['Schrift fehlt: '+', '.join(missing)] if missing else [])+(['Alte Lesekopie: angeschnittene/unklare Kontur; Originalbogen erforderlich.'] if master.startswith('BS-V2A') else ['Foto-/UV-/Schiefer-/Sonderkontur-Quelle vor Übernahme einzeln klären; kein unbrauchbarer Platzhalter als Gravurmotiv.']))
 rows.append({'bestandKey':key,'bestandId':meta['id'],'quelle':folder.relative_to(root).as_posix(),'master':master,'ziel':target,'status':status,'begruendung':reason,'fontsMissing':missing,'freigabe':None})
for serie in sorted({e['series'] for e in index}):
 (root/'designs'/serie/'index.json').write_text(json.dumps([e for e in index if e['series']==serie],ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
(out/'zuordnung.json').write_text(json.dumps(rows,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
(out/'zusammenfassung.json').write_text(json.dumps({'quellen':len(rows),'neueMaster':len(index),'geometrischeVarianten':sum(len(e['groessen']) for e in index),'status':{s:sum(r['status']==s for r in rows) for s in sorted({r['status'] for r in rows})},'fehlendeSchriften':sorted({f for r in rows for f in r['fontsMissing']})},ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
