// Checks the approved sources through the existing native converter. No server/DB writes.
// node scripts/check-uv-gedenkkreuze.mjs <catalog> <report-directory>
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readDesignFolder,validateLine} from '../app/workshop/katalog-source.mjs';
import {validateFamily,familyReady,familyProductConfig,geometryOf} from '../app/workshop/product-families.mjs';
import {parseDesignSvg,katalogDesignToTemplate,templateFit} from '../app/workshop/katalog-convert.mjs';
import {prepareKatalogPhotoAssets} from '../app/workshop/katalog-photo-assets.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {validateDesignTargets} from '../app/workshop/design-targets.mjs';
import {textPaths} from '../app/platform/sources/app/shared/models/text-paths.mjs';
import {motifMarkup} from '../app/platform/sources/app/shared/models/studio-svg.mjs';
const [catalogArg,outArg]=process.argv.slice(2);
if(!catalogArg||!outArg)throw Error('Arguments: <catalog> <report-directory>');
const catalog=path.resolve(catalogArg),out=path.resolve(outArg);
fs.mkdirSync(out,{recursive:true});
const read=file=>JSON.parse(fs.readFileSync(path.join(catalog,file),'utf8'));
const write=(file,data)=>fs.writeFileSync(path.join(out,file),JSON.stringify(data,null,2)+'\n');
const family=validateFamily(read('familien/acryl/uv-gedenkkreuze-acryl-klar.json'));
const line=validateLine(read('linien/uv-gedenkkreuze.json'),{families:new Map([[family.id,family]])});
assert.deepEqual(line.subcategories.map(s=>s.name),['Hunde ohne Foto','Hunde mit Foto','Katzen ohne Foto','Katzen mit Foto']);
assert.deepEqual(family.sizes.map(s=>s.baseCents),[1499,2299,2799]);
assert.equal(family.photo.extraPriceCents,300);assert.equal(family.material.thicknessMm,5);assert.equal(family.material.engravingSide,'back');
const fontSources=read('schriften/schriften.json').fonts,fonts={},fontHashes={};
for(const name of family.fonts){const f=fontSources.find(f=>f.name===name);assert.ok(f?.file&&f.license);const bytes=fs.readFileSync(path.join(catalog,f.file));const resource=await convertFont(bytes.toString('base64'));fonts[name]=resource.font;fontHashes[name]=createHash('sha256').update(bytes).digest('hex');}
write('native-fonts.json',fonts);
const rows=[],native=[],runtime=[];
for(const size of ['11x20','14x25','22x40']){
 const series='uv-gedenkkreuze-'+size,index=read('designs/'+series+'/index.json');assert.equal(index.length,20);
 assert.deepEqual(index.map(d=>d.sortOrder),Array.from({length:20},(_,i)=>i+1));
 for(const entry of index){
  const master=readDesignFolder(path.join(catalog,'designs',series,entry.pfad));validateDesignTargets(master.json,{families:[family]});
  const parsed=parseDesignSvg(master.svg()),sizeSource=family.sizes.find(s=>s.key===master.json.sizes[0]);
  assert.deepEqual([parsed.widthMm,parsed.heightMm],[sizeSource.widthMm,sizeSource.heightMm]);
  assert.deepEqual(parsed.notes,[]);assert.ok(parsed.layers.filter(l=>l.kind==='text').length>=2);
  const converted=await prepareKatalogPhotoAssets(katalogDesignToTemplate(master,family,{id:master.themes.at(-1)},{fonts}),master,{previewOnly:true});
  const photo=converted.template.objects.filter(o=>o.type==='photoSlot');
  assert.equal(photo.length,entry.fotos);assert.equal(converted.examples.length,entry.fotos);
  assert.equal(converted.previewMaskUrls.length,entry.fotos);
  assert.equal(converted.template.objects.length,entry.texte+entry.motive+entry.fotos);
  assert.ok(converted.template.objects.filter(o=>o.type==='text').every(o=>o.customerEditable&&converted.rights[o.id].content));
  if(photo.length)assert.ok(converted.rights[photo[0].id].replace);
  const fit=templateFit(converted.template,family,sizeSource,fonts,{motifs:converted.motifs});
  rows.push({id:master.id,originalId:master.json.sourceDesignId,sourceVersion:entry.sourceVersion,size,group:entry.sortGroup,order:entry.sortOrder,objects:converted.template.objects.length,texts:entry.texte,motifs:entry.motive,photos:photo.length,fit,notes:converted.notes});
  native.push({id:master.id,originalId:master.json.sourceDesignId,sizeKey:sizeSource.key,group:entry.sortGroup,order:entry.sortOrder,...converted});
  // Direct native text/motif output for geometric comparison; not a second renderer.
  const artwork=converted.template.objects.filter(o=>o.type!=='photoSlot').map(o=>`<g transform="translate(${o.x} ${o.y}) rotate(${o.rotation||0})" fill="${o.color}">${o.type==='text'?textPaths(o,fonts):motifMarkup(converted.motifs.find(m=>m.key===o.motif),o.w,o.h)}</g>`).join('');
  fs.writeFileSync(path.join(out,master.id+'-native-artwork.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="${parsed.widthMm}mm" height="${parsed.heightMm}mm" viewBox="0 0 ${parsed.widthMm} ${parsed.heightMm}">${artwork}</svg>`);
 }
}
for(const size of family.sizes){try{familyProductConfig(family,size,1);runtime.push({size:size.key,status:'supported'});}catch(error){runtime.push({size:size.key,status:'blocked',reason:error.message});}}
assert.equal(rows.length,60);assert.equal(new Set(rows.map(r=>r.originalId)).size,20);assert.equal(rows.reduce((n,r)=>n+r.photos,0),30);
write('native-designs.json',{schema:'gravuru-uv-cross-native-source-package/v1',fontResource:'native-fonts.json',familyId:family.id,designs:native,liveImported:false});
const report={generatedAt:new Date().toISOString(),designCount:20,sizeVariants:60,nativePhotoSlots:30,groupOrder:line.subcategories.map(s=>s.name),counts:{nativeConverted:rows.length,fit:rows.reduce((counts,r)=>(counts[r.fit.status]=(counts[r.fit.status]||0)+1,counts),{})},familyReady:familyReady(family),nativeProductCreation:runtime,fonts:fontHashes,prices:family.sizes.map(s=>({size:s.label,withoutPhotoCents:s.baseCents,withPhotoCents:s.baseCents+300})),mirrorOutput:true,printSide:'back',white:'RDG_WHITE',liveImported:false,rows};
write('source-check.json',report);
console.log(JSON.stringify({counts:report.counts,familyReady:report.familyReady,nativeProductCreation:runtime},null,2));
