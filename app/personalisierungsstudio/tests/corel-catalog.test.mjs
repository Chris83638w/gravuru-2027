import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {corelMotifProof,importFiles,inspectFile,worker} from '../catalog.mjs';
import {merchantImport} from '../merchant-server.mjs';
import {svg} from '../render.mjs';

const outline='M0 0 H30 V20 H0 Z';
const ornament='M3 3 H12 V13 H3 Z M6 6 H8 V9 H6 Z';
const guide='M0 2 H2 V4 H0 Z';
const clip='M1 1 H5 V9 H1 Z';
const original={
  id:'source-review',katalog:{sourceKind:'corel-bogen'},plate:{widthMm:30,heightMm:20},
  texts:[{text:'Änne\nÖst',font:'Muster',sizePt:14.1732,align:'center',color:'#333333'}],
  motifs:[{d:outline},{d:ornament,fill:'#666666'},{d:guide,fill:'#ffffff',hint:true},{d:clip}],photoFiles:['foto-1.jpg']
};
const source='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="30mm" height="20mm" viewBox="0 0 30 20">'+
  '<rect id="platte" width="30" height="20" fill="none" stroke="#999" stroke-width="0.2"/>'+
  '<clipPath id="clip-foto"><path d="'+clip+'"/></clipPath>'+
  '<image id="foto-1" class="foto" x="-1" y="0" width="10" height="20" xlink:href="foto-1.jpg" preserveAspectRatio="none" clip-path="url(#clip-foto)"/>'+
  '<path id="motiv-1" d="'+outline+'" fill="none" stroke="none" stroke-width="0"/>'+
  '<path id="motiv-2" d="'+ornament+'" fill="#666666" fill-rule="evenodd" stroke="none" stroke-width="0"/>'+
  '<path id="hinweis-3" class="hinweis" display="none" fill="#ffffff" d="'+guide+'"/>'+
  '<text id="text-1" font-family="Muster" font-size="5" fill="#333333" x="2" y="9" text-anchor="middle">'+
  '<tspan x="2" dy="0">Änne</tspan><tspan x="3" dy="5.5">Öst</tspan></text></svg>';
function fixture(t){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'studio-katalog-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const json=path.join(directory,'design.json'),image=path.join(directory,'design.svg');
  fs.writeFileSync(json,JSON.stringify(original));fs.writeFileSync(image,source);
  return {directory,json,image};
}
test('Das Originalpaar trennt Rahmen, unbemalten Rand, ausgespartes Motiv, Fotoclip, Bedienhilfe und Schriftzeilen',async t=>{
  const {json,image}=fixture(t);
  const report=inspectFile(json);
  assert.equal(report.status,'review');assert.equal(report.revision,undefined);
  const {plateFrame,motifPaths,texts,photos,hiddenGuides,unpaintedPaths,cutContour}=report.sourceLayers;
  assert.equal(plateFrame.role,'preview');assert.equal(plateFrame.strokeWidthMm,.2);
  assert.deepEqual(motifPaths.map(p=>[p.id,p.fillRule]),[['motiv-2','evenodd']]);
  assert.equal(texts[0].font,'Muster');
  assert.deepEqual(texts[0].lines,[{x:2,baseline:9,text:'Änne'},{x:3,baseline:14.5,text:'Öst'}]);
  assert.deepEqual(photos[0].box,[-1,0,10,20]);assert.equal(photos[0].sourceClipPath,clip);
  assert.deepEqual(hiddenGuides,['hinweis-3']);assert.deepEqual(unpaintedPaths,['motiv-1']);assert.equal(cutContour,null);
  const geometry=corelMotifProof(json);
  assert.deepEqual(geometry.paths.map(p=>p.d),[ornament]);assert.deepEqual(geometry.cuts,[]);
  assert.match(svg(geometry,{contour:false}),/fill-rule="evenodd"/);
  assert.doesNotMatch((await worker('pdf',geometry)).toString('latin1'),/\/CutContour/);
  assert.throws(()=>importFiles([image]),/rect#platte: stroke=#999, stroke-width=0.2/);
});
test('Unvollständige Paare, veränderte Ebenen und unbekannte Effekte werden ausgewiesen',t=>{
  const {json,image}=fixture(t);
  for(const [before,after,reason] of [
    ['stroke-width="0.2"','stroke-width="0.2" opacity="0.3"',/opacity/],
    [ornament,outline,/Motivpfad/],
    ['display="none"','display="inline"',/Bedienhinweis/],
    ['Muster','Ersatz',/Originalschrift/],
    ['<tspan x="2" dy="0">Änne','<tspan x="2" dy="0">Emma',/Text, Originalschrift/],
    ['url(#clip-foto)','url(#irgendwo)',/Originalebenen/],
    ['foto-1.jpg','https://example.invalid/foto.jpg',/Fotoquelle/]]){
    fs.writeFileSync(image,source.replace(before,after));
    assert.throws(()=>inspectFile(json),reason);
  }
});
test('Ein echtes Katalog-ZIP wird im Werkstattformular geprüft und bleibt bis zur Zuordnung ein Entwurf',async t=>{
  const {directory}=fixture(t);
  const zip=path.join(directory,'quellen.zip');
  const create='from zipfile import ZipFile\nfrom pathlib import Path\nimport sys\nd=Path(sys.argv[1])\nwith ZipFile(d/"quellen.zip","w") as z:\n for n in ["design.json","design.svg"]: z.write(d/n,"probe/"+n)';
  const run=spawnSync(process.env.STUDIO_PYTHON||(process.platform==='win32'?'python':'python3'),['-c',create,directory]);
  assert.equal(run.status,0,run.stderr?.toString());
  const input={name:'quellen.zip',bytes:fs.readFileSync(zip).toString('base64')};
  const review=await merchantImport({},'studio-probe.myshopify.com',input,false);
  assert.equal(review.sourceLayers.motifPaths.length,1);assert.equal(review.status,'review');
  await assert.rejects(merchantImport({},'studio-probe.myshopify.com',input,true),/Originalzuordnungen/);
});
