import {createHmac,timingSafeEqual} from 'node:crypto';
import {shopName} from './store.mjs';
function same(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);}
export function proxyShop(params,secret,clock=Date.now()) {
  const shop=params.get('shop'),time=Number(params.get('timestamp'));
  if(!secret || !shopName(shop) || !Number.isFinite(time) || Math.abs(clock/1000-time)>300 || params.getAll('signature').length!==1 || params.getAll('shop').length!==1) throw Error('Ungültiger Shopify-App-Proxy.');
  const encoded=[...new Set(params.keys())].filter(k=>k!=='signature').map(k=>k+'='+params.getAll(k).join(',')).sort().join('');
  const signed=createHmac('sha256',secret).update(encoded).digest('hex');
  if(!same(signed,params.get('signature'))) throw Error('Ungültige Proxy-Signatur.');
  return shop;
}
const query='query StudioOrder($id:ID!,$after:String){order(id:$id){id name updatedAt cancelledAt displayFinancialStatus lineItems(first:100,after:$after){nodes{id currentQuantity variant{id} product{id} customAttributes{key value}} pageInfo{hasNextPage endCursor}}}}';
function gid(value,kind){const m=new RegExp('^gid://shopify/'+kind+'/([1-9][0-9]*)$').exec(value||'');if(!m) throw Error('Shopify-ID fehlt: '+kind);return m[1];}
export async function readOrder(shop,token,orderId,call=fetch) {
  if(!shopName(shop)||!token||!/^[1-9]\d{0,19}$/.test(orderId)) throw Error('Shop, Lesetoken und Bestellnummer (ID) erforderlich.');
  let after=null,order,updated;
  const cursors=new Set(),seen=new Set();
  do {
    const res=await call('https://'+shop+'/admin/api/2026-10/graphql.json',{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':token},body:JSON.stringify({query,variables:{id:'gid://shopify/Order/'+orderId,after}}),signal:AbortSignal.timeout(20000),redirect:'error'});
    if(!res.ok) throw Error('Shopify-Auftragsabruf fehlgeschlagen (HTTP '+res.status+').');
    const json=await res.json(),o=json.data?.order;
    if(json.errors?.length || !o || gid(o.id,'Order')!==orderId) throw Error('Bestellung fehlt oder Shopify meldet einen Abfragefehler.');
    if(!order){order={id:orderId,name:o.name,status:o.displayFinancialStatus,cancelled:!!o.cancelledAt,updatedAt:o.updatedAt,lines:[]};updated=o.updatedAt;}
    if(updated!==o.updatedAt) throw Error('Bestellung wurde während des Abrufs geändert. Erneut abrufen.');
    for(const line of o.lineItems.nodes){
      const refs=line.customAttributes.filter(a=>a.key==='_gravuru_studio');
      if(!refs.length) continue;
      if(refs.length!==1) throw Error('Mehrdeutige Gestaltungszuordnung.');
      const id=gid(line.id,'LineItem');
      if(seen.has(id)) throw Error('Doppelte Bestellposition.');
      seen.add(id);
      order.lines.push({id,variant:gid(line.variant?.id,'ProductVariant'),product:gid(line.product?.id,'Product'),quantity:line.currentQuantity,job:refs[0].value});
    }
    const page=o.lineItems.pageInfo;
    after=page.hasNextPage ? page.endCursor : null;
    if(page.hasNextPage && (!after || cursors.has(after))) throw Error('Shopify-Seitenfolge unvollständig.');
    cursors.add(after);
  } while(after);
  return order;
}

export async function downloadShopifyFile(store,shop,token,order,line,format,call=fetch) {
  const snapshot=await readOrder(shop,token,order,call);
  if(!snapshot.updatedAt) throw Error('Shopify-Zeitstempel für die Fertigungsprüfung fehlt.');
  store.receive(shop,snapshot);
  return store.download(shop,order,line,format);
}
