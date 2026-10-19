"""Light-Pass: eine Produktlinie der „Neuen Struktur“ aus den Light-Kopien in den Katalog-Bestand überführen.

Quelle ist der Spiegel von V:\\Produkte, den quellen/make-light-copies.ps1 nach C:\\katalog-quelle schreibt:
  <Linie>\\…\\[CDR]\\*.cdr                      Corel-Bögen ohne Bitmaps (Texte, Schriften, Pfade, Platten vollständig)
  <Linie>\\…\\<SKU>\\product.json, *_front.jpg   Auszug der Konfigurator-Pakete (Texte, Schriften, Vorschau)

Ablauf je Linie:
  1. Corel-Bögen lesen (read-corel-design-sheets.py, je [CDR]-Ordner ein Quellordner, ohne PNG – gerendert wird im Bestandsbau)
  2. Konfigurator-Auszüge lesen (read-fpd-design-packages.py, je Größenordner ein Quellordner, ohne OCR)
  3. Bestand bauen (build-design-bestand.py --line <linie>, generisch: Reihe = SKU-Präfix, Themen-Tabelle)
Metadaten (Verfahren, Material, Form) kommen aus den Pfadsegmenten bzw. dem SKU-Präfix; Unbekanntes bleibt leer.

    python scripts/light-pass.py --quelle /tmp/claude-0/ns/quelle --linie Türschilder --work /tmp/claude-0/ns/work \
        --katalog /home/claude/gravuru-katalog [--tree quellen/server-produkte-20261017/_ordnerliste.txt.gz] [--jobs 2] [--nur-corel] [--nur-bau]
"""
import argparse, collections, json, os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
SIZE = re.compile(r'^(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)')
SKU = re.compile(r'^([A-Z]{2,6}[A-Z0-9]*)((?:-[A-Z0-9]+)*?)-(?:\([\d.,]+x[\d.,]+\))?[\d.,]+(?:x[\d.,]+)?(?:\([\d.,]+x[\d.,]+\))?[a-zA-Z]{0,3}-D\d+$')
MATERIAL = [('acryl+edelstahl', 'Acryl + Edelstahl'), ('acryl + edelstahl', 'Acryl + Edelstahl'), ('acryl+v2a', 'Acryl + Edelstahl'), ('premium schiefer', 'Premium Schiefer'), ('premiumschiefer', 'Premium Schiefer'),
            ('edelstahl', 'Edelstahl'), ('v2a', 'Edelstahl'), ('acryl', 'Acryl'), ('acrylglas', 'Acryl'), ('kunststoff', 'Kunststoff'), ('schiefer', 'Schiefer'), ('holz', 'Holz'), ('granit', 'Granit'), ('marmor', 'Marmor'),
            ('alu-dibond', 'Alu-Dibond'), ('aludibond', 'Alu-Dibond'), ('alu dibond', 'Alu-Dibond'), ('dibond', 'Alu-Dibond'), ('aluminium', 'Aluminium'), ('glas', 'Glas'), ('messing', 'Messing'), ('kork', 'Kork'),
            ('leder', 'Leder'), ('filz', 'Filz'), ('bambus', 'Bambus'), ('eiche', 'Eiche'), ('buche', 'Buche'), ('mdf', 'MDF'), ('spiegel', 'Spiegel'), ('keramik', 'Keramik'), ('porzellan', 'Porzellan'),
            ('stein', 'Stein'), ('beton', 'Beton'), ('papier', 'Papier'), ('karton', 'Karton'), ('pappe', 'Karton'), ('metall', 'Metall'), ('kupfer', 'Kupfer'), ('zink', 'Zink'), ('leinwand', 'Leinwand'), ('textil', 'Textil')]
MAT_CODE = {'V2A': 'Edelstahl', 'A': 'Acryl', 'AV2A': 'Acryl + Edelstahl', 'KS': 'Kunststoff', 'S': 'Schiefer', 'PS': 'Premium Schiefer', 'H': 'Holz', 'G': 'Granit', 'M': 'Marmor', 'AD': 'Alu-Dibond', 'ALU': 'Aluminium', 'GL': 'Glas', 'MS': 'Messing', 'K': 'Kork', 'E': 'Eiche', 'B': 'Buche'}
FORM_WORDS = [('abgerundete ecken', 'Abgerundete Ecken'), ('abgerundete seiten', 'Abgerundete Seiten'), ('abgerundet', 'Abgerundet'), ('oval', 'Oval'), ('rund', 'Rund'), ('quadrat', 'Quadrat'), ('herz', 'Herz'), ('stern', 'Stern'),
              ('rechteck', 'Rechteck'), ('kreuz', 'Kreuz'), ('haus', 'Haus'), ('wolke', 'Wolke'), ('knochen', 'Knochen'), ('pfote', 'Pfote'), ('kreis', 'Rund'), ('ellipse', 'Oval'), ('bogen', 'Bogen'), ('schild', 'Schild'),
              ('hochformat', 'Hochformat'), ('querformat', 'Querformat'), ('tropfen', 'Tropfen'), ('blatt', 'Blatt'), ('baum', 'Baum'), ('engel', 'Engel'), ('buch', 'Buch')]
SKIP = re.compile(r'(^|\\|/)(\[?Archiv\]?|Backup|Sicherung[^\\/]*|alt|_alt|ALT)([\\/]|$)')


def slug(s): return re.sub(r'-+', '-', re.sub(r'[^A-Za-z0-9ÄÖÜäöüß]+', '-', s)).strip('-')


def meta_from_path(segs, sku=None):
    """segs: Pfadsegmente unterhalb der Linie bis vor [CDR]/SKU → Verfahren, Material, Form, Größe."""
    low = [s.lower().strip() for s in segs]
    process = ''
    for s in low:
        if s in ('gravur', 'graviert', 'lasergravur'): process = 'Gravur'
        elif s == 'uv' or s.startswith('uv ') or s.startswith('uv-') or s.endswith(' uv') or s == 'uv-druck' or s == 'druck': process = 'UV'
    if not process and sku:
        m = SKU.match(sku)
        if m and 'UV' in m.group(1): process = 'UV'
    material = ''
    for s in low:
        for k, v in MATERIAL:
            if s == k: material = v; break
        if material: break
    if not material:
        for s in low:
            if SIZE.match(s): continue
            for k, v in MATERIAL:
                if k in s: material = v; break
            if material: break
    if not material and sku:
        m = SKU.match(sku)
        if m: material = MAT_CODE.get(m.group(2).strip('-').split('-')[-1], '')
    form = ''; size = ''
    for s in segs:
        m = SIZE.match(s)
        if m:
            size = size or f"{m.group(1)}x{m.group(2)}"
            rest = s[m.end():].strip(' -_()').lower()
            for k, v in FORM_WORDS:
                if k in rest: form = form or v; break
    if not form:
        for s in low:
            if SIZE.match(s): continue
            for k, v in FORM_WORDS:
                if re.search(r'\b' + re.escape(k), s): form = v; break
            if form: break
    return {'process': process, 'material': material, 'form': form, 'size': size}


def label_from_stem(stem):
    m = re.search(r'_Designs?_?(.*)$', stem, re.I)
    if m: return m.group(1).replace('_', ' ').strip()
    m = re.match(r'^[A-Z0-9-]+-[\d.,]+x[\d.,]+[_ -]*(.*)$', stem)
    return (m.group(1) if m else stem).replace('_', ' ').strip()


def collect(quelle, linie):
    base = quelle / linie
    cdr_folders = collections.OrderedDict(); fpd = collections.OrderedDict()
    for root, dirs, files in os.walk(base):
        rel = Path(root).relative_to(base)
        if SKIP.search(str(rel)): dirs[:] = []; continue
        name = Path(root).name
        if name == '[CDR]':
            cdrs = sorted(f for f in files if f.lower().endswith('.cdr') and not f.startswith('Sicherungskopie_von_'))
            if cdrs: cdr_folders[rel.parent] = [Path(root) / f for f in cdrs]
            dirs[:] = []
        elif SKU.match(name) and 'product.json' in files:
            fpd.setdefault(rel.parent, []).append(Path(root))
            dirs[:] = []
    return cdr_folders, fpd


def run(cmd, log, env=None):
    t0 = time.time()
    r = subprocess.run(cmd, capture_output=True, text=True, env=env)
    with open(log, 'a', encoding='utf-8') as f:
        f.write(f"$ {' '.join(str(c) for c in cmd)}\n{r.stdout}{r.stderr}\n[{time.time() - t0:.0f} s, rc={r.returncode}]\n\n")
    return r.returncode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--quelle', required=True); ap.add_argument('--linie', required=True); ap.add_argument('--work', required=True); ap.add_argument('--katalog', required=True)
    ap.add_argument('--tree', default=''); ap.add_argument('--jobs', type=int, default=2); ap.add_argument('--nur-corel', action='store_true'); ap.add_argument('--nur-bau', action='store_true')
    ap.add_argument('--fontconfig', default='/tmp/claude-0/fonts.conf'); ap.add_argument('--slug', default='', help='Katalog-Ordnername (Standard aus Linie)')
    a = ap.parse_args()
    quelle = Path(a.quelle); linie = a.linie; lslug = a.slug or slug(linie).lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    work = Path(a.work) / lslug; src = work / 'src'; src.mkdir(parents=True, exist_ok=True); log = work / 'light-pass.log'
    env = {**os.environ, 'FONTCONFIG_FILE': a.fontconfig}
    cdr_folders, fpd = collect(quelle, linie)
    print(f"{linie}: {len(cdr_folders)} [CDR]-Ordner mit {sum(len(v) for v in cdr_folders.values())} Bögen, {sum(len(v) for v in fpd.values())} Konfigurator-Auszüge in {len(fpd)} Ordnern", flush=True)
    if not a.nur_bau:
        # 1. Corel-Bögen
        tasks = []
        for rel, cdrs in cdr_folders.items():
            segs = list(rel.parts)
            jobs = []
            for c in cdrs:
                m = meta_from_path(segs)
                jobs.append({'file': str(c), 'label': label_from_stem(c.stem), 'material': m['material'], 'process': m['process'], 'form': m['form'], 'sizeFolder': m['size'], 'sourcePath': f"{linie}/{rel.as_posix()}"})
            out = src / ('corel-' + slug('-'.join(segs)) if segs else 'corel-wurzel')
            jl = work / 'jobs' / (out.name + '.json'); jl.parent.mkdir(parents=True, exist_ok=True)
            jl.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding='utf-8')
            tasks.append(([sys.executable, str(HERE / 'read-corel-design-sheets.py'), '--out', str(out), '--from-list', str(jl), '--no-png'], out.name))
        done = [0]
        def go(t):
            rc = run(t[0], log, env); done[0] += 1
            print(f"  [{done[0]}/{len(tasks)}] {t[1]} rc={rc}", flush=True)
        with ThreadPoolExecutor(a.jobs) as ex: list(ex.map(go, tasks))
        # 2. Konfigurator-Auszüge
        if not a.nur_corel:
            tasks = []
            for rel, pkgs in fpd.items():
                segs = list(rel.parts)
                m = meta_from_path(segs, pkgs[0].name)
                out = src / ('fpd-' + slug('-'.join(segs)) if segs else 'fpd-wurzel')
                jl = work / 'jobs' / (out.name + '.txt'); jl.write_text('\n'.join(str(p) for p in pkgs) + '\n', encoding='utf-8')
                tasks.append(([sys.executable, str(HERE / 'read-fpd-design-packages.py'), '--out', str(out), '--from-list', str(jl), '--no-ocr', '--process', m['process'] or 'offen', '--material', m['material'], '--form', m['form']], out.name))
            done = [0]
            with ThreadPoolExecutor(a.jobs) as ex: list(ex.map(go, tasks))
    # 3. Bestand
    out = Path(a.katalog) / 'designs' / 'bestand' / lslug
    cmd = [sys.executable, str(HERE / 'build-design-bestand.py'), '--line', lslug, '--sources', str(src), '--out', str(out)]
    if a.tree: cmd += ['--tree', a.tree]
    rc = run(cmd, log, env)
    print(f"Bestand {lslug}: rc={rc} → {out}", flush=True)
    print(open(log, encoding='utf-8').read().strip().splitlines()[-3:])


if __name__ == '__main__':
    main()
