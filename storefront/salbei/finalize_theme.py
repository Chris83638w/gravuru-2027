"""Small final corrections; idempotent. Run after configure_theme.py for rebuilding."""
from pathlib import Path
import json

THEME = Path(__file__).resolve().parent / 'theme'
replacements = {
    'sections/gravuru-header.liquid': [('href="{{ section.settings.b2b_link }}"', 'href="{% render \'gravuru-local-url\', target: section.settings.b2b_link %}"')],
    'sections/gravuru-hero.liquid': [('href="{{ section.settings.button_link | default: routes.all_products_collection_url }}"', 'href="{% render \'gravuru-local-url\', target: section.settings.button_link %}"')],
    'sections/gravuru-worlds.liquid': [('href="{{ target }}"', 'href="{% render \'gravuru-local-url\', target: target %}"')],
    'snippets/gravuru-navigation.liquid': [
        ('href="{{ section.settings.image_link }}"', 'href="{% render \'gravuru-local-url\', target: section.settings.image_link %}"'),
        ('href="{{ section.settings.b2b_link }}"', 'href="{% render \'gravuru-local-url\', target: section.settings.b2b_link %}"'),
        ('href="{{ block.settings.link | default: routes.all_products_collection_url }}"', 'href="{% render \'gravuru-local-url\', target: block.settings.link %}"'),
    ],
    'snippets/gravuru-menu-column.liquid': [('href="{{ destination }}"', 'href="{% render \'gravuru-local-url\', target: destination %}"')],
    'snippets/gravuru-menu-links.liquid': [("| t: title: link.title }}", "| t: title: link.title | escape }}")],
}
for name, pairs in replacements.items():
    file = THEME / name
    text = file.read_text(encoding='utf-8')
    for before, after in pairs:
        text = text.replace(before, after)
    file.write_text(text, encoding='utf-8')
footer = THEME / 'sections/footer-group.json'
data = json.loads(footer.read_text(encoding='utf-8'))
data['sections']['footer']['settings']['newsletter_heading'] = 'Neue Ideen für besondere Menschen'
footer.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Locale-aware internal links and German footer applied.')
