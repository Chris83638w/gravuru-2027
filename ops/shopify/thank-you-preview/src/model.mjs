// Only the immutable, image-only address. Never editor/session tokens or original photos.
export function thankYouPreview(line){
 const entries=line?.attributes||[],value=key=>entries.find(a=>a.key===key)?.value;
 if(!value('_gravuru_config'))return null;
 const src=value('_gravuru_bild');
 if(typeof src!=='string'||!/^https:\/\/app-2027\.gravuru-designwerkstatt\.de\/gestaltung\/[-A-Za-z0-9_]{1,100}\/offer_[a-f0-9-]{36}\/[a-f0-9]{64}\.png$/.test(src))return null;
 return {src,alt:'Deine Gestaltung: '+(line.merchandise?.title||'Personalisiertes Produkt'),message:'Bitte prüfe die Schreibweise.'};
}
// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (4): Bild der Gestaltung auch in der Bestellübersicht des Kundenkontos – dieselbe
// Vertrauensprüfung der Bildadresse wie oben, kein zweiter Weg. Der Satz zur Schreibweise gehört zum Baustein der
// Danke-Seite (#48 D5); für das Kundenkonto gibt es dazu keine Entscheidung, dort steht deshalb nur das Bild.
export function accountPreview(line){
 const value=thankYouPreview(line);
 return value?{src:value.src,alt:value.alt}:null;
}
