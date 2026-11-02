'use strict';
let parentConfigurationLoaded=parent===window||!new URLSearchParams(location.search).has('kompakt');
let pendingParentConfiguration=null;
function publishConfiguration(advance){
 if(!parentConfigurationLoaded)return;
 let geometry=null,error='';try{geometry=plates.validate(input());if(plates.screwWarnings(geometry).length&&!plates.clearanceAccepted(geometry))throw Error('Bitte den Hinweis zum Schraubenkopf bestätigen oder die Anordnung korrigieren.');}catch(e){error=e.message}
 if(parent!==window)parent.postMessage({type:'gravuru-material-configuration',geometry,error,advance:Boolean(advance),name:$('#name').value},location.origin);
 if(advance&&error)status(error,true);
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==parent||!['gravuru-material-load','gravuru-material-init'].includes(event.data?.type))return;
 if(event.data.type==='gravuru-material-init'&&parentConfigurationLoaded){publishConfiguration(false);return;}
 if(!material){pendingParentConfiguration=event.data.geometry;return;}
 try{const geometry=plates.validate(event.data.geometry);parentConfigurationLoaded=true;form({id:null,name:'Ihre Konfiguration',geometry});publishConfiguration(false)}catch(e){status(e.message,true)}
});
window.addEventListener('workshop-ready',()=>{
 if(pendingParentConfiguration){try{const geometry=plates.validate(pendingParentConfiguration);parentConfigurationLoaded=true;form({id:null,name:'Ihre Konfiguration',geometry});pendingParentConfiguration=null}catch(e){status(e.message,true)}}
 if(!window.workshopAdmin){$('#save-template').textContent='Kontur übernehmen & gestalten';$('#approve').hidden=true;$('#form-eyebrow').textContent='IHRE KONFIGURATION';document.querySelector('.intro h1').textContent='Material, Kontur und Bohrbild';document.querySelector('.pill').textContent='Produkt konfigurieren';}
 if(parent!==window)parent.postMessage({type:'gravuru-material-ready'},location.origin);
 if(new URLSearchParams(location.search).get('material')==='acryl'&&!window.workshopAdmin){$('#acrylic-section').hidden=true;$('#select-acrylic').hidden=true;$('#select-steel').textContent='Grundplatte auswählen';for(const option of $('#draft-format').options)option.textContent=option.textContent.replace('Edelstahl','Grundplatte');}
 publishConfiguration(false);
});
// Original vector/PDF compiler runs locally; only validated SVG comes from the server.
const workshopFetch=window.fetch.bind(window);
window.fetch=async function(resource,options){
 const address=String(resource);if(!address.startsWith('/werkstatt-api'))return workshopFetch(resource,options);
 let pdf=false,target=address,opts=options;
 if(options?.body&&typeof options.body==='string'){try{const body=JSON.parse(options.body);if(body.format==='pdf'){pdf=true;opts={...options,body:JSON.stringify({...body,format:'svg'})}}}catch{}}
 if(address.includes('format=pdf')){pdf=true;target=address.replace('format=pdf','format=svg')}
 const response=await workshopFetch(target,opts);if(!pdf||!response.ok)return response;
 const svg=await response.text(),doc=new DOMParser().parseFromString(svg,'image/svg+xml'),root=doc.documentElement;
 const width=parseFloat(root.getAttribute('width')),height=parseFloat(root.getAttribute('height'));
 if(!Number.isFinite(width)||!Number.isFinite(height))throw Error('Die Exportmaße sind ungültig.');
 return new Response(await window.GravuruVector.pdf(svg,width,height),{status:200,headers:{'Content-Type':'application/pdf'}});
};
// Fit the iframe to the original surface without trapping mobile scrolling.
let lastHeight=0;new ResizeObserver(()=>{const height=document.documentElement.scrollHeight;if(parent!==window&&Math.abs(height-lastHeight)>2){lastHeight=height;parent.postMessage({type:'gravuru-material-height',height},location.origin)}}).observe(document.body);
if(new URLSearchParams(location.search).get('verwaltung')==='1')document.addEventListener('click',async e=>{const button=e.target.closest('[data-release]');if(!button)return;await run(async()=>{await api('/werkstatt-api/templates/release',{templateId:button.dataset.release,enabled:button.dataset.enabled!=='true'});await reload();status('Kundenfreigabe aktualisiert.');})});
const originalReload=reload;reload=async function(){await originalReload();if(window.workshopAdmin){for(const t of data.templates){const container=document.querySelector('[data-copy="'+CSS.escape(t.id)+'"]')?.closest('article');if(!container)continue;const button=document.createElement('button');button.type='button';button.dataset.release=t.id;button.dataset.enabled=String(!!t.enabled);button.textContent=t.enabled?'Kundenfreigabe zurücknehmen':'Für Kunden freigeben';container.append(button);if(t.enabled){const a=document.createElement('a');a.textContent='Kundenlink: Gestaltung nach Absprache';a.target='_top';a.href='/konfigurator?material=edelstahl&bearbeitung=gravur&ablauf=gestaltung&vorlage='+encodeURIComponent(t.id);container.append(a)}}}};


if(new URLSearchParams(location.search).has('kompakt'))document.body.classList.add('compact-mode');
