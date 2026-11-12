import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {FileBlob,SpreadsheetFile} from './artifact-runtime.mjs';
const out=path.resolve(process.argv[2]),index=JSON.parse(await fs.readFile(path.join(out,'appendix-index.json'),'utf8')),manifest=JSON.parse(await fs.readFile(path.join(out,'Manifest.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),checks=[];
for(const r of index.records){
 const file=path.join(out,r.output),bytes=await fs.readFile(file),pin=manifest.records.find(p=>p.group===r.group);
 if(sha(bytes)!==pin.xlsxSha256)throw Error('XLSX changed');
 const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file));
 const images=[];let cellsCompared=0;
 for(const s of r.sheets){
  const sheet=wb.worksheets.getItem(s.name);
  if(sheet.getRange('A2').values[0][0]!==s.title)throw Error('Title mismatch');
  const expected=[s.headers,...s.body],got=sheet.getRangeByIndexes(s.headerRow-1,0,expected.length,s.headers.length).values;
  for(let i=0;i<expected.length;i++)for(let j=0;j<expected[i].length;j++){const a=got[i][j],b=expected[i][j];if(b===''?(a!==''&&a!==null&&a!==undefined):a!==b)throw Error('Cell mismatch '+r.group+'/'+s.name+'/'+i+'/'+j);cellsCompared++;}
  let nr=0;for(const range of s.renderRanges){const img=await wb.render({sheetName:s.name,range,scale:1,format:'png'});const name=r.output+'.'+s.name+'-'+(++nr)+'-Reimport.png';await fs.writeFile(path.join(out,name),new Uint8Array(await img.arrayBuffer()),{flag:'wx'});images.push({name,sheet:s.name,range});}
  const inspected=await wb.inspect({kind:'table',range:s.name+'!A'+s.headerRow+':'+String.fromCharCode(64+s.headers.length)+(s.headerRow+Math.min(11,s.body.length)),include:'values,formulas',maxChars:3500,tableMaxRows:12,tableMaxCols:s.headers.length});
  await fs.writeFile(path.join(out,r.output+'.'+s.name+'.reimport-inspection.jsonl'),inspected.ndjson,{flag:'wx'});
 }
 checks.push({group:r.group,xlsxSha256:pin.xlsxSha256,allNewCellValuesMatch:true,cellsCompared,images,visuallyReviewed:false});
 console.log(JSON.stringify({group:r.group,newCellsMatch:true,images:images.length}));
}
await fs.writeFile(path.join(out,'Reimportpruefung.json'),JSON.stringify({schema:'issue230-main-v8-artifact-reimport/v1',allPassed:true,workbooks:1,records:checks,visuallyReviewed:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({workbooks:1,images:7,allPassed:true,visualReview:'separate actual inspection required'}));
