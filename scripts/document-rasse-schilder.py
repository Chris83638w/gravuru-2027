"""Register own review motifs and produce a traceable size/design matrix (Issue 61)."""
import argparse,csv,hashlib,json,xml.etree.ElementTree as ET
from pathlib import Path
from rasse_motif_sources import cat_motifs

def save(p,value):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--katalog',required=True);a=ap.parse_args();k=Path(a.katalog)
    order=k/'auftraege/rasse-schilder-20261029';m=json.loads((order/'manifest.json').read_text(encoding='utf-8'))
    regpath=k/'motive-eigene/motive-eigene.json';registry=json.loads(regpath.read_text(encoding='utf-8'))
    motifs=[];prefix='rasse-schilder-20261029-';ns='{http://www.w3.org/2000/svg}'
    names={b['breed']:b['name'] for b in m['breeds']}
    for b in m['breeds']:
        if b['animal']!='cat':continue
        sources=cat_motifs(k,b['breed'])
        if b.get('motifs')!=sources:raise ValueError(b['breed']+': manifest/source mismatch')
        for source in sources:
            first=next(d for d in m['designs'] if d['breed']==b['breed'] and d['form']=='RE' and d['plateMm']==[120,80] and d['layout']==source['variant'])
            key=prefix+b['breed']+('' if source['variant']==1 else f'-{source["variant"]:02d}')
            motifs.append({'key':key,'name':b['name']+' · '+source['name'],'thema':'Rasse-Schilder','file':Path(source['portrait']).relative_to('motive-eigene').as_posix(),'sha256':source['sha256'],'herkunft':{'ki':'Codex ImageGen / Astra','datum':'2026-10-29','auftrag':'gravuru-2027#61; Nutzervorgabe: immer verschiedene Katzen gesichte / Motive','quelle':source['sourceFile'],'sourceSha256':source['sourceSha256'],'status':'Vektorisierter Originalentwurf, keine Fertigungsfreigabe'},'design':first['id'],'kundenkonfi':False})
    # The seven original ornaments are separate editable motif layers as well.
    for layout,style in [(1,'underline'),(2,'doubleline'),(3,'dots'),(4,'leaf'),(5,'nameplate'),(6,'sides'),(10,'arch')]:
        entry=next(d for d in m['designs'] if d['breed']=='labrador' and d['form']=='RE' and d['plateMm']==[120,80] and d['layout']==layout)
        xml=ET.parse(k/entry['folder']/'design.svg').getroot();node=next(n for n in xml if n.get('id')=='deko-1')
        target=k/'motive-eigene/rasse-schilder-20261029'/('deko-'+style+'.svg');ET.register_namespace('','http://www.w3.org/2000/svg')
        root=ET.Element(ns+'svg',{'viewBox':'0 0 120 80'});root.append(node);ET.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
        motifs.append({'key':prefix+'deko-'+style,'name':'Rasse-Schilder · '+style,'thema':'Rasse-Schilder','file':target.relative_to(k/'motive-eigene').as_posix(),'sha256':sha(target),'herkunft':{'ki':'Codex/Astra','datum':'2026-10-29','auftrag':'gravuru-2027#61','quelle':'scripts/build-rasse-schilder.py: ornaments (eigene geschlossene Vektorformen)'},'design':entry['id'],'kundenkonfi':False})
    registry['motifs']=[r for r in registry['motifs'] if not r['key'].startswith(prefix)]+motifs;registry['count']=len(registry['motifs']);save(regpath,registry)
    rows=[];errors=[];by_size={};signatures={};cat_motif_sets={}
    source_hashes={(b['breed'],p.get('variant',1)):p['sha256'] for b in m['breeds'] for p in b.get('motifs',[b])}
    for b in m['breeds']:
        for p in b.get('motifs',[b]):
            if sha(k/p['portrait'])!=p['sha256']:errors.append(b['breed']+': source checksum')
    for d in m['designs']:
        folder=k/d['folder'];meta=json.loads((folder/'design.json').read_text(encoding='utf-8'));svg=folder/'design.svg';root=ET.parse(svg).getroot()
        if sha(svg)!=d['svgSha256']:errors.append(d['id']+': checksum')
        variant=d['layout'] if d['animal']=='cat' else 1
        if meta['rasseReview']['motifSha256']!=source_hashes[(d['breed'],variant)] or d['motifSha256']!=source_hashes[(d['breed'],variant)]:errors.append(d['id']+': motif source mismatch')
        if sha(k/meta['source'])!=d['motifSha256']:errors.append(d['id']+': motif file mismatch')
        if any(n.get('fill') not in [None,'black','#000','#000000'] or n.get('stroke') not in [None,'none'] for n in root.iter()):errors.append(d['id']+': unexpected paint')
        if meta.get('freigabe') is not None or any(z['freigabe'] is not None for z in meta['ziele']):errors.append(d['id']+': unexpected approval')
        texts=list(root.iter(ns+'text'))
        if len(texts)!=3 or any(n.tag in [ns+'image',ns+'script'] for n in root.iter()):errors.append(d['id']+': noneditable or raster content')
        if any(float(t.get('font-size'))<3 for t in texts):errors.append(d['id']+': text minimum')
        if meta['plateMm']!=d['plateMm']:errors.append(d['id']+': dimensions')
        signature=tuple((t.get('x'),t.get('y'),t.get('font-family'),t.get('font-size')) for t in texts)
        key=(d['breed'],d['form'],*d['plateMm']);by_size.setdefault(key,[]).append(d['layout']);signatures.setdefault(key,set()).add(signature)
        if d['animal']=='cat':cat_motif_sets.setdefault(key,set()).add(d['motifSha256'])
        rows.append({'id':d['id'],'rasse':names[d['breed']],'tier':d['animal'],'form':d['form'],'breite_mm':d['plateMm'][0],'hoehe_mm':d['plateMm'][1],'layout':d['layout'],'name':meta['rasseReview']['layoutName'],'modus':'neu' if 'varianteVon' not in meta else 'proportionale Variante','master':meta.get('varianteVon',d['id']),'vorlage':'ohne bestehende Schildvorlage','motivnummer':variant,'motivname':meta['rasseReview']['motifName'],'motivquelle':meta['source'],'motiv_sha256':d['motifSha256'],'schriften':' / '.join(meta['fonts']),'freigabe':'offen','svg_sha256':d['svgSha256'],'ordner':d['folder']})
    for key,layouts in by_size.items():
        if sorted(layouts)!=list(range(1,13)) or len(signatures[key])!=12:errors.append(str(key)+': must have 12 distinct layouts')
    for key,hashes in cat_motif_sets.items():
        if len(hashes)!=12:errors.append(str(key)+': must have 12 distinct cat motifs')
    with (order/'design-matrix.csv').open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    summary={'designs':len(rows),'breedSizeFormCombinations':len(by_size),'dogBreeds':sum(b['animal']=='dog' for b in m['breeds']),'catBreeds':sum(b['animal']=='cat' for b in m['breeds']),'ownMotifs':len(motifs),'catMotifs':sum(len(b.get('motifs',[])) for b in m['breeds'] if b['animal']=='cat'),'catCombinationsWith12DistinctMotifs':sum(len(h)==12 for h in cat_motif_sets.values()),'allHave12DistinctLayouts':not errors,'allCatsHave12DistinctMotifs':bool(cat_motif_sets) and all(len(h)==12 for h in cat_motif_sets.values()),'errors':errors}
    save(order/'integrity.json',summary);print(json.dumps(summary,ensure_ascii=False))
    if errors:raise SystemExit(1)
if __name__=='__main__':main()
