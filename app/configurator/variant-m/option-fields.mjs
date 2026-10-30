// K14 / Ü12.1: Bedingte Optionen und Felder ohne Vorschau.
// - `visibleIf:{groupId, valueIds:[…]}` an einer Optionsgruppe (`profile.optionGroups`)
//   oder einem Feld: sichtbar nur, wenn die genannte, weiter oben stehende Gruppe (oder
//   Auswahlliste) einen der Werte trägt. Unsichtbare Gruppen/Felder werden verworfen,
//   sind nie Pflicht und kosten nichts.
// - `profile.optionFields`: Felder ohne Canvas-Darstellung, `kind` text|date|select|checkbox
//   mit `label`, `required`, `maxLength` (Text), Aufpreis `priceCents` (Text/Datum/Ankreuzfeld,
//   fällig wenn ausgefüllt/angekreuzt) bzw. je Auswahl (`choices[].priceCents`).
// Felder liegen bewusst nicht in `optionGroups`: Gruppen sind Ausführungen mit festen
// Werten (Shop-Varianten, Bohrbild), Felder sind freie Kundenangaben ohne Variante.
// Ihre Werte stehen im selben Optionsobjekt wie die Gruppenwahl (`{gruppe: wert, feld: wert}`),
// damit Entwurf, Prüfstand, Warenkorb und Fertigung sie ohne zweiten Datenweg führen.
export const FIELD_KINDS=Object.freeze(['text','date','select','checkbox']);
export const FIELD_KIND_LABELS=Object.freeze({text:'Textfeld',date:'Datum',select:'Auswahlliste',checkbox:'Ankreuzfeld'});
export const FIELD_TEXT_DEFAULT_MAX=100,FIELD_TEXT_MAX=500,OPTION_FIELDS_MAX=20;
const fail=message=>{throw Error(message);};
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(v);
const label=(v,max=80)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const cents=v=>Number.isSafeInteger(v)&&v>=0&&v<=100000000;
const only=(o,keys,what)=>{const extra=Object.keys(o).filter(k=>!keys.includes(k));if(extra.length)fail(what+': unbekannte Felder '+extra.join(', '));};

export const optionFields=profile=>Array.isArray(profile?.optionFields)?profile.optionFields:[];
export const visibleBy=(condition,resolved)=>!condition||(resolved[condition.groupId]!==undefined&&condition.valueIds.includes(resolved[condition.groupId]));

// Bedingung prüfen: Ziel steht weiter oben (keine Kreise), Werte existieren am Ziel.
function checkCondition(condition,targets,what){
  if(condition===undefined)return;
  if(!condition||typeof condition!=='object'||Array.isArray(condition))fail(what+': Bedingung als {groupId, valueIds} angeben.');
  only(condition,['groupId','valueIds'],what+' · Bedingung');
  const target=targets.get(condition.groupId);
  if(!target)fail(what+': Bedingung verweist auf keine weiter oben stehende Gruppe oder Auswahlliste.');
  if(!Array.isArray(condition.valueIds)||!condition.valueIds.length||condition.valueIds.some(v=>!target.includes(v))||new Set(condition.valueIds).size!==condition.valueIds.length)fail(what+': Bedingung nennt unbekannte Werte.');
}
export function validateOptionConditions(profile,{allowOpenPrices=false}={}){
  const validPrice=value=>cents(value)||(allowOpenPrices&&value===null);
  const groups=profile.optionGroups||[],fields=profile.optionFields,targets=new Map();
  for(const g of groups){checkCondition(g.visibleIf,targets,'Optionsgruppe '+g.name);targets.set(g.id,g.values.map(v=>v.id));}
  if(fields===undefined)return;
  if(!Array.isArray(fields)||fields.length>OPTION_FIELDS_MAX)fail('Höchstens '+OPTION_FIELDS_MAX+' Zusatzfelder.');
  const ids=new Set(groups.map(g=>g.id));
  for(const f of fields){
    if(!f||typeof f!=='object'||Array.isArray(f))fail('Zusatzfeld fehlt.');
    only(f,['id','kind','label','required','maxLength','priceCents','choices','visibleIf','note','placeholder'],'Zusatzfeld '+(f.id||''));
    if(!id(f.id)||ids.has(f.id))fail('Zusatzfeld braucht eine eindeutige Kennung (auch gegenüber den Optionsgruppen).');ids.add(f.id);
    const what='Zusatzfeld „'+(label(f.label)?f.label:f.id)+'“';
    if(!FIELD_KINDS.includes(f.kind)||!label(f.label))fail(what+': Art Text, Datum, Auswahlliste oder Ankreuzfeld mit Bezeichnung angeben.');
    if(f.required!==undefined&&typeof f.required!=='boolean')fail(what+': Pflicht ja oder nein.');
    if(f.note!==undefined&&!label(f.note,400))fail(what+': Hinweis prüfen.');
    if(f.placeholder!==undefined&&!label(f.placeholder,80))fail(what+': Platzhalter prüfen.');
    if(f.maxLength!==undefined&&(f.kind!=='text'||!Number.isInteger(f.maxLength)||f.maxLength<1||f.maxLength>FIELD_TEXT_MAX))fail(what+': Zeichenlimit 1 bis '+FIELD_TEXT_MAX+' nur bei Textfeldern.');
    if(f.priceCents!==undefined&&(f.kind==='select'||!validPrice(f.priceCents)))fail(what+': Aufpreis in ganzen Cent (Auswahllisten je Auswahl).');
    if(f.kind==='select'){
      if(!Array.isArray(f.choices)||!f.choices.length||f.choices.length>40)fail(what+': 1 bis 40 Auswahlen.');
      const seen=new Set();for(const c of f.choices){if(!c||typeof c!=='object')fail(what+': Auswahl fehlt.');only(c,['id','label','priceCents'],what+' · Auswahl');if(!id(c.id)||seen.has(c.id)||!label(c.label)||(c.priceCents!==undefined&&!validPrice(c.priceCents)))fail(what+': Auswahl '+(c.id||'')+' prüfen.');seen.add(c.id);}
    }else if(f.choices!==undefined)fail(what+': Auswahlen nur bei Auswahllisten.');
    checkCondition(f.visibleIf,targets,what);
    if(f.kind==='select')targets.set(f.id,f.choices.map(c=>c.id));
  }
}

// Kundenwert normalisieren; leer = kein Wert (undefined). Prüft Format, nie die Pflicht.
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;
export function fieldValue(field,raw){
  if(raw===undefined||raw===null||raw==='')return undefined;
  const name='„'+field.label+'“';
  if(field.kind==='checkbox'){if(typeof raw!=='boolean')fail(name+': ja oder nein.');return raw?true:undefined;}
  if(typeof raw!=='string')fail(name+': ungültiger Wert.');
  if(field.kind==='select'){if(!field.choices.some(c=>c.id===raw))fail('Ungültige Auswahl: '+field.label);return raw;}
  const value=raw.trim();if(!value)return undefined;
  if(field.kind==='date'){
    const m=DATE.exec(value),d=m&&new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));
    if(!m||d.getUTCFullYear()!==+m[1]||d.getUTCMonth()!==+m[2]-1||d.getUTCDate()!==+m[3]||+m[1]<1800||+m[1]>2200)fail(name+': Datum im Format JJJJ-MM-TT.');
    return value;
  }
  if(/[\u0000-\u001f\u007f]/.test(value))fail(name+': bitte nur eine Zeile ohne Steuerzeichen.');
  const max=field.maxLength??FIELD_TEXT_DEFAULT_MAX;if([...value].length>max)fail(name+': höchstens '+max+' Zeichen.');
  return value;
}
export function fieldPrice(field,value){
  if(value===undefined)return 0;
  const price=field.kind==='select'?field.choices.find(c=>c.id===value)?.priceCents:field.priceCents;
  if(price===null)fail('Preis noch offen: '+field.label);
  return price??0;
}
const VERB={text:'ausfüllen',date:'angeben',select:'auswählen',checkbox:'bestätigen'};
export const fieldRequiredMessage=field=>'Bitte „'+field.label+'“ '+VERB[field.kind]+'.';
// Anzeige: Datum deutsch, Auswahl mit Bezeichnung, Ankreuzfeld „ja“.
export function fieldDisplay(field,value){
  if(value===undefined)return '';
  if(field.kind==='checkbox')return 'ja';
  if(field.kind==='select')return field.choices.find(c=>c.id===value)?.label??String(value);
  if(field.kind==='date'){const [y,m,d]=value.split('-');return d+'.'+m+'.'+y;}
  return value;
}
