import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const LIMIT=200;
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const keyed=value=>Array.isArray(value)&&value.every(item=>object(item)&&typeof item.id==='string'&&item.id)&&new Set(value.map(item=>item.id)).size===value.length;
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function describe(value){
  if(value===undefined)return {text:'Nicht vorhanden'};
  if(value===null)return {text:'Nicht festgelegt'};
  if(typeof value==='boolean')return {text:value?'Ja':'Nein'};
  if(typeof value==='string'&&value.length<=300&&!/^data:/i.test(value))return {text:value||'(leer)'};
  if(typeof value==='number')return {text:String(value)};
  if(Array.isArray(value)&&value.every(item=>item===null||['number','boolean','string'].includes(typeof item))){
    const text=JSON.stringify(value);if(text.length<=300&&!text.includes('data:'))return {text};
  }
  const text=typeof value==='string'?`Inhalt mit ${value.length} Zeichen`:Array.isArray(value)?`${value.length} Einträge`:`${Object.keys(value).length} Eigenschaften`;
  return {text,sha256:digest(value)};
}
const names={document:'Produkt',metadata:'Gesicherte Zuordnungen',name:'Name',config:'Konfiguration',profile:'Vorlage',designs:'Designs',fields:'Kundenfelder',elementRights:'Bearbeitungsrechte',basePriceCents:'Grundpreis (Cent)',processingMethod:'Verfahren',material:'Material',form:'Form',text:'Text',fontSizeMm:'Schriftgröße (mm)',status:'Status beim Speichern',publishedRevision:'Aktivierter Stand beim Speichern',profiles:'Profile',productionProfile:'Fertigungsprofil',order:'Reihenfolge',locked:'Gesperrt',color:'Farbe',fontFamily:'Schriftart',widthMm:'Breite (mm)',heightMm:'Höhe (mm)',thicknessMm:'Stärke (mm)',revision:'Revision',categoryIds:'Kategorien',settingsRevision:'Einstellungsrevision',fonts:'Schriften',motifs:'Motive',colors:'Farben',selections:'Auswahl',sources:'Quellen',geometry:'Geometrie'};

/** Compare immutable snapshots only. Never resolves current profiles or writes a revision. */
export function compareProductRevisions(repository,id,from,to){
  if(![from,to].every(n=>Number.isSafeInteger(n)&&n>0))throw Object.assign(Error('Bitte zwei gültige gespeicherte Stände wählen.'),{status:422,code:'invalid_revision'});
  const before=repository.get(id,{revision:from}),after=repository.get(id,{revision:to});
  const changes=[];let total=0;
  function add(path,a,b){
    total++;
    if(changes.length<LIMIT)changes.push({path,label:path.map(part=>names[part]||part).join(' › '),kind:a===undefined?'added':b===undefined?'removed':'changed',before:describe(a),after:describe(b)});
  }
  function walk(a,b,path,depth=0){
    if(isDeepStrictEqual(a,b))return;
    if(depth>=30){add(path,a,b);return;}
    if(object(a)&&object(b)){
      for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort())walk(Object.hasOwn(a,key)?a[key]:undefined,Object.hasOwn(b,key)?b[key]:undefined,[...path,key],depth+1);
    }else if(keyed(a)&&keyed(b)){
      const left=new Map(a.map(item=>[item.id,item])),right=new Map(b.map(item=>[item.id,item]));
      // Reordering matters for stacking. Insertions/removals are listed independently.
      const commonA=a.filter(item=>right.has(item.id)).map(item=>item.id),commonB=b.filter(item=>left.has(item.id)).map(item=>item.id);
      if(!isDeepStrictEqual(commonA,commonB))add([...path,'order'],a.map(item=>item.id).join(' → '),b.map(item=>item.id).join(' → '));
      for(const key of new Set([...left.keys(),...right.keys()]))walk(left.get(key),right.get(key),[...path,`[${key}]`],depth+1);
    }else add(path,a,b);
  }
  for(const key of ['document','metadata','status','publishedRevision'])walk(before[key],after[key],[key]);
  return {productId:id,from:{revision:from,name:before.document.name},to:{revision:to,name:after.document.name},total,limit:LIMIT,truncated:total>LIMIT,changes,scope:'saved-product-snapshots'};
}
