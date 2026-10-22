// Minimal line allocations from an authenticated order snapshot. Transaction
// receipts, contacts and original webhook payloads are deliberately not stored.
const fail=()=>{throw Object.assign(Error('Ungültige positionsbezogene Erstattungsangaben.'),{status:422,code:'order_refunds'});};
const id=value=>{
 if(typeof value==='number'&&!Number.isSafeInteger(value))fail();
 if(!['string','number'].includes(typeof value)||!/^[1-9][0-9]{0,19}$/.test(String(value)))fail();
 return String(value);
};
const cents=value=>{
 if(typeof value==='number'){
  if(!Number.isFinite(value)||Number(value.toFixed(2))!==value)fail();
  value=value.toFixed(2);
 }
 if(typeof value!=='string'||!/^\d+(?:\.\d{1,2})?$/.test(value))fail();
 const [whole,fraction='']=value.split('.'),result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
 if(!Number.isSafeInteger(result)||result>100000000)fail();
 return result;
};
const amount=(line,key)=>{
 if(Object.hasOwn(line,key+'_set')){
  const money=line[key+'_set']?.shop_money;
  if(money?.currency_code!=='EUR')fail();
  return cents(money.amount);
 }
 return cents(line[key]);
};
const sort=(a,b)=>a.id.localeCompare(b.id);

export function refundReport(payload){
 if(!Object.hasOwn(payload,'refunds'))return null; // Missing is not zero.
 if(payload.currency!=='EUR'||!Array.isArray(payload.refunds)||payload.refunds.length>250)fail();
 const seen=new Set();
 return payload.refunds.map(refund=>{
  if(!refund||typeof refund!=='object')fail();
  const refundId=id(refund.id);
  if(Object.hasOwn(refund,'order_id')&&id(refund.order_id)!==id(payload.id))fail();
  if(seen.has(refundId)||!Array.isArray(refund.refund_line_items)||refund.refund_line_items.length>250)fail();
  seen.add(refundId);
  const lines=new Set();
  return {id:refundId,lines:refund.refund_line_items.map(line=>{
   if(!line||typeof line!=='object')fail();
   const lineId=id(line.line_item_id);
   if(lines.has(lineId)||!Number.isSafeInteger(line.quantity)||line.quantity<0||line.quantity>100000)fail();
   lines.add(lineId);
   return {id:lineId,quantity:line.quantity,subtotalCents:amount(line,'subtotal'),taxCents:amount(line,'total_tax')};
  }).sort(sort)};
 }).sort(sort);
}

// Reports are cumulative snapshots, never amounts to add across webhook deliveries.
// Changes/removals of earlier allocations require review instead of silently
// replacing an already reported refund or guessing a net payment for the line.
export function lineRefunds(line,reports,orderUpdatedAt){
 const empty={scope:'line-allocation',reported:false,currency:'EUR',updatedAt:null,
  quantity:null,subtotalCents:null,taxCents:null,refundCount:0,
  stale:false,conflict:false,requiresReview:false,paymentConfirmed:false};
 if(!reports.length)return empty;
 const latestTime=reports.reduce((value,r)=>r.updatedAt>value?r.updatedAt:value,''),current=reports.filter(r=>r.updatedAt===latestTime);
 const encoded=new Set(current.map(r=>JSON.stringify(r.report))),latest=current[0].report;
 let conflict=encoded.size>1;
 const currentById=new Map(latest.map(refund=>[refund.id,JSON.stringify(refund)]));
 for(const report of reports)for(const refund of report.report){
  if(currentById.get(refund.id)!==JSON.stringify(refund))conflict=true;
 }
 const entries=latest.flatMap(refund=>refund.lines.filter(item=>item.id===line.lineId));
 const quantity=entries.reduce((n,item)=>n+item.quantity,0),subtotalCents=entries.reduce((n,item)=>n+item.subtotalCents,0),taxCents=entries.reduce((n,item)=>n+item.taxCents,0);
 if(quantity>line.quantity||![quantity,subtotalCents,taxCents].every(Number.isSafeInteger))conflict=true;
 const stale=Boolean(orderUpdatedAt&&latestTime<orderUpdatedAt);
 return {...empty,reported:true,updatedAt:latestTime,stale,conflict,
  requiresReview:stale||conflict||entries.length>0,
  ...(conflict?{}:{quantity,subtotalCents,taxCents,refundCount:entries.length})};
}
