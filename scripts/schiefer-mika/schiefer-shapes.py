from pathlib import Path
import os
import json,xml.etree.ElementTree as ET,re
from fontTools.pens.boundsPen import BoundsPen
from fontTools.svgLib.path import parse_path
from fontTools.pens.basePen import BasePen
import openpyxl
ROOT=Path(os.environ.get('GRAVURU_PROJECT_ROOT',Path(__file__).resolve().parent.parent))
CODE=ROOT/'Produkte-Design/gravuru-2027-neu'
OUT=ROOT/'outputs/schiefer-alle-groessen'
OUT.mkdir(parents=True,exist_ok=True)
REF=CODE/'docs/handoffs/design-start-mika/schiefer'
units=25.4/72
contours=json.loads((REF/'konturen-und-loecher.json').read_text())
TOKEN=re.compile(r'[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?')
def rough(d):
    xs=[];ys=[];cmd='';k=0
    for t in TOKEN.findall(d):
        if t.isalpha():cmd=t.upper();k=0;continue
        v=float(t)
        if cmd=='H':xs.append(v)
        elif cmd=='V':ys.append(v)
        elif cmd=='A':
            if k%7==5:xs.append(v)
            elif k%7==6:ys.append(v)
        else:(xs if k%2==0 else ys).append(v)
        k+=1
    return [min(xs),min(ys),max(xs),max(ys)] if xs and ys else None
class FlatPen(BasePen):
    def __init__(self):super().__init__(None);self.points=[];self.last=None
    def _moveTo(self,p):self.points.append(p);self.last=p
    def _lineTo(self,p):self.points.append(p);self.last=p
    def _curveToOne(self,p1,p2,p3):
        p0=self.last
        for i in range(1,49):
            t=i/48;u=1-t
            self.points.append(tuple(u**3*p0[k]+3*u*u*t*p1[k]+3*u*t*t*p2[k]+t**3*p3[k] for k in [0,1]))
        self.last=p3
    def _qCurveToOne(self,p1,p2):
        p0=self.last
        for i in range(1,49):
            t=i/48;u=1-t;self.points.append(tuple(u*u*p0[k]+2*u*t*p1[k]+t*t*p2[k] for k in [0,1]))
        self.last=p2
    def _closePath(self):pass
    def _endPath(self):pass
paths=[]
for e in ET.parse(REF/'Gedenktafeln_Schiefer.svg').getroot().iter():
    if not e.tag.endswith('path'):continue
    d=e.get('d');box=rough(d)
    if not box or min(box[2]-box[0],box[3]-box[1])<150:continue
    color=re.search(r'stroke:\s*(#[a-f0-9]+)',e.get('style',''),re.I)
    if not color:continue
    p=BoundsPen(None);parse_path(d,p)
    if p.bounds: paths.append((e,box,p.bounds,color.group(1).lower()))
shapes=[]
for index,c in enumerate(contours):
    if c['kind']!='curve':continue
    candidates=[(abs(box[0]-c['x'])+abs(box[1]-c['y'])+abs((box[2]-box[0])*units-c['w'])*3+abs((box[3]-box[1])*units-c['h'])*3,e,box,bounds,col) for e,box,bounds,col in paths]
    score,e,box,bounds,col=min(candidates,key=lambda t:t[0])
    f=FlatPen();parse_path(e.get('d'),f)
    points=[[(x-bounds[0])*units,(y-bounds[1])*units] for x,y in f.points]
    measured=[(bounds[2]-bounds[0])*units,(bounds[3]-bounds[1])*units]
    discrepancy=max(abs(measured[0]-c['w']),abs(measured[1]-c['h']))
    item={'index':index,'label':c['label'],'excelMm':[c['w'],c['h']],'measuredMm':measured,'differenceMm':discrepancy,'score':score,'points':points,'color':col,'sourceD':e.get('d'),'sourceOrigin':bounds[:2],'status':'offen-Massabweichung' if discrepancy>.15 or score>5 else 'passt'}
    shapes.append(item)
    print(index,c['label'],c['w'],c['h'],'SVG',*[round(v,3) for v in measured],item['status'])
(OUT/'konturen-abgleich.json').write_text(json.dumps(shapes,ensure_ascii=False,indent=1),encoding='utf-8')
wb=openpyxl.load_workbook(REF/'Schiefer-Gedenktafeln-Groessen-2026-10-29.xlsx',data_only=True)
rows=[]
for idx,row in enumerate(wb['Größen & Optionen'].iter_rows(values_only=True),1):
    if idx<5:continue
    g,form,series,label,w,h,*rest=row
    if not w or not h:continue
    shape=None
    if form not in ['Rechteck','Quadrat','Rund']:
        matches=[s for s in shapes if abs(s['excelMm'][0]-w)<.1 and abs(s['excelMm'][1]-h)<.1]
        shape=next((s for s in matches if s['color']=='#0000ff'),matches[0] if matches else None) if 'Kordel' in g else next((s for s in matches if s['color']!='#0000ff'),matches[0] if matches else None)
    status='passt' if form in ['Rechteck','Quadrat','Rund'] or shape and shape['status']=='passt' else 'offen-Massabweichung'
    if form=='Stern':status='ausserhalb-Auftrag'
    variants=[]
    if row[6]=='ja':variants.append({'id':'ohne','holes':[]})
    raw=row[12] or ''
    for name,col,diam,section in [('bohrung2',7,4,'Bohrloch'),('bohrung4',8,4,'Bohrloch'),('abstand2',9,8,'Abstandshalter'),('abstand4',10,8,'Abstandshalter')]:
        if row[col]!='ja':continue
        sectionraw=raw.split('||')[0] if section=='Bohrloch' else raw.split('||')[-1]
        count=2 if name.endswith('2') else 4
        part=sectionraw.split(f'{count}er ')[-1].split('| 4er')[0]
        coordinates=re.findall(r'\((\d+(?:[.,]\d+)?)\|(\d+(?:[.,]\d+)?)\)',part)
        holes=[{'x':float(x.replace(',','.')),'y':float(y.replace(',','.')),'diameterMm':diam} for x,y in coordinates[:count]]
        assert len(holes)==count,(idx,name,raw)
        variants.append({'id':name,'holes':holes})
    if row[11]=='ja':
        coordinates=re.findall(r'\((\d+(?:[.,]\d+)?)\|(\d+(?:[.,]\d+)?)\)',raw)
        holes=[{'x':float(x.replace(',','.')),'y':float(y.replace(',','.')),'diameterMm':6} for x,y in coordinates]
        variants=[{'id':'kordel-fest','holes':holes,'holeStatus':'bekannt' if holes else 'Lieferanten-Lochmasse-offen'}]
    rows.append({'excelRow':idx,'group':g,'form':form,'series':series,'label':label,'widthMm':w,'heightMm':h,'status':status,'shapeIndex':shape['index'] if shape else None,'variants':variants,'priceCents':round(row[14]*100) if row[14] is not None else None,'notes':row[13]})
(OUT/'produkte-aus-excel.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('Produkte:',len(rows),'davon maßlich verwendbar',sum(r['status']=='passt' for r in rows))
