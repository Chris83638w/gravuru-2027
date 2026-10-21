import {merchantRequest} from './merchant-request.mjs';
import './merchant-navigation.mjs';
const previous=document.querySelector('[data-workshop-session]'),label=document.createElement('button');
label.type='button';label.dataset.workshopSession='';label.setAttribute('aria-live','polite');label.textContent=previous?.textContent||'Verbindung wird geprüft …';previous?.replaceWith(label);
let checking=false;
const failed=()=>{label.textContent='Verbindung prüfen';label.title='Shopify-Anmeldung erneut prüfen. Deine Eingaben bleiben erhalten.';};
document.addEventListener('workshop-session-failed',failed);
async function check({restore=false}={}){if(checking)return;checking=true;label.disabled=true;
try{
 const response=await merchantRequest('/api/workshop/session');
 if(!response.ok)throw Error();
 const session=await response.json();
 label.textContent=session.scope==='shopify-merchant-test'?'Shopify · Testbetrieb':'Lokale Werkstatt';
 label.title=session.merchantTestCart?'Händler-Testkauf für den geprüften Produktstand eingerichtet.':'Werkstattsitzung verbunden.';
 if(restore)document.dispatchEvent(new CustomEvent('workshop-session-restored',{detail:session}));
}catch{failed();}finally{checking=false;label.disabled=false;}}
label.addEventListener('click',()=>check({restore:true}));void check();
document.addEventListener('keydown',event=>{if(event.key==='Escape')for(const menu of document.querySelectorAll('.management-menu[open]')){menu.open=false;menu.querySelector('summary').focus();}});
document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.management-menu[open]'))if(!menu.contains(event.target))menu.open=false;});
