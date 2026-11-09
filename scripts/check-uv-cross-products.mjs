// End-to-end native model checks with the real 60 designs and imported assets.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createProductRepository} from '../app/workshop/repository.mjs';
import {validateProductDocument} from '../app/workshop/product-model.mjs';
import {createDesignAssetStore} from '../app/workshop/design-assets.mjs';
import {prepareConfig,selectedProfile,resolvedOptions,quote,validateDesign,cleanObject} from '../app/configurator/variant-m/contract.mjs';
import {familyFormatState,familyFormatChoices} from '../app/configurator/variant-m/family-formats.mjs';
import {uploadQuote} from '../app/configurator/variant-m/ux-model.mjs';
import {transferTexts} from '../app/configurator/variant-m/workflow-model.mjs';
import {surfaceObjectIssue} from '../app/platform/sources/app/shared/models/design-content.mjs';
import {photoClip,photoMaskFits} from '../app/platform/sources/app/shared/models/photo-shape.mjs';
import {productionSubject} from '../app/workshop/production-profiles.mjs';
const [dataArg,outArg,packArg]=process.argv.slice(2),data=path.resolve(dataArg),pack=JSON.parse(fs.readFileSync(packArg||path.join(data,'uv-cross-products.json')));
const assets=createDesignAssetStore({filename:path.join(data,'design-assets.sqlite')}),repo=createProductRepository({filename:path.join(data,'workshop.sqlite'),validateDocument:validateProductDocument});
const rows=[];
try{
 assert.deepEqual(pack.groups.map(g=>g.name),['Hunde ohne Foto','Hunde mit Foto','Katzen ohne Foto','Katzen mit Foto']);
 for(const group of pack.groups){
  const record=repo.get(group.productId),c=record.document.config,fonts=c.localResources.fonts,motifs=c.localResources.motifs;
  assets.validateDocument(record.document);prepareConfig(c);
  assert.deepEqual(productionSubject(record.document),{method:'print',materialId:'acrylic-clear',thicknessMm:5});
  assert.equal(record.metadata.productionProfile.document.output.mirror,true);
  assert.equal(record.metadata.productionProfile.document.output.white,'motif');
  assert.deepEqual(familyFormatChoices(c).map(f=>f.id),['KREUZ']);
  for(const [n,format] of c.familyFormats.formats.entries()){
   const options=resolvedOptions(c,{size:format.key}),p=selectedProfile(c,options);assert.equal(p.designs.length,5);
   assert.deepEqual(p.designs.map(d=>d.katalog.sourceDesignId.slice(-2)),['01','02','03','04','05']);
   for(const design of p.designs){
    const objects=structuredClone(design.objects),name=objects.find(o=>o.fieldKey==='name'),photo=objects.find(o=>o.type==='photoSlot');
    assert.ok(name);name.text='Mia';
    for(const o of objects.filter(o=>o.fieldKey?.startsWith('daten')))o.text=o.fieldKey==='daten'?'2014 – 2026':o.fieldKey==='daten-1'?'2014':'2026';
    if(photo){photo.uxUploadId='test-photo';photo.uxUploadKind='photo';photo.uxPhotoCrop={zoom:1.3,x:.1,y:-.1,angle:7};assert.deepEqual(cleanObject(photo).photoMaskGeometry,photo.photoMaskGeometry);assert.match(photoClip(photo,'verified').defs,/data-native-photo-mask/);assert.equal(photoMaskFits(photo,{...p.geometry,holes:[]}),true);assert.equal(photoMaskFits({...photo,x:-1000},{...p.geometry,holes:[]}),false);}
    const base=quote(c,objects,design.id,options).unitCents,total=base+uploadQuote(objects,1,false,c.photo,c.logo).unitCents;
    assert.equal(base,[1499,2299,2799][n]);assert.equal(total,[1499,2299,2799][n]+(photo?300:0));
    let state={designId:design.id,objects,mOptions:options,width:p.geometry.width,height:p.geometry.height};
    for(const target of [...c.familyFormats.formats.filter(f=>f.key!==format.key),format]){
     state=familyFormatState(c,state,{size:target.key},{fonts,motifs});
     const profile=selectedProfile(c,state.mOptions),chosen=profile.designs.find(d=>d.id===state.designId);
     assert.equal(chosen.katalog.sourceDesignId,design.katalog.sourceDesignId);assert.equal(state.objects.find(o=>o.fieldKey==='name').text,'Mia');
     assert.deepEqual(state.objects.filter(o=>o.fieldKey?.startsWith('daten')).map(o=>o.text),objects.filter(o=>o.fieldKey?.startsWith('daten')).map(o=>o.text));
     assert.equal(state.objects.length,chosen.objects.length);
     if(photo){const next=state.objects.find(o=>o.type==='photoSlot');assert.equal(next.uxUploadId,'test-photo');assert.deepEqual(next.uxPhotoCrop,photo.uxPhotoCrop);assert.deepEqual(next.photoMaskGeometry,chosen.objects.find(o=>o.type==='photoSlot').photoMaskGeometry);}
     validateDesign(c,{...chosen,objects:state.objects},state.mOptions,fonts,motifs,{draft:true});
     const outside=state.objects.map(o=>({id:o.id,issue:surfaceObjectIssue(o,profile,{fonts,motifs})})).filter(o=>o.issue);
     assert.deepEqual(outside,[],JSON.stringify({design:design.id,target:target.key,outside}));
    }
    if(photo){const altered=structuredClone(design);const mask=altered.objects.find(o=>o.type==='photoSlot').photoMaskGeometry;mask.fillRule=mask.fillRule==='evenodd'?'nonzero':'evenodd';assert.throws(()=>validateDesign(c,altered,options,fonts,motifs,{draft:true}),/Fotomaske|Vorlage|verändert|Geometrie|feste|Struktur/i);}
    rows.push({group:group.name,design:design.katalog.designId,size:format.key,baseCents:base,withUploadedPhotoCents:total,sizeRoundtrip:true,maskPreserved:true});
   }
  }
 }
 const from=[{id:'a',type:'text',fieldKey:'daten',text:'2014 – 2026'}],to=[{id:'b',type:'text',fieldKey:'daten-1',text:'2010'},{id:'c',type:'text',fieldKey:'daten-2',text:'2024'}];assert.deepEqual(transferTexts(from,to),[]);assert.deepEqual(to.map(o=>o.text),['2014','2026']);
 assert.equal(rows.length,60);
 const report={groups:4,designs:20,formats:60,passed:60,priceChecks:60,sizeSwitches:180,rows};
 fs.writeFileSync(outArg,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,rows:undefined}));
}finally{repo.close();assets.close();}
