import {createHash} from 'node:crypto';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const fail=()=>{throw Object.assign(Error('Native Eingabe muss vollständige begrenzte JSON-Daten enthalten.'),{status:422,code:'native_input_snapshot'});};
function valid(v,depth=0){
  if(depth>40)fail();
  if(v===null||['string','boolean'].includes(typeof v)||typeof v==='number'&&Number.isFinite(v))return;
  if(Array.isArray(v)){for(const item of v)valid(item,depth+1);return;}
  if(plain(v)){for(const [key,value]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))fail();valid(value,depth+1);}return;}fail();
}
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':plain(v)?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
export function snapshotNativeInput(value){
  valid(value);const json=JSON.stringify(value);if(Buffer.byteLength(json)>100*1024*1024)fail();
  const input=freeze(JSON.parse(json));return Object.freeze({input,sha256:createHash('sha256').update(canonical(input)).digest('hex')});
}
