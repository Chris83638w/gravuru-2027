import {crc32} from 'node:zlib';

// Server-side writer for exactly the existing stored UTF-8 ZIP format. The
// browser writer remains unchanged. Buffers need no Blob/arrayBuffer roundtrip;
// CRC32 runs in Node's native implementation (the application requires Node 24).
export function reviewZip(files){
 const chunks=[],directory=[];let offset=0;
 for(const {path,bytes} of files){
  const filename=Buffer.from(path),data=bytes,crc=crc32(data);
  const head=Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);
  head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
  const dir=Buffer.alloc(46);
  dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);
  dir.writeUInt32LE(crc,16);dir.writeUInt32LE(data.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(filename.length,28);dir.writeUInt32LE(offset,42);
  directory.push(dir,filename);chunks.push(head,filename,data);offset+=head.length+filename.length+data.length;
 }
 const directoryBytes=directory.reduce((n,b)=>n+b.length,0),end=Buffer.alloc(22);
 end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directoryBytes,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...chunks,...directory,end],offset+directoryBytes+end.length);
}
