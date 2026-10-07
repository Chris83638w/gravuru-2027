import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const APP_ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const DATA_MARKER='.gravuru-private-test.json';
export const PYTHON_MARKER='.gravuru-test-python.json';
export const fail=message=>{throw Error(message);};
const within=(root,file)=>file===root||file.startsWith(root+path.sep);
const PRIVATE_ENV_KEYS=['GRAVURU_TEST_ORIGIN','GRAVURU_PRIVATE_DATA_DIR','GRAVURU_TEST_PYTHON_DIR','GRAVURU_BOOTSTRAP_PYTHON','GRAVURU_TEST_USERNAME','GRAVURU_TEST_PASSWORD'];
// Plesk's npm runner does not inherit application variables. A separately
// uploaded private file lets that runner and the app use the same configuration.
export function privateTestEnvironment(env){
  const file=env.GRAVURU_TEST_CONFIG_FILE||path.join(path.dirname(APP_ROOT),'private',path.basename(APP_ROOT)+'-config.json');
  if(!fs.existsSync(file)&&!env.GRAVURU_TEST_CONFIG_FILE)return env;
  externalPath(file,'Private Testkonfiguration');
  let fd;
  try{
    const parent=fs.lstatSync(path.dirname(file)),uid=process.getuid();
    if(!parent.isDirectory()||parent.mode&0o077||parent.uid!==uid)throw Error();
    fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
    const stat=fs.fstatSync(fd);
    if(!stat.isFile()||stat.mode&0o077||stat.uid!==uid||stat.size>16384)throw Error();
    const record=JSON.parse(fs.readFileSync(fd,'utf8'));
    if(record.schema!==1||record.purpose!=='private-test-runtime'||!record.values||Array.isArray(record.values))throw Error();
    const keys=Object.keys(record.values);
    if(keys.length!==PRIVATE_ENV_KEYS.length||keys.some(key=>!PRIVATE_ENV_KEYS.includes(key)||typeof record.values[key]!=='string'||record.values[key].length>512))throw Error();
    if(keys.some(key=>env[key]!==undefined&&env[key]!==record.values[key]))throw Error();
    return {...env,...record.values};
  }catch{fail('Private Testkonfiguration fehlt oder ist ungültig: eigener Ordner 0700, Datei 0600, keine Symlinks; keine Werte protokollieren.');}
  finally{if(fd!==undefined)fs.closeSync(fd);}
}
export function externalPath(value,label){
  if(typeof value!=='string'||!path.isAbsolute(value)||path.resolve(value)!==value||value==='/'||within(APP_ROOT,value)||within(value,APP_ROOT)||value.split(path.sep).includes('gravuru-werkstatt'))fail(label+': separaten absoluten Testpfad außerhalb der Anwendung wählen.');
  for(let p=value;;p=path.dirname(p)){
    if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())fail(label+': symbolische Pfade sind nicht erlaubt.');
    if(fs.existsSync(path.join(p,'.git')))fail(label+': kein Git-Verzeichnis verwenden.');
    if(p===path.dirname(p))break;
  }
  return value;
}
export function testConfig(env,{credentials=true}={}){
  let origin;try{origin=new URL(env.GRAVURU_TEST_ORIGIN);}catch{fail('GRAVURU_TEST_ORIGIN: eigene HTTPS-Testadresse fehlt.');}
  if(origin.protocol!=='https:'||origin.origin!==env.GRAVURU_TEST_ORIGIN||origin.username||origin.password||!origin.hostname.includes('.')||!/^[a-z0-9.-]+$/.test(origin.hostname)||/^[0-9.]+$/.test(origin.hostname)||['gravuru-designwerkstatt.de','www.gravuru-designwerkstatt.de','gravuru.highspeed.cloud'].includes(origin.hostname))fail('GRAVURU_TEST_ORIGIN: eigene HTTPS-Testadresse ohne Pfad verwenden; Live-Adressen sind gesperrt.');
  const data=externalPath(env.GRAVURU_PRIVATE_DATA_DIR,'GRAVURU_PRIVATE_DATA_DIR'),pythonDir=externalPath(env.GRAVURU_TEST_PYTHON_DIR,'GRAVURU_TEST_PYTHON_DIR');
  if(within(data,pythonDir)||within(pythonDir,data))fail('Daten und Python benötigen getrennte Verzeichnisse.');
  if(credentials&&(!/^[A-Za-z0-9._-]{1,64}$/.test(env.GRAVURU_TEST_USERNAME||'')||! /^[\x20-\x7e]{24,200}$/.test(env.GRAVURU_TEST_PASSWORD||'')))fail('GRAVURU_TEST_USERNAME und eigenes GRAVURU_TEST_PASSWORD (24–200 Zeichen) sicher in Plesk hinterlegen.');
  return {origin:origin.origin,host:origin.host,data,pythonDir,python:path.join(pythonDir,'bin/python'),username:env.GRAVURU_TEST_USERNAME,password:env.GRAVURU_TEST_PASSWORD};
}
export const markerValue=(config,purpose)=>({schema:1,purpose,origin:config.origin});
export function verifyDirectory(directory,marker,expected){
  if(!fs.existsSync(directory)||!fs.statSync(directory).isDirectory()||fs.statSync(directory).mode&0o077)fail('Testverzeichnis fehlt oder benötigt private Rechte 0700.');
  const file=path.join(directory,marker);
  if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||!fs.statSync(file).isFile())fail('Kennzeichnung der separaten Testablage fehlt.');
  let actual;try{actual=JSON.parse(fs.readFileSync(file,'utf8'));}catch{fail('Kennzeichnung der Testablage ist ungültig.');}
  if(JSON.stringify(actual)!==JSON.stringify(expected))fail('Testablage gehört zu einer anderen Instanz; keine automatische Übernahme.');
}
export function verifyStorage(config){
  verifyDirectory(config.data,DATA_MARKER,markerValue(config,'private-test-data'));
  for(const entry of fs.readdirSync(config.data,{withFileTypes:true})){
    if(entry.name===DATA_MARKER)continue;
    if(!/^(?:(workshop|profiles|design-assets)\.sqlite(?:-(?:wal|shm|journal))?|\.runtime\.lock)$/.test(entry.name)||!entry.isFile()||entry.isSymbolicLink()||fs.statSync(path.join(config.data,entry.name)).mode&0o077)fail('Unerwarteter Inhalt oder nicht private Datei in der Testablage. Keine Bestandsdaten übernehmen.');
  }
}
