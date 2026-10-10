import {createHash} from 'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=()=>{throw Object.assign(Error('Die gesicherte Paketprüfung ist fehlgeschlagen.'),{status:422});};
// Read only the uncompressed, UTF-8 ZIP format written by our existing zipFiles.
// No extraction to disk, filenames never become filesystem paths.
export function readReviewPackage(bytes,expectedHash,expectedSchema='gravuru-form-review/v1'){
 if(bytes.length>128*1024*1024||digest(bytes)!==expectedHash)fail();
 const files=new Map();let p=0;
 while(p+30<=bytes.length&&bytes.readUInt32LE(p)===0x04034b50){
  const size=bytes.readUInt32LE(p+18),nameLength=bytes.readUInt16LE(p+26),extra=bytes.readUInt16LE(p+28),start=p+30+nameLength+extra,end=start+size;
  if(bytes.readUInt16LE(p+6)!==0x800||bytes.readUInt16LE(p+8)!==0||bytes.readUInt32LE(p+22)!==size||end>bytes.length||files.size>=100)fail();
  const name=bytes.subarray(p+30,p+30+nameLength).toString();if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(v=>!v||v==='..')||files.has(name))fail();
  files.set(name,bytes.subarray(start,end));p=end;
 }
 if(!files.has('manifest.json'))fail();let manifest;try{manifest=JSON.parse(files.get('manifest.json'));}catch{fail();}
 if(!(Array.isArray(expectedSchema)?expectedSchema.includes(manifest.schema):manifest.schema===expectedSchema)||!Array.isArray(manifest.files))fail();
 for(const f of manifest.files){const content=files.get(f.path);if(!content||content.length!==f.bytes||digest(content)!==f.sha256)fail();}
 return {files,manifest};
}
