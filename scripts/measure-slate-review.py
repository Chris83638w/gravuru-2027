"""Batch wrapper for the unchanged Design-Master measurement script; no artwork edits."""
import argparse, contextlib, io, json, pathlib, runpy, sys
from concurrent.futures import ProcessPoolExecutor

def measure(job):
    script, image, identity = job
    sys.argv = [script, image]
    with contextlib.redirect_stdout(io.StringIO()):
        namespace = runpy.run_path(script, run_name='__main__')
    rows = namespace.get('res', [])
    return dict(identity, measured=bool(rows), measurements=rows,
                limitation=None if rows else 'Keine zuverlässig messbare Platte erkannt (Schwellwerte/Form); Sichtprüfung erforderlich.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--index', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--workers', type=int, default=2)
    args = parser.parse_args()
    source = pathlib.Path(args.index).resolve()
    index = json.loads(source.read_text(encoding='utf-8'))
    script = str(pathlib.Path(__file__).with_name('flaeche-messen.py').resolve())
    jobs = [(script, str(source.parent / r['png']), {k: r.get(k) for k in ('id', 'reihe', 'size', 'format', 'group', 'status')})
            for r in index['ergebnisse'] if r.get('png')]
    with ProcessPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
        rows = []
        for row in pool.map(measure, jobs, chunksize=8):
            rows.append(row)
            if len(rows) % 200 == 0: print(json.dumps(dict(done=len(rows), total=len(jobs))), flush=True)
    output = dict(family=index['familie'], method='scripts/flaeche-messen.py unverändert; einzelne Zieltafeln aus denselben Kontaktbögen',
                  images=len(rows), measured=sum(r['measured'] for r in rows),
                  flagged=sum(any(m['befund'] for m in r['measurements']) for r in rows),
                  artworkChanged=False, rows=rows)
    target = pathlib.Path(args.out)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, indent=1, default=lambda v: v.item())+'\n', encoding='utf-8')
    print(json.dumps({k:v for k,v in output.items() if k!='rows'}, ensure_ascii=False))
