"""Read customer-owned artwork without network access. No guessed contour or font."""
from pathlib import Path, PurePosixPath
from zipfile import ZipFile, BadZipFile
import json
import re
import sys
from xml.etree import ElementTree as ET
from worker import colour, fragment, numbers, path_data, require, transform, IDENTITY
from corel_review import review_pair

def inspect_fpd(doc):
    views = doc.get("views",[])
    return {"format":"FPD","title":doc.get("title"),"views":[
        {"title":view.get("title"),"texts":[{"title":e.get("title"),"text":e.get("text",e.get("source")),"font":e.get("parameters",{}).get("fontFamily")} for e in view.get("elements",[]) if e.get("type") in ("text","i-text","textbox","curvedText")],
         "layers":[{"title":e.get("title"),"file":e.get("source"),"photo":bool(e.get("parameters",{}).get("uploadZone"))} for e in view.get("elements",[]) if e.get("type")=="image"]}
        for view in views],"status":"review","reason":"Druckebenen, Originalressourcen, physische Maße und Schnittpfad zuordnen."}

def read_svg(data, title):
    require(len(data)<=8_000_000 and b"<!" not in data, "SVG ohne externe Definitionen erforderlich.")
    root=ET.fromstring(data)
    require(root.tag.split("}")[-1]=="svg","SVG erforderlich.")
    require(set(root.attrib).issubset({"id","version","width","height","viewBox"}),"Globale SVG-Effekte zuerst in Pfade umwandeln.")
    width,height = [float(re.fullmatch(r"([\d]+(?:\.\d+)?)mm",root.get(k,"")).group(1)) if re.fullmatch(r"([\d]+(?:\.\d+)?)mm",root.get(k,"")) else 0 for k in ("width","height")]
    require(width>0 and height>0 and numbers(root.get("viewBox",""))==[0,0,width,height],"Millimeter und passende ViewBox mit Ursprung 0/0 erforderlich.")
    cuts, objects = [], []
    for idx,node in enumerate(root):
        tag=node.tag.split("}")[-1]
        if tag in ("title","desc","metadata"): continue
        key=node.get("id","element-"+str(idx))
        if key=="CutContour":
            paths = list(node) if tag=="g" else [node]
            require("transform" not in node.attrib and tag in ("g","path") and all(p.tag.split("}")[-1]=="path" and not set(p.attrib)-{"id","d","fill","stroke","stroke-width"} for p in paths),"Schnittpfad in physischen Seitenkoordinaten erforderlich.")
            for p in paths:
                path_data(p.attrib["d"],closed=True)
                cuts.append(p.attrib["d"])
        elif tag=="text":
            allowed={"id","x","y","font-size","font-family","text-anchor","fill","data-label"}
            require(not len(node) and not set(node.attrib)-allowed and node.get("text-anchor","start") in ("start","middle","end"),"Verschachtelten Text oder Texteffekte vorab prüfen.")
            objects.append(dict(type="text",key=key,label=node.get("data-label",key),text=node.text or "",font=node.attrib["font-family"],
                                size=float(node.attrib["font-size"]),x=float(node.attrib["x"]),y=float(node.attrib["y"]),w=0,h=0,baseline=True,
                                textAnchor=node.get("text-anchor","start"),color=colour(node.get("fill","#000000"))))
        elif tag=="rect" and node.get("data-studio-photo")=="true":
            require(not set(node.attrib)-{"id","data-studio-photo","x","y","width","height","fill"},"Fotofeld mit eigener Maske zuerst prüfen.")
            objects.append(dict(type="photo",x=float(node.attrib["x"]),y=float(node.attrib["y"]),w=float(node.attrib["width"]),h=float(node.attrib["height"])))
        else:
            objects.append(dict(type="motif",x=0,y=0,rotation=0,paths=fragment(ET.tostring(node,encoding="unicode"))))
    require(cuts, "Expliziter geschlossener Schnittpfad mit ID CutContour fehlt.")
    return dict(id=root.get("id","svg-design"),name=title,width=width,height=height,cuts=cuts,objects=objects)

def source_document(source):
    if source.suffix.lower() == ".zip":
        with ZipFile(source) as archive:
            names = archive.namelist()
            fpd = [name for name in names if PurePosixPath(name).name == "product.json"]
            corel = [name for name in names if PurePosixPath(name).name == "design.json"]
            def entry(name):
                require(names.count(name) == 1 and archive.getinfo(name).file_size <= 8_000_000,
                        "Archiveintrag fehlt, ist doppelt oder größer als 8 MB.")
                return archive.read(name)
            if fpd:
                require(len(fpd) == 1, "FPD-Archiv braucht genau eine product.json.")
                return json.loads(entry(fpd[0])), None
            require(len(corel) == 1, "Corel-Archiv braucht ein Dateipaar design.json und design.svg.")
            svg = str(PurePosixPath(corel[0]).with_name("design.svg"))
            return json.loads(entry(corel[0])), entry(svg)
    data = json.loads(source.read_text(encoding="utf-8-sig"))
    svg = source.with_suffix(".svg")
    if data.get("katalog", {}).get("sourceKind") == "corel-bogen" and svg.is_file():
        require(svg.stat().st_size <= 8_000_000, "SVG größer als 8 MB.")
        return data, svg.read_bytes()
    return data, None


if __name__=="__main__":
    try:
        source=Path(sys.argv[2])
        if sys.argv[1]=="svg":
            result=read_svg(source.read_bytes(),sys.argv[3] if len(sys.argv)>3 else source.stem)
        else:
            data, paired_svg = source_document(source)
            if sys.argv[1] == "corel-proof":
                require(paired_svg, "Für die Motivprobe werden Original-JSON und Original-SVG benötigt.")
                _, result = review_pair(data, paired_svg)
            elif "views" in data: result=inspect_fpd(data)
            else:
                texts=data.get("texts",[])
                result={"format":"Corel-Katalog","id":data.get("id"),"plate":data.get("plate"),"fonts":data.get("fonts"),"textCount":len(texts),"hintCount":sum(bool(t.get("hint")) for t in texts),"motifCount":len(data.get("motifs",[])),"photoFiles":data.get("photoFiles",[]),"photo":bool(data.get("photo") or data.get("photoFiles")),"status":"review","reason":"Original-SVG, Schriftkonturen und Schnittpfad zuordnen."}
                if paired_svg:
                    result["sourceLayers"], _ = review_pair(data, paired_svg)
                    result["reason"] = "Originalebenen geprüft. Schriftfreigabe, Produktionskontur und Ausführungsbindung sind offen."
        print(json.dumps(result,ensure_ascii=True))
    except (KeyError,ValueError,TypeError,OSError,IndexError,BadZipFile,ET.ParseError) as error:
        sys.exit(str(error))
