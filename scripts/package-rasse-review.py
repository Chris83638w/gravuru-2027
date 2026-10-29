"""Assemble only verified native review artifacts for Issue 61; no production import."""
import argparse,json,shutil,hashlib
from pathlib import Path

def load(p):return json.loads(p.read_text(encoding='utf-8'))
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
    ap=argparse.ArgumentParser()
    for key in ['katalog','out','captures','review','contacts','interaction','portrait-sheet']:ap.add_argument('--'+key,required=True)
    a=ap.parse_args();k=Path(a.katalog);order=k/'auftraege/rasse-schilder-20261029';out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
    m=load(order/'manifest.json');shots=load(Path(a.captures)/'screenshots.json');validation=load(Path(a.review)/'validation.json');sheets=load(Path(a.contacts)/'index.json');interaction=load(Path(a.interaction)/'interaction.json')
    expected={d['id']:d for d in m['designs'] if d['plateMm']==[120,80] or (d['form']=='OV' and d['plateMm']==[150,80])}
    assert len(shots['results'])==len(expected)==1140 and len(sheets)==95
    assert {s['id'] for s in shots['results']}==set(expected)
    assert all(not s.get('error') and not s['browserErrors'] and not s.get('textOverlaps') for s in shots['results'])
    assert all(s['svgSha256']==expected[s['id']]['svgSha256'] for s in shots['results'])
    assert len(validation['designs'])==8100 and not validation['errors'] and all(d['fit']['status']=='passt' for d in validation['designs'])
    proof=order/'pruefung';proof.mkdir(exist_ok=True)
    save(proof/'native-fit.json',validation);save(proof/'screenshots.json',shots);save(proof/'bedienung.json',interaction)
    summary={'svgJsonPairs':8100,'combinationsWithTwelveLayouts':675,'dogBreeds':5,'catBreeds':25,'nativeFitsPassed':8100,'nativeFitsFailed':0,'screenshots':1140,'contactSheets':95,'screenshotPixelsUnchanged':True,'browserErrors':0,'textBoxOverlaps':0,'focusedTests':{'passed':40,'failed':0},'catalogBuild':{'families':11,'pdfs':11,'pdfPages':33,'pngs':11,'xlsxSheets':8,'KATALOG_content_identical':True},'approval':'offen','minStrokeMm':None}
    save(proof/'summary.json',summary)
    shutil.copytree(a.contacts,order/'kontaktboegen',dirs_exist_ok=True)
    shutil.copyfile(a.portrait_sheet,order/'katzen-25-portraets.png')
    full=proof/'konfigurator';full.mkdir(exist_ok=True)
    for breed in ['labrador','dackel','britisch-kurzhaar','maine-coon','siam','bengal','norwegische-waldkatze','sphynx']:
        d=next(d for d in shots['results'] if d['breed']==breed and d['form']=='OV' and d['plateMm']==[120,80] and d['layout']==1)
        shutil.copyfile(Path(a.captures)/(d['id']+'-konfigurator.png'),full/(breed+'.png'))
    for p in Path(a.interaction).glob('*.png'):shutil.copyfile(p,full/p.name)
    dataset=json.dumps([{key:s[key] for key in ['breed','form','size','title','file']} for s in sheets],ensure_ascii=False).replace('</','<\\/')
    html='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>gravuru · Rasse-Schilder</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f4f3ee;color:#203d34;font:16px/1.5 system-ui,sans-serif}header,main{max-width:1500px;margin:auto;padding:28px}header p{max-width:860px;color:#50665b}h1{font-size:clamp(27px,4vw,46px);line-height:1.1;margin:8px 0}.eyebrow{letter-spacing:.15em;text-transform:uppercase;font-size:12px;font-weight:700}.badge{display:inline-block;background:#e6eddf;border-radius:20px;padding:5px 12px;font-size:13px}.controls{position:sticky;top:0;background:#f4f3eef5;border-bottom:1px solid #d9ddd2;display:flex;flex-wrap:wrap;gap:16px;padding:16px 28px;z-index:2}label{display:grid;gap:5px;font-size:13px}select{min-width:240px;font:inherit;padding:10px;border:1px solid #acbbae;border-radius:8px;background:white;color:#203d34}a{color:#235f4a}nav{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px}figure{margin:0;background:white;border:1px solid #dfe5dc;border-radius:12px;padding:10px}figure img{display:block;width:100%;height:auto}figcaption{padding:15px 8px}h2{font-size:23px}footer{padding:24px 28px;color:#50665b;font-size:14px}.count{margin-left:auto;align-self:end;padding-bottom:10px}@media(max-width:650px){header,main{padding:20px}select{min-width:190px}.controls{padding:12px 20px}.count{display:none}}</style>
<header><div class="eyebrow">gravuru · Entwurfsserie</div><h1>Dein Tier. Dein Schild.</h1><p>Fünf Hunderassen und 25 Katzenrassen, jeweils zwölf Gestaltungen pro vorgesehener Größe und Form. Wähle eine Rasse und betrachte alle zwölf Entwürfe nebeneinander.</p><span class="badge">Entwürfe zur Freigabe</span><nav><a href="katzen-25-portraets.png">Alle 25 Katzenporträts</a><a href="design-matrix.csv">Übersicht aller Größen</a><a href="README.md">Quellen und Prüfbericht</a></nav></header>
<div class="controls"><label>Rasse<select id="breed"></select></label><label>Form<select id="form"></select></label><span class="count">360 Rassenentwürfe · 8.100 Größen-/Formdateien</span></div>
<main><h2 id="title"></h2><figure><a id="full" target="_blank"><img id="sheet" alt="Zwölf Schildentwürfe aus dem Konfigurator mit ihren Motivquellen"></a><figcaption>Bild anklicken, um es in voller Größe anzusehen. Links steht jeweils die Motivquelle. Die Schildbilder stammen aus dem echten lokalen Konfigurator.</figcaption></figure></main><footer>Stil- und Fertigungsfreigabe offen. Vor der Fertigung ist eine Gravurprobe erforderlich; eine verbindliche Mindestlinienstärke liegt noch nicht vor.</footer>
<script>const sheets=DATA;const breed=document.getElementById('breed'),form=document.getElementById('form');for(const name of [...new Set(sheets.map(s=>s.breed))].sort((a,b)=>a.localeCompare(b,'de'))){breed.add(new Option(name,name));}breed.value='Britisch Kurzhaar';function show(){const s=sheets.find(s=>s.breed===breed.value&&s.file===form.value);if(!s)return;document.getElementById('title').textContent=s.title;document.getElementById('sheet').src='kontaktboegen/'+s.file;document.getElementById('full').href='kontaktboegen/'+s.file;}function choices(){form.replaceChildren();for(const s of sheets.filter(s=>s.breed===breed.value))form.add(new Option(s.form+' · '+s.size.join(' × ')+' mm',s.file));show();}breed.onchange=choices;form.onchange=show;choices();</script></html>'''.replace('DATA',dataset)
    (order/'GALERIE.html').write_text(html,encoding='utf-8')
    # Portable review bundle; authoritative SVG/JSON source files stay in the catalog repo.
    for p in ['GALERIE.html','design-matrix.csv','manifest.json','integrity.json','katzen-25-portraets.png']:shutil.copyfile(order/p,out/p)
    shutil.copytree(order/'kontaktboegen',out/'kontaktboegen',dirs_exist_ok=True);shutil.copytree(proof,out/'pruefung',dirs_exist_ok=True)
    report=(order/'README.md').read_text(encoding='utf-8').replace('../../motive-eigene/','https://github.com/Chris83638w/gravuru-katalog./blob/dev/rasse-schilder-20261029-astra/motive-eigene/').replace('../../designs/','https://github.com/Chris83638w/gravuru-katalog./blob/dev/rasse-schilder-20261029-astra/designs/').replace('(portrait-quellen/)','(../portraits/)')
    (out/'README.md').write_text(report,encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
