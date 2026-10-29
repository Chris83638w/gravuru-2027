// Offline preparation only. No network client, credentials, --apply or binding writer.
// Completes activateAfterBinding / publishAfterVerification from prepare-doorbell-shopify.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export const SHOP='gravuru-design.myshopify.com';
export const PUBLICATION='gid://shopify/Publication/291556688252';
export const PILOT='gid://shopify/Product/16124413084028';
const FORMATS=['16x28','24x20','35x18'];
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const requireThat=(value,message)=>{if(!value)throw Error(message);};
export const OPERATIONS=Object.freeze({
 setMarker:'mutation DoorbellEntryMarker($metafields:[MetafieldsSetInput!]!){metafieldsSet(metafields:$metafields){metafields{id namespace key type value compareDigest} userErrors{field message code}}}',
 publish:'mutation DoorbellEntryPublish($id:ID!,$input:[PublicationInput!]!){publishablePublish(id:$id,input:$input){userErrors{field message}}}',
 unpublish:'mutation DoorbellEntryUnpublish($id:ID!,$input:[PublicationInput!]!){publishableUnpublish(id:$id,input:$input){userErrors{field message}}}',
 removeMarker:'mutation DoorbellEntryRemoveMarker($metafields:[MetafieldIdentifierInput!]!){metafieldsDelete(metafields:$metafields){userErrors{field message}}}'
});

export function prepareDoorbellEntryRelease({catalog,snapshot,theme}){
 requireThat(snapshot?.schema==='doorbell-entry-snapshot/v1'&&snapshot.shopDomain===SHOP,'Wrong shop or snapshot schema');
 requireThat(snapshot.publicationId===PUBLICATION&&snapshot.publication?.id===PUBLICATION&&snapshot.publication.catalog?.title?.endsWith('for Online Store'),'Online Store publication not verified');
 requireThat(Number.isFinite(Date.parse(snapshot.readAt)),'Missing snapshot timestamp');
 requireThat(Array.isArray(catalog)&&catalog.length===126&&snapshot.products?.length===126,'Exactly 126 known products required');
 const byId=new Map(snapshot.products.map(p=>[p.id,p]));
 requireThat(byId.size===126&&new Set(catalog.map(p=>p.productId)).size===126&&new Set(catalog.map(p=>p.configProduct)).size===126,'Duplicate product/configurator ID');
 const models=new Map();
 for(const p of catalog){const group=models.get(p.model)||[];group.push(p.format);models.set(p.model,group);}
 requireThat(models.size===42&&[...models.values()].every(g=>g.length===3&&FORMATS.every(f=>g.includes(f))),'Expected 42 models with all three formats');
 requireThat(theme?.schema==='doorbell-entry-theme/v1'&&theme.theme?.role==='MAIN','No main theme evidence');
 const footer=theme.theme.files.nodes.find(f=>f.filename==='sections/footer-group.json');
 const layout=theme.theme.files.nodes.find(f=>f.filename==='layout/theme.liquid');
 const liquid=footer?.section?.settings?.custom_liquid||'';
 requireThat(layout?.includesFooterGroup&&footer?.sectionInOrder&&!footer.section.disabled&&liquid.includes("product.metafields.custom.customization_id.value != blank")&&liquid.includes('id="gravuru-konfi"')&&liquid.includes('/apps/konfigurator/shop-embed.mjs'),'Existing global entry is absent or disabled');
 const rows=[],setMarkers=[],publications=[];
 for(const p of catalog){
  const live=byId.get(p.productId);
  requireThat(live&&/^gid:\/\/shopify\/Product\/\d+$/.test(p.productId)&&live.handle===p.handle&&live.status==='ACTIVE','Product scope, handle or ACTIVE state differs: '+p.productId);
  requireThat(/^cfg_[a-f0-9-]{36}$/.test(p.configProduct)&&Number.isSafeInteger(p.configRevision)&&p.configRevision>0,'Invalid native product/revision');
  requireThat(p.variants===120&&p.matchingBindings===120&&p.importMatches===true&&p.variantDeviations?.length===0&&p.defaultMatches===true&&/^[a-f0-9]{64}$/.test(p.documentSha256)&&/^[a-f0-9]{64}$/.test(p.bindingDocumentSha256),'Missing successful complete binding evidence: '+p.productId);
  const templateFile='templates/product'+(live.templateSuffix?'.'+live.templateSuffix:'')+'.json';
  const template=theme.templates.find(t=>t.file===templateFile);
  requireThat(template&&template.blocks.some(b=>b.type==='buy_buttons'&&b.activeInOrder&&!b.disabled),'No existing purchase-form template for '+p.productId);
  const marker=live.metafield;
  requireThat(marker===null||(marker.namespace==='custom'&&marker.key==='customization_id'&&marker.type==='single_line_text_field'&&marker.value===p.configProduct),'Conflicting existing metafield: '+p.productId);
  requireThat(typeof live.publishedOnPublication==='boolean','Missing publication state');
  if(marker===null)setMarkers.push({ownerId:p.productId,namespace:'custom',key:'customization_id',type:'single_line_text_field',value:p.configProduct,compareDigest:null});
  if(!live.publishedOnPublication)publications.push({id:p.productId,input:[{publicationId:PUBLICATION}]});
  rows.push({productId:p.productId,handle:p.handle,model:p.model,format:p.format,configProduct:p.configProduct,revision:p.configRevision,documentSha256:p.documentSha256,bindingDocumentSha256:p.bindingDocumentSha256,updatedAt:live.updatedAt,templateSuffix:live.templateSuffix??'',before:{metafield:marker,published:live.publishedOnPublication},action:{marker:marker?'keep':'create-if-absent',publication:live.publishedOnPublication?'keep':'publish-after-pilot'},entry:'/apps/konfigurator/start?product='+p.productId.split('/').at(-1)});
 }
 const pilot=rows.find(p=>p.productId===PILOT);
 requireThat(pilot?.format==='16x28'&&pilot.before.published,'Fixed published portrait pilot missing');
 const siblingIds=rows.filter(p=>p.model===pilot.model&&p.productId!==PILOT).map(p=>p.productId);
 const markerRest=setMarkers.filter(p=>p.ownerId!==PILOT&&!siblingIds.includes(p.ownerId)),markerBatches=[];
 for(let i=0;i<markerRest.length;i+=25)markerBatches.push({metafields:markerRest.slice(i,i+25)});
 return {schema:'gravuru-doorbell-entry-release-plan/v1',mode:'offline-dry-run',liveWrites:0,readyForLive:false,shopDomain:SHOP,publicationId:PUBLICATION,snapshotReadAt:snapshot.readAt,
  sourceDigests:{catalog:sha(catalog),snapshot:sha(snapshot),theme:sha(theme)},theme:{id:theme.theme.id,footerMd5:footer.checksumMd5,layoutMd5:layout.checksumMd5,templateChanges:0,themeWrites:0},
  counts:{models:42,products:126,variantsPreserved:15120,createMarkers:setMarkers.length,keepMarkers:126-setMarkers.length,publish:publications.length,keepPublished:126-publications.length},
  requiredBeforeExecution:['Explicit Chris live authorization in the executing chat','Issue 48 C order intake/manufacturing accepted with evidence','Manual desktop/mobile editor acceptance','Fresh native revision/SHA/120 bindings per product recheck via existing doorbell tools','Refresh snapshot/theme and regenerate this plan; detect foreign changes and scheduled publication','Exclusive operator window and per-action journal; no parallel Shopify writes'],
  stages:[{name:'one-product-pilot',productIds:[PILOT],markerRequests:setMarkers.filter(p=>p.ownerId===PILOT).map(p=>({metafields:[p]})),publishRequests:[],gate:'Stop after one product; verify exactly one entry, all options/positions, screenshot, cart and workshop/production path'},
   {name:'pilot-other-formats',productIds:siblingIds,markerRequests:setMarkers.filter(p=>siblingIds.includes(p.ownerId)).map(p=>({metafields:[p]})),publishRequests:publications.filter(p=>siblingIds.includes(p.id)),gate:'Only after first pilot acceptance; verify both additional format pages and return path'},
   {name:'remaining-models',productIds:rows.filter(p=>p.model!==pilot.model).map(p=>p.productId),markerRequests:markerBatches,publishRequests:publications.filter(p=>!siblingIds.includes(p.id)),gate:'Only after pilot formats accepted; serial journaled writes and readback per product'}],
  operations:OPERATIONS,rows,
  rollback:{automatic:false,requiresSuccessfulWriteJournal:true,instructions:['Stop the rollout on any GraphQL error or userErrors; do not retry blindly','Unpublish only products newly published by this run, on the Online Store publication only','Delete only customization_id fields created by this run, after checking journal metafield ID and current value/digest','Never remove pre-existing markers, unpublish previously published products or change product/variant data','Metafield delete and publication APIs have no conditional digest guard: serialize operator access; stop on concurrent changes'],unpublishCandidates:publications,removeMarkerCandidates:setMarkers.map(({ownerId,namespace,key})=>({ownerId,namespace,key}))}};
}

export function parseArgs(argv){
 const allowed=new Set(['--catalog','--snapshot','--theme','--out']),out={};
 for(let i=0;i<argv.length;i+=2){const flag=argv[i],value=argv[i+1];requireThat(allowed.has(flag)&&value&&!value.startsWith('--')&&!out[flag.slice(2)],'Only --catalog --snapshot --theme --out accepted; no apply mode');out[flag.slice(2)]=value;}
 requireThat(Object.keys(out).length===4,'All four file arguments required');return out;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{const args=parseArgs(process.argv.slice(2)),read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
  const plan=prepareDoorbellEntryRelease({catalog:read(args.catalog),snapshot:read(args.snapshot),theme:read(args.theme)});
  fs.writeFileSync(args.out,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({mode:plan.mode,liveWrites:0,readyForLive:false,...plan.counts}));
 }catch(e){console.error(e.message);process.exitCode=1;}
}

