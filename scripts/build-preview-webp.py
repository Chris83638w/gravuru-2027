#!/usr/bin/env python3
"""Kundenansicht: WebP-Fassungen großer Vorschau-PNGs neben die Originale schreiben.

Die PNG-Originale (Fertigung, Referenz, Prüfsummen) bleiben unverändert. Der Kundeneditor lädt
nur die WebP-Dateien. Aufruf aus dem Repo-Wurzelverzeichnis:
    python3 scripts/build-preview-webp.py
Schreibt app/configurator/variant-m/customer-images.json (Quelle, SHA-256, Ausgabe, Maße).
"""
import hashlib
import io
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
QUALITY = 82
ACRYLIC = 'app/designs/acrylic-unser-anfang'
IMAGES = 'app/designs/aosu-labrador/runtime/images'
# (Quelle, größte Kante in px oder None = Originalgröße, Zweck)
SOURCES = [
    (f'{ACRYLIC}/scene-empty-v2.png', None, 'Szenenhintergrund Acryl'),
    (f'{ACRYLIC}/reference.png', None, 'Beispielfoto im Fotofeld'),
    *[(f'{ACRYLIC}/base-{name}-v2.png', None, 'Sockelansicht') for name in ('buche', 'eiche', 'holz-flach', 'klar', 'nussbaum', 'satiniert')],
    # Der Schraubenkopf erscheint mit 7 mm Durchmesser (Altpfad: 160-px-Leinwand); 400 px reichen auch für Retina-Zoom.
    (f'{IMAGES}/gravuru-schraubenkopf-fotorealistisch.png', 400, 'Schraubenkopf (nur sichtbare Schraubbefestigung)'),
    (f'{IMAGES}/gravuru-edelstahl-feine-maserung-vorschau.png', None, 'Edelstahloberfläche (nur Altpfad Edelstahl)'),
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    entries = []
    for source, max_edge, purpose in SOURCES:
        path = ROOT / source
        original = path.read_bytes()
        image = Image.open(io.BytesIO(original))
        image.load()
        if max_edge and max(image.size) > max_edge:
            scale = max_edge / max(image.size)
            image = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, 'WEBP', quality=QUALITY, method=6)
        data = buffer.getvalue()
        target = path.with_suffix('.webp')
        if not target.exists() or target.read_bytes() != data:
            target.write_bytes(data)
        entries.append({
            'source': source, 'sourceSha256': sha256(original), 'sourceBytes': len(original),
            'output': str(target.relative_to(ROOT)), 'sha256': sha256(data), 'bytes': len(data),
            'width': image.width, 'height': image.height, 'alpha': image.mode in ('RGBA', 'LA'), 'purpose': purpose,
        })
    manifest = {
        'purpose': 'Kundenansicht lädt WebP; PNG-Originale für Fertigung und Referenz unverändert',
        'generator': f'scripts/build-preview-webp.py · Pillow WebP quality {QUALITY}, method 6',
        'files': entries,
    }
    (ROOT / 'app/configurator/variant-m/customer-images.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'files': len(entries), 'before': sum(e['sourceBytes'] for e in entries), 'after': sum(e['bytes'] for e in entries)}))


if __name__ == '__main__':
    main()
