import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
const [runArg,originalArg,newArg,codeArg,outArg]=process.argv.slice(2);if(!outArg)throw Error('FINAL_RUN ORIGINAL_EXCEL_DIR ADDENDA_DIR CODE OUT required');
const run=path.resolve(runArg),originalDir=path.resolve(originalArg),newDir=path.resolve(newArg),code=path.resolve(codeArg);
const {unzipSync,strFromU8}=await import(pathToFileURL(path.join(code,'app/platform/sources/app/shared/vendor/fflate-0.8.3.mjs')).href);
const decode=s=>s.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,x)=>x[0]==='#'?String.fromCodePoint(x[1].toLowerCase()==='x'?parseInt(x.slice(2),16):Number(x.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[x]));
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const textNodes=s=>[...s.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>decode(m[1])).join('');
function readWorkbook(bytes){
 const files=unzipSync(bytes),xml=p=>files[p]?strFromU8(files[p]):'',strings=[...xml('xl/sharedStrings.xml').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>textNodes(m[1])),rels=new Map([...xml('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map(m=>{const a=attrs(m[1]);return [a.Id,a.Target.startsWith('/')?a.Target.slice(1):path.posix.normalize('xl/'+a.Target)];})),sheets={};
 for(const m of xml('xl/workbook.xml').matchAll(/<sheet\b([^>]*)\/?\s*>/g)){
  const a=attrs(m[1]),file=rels.get(a['r:id']);if(!file||!files[file])throw Error('Worksheet relationship missing '+a.name);const cells={};
  for(const c of xml(file).matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
   const ca=attrs(c[1]),body=c[2]||'',f=/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(body),v=/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1];
   let value=ca.t==='s'?strings[Number(v)]:ca.t==='inlineStr'?textNodes(body):v===undefined?null:decode(v),type=['s','inlineStr','str'].includes(ca.t)?'string':ca.t||'n';
   if(type==='n'&&value!==null&&value!=='')value=Number(value);
   if(value!==null||f)cells[ca.r]={type,value,formula:f?{attributes:attrs(f[1]),text:decode(f[2]||'')}:null};
  }
  sheets[a.name]={file,cells};
 }
 return {sheets,parts:Object.fromEntries(Object.keys(files).filter(k=>/^xl\/(worksheets|tables)\//.test(k)).map(k=>[k,sha(files[k])])),text:Object.values(sheets).flatMap(s=>Object.values(s.cells).map(c=>String(c.value??''))).join('\n')};
}
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),summary=JSON.parse(fs.readFileSync(path.join(run,'summary.json'))),inputs=JSON.parse(gunzipSync(fs.readFileSync(path.join(code,'docs/reviews/2026-11-10-issue230-b/normalized-inputs.json.gz')))),newBooks=fs.readdirSync(newDir).filter(f=>/\.xlsx$/i.test(f)).map(name=>{const bytes=fs.readFileSync(path.join(newDir,name));return {name,bytes,...readWorkbook(bytes)};}),rows=[];
if(newBooks.length!==7)throw Error('Expected exactly 7 new workbooks');
for(const pair of summary.results){
 const original=fs.readFileSync(path.join(originalDir,pair.workbook)),before=readWorkbook(original),input=inputs.workbooks.find(w=>w.name===pair.workbook),matches=newBooks.filter(b=>b.sheets['BestätigteUploads']?.cells.B21?.value===pair.workbook);if(matches.length!==1)throw Error('Exactly one addendum must identify original '+pair.workbook);const after=matches[0],differences=[];
 for(const [sheet,record] of Object.entries(before.sheets)){const newSheet=after.sheets[sheet];if(!newSheet){differences.push({sheet,error:'missing original sheet'});continue;}for(const cell of new Set([...Object.keys(record.cells),...Object.keys(newSheet.cells)])){if(JSON.stringify(record.cells[cell])!==JSON.stringify(newSheet.cells[cell]))differences.push({sheet,cell,before:record.cells[cell],after:newSheet.cells[cell]});}}
 const added=Object.keys(after.sheets).filter(s=>!before.sheets[s]),addedText=added.flatMap(s=>Object.values(after.sheets[s].cells).map(c=>String(c.value??''))).join('\n'),planIds=[...new Set(addedText.match(/pgp_[\w-]+/g)||[])];
 const cells=after.sheets['BestätigteUploads'].cells,value=key=>cells[key]?.value,main=pair.workbook==='Tuerschild-Acrylglas-3mm_v4.xlsx',module=pair.moduleProfilePins[0],manifest=JSON.parse(fs.readFileSync(path.join(newDir,'Manifest.json'))),manifestRow=manifest.records.find(r=>r.original===pair.workbook);
 const checks={originalShaMatches:sha(original)===input.workbookSha256&&sha(original)===pair.excelSha256,allOriginalCellsIdentical:differences.length===0,originalSheetAndTableBytesSame:Object.entries(before.parts).every(([k,v])=>after.parts[k]===v),exactlyOneAddendum:added.length===1&&added[0]==='BestätigteUploads',exactFinalPlanId:planIds.length===1&&planIds[0]===pair.planId&&value('B24')===pair.planId,finalPlanHash:value('B25')===pair.planHash,originalShaReferenced:value('B22')===pair.excelSha256,sourcePins:value('B26')===pair.source.id&&value('B27')===pair.source.revision&&value('B28')===pair.source.sha256,templatePins:value('B29')===pair.template.id&&value('B30')===pair.template.revision&&value('B31')===pair.template.sha256,modulePins:value('B32')===module.id&&value('B33')===module.revision&&value('B34')===module.sha256,photoDecision:value('B8')===(main?'AN':'AUS')&&value('B9')===(main?999:'nicht angeboten'),logoDecision:value('B10')===(main?'AN':'AUS')&&value('B11')===(main?1299:'nicht angeboten'),motifPrice:value('B12')===169,openItemsPreserved:['C14','C15','C16','C17','C18'].every(k=>value(k)==='OFFEN'),manifestHash:manifestRow?.xlsxSha256===sha(after.bytes)&&manifest.summarySha256===sha(fs.readFileSync(path.join(run,'summary.json')))};
 rows.push({original:pair.workbook,addendum:after.name,originalSha256:sha(original),addendumSha256:sha(after.bytes),planId:pair.planId,planHash:pair.planHash,originalCells:Object.values(before.sheets).reduce((n,s)=>n+Object.keys(s.cells).length,0),addedSheets:added,checks,differences,allPassed:Object.values(checks).every(Boolean)});
}
const output={schema:'issue230-independent-excel-addenda/v1',readOnly:true,finalRun:run,rows,allPassed:rows.every(r=>r.allPassed),method:'Read-only OOXML values and formulas comparison on every original sheet/cell, independent of workbook authoring library. Shared/inline strings decoded; numeric values normalized. Formatting is not treated as a price change. Additional sheet final plan/source/module pins compared to persisted-batch summary already independently verified.'};fs.writeFileSync(outArg,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));if(!output.allPassed)process.exitCode=1;
