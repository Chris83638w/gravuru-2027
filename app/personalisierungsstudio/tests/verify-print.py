"""Independent PDF/SVG checks using pypdf and a Poppler raster, not the exporter."""
from pathlib import Path
import json
import re
import subprocess
import sys
from xml.etree import ElementTree as ET

from PIL import Image, ImageChops, ImageStat
from pypdf import PdfReader
from pypdf.generic import ContentStream

folder=Path(sys.argv[1])
prefix=folder/"Heimathafen-Mueller"
svg=ET.parse(prefix.with_suffix(".svg")).getroot()
ns={"s":"http://www.w3.org/2000/svg"}
assert (svg.get("width"),svg.get("height"),svg.get("viewBox"))==("90mm","60mm","0 0 90 60")
paths=svg.findall("s:g[@id='Artwork']/s:path",ns)
assert len(paths)>10 and not svg.findall(".//s:text",ns)
cut=svg.find("s:g[@id='CutContour']/s:path",ns)
assert cut is not None and cut.attrib["d"]=="M0 0 H90 V60 H0 Z"
reader=PdfReader(prefix.with_suffix(".pdf"))
assert len(reader.pages)==1
page=reader.pages[0]
width,height=[float(k)*25.4/72 for k in (page.mediabox.width,page.mediabox.height)]
assert abs(width-90)<.001 and abs(height-60)<.001
resources=page["/Resources"]
separation=resources["/ColorSpace"]["/CutContour"].get_object()
assert separation[0:3]==["/Separation","/CutContour","/DeviceCMYK"]
ops=ContentStream(page.get_contents(),reader).operations
spot=next(i for i,(args,op) in enumerate(ops) if op==b"CS" and args==["/CutContour"])
assert any(op==b"gs" and resources["/ExtGState"][args[0]].get("/OP") for args,op in ops[spot:])
assert [(list(a),op) for a,op in ops[spot:] if op in (b"m",b"l",b"h",b"S")]==[([0,0],b"m"),([90,0],b"l"),([90,60],b"l"),([0,60],b"l"),([],b"h"),([],b"S")]
assert any(op==b"cm" and abs(float(a[0])-72/25.4)<.00001 and abs(float(a[3])+72/25.4)<.00001 for a,op in ops[:spot])
assert sum(op in (b"f",b"f*") for _,op in ops[:spot])==len(paths)
subprocess.run(["pdftoppm","-singlefile","-png","-scale-to-x","900","-scale-to-y","600",str(prefix.with_suffix(".pdf")),str(folder/"pdf-raster")],check=True)
a=Image.open(folder/"pdf-raster.png").convert("RGB")
b=Image.open(folder/"svg-raster.png").convert("RGB")
assert a.size==b.size==(900,600)
# Both engines antialias differently. Compare artwork inside the physical cut.
box=(4,4,896,596)
mean=sum(ImageStat.Stat(ImageChops.difference(a.crop(box),b.crop(box))).mean)/3
def ink(image):
    return sum(image.crop(box).convert("L").histogram()[:150])
na,nb=ink(a),ink(b)
assert mean<3 and abs(na-nb)/max(na,nb)<.07,(mean,na,nb)
print(json.dumps({"svgArtworkPaths":len(paths),"widthMm":round(width,4),"heightMm":round(height,4),"pdfSpot":str(separation[1]),"overprint":True,"meanAbsolutePixelDifference":round(mean,3),"pdfDarkPixels":na,"svgDarkPixels":nb}))
