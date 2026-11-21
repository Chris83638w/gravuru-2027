import {accountPreview} from './model.mjs';
// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (4): Bild der Gestaltung in der Bestellübersicht des Kundenkontos, vom eigenen Server.
// API 2025-10, customer-account.order-status.cart-line-item.render-after (je Bestellposition, wie ThankYou.js auf der
// Danke-Seite). Kein Speichern, keine fremden Hosts, kein Netzabruf: gelesen werden nur die Eigenschaften der Position.
// Am echten Shop zu bestätigen (ohne Netz nicht prüfbar): genauer Zielname, `shopify.target` in diesem Ziel und ob die
// Bestellübersicht die privaten Eigenschaften (`_gravuru_bild`) an die Erweiterung gibt.
export default function(){
 const render=line=>{
  const value=accountPreview(line);
  if(!value){document.body.replaceChildren();return;}
  const link=document.createElement('s-link'),image=document.createElement('s-image');
  link.href=value.src;link.target='_blank';image.src=value.src;image.alt=value.alt;
  link.append(image);document.body.replaceChildren(link);
 };
 render(shopify.target.value);
 shopify.target.subscribe(render);
}
