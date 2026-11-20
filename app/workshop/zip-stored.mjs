// Auftrag #265, Warenkorb (Chris 20.11.2026): Das Prüfpaket eines Kundenentwurfs enthält den ganzen Produktstand (über 10 MB).
// zipFiles (print-export-model.mjs, läuft auch im Browser) rechnet die Prüfsumme jeder Datei in einer Schleife über jedes Byte;
// am echten Server kostete das Packen je Entwurf rund 0,8 s. Der Server rechnet sie hier mit zlib.crc32.
// Das Archiv ist Byte für Byte dasselbe wie von zipFiles: ungepackt, gleiche Kopfzeilen, gleiche Reihenfolge
// (zip-stored.test.mjs vergleicht beide). Die Prüfsumme des Pakets ändert sich deshalb nicht.
import {crc32} from 'node:zlib';
export function zipStored(files){
 const chunks=[],directory=[];let offset=0;
 for(const {name,bytes} of files){
  const data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes),filename=Buffer.from(String(name),'utf8'),crc=crc32(data)>>>0;
  const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50,0);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
  const dir=Buffer.alloc(46);dir.writeUInt32LE(0x02014b50,0);dir.writeUInt16LE(20,4);dir.writeUInt16LE(20,6);dir.writeUInt16LE(0x800,8);dir.writeUInt32LE(crc,16);dir.writeUInt32LE(data.length,20);dir.writeUInt32LE(data.length,24);dir.writeUInt16LE(filename.length,28);dir.writeUInt32LE(offset,42);
  directory.push(dir,filename);chunks.push(head,filename,data);offset+=head.length+filename.length+data.length;
 }
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.reduce((a,x)=>a+x.length,0),12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...chunks,...directory,end]);
}
