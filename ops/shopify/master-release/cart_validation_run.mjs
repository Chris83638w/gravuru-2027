import {rejectedPricingLines} from './cart_transform_run.mjs';

// Chris 15.11.2026: Gegenstück zur Einzelsperre in der Preisfunktion. Eine Position, die die
// Preisfunktion abweist (z. B. alte Testgestaltung, Größe nicht mehr in der Preisliste,
// manipulierte Angaben), behält ihren Shopify-Listenpreis – deshalb darf sie nie bestellt
// werden. Diese Prüfung sperrt nur den Checkout und nennt die Position; Hinzufügen, Ändern
// und Entfernen im Warenkorb bleiben möglich (keine Sperre bei CART_INTERACTION).
export const CHECKOUT_STEPS=new Set(['CHECKOUT_INTERACTION','CHECKOUT_COMPLETION']);
export const REJECTED_MESSAGE=title=>(title?'„'+title+'“: ':'')+'Diese Gestaltung ist nicht mehr bestellbar. Bitte aus dem Warenkorb entfernen und im Konfigurator neu gestalten.';

export function cartValidationsGenerateRun(input){
 const step=input?.buyerJourney?.step;
 if(!CHECKOUT_STEPS.has(step))return {operations:[{validationAdd:{errors:[]}}]};
 const lines=input.cart.lines;
 // Gleiche Eingabe wie die Preisfunktion; die Währung beeinflusst nur die Umrechnung, nie die Abweisung.
 const rejected=rejectedPricingLines({presentmentCurrencyRate:input.presentmentCurrencyRate??'1.0',cart:{lines}});
 const errors=rejected.map(r=>({message:REJECTED_MESSAGE(String(lines[r.index]?.merchandise?.product?.title||'').slice(0,80)),target:'$.cart'}));
 return {operations:[{validationAdd:{errors}}]};
}
