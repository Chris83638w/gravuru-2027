from pathlib import Path
root = Path(__file__).resolve().parent / 'theme/sections'
for name, setting in [('gravuru-collection-intro', 'contact_link'), ('gravuru-product-details', 'help_link')]:
    path = root / (name + '.liquid')
    content = path.read_text(encoding='utf-8').replace(',"default":"/pages/contact"', '')
    content = "{% assign g_contact_link = section.settings." + setting + " | default: '/pages/contact' %}\n" + content
    content = content.replace('target: section.settings.' + setting + ' %}', 'target: g_contact_link %}')
    path.write_text(content, encoding='utf-8')
