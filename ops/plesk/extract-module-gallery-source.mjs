import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>{throw Object.assign(Error('Galerie-Metadaten nicht bestätigt: '+code),{code});};
const pick=(value,keys)=>Object.fromEntries(keys.filter(key=>value?.[key]!==undefined).map(key=>[key,value[key]]));
function readPinned(filename,expected,maxBytes){
 if(!path.isAbsolute(filename)||fs.realpathSync(filename)!==filename||!/^[a-f0-9]{64}$/.test(expected||''))fail('source_path_or_pin');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
 try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size<1||stat.size>maxBytes)fail('source_size');
  const bytes=fs.readFileSync(fd);if(bytes.length!==stat.size||sha(bytes)!==expected)fail('source_changed');
  return JSON.parse(bytes.toString('utf8'));
 }finally{fs.closeSync(fd);}
}

/** Reads two pinned JSON files once; never opens a database or product file. */
export function extractModuleGallerySource({manifestFilename,importsFilename,manifestSha256,importsSha256,originalIds}={}){
 if(!Array.isArray(originalIds)||!originalIds.length||originalIds.length>500||new Set(originalIds).size!==originalIds.length||originalIds.some(id=>typeof id!=='string'||!id||id.length>200))fail('original_ids');
 const wanted=new Set(originalIds),pack=readPinned(manifestFilename,manifestSha256,200*1024*1024),imports=readPinned(importsFilename,importsSha256,16*1024*1024);
 if(!['gravuru-design-original-review/v1','gravuru-slate-original-review/v1'].includes(pack.schema)||pack.reviewOnly!==true||pack.released!==false||!Array.isArray(pack.originals)||!Array.isArray(pack.products)||imports.localOnly!==true||imports.published!==false||imports.shopifyWrites!==0||!Array.isArray(imports.products))fail('source_schema');
 const matched=pack.originals.filter(o=>wanted.has(o.id)||wanted.has(o.sourceOriginalId));
 const keys=new Set(matched.flatMap(o=>(o.targets||[]).map(t=>t.productKey)).filter(Boolean));
 const nativeIds=new Set(matched.flatMap(o=>(o.targets||[]).map(t=>t.nativeDesignId)).filter(Boolean));
 const cardIds=new Set(matched.map(o=>o.id));
 const relevant=p=>keys.has(p.key)||(p.designIds||[]).some(id=>wanted.has(id)||cardIds.has(id)||nativeIds.has(id));
 const originals=matched.map(o=>({...pick(o,['id','sourceOriginalId','source','sourceVersion','reviewMaterial','sourcePlateMm','process','group','subcategory','catalogueReview','sourceIdentityNote']),
  files:(o.files||[]).map(f=>pick(f,['name','file','sha256','bytes'])),
  targets:(o.targets||[]).map(t=>pick(t,['status','productKey','nativeDesignId','familyId','sizeKey','mm','reviewMaterial','templateHash','fit','issues','reason','layoutIssues','visualReviewIssues']))}));
 const products=pack.products.filter(relevant).map(p=>pick(p,['key','file','designIds','defaultDesignId','familyId','sizeKey','reviewMaterial','mm']));
 const importRows=imports.products.filter(relevant).map(p=>pick(p,['key','productId','revision','designIds','defaultDesignId','documentHash','reviewOnly']));
 const present=new Set(matched.flatMap(o=>[o.id,o.sourceOriginalId]).filter(Boolean));
 return {schema:'gravuru-module-gallery-source-metadata/v1',readOnly:true,manifestSha256,importsSha256,
  source:{manifestFilename,importsFilename,catalogueCommit:pack.catalogueCommit,deliveryCommit:pack.deliveryCommit,originalCount:pack.originals.length,productCount:pack.products.length,importCount:imports.products.length},
  requestedOriginalIds:[...originalIds],missingOriginalIds:originalIds.filter(id=>!present.has(id)),originals,products,imports:importRows,
  sourceReviewUpdates:(pack.sourceReviewUpdates||[]).filter(o=>wanted.has(o.id)||wanted.has(o.sourceOriginalId)).map(o=>pick(o,['id','sourceOriginalId','source','sourceStandConflict']))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [manifestFilename,importsFilename,manifestSha256,importsSha256,idsFilename,outputFilename]=process.argv.slice(2);
  if(process.argv.length!==8||!path.isAbsolute(idsFilename)||!path.isAbsolute(outputFilename)||fs.existsSync(outputFilename))fail('arguments');
  const raw=fs.readFileSync(idsFilename);if(raw.length>100000)fail('original_ids_size');
  const parsed=JSON.parse(raw),originalIds=Array.isArray(parsed)?parsed:parsed.originalIds;
  const result=extractModuleGallerySource({manifestFilename,importsFilename,manifestSha256,importsSha256,originalIds});
  const bytes=gzipSync(Buffer.from(JSON.stringify(result)),{level:9});fs.writeFileSync(outputFilename,bytes,{flag:'wx',mode:0o600});
  console.log(JSON.stringify({ok:true,file:outputFilename,sha256:sha(bytes),bytes:bytes.length,requested:originalIds.length,matched:originalIds.length-result.missingOriginalIds.length,originalCards:result.originals.length,products:result.products.length,imports:result.imports.length,databaseOpened:false,sourceWritten:false}));
 }catch(e){console.log(JSON.stringify({ok:false,code:e.code||'metadata_failed',databaseOpened:false,sourceWritten:false}));process.exitCode=1;}
}
