import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync,crc32} from 'node:zlib';
import {readDesignZip,inspectDesignZip,zipCrc32,ZIP_LIMITS} from './design-zip.mjs';
import {indexDesignSources} from './design-source-path.mjs';

// Independent ZIP writer; supports deliberately inconsistent metadata for negative cases.
function archive(entries){
  const locals=[],central=[];let offset=0;
  for(const entry of entries){
    const data=Buffer.from(entry.data??'<svg/>'),name=Buffer.from(entry.name),method=entry.method??8,flags=entry.flags??0x800;
    const compressed=method===8?deflateRawSync(data):data,checksum=entry.crc??crc32(data),original=entry.originalSize??data.length;
    const localName=Buffer.from(entry.localName??entry.name),local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);
    if(!(flags&8)){local.writeUInt32LE(checksum,14);local.writeUInt32LE(compressed.length,18);local.writeUInt32LE(original,22);}
    local.writeUInt16LE(localName.length,26);
    const descriptor=flags&8?Buffer.alloc(16):Buffer.alloc(0);
    if(flags&8){descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(checksum,4);descriptor.writeUInt32LE(compressed.length,8);descriptor.writeUInt32LE(original,12);}
    const header=Buffer.alloc(46);header.writeUInt32LE(0x02014b50);header.writeUInt16LE(0x0314,4);header.writeUInt16LE(20,6);header.writeUInt16LE(flags,8);header.writeUInt16LE(method,10);header.writeUInt32LE(checksum,16);header.writeUInt32LE(compressed.length,20);header.writeUInt32LE(original,24);header.writeUInt16LE(name.length,28);header.writeUInt32LE(entry.attributes??0,38);header.writeUInt32LE(entry.offset??offset,42);
    locals.push(local,localName,compressed,descriptor);central.push(header,name);offset+=local.length+localName.length+compressed.length+descriptor.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...locals,directory,end]);
}

test('stored/deflated ZIP designs retain exact UTF-8 paths, CRC and bytes; other files are ignored',async()=>{
  const bytes=archive([{name:'Kollektion/klein/Design.svg',data:'<svg>klein</svg>',method:0},{name:'Kollektion/groß/Design.svg',data:'<svg>groß</svg>'},{name:'Kollektion/Design.pdf',data:'%PDF-synthetic',flags:0x808},{name:'Hinweis.txt',data:'ignored'},{name:'nested.zip',data:'not recursively opened'},{name:'Ordner/',data:'',method:0}]);
  const result=await readDesignZip(bytes);assert.equal(result.ignored,2);assert.deepEqual(result.files.map(f=>f.name),['Kollektion/klein/Design.svg','Kollektion/groß/Design.svg','Kollektion/Design.pdf']);
  assert.equal(await result.files[0].text(),'<svg>klein</svg>');assert.equal(await result.files[1].text(),'<svg>groß</svg>');assert.equal(await result.files[2].text(),'%PDF-synthetic');
  assert.equal(indexDesignSources(result.files).sources.get('Design.svg'),undefined);
  assert.equal(zipCrc32(Buffer.from('123456789')),0xcbf43926);
});
test('unsafe paths including ignored files, duplicate paths and symlinks are rejected before decompression',()=>{
  for(const name of ['../Design.svg','/Design.svg','C:/Design.svg','https://host/Design.svg','a\\Design.svg','a//Design.svg','./Design.svg','a/%2e%2e/Design.svg','../ignored.txt'])assert.throws(()=>inspectDesignZip(archive([{name}])),/relativer Pfad/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg'},{name:'Design.svg'}])),/doppelt/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',attributes:0xa1ff0000}])),/Verknüpfungen/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',attributes:0x10000000}])),/Spezialdateien/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Ordner/',data:'unexpected'}])),/Ordner/);
});
test('archive, entry, total expanded and file-count limits apply before inflation',()=>{
  assert.throws(()=>inspectDesignZip(new Uint8Array(ZIP_LIMITS.archive+1)),/50 MB/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',originalSize:ZIP_LIMITS.file+1}])),/15 MB/);
  assert.throws(()=>inspectDesignZip(archive(Array.from({length:11},(_,i)=>({name:i+'.txt',originalSize:ZIP_LIMITS.file})))),/150 MB/);
  assert.throws(()=>inspectDesignZip(archive(Array.from({length:101},(_,i)=>({name:i+'.svg'})))),/100 SVG/);
  const bytes=archive([{name:'Design.svg'}]);bytes.writeUInt16LE(5001,bytes.length-14);bytes.writeUInt16LE(5001,bytes.length-12);assert.throws(()=>inspectDesignZip(bytes),/5000/);
});
test('encryption, unsupported compression, ZIP64, split archives and legacy non-UTF8 names fail explicitly',()=>{
  for(const flags of [1,0x40])assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',flags}])),/Verschlüsselte/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',method:12}])),/nicht unterstützte/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Ä.svg',flags:0}])),/UTF-8/);
  const bytes=archive([{name:'Design.svg'}]);bytes.writeUInt16LE(1,bytes.length-18);assert.throws(()=>inspectDesignZip(bytes),/Mehrteilige/);
  bytes.writeUInt16LE(0,bytes.length-18);bytes.writeUInt32LE(0xffffffff,bytes.length-6);assert.throws(()=>inspectDesignZip(bytes),/ZIP64/);
});
test('truncation, contradictory local names/sizes and invalid descriptors cannot silently import',()=>{
  const bytes=archive([{name:'Design.svg'}]);assert.throws(()=>inspectDesignZip(bytes.subarray(0,bytes.length-1)),/ZIP/);
  assert.throws(()=>inspectDesignZip(archive([{name:'Design.svg',localName:'Anders.svg'}])),/Dateinamen/);
  bytes.writeUInt32LE(1234,22);assert.throws(()=>inspectDesignZip(bytes),/Größen/);
  const dd=archive([{name:'Design.svg',flags:0x808}]);dd.writeUInt32LE(9,30+Buffer.byteLength('Design.svg')+deflateRawSync(Buffer.from('<svg/>')).length+8);assert.throws(()=>inspectDesignZip(dd),/Datenbeschreibung/);
  assert.throws(()=>inspectDesignZip(archive([{name:'A.svg'},{name:'B.svg',offset:0}])),/Dateinamen/);
});
test('CRC damage and dishonest compressed output sizes are rejected without returning partial files',async()=>{
  await assert.rejects(readDesignZip(archive([{name:'A.svg'},{name:'B.svg',crc:0}])),/Prüfsumme/);
  await assert.rejects(readDesignZip(archive([{name:'A.svg',data:'x'.repeat(100000),originalSize:10}])),/überschreitet/);
  await assert.rejects(readDesignZip(archive([{name:'A.svg',originalSize:1000}])),/stimmt nicht/);
  const bytes=archive([{name:'A.svg'}]);bytes[30+Buffer.byteLength('A.svg')]=255;await assert.rejects(readDesignZip(bytes),/beschädigt/);
});
test('ZIP and explicitly selected files cannot supply the same complete reference twice',async()=>{
  const {files}=await readDesignZip(archive([{name:'klein/Design.svg'}]));
  assert.throws(()=>indexDesignSources(files,[{name:'Design.svg',webkitRelativePath:'Quelle/klein/Design.svg'}]),/doppelt/);
  assert.equal(indexDesignSources([...files,{name:'gross/Design.svg'}]).sources.size,2);
});
