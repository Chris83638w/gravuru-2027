"""Source contract for twelve independently drawn cat motifs per breed (user correction)."""
import hashlib
import json
from pathlib import Path

MOTIF_LABELS = [
    'Originalporträt', 'Junger Dreiviertelblick links',
    'Erwachsener Dreiviertelblick rechts', 'Linke Kopfansicht',
    'Rechte Kopfansicht', 'Neugieriger geneigter Kopf',
    'Ruhiger Blick nach oben', 'Gesicht mit Vorderpfote',
    'Sitzende Katze', 'Liegende Katze', 'Verspielte Vorderpfoten',
    'Zwei individuelle Katzenköpfe',
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def cat_motifs(katalog, breed):
    """Fail closed: a missing motif must never silently repeat the original face."""
    base = Path(katalog) / 'motive-eigene/rasse-schilder-20261029'
    originals = json.loads((base / 'herkunft.json').read_text(encoding='utf-8'))
    variants = json.loads((base / 'varianten/herkunft.json').read_text(encoding='utf-8'))
    original = next(p for p in originals if p['breed'] == breed)
    sources = [dict(original, variant=1)]
    sources += [p for p in variants if p['breed'] == breed]
    sources.sort(key=lambda p: p['variant'])
    if [p['variant'] for p in sources] != list(range(1, 13)):
        raise ValueError(f'{breed}: exactly twelve original motifs required')
    if len({p['sourceSha256'] for p in sources}) != 12 or len({p['svgSha256'] for p in sources}) != 12:
        raise ValueError(f'{breed}: repeated motif source')
    result = []
    for p in sources:
        if sha(Path(katalog) / p['file']) != p['svgSha256'] or sha(Path(katalog) / p['sourceFile']) != p['sourceSha256']:
            raise ValueError(f'{breed}/{p["variant"]}: source checksum mismatch')
        result.append({'variant': p['variant'], 'name': MOTIF_LABELS[p['variant'] - 1],
                       'portrait': p['file'], 'sha256': p['svgSha256'],
                       'sourceFile': p['sourceFile'], 'sourceSha256': p['sourceSha256']})
    return result
