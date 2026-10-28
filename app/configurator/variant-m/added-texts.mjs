// Vom Kunden hinzugefügte Textfelder, die er nicht ausgefüllt hat (leer oder noch „Dein Text“), sollen nicht in
// die Bestellung (Chris 28.10.2026: „löscht er nicht automatisch das Feld Text 6 und 7 … kann das Produkt nicht in
// den Warenkorb legen“). Vorlagentexte (gleiche id wie im Design) bleiben immer – für sie gelten die Pflichtfeldregeln.
export const ADDED_TEXT_SAMPLE='Dein Text';
export function untouchedAddedTexts(objects,templateObjects){
 const template=new Set((Array.isArray(templateObjects)?templateObjects:[]).map(o=>o?.id));
 return (Array.isArray(objects)?objects:[]).filter(o=>o?.type==='text'&&!template.has(o.id)&&o.customerEditable!==false&&
  (!String(o.text??'').trim()||String(o.text).trim()===ADDED_TEXT_SAMPLE)).map(o=>o.id);
}
