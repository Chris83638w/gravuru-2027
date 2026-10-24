import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {validateFamily,familyProductConfig,geometryOf} from './product-families.mjs';
import {selectedProfile} from '../configurator/variant-m/contract.mjs';
import {nativeContour,acrylicArtwork} from './acrylic-artwork.mjs';
import {geometryContourPdf} from './form-contour-pdf.mjs';
import {renderEngraving} from './form-engraving-proof.mjs';
import {createAcrylicEngravingProof} from './acrylic-engraving-proof.mjs';
import {prepareAcrylicReview} from './acrylic-review.mjs';
import {makeProductDocument} from './product-model.mjs';
import {readReviewPackage,digest} from './review-package.mjs';
import {NATIVE_REVIEW_SCHEMAS} from './native-review-schema.mjs';
import {importEnvironment} from './design-assets.mjs';
import {workshopResources} from './catalog.mjs';
import {katalogDesignToTemplate,scaleTemplate} from './katalog-convert.mjs';

const fixtureFile=new URL('./test-fixtures/retro-contours.json',import.meta.url),fixture=JSON.parse(fs.readFileSync(fixtureFile));
const python=process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3');
const inspector=fileURLToPath(new URL('./test-fixtures/contour-production-inspect.py',import.meta.url));
const sha=v=>createHash('sha256').update(v).digest('hex');
const inspect=(pdf,geometry,mirror=false,points=[])=>JSON.parse(execFileSync(python,[inspector],{input:JSON.stringify({pdf:pdf.toString('base64'),geometry,mirror,points}),env:importEnvironment(),maxBuffer:4*1024*1024}).toString());
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<=.1,label+': '+actual+' vs '+expected);
function assertContour(pdf,g,row,mirror=false){
 const result=inspect(pdf,g,mirror);
 near(result.widthMm,row.widthMm,'PDF width');near(result.heightMm,row.heightMm,'PDF height');assert.equal(result.pages,1);
 assert.equal(result.images.length,0);assert.equal(result.fonts,0);assert.equal(result.rings,1+row.holes.length);
 [0,0,row.widthMm,row.heightMm].forEach((v,i)=>near(result.outerBounds[i],v,'analytic bounds '+i));
 assert.ok(result.outerCubicSegments>=4,'original curves remain vector curves, not a rectangle/polyline');
 assert.ok(result.curveDeviationMm<=.1,'curve deviation '+result.curveDeviationMm);
 const expected=row.holes.map(h=>({...h,x:mirror?row.widthMm-h.x:h.x})).sort((a,b)=>a.x-b.x),holes=result.holes.sort((a,b)=>a.x-b.x);
 assert.equal(holes.length,expected.length);
 holes.forEach((h,i)=>{near(h.x,expected[i].x,'hole centre x');near(h.y,expected[i].y,'hole centre y');near(h.diameterX,expected[i].diameter,'hole diameter x');near(h.diameterY,expected[i].diameter,'hole diameter y');});
 return result;
}
function sourceFamily(row){
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/katalog/familien/edelstahl/test-schilder.json',import.meta.url)));
 f.groups=[{key:'RT'+row.id[3],name:'Retro '+row.id[3],shape:'contour',cornerRadiusMm:0}];
 f.mountingRules=[{id:'fixed',label:'Zeichnungsbohrungen',layout:'left-right',count:2,diameterMm:4,edgeMm:null,priceCents:249,skuSuffix:'B02'}];
 f.sizes=[{key:'TEST-'+row.id,groupKey:f.groups[0].key,label:row.widthMm+' × '+row.heightMm+' mm',widthMm:row.widthMm,heightMm:row.heightMm,baseCents:row.widthMm===90?1499:null,mounting:['fixed'],outlinePath:row.outline,holesMm:row.holes.map(h=>({x:h.x,y:h.y,diameterMm:h.diameter}))}];
 return validateFamily(f);
}
test('native Retro production chain keeps source curves and holes in vector/raster mirrored PDFs',async t=>{
 const dir=process.env.GRAVURU_CONTOUR_REPORT_DIR||fs.mkdtempSync(path.join(os.tmpdir(),'g27-contour-production-'));
 fs.mkdirSync(dir,{recursive:true});if(!process.env.GRAVURU_CONTOUR_REPORT_DIR)t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const report={fixtureSha256:sha(fs.readFileSync(fixtureFile)),drawingSha256:fixture.drawingSha256,sourceVerified:false,checks:[],productionReady:false};
 const catalog=process.env.GRAVURU_KATALOG||fileURLToPath(new URL('../../../gravuru-katalog/',import.meta.url)),source=path.join(catalog,'zeichnungen/edelstahl-schilder-2027/geometrie.json');
 if(fs.existsSync(source)){
  const bytes=fs.readFileSync(source),geo=JSON.parse(bytes);assert.equal(geo.drawingSha256,fixture.drawingSha256);
  for(const row of fixture.rows){const original=geo.rows.find(r=>r.id===row.id);assert.equal(original.outline,row.outline);assert.deepEqual(original.holes,row.holes);assert.equal(original.widthMm,row.widthMm);assert.equal(original.heightMm,row.heightMm);}
  report.sourceVerified=true;report.catalogGeometrySha256=sha(bytes);
 }
 const save=(name,bytes)=>{fs.writeFileSync(path.join(dir,name),bytes);return sha(bytes);};
 for(const row of fixture.rows){
  const f=sourceFamily(row),size=f.sizes[0],g0=geometryOf(f,size);
  // Open large-format prices stay null. Pure geometry generation does not invent
  // a purchasable product; 9x6 traverses the full family/selected-profile adapter.
  const g=row.widthMm===90?selectedProfile(familyProductConfig(f,size,1),{mounting:'B02'}).geometry:{...g0,holes:g0.holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm}))};
  assert.equal(size.baseCents,row.widthMm===90?1499:null);assert.equal(g.outlinePath,row.outline);
  const native=nativeContour(g);assert.equal(native.contours[0].d,row.outline);
  const pdf=await geometryContourPdf(native,'Paket B '+row.id),measurement=assertContour(pdf,native,row);
  report.checks.push({id:row.id,kind:'native-contour',...measurement,sha256:save(row.id+'-kontur.pdf',pdf)});
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+row.widthMm+'mm" height="'+row.heightMm+'mm" viewBox="0 0 '+row.widthMm+' '+row.heightMm+'"><defs><clipPath id="plate"><path d="'+native.contours.map(r=>r.d).join(' ')+'" clip-rule="evenodd" fill-rule="evenodd"/></clipPath></defs><g clip-path="url(#plate)"><rect width="'+row.widthMm+'" height="'+row.heightMm+'" fill="#888"/><rect x="'+row.widthMm*.3+'" y="'+row.heightMm*.25+'" width="'+row.widthMm*.1+'" height="'+row.heightMm*.2+'" fill="#000"/></g></svg>';
  const points=[[row.widthMm*.35,row.heightMm*.35],[row.widthMm*.65,row.heightMm*.35],[row.holes[0].x,row.holes[0].y],[.25,.25]];
  const raw=await renderEngraving({svg,geometry:native,settings:{mode:'vector',dpi:300,mirror:false},photoFields:[],photos:[]}),art=Buffer.from(raw.pdf,'base64'),contour=Buffer.from(raw.contour,'base64'),artInfo=inspect(art,null,false,points);
  save(row.id+'-gravur-vektor.pdf',art);
  assert.equal(artInfo.images.length,0);assert.equal(artInfo.fonts,0);assert.ok(artInfo.drawings>0);near(artInfo.widthMm,row.widthMm,'vector page width');near(artInfo.heightMm,row.heightMm,'vector page height');
  assert.deepEqual(artInfo.pixels[0],[0,0,0]);assert.deepEqual(artInfo.pixels[2],[255,255,255]);assert.deepEqual(artInfo.pixels[3],[255,255,255]);
  report.checks.push({id:row.id,kind:'vector-engraving',artwork:artInfo,contour:assertContour(contour,native,row),sha256:save(row.id+'-gravur-vektor.pdf',art),contourSha256:save(row.id+'-gravur-kontur.pdf',contour)});
  if(row.id==='TRT2-V2A-9x6'){
   for(const mode of ['vector','raster'])for(const mirror of mode==='raster'?[false,true]:[true]){
    const r=await renderEngraving({svg,geometry:native,settings:{mode,dpi:300,mirror},photoFields:[],photos:[]}),p=Buffer.from(r.pdf,'base64'),c=Buffer.from(r.contour,'base64'),info=inspect(p,null,false,points.map(([x,y])=>[mirror?row.widthMm-x:x,y]));
    near(info.widthMm,90,'mirrored page width');near(info.heightMm,60,'mirrored page height');
    // PDF vector colour conversion can round #888 one level below the
    // 8-bit raster. Black ink and white cutouts must still match exactly.
    info.pixels.forEach((pixel,i)=>i===1?pixel.forEach((v,j)=>assert.ok(Math.abs(v-artInfo.pixels[i][j])<=1,'gray quantisation')):assert.deepEqual(pixel,artInfo.pixels[i],'orientation and clipping'));
    if(mode==='raster'){assert.equal(info.images.length,1);assert.equal(info.images[0].colorspace,'DeviceGray');assert.equal(r.pixelWidth,Math.ceil(90*300/25.4));}else assert.equal(info.images.length,0);
    report.checks.push({id:row.id,kind:mode+'-mirror-'+mirror,artwork:info,contour:assertContour(c,native,row,mirror),sha256:save(row.id+'-'+mode+'-'+mirror+'.pdf',p),contourSha256:save(row.id+'-'+mode+'-'+mirror+'-kontur.pdf',c)});
   }
  }
 }
 // Frozen native review, real D1 source text paths, and final proof package.
 const row=fixture.rows.find(r=>r.id==='TRT2-V2A-9x6'),f=sourceFamily(row),sample=JSON.parse(fs.readFileSync(new URL('./test-fixtures/retro-designs.json',import.meta.url))).samples.find(s=>s.json.id==='TR2-V2A-9x6-D1');
 const fonts={...workshopResources().fonts,...JSON.parse(fs.readFileSync(new URL('../designs/aosu-labrador/assets/michroma-vectors.json',import.meta.url)))};
 const converted=katalogDesignToTemplate({id:sample.json.id,name:sample.json.name,source:'lieferform2',plateMm:sample.json.plateMm,json:sample.json,svg:()=>sample.svg},f,null,{fonts});
 const c=familyProductConfig(f,f.sizes[0],1),design=scaleTemplate(converted.template,sample.json.plateMm,[90,60],fonts,{contain:true});
 c.localResources.fonts=fonts;c.profile.designs=[design];c.profile.defaultDesignId=design.id;
 const document=makeProductDocument(c),config=document.config,record={id:config.profile.id,revision:1,document,metadata:{}},objects=structuredClone(config.profile.designs[0].objects);
 objects.filter(o=>o.type==='text').forEach((o,i)=>o.text=i?'Kontur':'Test');
 const preview=execFileSync(python,['-c',"from PIL import Image;import sys;Image.new('RGB',(64,64),'white').save(sys.stdout.buffer,format='PNG')"],{env:importEnvironment()}).toString('base64');
 const bundle=await prepareAcrylicReview({record,config,input:{productId:record.id,productRevision:1,designId:design.id,objects,options:{mounting:'B02'},quantity:1,media:[],preview}});
 save('RT2-D1-gesicherter-Pruefstand.zip',bundle.package);const before=digest(bundle.package);
 const artwork=await acrylicArtwork(bundle.package,bundle.manifest.packageSha256,{engraving:true});
 assert.equal(artwork.geometry.contours[0].d,row.outline);assert.doesNotMatch(artwork.svg,/<text\b|data:image/);
 const proof=await createAcrylicEngravingProof(bundle.package,bundle.manifest.packageSha256,{mode:'vector',dpi:300,mirror:true}),zipped=readReviewPackage(proof.archive,digest(proof.archive),NATIVE_REVIEW_SCHEMAS),contour=zipped.files.get('gravur-kontur-1zu1.pdf');
 assert.equal(proof.metadata.productionReady,false);assert.equal(proof.metadata.sourcePackageSha256,before);assert.equal(digest(bundle.package),before);
 const artInfo=inspect(proof.pdf);assert.equal(artInfo.images.length,0);assert.equal(artInfo.fonts,0);assert.ok(artInfo.drawings>0);
 report.checks.push({id:row.id,kind:'frozen-D1-review-to-production',artwork:artInfo,contour:assertContour(contour,artwork.geometry,row,true),sha256:save('RT2-D1-gravur-spiegel.pdf',proof.pdf),packageSha256:save('RT2-D1-gravurpaket.zip',proof.archive),sourcePackageSha256:before});
 fs.writeFileSync(path.join(dir,'measurements.json'),JSON.stringify(report,null,2)+'\n');
});
