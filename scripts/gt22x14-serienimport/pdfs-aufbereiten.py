"""Freigegebene PDF-Designs stapelweise importieren, Originale unveraendert lassen."""
from __future__ import annotations
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

def load(p): return json.loads(Path(p).read_text(encoding="utf-8-sig"))
def main():
    root=Path(__file__).resolve().parent
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--plan", type=Path, default=root.parent/"Produktplan-4-Hundeprodukte.json")
    ap.add_argument("--fonts", type=Path, default=root/"Fonts")
    ap.add_argument("--python-libs", type=Path)
    ap.add_argument("--poppler", type=Path)
    a=ap.parse_args()
    if not a.pdf.is_dir(): ap.error("PDF-Ordner fehlt.")
    if a.out.exists() and any(a.out.iterdir()): ap.error("Ausgabe muss leer sein; bestehende Daten werden nicht ueberschrieben.")
    plan=load(a.plan)
    allowed={v.rsplit("-",1)[-1] for p in plan["products"] for v in p["designIds"]}
    picked={}
    for p in a.pdf.glob("*.pdf"):
        m=re.search(r"(D\d+)\.pdf$",p.name,re.I)
        if m and m[1].upper() in allowed:
            key=m[1].upper()
            if key in picked: ap.error("Mehrdeutige Quelle: "+key)
            picked[key]=p
    if set(picked)!=allowed: ap.error("PDF fehlt: "+", ".join(sorted(allowed-set(picked))))
    a.out.mkdir(parents=True, exist_ok=True)
    a.out=a.out.resolve()
    env=dict(os.environ, PYTHONUTF8="1")
    if a.python_libs: env["PYTHONPATH"]=str(a.python_libs.resolve())+os.pathsep+env.get("PYTHONPATH","")
    if a.poppler: env["PATH"]=str(a.poppler.resolve())+os.pathsep+env.get("PATH","")
    with tempfile.TemporaryDirectory(prefix="pdf-import-",dir=a.out.parent) as temp:
        t=Path(temp);src=t/"pdf";src.mkdir()
        kat=t/"katalog";(kat/"schriften").mkdir(parents=True)
        provenance=[]
        for key,p in sorted(picked.items()):
            shutil.copy2(p,src/p.name)
            provenance.append({"id":key,"source":str(p.resolve()),"sha256":hashlib.sha256(p.read_bytes()).hexdigest()})
        fonts=[]
        for f in load(root/"Schriftzuordnung.json")["found"]:
            p=a.fonts/Path(f["file"].replace("\\","/")).name
            if not p.is_file(): ap.error("Schrift fehlt: "+str(p))
            fonts.append({"name":f["name"],"file":str(p.resolve())})
        (kat/"schriften/schriften.json").write_text(json.dumps({"fonts":fonts},ensure_ascii=False),encoding="utf-8")
        subprocess.run([sys.executable,"-X","utf8",str(root.parent/"read-pdf-designs.py"),"--pdf",str(src),"--out",str(a.out),"--flach","--katalog",str(kat),"--zuordnung",str(root/"PDF-Zuordnung.json"),"--ersatz",str(root/"Schrift-Ersatz.json")],env=env,check=True)
        index=load(a.out/"index.json")
        if len(index)!=len(allowed): raise RuntimeError("Designanzahl stimmt nicht.")
        warnings=[(x["key"],x["warnungen"]) for x in index if x["warnungen"]]
        (a.out/"Quellnachweis.json").write_text(json.dumps({"sources":provenance,"warnings":warnings,"productionApproved":False},ensure_ascii=False,indent=2),encoding="utf-8")
        if warnings: raise RuntimeError("Designwarnungen erfordern Sichtpruefung: "+repr(warnings))
        print(json.dumps({"designs":len(index),"warnings":0,"out":str(a.out),"productionApproved":False}))
if __name__=="__main__": main()
