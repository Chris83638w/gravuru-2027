import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {importEnvironment} from './design-assets.mjs';
import {renderAmazonPaperworkPdf,amazonCode128,AMAZON_PAPERWORK_RECIPE} from './amazon-paperwork-pdf.mjs';

const document=(format='A4',orderId='123-1234567-1234567')=>({schema:AMAZON_PAPERWORK_RECIPE,format,accountId:'TEST-ACCOUNT',provenance:'synthetic',marketplaceId:'A1PA6795UKMFR9',orderId,test:true,productionReady:false,lines:[{id:'amazonline_test',lineId:'ITEM-01',positionCode:'G27P-1234567890ABCDEF',sku:'TEST-SKU-01',asin:'B000TEST01',quantity:2,product:{name:'TEST · Müller & Söhne',revision:1},snapshotId:null,blockers:['snapshot-not-assigned','customization-not-approved'],customizationAvailable:true,customApproved:false,customTexts:[]}]});

test('PDF files preserve deterministic content, real page dimensions and scanner quiet/module width limits',()=>{
 const result=renderAmazonPaperworkPdf([document('A4'),document('A5','TEST-AMAZON-DESIGN-20261016')]);assert.equal(result.pageCount,2);assert.equal(result.pdf.subarray(0,8).toString(),'%PDF-1.4');assert.equal(createHash('sha256').update(result.pdf).digest('hex'),result.sha256);assert.deepEqual(renderAmazonPaperworkPdf([document('A4'),document('A5','TEST-AMAZON-DESIGN-20261016')]).pdf,result.pdf);
 assert.match(result.pdf.toString(),/\/MediaBox \[0 0 595\.2756 841\.8898\]/);assert.match(result.pdf.toString(),/\/MediaBox \[0 0 419\.5276 595\.2756\]/);
 for(const code of result.barcodes){assert.ok(code.moduleMm>=0.254);assert.ok(code.quietMm>=code.moduleMm*10);assert.ok(code.widthMm<=(code.page===0?186:124));}
 assert.equal(result.barcodes[2].value,'TEST-AMAZON-DESIGN-20261016');assert.equal(result.productionReady,false);
});

test('long literal identifiers and unsupported glyphs fail explicitly instead of shrinking or replacing data',()=>{
 assert.throws(()=>amazonCode128('x'.repeat(100),{availableWidthMm:124}),/nicht gekürzt/);assert.throws(()=>amazonCode128('123\n456'),/ASCII/);
 const unsupported=document();unsupported.lines[0].customTexts=[{label:'Text',value:'TEST 😀'}];assert.throws(()=>renderAmazonPaperworkPdf([unsupported]),/kein Ersatzzeichen/);
 assert.throws(()=>renderAmazonPaperworkPdf([{...document(),provenance:'production'}]),/Testbegleitscheine/);
});

test('long approved text continues on additional identified pages without truncation',()=>{
 const doc=document('A5');doc.lines[0].customTexts=[{label:'Text',value:'LANGE TESTPERSONALISIERUNG '.repeat(100)+' ENDE-DES-TESTTEXTES'}];doc.lines[0].customApproved=true;doc.lines[0].blockers=[];
 const result=renderAmazonPaperworkPdf([doc]);assert.ok(result.pageCount>1);assert.equal(result.barcodes.length,result.pageCount*2);assert.ok(result.pdf.includes(Buffer.from(Buffer.from('ENDE-DES-TESTTEXTES').toString('hex'))));
});

// Independent QA dependencies only: PyMuPDF, Pillow, zxing-cpp==3.0.0.
// Set GRAVURU_PYTHON and GRAVURU_BARCODE_DECODE_REQUIRED=1 in acceptance runs.
// Runtime PDF generation above uses none of these dependencies.
test('independent ZXing decoder reads every full order/position barcode from rasterized A4/A5 PDFs at 203 and 300 dpi',t=>{
 const python=process.env.GRAVURU_PYTHON||(process.platform==='win32'?'python':'python3'),options={env:importEnvironment(),windowsHide:true,maxBuffer:8*1024*1024,timeout:60000},probe=spawnSync(python,['-c','import pymupdf, zxingcpp; from PIL import Image'],options);
 if(probe.status!==0){if(process.env.GRAVURU_BARCODE_DECODE_REQUIRED==='1')assert.fail('Independent decoder dependencies missing: install PyMuPDF, Pillow, zxing-cpp==3.0.0 for GRAVURU_PYTHON.');t.skip('Independent decoder dependencies unavailable; hardware acceptance is not implied.');return;}
 const a=document('A4'),b=document('A5','TEST-AMAZON-DESIGN-20261016'),c=document('A5','TEST-'+('X'.repeat(34))),documents=[a,b,c];b.lines[0].customTexts=[{label:'Testname',value:'Müller & Söhne'}];b.lines[0].customApproved=true;const pdf=renderAmazonPaperworkPdf(documents).pdf;
 const script=`import sys,json,base64,zxingcpp
import pymupdf as fitz
from PIL import Image
doc=fitz.open(stream=base64.b64decode(sys.stdin.buffer.read()),filetype='pdf')
result=[]
for dpi in [203,300]:
 for page in doc:
  pix=page.get_pixmap(dpi=dpi,alpha=False)
  image=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
  found=zxingcpp.read_barcodes(image,formats=zxingcpp.BarcodeFormat.Code128)
  result.append({'dpi':dpi,'page':page.number,'codes':sorted([code.text for code in found]),'text':page.get_text(),'widthMm':page.rect.width*25.4/72,'heightMm':page.rect.height*25.4/72})
print(json.dumps(result))`;
 const check=spawnSync(python,['-c',script],{...options,input:pdf.toString('base64')});assert.equal(check.status,0,check.stderr?.toString()||check.error?.message);const results=JSON.parse(check.stdout);assert.equal(results.length,6);
 for(const result of results){const source=documents[result.page];assert.deepEqual(result.codes,[source.orderId,source.lines[0].positionCode].sort(),`page ${result.page} at ${result.dpi} dpi`);assert.ok(Math.abs(result.widthMm-(result.page===0?210:148))<0.01);assert.match(result.text,/NICHT ZUR FERTIGUNG FREIGEGEBEN/);assert.match(result.text,/kein Versandnachweis/);assert.match(result.text,/Menge: 2/);assert.match(result.text,/Müller & Söhne/);}
});
