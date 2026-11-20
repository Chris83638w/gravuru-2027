// Auftrag #265, Warenkorb: Das schnelle Packen am Server muss genau das Archiv von zipFiles ergeben (sonst änderte sich die
// Prüfsumme jedes Prüfpakets). Verglichen wird Byte für Byte, auch bei leeren Dateien, Umlauten im Namen und großen Dateien.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {zipStored} from './zip-stored.mjs';
import {zipFiles} from '../configurator/variant-m/print-export-model.mjs';

const browserZip=async files=>Buffer.from(await (await zipFiles(files.map(f=>({name:f.name,blob:new Blob([f.bytes])})))).arrayBuffer());

test('zipStored ergibt Byte für Byte das Archiv von zipFiles',async()=>{
 const sets=[
  [],
  [{name:'manifest.json',bytes:Buffer.from('{"a":1}')}],
  [{name:'leer.txt',bytes:Buffer.alloc(0)},{name:'fotos/1-original.jpg',bytes:randomBytes(70000)},{name:'Prüfvermerk – Größe.txt',bytes:Buffer.from('äöü ß € 漢字')}],
  [{name:'produkt-und-gestaltung.json',bytes:Buffer.from(JSON.stringify({product:'x'.repeat(3*1024*1024)}))},{name:'konfigurator-quellen.json',bytes:randomBytes(1024*1024)},{name:'manifest.json',bytes:Buffer.from('{}')}]
 ];
 for(const files of sets){
  const fast=zipStored(files),slow=await browserZip(files);
  assert.equal(fast.length,slow.length,files.length+' Dateien: Länge');
  assert.ok(fast.equals(slow),files.length+' Dateien: Inhalt');
 }
});

test('zipStored nimmt auch Uint8Array und ändert die übergebenen Daten nicht',()=>{
 const bytes=new Uint8Array([1,2,3,250,251]),copy=Uint8Array.from(bytes);
 const archive=zipStored([{name:'a.bin',bytes}]);
 assert.deepEqual(bytes,copy);
 // Lokaler Dateikopf: Signatur, Größe 5, Name „a.bin“, dann die Daten.
 assert.equal(archive.readUInt32LE(0),0x04034b50);assert.equal(archive.readUInt32LE(18),5);assert.equal(archive.subarray(30,35).toString(),'a.bin');assert.deepEqual([...archive.subarray(35,40)],[1,2,3,250,251]);
});
