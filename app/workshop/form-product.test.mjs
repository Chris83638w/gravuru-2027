import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWorkshop} from './http.mjs';
import {makeFormProduct,validateFormProduct,verifyFormSource,FORM_MATERIALS,formReadiness} from './form-product.mjs';
import {createContourStore} from './contours.mjs';
import {importEnvironment} from './design-assets.mjs';
import {formContourPdf} from './form-contour-pdf.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="140mm" height="100mm" viewBox="0 0 140 100"><rect x="10" y="10" width="120" height="80" rx="5"/><circle cx="18" cy="50" r="2"/><circle cx="122" cy="50" r="2"/></svg>';
const input={name:'Prüfkontur.svg',bytes:Buffer.from(svg).toString('base64')};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

test('form product retains immutable source geometry and keeps unconfirmed material and prices open',async t=>{
 const contours=createContourStore({filename:':memory:'});t.after(()=>contours.close());const c=await contours.import(input),d=makeFormProduct(c,'Freies Schild');
 assert.equal(d.config,undefined);assert.equal(d.basePriceCents,null);assert.equal(d.material.thicknessMm,null);assert.equal(d.processingMethod,null);assert.deepEqual(d.form.geometry,c.geometry);assert.equal(formReadiness(d).length,6);
 assert.equal(FORM_MATERIALS.find(m=>m.id==='steel').reference,'edelstahl-gewaehlte-originalfassung-v4.png');assert.match(FORM_MATERIALS.find(m=>m.id==='oak').note,/vorläufig/);
 const forged=structuredClone(d);forged.form.geometry.widthMm=130;forged.form.geometrySha256=hash(forged.form.geometry);assert.throws(()=>verifyFormSource(forged,contours),/passt nicht/);
 for(const change of [d=>d.material.id='invented',d=>d.material.thicknessMm=-3,d=>d.basePriceCents=19.99,d=>d.processingMethod='laser-approved',d=>d.form.geometry.contours[0].d='<script>',d=>d.productionApproved=true]){const bad=structuredClone(d);change(bad);assert.throws(()=>validateFormProduct(bad));}
 d.material={id:'steel',thicknessMm:1.5,surfaceNotes:'Prüfdaten, keine Fertigungsfreigabe'};d.processingMethod='engraving';d.basePriceCents=2599;
 assert.deepEqual(formReadiness(validateFormProduct(d)),['Design und Kundenfelder zuordnen','Fertigungsprofil prüfen und freigeben']);
});

test('contour PDF uses the saved geometry in millimetres, with separate vector holes and no artwork',async t=>{
 const contours=createContourStore({filename:':memory:'});t.after(()=>contours.close());const c=await contours.import(input),d=makeFormProduct(c,'Prüfschild'),pdf=await formContourPdf(d,{id:'cfg-test',revision:7});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const checked=JSON.parse(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`
import sys,json,pymupdf as f
p=f.open(stream=sys.stdin.buffer.read(),filetype='pdf');page=p[0];k=25.4/72
paths=page.get_drawings();print(json.dumps({'width':page.rect.width*k,'height':page.rect.height*k,'paths':len(paths),'curveCount':sum(i[0]=='c' for d in paths for i in d['items']),'bounds':[[d['rect'].x0*k,d['rect'].y0*k,d['rect'].x1*k,d['rect'].y1*k] for d in paths],'text':page.get_text(),'images':page.get_image_info(),'metadata':p.metadata}))
`],{input:pdf,env:importEnvironment()}).toString());
 assert.ok(Math.abs(checked.width-120)<.0001);assert.ok(Math.abs(checked.height-80)<.0001);assert.equal(checked.paths,3);assert.ok(checked.curveCount>=32);assert.equal(checked.text,'');assert.deepEqual(checked.images,[]);assert.match(checked.metadata.subject,/cfg-test:7/);assert.match(checked.metadata.subject,new RegExp(c.geometrySha256));
 for(const [i,box] of [[1,[6,38,10,42]],[2,[110,38,114,42]]])checked.bounds[i].forEach((n,j)=>assert.ok(Math.abs(n-box[j])<.0002));
});

test('form HTTP lifecycle shares product revisions, protects old acrylic products and binds PDF to history',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-form-product-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
 let workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});const server=createPreviewServer({outputDirectory:dir,workshop});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
 const get=async route=>{const r=await fetch(base+route);assert.equal(r.status,200);return r.json();};const {csrfToken}=await get('/api/workshop/session');
 const post=async(route,body,method='POST',token=csrfToken)=>{const r=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const acrylicBefore=workshop.repository.get(workshop.defaultId),contour=(await post('/api/workshop/contours',input)).data;
 assert.equal((await post('/api/workshop/form-products',{name:'Schild',contourId:contour.id},'POST','invalid')).status,403);
 const created=await post('/api/workshop/form-products',{name:'Prüfschild',contourId:contour.id});assert.equal(created.status,201);const r=created.data,url='/api/workshop/products/'+r.id;
 assert.equal((await get('/api/workshop/products')).products.find(p=>p.id===r.id).overview.formProduct,true);
 const draft=structuredClone(r.document);draft.material={id:'oak',thicknessMm:4,surfaceNotes:'synthetischer Testwert'};draft.processingMethod='print';draft.basePriceCents=2499;
 const preview=await post(url+'/form-preview',{expectedRevision:1,document:draft});assert.equal(preview.status,200);assert.match(preview.data.svg,/fill-rule="evenodd"/);assert.equal(workshop.repository.get(r.id).revision,1);
 const save=await post(url,{expectedRevision:1,document:draft},'PATCH');assert.equal(save.status,200);assert.equal(save.data.revision,2);assert.equal((await get(url+'?revision=1')).document.material.id,null);
 assert.equal((await post(url,{expectedRevision:1,document:draft},'PATCH')).status,409);
 const fake=structuredClone(draft);fake.form.geometry.heightMm=81;fake.form.geometrySha256=hash(fake.form.geometry);assert.equal((await post(url,{expectedRevision:2,document:fake},'PATCH')).status,422);
 for(const action of ['publish','resolve','validate-design'])assert.equal((await post(url+'/'+action,{expectedRevision:2})).status,422);
 assert.equal((await post('/api/workshop/products/'+acrylicBefore.id,{expectedRevision:acrylicBefore.revision,document:draft},'PATCH')).status,422);assert.equal((await post(url,{expectedRevision:2,document:acrylicBefore.document},'PATCH')).status,422);
 assert.equal((await fetch(base+'/models.json?configuration='+r.id)).status,422);
 const pdf=await fetch(base+url+'/contour.pdf?revision=1');assert.equal(pdf.status,200);assert.match(pdf.headers.get('Content-Disposition'),/-v1\.pdf/);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 assert.equal((await fetch(base+url+'/preview.svg?revision=1')).status,200);
 const copied=await post(url+'/copy',{expectedRevision:2,name:'Kopie',kind:'master'});assert.equal(copied.status,201);assert.deepEqual(copied.data.document.form,draft.form);
 const archived=await post(url+'/archive',{expectedRevision:2,archived:true});assert.equal(archived.data.revision,3);assert.equal((await post(url,{expectedRevision:3,document:draft},'PATCH')).status,422);
 await post(url+'/archive',{expectedRevision:3,archived:false});const restored=await post(url+'/restore',{expectedRevision:4,revision:1});assert.equal(restored.data.revision,5);assert.equal(restored.data.document.basePriceCents,null);assert.equal((await get(url+'/revisions')).revisions.length,5);
 assert.deepEqual(workshop.repository.get(acrylicBefore.id),acrylicBefore);
 for(const route of ['/werkstatt/formprodukt/','/workshop-ui/form-product-ui.mjs','/workshop-ui/form-product.css'])assert.equal((await fetch(base+route)).status,200);
 workshop.close();workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});assert.equal(workshop.repository.get(r.id).revision,5);assert.equal(workshop.repository.get(r.id,{revision:2}).document.material.id,'oak');assert.equal(workshop.contours.original(contour.id).toString(),svg);
});

test('PDF cubic conversion follows rotated SVG ellipse arcs, including the complete curve',async t=>{
 const contours=createContourStore({filename:':memory:'});t.after(()=>contours.close());
 const source='<svg xmlns="http://www.w3.org/2000/svg" width="140mm" height="100mm" viewBox="0 0 140 100"><ellipse rx="55" ry="20" transform="translate(70 50) rotate(30)"/></svg>';
 const c=await contours.import({name:'Ellipse.svg',bytes:Buffer.from(source).toString('base64')}),d=makeFormProduct(c,'Ellipse'),pdf=await formContourPdf(d,{id:'cfg-ellipse',revision:1});
 const distance=Number(execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`
import sys,json,base64,pymupdf as f
from svgpathtools import parse_path,Path,Line,CubicBezier
from shapely.geometry import LineString
v=json.load(sys.stdin);g=v['geometry'];source=parse_path(g['contours'][0]['d']);doc=f.open(stream=base64.b64decode(v['pdf']),filetype='pdf');segments=[];k=25.4/72
for draw in doc[0].get_drawings():
 for item in draw['items']:
  if item[0] in ('l','c'):
   pts=[complex(p.x*k,p.y*k) for p in item[1:]];segments.append(Line(*pts) if item[0]=='l' else CubicBezier(*pts))
def samples(p):return LineString([(z.real,z.imag) for s in p for z in [s.point(i/1024) for i in range(1025)]])
print(samples(source).hausdorff_distance(samples(Path(*segments))))
`],{input:JSON.stringify({geometry:d.form.geometry,pdf:pdf.toString('base64')}),env:importEnvironment()}).toString());
 assert.ok(distance<.002,`PDF curve deviation ${distance} mm`);
});
