// Existing v9 Artifact reimport check, specialized for six additive sheets in one workbook.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {FileBlob,SpreadsheetFile} from './artifact-runtime.mjs';
import {argumentsFor,sha,writeNew,writeJson} from './inputs.mjs';
const args=argumentsFor(process.argv.slice(2),['build-dir']);
const out=path.resolve(args['build-dir']);
const index=JSON.parse(await fs.readFile(path.join(out,'appendix-index.json'),'utf8'));
const manifest=JSON.parse(await fs.readFile(path.join(out,'Manifest.json'),'utf8'));
const filename=path.join(out,manifest.output);
assert.equal(sha(await fs.readFile(filename)),manifest.xlsxSha256);
assert.equal(sha(await fs.readFile(path.join(out,'appendix-index.json'))),manifest.indexSha256);
const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(filename));
const checks=[];
for(let i=0;i<index.sheets.length;i++) {
 const spec=index.sheets[i],s=wb.worksheets.getItemAt(i);assert.equal(s.name,spec.name);
 assert.equal(s.getRange('A2').values[0][0],spec.title);
 const values=s.getRangeByIndexes(6,0,spec.body.length+1,spec.headers.length).values;
 const formulaCells=Object.fromEntries(spec.formulas);
 for(const [r,row]of [spec.headers,...spec.body].entries())for(const [c,expected]of row.entries()) {
   const cell=String.fromCharCode(65+c)+(r+7);
   if(cell in formulaCells)assert.equal(s.getRange(cell).formulas[0][0],formulaCells[cell]);
   else if(expected!==null)assert.equal(values[r][c],expected,`${s.name}!${cell}`);
 }
 assert(!values.flat().some(v=>typeof v==='string'&&/^#(REF!|DIV\/0!|VALUE!|N\/A|NAME\?|NUM!|NULL!|SPILL!|CALC!)/.test(v)));
 const image=await wb.render({sheetName:s.name,range:spec.renderRange,scale:1,format:'png'});
 await writeNew(path.join(out,s.name+'-Reimport.png'),new Uint8Array(await image.arrayBuffer()));
 checks.push({sheet:s.name,exactValuesAndFormulas:true,errorCells:0,rendered:true});
}
await writeJson(path.join(out,'Sichtpruefung.json'),{schema:'gravuru-main-v7-artifact-reimport/v1',xlsxSha256:manifest.xlsxSha256,reviewHash:manifest.reviewHash,checks,visuallyReviewed:false});
console.log(JSON.stringify({reimported:true,sheets:checks.length,visualReadingStillRequired:true}));
process.exit(0);
