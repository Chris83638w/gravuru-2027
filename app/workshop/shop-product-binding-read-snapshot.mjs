// Full binding evidence lives only within a synchronous read phase.
const snapshots=new WeakSet();
export const isBindingReadSnapshot=rows=>snapshots.has(rows);
export function immutableBindingReadSnapshot(rows){
 const seen=new WeakSet();
 function freeze(value){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);Object.values(value).forEach(freeze);Object.freeze(value);}}
 freeze(rows);snapshots.add(rows);return rows;
}
export function withBindingReadSnapshot(adapter,read){
 return typeof adapter.withBindingReadSnapshot==='function'?adapter.withBindingReadSnapshot(read):read();
}
