// Preserve runner events, including non-enumerable Error fields, for later audit.
export default async function* report(source){
  for await(const event of source){
    const seen=new WeakSet();
    yield JSON.stringify(event,(key,value)=>{
      if(typeof value==='bigint')return String(value);
      if(value&&typeof value==='object'){
        if(seen.has(value))return '[Circular]';seen.add(value);
        if(value instanceof Error)return Object.fromEntries(['name',...Object.getOwnPropertyNames(value)].map(k=>[k,value[k]]));
      }
      return value;
    })+'\n';
  }
}
