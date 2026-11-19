import {createHmac,timingSafeEqual} from 'node:crypto';
import {shopName} from './store.mjs';
import {F02_SHOP,confirmF02Price,f02Binding,readF02Line} from './f02-line.mjs';
function same(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
export function proxyShop(params,secret,clock=Date.now()) {
  const shop=params.get('shop'),time=Number(params.get('timestamp'));
  if(!secret || !shopName(shop) || !Number.isFinite(time) || Math.abs(clock/1000-time)>300 || params.getAll('signature').length!==1 || params.getAll('shop').length!==1) throw Error('Ungültiger Shopify-App-Proxy.');
  const encoded=[...new Set(params.keys())].filter(k=>k!=='signature').map(k=>k+'='+params.getAll(k).join(',')).sort().join('');
  const signed=createHmac('sha256',secret).update(encoded).digest('hex');
  if(!same(signed,params.get('signature'))) throw Error('Ungültige Proxy-Signatur.');
  return shop;
}
const query=`query StudioOrder($id:ID!, $after:String) {
  order(id:$id) {
    id name test updatedAt cancelledAt displayFinancialStatus
    lineItems(first:100, after:$after) {
      nodes { id sku currentQuantity variant {id} product {id} customAttributes {key value}
        originalUnitPriceSet {shopMoney {amount currencyCode}} }
      pageInfo {hasNextPage endCursor}
    }
  }
}`;
function gid(value,kind){const m=new RegExp('^gid://shopify/'+kind+'/([1-9][0-9]*)$').exec(value||'');if(!m) throw Error('Shopify-ID fehlt: '+kind);return m[1];}
async function adminQuery(shop,token,document,variables,call,usage) {
  if(usage) usage.requests++;
  const res=await call('https://'+shop+'/admin/api/2026-10/graphql.json',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},
    body:JSON.stringify({query:document,variables}),signal:AbortSignal.timeout(20000),redirect:'error'});
  if(!res.ok) throw Error('Shopify-Auftragsabruf fehlgeschlagen (HTTP '+res.status+').');
  const json=await res.json();
  const cost=json?.extensions?.cost?.actualQueryCost;
  if(usage && Number.isSafeInteger(cost) && cost>=0) {
    usage.costedRequests++;
    usage.actualQueryCost+=cost;
  }
  if(!json.data || json.errors!=null && (!Array.isArray(json.errors)||json.errors.length) ||
      json.extensions?.search?.some(item=>item.warnings?.length))
    throw Error('Shopify meldet einen Abfragefehler.');
  return json.data;
}
function nextCursor(page,cursors) {
  if(typeof page?.hasNextPage!=='boolean') throw Error('Shopify-Seitenfolge unvollständig.');
  if(!page.hasNextPage) return null;
  if(typeof page.endCursor!=='string' || !page.endCursor || cursors.has(page.endCursor)) throw Error('Shopify-Seitenfolge unvollständig.');
  cursors.add(page.endCursor);
  return page.endCursor;
}
export async function readOrder(shop,token,orderId,call=fetch,f02,usage) {
  if(!shopName(shop)||!token||!/^[1-9]\d{0,19}$/.test(orderId)) throw Error('Shop, Lesetoken und Bestellnummer (ID) erforderlich.');
  const binding=shop===F02_SHOP || f02 ? f02Binding(shop,f02) : undefined;
  let after=null,order;
  const cursors=new Set(),seen=new Set(),references=new Set();
  do {
    const {order:o}=await adminQuery(shop,token,query,{id:'gid://shopify/Order/'+orderId,after},call,usage);
    if(!o || gid(o.id,'Order')!==orderId) throw Error('Bestellung fehlt oder Shopify meldet einen Abfragefehler.');
    if(shop===F02_SHOP && o.test!==true) throw Error('F02 benötigt eine bestätigte Testbestellung.');
    if(typeof o.updatedAt!=='string' || !Number.isFinite(Date.parse(o.updatedAt)) ||
        (o.cancelledAt!==null && (typeof o.cancelledAt!=='string' || !Number.isFinite(Date.parse(o.cancelledAt)))) ||
        typeof o.displayFinancialStatus!=='string' || !o.displayFinancialStatus || !Array.isArray(o.lineItems?.nodes))
      throw Error('Shopify hat den Bestellstand unvollständig beantwortet.');
    if(!order) order={id:orderId,name:o.name,test:o.test===true,status:o.displayFinancialStatus,cancelled:o.cancelledAt!==null,updatedAt:o.updatedAt,lines:[]};
    if(order.updatedAt!==o.updatedAt || order.status!==o.displayFinancialStatus || order.cancelled!==(o.cancelledAt!==null))
      throw Error('Bestellung wurde während des Abrufs geändert. Erneut abrufen.');
    for(const line of o.lineItems.nodes){
      if(binding && (line.product?.id!=='gid://shopify/Product/'+binding.product ||
          line.variant?.id!=='gid://shopify/ProductVariant/'+binding.variant || line.sku!==binding.sku)) continue;
      const refs=line.customAttributes.filter(a=>a.key==='_gravuru_studio');
      const inline=binding && line.customAttributes.some(a=>a.key==='_gravuru_ref'||a.key==='_gravuru_parts'||a.key.startsWith('_gravuru_data_'));
      if(!refs.length && !inline) continue;
      if(refs.length>1 || refs.length && inline) throw Error('Mehrdeutige Gestaltungszuordnung.');
      const id=gid(line.id,'LineItem');
      if(seen.has(id)) throw Error('Doppelte Bestellposition.');
      seen.add(id);
      const item={id,variant:gid(line.variant?.id,'ProductVariant'),product:gid(line.product?.id,'Product'),quantity:line.currentQuantity};
      if(!Number.isSafeInteger(item.quantity)||item.quantity<0) throw Error('Ungültige aktuelle Bestellmenge.');
      if(binding) confirmF02Price(line.originalUnitPriceSet?.shopMoney,binding);
      if(inline){
        item.inline=readF02Line(line.customAttributes,binding);
        if(references.has(item.inline.reference)) throw Error('Mehrfach verwendete F02-Positionsreferenz.');
        references.add(item.inline.reference);
      } else item.job=refs[0].value;
      order.lines.push(item);
    }
    after=nextCursor(o.lineItems.pageInfo,cursors);
  } while(after);
  return order;
}

const findOrders=`query StudioTestOrders($filter:String!, $after:String) {
  orders(first:50, after:$after, query:$filter, sortKey:UPDATED_AT) {
    nodes {id test} pageInfo {hasNextPage endCursor}
  }
}`;
export async function syncF02Orders(store,shop,token,f02,call=fetch) {
  const binding=f02Binding(shop,f02);
  if(!token) throw Error('Der F02-Testshop-Lesezugang fehlt.');
  const filter='test:true sku:"'+binding.sku+'"';
  // Previously associated lines can disappear from a SKU search after a Shopify order edit.
  const known=new Set(store.knownProductOrders(shop,binding.product,binding.variant));
  const ids=new Set(known);
  const usage={requests:0,costedRequests:0,actualQueryCost:0};
  const cursors=new Set();
  let after=null;
  do {
    const {orders}=await adminQuery(shop,token,findOrders,{filter,after},call,usage);
    if(!Array.isArray(orders?.nodes)) throw Error('Shopify-Bestellliste unvollständig.');
    for(const order of orders.nodes) {
      if(order.test!==true) throw Error('Die Bestellliste enthält eine unbestätigte Testbestellung.');
      ids.add(gid(order.id,'Order'));
    }
    after=nextCursor(orders.pageInfo,cursors);
  } while(after);
  let positions=0;
  const unverified=[];
  for(const id of ids) {
    try {
      const order=await readOrder(shop,token,id,call,binding,usage);
      if(order.lines.length || known.has(id)) positions+=store.receive(shop,order,binding);
    } catch { unverified.push(id); }
  }
  return {orders:ids.size,positions,...(unverified.length?{unverified}:{}),...(usage.costedRequests?{usage}:{})};
}

export async function downloadShopifyFile(store,shop,token,order,line,format,call=fetch,f02) {
  async function confirmedPosition() {
    const snapshot=await readOrder(shop,token,order,call,f02);
    store.receive(shop,snapshot,f02);
    if(snapshot.cancelled || snapshot.status!=='PAID')
      throw Object.assign(Error('Die Fertigungsdatei erfordert eine aktive, bezahlte Bestellposition.'),{status:409});
    if(!snapshot.lines.some(item=>item.id===line && item.quantity>0))
      throw Object.assign(Error('Keine aktive zugeordnete Bestellposition.'),{status:409});
    const position=store.paidPosition(shop,order,line);
    return {updated:snapshot.updatedAt,job:position.id,quantity:position.qty};
  }
  const before=await confirmedPosition();
  const file=await store.download(shop,order,line,format);
  const after=await confirmedPosition();
  if(before.updated!==after.updated || before.job!==after.job || before.quantity!==after.quantity)
    throw Object.assign(Error('Bestellposition während der Dateierstellung geändert. Bitte erneut abrufen.'),{status:409});
  return file;
}
