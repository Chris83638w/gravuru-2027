"""Configure the Salbei draft from verified shop resources; no Shopify writes."""
from pathlib import Path
import copy, json, re

BASE = Path(__file__).resolve().parent
THEME = BASE / 'theme'
DATA = json.loads((BASE / 'shop-content.json').read_text(encoding='utf-8'))
CHANGED = set()

def read(name):
    return json.loads((THEME / name).read_text(encoding='utf-8'))

def write(name, value):
    path = THEME / name
    text = json.dumps(value, ensure_ascii=False, indent=2) + '\n'
    if not path.exists() or path.read_text(encoding='utf-8') != text:
        path.write_text(text, encoding='utf-8')
        CHANGED.add(name)

def section(kind, settings, blocks=None):
    result = {'type': kind, 'settings': settings}
    if blocks:
        result.update(blocks=blocks, block_order=list(blocks))
    return result

def block(kind, **settings):
    return {'type': kind, 'settings': settings}

def rich(title, text, label='', link='', second_label='', second_link=''):
    blocks = {'heading': block('heading', heading=title, heading_size='h1'), 'text': block('text', text=text)}
    if label:
        blocks['button'] = block('button', button_label=label, button_link=link, button_style_secondary=False,
                                 button_label_2=second_label, button_link_2=second_link, button_style_secondary_2=True)
    return section('rich-text', {'color_scheme':'scheme-1', 'content_alignment':'left', 'desktop_content_position':'left',
                                 'full_width':False, 'padding_top':48, 'padding_bottom':48}, blocks)

WORLDS = [
    ('home','Rund ums Haus','Schilder, Hausnummern und ein Eingang, der zu dir passt.','turschilder-namensschilder',
     ['turschilder-namensschilder','hausnummern','turklingeln','schilder-fur-video-funkklingeln']),
    ('photo','Fotogeschenke','Deine liebsten Bilder. Ein persönliches Geschenk.','fotogeschenke',
     ['schlusselanhanger-mit-foto','foto-aufsteller-bilderrahmen','schieferplatte-mit-foto']),
    ('memory','Gedenken & Andenken','Erinnerungen bewahren und Verbundenheit ausdrücken.','gedenktafeln',
     ['gedenktafeln','tiergrabsteine','grabstecker','trauergeschenke']),
    ('horse','Pferdeschilder','Ein persönlicher Platz für dein Pferd.','boxenschilder-stalltafeln-fur-pferde',
     ['boxenschilder-stalltafeln-fur-pferde','rund-ums-tier']),
    ('kids','Kinder & Schule','Für kleine Entdecker und große erste Schritte.','kinder-schule',
     ['kinder-schule','stundenplane','brotdosen-trinkflaschen']),
    ('wedding','Hochzeitsgeschenke','Persönliche Ideen für einen gemeinsamen Anfang.','hochzeit',
     ['hochzeit','gastgeschenke','geschenke-fur-trauzeugen']),
    ('christening','Taufgeschenke','Ein Name. Ein Datum. Eine bleibende Erinnerung.','taufe',
     ['taufe','geschenke-furs-baby'])
]
COLLECTIONS = {c['handle']:c for c in DATA['collections']}

def world_url(w):
    return '/collections/' + w[3] + '?view=salbei-' + w[0]

def categories(title='Deine Welt. Dein Lieblingsstück.'):
    return section('gravuru-categories', {'eyebrow':'Für das, was dir wichtig ist', 'heading':title, 'spacing':48,
        'text':'<p>Geschenke, Schilder und Erinnerungen. Entdecke, was zu deinem Moment passt.</p>'},
        {w[0]:block('category', title=w[1], text=w[2], collection=w[3], link=world_url(w)) for w in WORLDS})

def benefits():
    return section('gravuru-benefits', {'heading':'', 'accessibility_label':'Persönlich gefertigt', 'spacing':24}, {
        'personal':block('benefit',title='So persönlich wie du',text='Mit Namen, Text, Motiv oder deinem Foto – je nach Produkt.'),
        'made':block('benefit',title='Eigene Fertigung in Bielefeld',text='Von der Materialauswahl bis zur Gravur und zum Druck.'),
        'help':block('benefit',title='Wir helfen dir weiter',text='Persönliche Beratung zu Produkt, Gestaltung und Material.')})

def faq(short=False):
    pairs = [
        ('Wie gestalte ich mein Produkt?','<p>Wähle dein Produkt und die angebotene Ausführung. Auf der Produktseite findest du die verfügbaren Möglichkeiten zur Personalisierung. Prüfe Texte, Bilder und Optionen vor der Bestellung.</p>'),
        ('Welches Material passt zu meiner Idee?','<p>Edelstahl wirkt klar und metallisch, Schiefer zeigt eine natürliche Struktur, Acrylglas bringt Farbe und Kontrast ins Spiel. Die passende Ausführung hängt auch vom Einsatzort ab. <a href="/pages/materialien">Materialien vergleichen</a>.</p>'),
        ('Wann wird meine Bestellung geliefert?','<p>Produktionszeit und Versandlaufzeit sind unterschiedlich. Maßgeblich sind die aktuellen Angaben am Artikel und im Bestellprozess. <a href="/pages/versand-zahlung">Mehr zu Versand und Lieferung</a>.</p>'),
        ('Kann ich ein eigenes Foto oder Logo verwenden?','<p>Wenn das ausgewählte Produkt einen Upload anbietet, kannst du deine eigene Datei verwenden. Nutze eine möglichst scharfe Originaldatei und achte darauf, dass du die erforderlichen Nutzungsrechte besitzt.</p>'),
        ('Kann ich für mein Unternehmen bestellen?','<p>Für Serien, einheitliche Beschilderung und individuelle Zuschnitte kannst du uns Material, Maße, Stückzahl und Wunschtermin nennen. <a href="/pages/mengenrabatte">Projekt anfragen</a> oder <a href="/pages/registrierung">als Geschäftskunde registrieren</a>.</p>'),
        ('Ich habe eine Frage zu meiner Bestellung.','<p>Schreib uns über die <a href="/pages/contact">Kontaktseite</a> und nenne deine Bestellnummer. Bei einer sichtbaren Abweichung beschreibe bitte den betroffenen Artikel und das Problem.</p>')]
    return section('gravuru-faq', {'eyebrow':'Gut zu wissen', 'heading':'Noch eine Frage?',
        'text':'<p>Die wichtigsten Antworten für dein persönliches Lieblingsstück.</p>', 'spacing':48},
        {'question'+str(i):block('question', question=q, answer=a) for i,(q,a) in enumerate(pairs[:3] if short else pairs)})

index = read('templates/index.json')
index['sections']['hero']['settings']['button_link'] = '/collections'
index['sections']['worlds']['blocks']['home']['settings']['link'] = world_url(WORLDS[0])
index['sections']['worlds']['blocks']['gift']['settings']['link'] = world_url(WORLDS[1])
index['sections']['worlds']['blocks']['memory']['settings']['link'] = world_url(WORLDS[2])
index['sections'].update({
    'benefits':benefits(),
    'selected':section('featured-collection', {'title':'Ein Zuhause mit deiner Handschrift.', 'heading_size':'h1',
        'description':'<p>Entdecke persönliche Schilder aus unserem Sortiment.</p>', 'collection':'turschilder-namensschilder',
        'products_to_show':4, 'columns_desktop':4, 'columns_mobile':'2', 'image_ratio':'square', 'show_secondary_image':False,
        'show_vendor':False, 'show_rating':False, 'quick_add':'none', 'show_view_all':True, 'view_all_style':'outline',
        'enable_desktop_slider':False, 'swipe_on_mobile':False, 'color_scheme':'scheme-1', 'padding_top':48, 'padding_bottom':48}),
    'categories':categories(),
    'story':section('gravuru-story', {'eyebrow':'Aus unserer Fertigung', 'heading':'Aus einer Idee wird dein Lieblingsstück.',
        'text':'<p>Ein Name an der Tür. Ein Foto, das bleibt. Ein Geschenk mit einer ganz persönlichen Botschaft. In Bielefeld verbinden wir Gestaltung, Material und Veredelung zu deinem Produkt.</p>',
        'image':'shopify://shop_images/druck.jpg', 'button_label':'Mehr über gravuru', 'button_link':'/pages/uber-uns', 'spacing':56}, {
        'choose':block('step',title='Finde dein Produkt',text='Wähle die passende Idee, das Material und die angebotene Ausführung.'),
        'design':block('step',title='Mach es persönlich',text='Ergänze die verfügbaren Texte, Motive oder Fotos und prüfe deine Gestaltung.'),
        'make':block('step',title='Wir fertigen für dich',text='Deine Auswahl wird in unserer Fertigung graviert oder bedruckt.')}),
    'business':rich('Persönlich. Auch für dein Unternehmen.', '<p>Für Bestatter, Fotostudios, Praxen, Geschenkshops und Unternehmen: Wir unterstützen dich bei persönlichen Produkten, einheitlichen Serien und individuellen Zuschnitten.</p>',
        'Geschäftskunde werden','/pages/registrierung','Projekt anfragen','/pages/mengenrabatte'),
    'faq':faq(True)
})
index['order']=['hero','worlds','benefits','selected','categories','story','business','faq']
write('templates/index.json',index)

header=read('sections/header-group.json')
h=header['sections']['header']
h['settings'].update(b2b_link='/pages/registrierung', image_link='/pages/materialien', image_label='Materialien kennenlernen')
h['blocks']['gifts']['settings']['link']=world_url(WORLDS[1])
h['blocks']['home']['settings']['link']=world_url(WORLDS[0])
h['blocks']['remembrance']['settings']['link']=world_url(WORLDS[2])
for w,key in zip([WORLDS[1],WORLDS[0],WORLDS[3],WORLDS[4],WORLDS[2],WORLDS[5],WORLDS[6]],['mega_photo','mega_house','mega_horse','mega_kids','mega_memory','mega_wedding','mega_christening']):
    h['blocks'][key]['settings']['link']=world_url(w)
write('sections/header-group.json',header)

footer=read('sections/footer-group.json')
f=footer['sections']['footer']
f['blocks']={
    'brand':block('brand_information',show_social=True),
    'company':block('link_list',heading='gravuru',menu='footer'),
    'service':block('link_list',heading='Wir helfen dir',menu='footer-menu-service'),
    'legal':block('link_list',heading='Gut informiert',menu='footer-menu-rechtliches')}
f['block_order']=list(f['blocks'])
f['settings'].update(padding_top=56,padding_bottom=32,newsletter_heading='Persönliche Ideen für besondere Menschen')
write('sections/footer-group.json',footer)

collection=read('templates/collection.json')
collection['sections']['banner']=section('gravuru-collection-intro', {'show_description':False, 'contact_link':'/pages/contact'})
collection['sections']['product-grid']['settings'].update(image_ratio='square',products_per_page=24)
write('templates/collection.json',collection)
for suffix in sorted({c['templateSuffix'] for c in DATA['collections'] if c.get('templateSuffix')}):
    if re.fullmatch(r'[a-zA-Z0-9_-]+',suffix): write('templates/collection.'+suffix+'.json',collection)
for w in WORLDS:
    landing=copy.deepcopy(collection)
    intro=landing['sections']['banner']
    intro['settings'].update(heading=w[1], text='<p>'+w[2]+'</p>', show_description=False)
    intro['blocks']={str(i):block('link',title=COLLECTIONS[k]['title'],collection=k) for i,k in enumerate(w[4]) if k in COLLECTIONS}
    intro['block_order']=list(intro['blocks'])
    landing['sections']['help']=rich('Gemeinsam finden wir die passende Idee.', '<p>Du suchst eine bestimmte Ausführung oder möchtest mehrere Produkte gestalten? Erzähl uns von deinem Vorhaben.</p>', 'Kontakt & Beratung','/pages/contact')
    landing['order'].append('help')
    write('templates/collection.salbei-'+w[0]+'.json',landing)

write('templates/list-collections.json', {'sections':{'intro':rich('Für dein Leben. Für besondere Menschen.', '<p>Finde deine persönliche Idee in unseren sieben Themenwelten.</p>'), 'worlds':categories('Unsere Produktwelten')},'order':['intro','worlds']})

page=read('templates/page.json')
for p in DATA['pages']:
    suffix=p.get('templateSuffix')
    if p['isPublished'] and suffix and re.fullmatch(r'[a-zA-Z0-9_-]+',suffix) and suffix not in ['contact','registration','mengenrabatte','faq','customer-care']:
        write('templates/page.'+suffix+'.json',page)

registration={'sections':{
    'intro':rich('Persönliche Produkte. Für dein Geschäft.', '<p>Ob Geschenkshop, Bestattungsunternehmen, Fotostudio oder Praxis: Entdecke die Zusammenarbeit mit gravuru. Über das Formular kannst du dich als Geschäftskunde bewerben. Wir prüfen deine Angaben und melden uns zu den Möglichkeiten und Konditionen.</p>', 'Bereits registriert? Anmelden','/account'),
    'advantages':section('gravuru-benefits',{'heading':'Für deine Kunden. Nach deinen Anforderungen.','accessibility_label':'Geschäftskunden','spacing':24}, {
        'range':block('benefit',title='Persönliche Produkte',text='Schilder, Geschenkartikel und Erinnerungsstücke passend zu deinem Angebot.'),
        'series':block('benefit',title='Serien & Zuschnitte',text='Gemeinsame Gestaltung, wechselnde Namen oder individuelle Formate.'),
        'advice':block('benefit',title='Angebot nach Bedarf',text='Konditionen richten sich nach Material, Menge und Ausführung.')}),
    'registration':section('apps',{'include_margins':True},{'form':DATA['registrationApp']})},
    'order':['intro','advantages','registration']}
registration['sections']['registration']['blocks']['form']['settings'].update(button_background_color='#354c3b',links_color='#354c3b')
write('templates/page.registration.json',registration)

business=copy.deepcopy(page)
business['sections']['contact']=section('contact-form',{'heading':'Dein Projekt anfragen','heading_size':'h1','color_scheme':'scheme-1','padding_top':32,'padding_bottom':56})
business['order'].append('contact')
write('templates/page.mengenrabatte.json',business)
faqpage={'sections':{'intro':rich('Hilfe für dein persönliches Produkt.', '<p>Von der ersten Idee bis zur Lieferung: Hier findest du Antworten und den direkten Weg zu uns.</p>', 'Kontakt aufnehmen','/pages/contact'), 'faq':faq()},'order':['intro','faq']}
write('templates/page.faq.json',faqpage)
write('templates/page.customer-care.json',faqpage)

settings=read('config/settings_data.json')
settings['current']['blocks']=copy.deepcopy(DATA['oldAppBlocks'])
settings['current'].update(predictive_search_enabled=True,brand_headline='Persönlich. Von gravuru.',brand_description='<p>Persönliche Schilder, Geschenke und Erinnerungen aus unserer Fertigung in Bielefeld.</p>')
write('config/settings_data.json',settings)

product=read('templates/product.json')
main=product['sections']['main']
main['blocks'].pop('description',None)
main['block_order']=[b for b in main['block_order'] if b!='description']
main['blocks']['subtitle']=block('text',text='{{ product.metafields.custom.untertitel.value }}',text_style='body')
main['block_order'].insert(1,'subtitle')
details=section('gravuru-product-details',{}, {k:block('detail',title=t,source=k) for k,t in [('description','Beschreibung'),('material','Material & Zusammensetzung'),('mounting','Montage'),('safety','Sicherheitshinweise')]})
product['sections']['details']=details
product['sections']['recommendations']=section('related-products', {'heading':'Das passt dazu','heading_size':'h2','products_to_show':4,'columns_desktop':4,'columns_mobile':'2','image_ratio':'square','show_secondary_image':False,'show_vendor':False,'show_rating':False,'color_scheme':'scheme-1','padding_top':36,'padding_bottom':56})
product['order']=['main','details','recommendations']
write('templates/product.json',product)
write('templates/product.salbei.json',product)

for source in json.loads((BASE/'fpd-blocks.json').read_text(encoding='utf-8')):
    specific=copy.deepcopy(product)
    source_blocks=source['sections']['main']
    specific['sections']['main']['blocks'].update(source_blocks['blocks'])
    order=specific['sections']['main']['block_order']
    position=order.index('buy_buttons')
    order[position:position]=source_blocks['block_order']
    write(source['filename'],specific)

for name in ['gravuru-benefits','gravuru-story','gravuru-faq','gravuru-categories','gravuru-collection-intro','gravuru-product-details']:
    CHANGED.add('sections/'+name+'.liquid')
(BASE/'completion-files.json').write_text(json.dumps(sorted(CHANGED),indent=2)+'\n',encoding='utf-8')
print('Configured',len(CHANGED),'files; homepage sections:',len(index['order']))
