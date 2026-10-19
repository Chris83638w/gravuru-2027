// Ü7.2: Spiegelung ist eine Fertigungsregel, nie eine Clientwahl. Sie kommt aus
// dem gebundenen Fertigungsprofil (output.mirror). Ohne Profil gilt nur der
// bestehende Produktvertrag: der native Acryl-Druck wird von hinten bedruckt
// (acrylic-product.mjs, print.side 'rear') und daher genau einmal gespiegelt;
// alles andere bleibt ungespiegelt. Bohrungen als Schnittlinie und Schrift-in-
// Pfade entstehen ohnehin ausschließlich serverseitig (acrylic-artwork.mjs,
// form-print-worker.py); dort gibt es kein Clientflag.
const ACRYLIC_REVIEW='gravuru-acrylic-review/v1'; // Schema des nativen Acryl-Prüfstands (acrylic-review.mjs)
const fail=(code,message)=>{throw Object.assign(Error(message),{status:422,code});};
export const MIRROR_SOURCES=Object.freeze({profile:'fertigungsprofil',rear:'acryl-rueckseite',front:'vorderseite'});
export function productionMirror(manifest){
 const output=manifest?.productionProfile?.document?.output;
 if(output&&typeof output==='object')return {mirror:output.mirror===true,source:MIRROR_SOURCES.profile};
 if(manifest?.schema===ACRYLIC_REVIEW&&manifest.product?.method==='print')return {mirror:true,source:MIRROR_SOURCES.rear};
 return {mirror:false,source:MIRROR_SOURCES.front};
}
// Clientseitige Ausgabeeinstellungen: alles außer der Spiegelung bleibt eine
// Operatorwahl. Ein gesendetes `mirror` wird ignoriert und durch den aus dem
// Profil abgeleiteten Wert ersetzt; weicht es ab, meldet `ignored` das Feld,
// damit Antwort und Protokoll es benennen können (Ü7.2, Prüfbericht P2/§5).
export function clientOutputSettings(manifest,input={}){
 if(input===undefined||input===null)input={};
 if(typeof input!=='object'||Array.isArray(input))fail('invalid_output_settings','Ungültige Ausgabeeinstellungen.');
 const {mirror,...rest}=input,derived=productionMirror(manifest);
 const ignored=mirror!==undefined&&mirror!==derived.mirror?[{field:'mirror',requested:mirror,applied:derived.mirror,source:derived.source,message:`Die Spiegelung wird ausschließlich aus dem Fertigungsprofil abgeleitet (${derived.source}: ${derived.mirror?'gespiegelt':'nicht gespiegelt'}); der gesendete Wert wurde ignoriert.`}]:[];
 return {settings:{...rest,mirror:derived.mirror},orientation:derived,ignored};
}
