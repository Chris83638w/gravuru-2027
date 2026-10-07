// Relative import references only. Never used as filesystem paths or fetch URLs.
export function isRelativeSourcePath(value) {
  if(typeof value!=='string'||value.length>512||value!==value.trim()||/[\x00-\x1f\x7f\\:%?#]/.test(value))return false;
  const parts=value.split('/');
  return parts.length<=16&&parts.every(part=>part&&part!=='.'&&part!=='..'&&part===part.trim()&&part.length<=200);
}
export const isDesignSourcePath=value=>isRelativeSourcePath(value)&&/\.(svg|pdf)$/i.test(value);
export const designSourceName=value=>value.split('/').at(-1);

/** Workbook defaults only describe selected sources; they never grant file access. */
export function designSourceSettings(value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['schema_version','design_root'].includes(key)))throw Error('Einstellungen: Nur schema_version und design_root sind erlaubt.');
  const version=String(value.schema_version??'1').trim();
  if(version!=='1')throw Error('Einstellungen: schema_version muss 1 sein.');
  const root=value.design_root??'';
  if(typeof root!=='string'||root!==''&&!isRelativeSourcePath(root))throw Error('Einstellungen: design_root benötigt einen relativen Ordnerpfad mit / oder bleibt leer. Keine Links, absoluten oder übergeordneten Pfade.');
  return {schema_version:'1',design_root:root};
}

export function resolveDesignSourcePath(row,settings={}) {
  const defaults=designSourceSettings(settings),folder=row.design_folder??'';
  if(typeof folder!=='string'||folder!==''&&folder!=='.'&&!isRelativeSourcePath(folder))throw Error('design_folder benötigt einen relativen Ordnerpfad, . für die Auswahlwurzel oder bleibt leer für den gemeinsamen Ordner.');
  const file=String(row.design_file??'').trim();
  if(!file){if(folder)throw Error('design_folder benötigt auch design_file.');return '';}
  if(!isDesignSourcePath(file))throw Error('design_file benötigt einen SVG-/PDF-Dateinamen oder relativen Unterordnerpfad mit /. Keine absoluten Pfade, übergeordneten Ordner oder Links.');
  const root=folder==='.'?'':folder||defaults.design_root,path=root?root+'/'+file:file;
  if(!isDesignSourcePath(path))throw Error('Der zusammengesetzte Designpfad ist zu lang oder enthält zu viele Unterordner.');
  return path;
}

/** Index user-selected files without reading bytes or guessing by basename. */
export function indexDesignSources(files=[],folderFiles=[]) {
  if(files.length+folderFiles.length>5000)throw Error('Bitte einen kleineren Ordner mit höchstens 5000 Einträgen auswählen.');
  const sources=new Map();let ignored=0,root=null;
  const add=(name,file)=>{
    if(!isDesignSourcePath(name))throw Error('Ungültiger relativer Designpfad: '+name+'. Nur Unterordner mit / verwenden, keine Links oder übergeordneten Pfade.');
    if(sources.has(name))throw Error('Der Designpfad „'+name+'“ ist doppelt. Bitte die Dateiauswahl eindeutig halten.');
    sources.set(name,file);
    if(sources.size>100)throw Error('Bitte höchstens 100 SVG-/PDF-Dateien auswählen.');
  };
  for(const file of files)add(file.name,file);
  for(const file of folderFiles){
    const parts=String(file.webkitRelativePath||'').split('/');
    if(parts.length<2||!parts[0]||root!==null&&parts[0]!==root)throw Error('Der Browser hat keinen eindeutigen Ordnerpfad übergeben. Bitte Dateien einzeln auswählen.');
    root=parts.shift();
    if(!/\.(svg|pdf)$/i.test(file.name)){ignored++;continue;}
    add(parts.join('/'),file);
  }
  return {sources,ignored};
}
