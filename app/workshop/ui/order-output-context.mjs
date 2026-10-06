import {statusNote} from './output-summary.mjs';
export function showOrderContext(context){
 const root=document.querySelector('#order-context');if(!root)return;
 root.hidden=!context;if(!context)return;
 root.querySelector('[data-order-title]').textContent='Testbestellung '+context.orderId+' · '+context.product.name+' · Menge '+context.quantity;
 root.querySelector('[data-order-status]').textContent=statusNote(context.status);
 root.querySelector('[data-order-status]').classList.toggle('error',Boolean(context.status?.requiresReview));
 root.querySelector('[data-order-back]').href='/werkstatt/bestellungen/?position='+encodeURIComponent(context.positionId);
 root.querySelector('[data-order-settings]').href='/werkstatt/pruefstaende/?'+new URLSearchParams({snapshot:context.snapshotId,position:context.positionId});
}
