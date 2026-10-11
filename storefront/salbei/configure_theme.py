"""Reproducible Salbei configuration on the pinned, licensed Dawn source."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
THEME = ROOT / 'theme'

def read_json(path):
    raw = path.read_text(encoding='utf-8-sig')
    return json.loads(re.sub(r'/\*[\s\S]*?\*/', '', raw))

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

schema_path = THEME / 'config/settings_schema.json'
schema = read_json(schema_path)
schema[0].update(theme_name='gravuru Salbei', theme_version='0.1.0', theme_author='gravuru / Shopify Dawn')
schema = [g for g in schema if g.get('name') != 'gravuru · Design']
schema.insert(1, {'name': 'gravuru · Design', 'settings': [
    {'type': 'paragraph', 'content': 'Eine Primärfarbe für Logo, Buttons und wichtige Links. Neutrale Flächen halten den Shop ruhig.'},
    {'type': 'color', 'id': 'gravuru_primary', 'label': 'Primärfarbe', 'default': '#354c3b'},
    {'type': 'color', 'id': 'gravuru_background', 'label': 'Hintergrund', 'default': '#faf9f5'},
    {'type': 'color', 'id': 'gravuru_surface', 'label': 'Neutrale Flächen', 'default': '#f2efe8'},
    {'type': 'color', 'id': 'gravuru_text', 'label': 'Textfarbe', 'default': '#343833'}
]})
write_json(schema_path, schema)

data_path = THEME / 'config/settings_data.json'
data = read_json(data_path)
current = data.get('current', {})
if not isinstance(current, dict):
    current = {}
current.update(gravuru_primary='#354c3b', gravuru_background='#faf9f5', gravuru_surface='#f2efe8', gravuru_text='#343833',
               type_header_font='cormorant_n4', type_body_font='assistant_n4', page_width=1400,
               buttons_radius=4, buttons_shadow_opacity=0, inputs_radius=4, card_style='standard',
               card_shadow_opacity=0, collection_card_shadow_opacity=0, cart_type='page', animations_reveal_on_scroll=False,
               brand_headline='Persönlich. Von gravuru.', brand_description='<p>Persönliche Schilder, Geschenke und Erinnerungen.</p>')
for value in current.get('color_schemes', {}).values():
    value['settings'] = {'background':'#faf9f5','background_gradient':'','text':'#343833','button':'#354c3b','button_label':'#ffffff','secondary_button_label':'#354c3b','shadow':'#354c3b'}
if not current.get('color_schemes'):
    current['color_schemes'] = {f'scheme-{n}': {'settings': {'background':'#faf9f5','background_gradient':'','text':'#343833','button':'#354c3b','button_label':'#ffffff','secondary_button_label':'#354c3b','shadow':'#354c3b'}} for n in range(1,6)}
data['current'] = current
write_json(data_path, data)

layout_path = THEME / 'layout/theme.liquid'
layout = layout_path.read_text(encoding='utf-8')
if "render 'gravuru-style'" not in layout:
    layout = layout.replace('</head>', "    {% render 'gravuru-style' %}\n  </head>")
layout_path.write_text(layout, encoding='utf-8')

header_path = THEME / 'sections/gravuru-header.liquid'
header = header_path.read_text(encoding='utf-8')
match = re.search(r'{% schema %}([\s\S]*?){% endschema %}', header)
header_schema = json.loads(match.group(1))
header_schema['max_blocks'] = 30
if not any(b['type'] == 'mega_link' for b in header_schema['blocks']):
    header_schema['blocks'].append({'type':'mega_link','name':'Mega-Menü-Link','settings':[
        {'type':'text','id':'title','label':'Titel','default':'Menülink'},
        {'type':'select','id':'column','label':'Spalte','options':[{'value':'one','label':'Produktwelten'},{'value':'two','label':'Anlässe'},{'value':'three','label':'Materialien'}],'default':'one'},
        {'type':'collection','id':'collection','label':'Kollektion'},
        {'type':'url','id':'link','label':'Alternatives Linkziel','info':'Hat Vorrang vor der Kollektion.'}
    ]})
header = header[:match.start(1)] + '\n' + json.dumps(header_schema, ensure_ascii=False, indent=2) + '\n' + header[match.end(1):]
header_path.write_text(header, encoding='utf-8')

nav_path = THEME / 'snippets/gravuru-navigation.liquid'
nav = nav_path.read_text(encoding='utf-8')
if "{% if block.type == 'navigation' %}" not in nav:
    nav = nav.replace('{% for block in section.blocks %}', "{% for block in section.blocks %}\n{% if block.type == 'navigation' %}", 1)
    nav = nav.replace('{% endfor %}', '{% endif %}\n{% endfor %}')
for index in ['one','two','three']:
    nav = nav.replace("{% render 'gravuru-menu-links', menu: section.settings.menu_" + index + ' %}', "{% render 'gravuru-menu-column', section: section, menu: section.settings.menu_" + index + ", column: '" + index + "' %}")
nav_path.write_text(nav, encoding='utf-8')

nav_blocks = {
 'products': {'type':'navigation','settings':{'title':'Alle Produkte','mode':'mega'}},
 'gifts': {'type':'navigation','settings':{'title':'Geschenke & Anlässe','link':'/collections/fotogeschenke'}},
 'home': {'type':'navigation','settings':{'title':'Rund ums Haus','link':'/collections/turschilder-namensschilder'}},
 'remembrance': {'type':'navigation','settings':{'title':'Gedenken','link':'/collections/gedenktafeln'}}
}
worlds = [
 ('photo','Fotogeschenke','fotogeschenke','one'),
 ('house','Rund ums Haus','turschilder-namensschilder','one'),
 ('horse','Pferdeschilder','boxenschilder-stalltafeln-fur-pferde','one'),
 ('kids','Kindersachen','kinder-schule','one'),
 ('memory','Gedenken & Andenken','gedenktafeln','one'),
 ('wedding','Hochzeitsgeschenke','hochzeit','two'),
 ('christening','Taufgeschenke','taufe','two'),
 ('steel','Edelstahl','edelstahl-schilder','three'),
 ('slate','Schiefer','schiefer-schilder','three')
]
for key, title, handle, column in worlds:
    nav_blocks['mega_'+key] = {'type':'mega_link','settings':{'title':title,'collection':handle,'column':column}}
for key,title in [('acryl','Acryl'),('holz','Holz'),('leder','Leder')]:
    nav_blocks['mega_'+key] = {'type':'mega_link','settings':{'title':title,'link':'/search?type=product&q='+title,'column':'three'}}
write_json(THEME/'sections/header-group.json', {'name':'gravuru Kopfzeile','type':'header','sections':{'header':{'type':'gravuru-header','settings':{'wordmark':'gravuru','show_language':True,'b2b_link':'/account','b2b_label':'Für Geschäftskunden','show_image':True,'image_link':'/collections','image_label':'Materialien entdecken'},'blocks':nav_blocks,'block_order':list(nav_blocks)}},'order':['header']})

write_json(THEME/'templates/index.json', {'sections':{
 'hero':{'type':'gravuru-hero','settings':{'eyebrow':'PERSÖNLICH. VON GRAVURU.','heading':'Aus deinen Ideen.\nFür dein Leben.','text':'<p>Persönliche Schilder, Geschenke und Erinnerungen aus unserer Fertigung.</p>','button_label':'Produkte entdecken','button_link':'/collections/all','spacing':56}},
 'worlds':{'type':'gravuru-worlds','settings':{'heading':'Für die besonderen Momente','show_heading':False,'spacing':12},'blocks':{
  'home':{'type':'world','settings':{'title':'Für dein Zuhause','collection':'turschilder-namensschilder','illustration':'home'}},
  'gift':{'type':'world','settings':{'title':'Zum Verschenken','collection':'fotogeschenke','illustration':'gift'}},
  'memory':{'type':'world','settings':{'title':'Zum Erinnern','collection':'gedenktafeln','illustration':'remembrance'}}},'block_order':['home','gift','memory']}
 },'order':['hero','worlds']})

source = (THEME/'sections/main-product.liquid').read_text(encoding='utf-8')
prefix = """{% liquid
  assign gravuru_requires_design = false
  assign gravuru_assignment = product.metafields.gravuru.configurator.value
  if gravuru_assignment.enabled == true or product.metafields.gravuru_workbench.source_id != blank or product.metafields.gravuru_workbench.manifest != blank
    assign gravuru_requires_design = true
  endif
%}
"""
source = prefix + source
case_start = source.index("{%- when 'buy_buttons' -%}")
next_case = source.index("{%- when 'rating' -%}", case_start)
buy_case = source[case_start:next_case]
buy_case = buy_case.replace("{%- when 'buy_buttons' -%}", "{%- when 'gravuru_personalize' -%}\n                  {% render 'gravuru-personalize', product: product, block: block, requires_design: gravuru_requires_design %}\n                {%- when 'buy_buttons' -%}\n                  {% unless gravuru_requires_design %}")
buy_case += '                  {% endunless %}\n                '
source = source[:case_start] + buy_case + source[next_case:]
sm = re.search(r'{% schema %}([\s\S]*?){% endschema %}', source)
product_schema = json.loads(sm.group(1))
product_schema['name'] = 'gravuru · Produkt'
product_schema['blocks'].append({'type':'gravuru_personalize','name':'Personalisieren','limit':1,'settings':[{'type':'paragraph','content':'Nutzt die vorhandene gravuru-Produktbindung. Der direkte Warenkorb ist bei gebundenen Produkten gesperrt. Konfigurator und Checkout vor Freigabe separat prüfen.'}]})
source = source[:sm.start(1)]+'\n'+json.dumps(product_schema,ensure_ascii=False,indent=2)+'\n'+source[sm.end(1):]
(THEME/'sections/gravuru-product.liquid').write_text(source,encoding='utf-8')
product = read_json(THEME/'templates/product.json')
main = product['sections']['main']
main['type'] = 'gravuru-product'
main['blocks'] = {key: value for key,value in main['blocks'].items() if key not in ['vendor','share']}
main['blocks']['gravuru_personalize'] = {'type':'gravuru_personalize','settings':{}}
main['blocks']['variant_picker']['settings']['picker_type'] = 'dropdown'
main['blocks']['buy_buttons']['settings']['show_dynamic_checkout'] = False
main['block_order'] = ['title','description','price','variant_picker','quantity_selector','gravuru_personalize','buy_buttons']
main['settings'].update(media_size='medium',gallery_layout='thumbnail_slider',media_fit='contain',mobile_thumbnails='show',padding_top=44,padding_bottom=44)
product['sections'] = {'main':main}
product['order'] = ['main']
write_json(THEME/'templates/product.json',product)
write_json(THEME/'templates/product.salbei.json',product)

translations = {
 'de': {'navigation':{'menu':'Menü öffnen','main':'Hauptnavigation','apply':'Übernehmen','view_all':'Alle: {{ title }}'},'images':{'hero':'Gestaltetes Beispiel eines Acryl-Fotobilds mit Holzsockel und eines Edelstahl-Namensschilds','materials':'Materialbeispiele aus Edelstahl, Schiefer, Acryl, Holz und Leder'},'product':{'personalize':'Jetzt personalisieren','pending':'Die Personalisierung ist für dieses Produkt noch nicht verfügbar.','editor_hint':'Im Theme-Editor den passenden gravuru-App-Block hinzufügen und die freigegebene Produktbindung prüfen.'}},
 'en.default': {'navigation':{'menu':'Open menu','main':'Main navigation','apply':'Apply','view_all':'View all: {{ title }}'},'images':{'hero':'Illustrative acrylic photo gift with wooden base and a stainless steel nameplate','materials':'Material samples: stainless steel, slate, acrylic, wood and leather'},'product':{'personalize':'Personalize now','pending':'Personalization is not yet available for this product.','editor_hint':'Add the appropriate gravuru app block in the theme editor and verify the released product binding.'}},
 'fr': {'navigation':{'menu':'Ouvrir le menu','main':'Navigation principale','apply':'Appliquer','view_all':'Tout voir : {{ title }}'},'images':{'hero':'Exemple de cadeau photo en acrylique et de plaque en acier inoxydable','materials':'Acier inoxydable, ardoise, acrylique, bois et cuir'},'product':{'personalize':'Personnaliser','pending':'La personnalisation de ce produit n’est pas encore disponible.','editor_hint':'Ajoutez le bloc gravuru dans l’éditeur de thème et vérifiez la configuration du produit.'}},
 'nl': {'navigation':{'menu':'Menu openen','main':'Hoofdnavigatie','apply':'Toepassen','view_all':'Alles bekijken: {{ title }}'},'images':{'hero':'Voorbeeld van een acryl fotocadeau en een roestvrijstalen naambord','materials':'Roestvrij staal, leisteen, acryl, hout en leer'},'product':{'personalize':'Nu personaliseren','pending':'Personalisatie is voor dit product nog niet beschikbaar.','editor_hint':'Voeg het gravuru-appblok toe in de thema-editor en controleer de productkoppeling.'}},
 'es': {'navigation':{'menu':'Abrir menú','main':'Navegación principal','apply':'Aplicar','view_all':'Ver todo: {{ title }}'},'images':{'hero':'Ejemplo de regalo fotográfico en acrílico y placa de acero inoxidable','materials':'Acero inoxidable, pizarra, acrílico, madera y cuero'},'product':{'personalize':'Personalizar ahora','pending':'La personalización de este producto aún no está disponible.','editor_hint':'Añade el bloque gravuru en el editor del tema y comprueba la configuración del producto.'}},
 'it': {'navigation':{'menu':'Apri menu','main':'Navigazione principale','apply':'Applica','view_all':'Vedi tutto: {{ title }}'},'images':{'hero':'Esempio di regalo fotografico in acrilico e targhetta in acciaio inox','materials':'Acciaio inox, ardesia, acrilico, legno e pelle'},'product':{'personalize':'Personalizza ora','pending':'La personalizzazione di questo prodotto non è ancora disponibile.','editor_hint':'Aggiungi il blocco gravuru nell’editor del tema e verifica la configurazione del prodotto.'}},
 'tr': {'navigation':{'menu':'Menüyü aç','main':'Ana gezinme','apply':'Uygula','view_all':'Tümünü gör: {{ title }}'},'images':{'hero':'Akrilik fotoğraf hediyesi ve paslanmaz çelik isimlik örneği','materials':'Paslanmaz çelik, arduvaz, akrilik, ahşap ve deri'},'product':{'personalize':'Şimdi kişiselleştir','pending':'Bu ürün için kişiselleştirme henüz kullanılamıyor.','editor_hint':'Tema düzenleyicisinde gravuru uygulama bloğunu ekleyin ve ürün yapılandırmasını kontrol edin.'}}
}
for language, strings in translations.items():
    path=THEME/'locales'/f'{language}.json'
    values=read_json(path) if path.exists() else {}
    values['gravuru']=strings
    write_json(path,values)

# Decorative category imagery shares its link with a full descriptive heading.
world_path=THEME/'sections/gravuru-worlds.liquid'
world=world_path.read_text(encoding='utf-8').replace("loading: 'lazy' }}", "loading: 'lazy', alt: '' }}")
world=world.replace('alt="{{ block.settings.title | escape }}"','alt=""')
world_path.write_text(world,encoding='utf-8')

write_json(ROOT/'source.json',{'base_repository':'Shopify/dawn','base_commit':'258f00f64365e2018ca4c62778a6bf55a5d3cd18','project_repository':'Chris83638w/gravuru-2027','task_branch':'task/salbei-shopify-theme-20261011','visual':'gravuru — Salbei, approved 2026-10-11','scope':'Unpublished Shopify theme pilot. Public configurator checkout and B2B configuration are separate acceptance steps.'})
print('Salbei configuration applied; no storefront publication performed.')
