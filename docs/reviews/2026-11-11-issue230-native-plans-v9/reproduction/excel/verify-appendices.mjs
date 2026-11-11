import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const out=path.resolve('outputs/Produktplaene-230-v9/Excel-Nachtraege');
const manifest=JSON.parse(await fs.readFile(path.join(out,'Manifest.json'),'utf8'));
const checks=[];
for(const r of manifest.records){
 const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(out,r.output)));
 const sheet=wb.worksheets.getItemAt(0);
 assert.equal(sheet.name,'PlanstandV9');
 for(const [cell,expected]of Object.entries({B8:r.main?'AN':'AUS',B9:r.main?999:'nicht angeboten',B10:r.main?'AN':'AUS',B11:r.main?1299:'nicht angeboten',B12:169,B21:r.original,B22:r.originalSha256,B24:r.planId,B25:r.planHash,B26:r.source.id,B27:r.source.revision,B28:r.source.sha256,B32:r.moduleProfile.id,B33:r.moduleProfile.revision,B34:r.moduleProfile.sha256}))assert.equal(sheet.getRange(cell).values[0][0],expected,cell);
 assert.equal(sheet.getRange('B14').values[0][0],r.proposedStart.defaultDesignId);
 assert.equal(sheet.getRange('B15').values[0][0],r.proposedStart.sizeKey);
 assert.equal(sheet.getRange('B16').values[0][0],0.19);
 assert.equal(sheet.getRange('C18').values[0][0],'OFFEN');
 assert.equal(sheet.getRange('B44').values[0][0],true);
 assert.equal(sheet.getRange('B45').values[0][0],r.designCount);
 assert.equal(sheet.getRange('B49').values[0][0],manifest.decisionsManifestSha256);
 assert.equal(sheet.getRange('B57').values[0][0],r.source.metadataSha256);
 assert.ok(!sheet.getRange('A1:C57').values.flat().some(v=>typeof v==='string'&&/^#(REF!|DIV\/0!|VALUE!|N\/A|NAME\?|NUM!|NULL!)/.test(v)));
 const preview=await wb.render({sheetName:sheet.name,range:'A1:C57',scale:1,format:'png'});
 await fs.writeFile(path.join(out,r.output.replace('.xlsx','-Nachtrag.png')),new Uint8Array(await preview.arrayBuffer()));
 checks.push({file:r.output,artifactReimport:true,firstSheet:sheet.name,exactReferences:true,uploadValues:true,vat19Confirmed:true,startsPreserved:true,validTrue:true,executionStillOpen:true,appendixErrorCells:0,rendered:true});
 console.log(r.output+' import/values/render OK');
}
await fs.writeFile(path.join(out,'Sichtpruefung.json'),JSON.stringify({records:checks},null,2)+'\n');
process.exit(0);
