import {rejectedPricingLines} from './master-release/cart_transform_run.mjs';
import {proofKey,lineProofValid,needsProof} from './checkout-proof.mjs';

// Chris 15.11.2026: Gegenstück zur Einzelsperre der Preisfunktion. Eine Position, die die
// Preisfunktion abweist, behält ihren Shopify-Listenpreis – deshalb darf sie nie bestellt werden.
// Gesperrt wird nur der Checkout; Hinzufügen, Ändern und Entfernen im Warenkorb bleiben möglich.
// Gleiche Prüfregeln wie die Preisfunktion (identischer Quelltext in master-release/).
export const CHECKOUT_STEPS=new Set(['CHECKOUT_INTERACTION','CHECKOUT_COMPLETION']);
export const REJECTED_MESSAGE=title=>(title?'„'+title+'“: ':'')+'Diese Gestaltung ist nicht mehr bestellbar. Bitte aus dem Warenkorb entfernen und im Konfigurator neu gestalten.';

// F02 (#239): Aufpreise sind an Angebot, Entwurf, Variante und Preisstand gebunden. Der Server hängt an jede
// personalisierte Position einen Nachweis (_gravuru_proof); hier wird er mit dem Schlüssel aus dem App-eigenen
// Metafeld dieser Prüfregel nachgerechnet. Fehlt der Schlüssel, ist jede Position mit Aufpreis-Angaben gesperrt.
// Grenze: Jede personalisierte Position kostet rund 1,0 Mio. Anweisungen (Limit 11 Mio., gemessen 9 → ~10,5 Mio.). Statt bei mehr
// Positionen am Limit zu scheitern, sagt die Prüfung es vorher klar. Die Regel läuft mit blockOnFailure.
export const MAX_PERSONALIZED_LINES=9;
export const LIMIT_MESSAGE='Bitte höchstens '+MAX_PERSONALIZED_LINES+' personalisierte Positionen je Bestellung. Die übrigen Gestaltungen bleiben gespeichert und können in einer zweiten Bestellung gekauft werden.';
const personalized=line=>needsProof(line)||line.offer?.value!=null||line.merchandise?.product?.pricing?.value!=null;

export function cartValidationsGenerateRun(input){
 if(!CHECKOUT_STEPS.has(input?.buyerJourney?.step))return {operations:[]};
 const lines=input.cart.lines;
 if(lines.filter(personalized).length>MAX_PERSONALIZED_LINES)return {operations:[{validationAdd:{errors:[{message:LIMIT_MESSAGE,target:'$.cart'}]}}]};
 // Die Währungsumrechnung ändert nie, ob eine Position abgewiesen wird.
 const blocked=new Set(rejectedPricingLines({presentmentCurrencyRate:'1.0',cart:{lines}}).map(r=>r.index));
 const key=proofKey(input.validation?.metafield?.value);
 lines.forEach((line,index)=>{if(!blocked.has(index)&&needsProof(line)&&!lineProofValid(key,line))blocked.add(index);});
 const errors=[...blocked].sort((a,b)=>a-b).map(i=>({message:REJECTED_MESSAGE(String(lines[i]?.merchandise?.product?.title||'').slice(0,80)),target:'$.cart'}));
 return {operations:errors.length?[{validationAdd:{errors}}]:[]};
}
