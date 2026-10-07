import {isRelativeSourcePath,isDesignSourcePath} from './design-source-path.mjs';

export const ZIP_LIMITS=Object.freeze({archive:50*1024*1024,total:150*1024*1024,file:15*1024*1024,entries:5000,designs:100});
const fail=message=>{throw Error('ZIP: '+message);};
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function zipCrc32(bytes){let n=0xffffffff;for(const byte of bytes)n=crcTable[(n^byte)&255]^(n>>>8);return (n^0xffffffff)>>>0;}

/** No filesystem extraction, URLs or recursive archives. Validate every header first. */
export function inspectDesignZip(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>ZIP_LIMITS.archive)fail('Bitte ein ZIP bis 50 MB auswählen.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=p=>view.getUint16(p,true),u32=p=>view.getUint32(p,true);
  const within=(p,n,end=bytes.length)=>{if(p<0||n<0||p+n>end)fail('Archiv ist unvollständig oder beschädigt.');};
  let end=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){end=p;break;}
  if(end<0)fail('Gültiger ZIP-Abschluss fehlt.');
  const count=u16(end+10),directorySize=u32(end+12),directory=u32(end+16);
  if(u16(end+4)||u16(end+6)||u16(end+8)!==count||count===65535||directory===0xffffffff||directorySize===0xffffffff)fail('Mehrteilige Archive und ZIP64 werden nicht unterstützt.');
  if(count>ZIP_LIMITS.entries)fail('Höchstens 5000 Archiveinträge erlaubt.');
  if(directory+directorySize!==end)fail('Ungültiges ZIP-Verzeichnis.');
  within(directory,directorySize,end);
  const entries=[],names=new Set(),ranges=[];let offset=directory,total=0,ignored=0;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  for(let i=0;i<count;i++){
    within(offset,46,end);if(u32(offset)!==0x02014b50)fail('Ungültiger ZIP-Verzeichniseintrag.');
    const flags=u16(offset+8),method=u16(offset+10),crc=u32(offset+16),size=u32(offset+20),originalSize=u32(offset+24);
    const nameSize=u16(offset+28),extraSize=u16(offset+30),commentSize=u16(offset+32),local=u32(offset+42),attributes=u32(offset+38);
    if(flags&~0x080e||![0,8].includes(method)||u16(offset+34))fail('Verschlüsselte oder nicht unterstützte ZIP-Einträge. Bitte ohne Passwort als normales ZIP speichern.');
    if([size,originalSize,local].includes(0xffffffff))fail('ZIP64 wird nicht unterstützt.');
    within(offset+46,nameSize+extraSize+commentSize,end);
    const nameBytes=bytes.subarray(offset+46,offset+46+nameSize);let name;
    if(!(flags&0x800)&&nameBytes.some(byte=>byte>127))fail('Dateinamen bitte als UTF-8-ZIP speichern.');
    try{name=decoder.decode(nameBytes);}catch{fail('Dateinamen bitte als UTF-8-ZIP speichern.');}
    const isDirectory=name.endsWith('/'),key=isDirectory?name.slice(0,-1):name;
    if(!isRelativeSourcePath(key))fail('Ungültiger relativer Pfad im Archiv. Keine absoluten Pfade, Links oder übergeordneten Ordner verwenden.');
    if(names.has(key))fail('Der Pfad „'+key+'“ ist im Archiv doppelt.');names.add(key);
    const mode=(attributes>>>16)&0xf000;
    if(mode&&mode!==(isDirectory?0x4000:0x8000))fail('Verknüpfungen und Spezialdateien werden nicht unterstützt.');
    if((attributes&0x10)&&!isDirectory)fail('Widersprüchlicher Ordnereintrag.');
    total+=originalSize;if(total>ZIP_LIMITS.total)fail('Entpackte Gesamtgröße überschreitet 150 MB.');
    if(isDirectory&&originalSize)fail('Ordner darf keinen Dateiinhalt enthalten.');
    if(method===0&&size!==originalSize)fail('Widersprüchliche Dateigröße.');
    within(local,30,directory);if(u32(local)!==0x04034b50||u16(local+6)!==flags||u16(local+8)!==method)fail('Lokaler ZIP-Header stimmt nicht überein.');
    const localNameSize=u16(local+26),localExtra=u16(local+28),start=local+30+localNameSize+localExtra;
    within(local+30,localNameSize+localExtra,directory);
    if(localNameSize!==nameSize||!nameBytes.every((byte,index)=>bytes[local+30+index]===byte))fail('Dateinamen im ZIP stimmen nicht überein.');
    if(!(flags&8)&&(u32(local+14)!==crc||u32(local+18)!==size||u32(local+22)!==originalSize))fail('Lokale Größen oder Prüfsummen stimmen nicht überein.');
    within(start,size,directory);let finish=start+size;
    if(flags&8){
      within(finish,12,directory);
      const descriptor=u32(finish)===0x08074b50?finish+4:finish;within(descriptor,12,directory);
      if(u32(descriptor)!==crc||u32(descriptor+4)!==size||u32(descriptor+8)!==originalSize)fail('Ungültige ZIP-Datenbeschreibung.');
      finish=descriptor+12;
    }
    ranges.push([local,finish]);
    if(!isDirectory&&isDesignSourcePath(name)){
      if(originalSize>ZIP_LIMITS.file)fail('Design-Datei „'+name+'“ überschreitet 15 MB.');
      if(entries.length>=ZIP_LIMITS.designs)fail('Höchstens 100 SVG-/PDF-Dateien im ZIP erlaubt.');
      entries.push({name,method,crc,size,originalSize,start});
    }else if(!isDirectory)ignored++;
    offset+=46+nameSize+extraSize+commentSize;
  }
  if(offset!==end)fail('ZIP-Verzeichnis ist unvollständig.');
  ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])fail('Überlappende ZIP-Dateieinträge.');
  if(!entries.length)fail('Keine SVG-/PDF-Dateien im Archiv gefunden.');
  return {entries,ignored};
}

async function inflateBounded(compressed,expected){
  if(typeof DecompressionStream!=='function')fail('Dieser Browser unterstützt ZIP-Entpackung nicht. Bitte Ordner oder Einzeldateien auswählen.');
  let reader,position=0;
  // Small input chunks plus backpressure allow early cancellation of forged ZIP bombs.
  const input=new ReadableStream({pull(controller){
    if(position===compressed.length){controller.close();return;}
    const end=Math.min(position+8192,compressed.length);controller.enqueue(compressed.subarray(position,end));position=end;
  }});
  try{reader=input.pipeThrough(new DecompressionStream('deflate-raw')).getReader();}
  catch{fail('Dieser Browser unterstützt ZIP-Entpackung nicht. Bitte Ordner oder Einzeldateien auswählen.');}
  const chunks=[];let length=0;
  try{
    for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>expected||length>ZIP_LIMITS.file)fail('Entpackte Dateigröße überschreitet die angekündigte Größe.');chunks.push(value);}
    if(length!==expected)fail('Entpackte Dateigröße stimmt nicht überein.');
    const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
  }catch(error){await reader.cancel().catch(()=>{});if(error.message?.startsWith('ZIP:'))throw error;fail('Komprimierte Datei ist beschädigt.');}
  finally{reader.releaseLock();}
}

export async function readDesignZip(bytes){
  const {entries,ignored}=inspectDesignZip(bytes),files=[];
  for(const entry of entries){
    const compressed=bytes.subarray(entry.start,entry.start+entry.size);
    const content=entry.method===0?compressed:await inflateBounded(compressed,entry.originalSize);
    if(content.length!==entry.originalSize||zipCrc32(content)!==entry.crc)fail('Prüfsumme der Datei „'+entry.name+'“ stimmt nicht.');
    files.push(new File([content],entry.name,{type:entry.name.toLowerCase().endsWith('.svg')?'image/svg+xml':'application/pdf'}));
  }
  return {files,ignored};
}
