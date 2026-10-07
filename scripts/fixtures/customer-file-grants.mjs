// Synthetic session/order/file fixtures for UI access checks, never production files.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {build} from '../../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../../app/workshop/http.mjs';
import {createPreviewServer} from '../../app/configurator/variant-m/server.mjs';
import {makeFormProduct} from '../../app/workshop/form-product.mjs';
import {addFormDesign} from '../../app/workshop/form-designs.mjs';

const directory=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.existsSync(path.join(directory,'synthetic-file-grants-only'))||fs.existsSync(path.join(directory,'workshop.sqlite')))throw Error('Fresh marked synthetic fixture required.');
const built=build({outputDirectory:directory}),seed=JSON.parse(fs.readFileSync(path.join(directory,'models.json')))[0];
const config={shopDomain:'synthetic-grants.myshopify.com',clientId:'synthetic-file-grants-client',apiVersion:'2026-07',secret:randomBytes(32).toString('hex'),mode:'test-only'};
const workshop=createWorkshop({filename:path.join(directory,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,orderWebhook:config,shopifySessions:config});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const contour=await workshop.contours.import({name:'Synthetic.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><rect width="120" height="80"/></svg>').toString('base64')});
const asset=await workshop.assets.import({name:'Synthetic.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><circle cx="60" cy="40" r="20"/></svg>').toString('base64')});
const fixtures=[];
for(let i=0;i<2;i++){
 const document=addFormDesign(makeFormProduct(contour,'Synthetische Testposition '+(i+1)),asset,{designId:'test',name:'Zugriffsprüfung'});
 document.basePriceCents=2999;document.kind='product';document.processingMethod='print';
 const record=workshop.repository.create(document),store=workshop.customerDrafts;
 const draft=store.create(record,'test',{}),source=Buffer.from('synthetic-source-'+i);
 const manifest={schema:'gravuru-form-review/v1',id:'proof_'+randomUUID(),source:{draftId:draft.id,draftRevision:1},product:{id:record.id,revision:1,name:document.name,basePriceCents:2999,currency:'EUR'},packageSha256:sha(source),blockers:[],warnings:[],photos:[]};
 store.capture(draft.id,draft.token,1,{manifest,preview:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),contourPdf:source,package:source,photos:source});
 const binding=workshop.orderIntake.bind({record,shopDomain:config.shopDomain,variantId:String(301+i)});
 const offer=workshop.orderIntake.offer({bindingId:binding.id,snapshotId:manifest.id,quantity:1});
 const payload={id:101+i,test:true,financial_status:'paid',currency:'EUR',customer:{id:456+i},updated_at:'2026-10-07T10:00:00Z',line_items:[{id:201+i,variant_id:301+i,quantity:1,price:'29.99',properties:[offer.property]}]};
 const raw=Buffer.from(JSON.stringify(payload)),headers={'x-shopify-hmac-sha256':createHmac('sha256',config.secret).update(raw).digest('base64'),'x-shopify-shop-domain':config.shopDomain,'x-shopify-api-version':config.apiVersion,'x-shopify-topic':'orders/paid','x-shopify-webhook-id':randomUUID()};
 const line=workshop.orderIntake.receive(raw,headers,config).lines[0];
 // Deliberately simple bytes: verifies authorization and identity, not PDF production.
 const pdf=Buffer.from('%PDF-1.7\nsynthetic-access-test-'+i+'\n%%EOF'),archive=Buffer.from('synthetic-private-originals-'+i);
 store.savePrintProof(manifest.id,'synthetic-access/v1',{pdf,archive,metadata:{pdfSha256:sha(pdf),packageSha256:sha(archive)}});
 const job=store.exportJobs.enqueue({snapshotId:manifest.id,recipe:'synthetic-access/v1',recipeKey:'synthetic-access/v1',settings:{}});
 fixtures.push({lineId:line.id,jobId:job.id,customerId:String(456+i),payload,pdfSha256:sha(pdf),zipSha256:sha(archive)});
}
const server=createPreviewServer({workshop,outputDirectory:directory});
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(directory,'ready.json'),JSON.stringify({url:'http://127.0.0.1:'+server.address().port,config,fixtures,built}),{mode:0o600}));
process.on('SIGTERM',()=>server.close(()=>{workshop.close();process.exit(0);}));
