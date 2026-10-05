import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {convertContour,createContourStore,contourSvg} from './contours.mjs';
import {importEnvironment,sha256} from './design-assets.mjs';
import {createWorkshop} from './http.mjs';
import {build} from '../configurator/variant-m/build.mjs';
import {createPreviewServer} from '../configurator/variant-m/server.mjs';

const svg=(paths,attrs='width="140mm" height="100mm" viewBox="0 0 140 100"')=>`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${paths}</svg>`;
const rectangle='<rect x="10" y="10" width="120" height="80" stroke="black" stroke-width="4" fill="none"/>';
const hole=(x,y)=>`<circle cx="${x}" cy="${y}" r="2"/>`;
const input=(source,name='Form.svg')=>({name,bytes:Buffer.from(source).toString('base64')});
const convert=source=>convertContour({kind:'svg',bytes:input(source).bytes});
const near=(actual,expected,tolerance=.0001)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} ≠ ${expected}`);
function pdf(mode='plain'){
  return execFileSync(process.env.GRAVURU_PYTHON||'python3',['-c',`
import pymupdf as f,sys
k=72/25.4
d=f.open();p=d.new_page(width=160*k,height=120*k)
p.draw_rect(f.Rect(20*k,20*k,140*k,100*k),color=(0,0,0),width=5,fill=None)
for x,y in ((28,28),(132,28),(132,92),(28,92)):
 p.draw_circle(f.Point(x*k,y*k),2*k,color=(0,0,0),fill=None)
mode=sys.argv[1]
if mode=='rotate':p.set_rotation(90)
if mode=='unit':d.xref_set_key(p.xref,'UserUnit','2')
if mode=='crop':p.set_cropbox(f.Rect(10*k,10*k,150*k,110*k))
if mode=='clipped':p.set_cropbox(f.Rect(30*k,30*k,150*k,110*k))
if mode=='pages':d.new_page()
if mode=='text':p.insert_text((10,15),'not a contour')
if mode=='open':p.draw_line((30,30),(50,30))
if mode=='password':sys.stdout.buffer.write(d.tobytes(encryption=f.PDF_ENCRYPT_AES_256,owner_pw='synthetic',user_pw='synthetic'))
else:sys.stdout.buffer.write(d.tobytes())
`,mode],{env:importEnvironment(),maxBuffer:2*1024*1024});
}

test('SVG physical size excludes page margins and stroke; existing four holes are retained once',async()=>{
  const g=await convert(svg(rectangle+hole(18,18)+hole(122,18)+hole(122,82)+hole(18,82)));
  near(g.widthMm,120);near(g.heightMm,80);assert.deepEqual(g.sourceOriginMm,[10,10]);assert.equal(g.holeCount,4);assert.equal(g.contours.length,5);
  assert.match(g.contours[1].d,/M 6.0,8.0/);assert.match(g.contours[2].d,/M 110.0,8.0/);
  assert.match(g.contours[3].d,/M 110.0,72.0/);assert.match(g.contours[4].d,/M 6.0,72.0/);
  const preview=contourSvg(g);assert.match(preview,/fill-rule="evenodd"/);assert.equal((preview.match(/<path /g)||[]).length,1);assert.doesNotMatch(preview,/<image|<text/);
});
test('SVG units, viewBox origin and nested rotations keep physical millimetres',async()=>{
  const g=await convert(svg('<g transform="translate(100 100)"><g transform="rotate(90)"><rect width="120" height="80"/></g></g>','width="20cm" height="30cm" viewBox="-10 -10 200 300"'));
  near(g.widthMm,80);near(g.heightMm,120);near(g.sourceOriginMm[0],30);near(g.sourceOriginMm[1],110);
  const inch=await convert(svg('<rect width="96" height="48"/>','width="1in" height=".5in" viewBox="0 0 96 48"'));
  near(inch.widthMm,25.4);near(inch.heightMm,12.7);
});
test('rotated and skewed ellipses preserve arcs and their analytic physical bounds',async()=>{
  const g=await convert(svg('<ellipse cx="0" cy="0" rx="30" ry="10" transform="translate(70 50) rotate(30)"/>'));
  near(g.widthMm,2*Math.sqrt(700));near(g.heightMm,2*Math.sqrt(300));assert.match(g.contours[0].d,/ A /);
  const skew=await convert(svg('<ellipse cx="0" cy="0" rx="30" ry="10" transform="matrix(-1 0 .5 1 70 50)"/>'));
  near(skew.widthMm,2*Math.sqrt(925));near(skew.heightMm,20);assert.match(skew.contours[0].d,/ A /);
  const curve=await convert(svg('<path d="M10 50 C10 10 130 10 130 50 C130 90 10 90 10 50Z"/>'));
  near(curve.widthMm,120);near(curve.heightMm,60);assert.match(curve.contours[0].d,/ C /);
});
test('PDF path centreline, rotation and crop retain curves and holes without page margins',async()=>{
  for(const mode of ['plain','rotate','crop','unit']){
    const g=await convertContour({kind:'pdf',bytes:pdf(mode).toString('base64')});
    near(g.widthMm,(mode==='rotate'?80:120)*(mode==='unit'?2:1));near(g.heightMm,(mode==='rotate'?120:80)*(mode==='unit'?2:1));assert.equal(g.holeCount,4);assert.match(g.contours[1].d,/ C /);
    near(g.sourceOriginMm[0],mode==='crop'?10:mode==='unit'?40:20);near(g.sourceOriginMm[1],mode==='crop'?10:mode==='unit'?40:20);
  }
});
test('rejects ambiguous topology, open paths and unavailable physical dimensions',async()=>{
  const cases=[
    [svg('<path d="M10 10L100 10L100 80"/>'),'open_contour'],
    [svg('<path d="M10 10L100 80L100 10L10 80Z"/>'),'invalid_topology'],
    [svg('<rect x="10" y="10" width="20" height="20"/><rect x="60" y="10" width="20" height="20"/>'),'ambiguous_contours'],
    [svg(rectangle+hole(18,50)+hole(18,50)),'ambiguous_contours'],
    [svg(rectangle+hole(18,50)+hole(19,50)),'ambiguous_contours'],
    [svg(rectangle+hole(12,50)),'ambiguous_contours'],
    [svg(rectangle+'<circle cx="50" cy="50" r="10"/>'+hole(50,50)),'ambiguous_contours'],
    [svg(rectangle,'viewBox="0 0 140 100"'),'physical_size_missing'],
  ];
  for(const [source,code] of cases)await assert.rejects(convert(source),e=>e.code===code);
});
test('rejects artwork, clipped paths, active XML and ambiguous PDFs instead of tracing them',async()=>{
  for(const source of [
    svg('<text x="10" y="10">Text</text>'),svg('<rect width="120" height="80" transform="scale(0)"/>'),
    svg('<rect x="-10" width="120" height="80"/>'),svg('<rect width="120" height="80" opacity="0"/>'),
    svg('<defs><path id="x" d="M0 0H120V80H0Z"/></defs><use href="#x"/>'),
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///private">]>'+svg(rectangle),
    svg('<script>alert(1)</script>'),svg('<path d="M0 0H120V80H0Z" onclick="x()"/>'),
    svg(rectangle,'width="100%" height="100%" viewBox="0 0 140 100"')
  ])await assert.rejects(convert(source));
  for(const mode of ['clipped','pages','text','password','open'])await assert.rejects(convertContour({kind:'pdf',bytes:pdf(mode).toString('base64')}));
});
test('immutable contour library survives reopen, preserves source bytes, rejects bad uploads and deduplicates',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-contours-')),filename=path.join(dir,'design-assets.sqlite');t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  let store=createContourStore({filename});const original=svg(rectangle+hole(18,50)+hole(122,50));
  const saved=await store.import(input(original));assert.equal(saved.geometry.holeCount,2);assert.equal(saved.sourceSha256,sha256(original));assert.equal(store.original(saved.id).toString(),original);
  const again=await store.import(input(original,'Anderer Dateiname.svg'));assert.equal(again.id,saved.id);assert.equal(again.alreadyExists,true);assert.equal(store.list().length,1);
  await assert.rejects(store.import(input(svg('<path d="M10 10L50 10"/>'))));assert.equal(store.list().length,1);
  await assert.rejects(store.import(input('bad','../bad.svg')));await assert.rejects(store.import({name:'x.pdf',bytes:'!!!'}));
  assert.throws(()=>store.get('no-id'));assert.throws(()=>store.get('f'.repeat(64)));
  store.close();store=createContourStore({filename});assert.deepEqual(store.get(saved.id),saved);assert.equal(store.original(saved.id).toString(),original);store.close();
  const db=new DatabaseSync(filename);assert.throws(()=>db.prepare('UPDATE form_contours SET metadata=? WHERE id=?').run('{}',saved.id),/immutable contour/);db.close();
});
test('HTTP contour import uses existing Host/Origin/CSRF protection, preserves products and serves originals',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g27-contours-http-'));build({outputDirectory:dir});const seed=JSON.parse(fs.readFileSync(path.join(dir,'models.json')))[0];
  const workshop=createWorkshop({filename:path.join(dir,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});const server=createPreviewServer({outputDirectory:dir,workshop});server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(r=>server.close(r));workshop.close();fs.rmSync(dir,{recursive:true,force:true});});
  const get=async route=>(await fetch(base+route)).json();const {csrfToken}=await get('/api/workshop/session');const before=workshop.repository.get(workshop.defaultId);
  const original=svg(rectangle+hole(18,50));const upload=async(headers={})=>fetch(base+'/api/workshop/contours',{method:'POST',headers:{'Content-Type':'application/json','X-Gravuru-CSRF':csrfToken,...headers},body:JSON.stringify(input(original))});
  assert.equal((await upload({'X-Gravuru-CSRF':'bad'})).status,403);assert.equal((await upload({Origin:'https://evil.example'})).status,403);
  const wrongHost=await new Promise((resolve,reject)=>{const req=http.get(base+'/api/workshop/contours',{headers:{host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);});assert.equal(wrongHost,403);
  const r=await upload();assert.equal(r.status,201);const record=await r.json();assert.equal(record.geometry.holeCount,1);
  assert.equal((await get('/api/workshop/contours')).contours.length,1);assert.deepEqual(workshop.repository.get(workshop.defaultId),before);
  const download=await fetch(base+'/api/workshop/contours/'+record.id+'/original');assert.equal(await download.text(),original);assert.match(download.headers.get('Content-Disposition'),/^attachment/);assert.match(download.headers.get('Content-Security-Policy'),/sandbox/);
  const preview=await fetch(base+'/api/workshop/contours/'+record.id+'/preview.svg');assert.equal(preview.status,200);assert.match(await preview.text(),/fill-rule="evenodd"/);
  for(const route of ['/werkstatt/konturen/','/workshop-ui/contours-ui.mjs','/workshop-ui/contours.css'])assert.equal((await fetch(base+route)).status,200);
  assert.equal((await fetch(base+'/api/workshop/contours/'+record.id,{method:'PATCH',headers:{'X-Gravuru-CSRF':csrfToken}})).status,404);
  assert.equal((await fetch(base+'/.local-data/design-assets.sqlite')).status,404);
});
