// Reproducible synthetic design seed for the dedicated local Amazon sandbox only.
// Run: node scripts/amazon-demo-design.mjs [--assign]
// Default leaves SKU mapping and snapshot assignment available for browser review.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from '../app/configurator/variant-m/build.mjs';
import {createWorkshop} from '../app/workshop/http.mjs';
import {makeProductDocument} from '../app/workshop/product-model.mjs';
import {prepareAcrylicReview} from '../app/workshop/acrylic-review.mjs';
import {acrylicArtwork} from '../app/workshop/acrylic-artwork.mjs';
import {importEnvironment} from '../app/workshop/design-assets.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const NAME='TEST · Amazon Acryl-Zuordnung · keine Fertigungsfreigabe';
const KEY='amazon-demo-native-design-v1',DESIGN='amazon-test-design-v1',SKU='TEST-GRAVURU-ACRYL-DESIGN',MARKETPLACE='A1PA6795UKMFR9';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function renderSvg(svg){
 if(!process.env.GRAVURU_PYTHON)throw Error('GRAVURU_PYTHON muss auf die konfigurierte Python-Installation zeigen; requirements-import.txt und requirements-photos.txt installieren.');
 const script="import sys,pymupdf\ndoc=pymupdf.open(stream=sys.stdin.buffer.read(),filetype='svg')\npage=doc[0]\npix=page.get_pixmap(matrix=pymupdf.Matrix(450/page.rect.width,600/page.rect.height),alpha=False)\nsys.stdout.buffer.write(pix.tobytes('png'))";
 return execFileSync(process.env.GRAVURU_PYTHON,['-c',script],{input:Buffer.from(svg),env:importEnvironment(),windowsHide:true,maxBuffer:5*1024*1024});
}

// The injected Workshop is used by the isolated end-to-end test. This helper does
// not open a database; the CLI below fixes and verifies the only filesystem target.
export async function seedAmazonDemoDesign(workshop,{seedConfig,assign=false}={}){
 if(workshop.amazonOrders.accountId!=='amazon-sandbox'||workshop.amazonIntegration.status().productionReadsEnabled)throw Error('Nur dedizierte Amazon-Sandbox ist zugelassen.');
 const before=workshop.repository.list({includeArchived:true}).map(r=>({id:r.id,revision:r.revision,document:JSON.stringify(r.document)}));
 let snapshot=workshop.customerDrafts.findAcrylicReview(KEY),record;
 if(snapshot)record=workshop.repository.get(snapshot.product.id,{revision:snapshot.product.revision});
 else{
  const existing=workshop.repository.list({query:NAME,includeArchived:true}).filter(r=>r.name===NAME);
  if(existing.length>1)throw Error('Mehrere TEST-Produkte gefunden; eindeutige Zuordnung erforderlich.');
  if(existing.length){record=existing[0];if(record.revision!==1||record.status==='archived'||record.document.config?.profile?.designs?.[0]?.id!==DESIGN)throw Error('TEST-Produkt wurde verändert. Es wird nicht überschrieben.');}
  else{
   const config=structuredClone(seedConfig),base=config.profile.designs[0],text=base.objects.find(o=>o.type==='text');if(!config.acrylic||!text)throw Error('Vorhandene native Acrylvorlage fehlt.');
   config.profile.defaultDesignId=DESIGN;config.profile.designs=[{...base,id:DESIGN,name:'Amazon · synthetische Zuordnung',objects:[
    {...text,id:'amazon-heading',fieldKey:'amazon-heading',text:'AMAZON TEST',x:75,y:70,size:10,w:110,h:12},
    {...text,id:'amazon-note',fieldKey:'amazon-note',text:'SYNTHETISCH',x:75,y:100,size:6,w:80,h:7.2},
    {...text,id:'amazon-quantity',fieldKey:'amazon-quantity',text:'MENGE 2',x:75,y:120,size:6,w:60,h:7.2}
   ]}];
   record=workshop.repository.create(makeProductDocument(config,{name:NAME,kind:'product'}));
  }
  const config=workshop.model(record.id,record.revision).universal,design=config.profile.designs[0],options=Object.fromEntries(config.profile.optionGroups.map(g=>[g.id,g.defaultValueId]));
  const initial=renderSvg('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="200"><rect width="150" height="200" fill="white"/></svg>');
  const input={productId:record.id,productRevision:record.revision,designId:design.id,objects:structuredClone(design.objects),options,quantity:2,media:[],preview:initial.toString('base64')};
  const draft=await prepareAcrylicReview({record,config,input,assets:workshop.assets});
  const artwork=await acrylicArtwork(draft.package,draft.manifest.packageSha256);
  const rendered=renderSvg(artwork.svg);
  input.preview=rendered.toString('base64');
  const bundle=await prepareAcrylicReview({record,config,input,assets:workshop.assets});snapshot=workshop.customerDrafts.captureAcrylicReview(KEY,bundle);
 }
 const manifest=workshop.customerDrafts.review(snapshot.id).manifest,archive=workshop.customerDrafts.downloadSnapshot(snapshot.id,'package');
 if(manifest.product.id!==record.id||manifest.product.revision!==record.revision||manifest.selection?.price?.quantity!==2||hash(archive)!==manifest.packageSha256)throw Error('Gespeicherter TEST-Prüfstand stimmt nicht überein.');
 const order={orderId:'TEST-AMAZON-DESIGN-20261016',createdTime:'2026-10-16T10:00:00Z',lastUpdatedTime:'2026-10-16T10:00:00Z',salesChannel:{channelName:'AMAZON',marketplaceId:MARKETPLACE},fulfillment:{fulfillmentStatus:'UNSHIPPED',fulfilledBy:'MERCHANT',shipByWindow:{latestDateTime:'2026-10-20T16:00:00Z'}},orderItems:[{orderItemId:'TEST-AMAZON-DESIGN-LINE-1',quantityOrdered:2,product:{sellerSku:SKU,asin:'B0TESTACR1',price:{unitPrice:{amount:(manifest.product.basePriceCents/100).toFixed(2),currencyCode:'EUR'}}},fulfillment:{quantityFulfilled:0,quantityUnfulfilled:2}}]};
 const imported=workshop.amazonOrders.ingestPage({orders:[order]},{provenance:'synthetic',marketplaceIds:[MARKETPLACE]}),line=imported.lines[0];
 const bindingInput={marketplaceId:MARKETPLACE,sku:SKU,productId:record.id,productRevision:record.revision},assignmentInput={lineId:line.id,snapshotId:snapshot.id};
 if(assign){workshop.amazonOrders.bind(bindingInput);workshop.amazonOrders.attachSnapshot(assignmentInput);}
 for(const original of before){const current=workshop.repository.get(original.id);if(current.revision!==original.revision||JSON.stringify(current.document)!==original.document)throw Error('Ein vorheriger Produktstand wurde verändert.');}
 return {schema:'gravuru-amazon-native-demo/v1',synthetic:true,accountId:'amazon-sandbox',productId:record.id,productRevision:record.revision,productName:record.document.name,snapshotId:snapshot.id,sourcePackageSha256:manifest.packageSha256,quantity:2,orderId:order.orderId,lineId:line.id,sku:SKU,marketplaceId:MARKETPLACE,bindingInput,assignmentInput,assigned:Boolean(workshop.amazonOrders.get(line.id).snapshotId),quantityVerified:workshop.amazonOrders.get(line.id).assignment?.quantityVerified??false,productionReady:false,previewSource:'Native artwork SVG rendered by PyMuPDF; no production proof',links:{amazon:'/werkstatt/amazon/',review:'/werkstatt/pruefstaende/?snapshot='+snapshot.id,product:'/werkstatt/?configuration='+record.id}};
}

async function main(){
 const args=process.argv.slice(2);if(args.some(arg=>arg!=='--assign')||args.length>1)throw Error('Nur optional --assign; der Datenbankpfad ist fest auf die lokale Amazon-Sandbox begrenzt.');
 const base=path.join(root,'.local-data','amazon-sandbox');fs.mkdirSync(base,{recursive:true,mode:0o700});
 const equal=(a,b)=>process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b;
 if(!equal(fs.realpathSync(base),base))throw Error('Verknüpftes Sandboxverzeichnis ist nicht zugelassen.');
 for(const name of ['workshop.sqlite','design-assets.sqlite','profiles.sqlite']){const file=path.join(base,name);if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Verknüpfte Sandboxdatenbank ist nicht zugelassen.');}
 const lock=path.join(base,'amazon-demo-design.lock'),descriptor=fs.openSync(lock,'wx',0o600);let workshop;
 try{
  const outputDirectory=path.join(base,'preview');build({outputDirectory});const seed=JSON.parse(fs.readFileSync(path.join(outputDirectory,'models.json'),'utf8'))[0];
  workshop=createWorkshop({filename:path.join(base,'workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,amazon:{accountId:'amazon-sandbox',allowTestImports:true}});
  const result=await seedAmazonDemoDesign(workshop,{seedConfig:seed.universal,assign:args.includes('--assign')});fs.writeFileSync(path.join(base,'amazon-demo-design.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(result));
 }finally{workshop?.close();fs.closeSync(descriptor);fs.unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error('Amazon-TEST-Design konnte nicht vorbereitet werden: '+error.message);process.exitCode=1;});
