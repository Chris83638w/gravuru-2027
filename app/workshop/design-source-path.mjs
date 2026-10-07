// Relative import references only. Never used as filesystem paths or fetch URLs.
export function isDesignSourcePath(value) {
  if(typeof value!=='string'||value.length>512||value!==value.trim()||/[\x00-\x1f\x7f\\:%?#]/.test(value)||!/\.(svg|pdf)$/i.test(value))return false;
  const parts=value.split('/');
  return parts.length<=16&&parts.every(part=>part&&part!=='.'&&part!=='..'&&part===part.trim()&&part.length<=200);
}
export const designSourceName=value=>value.split('/').at(-1);

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
