// Tester/Chris 13.11.2026: Bei der Menge gingen 0, -3 oder 2.5 durch und erschienen so in der
// Übersicht. Nur ganze Zahlen von 1 bis 99 (wie min/max am Feld); Zeichen wie „-“, „.“, „,“, „e“
// werden gar nicht erst angenommen, ein leeres Feld oder 0 wird sofort angezeigt und beim
// Verlassen auf eine gültige Menge gesetzt. Übersicht und Warenkorb prüfen dieselbe Regel.
export const QUANTITY_MESSAGE='Bitte eine ganze Menge von 1 bis 99 eingeben.';

export function quantityIssue(value,{min=1,max=99}={}){
 const text=String(value??'').trim();
 if(!/^\d+$/.test(text))return QUANTITY_MESSAGE;
 const n=Number(text);return n>=min&&n<=max?'':QUANTITY_MESSAGE;
}
export function correctedQuantity(value,{min=1,max=99}={}){
 const n=Math.round(Number(String(value??'').replace(',','.')));
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):min;
}

export function installQuantityGuard({el,r,say}){
 const qty=r.querySelector('[data-fk-quantity]');if(!qty||qty.dataset.quantityGuard)return null;
 qty.dataset.quantityGuard='true';
 const limits={min:Number(qty.min)||1,max:Number(qty.max)||99};
 const doc=qty.ownerDocument,note=doc.createElement('p');note.className='ux-quantity-error';note.id='ux-quantity-error';note.setAttribute('role','alert');note.hidden=true;
 (qty.closest('.ux-quantity-stepper')||qty).after(note);
 const style=doc.createElement('style');style.textContent='.ux-quantity-error{margin:4px 0 0;color:#a12a1f;font-size:13px;line-height:1.35;font-weight:600}.ux-quantity-error[hidden]{display:none}';r.append(style);
 const show=message=>{note.textContent=message;note.hidden=!message;qty.setAttribute('aria-invalid',String(!!message));if(message)qty.setAttribute('aria-describedby',note.id);else qty.removeAttribute('aria-describedby');};
 qty.addEventListener('keydown',event=>{if(event.key.length===1&&!/\d/.test(event.key)&&!event.ctrlKey&&!event.metaKey)event.preventDefault();});
 qty.addEventListener('input',()=>show(quantityIssue(qty.value,limits)));
 qty.addEventListener('change',()=>{
  if(!quantityIssue(qty.value,limits)){show('');return;}
  const value=String(correctedQuantity(qty.value,limits));qty.value=value;show('');say?.('Menge auf '+value+' gesetzt.');
  qty.dispatchEvent(new Event('input',{bubbles:true}));el.sync?.();
 });
 el.uxQuantityIssue=()=>{const message=quantityIssue(qty.value,limits);show(message);return message;};
 el.uxRevealQuantity=()=>{qty.scrollIntoView?.({block:'center',behavior:'smooth'});qty.focus?.({preventScroll:true});};
 return {note,qty};
}
