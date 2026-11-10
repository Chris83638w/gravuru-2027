// Reuse exists only while this synchronous call stack is active. Returning a
// Promise does NOT retain the scope: each continuation must open a new phase.
// There is no database transaction, timer, AsyncLocalStorage or cross-request cache.
let current=null;
const epochs=new WeakMap();
export function withCustomerReadScope(work){
 if(current)return work();
 current=new WeakMap();try{return work();}finally{current=null;}
}
function freeze(value,seen=new WeakSet()){
 if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const v of Object.values(value))freeze(v,seen);Object.freeze(value);}return value;
}
export function customerReadMemo(owner,key,read){
 if(!current||owner===null)return read();
 let cache=current.get(owner);if(!cache){cache=new Map();current.set(owner,cache);}
 if(cache.has(key))return cache.get(key);
 const value=read();if(value&&typeof value.then==='function')throw new TypeError('Customer read phases require synchronous values.');
 freeze(value);if(cache.size<16)cache.set(key,value);return value;
}
// Stand der Datenbank: eigene Schreibvorgänge (auch zurückgerollte), Commits fremder Verbindungen und Schemaänderungen
// (Haupt- und TEMP-Schema). Zwei gleiche Werte derselben Verbindung belegen, dass nichts geschrieben wurde.
export function databaseEpoch(db){
 let statements=epochs.get(db);if(!statements){statements=[db.prepare('SELECT total_changes() AS writes,(SELECT data_version FROM pragma_data_version) AS data'),db.prepare('PRAGMA main.schema_version'),db.prepare('PRAGMA temp.schema_version')];epochs.set(db,statements);}
 return JSON.stringify(statements.map(statement=>statement.get()));
}
export function customerDatabaseRead(db,key,read){
 if(!current)return read();
 // data_version observes other connections; total_changes also detects
 // writes which were rolled back or changed and restored on this connection.
 // Schema epochs cover ordinary/TEMP schema changes without relying on a
 // particular immutable trigger or on recursive_triggers being enabled.
 const before=databaseEpoch(db);
 return customerReadMemo(db,before+'|'+key,()=>{
  const value=read();
  if(databaseEpoch(db)!==before)throw Object.assign(Error('Der Produktstand hat sich während der Prüfung geändert.'),{status:409,code:'customer_read_changed'});
  return value;
 });
}
