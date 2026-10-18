"""Markierungen aus der Übersichtsseite (Artifact-Datenbank, Sammlung „markierungen“) in einen Bestandsordner übernehmen.

Export der Sammlung: ArtifactData list markierungen mit out_dir → <dir>/markierungen/<schlüssel>.json
    {"id": "...", "data": {"status": "loeschen"|"fehler"|"foto", "notiz": "...", "zeit": "..."}}

- loeschen: Designordner aus dem Katalog entfernen, Eintrag aus designs.json nehmen, in _geloescht.json festhalten
- fehler / foto: als Bemerkung in designs.json (kategorie.bemerkung) und _markierungen.json
Danach Excel, Übersichtsbögen, UEBERSICHT.md und README neu schreiben.

    python scripts/apply-markierungen.py --out <katalog>/designs/bestand/<linie> --line <linie> --marks <dir>/markierungen
"""
import argparse, importlib.util, json, shutil, sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location('bestand', HERE / 'build-design-bestand.py')
bestand = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(bestand)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True); ap.add_argument('--line', required=True); ap.add_argument('--marks', required=True)
    a = ap.parse_args(); out = Path(a.out)
    marks = {}
    for f in sorted(Path(a.marks).glob('*.json')):
        j = json.loads(f.read_text(encoding='utf-8')); d = j.get('data', j)
        if d.get('status'): marks[j.get('id', f.stem)] = d
    index = json.loads((out / 'designs.json').read_text(encoding='utf-8'))
    gel_path = out / '_geloescht.json'
    geloescht = json.loads(gel_path.read_text(encoding='utf-8')) if gel_path.exists() else []
    keep = []; n_del = n_mark = 0
    for d in index:
        m = marks.get(d['key'])
        if m and m['status'] == 'loeschen':
            folder = out / d['path']
            if folder.exists(): shutil.rmtree(folder)
            # leere Kategorieordner entfernen
            for p in (folder.parent, folder.parent.parent):
                if p != out and p.exists() and not any(p.iterdir()): p.rmdir()
            geloescht.append({'key': d['key'], 'path': d['path'], 'ids': d.get('ids', []), 'zeit': m.get('zeit', ''), 'am': date.today().isoformat()})
            n_del += 1; continue
        if m:
            d['kategorie']['bemerkung'] = ('Fehler: ' + (m.get('notiz') or 'ohne Notiz')) if m['status'] == 'fehler' else 'Foto fehlt'
            d['kategorie']['markierung'] = {'status': m['status'], 'notiz': m.get('notiz', ''), 'zeit': m.get('zeit', '')}
            dj = out / d['path'] / 'design.json'
            if dj.exists():
                full = json.loads(dj.read_text(encoding='utf-8')); full.setdefault('katalog', {}).setdefault('kategorie', {}).update(d['kategorie'])
                dj.write_text(json.dumps(full, ensure_ascii=False, indent=1), encoding='utf-8')
            n_mark += 1
        keep.append(d)
    (out / 'designs.json').write_text(json.dumps(keep, ensure_ascii=False, indent=1), encoding='utf-8')
    gel_path.write_text(json.dumps(geloescht, ensure_ascii=False, indent=1), encoding='utf-8')
    (out / '_markierungen.json').write_text(json.dumps(marks, ensure_ascii=False, indent=1), encoding='utf-8')
    bestand.write_xlsx(keep, out / f'{a.line.upper()}-DESIGNS.xlsx', out)
    for old in (out / '_uebersicht').glob('*.png'): old.unlink()
    bestand.write_contact_sheets(keep, out)
    bestand.write_overview_md(keep, out, a.line)
    bestand.write_readme(keep, out, a.line)
    print(f'{n_del} gelöscht, {n_mark} markiert (Fehler/Foto), {len(keep)} Designs bleiben → {out}')


if __name__ == '__main__':
    main()
