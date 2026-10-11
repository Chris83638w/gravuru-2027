import {merchantRequest} from './merchant-request.mjs';
import './merchant-navigation.mjs';
const label=document.querySelector('[data-workshop-session]');
try{
 const response=await merchantRequest('/api/workshop/session');
 if(!response.ok)throw Error();
 const session=await response.json();
 label.textContent=session.scope==='shopify-merchant-test'?'Shopify · Testbetrieb':'Lokale Werkstatt';
 label.title=session.merchantTestCart?'Händler-Testkauf für den geprüften Produktstand eingerichtet.':'Werkstattsitzung verbunden.';
}catch{label.textContent='Verbindung prüfen';label.title='Bitte die Werkstatt in Shopify öffnen oder neu laden.';}
document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const menu of document.querySelectorAll('.management-menu[open]')){menu.open=false;menu.querySelector('summary').focus();}});
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.management-menu[open]'))if(!menu.contains(event.target))menu.open=false;});
