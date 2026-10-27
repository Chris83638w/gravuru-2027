"""Exact vector-only doorbell cut separations, without stock guide or device PNG."""
import sys, json, io, base64, xml.etree.ElementTree as ET
import pymupdf as fitz
from cairosvg.parser import Tree
from cairosvg.surface import PDFSurface
S = '{http://www.w3.org/2000/svg}'
def require(condition, message):
    if not condition: raise ValueError(message)
def denied_url(*_args, **_kwargs):
    raise ValueError('Externe Daten sind in einer Schnittdatei nicht erlaubt.')
def render(svg, width, height):
    root = ET.fromstring(svg)
    require(root.tag == S+'svg', 'Ungültige Schnittdatei.')
    allowed = {S+'svg':{'width','height','viewBox'}, S+'g':{'fill','stroke','stroke-width'}, S+'path':{'d'}}
    for element in root.iter():
        require(element.tag in allowed and set(element.attrib)<=allowed[element.tag], 'Schnittdateien dürfen nur die geprüften Vektorpfade enthalten.')
        require(not (element.text or '').strip(), 'Text gehört nicht in die Schnittdatei.')
    groups = list(root.findall(S+'g'))
    require(len(groups)==1 and groups[0].attrib=={'fill':'none','stroke':'#ff0000','stroke-width':'0.05'}, 'Die roten Schnittpfade fehlen.')
    require(len(list(groups[0]))>0, 'Schnittpfade fehlen.')
    require(root.attrib=={'width':str(width)+'mm','height':str(height)+'mm','viewBox':f'0 0 {width} {height}'}, 'Schnittformat stimmt nicht überein.')
    out = io.BytesIO()
    surface = PDFSurface(Tree(bytestring=ET.tostring(root), url_fetcher=denied_url), out, 96)
    surface.finish()
    pdf = out.getvalue(); doc = fitz.open(stream=pdf, filetype='pdf')
    require(len(doc)==1 and not doc[0].get_images(full=True) and not doc[0].get_fonts(), 'Schnittausgabe enthält Raster oder Text.')
    require(abs(doc[0].rect.width*25.4/72-width)<.001 and abs(doc[0].rect.height*25.4/72-height)<.001, 'Schnittausgabe ist nicht maßhaltig.')
    drawings = doc[0].get_drawings()
    require(drawings and all(d.get('color') and abs(d['color'][0]-1)<.001 and abs(d['color'][1])<.001 and abs(d['color'][2])<.001 for d in drawings), 'Schnittausgabe enthält andere Farben.')
    return base64.b64encode(pdf).decode()
try:
    data = json.load(sys.stdin); width,height = data['widthMm'],data['heightMm']
    require(type(width) in (int,float) and type(height) in (int,float) and 0<width<=500 and 0<height<=500, 'Ungültiges Schnittformat.')
    print(json.dumps({key:render(data[key],width,height) for key in ('steel','acrylic')}))
except Exception as error:
    print(json.dumps({'error':str(error) if isinstance(error,ValueError) else 'Die getrennte Schnittausgabe konnte nicht zuverlässig erstellt werden.'}))
    sys.exit(1)
