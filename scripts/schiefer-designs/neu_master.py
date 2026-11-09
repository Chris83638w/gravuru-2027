"""Master der neuen Konzepte bauen: quer 300×200 und quadratisch 200×200 (Sternenkinder zusätzlich mit Foto).
Aufruf: python3 neu_master.py <katalog> <code-repo> <ausgabe>"""
import sys, os, json, shutil
from aelib import Fonts
import komponieren as K
from konzepte import GRUPPEN

kat, code, out = sys.argv[1], sys.argv[2], sys.argv[3]
fonts = Fonts(kat)
B = K._builder(code)
FOTO = os.path.join(kat, 'designs/bestand/gedenktafeln/Sternenkinder/Sternenkind/gravur-sternenkinder-D4/foto-1.jpg')
n = 0
for gname, (liste, meta0) in GRUPPEN.items():
    for cid, name, motiv, layout, rows in liste:
        varianten = [('quer', 300, 200, layout, False), ('quadrat', 200, 200, 'unten' if layout == 'unten' else 'oben', False)]
        if meta0.get('nurFoto'):
            varianten = []
        if False:  # Sternenkinder-Fotofassungen: Chris 04.11. 15:00 nein
            varianten += [('quer-foto', 300, 200, 'links' if layout != 'rechts' else 'rechts', True), ('quadrat-foto', 200, 200, 'oben', True)]
        for var, W, H, lay, foto in varianten:
            c = {'rows': rows, 'motiv': None if foto else motiv, 'foto': foto}
            el = K.compose(fonts, B, kat, c, W, H, lay)
            did = 'neu-%s-%s%s' % (cid.lower(), var.split('-')[0], '-mf' if foto else '')
            meta = {'themes': meta0['themes'], 'withPhoto': foto, 'section': 'Mit Foto' if foto else 'Ohne Foto',
                    'katalog': {'zielgruppe': meta0['zielgruppe'], 'unterkategorie': meta0['unterkategorie'], 'themen': meta0['themes']},
                    'konzept': cid, 'ziele': []}
            if foto:
                meta['motivOhneFoto'] = motiv
            K.write(B, kat, os.path.join(out, var, did), did, name, W, H, el, meta, foto_src=FOTO if foto else None)
            n += 1
print(n, 'Master')
