// Read-only preparation of the approved 42-model × 3-format Shopify migration.
// Never calls Shopify. Source IDs/options/prices are verified against the source archive.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const sha=b=>createHash('sha256').update(b).digest('hex');
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const json=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rich=paragraphs=>JSON.stringify({type:'root',children:paragraphs.map(value=>({type:'paragraph',children:[{type:'text',value}]}))});
const colors={schwarz:'Schwarz',anthrazit:'Anthrazit'};
const formats={'16x28':{label:'Hochformat',size:'16 × 28 cm',compact:'16×28 cm',base:4999},'24x20':{label:'Querformat',size:'24 × 20 cm',compact:'24×20 cm',base:5999},'35x18':{label:'Länglich',size:'35 × 18 cm',compact:'35×18 cm',base:6999}};
const frames=['FK-RUNDUM','FK-VERDECKT','FK-SEITLICH','FK-OBENUNTEN'],mounts=['K00','GWS','KRA','SIL','B04S'];
const surcharge={K00:0,GWS:599,KRA:499,SIL:499,B04S:369};
const brandHandles={AOSU:'klingelschilder-aosu',Aqara:'klingelschilder-aqara',Arlo:'arlo',Blink:'klingelschilder-blink',Boifun:'klingelschilder-boifun',Cococam:'klingelschilder-cococam',Ctronics:'klingelschilder-ctronics',Eufy:'eufy',EZVIZ:'klingelschilder-ezviz','Google Nest':'klingelschilder-google-nest',Hombli:'klingelschilder-hombli',Philips:'klingelschilder-philips',Reolink:'reolink',Ring:'ring',Tapo:'klingelschilder-tapo',Tmezon:'klingelschilder-tmezon',Winees:'klingelschilder-winees',WP:'klingelschilder-wp'};
export const OPERATIONS={
 create:'mutation DoorbellProductCreate($product:ProductCreateInput!,$media:[CreateMediaInput!]){productCreate(product:$product,media:$media){product{id handle} userErrors{field message}}}',
 update:'mutation DoorbellProductUpdate($product:ProductUpdateInput!,$media:[CreateMediaInput!]){productUpdate(product:$product,media:$media){product{id handle} userErrors{field message}}}',
 variants:'mutation DoorbellVariantCreate($productId:ID!,$variants:[ProductVariantsBulkInput!]!){productVariantsBulkCreate(productId:$productId,variants:$variants,strategy:REMOVE_STANDALONE_VARIANT){productVariants{id sku price selectedOptions{name value}} userErrors{field message}}}',
 reorder:'mutation DoorbellVariantOrder($productId:ID!,$positions:[ProductVariantPositionInput!]!){productVariantsBulkReorder(productId:$productId,positions:$positions){product{id} userErrors{field message}}}'
};
function copy(entry,brandCollection){
 const f=formats[entry.formatKey],m=entry.modelLabel,color=colors[entry.defaults.color],position=entry.formatKey==='16x28'?'oben oder unten':'links oder rechts';
 const lead=entry.formatKey==='16x28'?`Das Hochformat ${f.size} verbindet deine ${m} mit einer persönlichen Beschriftung über der Klingel. Für eine andere Aufteilung kannst du die Klingel im Konfigurator auch oben platzieren.`:entry.formatKey==='24x20'?`Im Querformat ${f.size} stehen deine ${m} und die persönliche Beschriftung nebeneinander. Wähle im Konfigurator, ob die Klingel links oder rechts sitzen soll.`:`Das längliche Schild ${f.size} bietet eine breite Fläche für Namen, Hausnummer und ein Motiv neben deiner ${m}. Die Klingel lässt sich im Konfigurator links oder rechts anordnen.`;
 const subtitle=`${f.label} ${f.size} für ${m}. Startfarbe ${color}; Format, Farbe, Rahmen, Befestigung und Klingelposition bleiben im Konfigurator wählbar.`;
 const title=`Klingelschild für ${m} · ${f.label} ${f.size}`;
 const seoTitle=`Klingelschild ${m} · ${f.compact}`;
 const seoDescription=`Klingelschild für ${m}: ${f.label} ${f.compact}, Acrylglas auf Edelstahl. Name, Hausnummer und Position gestalten. Ohne Klingel.`;
 const descriptionHtml=`<div class="gravuru-doorbell-description">
<p>${esc(lead)} Gezeigt ist die Ausführung in ${esc(color)}. Dein Schild gestaltest du direkt in der Vorschau.</p>
<h2>Passend für ${esc(m)}</h2>
<p>Die Geräteaufnahme und Montageausschnitte sind diesem Modell zugeordnet. Wähle die Klingelposition ${position}; die Klingel bleibt aufrecht, und die Ausschnitte sowie Montagelöcher passen zur gewählten Anordnung. Prüfe vor der Bestellung die vollständige Modellbezeichnung deiner Klingel.</p>
<h2>Name, Hausnummer und Motive selbst gestalten</h2>
<p>Wähle aus 16 Designvorlagen, 30 Schriften und einer Motivbibliothek. Du kannst Texte bearbeiten sowie Texte und Motive verschieben, skalieren und drehen. Deine Gestaltung siehst du unmittelbar auf dem Schild und kannst sie als PNG-Vorschau herunterladen.</p>
<h2>Alle Ausführungen bleiben wählbar</h2>
<p>Der Konfigurator startet mit ${esc(f.size)} in ${esc(color)}. Du kannst weiterhin zwischen Hochformat 16 × 28 cm, Querformat 24 × 20 cm und länglich 35 × 18 cm wechseln. Schwarz und Anthrazit, vier Edelstahlrahmen und fünf Befestigungsarten stehen bei jedem Format zur Verfügung.</p>
<table><tbody>
<tr><th>Kompatibilität</th><td>${esc(m)}</td></tr>
<tr><th>Gezeigtes Format</th><td>${esc(f.label)} · ${esc(f.size)}</td></tr>
<tr><th>Material</th><td>3 mm Acrylglas auf einer 1,5 mm Edelstahlgrundplatte</td></tr>
<tr><th>Acrylfarben</th><td>Schwarz oder Anthrazit</td></tr>
<tr><th>Rahmenformen</th><td>Umlaufend, links und rechts, oben und unten oder ohne sichtbaren Edelstahlrahmen</td></tr>
<tr><th>Befestigung</th><td>Keine Befestigung, verdeckte Bolzen, selbstklebend für raue Flächen, Silikon oder Bohrlöcher mit Schrauben</td></tr>
</tbody></table>
<h3>Größen und Preise</h3>
<p>16 × 28 cm ab 49,99 €, 24 × 20 cm ab 59,99 € und 35 × 18 cm ab 69,99 €. Befestigungszuschläge: verdeckte Bolzen 5,99 €, selbstklebend für raue Flächen 4,99 €, Silikon 4,99 € oder Bohrlöcher mit Schrauben 3,69 €. Der Gesamtpreis folgt deiner Auswahl im Konfigurator.</p>
<details><summary>Ist die Klingel enthalten?</summary><p>Nein. Du erhältst das personalisierte Schild mit der gewählten Befestigung. Klingel, Originalhalterung und Original-Montagezubehör sind nicht enthalten. Die Geräteabbildung zeigt die Kompatibilität.</p></details>
<details><summary>Kann ich Format und Klingelposition ändern?</summary><p>Ja. Alle drei Formate und beide Anordnungen bleiben verfügbar: im Hochformat oben oder unten, in den beiden breiten Formaten links oder rechts.</p></details>
<details><summary>Kann ich ein anderes Klingelmodell auswählen?</summary><p>Diese Gestaltung gehört ausschließlich zu ${esc(m)}. Für andere Modelle öffne die passende Produktseite unter <a href="/collections/${esc(brandCollection.handle)}">Klingelschilder für ${esc(entry.brand)}</a>.</p></details>
</div>`;
 return {title,subtitle,seo:{title:seoTitle,description:seoDescription},descriptionHtml};
}
function meta(entry,c){
 const s=formats[entry.formatKey].size;
 return [
 ['untertitel','single_line_text_field',c.subtitle],
 ['kompatibilitaet','single_line_text_field',entry.modelLabel],
 ['material','single_line_text_field','Acrylglas / Edelstahl'],
 ['grose_filter','single_line_text_field','16 × 28 cm / 24 × 20 cm / 35 × 18 cm'],
 ['filter_gravur_druck','single_line_text_field','Gravur'],
 ['stichpunkt_1','single_line_text_field',`3 mm Acrylglas auf 1,5 mm Edelstahl · Startformat ${s}`],
 ['stichpunkt_2','single_line_text_field','Drei Formate · zwei Farben · vier Rahmen · Klingelposition wählbar'],
 ['stichpunkt_3','single_line_text_field',`Passend für ${entry.modelLabel} · Lieferung ohne Klingel`],
 ['seo_text','rich_text_field',rich([c.title,c.subtitle,'Gestalte Namen, Hausnummer und Motive. Drei Formate, zwei Acrylfarben, vier Rahmenformen und fünf Befestigungsarten bleiben im Konfigurator wählbar. Lieferung ohne Klingel, deren Originalhalterung und Original-Montagezubehör.'])],
 ['material_zusammensetzung','rich_text_field',rich(['Grundplatte aus 1,5 mm Edelstahl, Front aus 3 mm Acrylglas in Schwarz oder Anthrazit. Verfügbare Gesamtformate: 160 × 280, 240 × 200 und 350 × 180 mm.','Die Acrylfront richtet sich nach der Rahmenwahl: umlaufender Edelstahlrand, Edelstahl links und rechts, Edelstahl oben und unten oder eine durchgehende Acrylfront ohne sichtbaren Rahmen. Geräteaufnahme und Montageausschnitte sind modellbezogen.'])]
 ].map(([key,type,value])=>({namespace:'custom',key,type,value}));
}
export async function prepareDoorbellShopify({stage,source,images,out,skuMax=5041}){
 assert(Number.isSafeInteger(skuMax)&&skuMax>=5041,'Invalid SKU high-water mark.');
 const [catalog,snapshot,im]=await Promise.all([json(path.join(stage,'main-products-126.json')),json(source),json(images)]);
 assert(catalog.entries?.length===126&&snapshot.products?.length===42,'Expected 126 targets and42 source products.');
 assert(snapshot.customizationDefinition?.type?.name==='single_line_text_field','Unexpected customization_id type.');
 const sources=new Map(snapshot.products.map(p=>[p.id,p])),imageIndex=new Map(im.entries.map(i=>[i.key,i]));
 const sourceSkus=new Set(),variantIds=new Set();for(const p of snapshot.products){assert(!p.variants.pageInfo.hasNextPage&&p.variants.nodes.length===120,p.id+': incomplete variants');for(const v of p.variants.nodes){assert(!sourceSkus.has(v.sku)&&!variantIds.has(v.id),'Duplicate source SKU or variant');sourceSkus.add(v.sku);variantIds.add(v.id);}}
 let sequence=skuMax;const entries=[],collections=new Map();const newSkus=new Set();
 for(const entry of catalog.entries){
  const sourceProduct=sources.get(entry.sourceProductId);assert(sourceProduct,'Source product absent: '+entry.key);
  assert(!sourceProduct.collections.pageInfo.hasNextPage,'Collection list incomplete.');
  const brandCollection=sourceProduct.collections.nodes.find(c=>c.handle===brandHandles[entry.brand]);assert(brandCollection,'Brand collection missing: '+entry.brand);collections.set(entry.brand,brandCollection);
  const matrix=await json(path.join(stage,entry.variantMatrixRef)),byId=new Map(sourceProduct.variants.nodes.map(v=>[v.id.split('/').at(-1),v]));
  assert(matrix.variants.length===120,'Bad source matrix');
  const originals=matrix.variants.map(v=>{const live=byId.get(v.existingVariantId);assert(live&&live.sku===v.existingSku,entry.key+': source variant mismatch');assert(Math.round(Number(live.price)*100)===v.priceCents&&v.priceCents===formats[v.formatKey].base+surcharge[v.mounting],entry.key+': price mismatch');return {...v,live};});
  const formatOrder=[entry.formatKey,...Object.keys(formats).filter(f=>f!==entry.formatKey)],colorOrder=[entry.defaults.color,...Object.keys(colors).filter(c=>c!==entry.defaults.color)];
  const sorted=originals.slice().sort((a,b)=>formatOrder.indexOf(a.formatKey)-formatOrder.indexOf(b.formatKey)||colorOrder.indexOf(a.color)-colorOrder.indexOf(b.color)||frames.indexOf(a.frame)-frames.indexOf(b.frame)||mounts.indexOf(a.mounting)-mounts.indexOf(b.mounting));
  assert(sorted[0].formatKey===entry.defaults.format&&sorted[0].color===entry.defaults.color&&sorted[0].frame===entry.defaults.frame&&sorted[0].mounting===entry.defaults.mounting,'Invalid start variant');
  const c=copy(entry,brandCollection),metafields=meta(entry,c),isNew=entry.operation==='create-new';
  const product={title:c.title,descriptionHtml:c.descriptionHtml,handle:entry.handle,status:'ACTIVE',vendor:sourceProduct.vendor,productType:sourceProduct.productType,seo:c.seo,templateSuffix:'funkklingeln-2027',tags:[...new Set([...sourceProduct.tags.filter(t=>t!=='FK26-Modell'), 'FK27-Modell','FK27-126',entry.formatKey,formats[entry.formatKey].label])],collectionsToJoin:sourceProduct.collections.nodes.map(x=>x.id),metafields};
  if(isNew)product.productOptions=sourceProduct.options.slice().sort((a,b)=>a.position-b.position).map(o=>({name:o.name,position:o.position,values:[...new Set(sorted.map(v=>v.live.selectedOptions.find(x=>x.name===o.name)?.value))].map(name=>{assert(typeof name==='string','Option missing');return {name};})}));else product.id=sourceProduct.id;
  const variants=sorted.map((v,i)=>{
   const sku=isNew?`FK-AV2A-${v.formatKey}-${String(++sequence).padStart(4,'0')}`:v.existingSku;
   if(isNew){assert(!sourceSkus.has(sku)&&!newSkus.has(sku),'SKU collision');newSkus.add(sku);}
   return {sku,priceCents:v.priceCents,options:{format:v.formatKey,frame:v.frame,color:v.color,mounting:v.mounting},selectedOptions:v.live.selectedOptions,
    shopifyVariantId:isNew?null:v.live.id,
    createInput:isNew?{price:(v.priceCents/100).toFixed(2),taxable:v.live.taxable,inventoryPolicy:v.live.inventoryPolicy,inventoryItem:{sku,tracked:v.live.inventoryItem.tracked,requiresShipping:v.live.inventoryItem.requiresShipping},optionValues:v.live.selectedOptions.map(o=>({optionName:o.name,name:o.value}))}:null};
  });
  const image=imageIndex.get(entry.key);assert(image?.webp&&image.webpSha256,'Rendered image missing: '+entry.key);
  const primaryFile=path.resolve(path.dirname(images),image.webp),imageBytes=await fs.readFile(primaryFile);assert(sha(imageBytes)===image.webpSha256,'Image hash mismatch');
  const alt=`Personalisiertes Klingelschild für ${entry.modelLabel}, ${formats[entry.formatKey].label} ${formats[entry.formatKey].size}, ${colors[entry.defaults.color]} auf Edelstahl – Lieferung ohne Klingel`;
  const supportingMedia=sourceProduct.media.nodes.filter(m=>m.mediaContentType==='IMAGE'&&m.image?.url&&/action|anthrazit|rahmen/.test(m.image.url)).map(m=>({mediaContentType:'IMAGE',originalSource:m.image.url,alt:`Gestaltungsbeispiel im Hochformat 16 × 28 cm: ${m.alt}`}));
  entries.push({key:entry.key,modelKey:entry.modelKey,modelLabel:entry.modelLabel,brand:entry.brand,formatKey:entry.formatKey,operation:entry.operation,sourceProductId:entry.sourceProductId,shopifyProductId:isNew?null:sourceProduct.id,defaults:entry.defaults,
   productInput:product,variants,firstVariant:{sku:variants[0].sku,shopifyVariantId:variants[0].shopifyVariantId,options:variants[0].options},
   reorderExisting:isNew?null:{productId:sourceProduct.id,positions:[{id:variants[0].shopifyVariantId,position:1}]},
   primaryMedia:{localFile:primaryFile,sha256:image.webpSha256,bytes:imageBytes.length,alt,mediaContentType:'IMAGE',originalSource:null},
   supportingMedia:isNew?supportingMedia:[],
   activateAfterBinding:{metafield:{namespace:'custom',key:'customization_id',type:'single_line_text_field'},valueFrom:'verified-server-import.entry.id',requiredPattern:'^cfg_[A-Za-z0-9_-]+$',requires:'120 exact live-verified variant bindings and the persisted revision-bound approval'},
   publishAfterVerification:{publicationId:'gid://shopify/Publication/291556688252',required:isNew},
   sourceReadAt:snapshot.readAt});
 }
 const plan={schema:'gravuru-doorbell-shopify-plan/v1',createdAt:new Date().toISOString(),shopDomain:snapshot.shopDomain,mode:'dry-run',externalMutations:0,skuReservation:false,skuHighWaterMark:skuMax,newSkuRange:{first:skuMax+1,last:sequence,count:newSkus.size},counts:{models:42,products:126,existing:42,new:84,variantsPerProduct:120,totalBindings:15120,newVariants:10080,brands:collections.size,black:entries.filter(e=>e.defaults.color==='schwarz').length,anthracite:entries.filter(e=>e.defaults.color==='anthrazit').length},collections:[...collections].map(([brand,c])=>({brand,...c})),blockers:['Upload and verify126 primary images; substitute their returned CDN URLs','Recheck shop-wide SKU high-water mark before reserving/creating variants','Import126 native products on the server; obtain real cfg_ IDs and revisions','Verify120 registry bindings per product and persist user-authorized live approval before enabling the native button','Finish the separate funkklingeln-2027 template and verify the customer cart path'],operations:OPERATIONS,entries};
 assert(plan.counts.black===63&&plan.counts.anthracite===63&&plan.counts.brands===18&&newSkus.size===10080,'Incomplete counts');
 await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'shopify-plan-126.json'),JSON.stringify(plan,null,2)+'\n');
 for(const e of entries){await fs.writeFile(path.join(out,e.key+'.json'),JSON.stringify(e,null,2)+'\n');}
 await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({...plan,operations:undefined,entries:undefined},null,2)+'\n');
 return plan;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const args={};for(let i=2;i<process.argv.length;i+=2){assert(process.argv[i].startsWith('--')&&process.argv[i+1],'Expected --name value');args[process.argv[i].slice(2)]=process.argv[i+1];}
 const plan=await prepareDoorbellShopify({stage:args.stage,source:args.source,images:args.images,out:args.out,skuMax:Number(args['sku-max']||5041)});console.log(JSON.stringify({counts:plan.counts,newSkuRange:plan.newSkuRange,mutations:0}));
}
