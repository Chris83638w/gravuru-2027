"""Issue 61: twelve authored layouts per breed, derived in every requested catalog size.

Writes only new review series and its manifest. Existing catalog data stays untouched.
Run: python scripts/build-rasse-schilder.py --katalog ../gravuru-katalog
Dependencies: fonttools, svgpathtools. Cat sources: vectorize-rasse-portraits.py.
"""
import argparse, hashlib, json, math, re, xml.etree.ElementTree as ET
from pathlib import Path
from functools import lru_cache
from svgpathtools import parse_path
from fontTools.ttLib import TTFont
from rasse_motif_sources import cat_motifs

NS='{http://www.w3.org/2000/svg}'
BREEDS=[
 ('labrador','Labrador','Balu','labrador-06.svg','dog'),
 ('golden-retriever','Golden Retriever','Milo','golden-retriever-04.svg','dog'),
 ('deutscher-schaeferhund','Deutscher Schäferhund','Rex','deutscher-schaferhund-01.svg','dog'),
 ('dackel','Dackel','Oskar','dackel-04.svg','dog'),
 ('franzoesische-bulldogge','Französische Bulldogge','Bruno','french-bulldog-04.svg','dog'),
 ('britisch-kurzhaar','Britisch Kurzhaar','Luna','britisch-kurzhaar.svg','cat'),
 ('maine-coon','Maine Coon','Nala','maine-coon.svg','cat'),
 ('siam','Siam','Mimi','siam.svg','cat'),
 ('britisch-langhaar','Britisch Langhaar','Bella','britisch-langhaar.svg','cat'),
 ('ragdoll','Ragdoll','Lilly','ragdoll.svg','cat'),
 ('perser','Perser','Leo','perser.svg','cat'),
 ('norwegische-waldkatze','Norwegische Waldkatze','Freya','norwegische-waldkatze.svg','cat'),
 ('sibirische-katze','Sibirische Katze','Mila','sibirische-katze.svg','cat'),
 ('neva-masquerade','Neva Masquerade','Kira','neva-masquerade.svg','cat'),
 ('heilige-birma','Heilige Birma','Lucy','heilige-birma.svg','cat'),
 ('somali','Somali','Fiona','somali.svg','cat'),
 ('bengal','Bengal','Simba','bengal.svg','cat'),
 ('abessinier','Abessinier','Charly','abessinier.svg','cat'),
 ('russisch-blau','Russisch Blau','Mika','russisch-blau.svg','cat'),
 ('chartreux','Chartreux','Oscar','chartreux.svg','cat'),
 ('europaeisch-kurzhaar','Europäisch Kurzhaar','Felix','europaeisch-kurzhaar.svg','cat'),
 ('american-shorthair','American Shorthair','Sammy','american-shorthair.svg','cat'),
 ('exotic-shorthair','Exotic Shorthair','Coco','exotic-shorthair.svg','cat'),
 ('thai','Thai','Nico','thai.svg','cat'),
 ('orientalisch-kurzhaar','Orientalisch Kurzhaar','Zora','orientalisch-kurzhaar.svg','cat'),
 ('tuerkisch-angora','Türkisch Angora','Alba','tuerkisch-angora.svg','cat'),
 ('tuerkisch-van','Türkisch Van','Tara','tuerkisch-van.svg','cat'),
 ('devon-rex','Devon Rex','Loki','devon-rex.svg','cat'),
 ('cornish-rex','Cornish Rex','Momo','cornish-rex.svg','cat'),
 ('sphynx','Sphynx','Cleo','sphynx.svg','cat'),
]
# Separate authored compositions. Portrait box; header/name/breed: x,baseline,size,maxwidth.
# These are artwork choices, never product restrictions or manufacturing tolerances.
LAYOUTS=[
 {'name':'Freundlicher Empfang','fonts':['Comfortaa','Pacifico'],'portrait':[16,18,40,45],'title':[83,29,4.2,45],'pet':[83,44,10,47],'breed':[83,55,3.2,48],'deco':'underline'},
 {'name':'Klassische Begleitung','fonts':['Lora','Cinzel'],'portrait':[66,17,39,46],'title':[38,28,4.4,43],'pet':[38,43,8.7,45],'breed':[38,55,3.2,43],'deco':'doubleline'},
 {'name':'Kleines Medaillon','fonts':['Josefin Sans','Lora'],'portrait':[42,14,36,36],'title':[60,12,4,48],'pet':[60,62,9,62],'breed':[60,69,3.1,68],'deco':'dots'},
 {'name':'Signatur links','fonts':['Montserrat','Caveat'],'portrait':[64,18,42,45],'title':[39,24,4,42],'pet':[39,42,12,44],'breed':[39,57,3.2,44],'deco':'leaf'},
 {'name':'Porträt mit Namenslinie','fonts':['Patrick Hand','Roboto Slab'],'portrait':[17,24,39,39],'title':[60,16,5.4,70],'pet':[81,43,8.6,45],'breed':[81,54,3.2,46],'deco':'nameplate'},
 {'name':'Herzliche Handschrift','fonts':['Lora','Caveat'],'portrait':[43,20,34,35],'title':[60,13,4.3,65],'pet':[60,67,11,67],'breed':[60,76,3,54],'deco':'sides'},
 {'name':'Aufmerksamer Begleiter','fonts':['Bebas Neue','Comfortaa'],'portrait':[16,24,40,40],'title':[60,17,7.2,60],'pet':[82,43,8.2,43],'breed':[82,55,3.2,44],'deco':'underline'},
 {'name':'Ruhige Warnung','fonts':['Cinzel','Lora'],'portrait':[65,23,40,40],'title':[60,17,5,60],'pet':[38,41,9,43],'breed':[38,54,3.2,43],'deco':'doubleline'},
 {'name':'Charmante Mitte','fonts':['Chewy','Montserrat'],'portrait':[41,22,38,37],'title':[60,15,5.6,55],'pet':[60,68,8.8,60],'breed':[60,76,3,54],'deco':'dots'},
 {'name':'Offener Bogen','fonts':['Josefin Sans','Pacifico'],'portrait':[16,17,40,46],'title':[84,27,5,42],'pet':[84,43,10,44],'breed':[84,56,3.2,44],'deco':'arch'},
 {'name':'Typografischer Akzent','fonts':['Roboto Slab','Patrick Hand'],'portrait':[65,17,40,46],'title':[37,26,5.2,42],'pet':[37,43,10,43],'breed':[37,56,3.2,43],'deco':'leaf'},
 {'name':'Persönliches Wappen','fonts':['Montserrat','Cinzel'],'portrait':[40,17,40,40],'title':[60,12,4.5,57],'pet':[60,67,9,60],'breed':[60,76,3,54],'deco':'sides'},
]

def esc(s):return str(s).replace('&','&amp;').replace('<','&lt;').replace('"','&quot;')
def jsave(p,data):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

@lru_cache(maxsize=32)
def paths(file):
    root=ET.parse(file).getroot()
    if any(n.get('transform') for n in root.iter()):raise ValueError('Source transform must be flattened: '+file)
    result=[parse_path(n.get('d')) for n in root.iter(NS+'path') if n.get('d')]
    boxes=[p.bbox() for p in result]
    box=min(b[0] for b in boxes),max(b[1] for b in boxes),min(b[2] for b in boxes),max(b[3] for b in boxes)
    return result,box

@lru_cache(maxsize=24)
def font(file):
    f=TTFont(file);return f.getBestCmap(),f['hmtx'].metrics,f['head'].unitsPerEm

def text_width(file,text,size):
    cmap,metrics,units=font(file)
    return sum(metrics[cmap[ord(ch)]][0] for ch in text)/units*size

@lru_cache(maxsize=256)
def place(file,box,scale=1):
    pp,(x0,x1,y0,y1)=paths(str(file));x,y,w,h=box
    factor=min(w/(x1-x0),h/(y1-y0))*scale
    dx=(x+(w-(x1-x0)*factor/scale)/2)*scale-x0*factor
    dy=(y+(h-(y1-y0)*factor/scale)/2)*scale-y0*factor
    d=' '.join(p.scaled(factor).translated(complex(dx,dy)).d() for p in pp)
    # Absolute coordinates, preserving compound subpaths and nonzero winding.
    d=re.sub(r'-?\d*\.\d+(?:e[+-]?\d+)?',lambda m:format(float(m[0]),'.4f').rstrip('0').rstrip('.') or '0',d)
    return f'<g id="motiv-1"><path fill="#000000" d="{d}"/></g>',[dx+x0*factor,dy+y0*factor,(x1-x0)*factor,(y1-y0)*factor]

def ornaments(style,layout,scale,extra):
    p=[]
    def rect(x,y,w,h):p.append(f'<rect x="{(x+extra)*scale:.3f}" y="{y*scale:.3f}" width="{w*scale:.3f}" height="{h*scale:.3f}" fill="#000000"/>')
    def dot(x,y,r):p.append(f'<circle cx="{(x+extra)*scale:.3f}" cy="{y*scale:.3f}" r="{r*scale:.3f}" fill="#000000"/>')
    tx=layout['pet'][0]
    if style=='underline':rect(tx-13,48.5,26,.38)
    elif style=='doubleline':rect(tx-16,47.5,32,.38);rect(tx-10,49,20,.25)
    elif style=='dots':
        for x in [28,92]:
            for y in [36,40,44]:dot(x,y,.65 if y==40 else .4)
    elif style=='nameplate':rect(tx-19,46.5,38,.4);dot(tx-21,46.7,.65);dot(tx+21,46.7,.65)
    elif style=='sides':rect(27,62,11,.4);rect(82,62,11,.4)
    elif style=='leaf':
        # A simple authored sprig made of closed filled leaves, no clip/bitmap.
        for i in range(3):
            x=tx-9+i*8
            dd=f'M{x} 65 Q{x+1} 60 {x+5} 62 Q{x+4} 65 {x} 65 Z'
            d=parse_path(dd).translated(extra).scaled(scale).d()
            p.append(f'<path fill="#000000" d="{d}"/>')
    elif style=='arch':
        # Outline band expressed as a closed compound path, never a hairline stroke.
        dd='M12 63 V33 C12 19.7452 22.7452 9 36 9 C49.2548 9 60 19.7452 60 33 V63 H59.55 V33 C59.55 19.9937 49.0063 9.45 36 9.45 C22.9937 9.45 12.45 19.9937 12.45 33 V63 Z'
        p.append('<path fill="#000000" d="'+parse_path(dd).translated(extra).scaled(scale).d()+'"/>')
    return '<g id="deko-1">'+''.join(p)+'</g>' if p else ''

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--katalog',required=True);ap.add_argument('--layouts',help='Nur angegebene Layoutnummern nach einer Sichtkorrektur neu erzeugen, z. B. 10');a=ap.parse_args()
    k=Path(a.katalog).resolve();series=json.loads((k/'serien/edelstahl-tuerschilder-2027.json').read_text(encoding='utf-8'))
    font_index={f['name']:k/f['file'] for f in json.loads((k/'schriften/schriften.json').read_text(encoding='utf-8'))['fonts'] if f.get('file')}
    family=json.loads((k/'familien/edelstahl/steel-door-signs.json').read_text(encoding='utf-8'))
    # Actual rows from the source, deduplicated by geometry dimensions (300x200 occurs twice).
    sizes={}
    for s in series['sizes']:
        ratio=s['widthMm']/s['heightMm'];form=s['form']
        if form not in ['OV','RE','AB'] or s['widthMm']<120 or s['heightMm']<80:continue
        if abs(ratio-1.5)>.001 and not(form=='OV' and abs(ratio-1.875)<.001):continue
        if form=='OV' and abs(ratio-1.5)<.001 and s['widthMm']>300:continue
        sizes.setdefault((form,s['widthMm'],s['heightMm']),s)
    manifest={'schema':'gravuru-rasse-review/v1','date':'2026-10-29','sourceIssue':61,'status':'Muster – Freigabe offen','designsPerBreedSize':12,'catSelection':'Auf Nutzervorgabe „weit aus mehr“ auf 25 tatsächlich ausgearbeitete Rassevorschläge erweitert; endgültige Bibliotheksauswahl und Stilfreigabe offen.','sources':{'seriesSha256':digest(k/'serien/edelstahl-tuerschilder-2027.json'),'familySha256':digest(k/'familien/edelstahl/steel-door-signs.json'),'fontsSha256':digest(k/'schriften/schriften.json')},'breeds':[],'designs':[]}
    manifest['schema']='gravuru-rasse-review/v2'
    manifest['catMotifsPerBreed']=12
    manifest['catMotifRequirement']='Nutzervorgabe: immer verschiedene Katzen gesichte / Motive. Zwölf eigenständig gezeichnete Motive pro Rasse; dieselben zwölf Motive in den Größenvarianten.'
    cat_sources={b[0]:cat_motifs(k,b[0]) for b in BREEDS if b[4]=='cat'}
    selected=set(map(int,a.layouts.split(','))) if a.layouts else set(range(1,13))
    if not selected or not selected<=set(range(1,13)):raise ValueError('Layoutnummern müssen 1 bis 12 sein')
    if a.layouts:
        previous=json.loads((k/'auftraege/rasse-schilder-20261029/manifest.json').read_text(encoding='utf-8'))
        if previous['sources']!=manifest['sources'] or previous.get('schema')!=manifest['schema'] or any(digest(k/p['portrait'])!=p['sha256'] for b in previous['breeds'] for p in b.get('motifs',[b])):raise ValueError('Quellen geändert: vollständigen Aufbau ohne --layouts ausführen')
        manifest['designs']=[d for d in previous['designs'] if d['layout'] not in selected]
    index={}
    for bi,(slug,label,pet,filename,animal) in enumerate(BREEDS):
        motif=k/('motive/hunderassen' if animal=='dog' else 'motive-eigene/rasse-schilder-20261029')/filename
        if not motif.exists():raise FileNotFoundError(motif)
        provenance={'breed':slug,'name':label,'animal':animal,'portrait':motif.relative_to(k).as_posix(),'sha256':digest(motif),'origin':'Katalogporträt, proportional unverändert; freundlichste passende Kopfvariante gewählt.' if animal=='dog' else 'Eigene Codex-ImageGen-Illustration, 29.10.2026; binär vektorisiert mit VTracer. Keine fremden Fotos/Stockbilder. Details in motive-eigene/rasse-schilder-20261029/herkunft.json.','sample':True}
        if animal=='cat':provenance['motifs']=cat_sources[slug]
        manifest['breeds'].append(provenance)
        for (form,w,h),s in sizes.items():
            if animal=='cat' and abs(w/h-1.5)>.001:continue
            prefix={'RE':'TRE','AB':'TAE','OV':'TO'}[form]
            row=f'rasse-schilder-{form.lower()}-{w:g}x{h:g}'
            scale=h/80;extra=(w/scale-120)/2
            target=next((x for x in family['sizes'] if x['groupKey']==form and x['widthMm']==w and x['heightMm']==h),None)
            if not target:raise ValueError(f'Family target missing {form}/{w}/{h}')
            for li,layout in enumerate(LAYOUTS):
                if li+1 not in selected:continue
                source=cat_sources[slug][li] if animal=='cat' else provenance
                motif=k/source['portrait']
                number=1001+bi*12+li;did=f'{prefix}-V2A-{w/10:g}x{h/10:g}-D{number}'
                folder=k/'designs'/row/did
                if folder.exists() and not (folder/'design.json').exists():raise ValueError('Unexpected output collision '+str(folder))
                if (folder/'design.json').exists():
                    old=json.loads((folder/'design.json').read_text(encoding='utf-8'))
                    if old.get('rasseReview',{}).get('breed')!=slug or old.get('rasseReview',{}).get('layout')!=li+1:raise ValueError('Kennung belegt: '+did)
                title=('Hier wacht' if animal=='dog' else 'Hier wohnt') if li<6 else 'Achtung'
                # Keep all baseline/portrait positions in a 120x80 composition; wide oval gains whitespace.
                box=list(layout['portrait']);box[0]+=extra
                portrait_markup,portrait_box=place(motif,tuple(box),scale)
                parts=[portrait_markup];text_boxes=[];fonts=layout['fonts'];fields={}
                for ti,(key,text,fname) in enumerate([('title',title,fonts[0]),('pet',pet,fonts[1]),('breed',label,fonts[0])],1):
                    x,y,size,maxw=layout[key];x+=extra
                    # Bottom captions are raised into the oval; not every shape is a rectangle.
                    if y>75:y=75
                    tw=text_width(str(font_index[fname]),text,size)
                    if tw>maxw:size*=maxw/tw
                    if size<3:raise ValueError(f'{did} {text}: below sourced 3mm minimum')
                    x,y,size=x*scale,y*scale,size*scale
                    text_boxes.append({'field':key,'text':text,'font':fname,'x':x,'baseline':y,'sizeMm':size,'widthMm':text_width(str(font_index[fname]),text,size)})
                    parts.append(f'<text id="text-{ti}" data-feld="'+('name' if key=='pet' else key)+f'" x="{x:.4f}" y="{y:.4f}" font-family="{esc(fname)}" font-size="{size:.4f}" text-anchor="middle" fill="#000000">{esc(text)}</text>')
                    fields[f'text-{ti}']={'required':False,'locked':False,'label':{'title':'Spruch','pet':'Tiername','breed':'Rasse / Zusatztext'}[key]}
                parts.append(ornaments(layout['deco'],layout,scale,extra))
                svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:g}mm" height="{h:g}mm" viewBox="0 0 {w:g} {h:g}">\n<title>{esc(label+" · "+layout["name"])}</title>\n'+'\n'.join(parts)+'\n</svg>\n'
                meta={'id':did,'name':label+' · '+layout['name'],'plateMm':[w,h],'material':'Edelstahl','process':'Gravur','form':{'OV':'Oval','RE':'Rechteck','AB':'Rechteck abgerundet'}[form],'themes':['hundeschilder' if animal=='dog' else 'katzenschilder'],'movable':True,'fonts':fonts,'fields':fields,'source':source['portrait'],'motifs':[source['portrait']],'freigabe':None,'ziele':[{'familie':'steel-door-signs','freigabe':None}],'katalog':{'series':row,'key':row+'-D'+str(number),'zielgruppe':'Tiere','unterkategorie':label},'rasseReview':{'breed':slug,'animal':animal,'layout':li+1,'layoutName':layout['name'],'mode':'neu','sampleOnly':True,'sourceVariant':s['skuRoot'],'familySizeKey':target['key'],'motifSha256':source['sha256'],'motifVariant':li+1 if animal=='cat' else 1,'motifName':source.get('name','Katalogporträt'),'portraitBoxMm':portrait_box,'texts':text_boxes,'minStrokeMm':None,'machineApproval':'offen'}}
                # Shape/size derivatives keep their master D-number and provenance.
                master=f'TRE-V2A-12x8-D{number}'
                if did!=master:
                    meta['varianteVon']=master
                    meta['transfer']={'from':master,'fromKey':f'rasse-schilder-re-120x80-D{number}','scale':scale,'offsetMm':[extra*scale,0],'decided':'2026-10-29','by':'Codex/Astra, Nutzerauftrag Issue 61'}
                folder.mkdir(parents=True,exist_ok=True);(folder/'design.svg').write_text(svg,encoding='utf-8');jsave(folder/'design.json',meta)
                item={'id':did,'breed':slug,'animal':animal,'layout':li+1,'form':form,'plateMm':[w,h],'folder':folder.relative_to(k).as_posix(),'familySizeKey':target['key'],'svgSha256':digest(folder/'design.svg'),'motifSource':source['portrait'],'motifSha256':source['sha256'],'motifVariant':li+1 if animal=='cat' else 1}
                manifest['designs'].append(item);index.setdefault(row,[]).append({'id':did,'name':meta['name'],'plateMm':[w,h],'themes':meta['themes']})
    if a.layouts:
        index={}
        for d in manifest['designs']:
            meta=json.loads((k/d['folder']/'design.json').read_text(encoding='utf-8'));row=meta['katalog']['series']
            index.setdefault(row,[]).append({'id':d['id'],'name':meta['name'],'plateMm':meta['plateMm'],'themes':meta['themes']})
    for row,items in index.items():jsave(k/'designs'/row/'index.json',sorted(items,key=lambda i:i['id']))
    jsave(k/'auftraege/rasse-schilder-20261029/manifest.json',manifest)
    print(json.dumps({'breeds':len(manifest['breeds']),'designs':len(manifest['designs']),'series':len(index)},ensure_ascii=False))

if __name__=='__main__':main()
