"""Finish the draft storefront without modifying shared shop records."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent
THEME = ROOT / 'theme'
changed = set(json.loads((ROOT / 'completion-files.json').read_text(encoding='utf-8')))

def write(name, content):
    (THEME / name).write_text(content, encoding='utf-8')
    changed.add(name)

settings = json.loads((THEME / 'config/settings_data.json').read_text(encoding='utf-8'))
for block in settings['current'].get('blocks', {}).values():
    if block['type'].startswith('shopify://apps/fancy-product-designer/'):
        block['disabled'] = False
write('config/settings_data.json', json.dumps(settings, ensure_ascii=False, indent=2) + '\n')

# App embed is the documented FPD loader. Keep app-owned product blocks and
# avoid copying custom scripts that depend on the old paid theme's DOM.
story = (THEME / 'sections/gravuru-story.liquid').read_text(encoding='utf-8')
story = story.replace('<span aria-hidden="true">?</span>', '<span aria-hidden="true">&rarr;</span>')
write('sections/gravuru-story.liquid', story)

# Preserve the selected theme-only world template when filters/sorting submit.
keep_view = "{% if template.name == 'collection' and template.suffix contains 'salbei-' %}<input type=\"hidden\" name=\"view\" value=\"{{ template.suffix | escape }}\">{% endif %}"
facets = (THEME / 'snippets/facets.liquid').read_text(encoding='utf-8')
import re
facets = re.sub(r'(<form\b[^>]*>)', lambda m: m.group(1) + '\n        ' + keep_view, facets)
write('snippets/facets.liquid', facets)
grid = (THEME / 'sections/main-collection-product-grid.liquid').read_text(encoding='utf-8')
grid = grid.replace('<form class="facets-vertical-form" id="FacetSortForm">', '<form class="facets-vertical-form" id="FacetSortForm">\n' + keep_view)
write('sections/main-collection-product-grid.liquid', grid)

css = (THEME / 'assets/gravuru-salbei.css').read_text(encoding='utf-8')
css += '''
/* Shared catalogue, service and checkout-entry styling. */
.collection .title,.collection__title .title,.main-page-title,.title--primary { color:var(--g-primary); font-weight:400; }
.card__heading { font-family:var(--font-body-family); font-size:16px; line-height:1.4; font-weight:500; }
.card__information { padding-top:18px; }
.card-information .price { font-size:15px; color:var(--g-primary); }
.card__inner { background:var(--g-surface); }
.facets__summary,.facet-filters__label,.product-count__text { color:var(--g-text); }
.footer-block__heading { font-size:20px; font-weight:500; }
.footer-block__details-content .list-menu__item--link { line-height:1.65; }
.rich-text__heading { color:var(--g-primary); font-weight:400; }
.g-product-help a:focus-visible,.g-detail summary:focus-visible { outline:2px solid var(--g-primary); outline-offset:4px; }
@media(max-width:749px) { .card__heading { font-size:14px; } .g-product-details h2 { font-size:32px; } }
'''
write('assets/gravuru-salbei.css', css)
(ROOT / 'completion-files.json').write_text(json.dumps(sorted(changed), indent=2) + '\n', encoding='utf-8')
print(f'{len(changed)} theme files prepared')
