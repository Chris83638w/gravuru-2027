import subprocess,json,collections,sys,os
K='/home/claude/gravuru-katalog'
def git(*a,**k): return subprocess.run(['git','-C',K,*a],capture_output=True,text=True,**k).stdout
def series(p):
    parts=p.split('/')
    return '/'.join(parts[1:3]) if parts[1]=='bestand' else parts[1]
def readbatch(rev,paths):
    inp=''.join(f'{rev}:{p}\n' for p in paths)
    out=subprocess.run(['git','-C',K,'cat-file','--batch'],input=inp.encode(),capture_output=True).stdout
    res=[];i=0
    for p in paths:
        nl=out.index(b'\n',i); hdr=out[i:nl].decode().split(); 
        if hdr[-1]=='missing': res.append(None); i=nl+1; continue
        size=int(hdr[2]); body=out[nl+1:nl+1+size]; i=nl+1+size+1
        try: res.append(json.loads(body))
        except Exception: res.append({})
    return res
def stats(rev,paths):
    S=collections.OrderedDict()
    for p,d in zip(paths,readbatch(rev,paths)):
        s=series(p); e=S.setdefault(s,{'n':0,'ziele':0,'frei':0,'nicht':0,'mat':collections.Counter()})
        d=d or {}; e['n']+=1
        if d.get('ziele'): e['ziele']+=1
        if d.get('freigabe') or any(isinstance(z,dict) and isinstance(z.get('freigabe'),dict) and z['freigabe'].get('status')=='freigegeben' for z in (d.get('ziele') or [])): e['frei']+=1
        if d.get('nichtAngeboten'): e['nicht']+=1
        e['mat'][str(d.get('material') or '')]+=1
    return S
main=[l.strip() for l in open('../woche/main-designs.txt')]
M=stats('origin/main',main)
json.dump({k:{**v,'mat':dict(v['mat'])} for k,v in M.items()},open('main.json','w'),ensure_ascii=False)
print('main',sum(v['n'] for v in M.values()),len(M))
