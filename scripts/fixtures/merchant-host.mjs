import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {merchantConfig, prepareMerchantStorage} from '../../ops/plesk/merchant-config.mjs';
import {createMerchantRuntime} from '../../ops/plesk/merchant-runtime.mjs';
const root = fs.realpathSync(process.argv[2]);
if (!fs.existsSync(path.join(root, '.synthetic-merchant-runtime')) || fs.statSync(root).mode & 0o077) throw Error('Synthetic fixture directory required');
process.umask(0o077);
const key = path.join(root, 'synthetic-key'), file = path.join(root, 'merchant.json');
fs.writeFileSync(key, randomBytes(32).toString('hex'), {mode: 0o600, flag: 'wx'});
fs.writeFileSync(file, JSON.stringify({schema: 1, purpose: 'shopify-merchant-test-runtime', values: {
  GRAVURU_SHOPIFY_APP_ORIGIN: 'https://merchant.example', GRAVURU_PRIVATE_DATA_DIR: path.join(root, 'data'),
  GRAVURU_SHOPIFY_CLIENT_SECRET_FILE: key, GRAVURU_SHOPIFY_PYTHON: process.env.GRAVURU_MERCHANT_TEST_PYTHON
}}), {mode: 0o600, flag: 'wx'});
const env = {GRAVURU_SHOPIFY_CONFIG_FILE: file}; prepareMerchantStorage(merchantConfig(env));
// Add a real free-form fixture before starting the locked merchant process.
process.env.GRAVURU_PYTHON=process.env.GRAVURU_MERCHANT_TEST_PYTHON;
const {build,OUTPUT}=await import('../../app/configurator/variant-m/build.mjs');
const {createWorkshop}=await import('../../app/workshop/http.mjs');
const {makeFormProduct}=await import('../../app/workshop/form-product.mjs');
const {addFormDesign}=await import('../../app/workshop/form-designs.mjs');
build();const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json')))[0];
const workshop=createWorkshop({filename:path.join(root,'data/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy});
const contour=await workshop.contours.import({name:'Testform.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M5 0H115L120 5V75L115 80H5L0 75V5Z"/></svg>').toString('base64')});
const design=await workshop.assets.import({name:'Testdesign.svg',bytes:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120mm" height="80mm" viewBox="0 0 120 80"><path d="M15 10H105" stroke="#222222" stroke-width="2"/></svg>').toString('base64')});
let document=addFormDesign(makeFormProduct(contour,'Synthetische Händlerform'),design,{name:'Testdesign',designId:'memory'});
document.kind='product';document.material={id:'oak',thicknessMm:3,surfaceNotes:'Synthetisches Prüfmuster'};document.basePriceCents=1499;document.processingMethod='engraving';document.presentation={scene:'studio'};document.designs[0].sourcePrepared=true;
document.designs[0].fields=[{id:'name',type:'text',label:'Dein Name',xMm:20,yMm:20,widthMm:75,heightMm:12,text:'Unser Zuhause',font:Object.keys(seed.universal.localResources.fonts)[0],sizeMm:4,color:'#222222',bold:false,italic:false,allowMove:true,allowScale:true,allowDelete:true,allowColor:true}];
const form=workshop.repository.create(document);
const {syntheticSlate}=await import('./slate-config.mjs');
const {makeProductDocument}=await import('../../app/workshop/product-model.mjs');
let slateDoc=makeProductDocument(syntheticSlate(seed.universal),{name:'Synthetische Schieferplatte',kind:'product'});
if(['ai','ai-batch'].includes(process.argv[3])){const {authorDesign}=await import('../../app/workshop/ui/design-authoring.mjs');const asset=await workshop.assets.importPhotoExample({bytes:fs.readFileSync(path.join(root,'synthetic.png')).toString('base64'),widthMm:25,heightMm:35});slateDoc=authorDesign(slateDoc,'slate-test','photo',{exampleAssetId:asset.assetId}).document;}
const slate=workshop.repository.create(slateDoc);const batchSlates=process.argv[3]==='ai-batch'?[slate,...[2,3].map(n=>workshop.repository.create({...slateDoc,name:'Synthetische Schieferplatte '+n}))]:[];
const specimens=process.argv[3]==='specimens'?(await (await import('../../app/workshop/specimen-import.mjs')).importSpecimens(workshop)):[];workshop.close();
const aiDesign=['ai','ai-batch'].includes(process.argv[3])?{
 config:{enabled:true,imagesEnabled:true,monthlyLimitCents:10000,pricingValidUntil:new Date(Date.now()+86400000).toISOString()},
 imageProvider:async(context)=>{await new Promise(r=>setTimeout(r,120));return {image:fs.readFileSync(path.join(root,'synthetic-ai.png')).toString('base64'),chargedCents:9,usage:{model:'synthetic'}};},
 provider:async(context,{signal})=>{
  await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,context.instruction.includes('LANGSAM')?20000:120);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(Error('synthetic abort'));},{once:true});});
  const text=context.design.objects.find(o=>o.type==='text'&&!o.technicalLocked);
  return {chargedCents:2,usage:{inputTokens:100,outputTokens:100},plan:{summary:'Synthetischer Layoutvorschlag: Name etwas tiefer.',operations:[{action:'move',objectId:text.id,text:null,font:null,size:null,x:text.x,y:text.y+5,w:null,h:null,color:null,motifKey:null}]}};
 }
}:undefined;
const server = await createMerchantRuntime(env,{aiDesign}); server.listen(0, '127.0.0.1'); await once(server, 'listening');
fs.writeFileSync(path.join(root, 'ready.json'), JSON.stringify({port: server.address().port, origin: 'https://merchant.example',form:{id:form.id,revision:form.revision},slate:{id:slate.id,revision:slate.revision},specimens,batchSlates:batchSlates.map(r=>({id:r.id,revision:r.revision}))}));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => {server.close(); server.closeAllConnections(); await server.runtimeClosed;});
