import {unzipSync} from '/platform/sources/app/shared/vendor/fflate-0.8.3.mjs';
const columns=['import_key','name','master_id','master_revision','category_ids','price_small_eur','price_large_eur','heading','names','place','date','slogan','seo_title','seo_description','design_file','design_page','design_id','design_fit','price_eur','action','product_id','expected_revision'];
const designColumns=['import_key','design_id','design_name','design_file','design_page','design_fit','default_design'];
export function records(matrix,{allowed=columns,required=['import_key','name'],limit=100,optional=false}={}){
  const headers=(matrix.shift()||[]).map(v=>String(v??'').replace(/^\uFEFF/,'').trim());
  if(required.some(h=>!headers.includes(h)))throw Error('Die erste Zeile muss '+required.join(', ')+' enthalten. Bitte die Vorlage verwenden.');
  if(new Set(headers).size!==headers.length||headers.some(v=>!allowed.includes(v)))throw Error('Spaltenüberschriften sind unbekannt oder doppelt. Bitte die Vorlage verwenden.');
  const result=[];
  for(const row of matrix){
    if(!row.some(v=>String(v??'').trim()))continue;
    if(row.length>headers.length&&row.slice(headers.length).some(v=>String(v??'').trim()))throw Error('Eine Zeile enthält mehr Daten als Spaltenüberschriften.');
    const item=Object.fromEntries(headers.map((key,index)=>[key,row[index]??'']));
    if(typeof item.date==='number')throw Error('Das Datum ist Designtext. Bitte die Datumsspalte als Text formatieren, zum Beispiel 14.06.2020.');
    result.push(item);
  }
  if((!optional&&!result.length)||result.length>limit)throw Error('Bitte '+(optional?'0':'1')+' bis '+limit+' ausgefüllte Zeilen verwenden.');
  return result;
}
export function parseCsv(source){
  source=source.replace(/^\uFEFF/,'');
  const first=source.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0],delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
  const matrix=[];let row=[],value='',quoted=false;
  for(let i=0;i<source.length;i++){
    const c=source[i];
    if(c==='"'){if(quoted&&source[i+1]==='"'){value+='"';i++;}else if(quoted||value==='')quoted=!quoted;else throw Error('Ungültiges Anführungszeichen in CSV.');}
    else if(c===delimiter&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&source[i+1]==='\n')i++;row.push(value);matrix.push(row);row=[];value='';}
    else value+=c;
  }
  if(quoted)throw Error('Ein Anführungszeichen in der CSV ist nicht geschlossen.');
  if(value||row.length){row.push(value);matrix.push(row);}
  return records(matrix);
}
function xml(text){const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror')||/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('Ungültige Excel-Struktur.');return doc;}
const nodes=(parent,name)=>[...parent.getElementsByTagNameNS('*',name)];
export function workbookSheets(bytes){
  let total=0;
  const files=unzipSync(bytes,{filter:file=>{
    const keep=/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/sheet[0-9]+\.xml)$/.test(file.name);
    if(keep){total+=file.originalSize;if(file.originalSize>4*1024*1024||total>12*1024*1024)throw Error('Die Excel-Datei enthält zu viele Daten. Bitte nur die Importtabelle hochladen.');}
    return keep;
  }});
  const decoder=new TextDecoder(),read=key=>{if(!files[key])throw Error('Excel-Tabelle unvollständig: '+key);return xml(decoder.decode(files[key]));};
  const book=read('xl/workbook.xml'),sheets=nodes(book,'sheet');
  const shared=files['xl/sharedStrings.xml']?nodes(read('xl/sharedStrings.xml'),'si').map(si=>nodes(si,'t').map(n=>n.textContent).join('')):[];
  function matrixFor(name,maxColumns){
  const matching=sheets.filter(n=>n.getAttribute('name')===name);
  if(matching.length!==1)throw Error('Excel-Blatt „'+name+'“ fehlt oder ist doppelt.');
  const sheet=matching[0];
  const relId=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const rel=nodes(read('xl/_rels/workbook.xml.rels'),'Relationship').find(n=>n.getAttribute('Id')===relId);
  if(!rel||rel.getAttribute('TargetMode')==='External')throw Error('Externe Tabellen werden nicht unterstützt.');
  const target=rel.getAttribute('Target').replace(/^\//,'').replace(/^xl\//,'');
  if(!/^worksheets\/sheet[0-9]+\.xml$/.test(target))throw Error('Nicht unterstützte Excel-Tabellenreferenz.');

  const rows=nodes(read('xl/'+target),'row');
  if(rows.length>10000)throw Error('Die Tabelle ist zu groß.');
  const matrix=rows.map(row=>{
    const result=[];
    for(const cell of nodes(row,'c')){
      if(nodes(cell,'f').length)throw Error('Formeln bitte zuerst als Werte einfügen. Es werden nur feste Produktdaten importiert.');
      const ref=/^([A-Z]+)[0-9]+$/.exec(cell.getAttribute('r')||'');if(!ref)throw Error('Ungültige Zelladresse.');
      const index=[...ref[1]].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
      const raw=nodes(cell,'v')[0]?.textContent||'',type=cell.getAttribute('t');
      let value=type==='s'?shared[Number(raw)]:type==='inlineStr'?nodes(cell,'t').map(n=>n.textContent).join(''):type==='e'?(()=>{throw Error('Eine Excel-Zelle enthält einen Fehler.');})():raw;
      if(value===undefined)throw Error('Ungültiger Excel-Textverweis.');
      if(type!=='s'&&type!=='inlineStr'&&type!=='str'&&value!==''&&!Number.isNaN(Number(value)))value=Number(value);
      if(index>=maxColumns){if(String(value).trim())throw Error('Daten außerhalb der vorgesehenen Spalten.');continue;}
      result[index]=value;
    }
    return result;
  });
  return matrix;
  }
  return {matrixFor,hasSheet:name=>sheets.some(n=>n.getAttribute('name')===name)};
}
export function parseWorkbook(bytes){
  const {matrixFor,hasSheet}=workbookSheets(bytes);
  return {rows:records(matrixFor('Produkte',columns.length)),designRows:hasSheet('Designs')?records(matrixFor('Designs',designColumns.length),{allowed:designColumns,required:['import_key','design_id','design_file'],limit:3000,optional:true}):[]};
}
export function parseXlsx(bytes){return parseWorkbook(bytes).rows;}
export async function readBatchImport(file){
  if(!file||file.size>5*1024*1024)throw Error('Bitte eine Excel- oder CSV-Datei bis 5 MB auswählen.');
  if(/\.xlsx$/i.test(file.name))return parseWorkbook(new Uint8Array(await file.arrayBuffer()));
  if(/\.(csv|tsv)$/i.test(file.name))return {rows:parseCsv(await file.text()),designRows:[]};
  throw Error('Unterstützt werden .xlsx, .csv und .tsv.');
}

export async function readImport(file){return (await readBatchImport(file)).rows;}
