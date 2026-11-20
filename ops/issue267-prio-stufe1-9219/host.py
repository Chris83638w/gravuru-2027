"""Apply one approved frontend release by switching only the Merchant startup pointer."""
from pathlib import Path
import base64, fcntl, gzip, hashlib, json, os, shutil, stat, subprocess, tempfile
from datetime import datetime, timezone

BASE = '2bd7bd8e4b556955fbbbe28b585ecdaa4bfc7179'
NEXT = '921928f41a7d61e73b504400728f2f6f629e8ade'
START_SHA = 'ecafbb7fca8bc32e9d4c53df7d23d4c38b680eea500ef11d730c65d32eeac245'
M = 'app/configurator/variant-m/'
FILES = {
    M+'adapter.mjs': ('191eef2e9dcf45112d44c3429f0d77784ac23e68a439b4284bbc418d783f9224','68e0bb9900a4c6dd54b72e934704abcce3773b070ac7791173042c8d53756385'),
    M+'design-adoption.mjs': (None,'eca169c1209b9d33d13d3205f02b69f353a9735a27fd045971bcedb3b1cd35e5'),
    M+'lazy-resources.mjs': ('b537719759fcb97507a16aa38947937192a8a40dc58dce8c7e0478dc017a3da7','2ba7b75b3798cbdfa00226955bacd2c6313ec0155064250b3cf65d8d841f7f5a'),
    M+'product-design-gallery.mjs': ('83b330bcef1898fa61a727eb5f3b600a70e8c11fdb68583b68f14c68a17ef16d','c79368d5e4e93425b5b8f0fc7af6639f2ce2de7b8f3a544cc744472c1a7ea24a'),
    'app/workshop/ui/shop-design-switch.mjs': ('527a0707994b6d3d03f8b6e26ccfd72a58cf88b9379675800593c02f70c6a59a','02a303c57b48fd1cb4df3ca16a351a396ef67cee8d8203b6e642f7b3726ff21c')
}
HTML = Path(M)/'.preview/editor.html'
BUNDLES = HTML.parent/'bundle'
BEFORE = 'editor-03848a8822ea9589.mjs'
AFTER = 'editor-6c00a8d0e08b6e0d.mjs'
BEFORE_HTML = 'aff66bfca174f0fd23d9f378e6aacd0d491f257f2519800063e1b66e7a55a17e'
AFTER_HTML = '06dec99757088622f9fd7740c1640f493c8db10133fed5f9e536bf34ae1581b6'
AFTER_RAW = '432d393d9323d2997d8eb3aebd3f141559a2c9ca5e2367aece60ea8eae9d35b1'

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def verified(path):
    require(path.resolve()==path and path.is_file(),'Unerwarteter Dateipfad '+path.name)
    return path.read_bytes()

def files_match(rt, side):
    for name, hashes in FILES.items():
        dest=rt/name
        require(dest.resolve()==dest, 'Unerwartetes Ziel '+name)
        if hashes[side] is None:
            require(not dest.exists(),'Neue Datei bereits vorhanden: '+name)
        else:
            require(digest(verified(dest))==hashes[side], 'Quellstand abweichend: '+name)
    expected=AFTER_HTML if side else BEFORE_HTML
    require(digest(verified(rt/HTML))==expected,'Aktiver Editor weicht vom geprüften Build ab.')

def snapshot(rt):
    # Customer orders, drafts, databases and the app's persistent directories
    # are external to this runtime. Verify exactly what can enter the copy.
    allowed={'ops','app','scripts','package.json','.local-data'}
    require({p.name for p in rt.iterdir()}==allowed,'Geänderter Laufzeitaufbau.')
    require({p.name for p in (rt/'.local-data').iterdir()}=={'python'},'Unerwartete lokale Anwendungsdaten.')
    h=hashlib.sha256()
    for parent, dirs, files in os.walk(rt):
        dirs.sort();files.sort()
        for n in dirs+files:
            p=Path(parent)/n
            require(not p.is_symlink(),'Symlink in der Laufzeit: '+str(p.relative_to(rt)))
            require(not n.endswith(('.sqlite','.sqlite3','.db','.sqlite-wal','.sqlite-shm')),'Persistente Daten in der Laufzeit.')
        for n in files:
            p=Path(parent)/n; rel=p.relative_to(rt)
            if rel.parts[0]=='.local-data' or '.preview' in rel.parts or '__pycache__' in rel.parts or n.endswith('.pyc'):
                continue
            h.update(str(rel).encode()+b'\0'+hashlib.sha256(p.read_bytes()).digest())
    return h.hexdigest()

def atomic(path, old, new):
    require(verified(path)==old,'Parallele Änderung an '+path.name)
    with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.stage1-',delete=False) as tmp:
        temp=Path(tmp.name)
        try:
            os.fchmod(tmp.fileno(),stat.S_IMODE(path.stat().st_mode))
            tmp.write(new);tmp.flush();os.fsync(tmp.fileno())
        except BaseException:
            temp.unlink(missing_ok=True);raise
    try:
        require(verified(path)==old,'Parallele Änderung an '+path.name)
        os.replace(temp,path)
    finally:
        temp.unlink(missing_ok=True)

def retained(path,data):
    require(path.resolve()==path,'Unerwarteter Paketpfad.')
    if path.exists():
        require(verified(path)==data,'Paketkonflikt: '+path.name)
        return
    with tempfile.NamedTemporaryFile(dir=path.parent,prefix='.stage1-',delete=False) as tmp:
        temp=Path(tmp.name)
        try:
            os.fchmod(tmp.fileno(),0o644);tmp.write(data);tmp.flush();os.fsync(tmp.fileno())
            try:
                os.link(temp,path)
            except FileExistsError:
                require(verified(path)==data,'Paralleles Paket weicht ab.')
        finally:
            temp.unlink(missing_ok=True)

def stage_release(req, previous, following):
    files_match(source,0)
    signature=snapshot(source)
    require(shutil.disk_usage(private).free>400*1024**2,'Zu wenig Platz für getrennte Laufzeit und Rückweg.')
    require(set(req['files'])==set(FILES),'Unerwartete Dateien im Transfer.')
    with tempfile.TemporaryDirectory(dir=private,prefix='.astra-prio9219-') as temp:
        folder=Path(temp)/'release';folder.mkdir(mode=0o700)
        rt=folder/'runtime'
        shutil.copytree(source,rt,symlinks=True)
        require(snapshot(rt)==signature,'Laufzeitkopie weicht ab.')
        for name, hashes in FILES.items():
            content=base64.b64decode(req['files'][name],validate=True)
            require(digest(content)==hashes[1],'Paketinhalt abweichend: '+name)
            path=rt/name
            if hashes[0] is None:
                retained(path,content)
            else:
                old=verified(path);require(digest(old)==hashes[0],'Kopie abweichend: '+name)
                atomic(path,old,content)
            subprocess.run([node,'--check',str(path)],check=True,stdout=subprocess.DEVNULL)
        originals={p.name:digest(verified(p)) for p in (source/BUNDLES).glob('editor-*.mjs')}
        for name in originals:
            retained(rt/BUNDLES/(name+'.keep'),b'')
        subprocess.run([node,'--input-type=module','-e',"import {build} from './app/configurator/variant-m/build.mjs';build()"],cwd=rt,check=True,stdout=subprocess.DEVNULL)
        files_match(rt,1)
        require(verified(source/HTML).replace(BEFORE.encode(),AFTER.encode())==verified(rt/HTML),'Editor-HTML enthält außer dem neuen Kern weitere Änderungen.')
        chunks=rt/BUNDLES
        require({p.name for p in chunks.glob('editor-*.mjs')}==set(originals)|{AFTER},'Unerwartete Editorpakete.')
        for name,expected in originals.items():
            require(digest(verified(chunks/name))==expected,'Historisches Paket geändert: '+name)
        raw=verified(chunks/AFTER)
        require(digest(raw)==AFTER_RAW and gzip.decompress(verified(chunks/(AFTER+'.gz')))==raw,'Neuer Kern ungültig.')
        (folder/'start-vorher.cjs').write_bytes(previous)
        (folder/'start-neu.cjs').write_bytes(following)
        probe=folder/'probe.cjs';probe.write_bytes(previous)
        atomic(probe,previous,following);atomic(probe,following,previous)
        require(verified(probe)==previous,'Rücknahmeprobe fehlgeschlagen.');probe.unlink()
        require(snapshot(source)==signature and verified(entry)==previous,'Laufzeit zwischenzeitlich geändert.')
        m={'base':BASE,'commit':NEXT,'sourceSnapshot':signature,'candidateSnapshot':snapshot(rt),'startBefore':digest(previous),'startAfter':digest(following),'newCore':AFTER,'oldCore':BEFORE,'retained':len(originals),'verifiedRollback':True}
        (folder/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
        require(not stage.exists(),'Stufe ist bereits vorhanden.')
        os.rename(folder,stage)

def main(req):
    action=req['action'];require(action in ('inspect','stage','apply','rollback','check'),'Unbekannter Befehl.')
    guard_files=[entry,restart,source,stage,stage/'runtime',lock]
    require(all(p.resolve()==p for p in guard_files),'Link in Release-Pfaden erkannt.')
    if action=='inspect':
        files_match(source,0);print(json.dumps({'base':BASE,'sourceMatches':True,'starter':digest(verified(entry)),'stageExists':stage.exists(),'oldHtml':BEFORE_HTML}));return
    old=verified(entry)
    if stage.exists():
        old=verified(stage/'start-vorher.cjs')
    require(digest(old)==START_SHA and old.count((str(source)+'/').encode())==1,'Unbekannter Starter.')
    new=old.replace((str(source)+'/').encode(),(str(target)+'/').encode(),1)
    require(all(x in old for x in [b'GRAVURU_ACRYL_DATA_DIR',b'GRAVURU_SHOPIFY_CONFIG_FILE']),'Datenanbindung abweichend.')
    with lock.open('a') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
        installed=verified(entry);require(installed in (old,new),'Andere aktive Veröffentlichung.')
        if action=='stage' and not stage.exists():
            require(installed==old,'Vorstufe nicht aktiv.')
            require(all(v['quickCheck']=='ok' and v['restoredIdentically'] for v in json.loads(verified(backup))['databases']),'Wiederherstellungsnachweis fehlt.')
            stage_release(req,old,new)
        m=json.loads(verified(stage/'manifest.json'))
        require(m['base']==BASE and m['commit']==NEXT and m['verifiedRollback'] and m['startAfter']==digest(new) and verified(stage/'start-neu.cjs')==new,'Unvollständiger Bereitstellungsstand.')
        files_match(source,0)
        if action!='rollback':
            files_match(target,1)
        current='candidate' if installed==new else 'baseline'
        if action in ('check','stage'):
            print(json.dumps({'phase':action,'active':current,**m}));return
        before,after=(old,new) if action=='apply' else (new,old)
        if installed==after:
            print(json.dumps({'phase':action,'active':current,'alreadyApplied':True}));return
        require(snapshot(source)==m['sourceSnapshot'],'Vorgänger hat sich seit der Bereitstellung geändert.')
        # On rollback the candidate may be unhealthy. Only its checked frontend
        # and the currently active startup pointer are needed to restore the old code.
        if action=='apply':
            require(snapshot(target)==m['candidateSnapshot'],'Kandidat hat sich seit der Bereitstellung geändert.')
            # Newly opened browsers can finish fetching the new immutable module
            # even if the old runtime is selected again immediately afterwards.
            raw=verified(target/BUNDLES/AFTER); gz=verified(target/BUNDLES/(AFTER+'.gz'))
            require(digest(raw)==AFTER_RAW and gzip.decompress(gz)==raw,'Kerninhalt abweichend.')
            for name,data in [(AFTER,raw),(AFTER+'.gz',gz),(AFTER+'.keep',b'')]:
                retained(source/BUNDLES/name,data)
        require(restart.is_file() and not restart.is_symlink(),'Neustartdatei abweichend.')
        atomic(entry,before,after)
        try:
            restart.touch();require(verified(entry)==after,'Startdatei nicht bestätigt.')
        except BaseException:
            if verified(entry)==after:
                atomic(entry,after,before);restart.touch()
            raise
        event={'phase':action,'at':datetime.now(timezone.utc).isoformat(),'active':'candidate' if after==new else 'baseline','starter':digest(after),'commit':NEXT}
        with (stage/'journal.jsonl').open('a') as out:out.write(json.dumps(event)+'\n');out.flush();os.fsync(out.fileno())
        print(json.dumps(event))

if __name__=='__main__':
    os.umask(0o077)
    site=Path.cwd();require(site==Path('/var/www/vhosts/gravuru-designwerkstatt.de'),'Falsches Hostingkonto.')
    private=site/'private';source=private/'astra-r15-267-prio-7762f94c/runtime'
    stage=private/'astra-r15-267-prio-921928f4-stufe1';target=stage/'runtime'
    app=site/'gravuru-2027-merchant';entry=app/'app.cjs';restart=app/'tmp/restart.txt'
    lock=private/'astra-r15-267-live.lock';backup=private/'astra-r15-267-live-sicherung-20261119T1806Z/verification.json'
    node='/opt/plesk/node/24/bin/node'
    main(REQUEST)
