import {isFormProduct} from './form-product.mjs';
import {prepareFormBatch} from './form-batch.mjs';
import {createHash} from 'node:crypto';
import {validateProductDocument} from './product-model.mjs';
import {replaceDesignArtwork} from './design-import.mjs';

export const IMPORT_COLUMNS=['import_key','name','master_id','master_revision','category_ids','price_small_eur','price_large_eur','heading','names','place','date','slogan','seo_title','seo_description','design_file','design_page','design_id','design_fit','price_eur','action','product_id','expected_revision'];
export const DESIGN_COLUMNS=['import_key','design_id','design_name','design_file','design_page','design_fit','default_design'];
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const text=value=>value===undefined||value===null?'':String(value).trim();
const fail=message=>{throw new Error(message);};
function cents(value){
  const match=/^(\d+)(?:[.,](\d{1,2}))?$/.exec(text(value));
  if(!match)fail('Preise als Eurobetrag eingeben, beispielsweise 14,99.');
  const result=Number(match[1])*100+Number((match[2]||'').padEnd(2,'0'));
  if(!Number.isSafeInteger(result)||result>10000000)fail('Preis außerhalb des erlaubten Bereichs.');
  return result;
}
export function planBatch(repository,{rows,masterId,masterRevision,designFiles=[],designRows=[]}={},assets){
  if(!Array.isArray(rows)||!rows.length||rows.length>100)fail('Bitte 1 bis 100 Produktzeilen auswählen.');
  if(!Array.isArray(designFiles)||designFiles.length>100)fail('Bitte höchstens 100 Design-Dateizuordnungen verwenden.');
  if(!Array.isArray(designRows)||designRows.length>3000)fail('Bitte höchstens 3000 Zeilen im Blatt Designs verwenden.');
  const designGroups=new Map(),parentKeys=new Set(rows.map(r=>text(r?.import_key)));
  for(const [index,row] of designRows.entries()){
    if(!row||typeof row!=='object'||Array.isArray(row))fail('Ungültige Zeile im Blatt Designs.');
    const key=text(row.import_key);
    if(!key||!parentKeys.has(key))fail('Designs, Datensatz '+(index+1)+': import_key gehört zu keiner Produktzeile.');
    if(!designGroups.has(key))designGroups.set(key,[]);
    designGroups.get(key).push({row,line:index+1});
  }
  const sources=new Map();
  for(const entry of designFiles){
    if(!entry||typeof entry.name!=='string'||entry.name.length>200||/[\x00-\x1f\\/]/.test(entry.name)||!/\.(svg|pdf)$/i.test(entry.name)||!Number.isInteger(entry.page)||entry.page<1||entry.page>1000||!/^[a-f0-9]{64}$/.test(entry.assetId||''))fail('Ungültige Design-Dateizuordnung. Dateiname, Seite und gespeicherte Datei sind erforderlich.');
    const key=JSON.stringify([entry.name,entry.page]);if(sources.has(key))fail('Design-Dateiname und Seite sind mehrfach zugeordnet.');sources.set(key,entry);
  }
  function resolveSource(row){
    const filename=text(row.design_file);
    if(!assets)fail('Der Design-Dateispeicher ist nicht verfügbar.');
    if(/[\x00-\x1f\\/]/.test(filename)||!/\.(svg|pdf)$/i.test(filename))fail('design_file benötigt einen SVG-/PDF-Dateinamen, keinen Pfad oder Link.');
    const pageText=text(row.design_page)||'1';if(!/^[1-9][0-9]*$/.test(pageText)||Number(pageText)>1000)fail('design_page muss eine gültige Seitennummer sein.');
    const source=sources.get(JSON.stringify([filename,Number(pageText)]));
    if(!source)fail(`Design-Datei „${filename}“, Seite ${pageText}, fehlt. Bitte die zugehörige Datei auswählen und prüfen.`);
    const asset=assets.get(source.assetId);if(asset.page!==source.page||asset.format!==(filename.toLowerCase().endsWith('.pdf')?'pdf':'svg'))fail('Die gespeicherte Design-Datei passt nicht zu Dateityp oder Seite.');
    return asset;
  }
  const keys=new Set(), entries=[],report=[];
  const counts=new Map();for(const row of rows){const key=text(row?.import_key);counts.set(key,(counts.get(key)||0)+1);}
  const targets=new Map();for(const row of rows){const id=text(row?.product_id);if(id)targets.set(id,(targets.get(id)||0)+1);}
  for(const [index,row] of rows.entries()){
    let key='';
    try{
      if(!row||Array.isArray(row)||typeof row!=='object')fail('Ungültige Produktzeile.');
      for(const column of Object.keys(row))if(!IMPORT_COLUMNS.includes(column))fail(`Unbekannte Spalte: ${column}`);
      key=text(row.import_key);
      if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(key)||keys.has(key)||counts.get(key)>1)fail('Importschlüssel fehlt, ist ungültig oder kommt mehrfach vor.');
      keys.add(key);
      const action=text(row.action)||'create';if(!['create','update'].includes(action))fail('action muss create oder update sein.');
      const updating=action==='update';let id,version,master,current;
      if(updating){
        id=text(row.product_id);version=text(row.expected_revision);
        if(!/^cfg_[a-f0-9-]+$/.test(id)||!Number.isSafeInteger(Number(version))||!/^[1-9][0-9]*$/.test(version))fail('Aktualisieren benötigt product_id und expected_revision.');
        if(targets.get(id)>1)fail('Ein Produkt darf innerhalb einer Tabelle nur einmal aktualisiert werden.');
        if(text(row.master_id)||text(row.master_revision))fail('Beim Aktualisieren keine Master-ID/-Version angeben; der vorhandene Produktstand ist die Grundlage.');
        master=repository.get(id,{revision:Number(version)});current=repository.get(id);
        if(master.document.kind!=='product'||current.document.kind!=='product')fail('Tabellen aktualisieren nur Produkte, keine Mastervorlagen.');
      }else{
        if(text(row.product_id)||text(row.expected_revision))fail('Bestehende Produkt-ID benötigt ausdrücklich action=update.');
        if(text(row.master_id)&&text(row.master_id)!==masterId&&!text(row.master_revision))fail('Bei einer anderen Master-ID muss auch deren Masterversion angegeben werden.');
        id=text(row.master_id)||masterId;version=text(row.master_revision)||masterRevision;
        if(!/^[1-9][0-9]*$/.test(String(version)))fail('Bitte einen gespeicherten Masterstand auswählen.');
        master=repository.get(id,{revision:Number(version)});current=repository.get(id);
        if(master.document.kind!=='master'||current.status==='archived'||current.document.kind!=='master')fail('Die Vorlage muss ein aktiver Master sein.');
      }
      const form=isFormProduct(master.document);if(!form&&text(row.price_eur))fail('price_eur gilt für freie Formprodukte. Für die Acrylvorlage price_small_eur / price_large_eur verwenden.');
      let document=structuredClone(master.document),artwork=null,artworks=[];
      const children=designGroups.get(key)||[];
      if(children.length&&!form)fail('Das Blatt Designs unterstützt freie Formprodukte. Die bisherige Acrylvorlage verwendet design_file im Blatt Produkte.');
      if(children.length>30)fail('Pro Produkt sind höchstens 30 Designzeilen möglich.');
      if(children.length&&['design_file','design_page','design_id','design_fit'].some(k=>text(row[k])))fail('Designzuordnung entweder im Blatt Produkte oder im Blatt Designs ausfüllen, nicht gleichzeitig.');
      if(!updating){document.kind='product';document.masterId=id;document.name=text(row.name);}
      else if(text(row.name))document.name=text(row.name);
      if(!document.name)fail('Produktname fehlt.');
      if(text(row.category_ids))document.categoryIds=[...new Set(text(row.category_ids).split(',').map(v=>v.trim()).filter(Boolean))];
      if(form){if(text(row.price_eur))document.basePriceCents=cents(row.price_eur);prepareFormBatch(document,row);}
      else for(const [column,size] of [['price_small_eur','small'],['price_large_eur','large']])if(text(row[column]))document.config.acrylic.pricing.sizes[size]=cents(row[column]);
      const filename=text(row.design_file);
      if(!filename&&['design_page','design_id','design_fit'].some(field=>text(row[field])))fail('Design-Einstellungen benötigen auch design_file.');
      if(filename){
        const asset=resolveSource(row);
        if(['heading','names','place','date','slogan'].some(field=>text(row[field])))fail('Importierte Gesamtmotive haben noch keine bearbeitbaren Textfelder. Die Textspalten in dieser Zeile leer lassen.');
        if(form){const prepared=prepareFormBatch(document,row,{asset,filename});document=prepared.document;artwork=prepared.artwork;}else{
        const replacement=replaceDesignArtwork(document,assets,{designId:text(row.design_id)||document.config.profile.defaultDesignId,assetId:asset.assetId,fit:text(row.design_fit)||'visible',originalName:filename});
        document=replacement.document;
        artwork={name:filename,page:asset.page,assetId:asset.assetId,designId:replacement.designId,designName:replacement.designName,placement:replacement.placement,warnings:replacement.warnings};
        }
      }
      const childIds=new Set();let chosenDefault=null;
      for(const {row:child,line} of children){
        try{
          for(const column of Object.keys(child))if(!DESIGN_COLUMNS.includes(column))fail('Unbekannte Spalte: '+column);
          const designId=text(child.design_id),flag=text(child.default_design);
          if(!/^[a-zA-Z0-9][\w-]{0,79}$/.test(designId)||childIds.has(designId))fail('design_id fehlt, ist ungültig oder für dieses Produkt doppelt.');
          childIds.add(designId);
          if(!['','0','1'].includes(flag))fail('default_design muss leer, 0 oder 1 sein.');
          if(flag==='1'){if(chosenDefault)fail('Nur ein Standarddesign pro Produkt mit default_design=1 markieren.');chosenDefault=designId;}
          if(!text(child.design_file))fail('design_file ist im Blatt Designs erforderlich.');
          const asset=resolveSource(child),prepared=prepareFormBatch(document,child,{asset,filename:text(child.design_file),allowNewDesign:true,designName:text(child.design_name)});
          document=prepared.document;artworks.push(prepared.artwork);
        }catch(error){fail('Designs, Datensatz '+line+': '+error.message);}
      }
      if(chosenDefault)document.defaultDesignId=chosenDefault;
      for(const a of artworks)a.default=a.designId===document.defaultDesignId;
      for(const field of ['heading','names','place','date','slogan'])if(text(row[field])){
        let replaced=false;
        for(const design of document.config.profile.designs)for(const object of design.objects||[])if(object.type==='text'&&object.fieldKey===field){object.text=text(row[field]);replaced=true;}
        if(!replaced)fail(`Der Master besitzt kein Textfeld „${field}“.`);
      }
      for(const field of ['title','description'])if(text(row['seo_'+field]))document.seo[field]=text(row['seo_'+field]);
      const validated=validateProductDocument(document);
      if(form){if(!assets&&validated.designs?.length)fail('Der Design-Dateispeicher ist für diesen Master erforderlich.');for(const design of validated.designs||[]){if(assets.get(design.assetId).sourceSha256!==design.sourceSha256)fail('Die Designquelle wurde verändert.');}repository.validate(validated);}
      else if(assets)assets.validateDocument(validated);
      else if(validated.config.localResources.motifs.some(m=>m.artwork))fail('Der Design-Dateispeicher ist für diesen Master erforderlich.');
      const fingerprint=hash(updating?{action,productId:id,expectedRevision:Number(version),document:validated}:{masterId:id,masterRevision:Number(version),document:validated});
      const existing=repository.importItem(key);
      if(existing&&existing.fingerprint!==fingerprint)fail('Dieser Importschlüssel ist schon mit anderen Daten verknüpft. Neuen Schlüssel verwenden oder bestehenden Artikel bearbeiten.');
      if(updating&&!existing&&(current.revision!==Number(version)||current.status==='archived'))fail('Das Produkt wurde zwischenzeitlich geändert oder archiviert. Aktuellen Stand prüfen und expected_revision anpassen.');
      if(updating&&existing&&existing.id!==id)fail('Importschlüssel gehört zu einem anderen Produkt.');
      if(updating&&JSON.stringify(validated)===JSON.stringify(master.document))fail('Die Zeile enthält keine Änderung.');
      const update=updating?{action,productId:id,expectedRevision:Number(version)}:{};
      entries.push({key,fingerprint,document:validated,...update});
      report.push({row:index+1,key,name:validated.name,status:existing?'existing':'ready',id:existing?.id,...(updating?{...update,changes:[...Object.keys(row).filter(k=>!['action','product_id','expected_revision','import_key','master_id','master_revision'].includes(k)&&text(row[k])),...(children.length?['Designs']:[])],previousName:master.document.name}:{masterId:id,masterRevision:Number(version)}),...(form?{formProduct:true,geometry:{widthMm:validated.form.geometry.widthMm,heightMm:validated.form.geometry.heightMm,holeCount:validated.form.geometry.holeCount},material:validated.material.id,method:validated.processingMethod,prices:{base:validated.basePriceCents}}:{prices:validated.config.acrylic.pricing.sizes}),...(artwork?{artwork}:{}),...(artworks.length?{artworks,designCount:validated.designs.length,defaultDesignId:validated.defaultDesignId,defaultDesignName:validated.designs.find(d=>d.id===validated.defaultDesignId)?.name}:{})});
    }catch(error){report.push({row:index+1,key,name:text(row?.name),status:'error',message:error.message});}
  }
  const valid=report.every(row=>row.status!=='error');
  return {valid,report,token:entries.length?hash({rows,masterId,masterRevision,designFiles,...(designRows.length?{designRows}:{}),entries:entries.map(e=>({key:e.key,fingerprint:e.fingerprint}))}):null,entries};
}
export function commitBatch(repository,input,assets){
  const plan=planBatch(repository,input,assets);
  if(!plan.entries.length||!plan.valid&&input.skipErrors!==true)throw Object.assign(Error('Die Serie enthält Fehler. Bitte die markierten Zeilen korrigieren oder ausdrücklich nur gültige Datensätze anlegen.'),{status:422,code:'batch_invalid'});
  if(!input.token||input.token!==plan.token)throw Object.assign(Error('Die Importdaten haben sich geändert. Bitte erneut prüfen.'),{status:409,code:'batch_changed'});
  return {products:repository.importBatch(plan.entries),errors:plan.report.filter(row=>row.status==='error')};
}
