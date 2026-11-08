// App-owned immutable previous contracts keep saved carts valid when a product
// gains a new configurator revision. Customer attributes select a known contract
// only; its prices, counters and exact legacy offers are still fully validated.
function priceTable(contract,target){
 const seq=contract.variantSequence;
 if(seq!==undefined){
  if(contract.variants!==undefined||!seq||typeof seq!=='object'||Array.isArray(seq)||Object.keys(seq).length!==(seq.width===undefined?3:4)||typeof seq.first!=='string'||!/^([1-9][0-9]*)$/.test(seq.first)||!Number.isSafeInteger(seq.step)||seq.step<1)throw Error('Invalid variant sequence');
  // Fixed-width base36 cents keep the Function input a single string instead
  // of parsing the same 404-number array once for every cart line.
  const packed=seq.prices36!==undefined,width=seq.width===undefined?6:seq.width;
  if(!Number.isSafeInteger(width)||width<1||width>6)throw Error('Invalid variant sequence width');
  if(packed?(seq.prices!==undefined||typeof seq.prices36!=='string'||seq.prices36.length%width!==0):(!Array.isArray(seq.prices)||seq.width!==undefined))throw Error('Invalid variant sequence prices');
  const count=packed?seq.prices36.length/width:seq.prices.length;
  if(count<2)throw Error('Invalid variant sequence count');
  const first=Number(seq.first),last=first+seq.step*(count-1);
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||String(first)!==seq.first||String(last).length!==seq.first.length)throw Error('Invalid variant sequence IDs');
  const index=target===undefined?-1:(Number(target)-first)/seq.step;
  if(target!==undefined&&(!Number.isSafeInteger(index)||index<0||index>=count||String(first+index*seq.step)!==target))throw Error('Missing historical variant');
  const variants={},keys=[];
  const start=target===undefined?0:index,end=target===undefined?count:index+1;
  for(let i=start;i<end;i++){
   const token=packed?seq.prices36.slice(i*width,i*width+width):null;
   if(packed&&!/^[0-9a-z]+$/.test(token))throw Error('Invalid packed variant price');
   const value=packed?parseInt(token,36):seq.prices[i];if(!Number.isSafeInteger(value)||value<0||value>100000000)throw Error('Invalid variant sequence price');
   const key=String(first+i*seq.step);variants[key]=value;if(target===undefined)keys.push(key);
  }
  return {variants,keys,count,index};
 }
 if(!contract.variants||typeof contract.variants!=='object'||Array.isArray(contract.variants))throw Error('Missing historical variant table');
 const all=contract.variants,keys=Object.keys(all),count=keys.length;
 if(target!==undefined&&!Object.prototype.hasOwnProperty.call(all,target))throw Error('Missing historical variant');
 const index=target===undefined?-1:keys.reduce((n,k)=>n+(k<target?1:0),0);
 if(target===undefined)keys.sort();
 return {variants:target===undefined?all:{[target]:all[target]},keys,count,index};
}
export function expandPricingVariants(contract,target){
 if(contract?.variantSequence===undefined)return contract;
 const {variantSequence,...fields}=contract;return {...fields,variants:priceTable(contract,target).variants};
}
export function resolvedPricingHistory(pricing,selectedRevision,selectedVariant,decodedDeltas){
 if(pricing?.variantsFromRevision!==undefined||pricing?.variantDeltas!==undefined)throw Error('Invalid current variant reference');
 if(pricing?.history===undefined)return [];
 if(pricing.enabled!==true||!Array.isArray(pricing.history))throw Error('Invalid pricing history');
 const revisions=new Set([String(pricing.revision)]);
 for(const old of pricing.history){
  if(!old||old.enabled!==true||!['gravuru-personalization-pricing/v1','gravuru-personalization-pricing/v2','gravuru-personalization-pricing/v3'].includes(old.schema)||old.productId!==pricing.productId||old.currency!==pricing.currency||!Number.isSafeInteger(old.revision)||old.revision<1||revisions.has(String(old.revision))||old.history!==undefined)throw Error('Invalid historical price contract');
  revisions.add(String(old.revision));
 }
 return pricing.history.map(old=>{
  if(old.variantsFromRevision===undefined){if(old.variantDeltas!==undefined)throw Error('Unbound historical variant deltas');if(selectedRevision!==undefined&&String(old.revision)!==selectedRevision)return old;return expandPricingVariants(old,selectedVariant);}
  // A reference names an immutable revision, never "current". Future revisions
  // can therefore change their table without changing the meaning of old carts.
  if(!Number.isSafeInteger(old.variantsFromRevision)||old.variantsFromRevision<1||old.variants!==undefined||old.variantSequence!==undefined||old.variantsFromRevision===old.revision)throw Error('Invalid historical variant reference');
  const source=[pricing,...pricing.history].find(p=>p.revision===old.variantsFromRevision);
  if(!source||source.variantsFromRevision!==undefined||source.variantDeltas!==undefined||(source.variants===undefined)===(source.variantSequence===undefined))throw Error('Missing historical variant table');
  // The runtime only needs the contract selected by this cart line. Avoid
  // expanding unused historical tables repeatedly for current-revision lines.
  // Publisher validation calls this without a selector and checks every table.
  if(selectedRevision!==undefined&&String(old.revision)!==selectedRevision)return old;
  const {variantsFromRevision,variantDeltas,...fields}=old;
  const table=priceTable(source,selectedVariant);
  if(variantDeltas===undefined)return {...fields,variants:table.variants};
  // Indices refer to lexicographically sorted IDs in the named immutable
  // revision. Inclusive ranges avoid repeating IDs while retaining OLD prices.
  if(!Array.isArray(variantDeltas)||!variantDeltas.length)throw Error('Invalid historical price deltas');
  const keys=table.keys,targetOnly=selectedVariant!==undefined;
  // One line only needs one historical price. Its lexicographic index can be
  // found without sorting/copying all 404 prices into every line's contract.
  const targetIndex=table.index,variants={...table.variants},seen=new Set(),deltas=new Set();
  const cached=decodedDeltas?.get(old.revision);
  if(targetOnly&&cached){
   const value=table.variants[selectedVariant]+(cached.get(targetIndex)||0);
   if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid historical variant price');
   return {...fields,variants:{[selectedVariant]:value}};
  }
  const decoded=decodedDeltas?new Map():null;
  for(const group of variantDeltas){
   if(!Array.isArray(group)||group.length!==2||!Number.isSafeInteger(group[0])||group[0]===0||deltas.has(group[0])||typeof group[1]!=='string'||!group[1].length||group[1].length>table.count*16)throw Error('Invalid historical price delta group');
   deltas.add(group[0]);let previous=-1;
   for(const range of group[1].split(',')){
    const match=/^(0|[1-9][0-9]*)(?:-(0|[1-9][0-9]*))?$/.exec(range);
    if(!match)throw Error('Invalid historical price delta range');
    const start=Number(match[1]),end=match[2]===undefined?start:Number(match[2]);
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<=previous||end>=table.count||end<start||match[2]!==undefined&&end===start)throw Error('Invalid historical price delta index');
    if(targetOnly){
     if(decoded)for(let i=start;i<=end;i++){if(decoded.has(i))throw Error('Invalid historical variant price');decoded.set(i,group[0]);}
     if(start<=targetIndex&&targetIndex<=end){
      const value=table.variants[selectedVariant]+group[0];
      if(seen.has(targetIndex)||!Number.isSafeInteger(table.variants[selectedVariant])||!Number.isSafeInteger(value)||value<0)throw Error('Invalid historical variant price');
      seen.add(targetIndex);variants[selectedVariant]=value;
     }
     previous=end;continue;
    }
    for(let i=start;i<=end;i++){
     if(seen.has(i))throw Error('Invalid historical variant price');
     seen.add(i);
     if(!targetOnly||i===targetIndex){
      const id=keys[i],value=table.variants[id]+group[0];
      if(!Number.isSafeInteger(table.variants[id])||!Number.isSafeInteger(value)||value<0)throw Error('Invalid historical variant price');
      variants[id]=value;
     }
    }
    previous=end;
   }
  }
  if(decoded)decodedDeltas.set(old.revision,decoded);
  return {...fields,variants};
 });
}
export function createPricingResolver(){
 // Lifetime is one cartTransformRun call; identity includes every contract
 // byte, never only product/revision. Nothing survives a Function invocation.
 const contracts=new Map();return line=>{
  const raw=line.merchandise?.product?.pricing?.value;
  if(typeof raw!=='string')return pricingForLine(line);
  let entry=contracts.get(raw);
  if(!entry){
   const pricing=JSON.parse(raw);
   if(!pricing||typeof pricing!=='object'||Array.isArray(pricing))throw Error('Invalid pricing contract');
   entry={pricing,history:resolvedPricingHistory(pricing,String(pricing.revision)),deltas:new Map()};contracts.set(raw,entry);
  }
  return pricingForLine(line,entry);
 };
}
export function pricingForLine(line,entry){
 const item=line.merchandise,pricing=entry?.pricing??(item?.__typename==='ProductVariant'?item.product.pricing?.jsonValue:null);
 if(!pricing&&(line.revision?.value!=null||line.designFile?.value!=null||line.configuration?.value!=null&&line.offer?.value!=null))throw Error('Personalization pricing unavailable');
 const variant=item?.id?.split('/').pop();
 if(entry){
  const revision=line.revision?.value;
  let selected=pricing;
  if(revision!==undefined)selected=entry.history.find(p=>String(p.revision)===revision)||pricing;
  else{
   const matches=entry.history.filter(p=>Array.isArray(p.legacyOffers)&&p.legacyOffers.some(e=>e?.offer===line.offer?.value));
   if(matches.length>1)throw Error('Ambiguous historical offer');selected=matches[0]||pricing;
  }
  if(selected!==pricing){
   selected=resolvedPricingHistory(pricing,String(selected.revision),variant,entry.deltas).find(p=>p.revision===selected.revision);
   return selected;
  }
  if(selected.variantSequence!==undefined)return expandPricingVariants(selected,variant);
  // Downstream arithmetic needs only this line's price. Avoid copying every
  // other variant into each V2-to-V1 line adapter.
  return selected?.variants?{...selected,variants:{[variant]:selected.variants[variant]}}:selected;
 }
 if(pricing?.history===undefined)return expandPricingVariants(pricing,variant);
 const revision=line.revision?.value,history=resolvedPricingHistory(pricing,revision,item.id.split('/').pop());
 if(revision!==undefined)return expandPricingVariants(history.find(p=>String(p.revision)===revision)||pricing,variant);
 const legacy=history.filter(p=>Array.isArray(p.legacyOffers)&&p.legacyOffers.some(e=>e?.offer===line.offer?.value));
 if(legacy.length>1)throw Error('Ambiguous historical offer');
 return expandPricingVariants(legacy[0]||pricing,variant);
}
