// PR184 / issue 85: original identities and explicit supplier targets, never inferred sizes.
import {createHash} from 'node:crypto';

export const BATCH_MATERIALS=Object.freeze({
 'steel-door-signs':{key:'steel',label:'Edelstahl',kind:'steel'},
 'acryl-3mm-tuerschilder-schwarz':{key:'acrylic-schwarz-3mm',label:'Acrylglas Schwarz · 3 mm',kind:'acrylic'},
 'acryl-3mm-tuerschilder-anthrazit':{key:'acrylic-anthrazit-3mm',label:'Acrylglas Anthrazit · 3 mm',kind:'acrylic'}
});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const batchHash=value=>createHash('sha256').update(value).digest('hex');
export const nativeBatchProductKey=(batch,family,size,chunk)=>'batch:'+batchHash(batch).slice(0,12)+':'+batchHash(family+'|'+size).slice(0,16)+':'+chunk;
export function supplierDesignBlockers(source){
 const reasons=[...(source.blocker||[])];
 if(!['vorbereitet','geliefert'].includes(source.zustand))reasons.push(...(source.zustandGrund||[]),'Lieferstatus: '+source.zustand);
 if(source.mitFoto)reasons.push('Fotovorlage benötigt einen gesondert geprüften Fotoressourcenadapter.');
 return [...new Set(reasons)];
}
export function assertBatchManifest(manifest,batchId){
 if(manifest.schema!=='gravuru-gesamtuebergabe/v1'||manifest.art!=='stapel'||manifest.stapel?.id!==batchId||!/^1-tuerschilder-edelstahl-acryl--[a-z0-9-]+$/.test(batchId))throw Error('Unsupported or mismatched delivery batch.');
 if(!Array.isArray(manifest.designs)||!Array.isArray(manifest.rohlinge)||!Array.isArray(manifest.verweiseAufMaster))throw Error('Invalid batch arrays.');
 const ids=new Set();
 for(const source of manifest.designs){
  if(typeof source.id!=='string'||!source.id||/[\\/\x00-\x1f]/.test(source.id)||ids.has(source.id))throw Error('Invalid or duplicate source ID: '+source.id);
  ids.add(source.id);
  if(!Array.isArray(source.ziele))throw Error('Explicit targets missing: '+source.id);
  const targets=new Set();
  for(const goal of source.ziele){
   if(!BATCH_MATERIALS[goal.familie]||!Array.isArray(goal.groessen))throw Error('Unsupported explicit family: '+goal.familie);
   for(const size of goal.groessen){
    const mm=goal.groessenMm?.[size],identity=goal.familie+'|'+size;
    if(targets.has(identity)||!Array.isArray(mm)||mm.length!==2||!mm.every(n=>Number.isFinite(n)&&n>0))throw Error('Invalid or duplicate explicit target: '+identity);
    targets.add(identity);
   }
  }
 }
 return manifest;
}
/** Existing native targets retain their original group, IDs, edits and revisions. */
export function reusedBatchTarget(source,goal,sizeKey,existingPack){
 const old=existingPack?.originals?.find(row=>row.id===source.id);if(!old)return null;
 if(old.sourceVersion!==source.version)throw Error('Existing original has conflicting source bytes: '+source.id);
 const material=BATCH_MATERIALS[goal.familie];
 const matches=(old.targets||[]).filter(t=>t.sizeKey===sizeKey&&(t.reviewMaterial||old.reviewMaterial)?.key===material.key);
 if(matches.length>1)throw Error('Ambiguous existing native target: '+source.id+'/'+sizeKey);
 const target=matches[0];if(!target)return null;
 if(target.familyId&&target.familyId!==goal.familie||!equal(target.mm,goal.groessenMm[sizeKey])||target.status!=='prepared'||!target.productKey||!target.nativeDesignId)throw Error('Existing target is incompatible: '+source.id+'/'+sizeKey);
 return {...structuredClone(target),reviewMaterial:structuredClone(material)};
}
/** Limit templates and resources before creating a native document. */
export function chunkNativeEntries(entries,{maxDesigns=60,maxFonts=62}={}){
 if(!Number.isInteger(maxDesigns)||maxDesigns<1||maxDesigns>60||!Number.isInteger(maxFonts)||maxFonts<1||maxFonts>62)throw Error('Invalid native chunk limit.');
 const chunks=[];let current=[],fonts=new Set();
 for(const entry of entries){
  const used=entry.template.objects.filter(o=>o.type==='text').map(o=>o.font),next=new Set([...fonts,...used]);
  if(new Set(used).size>maxFonts)throw Error('Single design exceeds native font limit.');
  if(current.length&&(current.length>=maxDesigns||next.size>maxFonts)){chunks.push(current);current=[];fonts=new Set();}
  current.push(entry);used.forEach(f=>fonts.add(f));
 }
 if(current.length)chunks.push(current);return chunks;
}
/** Master text fitting is already present in the supplied SVG. Applying the factor
 * again would distort the original. Unknown fitting modes must stay open. */
export function verifyDeliveredTextFit(source,master,parsed){
 const records=source.textEinpassung||[],texts=parsed.layers.filter(l=>l.kind==='text');
 return records.map(fit=>{
  if(!Number.isInteger(fit.textIndex)||fit.textIndex<0||!fit.hinweis?.includes('bereits angewandte Größenänderung'))throw Error('Text-Einpassung ist nicht als bereits angewandt belegt.');
  const original=master.json.texts?.[fit.textIndex],layer=texts[fit.textIndex];
  if(!original||!layer||String(original.text).trim()!==String(fit.text).trim()||layer.text.trim()!==String(fit.text).trim()||layer.font!==fit.ersatz||original.font!==fit.ersatz)throw Error('Text-Einpassung passt nicht zum Originaltext: '+fit.textIndex);
  if(Number.isFinite(original.sizePt)&&Math.abs(layer.size-original.sizePt*25.4/72)>.02)throw Error('Gelieferte Textgröße weicht von design.json ab: '+fit.textIndex);
  if(Number.isFinite(original.sizePtOriginal)&&Number.isFinite(fit.faktor)&&Math.abs(original.sizePt/original.sizePtOriginal-fit.faktor)>.011)throw Error('Text-Einpassungsfaktor passt nicht zur Originalgröße: '+fit.textIndex);
  return {...structuredClone(fit),application:'already-applied-in-source-svg',baselineMm:[layer.x,layer.y],nativeAnchor:layer.anchor,sourceSizeMm:layer.size};
 });
}
export function batchVisualIssues(source){
 return (source.befunde||[]).filter(f=>f.text?.includes('Ersatz unsicher, bitte ansehen')).map(f=>({code:'uncertain-font-replacement',message:f.text,sourceCategory:f.kategorie}));
}
