import {createHash} from 'node:crypto';

const fail=message=>{throw Object.assign(Error(message),{status:422,code:'amazon_paperwork_pdf'});};
export const AMAZON_PAPERWORK_RECIPE='gravuru-amazon-paperwork/v1';
export const AMAZON_PAPERWORK_FORMATS=Object.freeze({A4:[210,297],A5:[148,210]});
// Code 128 symbol widths (ISO/IEC 15417), in module units. Set B preserves the
// complete literal ID; no truncation, FNC1, GS1 reinterpretation, or network URL.
const patterns=('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112').split(' ');

export function amazonCode128(value,{availableWidthMm=186}={}){
 if(typeof value!=='string'||!value.length||value.length>128||/[^\x20-\x7e]/.test(value))fail('Barcode benötigt eine vollständige druckbare ASCII-Kennung.');
 const symbols=[104,...Array.from(value,c=>c.charCodeAt(0)-32)],checksum=symbols.reduce((sum,n,i)=>sum+n*(i||1),0)%103;symbols.push(checksum,106);
 const widths=symbols.flatMap(n=>Array.from(patterns[n],Number)),modules=widths.reduce((sum,n)=>sum+n,0),quietModules=12,moduleMm=Math.min(0.33,availableWidthMm/(modules+quietModules*2));
 // Three dots at 300 dpi, with 12X whitespace on each side. Never shrink below
// this floor to squeeze a long synthetic identifier onto the selected paper.
 if(!Number.isFinite(moduleMm)||moduleMm<0.254)fail('Vollständige Kennung ist für diesen Begleitschein zu lang. Bitte A4 verwenden; der Barcode wird nicht gekürzt.');
 return {value,widths,modules,moduleMm,quietModules,quietMm:quietModules*moduleMm,widthMm:(modules+quietModules*2)*moduleMm};
}

const cp1252=new Map(Object.entries({'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159}));
function encoded(text){return Buffer.from(Array.from(text,c=>{const n=c.codePointAt(0);if((n>=32&&n<=126)||(n>=160&&n<=255))return n;if(cp1252.has(c))return cp1252.get(c);fail('Begleitschein enthält nicht unterstützte Schriftzeichen. Text unverändert prüfen; es wurde kein Ersatzzeichen gedruckt.');})).toString('hex');}
const mm=value=>value*72/25.4,num=value=>Number(value.toFixed(4));
const labels={cancelled:'Storniert', 'cancellation-requested':'Stornierung angefragt','conflicting-source-events':'Widersprüchliche Bestelldaten','item-missing-in-latest-order':'Position fehlt im neuesten Auftrag','snapshot-not-assigned':'Gesicherte Gestaltung fehlt','snapshot-quantity-unverified':'Menge der Gestaltung nicht verifiziert','order-changed-after-assignment':'Auftrag nach Gestaltungszuordnung geändert','order-not-ready':'Amazon-Auftrag noch nicht bereit','merchant-fulfillment-not-confirmed':'Eigener Versand nicht bestätigt','customization-not-approved':'Personalisierung fehlt oder ist nicht freigegeben','empty-quantity':'Menge fehlt'};
function wrap(text,width,fontSize=9){
 const count=Math.floor(mm(width)/(fontSize*0.6));if(count<10)fail('Unzureichende Textbreite.');const rows=[];
 for(const paragraph of String(text).replace(/\t/g,'    ').split(/\r\n|\r|\n/)){let rest=paragraph;if(!rest)rows.push('');while(rest){let end=Math.min(count,rest.length);if(end<rest.length){const space=rest.lastIndexOf(' ',end);if(space>count/2)end=space;}rows.push(rest.slice(0,end));rest=rest.slice(end).replace(/^ +/,'');}}
 return rows;
}
function writePdf(pages){
 const objects=[null,'<< /Type /Catalog /Pages 2 0 R >>',null,'<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>'],kids=[];
 for(const page of pages){const id=objects.length,stream=page.commands.join('\n')+'\n';kids.push(id+' 0 R');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(mm(page.width))} ${num(mm(page.height))}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${id+1} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}endstream`);}
 objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;const chunks=[Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n','latin1')],offsets=[0];let length=chunks[0].length;
 for(let i=1;i<objects.length;i++){offsets[i]=length;const bytes=Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`,'ascii');chunks.push(bytes);length+=bytes.length;}
 const xref=length;chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,'ascii'));return Buffer.concat(chunks);
}

/** Frozen, non-PII test documents only. One position per page; long approved
 * synthetic texts continue on clearly identified pages. No printing side effects. */
export function renderAmazonPaperworkPdf(input){
 const documents=Array.isArray(input)?input:input?.documents;if(!Array.isArray(documents)||!documents.length||documents.length>100)fail('Mindestens einen und höchstens 100 Begleitschein-Aufträge auswählen.');
 const pages=[],barcodes=[];
 for(const document of documents){
  if(document?.schema!==AMAZON_PAPERWORK_RECIPE||document.test!==true||document.productionReady!==false||!['sandbox','synthetic','anonymized'].includes(document.provenance)||!AMAZON_PAPERWORK_FORMATS[document.format]||!Array.isArray(document.lines)||!document.lines.length)fail('Nur gesicherte Amazon-Testbegleitscheine sind zulässig.');
  const [width,height]=AMAZON_PAPERWORK_FORMATS[document.format],margin=12,bodyWidth=width-2*margin;
  for(const [index,line] of document.lines.entries()){
   const body=[`SKU: ${line.sku??'nicht vorhanden'}`,`ASIN: ${line.asin??'nicht vorhanden'}   Menge: ${line.quantity}`,`Produkt: ${line.product?.name??'noch nicht zugeordnet'}`,`Produktstand: ${line.product?.revision??'offen'}`,`Gestaltung: ${line.snapshotId??'FEHLT'}`];
   if(line.blockers?.length)body.push('OFFENE PRÜFPUNKTE:',...line.blockers.map(b=>'! '+(labels[b]||b)));
   if(line.customTexts?.length)body.push('FREIGEGEBENE TEST-PERSONALISIERUNG:',...line.customTexts.map(t=>t.label+': '+t.value));else if(line.customizationAvailable||line.customPresent)body.push(line.customApproved?'Keine Textfelder manuell zugeordnet.':'PERSONALISIERUNG FEHLT ODER IST UNGEPRÜFT.');
   if(line.customReference?.imageSha256?.length)body.push(`Test-Bilddateien: ${line.customReference.imageSha256.length}. Keine Bildwiedergabe oder geometrische Zuordnung.`);
   const rows=body.flatMap(text=>wrap(text,bodyWidth));let offset=0,part=0;
   do{
    if(pages.length>=200)fail('Der Stapel überschreitet 200 Seiten. Bitte kleinere Stapel wählen.');const page={width,height,commands:[]},pageIndex=pages.length;pages.push(page);part++;
    const text=(value,x,y,size=9,bold=false)=>page.commands.push(`BT /F${bold?2:1} ${size} Tf 1 0 0 1 ${num(mm(x))} ${num(mm(height-y))} Tm <${encoded(value)}> Tj ET`);
    const barcode=(value,y,h)=>{const code=amazonCode128(value,{availableWidthMm:bodyWidth}),x=(width-code.widthMm)/2;let left=x+code.quietMm;for(const [i,units] of code.widths.entries()){if(i%2===0)page.commands.push(`${num(mm(left))} ${num(mm(height-y-h))} ${num(mm(units*code.moduleMm))} ${num(mm(h))} re f`);left+=units*code.moduleMm;}barcodes.push({page:pageIndex,value,x,y,widthMm:code.widthMm,heightMm:h,moduleMm:code.moduleMm,quietMm:code.quietMm});};
    text('gravuru | TEST-Begleitschein',margin,16,12,true);text('NICHT ZUR FERTIGUNG FREIGEGEBEN',margin,23,10,true);
    text('Amazon-Auftrag (vollständige Kennung)',margin,30,8);barcode(document.orderId,34,15);text(document.orderId,margin,54,10,true);
    text(`${document.provenance} | ${document.marketplaceId}`,margin,60,8);text(`Position ${index+1}/${document.lines.length}${part>1?' | Fortsetzung '+part:''}`,margin,67,9,true);
    barcode(line.positionCode,71,12);text(line.positionCode,margin,88,10,true);
    const limit=Math.floor((height-27-97)/4.4),chunk=rows.slice(offset,offset+limit);if(limit<1)fail('Papierformat zu klein.');for(const [i,row] of chunk.entries())text(row,margin,97+i*4.4,9);offset+=chunk.length;
    text('Nur interne Testbearbeitung; kein Versandnachweis.',margin,height-17,7.5);text('Druck: tatsächliche Größe / 100%, ohne Anpassung.',margin,height-12,7.5);
   }while(offset<rows.length);
  }
 }
 const pdf=writePdf(pages);return {pdf,sha256:createHash('sha256').update(pdf).digest('hex'),pageCount:pages.length,barcodes,test:true,productionReady:false};
}
