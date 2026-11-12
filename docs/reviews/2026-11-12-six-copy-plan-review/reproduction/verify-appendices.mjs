// Reimport actual final XLSX with Artifact; manual image reading remains separate.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {argumentsFor,sha,writeNew,writeJson} from './inputs.mjs';
import {FileBlob,SpreadsheetFile} from './artifact-runtime.mjs';
const args=argumentsFor(process.argv.slice(2),['build-dir']),out=path.resolve(args['build-dir']);
const indexBytes=await fs.readFile(path.join(out,'appendix-index.json')),index=JSON.parse(indexBytes);
const manifest=JSON.parse(await fs.readFile(path.join(out,'Manifest.json'),'utf8'));
assert.equal(sha(indexBytes),manifest.indexSha256);assert.equal(index.records.length,6);
const checks=[];
for(const row of index.records){
 const record=manifest.records.find(x=>x.key===row.key),file=path.join(out,record.output);
 assert.equal(sha(await fs.readFile(file)),record.xlsxSha256);
 const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(file)),s=wb.worksheets.getItemAt(0),spec=row.sheet;
 assert.equal(s.name,spec.name);assert.equal(s.getRange('A2').values[0][0],spec.title);
 const values=s.getRangeByIndexes(6,0,spec.body.length+1,3).values;
 for(const [r,rowValues]of [spec.headers,...spec.body].entries())for(const[c,expected]of rowValues.entries())assert.equal(values[r][c],expected,`${row.output}!${r},${c}`);
 assert(!values.flat().some(v=>typeof v==='string'&&/^#(REF!|DIV\/0!|VALUE!|N\/A|NAME\?|NUM!|NULL!|SPILL!|CALC!)/.test(v)));
 const images=[];for(const[i,range]of spec.renderRanges.entries()){const name=row.output+`-Reimport-${i+1}.png`,image=await wb.render({sheetName:s.name,range,scale:1,format:'png'});await writeNew(path.join(out,name),new Uint8Array(await image.arrayBuffer()));images.push(name);}
 checks.push({key:row.key,xlsxSha256:record.xlsxSha256,exactNewValues:true,errorCells:0,reimported:true,images});
}
await writeJson(path.join(out,'Sichtpruefung.json'),{schema:'gravuru-six-copy-plan-artifact-reimport/v1',checks,visuallyReviewed:false});
console.log(JSON.stringify({reimported:6,newSheets:6,visualReadingStillRequired:true}));
process.exit(0);
