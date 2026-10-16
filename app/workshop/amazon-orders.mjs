// Orders API 2026-01-01. Persist a deliberate field projection, never the response.
// Buyer/recipient data, titles, cancellation reasons and signed Custom URLs are excluded.
export const AMAZON_ORDER_API_VERSION='2026-01-01';
export const AMAZON_ORDER_PROVENANCE=Object.freeze(['sandbox','synthetic','anonymized']);
export const AMAZON_FULFILLMENT_STATUSES=Object.freeze(['PENDING_AVAILABILITY','PENDING','UNSHIPPED','PARTIALLY_SHIPPED','SHIPPED','CANCELLED','UNFULFILLABLE']);
const fail=message=>{throw Object.assign(Error(message),{status:422,code:'amazon_order_input'});};
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function amazonIdentifier(value,label='Kennung'){
 if(typeof value!=='string'||!value.length||value.length>100||!/^[-A-Za-z0-9_.:]+$/.test(value))fail('Ungültige Amazon-'+label+'.');
 return value;
}
export function amazonSku(value){
 if(typeof value!=='string'||!value.trim()||value.length>100||/[\x00-\x1f\x7f]/.test(value))fail('Ungültige Amazon-SKU.');
 return value;
}
export function amazonTime(value){
 if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value)))fail('Ungültige Amazon-Änderungszeit.');
 const localPart=value.slice(0,19),localDate=new Date(localPart+'Z');if(!Number.isFinite(localDate.getTime())||localDate.toISOString().slice(0,19)!==localPart)fail('Ungültige Amazon-Änderungszeit.');
 return new Date(value).toISOString();
}
export function amazonMoney(value){
 if(value==null)return null;
 if(!object(value)||typeof value.amount!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value.amount)||!['EUR','GBP','SEK','PLN','DKK','NOK','CHF','CZK','HUF','RON','BGN','USD','BRL'].includes(value.currencyCode))fail('Amazon-Betrag oder Währung wird nicht unterstützt.');
 const [whole,fraction='']=value.amount.split('.'),cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(cents)||cents>10000000000)fail('Ungültiger Amazon-Betrag.');
 return {cents,currency:value.currencyCode};
}
const quantity=(v,required=false)=>{if(v==null&&!required)return null;if(!Number.isSafeInteger(v)||v<0||v>100000)fail('Ungültige Amazon-Menge.');return v;};
const window=value=>{if(value==null)return null;if(!object(value))fail('Ungültiges Amazon-Zeitfenster.');const earliestDateTime=value.earliestDateTime==null?null:amazonTime(value.earliestDateTime),latestDateTime=value.latestDateTime==null?null:amazonTime(value.latestDateTime);if(earliestDateTime&&latestDateTime&&earliestDateTime>latestDateTime)fail('Ungültiges Amazon-Zeitfenster.');return {earliestDateTime,latestDateTime};};

export function normalizeAmazonOrder(order,{provenance,marketplaceIds}={}){
 if(!AMAZON_ORDER_PROVENANCE.includes(provenance))fail('Nur Sandbox-, synthetische oder zuvor anonymisierte Bestellungen sind zugelassen.');
 if(!object(order)||!object(order.salesChannel)||order.salesChannel.channelName!=='AMAZON'||!Array.isArray(order.orderItems)||order.orderItems.length>250)fail('Keine unterstützte Amazon-Bestellung.');
 const marketplaceId=amazonIdentifier(order.salesChannel.marketplaceId,'Marketplace-ID');
 if(marketplaceIds!==undefined&&(!Array.isArray(marketplaceIds)||!marketplaceIds.includes(marketplaceId)))fail('Amazon-Marktplatz ist für diesen Abruf nicht zugelassen.');
 const createdTime=amazonTime(order.createdTime),lastUpdatedTime=amazonTime(order.lastUpdatedTime);
 if(lastUpdatedTime<createdTime)fail('Amazon-Änderungszeit liegt vor der Bestellung.');
 const seen=new Set(),items=order.orderItems.map(item=>{
  if(!object(item)||!object(item.product))fail('Ungültige Amazon-Bestellposition.');
  const id=amazonIdentifier(item.orderItemId,'Positions-ID');if(seen.has(id))fail('Doppelte Amazon-Bestellposition.');seen.add(id);
  const count=quantity(item.quantityOrdered,true),fulfilled=quantity(item.fulfillment?.quantityFulfilled),unfulfilled=quantity(item.fulfillment?.quantityUnfulfilled);
  if((fulfilled!==null&&fulfilled>count)||(unfulfilled!==null&&unfulfilled>count)||(fulfilled!==null&&unfulfilled!==null&&fulfilled+unfulfilled>count))fail('Amazon-Versandmenge widerspricht der Bestellmenge.');
  const unit=amazonMoney(item.product.price?.unitPrice),proceeds=amazonMoney(item.proceeds?.proceedsTotal);
  if(unit&&proceeds&&unit.currency!==proceeds.currency)fail('Amazon-Positionswährungen widersprechen sich.');
  const total=unit?unit.cents*count:null;if(total!==null&&!Number.isSafeInteger(total))fail('Amazon-Positionswert ist zu groß.');
  return {orderItemId:id,sku:item.product.sellerSku==null?null:amazonSku(item.product.sellerSku),asin:item.product.asin==null?null:amazonIdentifier(item.product.asin,'ASIN'),quantity:count,quantityFulfilled:fulfilled,quantityUnfulfilled:unfulfilled,unitCents:unit?.cents??null,totalCents:total,currency:unit?.currency??proceeds?.currency??null,proceedsCents:proceeds?.cents??null,customizationAvailable:item.product.customizationAvailable===true||(typeof item.product.customization?.customizedUrl==='string'&&item.product.customization.customizedUrl.length>0),cancellationRequested:object(item.cancellation?.cancellationRequest),cancelled:object(item.cancellation?.cancellationExecution)};
 }).sort((a,b)=>a.orderItemId.localeCompare(b.orderItemId,'en'));
 const status=order.fulfillment?.fulfillmentStatus;
 return {apiVersion:AMAZON_ORDER_API_VERSION,provenance,orderId:amazonIdentifier(order.orderId,'Bestellnummer'),marketplaceId,createdTime,lastUpdatedTime,fulfillmentStatus:AMAZON_FULFILLMENT_STATUSES.includes(status)?status:'UNKNOWN',fulfilledBy:['AMAZON','MERCHANT'].includes(order.fulfillment?.fulfilledBy)?order.fulfillment.fulfilledBy:null,shipByWindow:window(order.fulfillment?.shipByWindow),deliverByWindow:window(order.fulfillment?.deliverByWindow),items};
}

// Only safe search fields may enter a durable cursor. Never persist arbitrary headers/body.
export function normalizeAmazonOrderQuery(query={}){
 if(!object(query))fail('Ungültige Amazon-Suchabfrage.');
 const allowed=new Set(['createdAfter','createdBefore','lastUpdatedAfter','lastUpdatedBefore','marketplaceIds','fulfillmentStatuses','fulfilledBy','maxResultsPerPage','includedData']);
 if(Object.keys(query).some(k=>!allowed.has(k)))fail('Unbekanntes Amazon-Suchfeld.');
 const result={};
 for(const key of ['createdAfter','createdBefore','lastUpdatedAfter','lastUpdatedBefore'])if(query[key]!==undefined)result[key]=amazonTime(query[key]);
 if(query.marketplaceIds!==undefined){if(!Array.isArray(query.marketplaceIds)||!query.marketplaceIds.length||query.marketplaceIds.length>50)fail('Ungültige Amazon-Marktplatzliste.');result.marketplaceIds=[...new Set(query.marketplaceIds.map(v=>amazonIdentifier(v,'Marketplace-ID')))].sort();}
 if(query.fulfillmentStatuses!==undefined){if(!Array.isArray(query.fulfillmentStatuses)||!query.fulfillmentStatuses.length||query.fulfillmentStatuses.some(v=>!AMAZON_FULFILLMENT_STATUSES.includes(v)))fail('Ungültige Amazon-Statussuche.');result.fulfillmentStatuses=[...new Set(query.fulfillmentStatuses)].sort();}
 if(query.fulfilledBy!==undefined){if(!Array.isArray(query.fulfilledBy)||!query.fulfilledBy.length||query.fulfilledBy.some(v=>!['AMAZON','MERCHANT'].includes(v)))fail('Ungültiger Amazon-Versandkanal.');result.fulfilledBy=[...new Set(query.fulfilledBy)].sort();}
 if(query.maxResultsPerPage!==undefined){if(!Number.isSafeInteger(query.maxResultsPerPage)||query.maxResultsPerPage<1||query.maxResultsPerPage>100)fail('Ungültige Amazon-Seitengröße.');result.maxResultsPerPage=query.maxResultsPerPage;}
 if(query.includedData!==undefined){if(!Array.isArray(query.includedData)||query.includedData.some(v=>!['FULFILLMENT','PROCEEDS','CANCELLATION','EXPENSE','PROMOTION','PACKAGES'].includes(v)))fail('Dieser Amazon-Datenbereich ist im sicheren Testimport gesperrt.');result.includedData=[...new Set(query.includedData)].sort();}
 return result;
}
