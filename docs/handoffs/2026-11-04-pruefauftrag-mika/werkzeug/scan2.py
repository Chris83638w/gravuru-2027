import subprocess,json,collections
exec(open('scan.py').read().split("main=[")[0])
O=json.load(open('open.json')); rows=[]
for p in O:
    rev=f"pr/{p['n']}"
    mb=git('merge-base','origin/main',rev).strip()
    if not mb: rows.append({**p,'n_designs':-1}); continue
    added=[l for l in git('diff','--name-only','--diff-filter=A',mb,rev,'--','designs/').split('\n') if l.endswith('/design.json')]
    mod=[l for l in git('diff','--name-only','--diff-filter=M',mb,rev,'--','designs/').split('\n') if l.endswith('/design.json')]
    S=stats(rev,added) if added else {}
    rows.append({**p,'neu':len(added),'geaendert':len(mod),'serien':{k:{**v,'mat':dict(v['mat'])} for k,v in S.items()}})
json.dump(rows,open('open-designs.json','w'),ensure_ascii=False)
print(sum(r.get('neu',0) for r in rows), sum(1 for r in rows if r.get('neu')))
