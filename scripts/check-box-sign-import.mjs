// Issue #63: local review of catalogued box signs. No database or shop writes.
// Geometry comes from the versioned series; old generic AB/R5 family geometry
// must not replace the source contour. Engraving margin: 0 mm (Chris, 29.10.2026).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readDesignFolder} from '../app/workshop/katalog-source.mjs';
import {katalogDesignToTemplate,parseDesignSvg,assignSeries} from '../app/workshop/katalog-convert.mjs';
import {prepareConfig,customerLayoutIssue} from '../app/configurator/variant-m/contract.mjs';
import {templateRightsIssue} from '../app/configurator/variant-m/element-rights.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return [a.slice(0,i),a.slice(i+1)];}));
for(const key of ['--katalog','--manifest','--fonts','--out'])assert(args[key],`Required: ${key}=<path>`);
const root=path.resolve(args['--katalog']),out=path.resolve(args['--out']);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const underRoot=rel=>{const p=path.resolve(root,rel);assert(p.startsWith(root+path.sep),'Path outside catalog');return p;};
const manifest=read(underRoot(args['--manifest'])),fonts=read(args['--fonts']);
assert.equal(manifest.schema,'gravuru-box-signs-import/v1');
assert.equal(manifest.designs.length,manifest.variantCount);
const family=read(underRoot('familien/edelstahl/steel-door-signs.json'));
const configurations=[],checks=[],ids=new Set();
for(const item of manifest.designs){
 assert(!ids.has(item.id),'Duplicate ID');ids.add(item.id);
 const design=readDesignFolder(underRoot(item.path));
 assert.equal(design.id,item.id);assert.equal(design.released,false);
 assert.equal(design.json.freigabe,null);
 assert(design.json.ziele.every(t=>t.freigabe===null));
 assert.deepEqual(assignSeries(family,[design])[0].sizes,[item.familySizeKey]);
 const series=read(underRoot(item.sourceSeries.file));
 const source=series.variants.find(v=>v.configurationId===item.sourceSeries.configurationId);
 assert(source,'Source configuration missing');
 assert.equal(source.form,item.form);assert.equal(source.size,item.size);
 assert.equal(source.geometrySha256,item.sourceSeries.geometrySha256);
 assert.equal(source.contourId,item.sourceSeries.contourId);
 assert.equal(series.source.groupRevision,item.sourceSeries.revision);
 const rawGeometry=series.geometries[source.geometrySha256];
 assert.equal(createHash('sha256').update(JSON.stringify(rawGeometry)).digest('hex'),source.geometrySha256);
 assert.deepEqual(design.plateMm,[rawGeometry.widthMm,rawGeometry.heightMm]);
 const geometry={width:rawGeometry.widthMm,height:rawGeometry.heightMm,shape:'contour',outlinePath:rawGeometry.contours.find(c=>c.role==='outer').d,holes:[],safeMarginMm:0,holeKeepoutMm:0};
 assert.equal(source.mounting,'K00','Review selects the existing undrilled source');
 assert.deepEqual(geometry,item.geometry,'Manifest contour differs from series');
 const converted=katalogDesignToTemplate(design,family,{id:'pferdeschilder'},{fonts});
 const {template,motifs,rights}=converted;
 assert.equal(template.objects.length,parseDesignSvg(design.svg()).layers.length,'Layer lost during import');
 assert(template.objects.some(o=>o.text?.includes('Vater'))&&template.objects.some(o=>o.text?.includes('Mutter')),'Pedigree missing');
 const config={profile:{schemaVersion:1,kind:'universal-product',id:'review-'+item.id,name:'Boxenschild '+design.name+' · '+item.form+' '+item.size+' cm',revision:'20261029-box-review',binding:{kind:'local-review',productId:'review-'+item.id},geometry,material:{kind:'steel',color:'#c9cdd0',thicknessMm:1.5},processing:{profileId:'steel-engraving'},features:{motifsAllowed:true,orderEnabled:false,productionConfirmed:false},optionGroups:[],designs:[template],defaultDesignId:template.id},reviewOnly:true,basePriceCents:null,extraMotifCents:null,photo:{enabled:false,mode:'upload-only',includedCount:0,extraPriceCents:0},logo:{enabled:false},localResources:{scope:'local-review-only',fonts,motifs},workshopElementRights:{[template.id]:rights}};
 const prepared=prepareConfig(config);
 const issues=template.objects.flatMap(o=>{const issue=customerLayoutIssue(o,prepared.profile,prepared.localResources);return issue?[{id:o.id,issue}]:[];});
 assert.deepEqual(issues,[],item.id+': contour fit');
 for(const o of template.objects.filter(o=>o.type==='motif')){
  assert.equal(rights[o.id].delete,true);assert.equal(rights[o.id].replace,true);
  assert.equal(templateRightsIssue(prepared,template,template,template.objects.filter(x=>x.id!==o.id)),null);
  assert.equal(templateRightsIssue(prepared,template,template,template.objects.map(x=>x.id===o.id?{...x,motif:'replacement-check'}:x)),null);
 }
 // Share font glyphs once in the review bundle, not 200 times.
 delete prepared.localResources.fonts;
 configurations.push({id:item.id,muster:item.muster,form:item.form,size:item.size,config:prepared});
 checks.push({id:item.id,geometrySha256:source.geometrySha256,sizeKey:item.familySizeKey,objects:template.objects.length,motifs:motifs.length,fonts:converted.fonts,notes:converted.notes,layoutIssues:issues,minTextMm:Math.min(...template.objects.filter(o=>o.type==='text').map(o=>o.size)),motifsDeletableAndReplaceable:true,released:false});
}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'review-bundle.json'),JSON.stringify({schema:'gravuru-box-sign-review/v1',reviewOnly:true,sharedResources:{fonts},configurations}));
const report={schema:'gravuru-box-sign-import-check/v1',date:'2026-10-29',variantCount:checks.length,designCount:new Set(configurations.map(x=>x.muster)).size,geometrySource:'serien/edelstahl-tuerschilder-2027.json',liveWrites:0,checks};
fs.writeFileSync(path.join(out,'import-check.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({variants:checks.length,designs:report.designCount,layoutIssues:0,notes:checks.filter(c=>c.notes.length).length,liveWrites:0}));
