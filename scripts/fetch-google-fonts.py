"""Google-Fonts-Dateien (OFL/Apache/UFL) aus dem offiziellen Repo google/fonts in den Katalog holen.

Für jede Schriftfamilie: Familienordner im Repo finden (ofl/, apache/, ufl/), den regulären
Schnitt als statische TTF ablegen (vorhandene `-Regular.ttf`, sonst statische Instanz wght 400 /
wdth 100 aus der variablen Schrift – die Werkstatt verarbeitet keine variablen Schriften) und die
Lizenzdatei daneben. Ergebnis: <katalog>/schriften/dateien/<Name>/<Name>-Regular.ttf + Lizenz.

    python scripts/fetch-google-fonts.py --repo /tmp/gf --out <katalog>/schriften/dateien "Cinzel" "Great Vibes" …
--repo: Sparse-Klon von https://github.com/google/fonts (git clone --depth 1 --filter=blob:none --sparse).
Nur Lesen aus dem Repo; nichts wird in die Werkstatt importiert. Meldet je Schrift Datei, Quelle, Lizenz.
"""
import argparse, io, json, re, shutil, subprocess, sys
from pathlib import Path
from fontTools.ttLib import TTFont

LICENSE_FILES = ('OFL.txt', 'LICENSE.txt', 'UFL.txt', 'LICENCE.txt')


def slug(name): return re.sub(r'[^a-z0-9]', '', name.lower())


def family_dirs(repo):
    out = subprocess.run(['git', '-C', str(repo), 'ls-tree', '--name-only', 'HEAD', 'ofl/', 'apache/', 'ufl/'], capture_output=True, text=True, check=True).stdout.split()
    return {Path(d).name: d for d in out}


def static_regular(path, name):
    f = TTFont(path)
    if 'fvar' in f:
        from fontTools.varLib import instancer
        axes = {a.axisTag: a.defaultValue for a in f['fvar'].axes}
        loc = {t: (400 if t == 'wght' else 100 if t == 'wdth' else v) for t, v in axes.items()}
        loc = {t: min(max(v, a.minValue), a.maxValue) for (t, v), a in zip(loc.items(), f['fvar'].axes)}
        f = instancer.instantiateVariableFont(f, loc, inplace=False, updateFontNames=True)
        note = 'statische Instanz ' + ', '.join(f'{t}={v:g}' for t, v in loc.items()) + ' aus variabler Schrift'
    else:
        note = 'statischer Schnitt aus dem Repo'
    cmap = f.getBestCmap() or {}
    if not 1 <= len(cmap) <= 10000: raise ValueError(f'{len(cmap)} Zeichen – außerhalb 1…10000')
    return f, note, f['name'].getBestFamilyName(), f['name'].getBestSubFamilyName(), len(cmap)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--repo', required=True); ap.add_argument('--out', required=True); ap.add_argument('names', nargs='+')
    a = ap.parse_args(); repo = Path(a.repo); out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    dirs = family_dirs(repo)
    wanted = {n: dirs.get(slug(n)) for n in a.names}
    missing = [n for n, d in wanted.items() if not d]
    present = [d for d in wanted.values() if d]
    subprocess.run(['git', '-C', str(repo), 'sparse-checkout', 'set', '--no-cone'] + [d + '/' for d in present], check=True, capture_output=True)
    head = subprocess.run(['git', '-C', str(repo), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    report = []
    for name, d in wanted.items():
        if not d: report.append({'name': name, 'ok': False, 'error': 'nicht im Repo google/fonts gefunden'}); continue
        fam = repo / d; files = sorted(fam.rglob('*.ttf'))
        base = name.replace(' ', '')
        pick = next((p for p in files if p.name.lower() == f'{base.lower()}-regular.ttf'), None) \
            or next((p for p in files if p.name.lower() == f'{base.lower()}-400.ttf'), None) \
            or next((p for p in files if '[' in p.name and 'italic' not in p.name.lower()), None) \
            or next((p for p in files if 'regular' in p.name.lower() or p.name.lower().endswith('.ttf') and 'italic' not in p.name.lower()), None)
        if not pick: report.append({'name': name, 'ok': False, 'error': 'keine TTF im Familienordner'}); continue
        try:
            f, note, fam_name, sub, nglyphs = static_regular(pick, name)
        except Exception as e:
            report.append({'name': name, 'ok': False, 'error': f'{pick.name}: {str(e)[:120]}'}); continue
        target = out / name; target.mkdir(exist_ok=True)
        ttf = target / f'{base}-Regular.ttf'; f.save(ttf)
        lic = next((fam / l for l in LICENSE_FILES if (fam / l).exists()), None)
        if lic: shutil.copy(lic, target / lic.name)
        report.append({'name': name, 'ok': True, 'file': ttf.relative_to(out.parent.parent).as_posix() if out.parent.parent in ttf.parents else str(ttf), 'sourceFile': pick.relative_to(repo).as_posix(),
                       'source': f'https://github.com/google/fonts/tree/{head[:12]}/{d}', 'license': (lic.name if lic else 'offen'), 'note': note, 'familyName': fam_name, 'style': sub, 'glyphs': nglyphs, 'bytes': ttf.stat().st_size})
    (out / '_fetch-bericht.json').write_text(json.dumps({'repoCommit': head, 'fonts': report}, ensure_ascii=False, indent=1), encoding='utf-8')
    ok = [r for r in report if r['ok']]
    print(f'{len(ok)} von {len(report)} Schriften geholt → {out}')
    for r in report:
        print((' ✓ ' if r['ok'] else ' ✗ ') + r['name'] + (f" ← {r['sourceFile']} ({r['note']}, {r['glyphs']} Zeichen, Name „{r['familyName']}“)" if r['ok'] else f": {r['error']}"))


if __name__ == '__main__':
    main()
