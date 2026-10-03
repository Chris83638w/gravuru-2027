"""Verify, build and serve the isolated Labrador specimen using only the stdlib."""
from pathlib import Path
import argparse, functools, hashlib, http.server, json, runpy

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

def verify():
    entries = json.loads((HERE/'RESOURCE-INVENTORY.json').read_text(encoding='utf-8'))
    for entry in entries:
        path = (ROOT/entry['path']).resolve()
        if not path.is_relative_to(ROOT) or not path.is_file():
            raise SystemExit('Missing or invalid resource: '+entry['path'])
        data = path.read_bytes()
        if len(data) != entry['bytes'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise SystemExit('Resource checksum mismatch: '+entry['path'])
    print('Verified',len(entries),'repository resources.',flush=True)

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port',type=int,default=8943)
    parser.add_argument('--check',action='store_true',help='Verify and build without starting HTTP')
    parser.add_argument('--offline-check',action='store_true',help='Block non-local browser resources via CSP during the start test')
    args=parser.parse_args()
    verify()
    runpy.run_path(str(HERE/'build-preview.py'),run_name='__main__')
    if not args.check:
        class PreviewHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                if args.offline_check:
                    self.send_header('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'")
                super().end_headers()
        handler=functools.partial(PreviewHandler,directory=str(HERE))
        with http.server.ThreadingHTTPServer(('127.0.0.1',args.port),handler) as server:
            print(f'Open http://127.0.0.1:{args.port}/.preview/ (Ctrl+C to stop)',flush=True)
            try: server.serve_forever()
            except KeyboardInterrupt: pass
