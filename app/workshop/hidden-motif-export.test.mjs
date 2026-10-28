import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProductDocument} from './product-model.mjs';
import {doorbellFixture} from './test-fixtures/doorbell-config.mjs';
import {doorbellSeparations} from './doorbell-artwork.mjs';
import {acrylicArtwork} from './acrylic-artwork.mjs';
import {digest} from './review-package.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';
import {quote,resolvedOptions,productionObjects} from '../configurator/variant-m/contract.mjs';

test('hidden customer motifs are free and absent from manufacturing SVG and commerce export selection',async()=>{
 const source=doorbellFixture();source.extraMotifCents=169;source.motifCharge='additional';
 const product=makeProductDocument(source,{name:'Hidden motif fixture'}),config=product.config,options=resolvedOptions(config),design=structuredClone(config.profile.designs[0]);
 const motif={...design.objects[0],id:'customer-added',templateOrigin:false,uxPersonal:true,uxHidden:true};design.objects.push(motif);
 const render=async()=>{
  const data={'produkt-und-gestaltung.json':{schema:'gravuru-native-review-input/v1',product,state:{design,options},profileRevision:config.profile.revision},'konfigurator-quellen.json':config,'funkklingel-fertigung.json':doorbellSeparations(config,options)};
  const files=Object.entries(data).map(([name,value])=>({name,blob:new Blob([JSON.stringify(value)])}));
  const manifest={schema:'gravuru-native-review/v1',product:{id:config.profile.id,widthMm:160,heightMm:280},photos:[],files:await Promise.all(files.map(async f=>({path:f.name,bytes:f.blob.size,sha256:digest(Buffer.from(await f.blob.arrayBuffer()))})))};
  files.push({name:'manifest.json',blob:new Blob([JSON.stringify(manifest)])});
  const archive=Buffer.from(await (await zipFiles(files)).arrayBuffer());return acrylicArtwork(archive,digest(archive),{engraving:true});
 };
 const hiddenPrice=quote(config,design.objects,design.id,options);assert.equal(hiddenPrice.additionalMotifs,0);
 assert.ok(!productionObjects(design.objects).some(o=>o.id===motif.id),'same filter used by commerce-export');
 const hidden=await render();assert.doesNotMatch(hidden.svg,/data-field="native-2"/);
 motif.uxHidden=false;
 assert.equal(quote(config,design.objects,design.id,options).unitCents-hiddenPrice.unitCents,169);
 assert.ok(productionObjects(design.objects).some(o=>o.id===motif.id));
 const visible=await render();assert.match(visible.svg,/data-field="native-2"/);
});
