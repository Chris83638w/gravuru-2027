"""Independent PDF measurements for contour-production.test.mjs."""
import sys,json,base64,math
import pymupdf as fitz
from svgpathtools import parse_path,Path,Line,CubicBezier,QuadraticBezier
from shapely.geometry import LineString
K=25.4/72

def measure(data):
 doc=fitz.open(stream=base64.b64decode(data['pdf']),filetype='pdf');p=doc[0]
 out={'widthMm':p.rect.width*K,'heightMm':p.rect.height*K,'pages':len(doc),'images':[{'width':v[2],'height':v[3],'colorspace':v[5]} for v in p.get_images(full=True)],'fonts':len(p.get_fonts()),'drawings':len(p.get_drawings())}
 if data.get('points'):
  pix=p.get_pixmap(matrix=fitz.Matrix(3,3),alpha=False)
  out['pixels']=[list(pix.pixel(round(x/K*3),round(y/K*3))) for x,y in data['points']]
 if not data.get('geometry'):return out
 rings=[]
 for drawing in p.get_drawings():
  current=[]
  def flush():
   if current:
    if abs(current[-1].end-current[0].start)>1e-5:current.append(Line(current[-1].end,current[0].start))
    rings.append(Path(*current));current.clear()
  for item in drawing['items']:
   def z(v):return complex(v.x*K,v.y*K)
   kind=item[0]
   if kind=='l':parts=[Line(z(item[1]),z(item[2]))]
   elif kind=='c':parts=[CubicBezier(*[z(v) for v in item[1:5]])]
   elif kind=='re':
    r=item[1];a=[complex(r.x0*K,r.y0*K),complex(r.x1*K,r.y0*K),complex(r.x1*K,r.y1*K),complex(r.x0*K,r.y1*K)]
    parts=[Line(a[i],a[(i+1)%4]) for i in range(4)]
   else:raise AssertionError('Unexpected contour PDF primitive '+kind)
   for seg in parts:
    if current and abs(current[-1].end-seg.start)>1e-4:flush()
    current.append(seg)
    if abs(current[-1].end-current[0].start)<1e-5:flush()
  flush()
 rings=[r for r in rings if r.length()>1e-5]
 def box(r):
  x0,x1,y0,y1=r.bbox();return [x0,y0,x1-x0,y1-y0]
 rings.sort(key=lambda r:box(r)[2]*box(r)[3],reverse=True)
 source=parse_path(data['geometry']['contours'][0]['d'])
 if data.get('mirror'):
  w=data['geometry']['widthMm']
  def flip(z):return complex(w-z.real,z.imag)
  source=Path(*[(Line(flip(s.start),flip(s.end)) if isinstance(s,Line) else CubicBezier(*[flip(z) for z in s.bpoints()])) for s in source])
 def sample(r):
  pts=[]
  for s in r:
   for i in range(65):pts.append((s.point(i/64).real,s.point(i/64).imag))
  return LineString(pts)
 out.update({'rings':len(rings),'outerBounds':box(rings[0]),'outerCubicSegments':sum(isinstance(s,CubicBezier) for s in rings[0]),'curveDeviationMm':sample(source).hausdorff_distance(sample(rings[0])),'holes':[{'x':b[0]+b[2]/2,'y':b[1]+b[3]/2,'diameterX':b[2],'diameterY':b[3]} for b in map(box,rings[1:])]})
 return out
print(json.dumps(measure(json.load(sys.stdin))))
