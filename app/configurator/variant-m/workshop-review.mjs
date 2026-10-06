import {cleanObject} from './contract.mjs';
import {printArtwork} from './print-export.mjs';
import {createAcrylicDraftClient} from './acrylic-draft-client.mjs';

const base64=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Die Bilddatei konnte nicht gelesen werden.'));reader.readAsDataURL(blob);});
async function referencePng(svg,geometry){
 const canvas=document.createElement('canvas');canvas.height=900;canvas.width=Math.round(900*geometry.width/geometry.height);
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png').split(',')[1];}finally{URL.revokeObjectURL(url);}
}

export function installWorkshopReview(api,footer){
 const binding=window.parent.GravuruWorkshopReview;
 if(!binding||!api.config?.acrylic)return;
 const button=document.createElement('button'),status=document.createElement('p'),link=document.createElement('a');
 button.type='button';button.textContent='Für die Werkstattprüfung sichern';button.dataset.acrylicReview='';status.setAttribute('role','status');status.setAttribute('aria-live','polite');link.textContent='Gesicherten Stand im Dashboard öffnen →';link.target='_blank';link.rel='noopener';link.hidden=true;link.dataset.acrylicReviewLink='';
 footer.append(button,status,link);let busy=false,savePrivate;
 button.onclick=async()=>{
  if(busy)return;busy=true;button.disabled=true;link.hidden=true;status.textContent='Gestaltung und Originalbilder werden gesichert …';
  try{
   if(api.pending?.())throw Error('Bitte warten, bis das Foto vollständig geladen ist.');
   const fingerprint=JSON.stringify(api.el.state),art=await printArtwork(api),used=new Set(api.el.state.objects.filter(o=>!o.uxHidden&&o.uxUploadId).map(o=>o.uxUploadId)),media=[];
   for(const id of used){const asset=api.files.get(id);if(!asset?.file)throw Error('Ein Originalfoto fehlt. Bitte erneut hochladen.');media.push({id,original:await base64(asset.file),...(asset.blob?{edited:await base64(asset.blob)}:{})});}
   const payload={...binding,designId:api.el.state.designId,objects:api.el.state.objects.map(cleanObject),options:api.el.state.mOptions,quantity:Number(api.r.querySelector('[data-fk-quantity]').value||1),media,preview:await referencePng(art.svg,art.geometry)};
   if(fingerprint!==JSON.stringify(api.el.state))throw Error('Die Gestaltung wurde während der Sicherung geändert. Bitte erneut sichern.');
   const session=await fetch('/api/workshop/session'),credentials=await session.json();if(!session.ok||credentials.scope!=='local-operator')throw Error('Die Werkstattprüfung benötigt eine geschützte Werkstattsitzung.');
   savePrivate??=createAcrylicDraftClient({storage:sessionStorage});
   const result=await savePrivate(payload,credentials.csrfToken);
   link.href='/werkstatt/pruefstaende/?snapshot='+encodeURIComponent(result.id);link.hidden=false;
   status.textContent='Gestaltung mit Originalbildern als Revision '+result.revision+' gesichert. Frühere Prüfstände bleiben erhalten. Dies ist noch keine Bestellung.'+(result.accessStored?'':' Der private Zugriff bleibt nur bis zum Schließen dieser Seite verfügbar; bitte den Dashboard-Link geöffnet lassen.');
  }catch(error){status.textContent=error.message;}finally{busy=false;button.disabled=false;}
 };
}
