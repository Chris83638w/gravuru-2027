"""Import exact SVG path geometry and write a physical-size PDF with a named separation."""
import base64
import io
import json
import math
import re
import sys
from xml.etree import ElementTree as ET

from PIL import Image, ImageOps
from reportlab.graphics.svgpath import SvgPath
from reportlab.lib.colors import CMYKColorSep, HexColor
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen.canvas import Canvas

IDENTITY = [1, 0, 0, 1, 0, 0]
NUM = r"[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?"
PATH = re.compile(r"[MmLlHhVvCcSsQqTtAaZz0-9.,Ee+\s-]+")
def require(flag, message):
    if not flag:
        raise ValueError(message)

def numbers(text):
    require(not re.sub(NUM + r"|[\s,]+", "", text), "Ungültige SVG-Koordinate.")
    values = list(map(float, re.findall(NUM, text)))
    require(all(math.isfinite(n) for n in values), "Ungültige SVG-Zahl.")
    return values

def mul(m, n):
    a,b,c,d,e,f = m
    g,h,i,j,k,l = n
    return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f]

def transform(text):
    result = IDENTITY
    pattern = r"\s*,?\s*(matrix|translate|scale|rotate)\s*\(([^()]*)\)"
    while text.strip():
        match = re.match(pattern, text)
        require(match, "SVG-Transformation zuerst in Pfade umwandeln.")
        name, raw = match.groups()
        ns = numbers(raw)
        if name == "matrix" and len(ns) == 6:
            nxt = ns
        elif name == "translate" and len(ns) in (1,2):
            nxt = [1,0,0,1,ns[0],ns[1] if len(ns)==2 else 0]
        elif name == "scale" and len(ns) in (1,2):
            nxt = [ns[0],0,0,ns[-1],0,0]
        elif name == "rotate" and len(ns) in (1,3):
            a = math.radians(ns[0])
            x,y = ns[1:] if len(ns)==3 else (0,0)
            nxt = mul(mul([1,0,0,1,x,y],[math.cos(a),math.sin(a),-math.sin(a),math.cos(a),0,0]),[1,0,0,1,-x,-y])
        else:
            raise ValueError("Ungültige SVG-Transformation.")
        result = mul(result,nxt)
        text = text[match.end():]
    return result

def path_data(d, closed=False):
    require(d and len(d)<2_000_000 and PATH.fullmatch(d), "Ungültiger Vektorpfad.")
    path = SvgPath(d)
    require(path.operators and path.operators[0]==0, "Leerer Vektorpfad.")
    if closed:
        require(path.operators[-1]==3 and all(path.operators[i-1]==3 for i,op in enumerate(path.operators) if i and op==0), "Jede Teilkontur muss geschlossen sein.")
    return path

def colour(value):
    if value in ("currentColor","black"): return "#000000"
    if value == "white": return "#ffffff"
    require(re.fullmatch(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?",value), "Unbekannte Füllfarbe.")
    return value if len(value)==7 else "#" + "".join(c*2 for c in value[1:])

def fragment(raw):
    require("<!" not in raw and len(raw)<2_000_000, "Eigenständige SVG-Pfade ohne externe Definitionen erforderlich.")
    root = ET.fromstring(raw)
    result = []
    def visit(node, matrix, fill, rule):
        tag = node.tag.split("}")[-1]
        allowed = {"id","d","fill","stroke","stroke-width","fill-rule","clip-rule","transform","viewBox","width","height","x","y","preserveAspectRatio","version"}
        label = tag + ("#" + node.get("id") if node.get("id") else "")
        extra = sorted(set(node.attrib) - allowed)
        require(not extra, f"{label}: SVG-Eigenschaft {', '.join(extra)} zuerst prüfen.")
        stroke = node.get("stroke", "none")
        require(stroke == "none", f"{label}: stroke={stroke}, stroke-width={node.get('stroke-width', '1')}. Sichtbare Strichgeometrie prüfen oder das Corel-Dateipaar als ZIP einlesen.")
        matrix = mul(matrix,transform(node.get("transform","")))
        fill, rule = node.get("fill",fill), node.get("fill-rule",rule)
        require(rule in ("nonzero","evenodd"), "Unbekannte Füllregel.")
        if tag=="svg":
            vx,vy,w,h = numbers(node.attrib["viewBox"])
            rw,rh = float(node.get("width",w)),float(node.get("height",h))
            require(w>0 and h>0 and rw>0 and rh>0 and node.get("preserveAspectRatio","xMidYMid meet")=="xMidYMid meet","SVG-Ansichtsfenster prüfen.")
            s = min(rw/w,rh/h)
            matrix = mul(matrix,[s,0,0,s,float(node.get("x",0))+(rw-s*w)/2-s*vx,float(node.get("y",0))+(rh-s*h)/2-s*vy])
        if tag in ("svg","g"):
            for child in node: visit(child,matrix,fill,rule)
        elif tag=="path":
            require(not len(node) and fill!="none", "Unsichtbarer oder verschachtelter Motivpfad.")
            d = node.attrib["d"]
            path_data(d)
            result.append(dict(d=d,matrix=matrix,fill=colour(fill),rule=rule))
        else: raise ValueError("Nicht unterstütztes Vektorelement: "+tag)
    visit(root,IDENTITY,"currentColor","nonzero")
    require(result, "Motiv ohne Druckpfade.")
    return result

def pdfpath(canvas,d):
    shape = path_data(d)
    p = canvas.beginPath()
    args = iter(shape.points)
    for op in shape.operators:
        if op==0: p.moveTo(next(args),next(args))
        elif op==1: p.lineTo(next(args),next(args))
        elif op==2: p.curveTo(*[next(args) for _ in range(6)])
        elif op==3: p.close()
        else: raise ValueError("Unbekannter Pfadoperator.")
    return p

def normalized_photo(uri):
    require(isinstance(uri,str) and re.match(r"^data:image/(?:png|jpeg);base64,",uri), "Bitte ein PNG- oder JPEG-Foto wählen.")
    raw = base64.b64decode(uri.split(",",1)[1],validate=True)
    require(0<len(raw)<=8_000_000,"Foto größer als 8 MB.")
    with Image.open(io.BytesIO(raw)) as source:
        require(source.format in ("JPEG","PNG") and source.width*source.height<=20_000_000 and getattr(source,"n_frames",1)==1,"Fotoformat oder Bildabmessungen nicht unterstützt.")
        source.load()
        im = ImageOps.exif_transpose(source).convert("RGBA")
    return im,raw

def make_pdf(s):
    output = io.BytesIO()
    cv = Canvas(output,pagesize=(s["width"]*mm,s["height"]*mm),invariant=1,pageCompression=1)
    cv.setTitle("Fertigungszeichnung")
    cv.transform(mm,0,0,-mm,0,s["height"]*mm)
    for p in s["paths"]:
        cv.saveState()
        if "image" in p:
            im,_ = normalized_photo(p["image"])
            x,y,w,h = (p[k] for k in ("x","y","w","h"))
            clip = cv.beginPath()
            clip.rect(x,y,w,h)
            cv.clipPath(clip,stroke=0,fill=0)
            scale = max(w/im.width,h/im.height)
            iw,ih = im.width*scale,im.height*scale
            cv.translate(x+(w-iw)/2,y+(h+ih)/2)
            cv.scale(1,-1)
            cv.drawImage(ImageReader(im),0,0,width=iw,height=ih,mask="auto")
        else:
            cv.transform(*p["matrix"])
            cv.setFillColor(HexColor(p["fill"]))
            cv.drawPath(pdfpath(cv,p["d"]),stroke=0,fill=1,fillMode=int(p["rule"]=="nonzero"))
        cv.restoreState()
    if s["cuts"]:
        cv.setStrokeColor(CMYKColorSep(0,1,0,0,spotName="CutContour"))
        cv.setStrokeOverprint(True)
        cv.setLineWidth(.1)
        for d in s["cuts"]:
            path_data(d,closed=True)
            cv.drawPath(pdfpath(cv,d),stroke=1,fill=0)
    cv.showPage()
    cv.save()
    return output.getvalue()

if __name__=="__main__":
    try:
        data = json.load(sys.stdin)
        action = sys.argv[1]
        if action=="motifs": json.dump([fragment(s) for s in data],sys.stdout)
        elif action=="pdf": sys.stdout.buffer.write(make_pdf(data))
        elif action=="cuts":
            for d in data: path_data(d,closed=True)
            print("true")
        elif action=="photo":
            im,raw = normalized_photo(data)
            image = io.BytesIO()
            im.save(image,format="PNG")
            # Keep original bytes separately. Both renderers receive the same orientation/pixels.
            print(json.dumps("data:image/png;base64,"+base64.b64encode(image.getvalue()).decode("ascii")))
        else: raise ValueError("Unbekannter Arbeitsgang.")
    except (ValueError,KeyError,TypeError,OSError,IndexError,AssertionError) as error:
        print(str(error),file=sys.stderr)
        sys.exit(2)
