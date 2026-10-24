import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {importEnvironment} from '../../workshop/design-assets.mjs';
import {exportSettings,printPDF,insideContour,contourPath,whiteMask,boundarySample} from './print-export-model.mjs';
import {contourPdfPath} from './contour-pdf-path.mjs';
import {contourPathCommands} from '../../platform/sources/app/shared/models/contour-geometry.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../../workshop/test-fixtures/retro-contours.json',import.meta.url))).rows;
const geometry=r=>({shape:'contour',width:r.widthMm,height:r.heightMm,outlinePath:r.outline,holes:r.holes.map(h=>({x:h.x,y:h.y,diameter:h.diameter}))});
const inspect=String.raw`import sys,json,base64
import pymupdf as f
from svgpathtools import Path,Line,CubicBezier,parse_path
data=json.load(sys.stdin);doc=f.open(stream=base64.b64decode(data['pdf']),filetype='pdf');page=doc[0];k=25.4/72
rings=[];segments=[];last=None
def z(p):return complex(p.x*k,p.y*k)
for drawing in page.get_drawings():
 for item in drawing['items']:
  if item[0]=='l':seg=Line(z(item[1]),z(item[2]))
  elif item[0]=='c':seg=CubicBezier(*(z(p) for p in item[1:]))
  else:raise ValueError('Unexpected primitive '+item[0])
  if last is not None and abs(seg.start-last)>1e-4:
   rings.append(Path(*segments));segments=[]
  segments.append(seg);last=seg.end
 if segments:rings.append(Path(*segments));segments=[];last=None
source=parse_path(data['outline']);bounds=source.bbox()
actual=rings[0].bbox()
print(json.dumps({'width':page.rect.width*k,'height':page.rect.height*k,'bounds':actual,'sourceBounds':bounds,'rings':len(rings),'holes':[[ (r.bbox()[0]+r.bbox()[1])/2,(r.bbox()[2]+r.bbox()[3])/2,r.bbox()[1]-r.bbox()[0],r.bbox()[3]-r.bbox()[2]] for r in rings[1:]],'images':len(page.get_images()),'cut':'CutContour' in '\n'.join(doc.xref_object(i) for i in range(1,doc.xref_length()))}))
`;
test('original RT1/RT2 cut PDFs retain curved physical bounds and fixed drilling within 0.1 mm',async()=>{
 for(const row of rows){
  const g=geometry(row),settings=exportSettings(g),pixels={width:1,height:1,rgb:new Uint8Array(3),alpha:new Uint8Array(1)};
  assert.equal(settings.geometry.outlinePath,row.outline);
  const pdf=await printPDF({settings,pixels,kind:'cut'});
  const result=spawnSync(process.env.GRAVURU_PYTHON||'python3',['-c',inspect],{input:JSON.stringify({pdf:Buffer.from(await pdf.arrayBuffer()).toString('base64'),outline:row.outline}),env:importEnvironment(),encoding:'utf8',maxBuffer:2e6});
  assert.equal(result.status,0,result.stderr);const d=JSON.parse(result.stdout);
  assert.ok(Math.abs(d.width-row.widthMm)<.1);assert.ok(Math.abs(d.height-row.heightMm)<.1);
  d.bounds.forEach((v,i)=>assert.ok(Math.abs(v-d.sourceBounds[i])<.1,row.id+' bound '+i));
  assert.equal(d.rings,3);assert.equal(d.images,0);assert.equal(d.cut,true);
  row.holes.forEach((h,i)=>[h.x,h.y,h.diameter,h.diameter].forEach((v,j)=>assert.ok(Math.abs(d.holes[i][j]-v)<.1,row.id+' hole '+i+': '+d.holes[i])));
 }
});
test('PDF encoding uses the shared commands, keeps cubic controls and converts quadratic and arc segments',()=>{
 const d='M0 10Q0 0 10 0H30A10 10 0 0 1 40 10V30C40 35 35 40 30 40H10Q0 40 0 30Z';
 const pdf=contourPdfPath(d);
 assert.match(pdf,/40 35 35 40 30 40 c/);assert.equal((pdf.match(/ c/g)||[]).length,7);
 assert.equal(contourPathCommands(d).filter(c=>c.command==='A').length,1);assert.doesNotMatch(pdf,/ re|NaN|Infinity/);
});
test('cut/white/containment use actual concave outline and holes; unsupported browser bleed fails closed',()=>{
 const g={shape:'contour',width:40,height:30,outlinePath:'M0 0H40V30H25V15H15V30H0Z',holes:[{x:7,y:10,diameter:4}]};
 assert.equal(insideContour(g,20,25),false);assert.equal(insideContour(g,7,10),false);assert.equal(insideContour(g,20,10),true);
 assert.equal(insideContour(g,14,25,-2),false);assert.equal(insideContour(g,10,20,-2),true);
 const s=exportSettings(g,{white:'full'}),mask=whiteMask({width:40,height:30,alpha:new Uint8Array(1200).fill(255)},s);
 assert.equal(mask[25*40+20],0);assert.equal(mask[10*40+7],0);assert.equal(mask[10*40+20],255);
 assert.deepEqual(boundarySample(g,20,25),[25,25]);assert.match(contourPath(g),/25 15 l/);
 assert.throws(()=>exportSettings(g,{bleedMm:1}),/Werkstatt/);assert.throws(()=>contourPath(g,1),/Werkstatt/);
 assert.throws(()=>exportSettings({...g,outlinePath:'M0 0H40V30H0'}),/Kontur/);
});
