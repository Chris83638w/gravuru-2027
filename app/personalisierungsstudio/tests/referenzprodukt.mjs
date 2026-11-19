import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {here,importFiles} from '../catalog.mjs';
import {openStore} from '../store.mjs';

// The native R15 workshop can live in a separate checkout. Only local files and
// in-memory databases are used. The optional directory holds synthetic samples.
const root=path.resolve(process.argv[2]||fileURLToPath(new URL('../../../',import.meta.url)));
const output=process.argv[3];
const r15File=name=>path.join(root,'app/workshop',name);
const native=name=>import(pathToFileURL(r15File(name)).href);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const {build}=await import(pathToFileURL(path.join(root,'app/configurator/variant-m/build.mjs')).href);
const {createWorkshop}=await native('http.mjs');
const {steelSpecimen}=await native('specimen-product.mjs');
const {makeProductDocument}=await native('product-model.mjs');
const {prepareShopProduct}=await native('shop-preparation.mjs');
const {validateAcrylicReview,prepareAcrylicReview}=await native('acrylic-review.mjs');
const {acrylicArtwork}=await native('acrylic-artwork.mjs');
const sourceFile=here('../designs/steel-heimathafen/source.json');
const source=readJson(sourceFile);
assert.deepEqual(readJson(path.join(root,'app/designs/steel-heimathafen/source.json')),source);
const pack=importFiles([sourceFile]);
const buildDir=fs.mkdtempSync(path.join(os.tmpdir(),'gravuru-referenz-'));
build({outputDirectory:buildDir});
const [seed]=readJson(path.join(buildDir,'models.json'));
const atelier=createWorkshop({filename:':memory:',seedConfig:seed.universal,legacy:seed.legacy});
const studio=openStore(':memory:');
const shop='vergleich.myshopify.com',variant='90002',product='70001';
// Neutral preview required by the R15 archive contract. It never supplies the engraving geometry.
const preview='iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAIAAABd+SbeAAAAyElEQVR4nO3SQQ0AMAwDsW78OXcodi+bQKRTzu4O/91gA6E7Hh0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0BGhI0JHhI4IHRE6InRE6IjQEaEjQkeEjggdEToidEToiNARoSNCR4SOCB0ROiJ0ROiI0NN43zIDnQrpZW4AAAAASUVORK5CYII=';
function textLayout(objects){
  return objects.filter(o=>o.type==='text').map(({id,text,font,x,y})=>({id,text,font,x,y}));
}
try{
  const originalConfig=await steelSpecimen(atelier.assets);
  const document=makeProductDocument(originalConfig);
  const [saved]=atelier.repository.importBatch([{key:'vergleich-heimathafen',fingerprint:sha(JSON.stringify(document)),document}]);
  const record=atelier.repository.get(saved.id);
  const config=atelier.model(record.id,record.revision).universal;
  const prepared=prepareShopProduct(record);
  const variantC=readJson(path.join(root,'app/designs/steel-door-signs/shopify-variante-c-20261016.json'))
    .variants.find(v=>v.form==='RE' && v.size==='90X60' && v.option==='K00');
  assert.equal(variantC.priceCents,source.product.baseCents);
  assert.equal(prepared.variants.find(v=>v.options.mounting==='K00').priceCents,variantC.priceCents);
  studio.publish(shop,product,variant,pack);
  const report={sourceSha256:sha(fs.readFileSync(sourceFile)),widthMm:90,heightMm:60,quantity:1,
    mounting:'K00',referenceUnitCents:variantC.priceCents,r15Binding:originalConfig.profile.binding.kind,
    r15OrderEnabled:config.profile.features.orderEnabled,r15ProductionConfirmed:config.profile.features.productionConfirmed,
    designs:[]};
  for(const [index,original] of source.designs.entries()){
    const design=config.profile.designs.find(d=>d.id===original.id);
    const entry=JSON.parse(pack.index).find(d=>d.id===original.id);
    const template=JSON.parse(pack.assets.get(entry.key)).design;
    assert.deepEqual(textLayout(design.objects),textLayout(original.state.objects));
    assert.deepEqual(textLayout(template.objects),textLayout(original.state.objects));
    const objects=structuredClone(design.objects);
    const field=objects.find(o=>o.type==='text' && ['Anna & Ben','Neumann'].includes(o.text));
    field.text='Müller';
    const input={productId:record.id,productRevision:record.revision,designId:design.id,objects,
      options:{mounting:'K00'},quantity:1,media:[],preview};
    const review=validateAcrylicReview(record,config,input);
    assert.equal(review.price.unitCents,variantC.priceCents);
    const bundle=await prepareAcrylicReview({record,config,input,assets:atelier.assets});
    const art=await acrylicArtwork(bundle.package,sha(bundle.package),{engraving:true});
    assert.deepEqual([art.geometry.widthMm,art.geometry.heightMm],[90,60]);
    const key=template.objects.find(o=>o.id===field.id).key;
    const job=studio.save(shop,{variant,revision:pack.revision,design:entry.id,edits:{[key]:'Müller'},request:randomUUID()});
    const order=String(index+1);
    studio.receive(shop,{id:order,name:'Probe',status:'PAID',lines:[{id:'1',variant,product,job:job.id,quantity:1}]});
    const studioSvg=(await studio.download(shop,order,'1','svg')).bytes;
    const studioPdf=(await studio.download(shop,order,'1','pdf')).bytes;
    assert.match(studioSvg.toString(),/width="90mm" height="60mm"/);
    assert.match(studioPdf.toString('latin1'),/\/CutContour/);
    if(output){
      fs.mkdirSync(output,{recursive:true});
      for(const [suffix,data] of [['r15.svg',art.svg],['studio.svg',studioSvg],['studio.pdf',studioPdf]]){
        fs.writeFileSync(path.join(output,entry.id+'-'+suffix),data);
      }
    }
    report.designs.push({id:original.id,textFields:textLayout(design.objects).length,geometryMm:[90,60],
      r15UnitCents:review.price.unitCents,r15ArtworkSha256:sha(art.svg),studioSvgSha256:sha(studioSvg),studioPdfSha256:sha(studioPdf)});
  }
  console.log(JSON.stringify(report,null,2));
}finally{
  atelier.close();
  studio.close();
  if(path.dirname(buildDir)===path.resolve(os.tmpdir())) fs.rmSync(buildDir,{recursive:true,force:true});
}
