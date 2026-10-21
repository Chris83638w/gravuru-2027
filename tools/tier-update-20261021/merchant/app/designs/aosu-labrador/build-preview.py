"""Build an isolated editable specimen from the verified Variante M reference.
Reference files and the original archive are read-only inputs.
"""
from pathlib import Path
import json, re, shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REF = ROOT / 'references/aosu-upgrade-2026-09-21/verification'
PREVIEW = HERE / '.preview'
PREVIEW.mkdir(exist_ok=True)
ASSETS = PREVIEW / 'assets'
ASSETS.mkdir(exist_ok=True)
def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

# Use the approved immutable design/font/motif files. Never regenerate artwork at startup.
design = json.loads((HERE / 'design.json').read_text(encoding='utf-8'))
motif = json.loads((HERE / 'motif.json').read_text(encoding='utf-8'))
fonts = json.loads((HERE / 'assets/michroma-vectors.json').read_text(encoding='utf-8'))
profile = json.loads((REF / 'profile-source.json').read_text(encoding='utf-8'))
profile['designs'] = [design] + profile['designs']
# Specimen only: no order may be placed against the existing product binding.
profile['features']['orderEnabled'] = False
profile['features']['productionConfirmed'] = False
profile['binding'] = {'kind':'local-design-review','productId':None}
for variant in profile.get('purchasing',{}).get('variants',[]):
    variant['variantId'] = None
save(PREVIEW / 'profile.json', profile)
source = (REF / 'editor-source.html').read_text(encoding='utf-8')
urls = json.loads(re.search(r'<script[^>]*id="preview-urls"[^>]*>(.*?)</script>', source, re.S)[1])
# Runtime resources are vendored in this repository; no external archive is required.
for resource in (HERE / 'runtime').iterdir():
    if resource.is_file(): shutil.copyfile(resource, ASSETS/resource.name)
shutil.copytree(HERE/'runtime/images', ASSETS/'images', dirs_exist_ok=True)
urls = {k: (['assets/'+u.split('/')[-1] for u in v] if isinstance(v,list)
            else 'assets/'+v.split('/')[-1]) for k,v in urls.items()}
source = re.sub(r'(<script[^>]*id="preview-urls"[^>]*>).*?(</script>)',
                lambda m:m[1]+json.dumps(urls)+m[2],source,flags=re.S)
source = source.replace('<base href="/" target="_top">','<base href="./" target="_self">',1)
source = source.replace('prepareMotifGeometry(entries);',
    'Object.assign(catalog.fonts,window.parent.LabradorFonts);entries.unshift(window.parent.LabradorMotif);prepareMotifGeometry(entries);',1)
source = source.replace('await mount(form.value);',
    "await mount(form.value);const specimen=host.querySelector('gravuru-configurator');specimen.chooseDesign('FK-LABRADOR-MICHROMA-01');specimen.$('[data-setting=guides]').checked=false;specimen.cfg.orderEnabled=false;specimen.cfg.demo=true;specimen.order=async()=>{specimen.$('.status').textContent='Designvorschau – noch nicht mit einem neuen Shopify-Produkt verbunden.'};specimen.sync();window.parent.specimen=specimen;",1)
for item in json.loads((HERE/'image-source-verification.json').read_text(encoding='utf-8')):
    source = source.replace(item['url'], 'assets/images/'+item['name'])
(PREVIEW / 'editor.html').write_text(source,encoding='utf-8')
html='''<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Labrador – editierbare Konfiguratorvorlage</title><style>body{margin:0;font:15px Arial;color:#263c34;background:#fff}header{padding:12px 20px;background:#f4f5f1}header strong{display:block}header small{display:block;margin-top:5px}iframe{width:100%;height:calc(100vh - 78px);border:0}</style><header><strong>Labrador · Familie Müller · 22</strong><small>Bearbeitbare Designvorschau · AOSU Pro V8P1AX11 · Lieferung ohne Klingel</small></header><p id="status">Konfigurator wird geladen …</p><script>
Promise.all([fetch('profile.json').then(r=>r.json()),fetch('../assets/michroma-vectors.json.gz').then(r=>new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json()),fetch('../motif.json').then(r=>r.json())]).then(([profile,fonts,motif])=>{window.GravuruModelProfile=profile;window.LabradorFonts=fonts;window.LabradorMotif=motif;window.GravuruModelImage='assets/images/aosu-pro-v8p1ax11.png';const f=document.createElement('iframe');f.title='Labrador-Vorlage personalisieren';f.src='editor.html';document.body.append(f);document.getElementById('status').remove()}).catch(e=>document.getElementById('status').textContent='Vorschau konnte nicht geladen werden: '+e.message);
</script></html>'''
(PREVIEW / 'index.html').write_text(html,encoding='utf-8')
print('Built editable Variante M specimen. Design bytes:',(HERE/'design.json').stat().st_size)
