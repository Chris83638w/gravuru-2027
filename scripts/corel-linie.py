#!/usr/bin/env python3
"""Corel-Massenstrecke je Linie: alle Design-Bögen (`*_Designs.cdr`) eines Quellordners ohne Corel
lesen (über `read-corel-design-sheets.py`, libcdr) und je Bogen nach
`<katalog>/designs/bestand/boegen/<Basis-SKU>/` ablegen; dazu eine Linienübersicht.

    python scripts/corel-linie.py --quelle <ordner mit CDRs> --katalog <gravuru-katalog.> \
        [--linie Türschilder] [--prozess Gravur] [--material Edelstahl] [--jobs 2] [--force] [--no-png]
    python scripts/corel-linie.py --liste bogenliste.json --katalog <…>   # eigene Liste wie bei read-corel-design-sheets

Metadaten kommen aus dem Pfad (V:\\Produkte\\<Linie>\\<Prozess>\\<Material>\\…\\<Größe/Form>\\[CDR]\\<SKU>_Designs.cdr):
Material = Ordner nach dem Prozess, Form aus SKU-Präfix (TRE Rechteck, TQ Quadrat, TO Oval, TAE abgerundete Ecken,
TAS abgerundete Seiten, TR1/TR2 Retro, KS… Kordelschild), Formatreihe = Ordner „… ab 8x5“ unter `__NEU`, sonst „alte Größe“.
Nichts wird erfunden: unbekannte Werte bleiben leer. Bereits gelesene Bögen (designs.json vorhanden) werden übersprungen,
außer mit --force. Die Übersicht `designs/bestand/boegen/_linie-<slug>.json` zählt je Bogen Designs, grüne (wählbare)
Etiketten, Produktionsfassungen, Schriften und Plattenmaße – als Grundlage für Formatreihen und Familien.
"""
import argparse, concurrent.futures, json, re, subprocess, sys, time, unicodedata
from pathlib import Path

HERE = Path(__file__).resolve().parent
READER = HERE / 'read-corel-design-sheets.py'
FORMS = {'TRE': 'Rechteck', 'TQ': 'Quadrat', 'TO': 'Oval', 'TAE': 'Rechteck abgerundete Ecken', 'TAS': 'Rechteck abgerundete Seiten',
         'TR1': 'Retro 1', 'TR2': 'Retro 2', 'KSRE': 'Kordelschild Rechteck', 'TREUV': 'Rechteck', 'TQUV': 'Quadrat', 'TOUV': 'Oval'}
# Bogenname: <Basis-SKU>[_mB|-mB]_Designs[.cdr]; „mB“ = Variante mit Bohrung, eigener Bogen → Basis + „-mB“
SHEET = re.compile(r'^(?P<base>[A-Z0-9]+(?:-[A-Z0-9()., ]+)*?-[\d.,]+(?:x[\d.,]+)?(?:\([\d.,x]+\))?)(?P<variant>[_-]mB)?[_-]Designs?(?:_.*)?$', re.I)


def slug(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def base_sku(cdr):
    m = SHEET.match(cdr.stem)
    if not m: return None
    return m.group('base') + ('-mB' if m.group('variant') else '')


def meta_from_path(cdr, root, linie, prozess, material):
    parts = [p for p in cdr.parts if p not in ('[CDR]',)]
    meta = {'linie': linie or '', 'process': prozess or '', 'material': material or '', 'form': '', 'label': '', 'formatreihe': '', 'alteGroesse': False}
    for p in ('Gravur', 'UV', 'Druck'):
        if p in parts:
            i = parts.index(p); meta['process'] = meta['process'] or p
            if i + 1 < len(parts) and parts[i + 1] != '__NEU': meta['material'] = meta['material'] or parts[i + 1]
    if '__NEU' in parts:
        i = parts.index('__NEU'); after = [p for p in parts[i + 1:-1]]
        reihe = [p for p in after if re.search(r'\bab\b', p) or p in ('Quadratisch', 'Retro 1', 'Retro 2')]
        meta['formatreihe'] = reihe[0] if reihe else (after[0] if after else '')
    else:
        meta['alteGroesse'] = True
    meta['label'] = parts[-2] if len(parts) >= 2 else cdr.stem
    base = base_sku(cdr)
    if base:
        prefix = base.split('-')[0]
        meta['form'] = FORMS.get(prefix, '')
    return meta


def run_sheet(job, out_dir, no_png):
    out_dir.mkdir(parents=True, exist_ok=True)
    jobfile = out_dir / '_bogen.json'
    jobfile.write_text(json.dumps([{'file': job['file'], 'label': job['label'], 'material': job['material'], 'process': job['process'],
                                     'form': job['form'], 'sourcePath': job.get('sourcePath', '')}], ensure_ascii=False, indent=1), encoding='utf-8')
    cmd = [sys.executable, '-I', str(READER), '--out', str(out_dir), '--from-list', str(jobfile)] + (['--no-png'] if no_png else [])
    started = time.time()
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return {'ok': proc.returncode == 0, 'seconds': round(time.time() - started, 1), 'stdout': proc.stdout[-4000:], 'stderr': proc.stderr[-4000:]}


def design_signature(folder):
    try: d = json.loads((folder / 'design.json').read_text(encoding='utf-8'))
    except OSError: return None
    plate = d.get('plate') or {}
    return {'texts': [((t.get('text'), t.get('font'), t.get('sizePt'), t.get('align')), list(t.get('box', []))) for t in d.get('texts', [])],
            'motifs': [(m.get('fill'), list(m.get('box', []))) for m in d.get('motifs', [])],
            'plate': (plate.get('widthMm'), plate.get('heightMm')), 'images': len(d.get('images', []))}


def same_design(a, b, tolerance=1.0):
    """Gleiche Fassung: gleiche Texte/Schriften/Größen, gleiche Motivfarben, alle Lagen innerhalb der Toleranz (mm).
    Produktions-/Zweitfassungen weichen in Pfadbreite, Kontur oder Lage minimal ab, sind aber dasselbe Design."""
    if not a or not b or a['plate'] != b['plate'] or a['images'] != b['images'] or len(a['texts']) != len(b['texts']) or len(a['motifs']) != len(b['motifs']): return False
    near = lambda x, y: len(x) == len(y) and all(abs(p - q) <= tolerance for p, q in zip(x, y))
    return all(ta == tb and near(ba, bb) for (ta, ba), (tb, bb) in zip(a['texts'], b['texts'])) and all(fa == fb and near(ba, bb) for (fa, ba), (fb, bb) in zip(a['motifs'], b['motifs']))


def compare_duplicates(out_dir, designs):
    identical = differing = 0
    for d in designs:
        if not d.get('duplicateOf'): continue
        same = same_design(design_signature(out_dir / d['id']), design_signature(out_dir / d['duplicateOf']))
        d['identicalDuplicate'] = bool(same)
        if same: identical += 1
        else: differing += 1
    return identical, differing


def summarize(out_dir, job, result):
    index_file = out_dir / 'designs.json'
    designs = json.loads(index_file.read_text(encoding='utf-8')) if index_file.exists() else []
    identical, differing = compare_duplicates(out_dir, designs)
    if designs and (identical or differing): index_file.write_text(json.dumps(designs, ensure_ascii=False, indent=1), encoding='utf-8')
    fonts = {}
    plates = {}
    for d in designs:
        for f in d.get('fonts', []): fonts[f] = fonts.get(f, 0) + 1
        p = d.get('plate') or {}
        key = f"{p.get('widthMm')}x{p.get('heightMm')}"
        plates[key] = plates.get(key, 0) + 1
    return {'base': out_dir.name, 'sheet': Path(job['file']).name, **{k: job[k] for k in ('linie', 'process', 'material', 'form', 'label', 'formatreihe', 'alteGroesse')},
            'designs': len(designs), 'green': sum(1 for d in designs if d.get('labelColor') == '#00ff00'),
            'production': sum(1 for d in designs if d.get('production')), 'duplicates': sum(1 for d in designs if d.get('duplicateOf')),
            'duplicatesIdentical': identical, 'duplicatesDiffering': differing,
            'customizationIds': sorted({c for d in designs for c in d.get('customizationIds', [])}),
            'fonts': dict(sorted(fonts.items(), key=lambda kv: -kv[1])), 'plates': plates,
            'ok': result['ok'], 'seconds': result['seconds'], 'notes': [l for l in (result['stdout'] + result['stderr']).splitlines() if l.strip()][-12:]}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--quelle', help='Ordner mit CDR-Bögen (rekursiv)'); ap.add_argument('--liste', help='JSON-Liste [{file,label,material,process,form}]')
    ap.add_argument('--katalog', required=True); ap.add_argument('--linie', default=''); ap.add_argument('--prozess', default=''); ap.add_argument('--material', default='')
    ap.add_argument('--jobs', type=int, default=2); ap.add_argument('--force', action='store_true'); ap.add_argument('--no-png', action='store_true')
    ap.add_argument('--nur-neu', action='store_true', help='nur Bögen unter __NEU (aktuelle Formatreihen)')
    a = ap.parse_args()
    katalog = Path(a.katalog).resolve(); boegen = katalog / 'designs' / 'bestand' / 'boegen'
    if not (katalog / 'STAND.md').exists(): sys.exit('Katalog-Repo nicht gefunden: ' + str(katalog))
    jobs = []
    if a.liste:
        for j in json.loads(Path(a.liste).read_text(encoding='utf-8')):
            cdr = Path(j['file']); base = base_sku(cdr)
            if not base: print('übersprungen (kein Bogenname):', cdr.name); continue
            meta = meta_from_path(cdr, None, a.linie, a.prozess, a.material); meta.update({k: v for k, v in j.items() if k in meta and v})
            jobs.append({'file': str(cdr), 'base': base, 'sourcePath': j.get('sourcePath', ''), **meta})
    elif a.quelle:
        root = Path(a.quelle).resolve()
        for cdr in sorted(root.rglob('*.cdr')):
            if a.nur_neu and '__NEU' not in cdr.parts: continue
            base = base_sku(cdr)
            if not base: print('übersprungen (kein Bogenname):', cdr.relative_to(root)); continue
            jobs.append({'file': str(cdr), 'base': base, 'sourcePath': str(cdr.relative_to(root)), **meta_from_path(cdr, root, a.linie, a.prozess, a.material)})
    else:
        sys.exit('--quelle oder --liste angeben')
    seen = {}
    for j in jobs:
        if j['base'] in seen:
            other = seen[j['base']]
            # gleiche Basis-SKU zweimal (alte Größe + __NEU): __NEU gewinnt, alte Größe bekommt Suffix
            loser = other if other['alteGroesse'] and not j['alteGroesse'] else j
            loser['out'] = loser['base'] + '--alt'
            print(f"doppelte Basis {j['base']}: {Path(loser['file']).parent.parent.name} → {loser['out']}")
        seen[j['base']] = j
    todo = []
    for j in jobs:
        out_dir = boegen / j.get('out', j['base'])
        if (out_dir / 'designs.json').exists() and not a.force:
            print('vorhanden, übersprungen:', out_dir.name); continue
        todo.append((j, out_dir))
    print(f'{len(jobs)} Bögen, {len(todo)} zu lesen, {a.jobs} parallel')
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.jobs) as pool:
        futures = {pool.submit(run_sheet, j, out_dir, a.no_png): (j, out_dir) for j, out_dir in todo}
        for fut in concurrent.futures.as_completed(futures):
            j, out_dir = futures[fut]; r = fut.result()
            s = summarize(out_dir, j, r); results.append(s)
            print(f"{'ok ' if r['ok'] else 'FEHLER'} {out_dir.name}: {s['designs']} Designs, {s['green']} grün, {s['production']} Produktion, {r['seconds']} s" + ('' if r['ok'] else '\n' + r['stderr'][-800:]))
    # Übersicht über alle Bögen der Linie (auch zuvor gelesene)
    overview = []
    for j in jobs:
        out_dir = boegen / j.get('out', j['base'])
        done = next((s for s in results if s['base'] == out_dir.name), None)
        overview.append(done or summarize(out_dir, j, {'ok': (out_dir / 'designs.json').exists(), 'seconds': 0, 'stdout': '', 'stderr': ''}))
    name = slug(' '.join(x for x in (a.linie, a.prozess, a.material) if x)) or 'linie'
    (boegen / f'_linie-{name}.json').write_text(json.dumps({'linie': a.linie, 'process': a.prozess, 'material': a.material, 'sheets': overview}, ensure_ascii=False, indent=1), encoding='utf-8')
    total = sum(s['designs'] for s in overview); green = sum(s['green'] for s in overview)
    print(f'Übersicht: {boegen / ("_linie-" + name + ".json")} – {len(overview)} Bögen, {total} Designs, {green} grün, Fehler: {sum(1 for s in overview if not s["ok"])}')


if __name__ == '__main__':
    main()
