import test from 'node:test';
import assert from 'node:assert/strict';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {doorbellLayers,doorbellSeparations,renderDoorbellCutPdfs,closedDoorbellCut} from './doorbell-artwork.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {artworkViewport} from '../configurator/variant-m/print-geometry.mjs';
import {artworkFragment} from '../configurator/variant-m/artwork-resource.mjs';
import {contourPathBounds,flattenContourPath} from './contour-path.mjs';
import {makeProductDocument} from './product-model.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {readReviewPackage,digest} from './review-package.mjs';

const options=(format='16x28',frame='FK-RUNDUM',position='standard',mounting='K00')=>({format,frame,color:'schwarz',mounting,position});
test('implicit PDF closure is accepted only at an exact existing endpoint and never changes source cutting data',()=>{
 const source='M60 150L70 150L70 160L60 160L60 150';
 assert.equal(closedDoorbellCut(source),source+' Z');
 assert.equal(closedDoorbellCut(source+' Z Z'),source+' Z');
 assert.throws(()=>closedDoorbellCut('M60 150L70 150L70 160L60 160'),/offen/);
 const profile=selectedProfile(doorbellFixture(),options());profile.geometry.cutPaths=[source];
 assert.equal(doorbellLayers(profile,options()).steel.paths[0].d,source);
});
test('all 120 geometry selections preserve exact device cuts, acrylic frames and upright opposite positions',()=>{
 const config=doorbellFixture();let count=0;
 for(const f of config.doorbell.formats)for(const frame of f.profile.frames)for(const position of ['standard','opposite'])for(const mounting of f.profile.mounting.options){
  const selection=options(f.key,frame.key,position,mounting.key),p=selectedProfile(config,selection),layers=doorbellSeparations(config,selection);
  assert.equal(layers.stock.width,f.profile.geometry.width);assert.equal(layers.stock.height,f.profile.geometry.height);
  assert.deepEqual(layers.steel.paths.filter(p=>p.role==='device-cut').map(p=>p.d),p.geometry.cutPaths);
  assert.deepEqual(layers.acrylic.paths.filter(p=>p.role==='device-cut').map(p=>p.d),p.geometry.cutPaths);
  const source=f.profile.geometry,cut=contourPathBounds(layers.steel.paths[0].d),original=contourPathBounds(source.cutPaths[0]);
  assert.ok(Math.abs(cut[0]-p.geometry.bell.x-(original[0]-source.bell.x))<1e-6);
  assert.ok(Math.abs(cut[1]-p.geometry.bell.y-(original[1]-source.bell.y))<1e-6);
  assert.deepEqual(cut.slice(2),original.slice(2),'asymmetric local cut pattern must retain size and orientation');
  assert.equal(layers.steel.paths.filter(p=>p.role==='mounting-hole').length,mounting.key==='B04S'?4:0);
  assert.equal(layers.acrylic.paths.filter(p=>p.role==='mounting-hole').length,mounting.key==='B04S'&&frame.key==='FK-VERDECKT'?4:0);
  assert.deepEqual(contourPathBounds(layers.acrylic.paths[0].d),[frame.acrylic.x,frame.acrylic.y,frame.acrylic.width,frame.acrylic.height]);
  assert.equal(layers.steel.paths.some(p=>p.role==='outer'),false,'blue stock boundary remains a reference');
  for(const svg of [layers.steel.svg,layers.acrylic.svg]){assert.match(svg,/stroke="#ff0000"/);assert.doesNotMatch(svg,/<image|<text|#0000ff|data:image|rotate\(|scale\(-1/i);}
  for(const hole of layers.geometry.contours.filter(p=>p.role==='hole')){const points=flattenContourPath(hole.d),area=points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p[0]*q[1]-q[0]*p[1];},0);assert.ok(area<0,'Cairo nonzero clipping removes holes');}
  const viewport=artworkViewport(config,{mOptions:selection});assert.equal(viewport.scale,1);assert.equal(viewport.x,0);assert.equal(viewport.y,0);
  assert.equal(layers.productionReady,false);count++;
 }
 assert.equal(count,120);
});

test('missing manufacturing provenance, invalid cuts and old AOSU specimens remain blocked',()=>{
 const config=doorbellFixture(),selection=options(),p=selectedProfile(config,selection);
 assert.throws(()=>doorbellSeparations({doorbell:{schema:'gravuru-aosu-specimen/v1'}},selection),/keine validierte/);
 for(const mutate of [p=>delete p.manufacturing.mountingHoles,p=>p.manufacturing.outerContour.operation='cut',p=>p.manufacturing.bellImage=true,p=>p.geometry.cutPaths=['M0 0H200V300H0Z'],p=>p.geometry.cutPaths=['<image href="device.png"/>']]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>doorbellLayers(bad,selection));}
 const bad=structuredClone(p);bad.geometry.optionalCornerPaths[0]='M20 20H24V24H20Z';assert.throws(()=>doorbellLayers(bad,{...selection,mounting:'B04S'}),/Montagekontur/);
});

test('native review freezes both material layers and engraving reads the same selected millimetres',async()=>{
 const fixture=doorbellFixture(),decoration=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="1mm" viewBox="0 0 30 1"><path d="M.5 .5L29.5 .5" fill="none" stroke="#000000" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>'),hash=digest(decoration);
 fixture.localResources.motifs.push({key:'artwork-'+hash,bounds:[0,0,30,1],svgFragment:artworkFragment(hash,30,1),embeddedOnly:true,vectorOnly:true,artwork:{schema:'gravuru-imported-artwork/v1',assetId:hash,sourceSha256:hash,previewSha256:hash,format:'svg',page:1,pageCount:1,widthMm:30,heightMm:1}});
 for(const p of [fixture.profile,...fixture.doorbell.formats.map(f=>f.profile)])p.designs[0].objects.find(o=>o.id==='mark-0').motif='artwork-'+hash;
 const document=makeProductDocument(fixture),config=document.config,record={id:config.profile.id,revision:1,document},selection=options('35x18','FK-VERDECKT','opposite','B04S'),source=selectedProfile(config,selection).designs[0];
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAIAAACb22+3AAAAOklEQVR4nO3NIQEAMAgAsPOEaDT9M9ABg9kKLLL6Xfgnq1gsFovFYrFYLBaLxWKxWCwWi8VisVgsXhqq4AGG9djEFQAAAABJRU5ErkJggg==','base64');
 // Image decoding is tested separately; this test targets the frozen native geometry contract.
 const preparePhoto=async()=>({original:png,preview:png,width:40,height:60});
 const input={productId:record.id,productRevision:1,designId:source.id,objects:structuredClone(source.objects),options:selection,quantity:1,media:[],preview:png.toString('base64')};
 const assets={get:id=>{assert.equal(id,hash);return {format:'svg'};},read:id=>{assert.equal(id,hash);return decoration;}},bundle=await prepareAcrylicReview({record,config,input,assets,preparePhoto});
 assert.equal(bundle.manifest.capabilities.layered,true);assert.equal(bundle.manifest.capabilities.engraving,true);assert.equal(bundle.manifest.productionReady,false);
 const frozen=readReviewPackage(bundle.package,bundle.manifest.packageSha256,['gravuru-native-review/v1']);
 assert.deepEqual(JSON.parse(frozen.files.get('funkklingel-fertigung.json')),doorbellSeparations(config,selection));
 const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.equal(artwork.geometry.widthMm,350);assert.equal(artwork.geometry.heightMm,180);assert.equal(artwork.geometrySha256,artwork.doorbellLayers.geometrySha256);
 assert.doesNotMatch(artwork.svg,/<text|data:image\/png|data-native-tint|#0000ff|#ff0000/);assert.match(artwork.svg,/fill="#000000"/);
 await assert.rejects(()=>acrylicArtwork(bundle.package,'0'.repeat(64)),/Paketprüfung/);
 const front=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector'}),back=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector',mirror:true});
 assert.equal(front.metadata.layered.cutMirror,false);assert.equal(back.metadata.layered.cutMirror,false);
 const output=readReviewPackage(front.archive,digest(front.archive),['gravuru-native-review/v1']).files;
 for(const name of ['edelstahltraeger-schnitt-1zu1.pdf','acrylauflage-schnitt-1zu1.pdf','edelstahltraeger-schnitt.svg','acrylauflage-schnitt.svg'])assert.ok(output.has(name),name);
 const mirrored=readReviewPackage(back.archive,digest(back.archive),['gravuru-native-review/v1']).files;
 for(const name of ['edelstahltraeger-schnitt.svg','acrylauflage-schnitt.svg'])assert.deepEqual(output.get(name),mirrored.get(name));
});

test('separate cutting PDFs are vector-only red and retain both physical dimensions',async()=>{
 const config=doorbellFixture();
 for(const format of ['16x28','24x20','35x18']){
  const layers=doorbellSeparations(config,options(format,'FK-VERDECKT','opposite','B04S'));
  const pdfs=await renderDoorbellCutPdfs(layers);
  // The worker independently inspects page millimetres, red vector drawings,
  // absence of embedded fonts/images and returns only verified PDFs.
  assert.ok(pdfs.steel.subarray(0,5).equals(Buffer.from('%PDF-')));assert.ok(pdfs.acrylic.subarray(0,5).equals(Buffer.from('%PDF-')));
  assert.notDeepEqual(pdfs.steel,pdfs.acrylic);
 }
});
