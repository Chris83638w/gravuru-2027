from pathlib import Path
import json
import sys
ROOT = Path(__file__).resolve().parent
files = ['theme/' + p for p in json.loads((ROOT/'completion-files.json').read_text(encoding='utf-8'))]
files += ['validate_theme.mjs', 'complete_store.py', 'finish_store.py', 'completion-files.json', 'STORE-STATUS.md', 'export_completion.py']
start, limit = map(int, sys.argv[1:3])
print(json.dumps({p: (ROOT/p).read_text(encoding='utf-8') for p in files[start:start+limit]}, ensure_ascii=True))
