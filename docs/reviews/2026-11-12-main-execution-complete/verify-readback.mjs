import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
const root=import.meta.dirname;
const sha=b=>createHash('sha256').update(b).digest('hex');
const mappingFile=process.argv[2];
const output=process.argv[3];
if(!mappingFile||!output)throw Error('Usage: node verify-readback.mjs /ABS/variant-mapping.preview.json.gz /ABS/NEW-checks.json');
const compressed=fs.readFileSync(mappingFile),raw=gunzipSync(compressed,{maxOutputLength:4*1024*1024});
if(sha(compressed)!=='3d0647b2cb671ba09199b6f9c4b9cdbfa58f24a0eafb1d2d672a18823070c9bf'||sha(raw)!=='3d476d9d964158c1f96a9e55b5de5a2cfa36afd8b5d3bcd86313c12be2c77591')throw Error('Pinned mapping differs');
const mapping=JSON.parse(raw),receiptBytes=fs.readFileSync(path.join(root,'connector-pages.json')),receipt=JSON.parse(receiptBytes),productBytes=fs.readFileSync(path.join(root,'product-tool.json')),productTool=JSON.parse(productBytes).product;
const expectedId='gid://shopify/Product/16190784602492';
const expectedMedia=['gid://shopify/MediaImage/70116579869052','gid://shopify/MediaImage/70017733919100'];
const expectedAlias='katalog-formate-acryl-tuerschilder-familienschilder-eb5fe26624befe4a';
const cents=value=>{if(typeof value!=='string'||!/^\d+\.\d{2}$/.test(value))throw Error('Invalid decimal money');return Number(value.replace('.',''));};
const pages=receipt.pages,rows=pages.flatMap(p=>p.response.data.product.variants.nodes),byId=new Map(rows.map(r=>[r.id,r]));
const checks=[];
const check=(name,pass,details)=>checks.push({name,pass,...(details===undefined?{}:{details})});
check('seventeen_complete_pages',pages.length===17&&equal(pages.map(p=>p.response.data.product.variants.nodes.length),[...Array(16).fill(50),8]));
check('808_unique_ids',rows.length===808&&byId.size===808);
check('pagination_chain',pages.every((p,i)=>p.inputAfter===(i===0?null:pages[i-1].response.data.product.variants.pageInfo.endCursor)&&p.response.data.product.variants.pageInfo.hasNextPage===(i<pages.length-1))&&new Set(pages.map(p=>p.inputAfter)).size===17);
check('shop_currency_and_product',pages.every(p=>p.response.data.shop.myshopifyDomain==='gravuru-design.myshopify.com'&&p.response.data.shop.currencyCode==='EUR'&&p.response.data.product.id===expectedId));
const fixedProduct=p=>{const {variants,...fixed}=p.response.data.product;return fixed;};
check('stable_product_across_all_pages',pages.every(p=>equal(fixedProduct(p),fixedProduct(pages[0]))),{updatedAt:pages[0].response.data.product.updatedAt});
check('draft_and_konfi',pages.every(p=>p.response.data.product.status==='DRAFT'&&p.response.data.product.templateSuffix==='konfi'));
check('h1_and_all_media_preserved',pages.every(p=>p.response.data.product.featuredMedia?.id===expectedMedia[0]&&!p.response.data.product.media.pageInfo.hasNextPage&&equal(p.response.data.product.media.nodes.map(m=>m.id),expectedMedia)));
check('historical_custom_alias_preserved',pages.every(p=>p.response.data.product.customization?.value===expectedAlias));
check('dedicated_product_tool_agrees',productTool.id===expectedId&&productTool.currencyCode==='EUR'&&productTool.status==='DRAFT'&&productTool.totalVariants===808&&equal(productTool.images.map(m=>m.mediaId),expectedMedia)&&productTool.featuredImageUrl===productTool.images[0].url);
const expectedIds=[...mapping.matches.map(r=>r.shopifyVariantId),...mapping.residualVariants.map(r=>r.id)].sort();
check('exact_original_808_id_set',equal([...byId.keys()].sort(),expectedIds));
const deltas=[],differences=[];
let targetsPassed=0,residualPassed=0,skuPassed=0,pricePassed=0,optionsPassed=0;
for(const expected of mapping.matches){
 const actual=byId.get(expected.shopifyVariantId);
 if(!actual){differences.push({id:expected.shopifyVariantId,error:'missing'});continue;}
 const price=cents(actual.price)===expected.targetUnitCents,options=equal(actual.selectedOptions,expected.proposedSelectedOptions),sku=actual.sku===expected.sku;
 if(price)pricePassed++;if(options)optionsPassed++;if(sku)skuPassed++;if(price&&options&&sku)targetsPassed++;
 if(!price||!options||!sku)differences.push({id:actual.id,price,options,sku});
 const priceChanged=cents(actual.price)!==expected.currentShopUnitCents,labelsChanged=!equal(actual.selectedOptions,expected.currentShopSelectedOptions);
 if(priceChanged||labelsChanged)deltas.push({id:actual.id,sku:actual.sku,priceChanged,labelsChanged,beforeCents:expected.currentShopUnitCents,afterCents:cents(actual.price),deltaCents:cents(actual.price)-expected.currentShopUnitCents,...(labelsChanged?{beforeOptions:expected.currentShopSelectedOptions,afterOptions:actual.selectedOptions}:{})});
}
for(const expected of mapping.residualVariants){
 const actual=byId.get(expected.id);
 if(!actual){differences.push({id:expected.id,error:'missing-residual'});continue;}
 const price=cents(actual.price)===cents(expected.price),options=equal(actual.selectedOptions,expected.selectedOptions),sku=actual.sku===expected.sku;
 if(price)pricePassed++;if(options)optionsPassed++;if(sku)skuPassed++;if(price&&options&&sku)residualPassed++;
 if(!price||!options||!sku)differences.push({id:actual.id,price,options,sku,residual:true});
}
check('778_target_rows_exact',targetsPassed===778,{matched:targetsPassed});
check('30_residual_rows_unchanged',residualPassed===30,{matched:residualPassed});
check('all_prices_options_skus_exact',pricePassed===808&&optionsPassed===808&&skuPassed===808,{prices:pricePassed,options:optionsPassed,skus:skuPassed});
const priceDeltas=deltas.filter(d=>d.priceChanged),labelDeltas=deltas.filter(d=>d.labelsChanged),overlap=deltas.filter(d=>d.priceChanged&&d.labelsChanged);
check('158_price_30_label_182_unique_deltas',priceDeltas.length===158&&labelDeltas.length===30&&deltas.length===182&&overlap.length===6,{prices:priceDeltas.length,labels:labelDeltas.length,unique:deltas.length,overlap:overlap.length});
const b02=priceDeltas.filter(d=>d.sku.endsWith('-B02S')&&d.deltaCents===-30),b04=priceDeltas.filter(d=>d.sku.endsWith('-B04S')&&d.deltaCents===-10);
check('138_B02S_minus30_and20_B04S_minus10',b02.length===138&&b04.length===20&&b02.length+b04.length===priceDeltas.length);
check('zero_variant_differences',differences.length===0);
const result={schema:'issue230-main-final-independent-shop-readback/v1',source:'Actual Shopify connector read; no writes',allPassed:checks.every(c=>c.pass),checks,scope:{productId:expectedId,variants:rows.length,shopifyReads:18,graphqlPages:17,maxPageSize:50,mutations:0,nativeTablesRead:false,priceMetafieldRead:false},timestamps:{firstPageRecordedAfterResponse:pages[0].receivedRecordedAt,firstTimedRequest:pages[1].requestedAt,finalResponse:pages.at(-1).receivedAt,stableProductUpdatedAt:pages[0].response.data.product.updatedAt},sourcePins:{connectorPagesSha256:sha(receiptBytes),productToolSha256:sha(productBytes),mappingGzipSha256:sha(compressed),mappingJsonSha256:sha(raw)},preserved:{featuredMedia:expectedMedia[0],mediaIds:expectedMedia,customizationId:expectedAlias,status:'DRAFT',templateSuffix:'konfi'},counts:{targets:targetsPassed,residual:residualPassed,prices:pricePassed,options:optionsPassed,skus:skuPassed,priceChanges:priceDeltas.length,labelChanges:labelDeltas.length,uniqueChangedVariants:deltas.length},differences,observedDeltas:deltas,limits:['Structured connector responses serialized locally; hashes pin these files, not raw HTTP response bytes.','No native binding/history/catalog table evidence or price metafield/CAS proof from this Shopify-only read.','Original get_product first page and 17 complete GraphQL pages; no extra baseline or post-read mutation.']};
fs.writeFileSync(path.resolve(output),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({allPassed:result.allPassed,checks:checks.length,counts:result.counts,differences:differences.length,output:path.resolve(output)}));
if(!result.allPassed)process.exitCode=1;
