"""Vector-only 1:1 contour proof from the stored mm geometry, never a production release."""
import sys,json,math,importlib.util
import hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('contour',Path(__file__).with_name('contour-converter.py'))
c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
c.dependencies()
import pymupdf as fitz
fitz.TOOLS.mupdf_display_errors(False);fitz.TOOLS.mupdf_display_warnings(False)

def export(data):
 g=data['geometry'];w,h=g['widthMm'],g['heightMm'];k=72/25.4
 c.require(g['schema']=='gravuru-contour/v1' and .1<=w<=2000 and .1<=h<=2000,'Ungültige Kontur.')
 doc=fitz.open();page=doc.new_page(width=w*k,height=h*k)
 def point(p):return fitz.Point(p.real*k,p.imag*k)
 for ring in g['contours']:
  path=c.parse_path(ring['d']);c.require(path.isclosed(),'Offene Kontur.')
  shape=page.new_shape()
  for segment in path:
   if isinstance(segment,c.Line):shape.draw_line(point(segment.start),point(segment.end))
   elif isinstance(segment,c.QuadraticBezier):
    a=segment.start;b=segment.end;t=segment.control
    shape.draw_bezier(point(a),point(a+2*(t-a)/3),point(b+2*(t-b)/3),point(b))
   else:
    # PDF cannot represent an exact ellipse arc. Subdivide to <= 22.5 degrees;
    # the resulting cubic approximation is checked against the source in tests.
    pieces=segment.as_cubic_curves(max(1,math.ceil(abs(segment.delta)/22.5))) if isinstance(segment,c.Arc) else [segment]
    for p in pieces:shape.draw_bezier(*[point(v) for v in p.bpoints()])
  shape.finish(color=(0,0,0),fill=None,width=.05*k,closePath=True);shape.commit()
 doc.set_metadata({'title':'Gravuru Konturprüfung 1:1','subject':data['reference'],'creator':'Gravuru 2027 · Formprüfung','keywords':'Konturprüfung, keine Fertigungsfreigabe'})
 # Re-exporting an unchanged revision must also preserve the PDF trailer ID.
 source=json.dumps([data['reference'],g],sort_keys=True,separators=(',',':'),ensure_ascii=False).encode('utf-8')
 document_id=hashlib.sha256(source).hexdigest()[:32]
 doc.xref_set_key(-1,'ID',f'[<{document_id}><{document_id}>]')
 return doc.tobytes(garbage=4,deflate=True,no_new_id=True)
try:
 data=json.loads(sys.stdin.buffer.read(4*1024*1024));sys.stdout.buffer.write(export(data))
except Exception:
 sys.exit(1)
