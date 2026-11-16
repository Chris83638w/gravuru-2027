import {rejectedPricingLines} from './master-release/cart_transform_run.mjs';

// Chris 15.11.2026: Gegenstück zur Einzelsperre der Preisfunktion. Eine Position, die die
// Preisfunktion abweist, behält ihren Shopify-Listenpreis – deshalb darf sie nie bestellt werden.
// Gesperrt wird nur der Checkout; Hinzufügen, Ändern und Entfernen im Warenkorb bleiben möglich.
// Gleiche Prüfregeln wie die Preisfunktion (identischer Quelltext in master-release/).
export const CHECKOUT_STEPS=new Set(['CHECKOUT_INTERACTION','CHECKOUT_COMPLETION']);
export const REJECTED_MESSAGE=title=>(title?'„'+title+'“: ':'')+'Diese Gestaltung ist nicht mehr bestellbar. Bitte aus dem Warenkorb entfernen und im Konfigurator neu gestalten.';

export function cartValidationsGenerateRun(input){
 if(!CHECKOUT_STEPS.has(input?.buyerJourney?.step))return {operations:[]};
 const lines=input.cart.lines;
 // Die Währungsumrechnung ändert nie, ob eine Position abgewiesen wird.
 const rejected=rejectedPricingLines({presentmentCurrencyRate:'1.0',cart:{lines}});
 const errors=rejected.map(r=>({message:REJECTED_MESSAGE(String(lines[r.index]?.merchandise?.product?.title||'').slice(0,80)),target:'$.cart'}));
 return {operations:errors.length?[{validationAdd:{errors}}]:[]};
}
