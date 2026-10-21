import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

import {holesFor} from '../../app/platform/sources/app/shared/models/mounting-rules.mjs';

export const API_VERSION='2026-07';
export const CREATE_QUERY='mutation GravuruCodexCreate($input:ProductSetInput!){productSet(synchronous:true,input:$input){product{id handle title status} userErrors{field code message}}}';
export const READ_QUERY='query GravuruCodexRead($query:String!){shop{myshopifyDomain currencyCode} products(first:2,query:$query){nodes{id handle title status descriptionHtml tags seo{title description} metafields(first:20,namespace:"gravuru_codex"){nodes{key value type}} variants(first:100){nodes{id price sku selectedOptions{name value}} pageInfo{hasNextPage endCursor}} media(first:30){nodes{id alt mediaContentType ... on MediaImage{image{url}}} pageInfo{hasNextPage endCursor}}} pageInfo{hasNextPage endCursor}}}';
export const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const cents=v=>Number.isSafeInteger(v)&&v>=0;
const fail=m=>{throw Error(m);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountingChoices(p){
 return [
  {id:'K00',label:'Ohne Bohrung',cents:0,count:0},
  {id:'B02',label:'2 Bohrlöcher ohne Schrauben',cents:p.holes2OnlyCents,count:2},
  {id:'B02S',label:'2 Bohrlöcher mit Schrauben',cents:p.holes2WithScrewsCents,count:2},
  {id:'B04',label:'4 Bohrlöcher ohne Schrauben',cents:p.holes4OnlyCents,count:4},
  {id:'B04S',label:'4 Bohrlöcher mit Schrauben',cents:p.holes4WithScrewsCents,count:4},
  {id:'AH02',label:'2 Abstandshalter, Kopf Ø 12 mm',cents:p.standoffSet2Cents,count:2}
 ];
}
export function accessories(p){
 return [
  {id:'S0',label:'Ohne Ständer',cents:0},
  {id:'SK',label:'Acrylständer klar',cents:p.standClearCents},
  {id:'SS',label:'Acrylständer schwarz',cents:p.standBlackCents},
  {id:'SKSS',label:'Acrylständer klar und schwarz',cents:p.standClearCents+p.standBlackCents}
 ];
}
export function variantMatrix(p,prefix){
 const rows=[];
 for(const m of mountingChoices(p))for(const s of accessories(p))for(const silicone of [false,true]){
  const price=p.baseCents+m.cents+s.cents+(silicone?p.silicone40MlCents:0);
  if(!cents(price))fail('Offener oder ungültiger Variantenpreis.');
  rows.push({key:[m.id,s.id,silicone?'SI40':'SI0'].join('-'),priceCents:price,sku:prefix+'-'+[m.id,s.id,silicone?'SI40':'SI0'].join('-'),holeCount:m.count,
   options:[{optionName:'Befestigung',name:m.label},{optionName:'Ständer',name:s.label},{optionName:'Silikon 40 ml',name:silicone?'Mit Silikon':'Ohne Silikon'}]});
 }
 return rows;
}
export function holes(geometry,count){
 if(count===0)return [];
 if(![2,4].includes(count))fail('Unbekannte Lochzahl.');
 return holesFor({width:geometry.widthMm,height:geometry.heightMm,shape:'rect'}, {layout:count===2?'left-right':'corners',count,diameterMm:geometry.holeDiameterMm,edgeMm:geometry.holeEdgeMm,keepoutMm:geometry.keepoutMm});
}
export function description(product,plan){
 const motif=esc(product.contentOutline.motif);
 return '<h2>Eine persönliche Erinnerung an deinen Hund</h2>'+
 '<p>Ein Foto, der vertraute Name und Worte, die zu eurer gemeinsamen Zeit passen: Diese Hunde-Gedenktafel aus Naturschiefer lässt sich persönlich gestalten. Das Format beträgt 22 × 14 cm; Foto, Schrift und Motive werden hell graviert.</p>'+
 '<h3>Dein Startdesign: '+motif+'</h3><p>'+({
 'Knochenherz':'Ein Herz mit Knochen und Pfote begleitet das Foto und den Namen deines Hundes. Das Motiv verbindet die Erinnerung an gemeinsame Tage mit einem schlichten Zeichen der Verbundenheit.',
 'Rosen':'Zarte Rosen rahmen die Gestaltung. Foto, Name und Lebensdaten erhalten einen ruhigen Platz zwischen den floralen Elementen.',
 'Blüten':'Blüten in den Ecken begleiten den Namen und das Foto deines Hundes. Die klare Aufteilung bietet Raum für einen persönlichen Abschiedsgruß.',
 'Sternschnuppe':'Eine Sternschnuppe aus vielen kleinen Sternen zieht über die Gestaltung. Darunter stehen das Foto und die persönlichen Angaben deines Hundes.',
 'Regenbogen':'Ein Regenbogen über dem Namen begleitet das Foto deines Hundes. Du ergänzt Lebensdaten und die Worte, die du als Erinnerung bewahren möchtest.'
 }[product.contentOutline.motif]||'Du passt die Gestaltung an deine Erinnerung an.')+'</p>'+
 '<p>Das Hauptbild zeigt das Startdesign. In diesem Produkt stehen dir alle '+plan.scope.designCount+' Hunde-Designs dieser Serie zur Auswahl. Du kannst also mit dieser Vorlage beginnen oder im Konfigurator ein anderes Hunde-Design wählen.</p>'+
 '<h3>Foto, Name und persönlicher Text</h3><p>Das erste Foto ist im Grundpreis von 25,99 € enthalten. Weitere Fotos kosten jeweils 8,99 €. Wir stellen dein Foto ohne zusätzlichen Aufpreis frei. Möchtest du den Hintergrund mitgravieren lassen, wählst du „Hintergrund behalten“. Eine gewählte Herz- oder Kreisform bleibt erhalten; innerhalb der Maske kannst du das Foto passend verschieben.</p>'+
 '<p>Texte, Motive und das Foto lassen sich auf der Platte verschieben. Die Bearbeitung kostet nichts zusätzlich. Für jedes zusätzlich hinzugefügte Motiv berechnen wir 1,60 €. Die Motive des gewählten Startdesigns sind enthalten. Der Upload-Hinweis gehört zur Bedienung und wird nicht graviert.</p>'+
 '<h3>Format und Ausführung</h3><ul><li>Naturschiefer, 22 × 14 cm, Stärke 5 mm</li><li>Helle Gravur von Foto, Text und Motiven</li><li>Bei Bohrungen: Ø 5 mm, Lochmitte 19 mm vom Rand</li><li>Alle Hunde-Designs der Serie auswählbar</li></ul>'+
 '<h3>Befestigung und Zubehör kombinieren</h3><p>Du wählst ohne Bohrung, zwei oder vier Bohrlöcher ohne Schrauben, zwei oder vier Bohrlöcher mit Schrauben oder zwei Abstandshalter mit Edelstahlknopf. Zusätzlich lassen sich Acrylständer in Klar oder Schwarz und Silikon 40 ml kombinieren.</p>'+
 '<ul><li>2 Bohrlöcher ohne Schrauben: +2,99 €; mit Schrauben: +3,39 €</li><li>4 Bohrlöcher ohne Schrauben: +3,99 €; mit Schrauben: +4,49 €</li><li>2 Abstandshalter: +5,99 €</li><li>Acrylständer klar: +11,99 €; schwarz: +13,99 €</li><li>Silikon 40 ml: +5,99 €</li></ul>'+
 '<h3>Mengenstaffel</h3><p>Ab zwei Stück gelten 6 % Mengenrabatt, ab drei Stück 10 %. Verschiedene Hunde-Designs können kombiniert werden.</p>'+
 '<h3>Lieferumfang</h3><p>Eine personalisierte Schiefer-Gedenktafel mit dem gewählten Design, dem ersten Foto und deinen Texten. Zubehör ist entsprechend deiner Auswahl enthalten.</p>';
}
export function buildBatch(plan,{mediaByProduct={},runId='codex-gt22x14-dogs-20261020'}={}){
 if(plan.scope.productCount!==5||plan.products.length!==5)fail('Genau fünf Produkte erforderlich.');
 if(plan.scope.animal!=='dog'||plan.scope.designCount!==16)fail('Nur die geprüfte Hunde-Serie verwenden.');
 for(const [k,v]of Object.entries(plan.prices))if(!cents(v))fail('Preis offen: '+k);
 if(plan.geometry.holeEdgeMm!==19)fail('19 mm Loch-Randabstand erforderlich.');
 const gallery=plan.products[0].designIds;
 if(new Set(gallery).size!==16||gallery.some(x=>/D(200|216|217|218|223|227|229|234|235)$/.test(x)))fail('Gesperrtes Design oder falsche Tierart in der Galerie.');
 const used=new Set();
 return plan.products.map((p,index)=>{
  if(JSON.stringify(p.designIds)!==JSON.stringify(gallery)||!gallery.includes(p.defaultDesignId)||used.has(p.id))fail('Galerie oder Produktkennung prüfen.');
  used.add(p.id);
  if(!p.seo.title.trim()||p.seo.title.length>70||!p.seo.description.trim()||p.seo.description.length>170)fail('SEO unvollständig: '+p.id);
  const identity=runId+':'+p.id;
  const handle=p.seo.handle+'-codex-test';
  if(!/^[a-z0-9-]+$/.test(handle))fail('URL ungültig.');
  const variants=variantMatrix(plan.prices,'GT-S-22x14-CX0'+(index+1));
  const images=mediaByProduct[p.id]||[];
  if(images.some(x=>!x.id||!x.alt?.trim()))fail('Bild-ID oder Alt-Text fehlt.');
  const config={schema:'gravuru-codex-draft-config/v1',lineId:'gedenktafeln-22x14-hunde',identity,
   geometry:plan.geometry,holePatterns:{2:holes(plan.geometry,2),4:holes(plan.geometry,4)},
   designIds:gallery,startDesign:p.defaultDesignId,prices:plan.prices,quantityTiers:[{minQuantity:2,percentOff:6},{minQuantity:3,percentOff:10}],
   photo:{includedCount:1,extraPriceCents:899,backgroundRemovalDefault:true,customerCanKeepBackground:true,preserveShape:true,panInsideMask:true,uploadHintInProduction:false},
   extraMotifCents:160,allElementsMovable:true,publicationReady:false};
  const sourceSha256=sha({product:p,config,variants,images});
  const metafields=[
   {namespace:'gravuru_codex',key:'identity',type:'single_line_text_field',value:identity},
   {namespace:'gravuru_codex',key:'source_sha256',type:'single_line_text_field',value:sourceSha256},
   {namespace:'gravuru_codex',key:'configuration',type:'json',value:JSON.stringify(config)},
   {namespace:'gravuru_codex',key:'design_ids',type:'json',value:JSON.stringify(gallery)},
   {namespace:'gravuru_codex',key:'start_design',type:'single_line_text_field',value:p.defaultDesignId},
   {namespace:'gravuru_codex',key:'release_state',type:'single_line_text_field',value:'draft-review; runtime-and-cart-acceptance-pending'}
  ];
  const input={title:p.title,handle,status:'DRAFT',vendor:'gravuru GmbH',productType:'Hunde-Gedenktafel',descriptionHtml:description(p,plan),
   seo:{title:p.seo.title,description:p.seo.description},tags:['codex-vergleich-20261020','gravuru-2027','konfi-neu','Schiefer','Mit Foto','zielgruppe:hund',runId],
   productOptions:[{name:'Befestigung',position:1,values:mountingChoices(plan.prices).map(x=>({name:x.label}))},{name:'Ständer',position:2,values:accessories(plan.prices).map(x=>({name:x.label}))},{name:'Silikon 40 ml',position:3,values:[{name:'Ohne Silikon'},{name:'Mit Silikon'}]}],
   variants:variants.map((v,i)=>({price:(v.priceCents/100).toFixed(2),sku:v.sku,position:i+1,optionValues:v.options,inventoryItem:{tracked:false,requiresShipping:true}})),metafields,
   ...(images.length?{files:images.map(x=>({id:x.id,alt:x.alt}))}:{})};
  return {id:p.id,identity,handle,sourceSha256,requestSha256:sha(input),variantCount:variants.length,input,variants,configuration:config,images};
 });
}
export function verifyRead(record,expected){
 if(!record||record.status!=='DRAFT'||record.handle!==expected.handle||record.title!==expected.input.title||record.descriptionHtml.replace(/>\s+</g,'><')!==expected.input.descriptionHtml.replace(/>\s+</g,'><')||record.seo?.title!==expected.input.seo.title||record.seo?.description!==expected.input.seo.description)fail('Produktinhalt oder DRAFT-Status stimmt nicht.');
 if(!expected.input.tags.every(t=>record.tags.includes(t)))fail('Quell-Tags fehlen.');
 const mf=new Map(record.metafields.nodes.map(x=>[x.key,x.value]));
 for(const m of expected.input.metafields)if(mf.get(m.key)!==m.value)fail('Metafeld stimmt nicht: '+m.key);
 if(record.variants.pageInfo.hasNextPage||record.variants.nodes.length!==expected.variants.length)fail('Varianten fehlen.');
 const expectedBySku=new Map(expected.variants.map(v=>[v.sku,v]));
 for(const v of record.variants.nodes){
  const ex=expectedBySku.get(v.sku);if(!ex||Math.round(Number(v.price)*100)!==ex.priceCents||JSON.stringify([...v.selectedOptions].sort((a,b)=>a.name.localeCompare(b.name)))!==JSON.stringify(ex.options.map(x=>({name:x.optionName,value:x.name})).sort((a,b)=>a.name.localeCompare(b.name))))fail('Variante oder Preis falsch.');
  expectedBySku.delete(v.sku);
 }
 if(expectedBySku.size)fail('Doppelte oder fehlende Variante.');
 if(record.media.pageInfo.hasNextPage||record.media.nodes.length<expected.images.length)fail('Medien unvollständig.');
 if(expected.images.length&&record.media.nodes[0]?.id!==expected.images[0].id)fail('Hauptbild stimmt nicht.');
 for(const image of expected.images)if(!record.media.nodes.some(x=>x.id===image.id&&x.alt===image.alt&&x.image?.url))fail('Bild oder Alt-Text nicht bestätigt.');
 return {id:record.id,handle:record.handle,status:'DRAFT',variants:record.variants.nodes.length,images:expected.images.length,sourceSha256:expected.sourceSha256};
}
export async function applyBatch(batch,{transport,journalDir,shopDomain}){
 if(!/^[a-z0-9-]+\.myshopify\.com$/.test(shopDomain))fail('Shop-Domain fehlt.');
 await fs.mkdir(journalDir,{recursive:true});
 const lock=path.join(journalDir,'writer.lock');let lockHandle;
 try{lockHandle=await fs.open(lock,'wx');}catch{fail('Ein anderer Import läuft oder sein Sperrstand muss geprüft werden.');}
 try{
  const results=[];
  for(const p of batch){
   if(p.images.length<1)fail(p.id+': Hauptbild fehlt.');
   const file=path.join(journalDir,p.id+'.json');
   let old;try{old=JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
   if(old&&old.sourceSha256!==p.sourceSha256)fail(p.id+': geänderter Quellstand; vorhandenen Entwurf gesondert prüfen.');
   const lookup=await transport(READ_QUERY,{query:'handle:'+p.handle});
   if(lookup.shop.myshopifyDomain!==shopDomain||lookup.shop.currencyCode!=='EUR'||lookup.products.pageInfo.hasNextPage||lookup.products.nodes.length>1)fail('Shop oder Suchergebnis nicht eindeutig.');
   let record=lookup.products.nodes[0];
   if(!record){
    if(old)fail(p.id+': frühere Anfrage unbestätigt; keine automatische zweite Anlage.');
    await atomic(file,{state:'started',sourceSha256:p.sourceSha256,handle:p.handle,at:new Date().toISOString()});
    try{
     const result=await transport(CREATE_QUERY,{input:p.input});
     if(result.productSet?.userErrors?.length||!result.productSet?.product?.id)fail('Shopify hat die Anlage nicht bestätigt.');
    }catch(e){await atomic(file,{state:'unknown',sourceSha256:p.sourceSha256,handle:p.handle});throw e;}
    const read=await transport(READ_QUERY,{query:'handle:'+p.handle});record=read.products.nodes[0];
   }
   const result=verifyRead(record,p);await atomic(file,{state:'completed',...result});results.push(result);
  }
  return results;
 }finally{await lockHandle?.close();await fs.unlink(lock);}
}
async function atomic(file,value){const temp=file+'.new';await fs.writeFile(temp,JSON.stringify(value,null,2));await fs.rename(temp,file);}
export function apiTransport({shopDomain,accessToken,fetchImpl=fetch}){
 if(!/^[a-z0-9-]+\.myshopify\.com$/.test(shopDomain)||!accessToken)fail('Authentifizierte Shop-Verbindung fehlt.');
 return async(query,variables)=>{
  const response=await fetchImpl('https://'+shopDomain+'/admin/api/'+API_VERSION+'/graphql.json',{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{'Content-Type':'application/json','X-Shopify-Access-Token':accessToken},body:JSON.stringify({query,variables})});
  if(!response.ok)fail('Shopify-Anfrage unbestätigt: HTTP '+response.status);
  const data=await response.json();if(data.errors?.length||!data.data)fail('Shopify-Antwort enthält Fehler.');return data.data;
 };
}
async function main(){
 const args=process.argv.slice(2),value=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
 const planFile=value('--plan');if(!planFile)fail('Aufruf: node serienimport.mjs --plan Produktplan.json [--media Medien.json] --out Importpaket.json [--commit --shop shop.myshopify.com]');
 const plan=JSON.parse(await fs.readFile(planFile,'utf8')),mediaFile=value('--media'),media=mediaFile?JSON.parse(await fs.readFile(mediaFile,'utf8')):{};
 const batch=buildBatch(plan,{mediaByProduct:media});const out=value('--out')||'Importpaket.json';await fs.writeFile(out,JSON.stringify({schema:'gravuru-codex-shopify-batch/v1',batch},null,2));
 if(args.includes('--commit')){
  const shopDomain=value('--shop'),accessToken=process.env.GRAVURU_SHOPIFY_ACCESS_TOKEN;
  const result=await applyBatch(batch,{transport:apiTransport({shopDomain,accessToken}),journalDir:path.resolve(value('--journal')||'.import-journal'),shopDomain});
  console.log(JSON.stringify({written:result.length,status:'DRAFT',products:result}));
 }else console.log(JSON.stringify({dryRun:true,products:batch.length,variants:batch.map(x=>x.variantCount),images:batch.map(x=>x.images.length),out}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
