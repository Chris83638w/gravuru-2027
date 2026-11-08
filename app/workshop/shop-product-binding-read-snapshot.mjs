// Full binding evidence lives only within a synchronous read phase.
const snapshots=new WeakSet();
const products=new WeakSet();
const readers=new WeakMap();
const activeReaders=new WeakSet();
// Registration retains only the DB-scoped executor, never documents or data.
// Each synchronous before/after-network phase gets a new transaction/cache.
export function registerBindingReadScope(adapter,read){readers.set(adapter,read);}
export const isBindingReadSnapshot=rows=>snapshots.has(rows);
export function immutableBindingReadSnapshot(rows){
 const seen=new WeakSet();
 function freeze(value){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);Object.values(value).forEach(freeze);Object.freeze(value);}}
 freeze(rows);snapshots.add(rows);return rows;
}
export function immutableBindingProductSnapshot(value){
 const seen=new WeakSet();
 function freeze(item){if(item&&typeof item==='object'&&!seen.has(item)){seen.add(item);Object.values(item).forEach(freeze);Object.freeze(item);}}
 freeze(value);products.add(value);products.add(value.document);return value;
}
export const isBindingProductSnapshot=value=>products.has(value);
export function withBindingReadSnapshot(adapter,read,options){
 if(activeReaders.has(adapter))return typeof adapter.withBindingReadSnapshot==='function'?adapter.withBindingReadSnapshot(read,{...options,reuseSnapshot:true}):read();
 if(options===undefined&&readers.has(adapter))return readers.get(adapter)(read);
 activeReaders.add(adapter);
 try{return typeof adapter.withBindingReadSnapshot==='function'?adapter.withBindingReadSnapshot(read,options):read();}finally{activeReaders.delete(adapter);}
}
