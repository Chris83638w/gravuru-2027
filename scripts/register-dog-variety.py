"""Register own dog motifs without exposing them in the customer motif library."""
import argparse,json,re,hashlib,collections
from pathlib import Path
ap=argparse.ArgumentParser();ap.add_argument('catalog',type=Path);a=ap.parse_args();cat=a.catalog
def read(p):return json.loads(p.read_text(encoding='utf8'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8',newline='\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
folder=cat/'motive-eigene/hunde-vielfalt-20261102';records=read(folder/'herkunft.json');manifest=read(cat/'auftraege/rasse-15x10-20261102/manifest.json');idxpath=cat/'motive-eigene/motive-eigene.json';index=read(idxpath)
uses=collections.defaultdict(list);pawuses=[];breeds=collections.defaultdict(list);styles=collections.defaultdict(collections.Counter);recordByPath={r['portrait']:r for r in records}
for row in manifest['designs']:
 d=read(cat/row['folder']/'design.json');uses[d['source']].append(d['id'])
 if d['rasseReview'].get('pawAccent'):pawuses.append(d['id'])
 if row['animal']=='dog':
  breeds[row['breed']].append(sha(cat/d['source']))
  r=recordByPath.get(d['source'])
  if r:
   fine=(r['breed']=='deutscher-schaeferhund' and r['variant'] in (2,3,4,5,11,12)) or (r['breed']!='deutscher-schaeferhund' and r['variant'] in (2,5,8,11))
   styles[row['breed']]['fein/naturgetreu' if fine else 'suess/verspielt']+=1
for r in records:
 if not r['portrait'].startswith('motive-eigene/hunde-vielfalt-20261102/'):continue
 item={'key':r['key'],'name':r['breed']+' · Motiv '+str(r['variant']),'thema':'hundeschilder','file':r['portrait'].removeprefix('motive-eigene/'),'sha256':sha(cat/r['portrait']),'herkunft':'Codex built-in ImageGen, 02.11.2026; eigene Illustration, VTracer-Näherung. Quelle/Prompt in hunde-vielfalt-20261102/herkunft.json; freigegebene Stilreferenz Chris 02.11.2026.','design':uses[r['portrait']],'kundenkonfi':False}
 index['motifs']=[m for m in index['motifs'] if m['key']!=r['key']]+[item]
paw=re.search(r"paw=parse_path\('([^']+)'\)",Path(__file__).with_name('build-rasse-15x10.py').read_text(encoding='utf8'))[1]
pf=folder/'pfoten-akzent.svg';pf.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 10"><path fill="#000000" d="'+paw+'"/></svg>\n',encoding='utf8',newline='\n')
key='hunde-vielfalt-pfoten-akzent';index['motifs']=[m for m in index['motifs'] if m['key']!=key]+[{'key':key,'name':'Kleine Pfotenspur','thema':'hundeschilder','file':pf.relative_to(cat/'motive-eigene').as_posix(),'sha256':sha(pf),'herkunft':'Codex, neue native Vektorzeichnung nach Chris 02.11.2026: gelegentlich Pfötchen ergänzen.','design':pawuses,'kundenkonfi':False}]
index['count']=len(index['motifs']);save(idxpath,index)
complete=[b for b,hashes in breeds.items() if len(set(hashes))==12 and len(styles[b])>=2]
report={'instruction':'Zwölf unterschiedliche Hundemotive je Rasse; innerhalb jeder Rasse feine naturgetreue Portraits, süße und verspielte Motive mischen. Gesamtbild hat Vorrang. Katzen unverändert.','meaning':'completedBreeds bezeichnet die vollständige Motivzuordnung mit Stil-Mischung, keine Produktionsfreigabe.','completedBreeds':complete,'pendingBreeds':[b for b in breeds if b not in complete],'uniqueDogMotifsPerBreed':{b:len(set(hashes)) for b,hashes in breeds.items()},'stylesPerBreed':dict(styles),'pawDesigns':pawuses,'freigabe':None}
save(cat/'auftraege/rasse-15x10-20261102/hunde-vielfalt-status.json',report);print(json.dumps({'registeredOwnDogMotifs':len(records),'completedBreeds':len(report['completedBreeds']),'pendingBreeds':len(report['pendingBreeds'])}))
