import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

export function copyPath(input,{confirmation,write=false}={}){
 if(typeof input!=='string'||!path.isAbsolute(input))throw Error('--copy muss eine absolute vorhandene Datei benennen.');
 const resolved=path.resolve(input),real=fs.realpathSync(resolved),info=fs.lstatSync(resolved);
 if(real!==resolved||info.isSymbolicLink()||!info.isFile()||info.nlink!==1)throw Error('Nur eine normale, nicht verlinkte Datenbankkopie verwenden.');
 if(write){
  if(!/\.copy\.sqlite$/i.test(real))throw Error('Schreibziel muss auf .copy.sqlite enden; die unveränderte Sicherung separat behalten.');
  if(typeof confirmation!=='string'||path.resolve(confirmation)!==real)throw Error('--confirm-copy muss exakt dieselbe absolute Kopie bestätigen.');
  if(/[\\/]private[\\/](?:acryl-employee-20261021-v1|mika-r15-resume-20261108-v1)[\\/]data[\\/]/i.test(real))throw Error('Der bekannte Live-Datenordner ist ausgeschlossen.');
 }
 return real;
}
export function argumentsOf(argv,allowed){
 const args={};for(let i=0;i<argv.length;i+=2){const key=argv[i];if(!allowed.includes(key)||args[key]!==undefined||!argv[i+1]||argv[i+1].startsWith('--'))throw Error('Unbekannte, doppelte oder unvollständige Argumente.');args[key]=argv[i+1];}return args;
}
export const isCLI=url=>!!process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===url;
export function printResult(value){process.stdout.write(JSON.stringify(value,null,2)+'\n');}
