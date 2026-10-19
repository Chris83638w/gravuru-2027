// Themen-Definition aus dem Katalog-Repo (`themen.json`): {themes:[{id,name,fontSet,motifCategories,designTags}]}.
// Die Datei liegt nicht in diesem Repo; der Server liest sie auf Wunsch (`--themen=<pfad>`) und
// gibt die geprüfte Liste als `config.themes` an den Kundeneditor (K9). Keine Werte werden erfunden.
import fs from 'node:fs';

const fail=message=>{throw Error(message);};
const stringList=(value,label)=>{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>200||value.some(v=>typeof v!=='string'||!v.trim()||v.length>80))fail(label+': Liste aus höchstens 200 Texten (je bis 80 Zeichen).');
 return value.map(v=>v.trim());
};
export function parseThemeCatalog(input){
 const list=Array.isArray(input)?input:Array.isArray(input?.themes)?input.themes:null;
 if(!list)fail('themen.json: erwartet {themes:[…]}.');
 if(list.length>500)fail('themen.json: höchstens 500 Themen.');
 const ids=new Set();
 return list.map(theme=>{
  if(!theme||typeof theme!=='object'||Array.isArray(theme))fail('themen.json: jedes Thema ist ein Objekt.');
  if(typeof theme.id!=='string'||!/^[a-z0-9][a-z0-9-]{0,79}$/.test(theme.id.trim().toLowerCase()))fail('themen.json: Themen-ID fehlt oder ist ungültig.');
  const id=theme.id.trim().toLowerCase();
  if(ids.has(id))fail('themen.json: Themen-ID „'+id+'“ ist doppelt.');ids.add(id);
  if(typeof theme.name!=='string'||!theme.name.trim()||theme.name.length>120)fail('themen.json: Thema „'+id+'“ braucht einen Namen bis 120 Zeichen.');
  const fontSet=theme.fontSet===undefined?[]:stringList(theme.fontSet,'themen.json: fontSet von „'+id+'“');
  return Object.freeze({id,name:theme.name.trim(),fontSet,motifCategories:stringList(theme.motifCategories,'themen.json: motifCategories von „'+id+'“'),designTags:stringList(theme.designTags,'themen.json: designTags von „'+id+'“')});
 });
}
export function readThemeCatalog(file){
 let text;
 try{text=fs.readFileSync(file,'utf8').replace(/^﻿/,'');}catch{fail('themen.json nicht lesbar: '+file);}
 let value;
 try{value=JSON.parse(text);}catch{fail('themen.json ist kein gültiges JSON: '+file);}
 return parseThemeCatalog(value);
}
export const findTheme=(themes,id)=>{const wanted=String(id??'').trim().toLowerCase();return wanted?(themes||[]).find(t=>t.id===wanted)||null:null;};
