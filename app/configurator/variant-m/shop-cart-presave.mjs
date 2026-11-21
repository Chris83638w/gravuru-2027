// „Vorab sichern“ (#265, ENTSCHEIDUNGEN 3.56): Die Gestaltung wird schon gesichert, sobald der Kunde „Deine Gestaltung im
// Überblick“ öffnet; „Jetzt in den Warenkorb“ verwendet diesen Stand, wenn er noch genau passt, und sichert sonst wie bisher
// selbst. Hier steht nur die Logik ohne DOM (Schlüssel, Reihenfolge, Wiederverwendung, Fehlerfälle); die Arbeit selbst
// (Vorschau erzeugen, Entwurf sichern) liefert shop-cart.mjs.

// Schlüssel eines Stands: die Gestaltung (derselbe fingerprint wie beim Klick), die Menge und die Warenkorbzeile, die ersetzt
// würde. Der private Zugriff (draftToken) und die Entwurfsrevision gehören nicht dazu.
export function presaveKey(fingerprint,quantity,cartEdit){
 return JSON.stringify([fingerprint,quantity,cartEdit?[cartEdit.configId??null,cartEdit.rev??null,cartEdit.cartLineId??null,cartEdit.draftId??null]:null]);
}

const DISCARDED=Error('Vorab-Stand verworfen: Die Gestaltung wurde inzwischen geändert.');

export function createCartPresave(){
 // `latest` beschreibt immer die jüngste begonnene Sicherung (vorab oder vom Klick). Nur sie darf an den Warenkorb gehen:
 // Der Server nimmt genau die aktuelle Entwurfsrevision an (bound-test-cart.mjs, expectedRevision).
 let tail=Promise.resolve(),latest=null;
 // Der Entwurfs-Client zählt die Revision je Sicherung hoch. Nie zwei Sicherungen gleichzeitig abschicken: Jede beginnt
 // erst, wenn die vorige beendet ist – auch wenn diese fehlschlug.
 const queue=job=>{const run=tail.then(job);tail=run.then(()=>{},()=>{});return run;};
 return {
  // Übersicht geöffnet. `prepare` bildet den payload, `current` liefert den Schlüssel des jetzigen Stands, `save` sichert.
  // Derselbe Schlüssel löst kein zweites Vorab-Sichern aus – auch nicht, wenn er fehlschlug oder schon verbraucht ist.
  start(key,{current,prepare,save}){
   if(latest?.key===key)return false;
   const mine={key,state:'pending',used:false,saved:null};latest=mine;
   // Verwerfen, wenn sich der Stand geändert hat oder ein neuerer Stand begonnen wurde, auf den kein Klick wartet.
   const outdated=()=>(latest!==mine&&!mine.used)||current()!==key;
   mine.saved=(async()=>{
    const payload=await prepare();
    if(outdated())throw DISCARDED;
    // Vor dem Abschicken erneut prüfen: Bis die vorige Sicherung beendet ist, kann sich der Stand geändert haben.
    // Ein bereits abgeschickter Abruf läuft zu Ende; sein Ergebnis braucht nur der Entwurfs-Client für die Revisionsfolge.
    return queue(()=>{if(outdated())throw DISCARDED;return save(payload);});
   })().then(result=>{mine.state='saved';return result;},error=>{
    // Geänderter Stand: vergessen, damit derselbe Stand später neu gesichert werden kann. Echter Fehler: merken (der Klick
    // sichert dann selbst und meldet seinen Fehler wie bisher).
    let changed=error===DISCARDED;if(!changed)try{changed=current()!==key;}catch{}
    mine.state=changed?'discarded':'failed';if(changed&&latest===mine)latest=null;
    throw error;
   });
   mine.saved.catch(()=>{}); // Ein Fehler beim Vorab-Sichern bleibt still.
   return true;
  },
  // Klick: der Vorab-Stand genau dieses Schlüssels, höchstens einmal. `pending`: Er läuft noch, der Klick wartet auf `saved`.
  // Eine Entwurfsrevision geht nur einmal an den Warenkorb (cart-configuration.mjs, claimThemeTransfer nimmt jedes Angebot
  // genau einmal an); wer denselben Stand erneut einlegt, sichert deshalb wie bisher neu.
  take(key){
   const found=latest;
   if(!found||found.key!==key||found.used||!['pending','saved'].includes(found.state))return null;
   found.used=true;
   return {pending:found.state==='pending',saved:found.saved};
  },
  // Sicherung des Klicks (kein passender Vorab-Stand): in derselben Kette, danach ist sie der jüngste und verbrauchte Stand.
  save(key,job){
   latest={key,state:'saved',used:true,saved:null};
   return queue(job);
  }
 };
}
