// V3: option IDs select prices from app-owned product data; cart attributes
// never contain an amount. Shared by the snapshot verifier and Cart Transform.
const id=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/;
const money=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;
const fail=()=>{throw Error('Invalid priced option selection');};
export function readOptionPrices(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>32)fail();
 const entries=Object.entries(value).sort(([a],[b])=>a.localeCompare(b));
 if(entries.some(([key,cents])=>!id.test(key)||!money(cents)))fail();
 return Object.fromEntries(entries);
}
export function readSelectedOptions(value){
 if(typeof value!=='string'||value.length>2591)fail();
 const ids=value==='-'?[]:value.split(',');
 if(ids.length>32||ids.some(key=>!id.test(key))||new Set(ids).size!==ids.length)fail();
 if(([...ids].sort().join(',')||'-')!==value)fail();
 return ids;
}
export function priceSelectedOptions(prices,ids){
 const allowed=readOptionPrices(prices);readSelectedOptions(ids.join(',')||'-');
 let total=0;for(const key of ids){if(!Object.hasOwn(allowed,key))fail();total+=allowed[key];}
 if(!money(total))fail();return total;
}
