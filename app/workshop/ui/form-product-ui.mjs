import {merchantNavigation} from './merchant-navigation.mjs';
import {customerPreviewLink} from './customer-preview-link.mjs';
import {openRevisionCompare} from './revision-compare-ui.mjs';
import {merchantRequest as fetch} from './merchant-request.mjs';
import {installFormDesigns} from './form-design-ui.mjs';
const $=s=>document.querySelector(s),clone=v=>structuredClone(v),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mm=n=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(n)+' mm';
const id=new URLSearchParams(location.search).get('configuration');let record,currentRevision,draft,materials=[],manufacturing=[],choiceProfiles=[],token='',busy=false,dirty=false,serial=0,timer,historical=false;
let previewValue=null,previewMode='material',designer;
function showPreview(){
 const surface=previewValue?.materialPreview,hasSurface=Boolean(surface?.svg||previewValue?.designSvg),showMaterial=previewMode==='material'&&hasSurface;
 $('#show-material').textContent=previewValue?.designSvg?'Design & Material':'Materialansicht';
 $('#show-material').disabled=!hasSurface;$('#show-material').setAttribute('aria-pressed',String(showMaterial));$('#show-contour').setAttribute('aria-pressed',String(!showMaterial));
 $('#preview').classList.toggle('material-canvas',showMaterial);
 $('#preview').innerHTML=showMaterial?(surface.svg||previewValue.designSvg):previewValue?.svg||'';
 $('#surface-note').textContent=showMaterial?surface.note:hasSurface?'Technische Konturprüfung ohne Oberfläche. Über „Materialansicht“ siehst du die zugeordnete Oberfläche.':surface?.note||'Vorschau wird aktualisiert …';
 const picture=$('#preview image');if(picture)picture.addEventListener('error',()=>{surface.svg=null;surface.note='Die Materialstruktur konnte nicht geladen werden. Angezeigt wird die neutrale Formansicht.';showPreview();},{once:true});
 const artwork=$('#preview image[data-design-source]');if(artwork)artwork.addEventListener('error',()=>notice('Die Designvorschau konnte nicht geladen werden. Bitte neu laden; der gespeicherte Stand bleibt erhalten.',true),{once:true});
}
function acceptPreview(value){previewValue=value;showPreview();$('#readiness').innerHTML=value.readiness.map(t=>'<li>'+esc(t)+'</li>').join('');}
function clearPreview(){previewValue=null;showPreview();}
$('#show-material').addEventListener('click',()=>{previewMode='material';showPreview();});
$('#show-contour').addEventListener('click',()=>{previewMode='contour';showPreview();});
function notice(text,error=false){$('#notice').textContent=text;$('#notice').classList.toggle('error',error);}
async function api(url,body,method='POST'){const r=await fetch(url,body?{method,headers:{'Content-Type':'application/json','X-Gravuru-CSRF':token},body:JSON.stringify(body)}:{});const value=await r.json();if(!r.ok)throw Object.assign(Error(value.error?.message||'Anfrage fehlgeschlagen.'),{status:r.status});return value;}
const url=()=>'/api/workshop/products/'+encodeURIComponent(id);
function sync(){
 $('#compare-revisions').hidden=!historical;$('#compare-revisions').disabled=busy;
 const readOnly=busy||historical||record?.status==='archived';
 $('#print-surface-options').hidden=draft?.processingMethod!=='print';
 for(const input of document.querySelectorAll('#product-form input,#product-form select,#product-form textarea'))input.disabled=readOnly;
 $('#save').disabled=readOnly||!dirty;$('#history').disabled=busy;$('#restore').disabled=busy||record?.status==='archived';$('#restore').hidden=!historical;
 $('#copy').disabled=busy||historical||dirty;$('#archive').disabled=busy||historical||dirty;$('#save-separate').disabled=busy;$('#reload').disabled=busy;
 $('#pdf').hidden=dirty;$('#original').hidden=dirty;$('#export-note').textContent=dirty?'Für die Kontur-PDF zuerst speichern. Dein bisheriger gespeicherter Stand bleibt erhalten.':'PDF aus Stand '+record?.revision+' · reine Konturprüfung ohne Farbe, Weißkanal oder Fertigungsfreigabe.';
 $('#shop-preparation').hidden=dirty;if(record)$('#shop-preparation').href='/werkstatt/shopvorbereitung/?configuration='+id+'&revision='+record.revision;
 $('#preview-state').textContent=dirty?'Entwurf':historical?'Historischer Stand':'Gespeichert';
 const canPreview=record?.document.designs?.length&&!dirty&&record.status!=='archived';$('#customer-view').hidden=!canPreview;if(canPreview){const preview=customerPreviewLink(id,record.revision);$('#customer-view').href=preview.href;$('#customer-view').target=preview.target;}$('#customer-view-note').textContent=dirty?'Zuerst Änderungen speichern.':canPreview?'Privaten Testentwurf aus diesem gespeicherten Stand öffnen. Keine Shopfreigabe.':record?.status==='archived'?'Zum Prüfen das Produkt zuerst wieder aktivieren.':'Zuerst ein Design zuordnen und speichern.';
 designer?.render();
}
const choiceTypes={fonts:'Schriften',motifs:'Motive',colors:'Farben',bestsellers:'Bestseller'};
function renderChoiceProfiles(){
 $('#choice-profiles-enabled').checked=Boolean(draft.profileAssignments);$('#choice-profiles').hidden=!draft.profileAssignments;
 $('#category-ids').value=draft.categoryIds.join(',');
 $('#choice-profiles').innerHTML=Object.entries(choiceTypes).map(([type,label])=>`<label>${label}<select data-choice-profile="${type}"><option value="inherit">Vererben</option><option value="empty">Ausdrücklich leer</option>${choiceProfiles.filter(p=>p.type===type).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · Stand ${p.revision}</option>`).join('')}</select></label>`).join('');
 for(const el of $('#choice-profiles').querySelectorAll('select')){const a=draft.profileAssignments?.[el.dataset.choiceProfile];el.value=a?.mode==='override'?a.profileId:a?.mode||'inherit';}
}
function manufacturingChoices(){
 const matches=p=>!p.document.archived&&p.document.method===draft.processingMethod&&p.document.materialId===draft.material.id&&p.document.thicknessMm===draft.material.thicknessMm;
 const options=manufacturing.filter(matches),old=record.metadata?.productionProfile,ref=draft.productionProfile;
 if(old&&ref?.id===old.id&&ref.revision===old.revision&&!options.some(p=>p.id===old.id&&p.revision===old.revision))options.push(old);
 $('#production-profile').innerHTML='<option value="">Noch nicht zugeordnet</option>'+options.map(p=>`<option value="${p.id}:${p.revision}">${esc(p.document.name)} · Stand ${p.revision}${matches(p)?'':' · Zuordnung prüfen'}</option>`).join('');
 $('#production-profile').value=ref?ref.id+':'+ref.revision:'';
 $('#production-profile-note').textContent=ref?'Fester Profilstand. Änderungen am Profil werden nicht automatisch auf dieses Produkt übertragen.':'Angezeigt werden Profile für das gewählte Verfahren, Material und die tatsächliche Stärke.';
}
function reference(){const m=materials.find(m=>m.id===draft.material.id);$('#material-reference').textContent=m?.note||'Material wählen; fehlende Stärken bleiben ausdrücklich offen.';$('#material-summary').textContent=(m?.name||'Material noch offen')+' · '+(draft.material.thicknessMm===null?'Stärke noch offen':mm(draft.material.thicknessMm));}
async function preview(){const ticket=++serial;try{const value=await api(url()+'/form-preview',{expectedRevision:currentRevision,document:draft,...(designer?.selected()?{designId:designer.selected()}:{})});if(ticket!==serial)return;acceptPreview(value);}catch(e){if(ticket===serial)failure(e);}}
function failure(e){notice(e.message,true);if(e.status===409)$('#conflict').hidden=false;}
function render(next){
 const ticket=++serial;clearTimeout(timer);clearPreview();record=next;draft=clone(record.document);dirty=false;historical=record.revision!==currentRevision;
 $('#title').textContent=draft.name;$('#revision').textContent='Stand '+record.revision+(historical?' · historisch':record.status==='archived'?' · archiviert':' · gespeichert');
 $('#scene').value=draft.presentation?.scene||'transparent';$('#print-surface').value=draft.presentation?.printSurface||'';$('#seo-title').value=draft.seo.title;$('#seo-description').value=draft.seo.description;$('#name').value=draft.name;$('#kind').value=draft.kind;$('#material').value=draft.material.id||'';$('#thickness').value=draft.material.thicknessMm??'';$('#method').value=draft.processingMethod||'';$('#surface').value=draft.material.surfaceNotes;$('#price').value=draft.basePriceCents===null?'':(draft.basePriceCents/100).toFixed(2).replace('.',',');
 const g=draft.form.geometry;$('#width').textContent=mm(g.widthMm);$('#height').textContent=mm(g.heightMm);$('#holes').textContent=g.holeCount;reference();manufacturingChoices();renderChoiceProfiles();
 $('#pdf').href=url()+'/contour.pdf?revision='+record.revision;$('#original').href='/api/workshop/contours/'+draft.form.contourId+'/original';$('#product-id').textContent='Produkt: '+id;$('#contour-id').textContent='Kontur: '+draft.form.contourId;$('#geometry-hash').textContent='Geometrie SHA-256: '+draft.form.geometrySha256;
 $('#archive').textContent=record.status==='archived'?'Wieder aktivieren':'Archivieren';$('#workspace').hidden=false;$('#conflict').hidden=true;sync();
 api(url()+'/form-preview?revision='+record.revision+'&designId='+encodeURIComponent(designer?.selected()||'')).then(value=>{if(ticket!==serial)return;acceptPreview(value);}).catch(e=>{if(ticket===serial)failure(e);});
}
async function history(){const {revisions}=await api(url()+'/revisions');$('#history').innerHTML=revisions.map(r=>`<option value="${r.revision}">Stand ${r.revision}${r.revision===currentRevision?' · aktuell':''}</option>`).join('');$('#history').value=record.revision;}
async function current(){const r=await api(url());if(r.document?.schema!=='gravuru-form-product/v1')throw Error('Dieses Produkt gehört zum bestehenden Acryl-Editor. Bitte über Produkte öffnen.');currentRevision=r.revision;render(r);await history();}
function readInputs(){
 draft.categoryIds=[...new Set($('#category-ids').value.split(',').map(v=>v.trim()).filter(Boolean))];
 if($('#choice-profiles-enabled').checked)draft.profileAssignments=Object.fromEntries([...$('#choice-profiles').querySelectorAll('select')].map(el=>[el.dataset.choiceProfile,['inherit','empty'].includes(el.value)?{mode:el.value,profileId:null}:{mode:'override',profileId:el.value}]));else delete draft.profileAssignments;
 $('#choice-profiles').hidden=!draft.profileAssignments;
 draft.seo={title:$('#seo-title').value,description:$('#seo-description').value};draft.name=$('#name').value;draft.kind=$('#kind').value;if(draft.kind==='master')draft.masterId=null;
 const scene=$('#scene').value,printSurface=$('#print-surface').value;if(draft.presentation||scene!=='transparent'||printSurface)draft.presentation={scene,...(printSurface?{printSurface}:{})};
 draft.material.id=$('#material').value||null;draft.material.thicknessMm=$('#thickness').value===''?null:Number($('#thickness').value);draft.material.surfaceNotes=$('#surface').value;draft.processingMethod=$('#method').value||null;
 const selected=$('#production-profile').value;if(selected){const [id,rev]=selected.split(':');draft.productionProfile={id,revision:Number(rev)};}else draft.productionProfile=null;
 const price=$('#price').value.trim(),m=/^(\d+)(?:[.,](\d{1,2}))?$/.exec(price);draft.basePriceCents=price===''?null:m?Number(m[1])*100+Number((m[2]||'').padEnd(2,'0')):NaN;
}
$('#product-form').addEventListener('input',()=>{if(busy||historical||record.status==='archived')return;const previousMaterial=draft.material.id;readInputs();dirty=true;$('#title').textContent=draft.name;reference();manufacturingChoices();sync();clearTimeout(timer);++serial;if(previousMaterial!==draft.material.id)clearPreview();if($('#product-form').checkValidity())timer=setTimeout(preview,300);});
$('#product-form').addEventListener('submit',e=>e.preventDefault());
$('#save').addEventListener('click',async()=>{if(busy||!$('#product-form').reportValidity())return;busy=true;sync();try{const r=await api(url(),{expectedRevision:currentRevision,document:draft},'PATCH');currentRevision=r.revision;render(r);await history();notice('Gespeichert. Stand '+r.revision+' ist jetzt verfügbar.');}catch(e){failure(e);}finally{busy=false;sync();}});
$('#history').addEventListener('change',async()=>{if(dirty&&!confirm('Ungespeicherte Änderungen verwerfen und den gewählten Stand ansehen?')){$('#history').value=record.revision;return;}busy=true;sync();try{render(await api(url()+'?revision='+$('#history').value));notice(historical?'Historischer Stand: unveränderlich. Die PDF gehört genau zu diesem Stand.':'Aktueller Stand geladen.');}catch(e){failure(e);}finally{busy=false;sync();}});
$('#compare-revisions').addEventListener('click',()=>{if(!busy&&historical)void openRevisionCompare({id,from:record.revision,to:currentRevision});});
$('#restore').addEventListener('click',async()=>{if(busy||!historical)return;busy=true;sync();try{const r=await api(url()+'/restore',{expectedRevision:currentRevision,revision:record.revision});currentRevision=r.revision;render(r);await history();notice('Früheren Stand als neue Revision '+r.revision+' übernommen.');}catch(e){failure(e);}finally{busy=false;sync();}});
$('#reload').addEventListener('click',async()=>{if(dirty&&!confirm('Deine ungespeicherten Eingaben verwerfen und aktuellen Stand laden?'))return;busy=true;sync();try{await current();notice('Aktueller Stand geladen.');}catch(e){failure(e);}finally{busy=false;sync();}});
$('#save-separate').addEventListener('click',async()=>{if(busy||!$('#product-form').reportValidity())return;busy=true;sync();try{const r=await api('/api/workshop/products',{document:draft});dirty=false;location.href=merchantNavigation('/werkstatt/formprodukt/?configuration='+encodeURIComponent(r.id),location.href);}catch(e){failure(e);busy=false;sync();}});
$('#copy').addEventListener('click',async()=>{if(busy||dirty||historical)return;busy=true;sync();try{const r=await api(url()+'/copy',{expectedRevision:currentRevision,name:record.document.name+' · Kopie',kind:'product'});location.href=merchantNavigation('/werkstatt/formprodukt/?configuration='+encodeURIComponent(r.id),location.href);}catch(e){failure(e);busy=false;sync();}});
$('#archive').addEventListener('click',async()=>{if(busy||dirty||historical)return;busy=true;sync();try{const r=await api(url()+'/archive',{expectedRevision:currentRevision,archived:record.status!=='archived'});currentRevision=r.revision;render(r);await history();notice(r.status==='archived'?'Archiviert. Alle Stände bleiben erhalten.':'Wieder aktiviert.');}catch(e){failure(e);}finally{busy=false;sync();}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
designer=installFormDesigns({api,validateBase:()=>$('#product-form').reportValidity(),state:()=>({draft,record,revision:currentRevision,readOnly:busy||historical||record?.status==='archived'}),setBusy:value=>{busy=value;sync();},notify:notice,onSelect:()=>{clearPreview();preview();},onChange:async(next,designId)=>{clearTimeout(timer);++serial;const value=await api(url()+'/form-preview',{expectedRevision:currentRevision,document:next,...(designId?{designId}:{})});draft=next;dirty=true;acceptPreview(value);reference();sync();}});
try{if(!/^cfg_[a-f0-9-]+$/.test(id||''))throw Error('Bitte ein Formprodukt aus der Werkstatt öffnen.');token=(await api('/api/workshop/session')).csrfToken;materials=(await api('/api/workshop/form-materials')).materials;manufacturing=(await api('/api/workshop/production-profiles')).profiles;choiceProfiles=(await api('/api/workshop/profiles')).profiles;$('#material').insertAdjacentHTML('beforeend',materials.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''));await current();const v=new URLSearchParams(location.search).get('revision');if(v&&Number(v)!==currentRevision){render(await api(url()+'?revision='+encodeURIComponent(v)));$('#history').value=record.revision;}}catch(e){notice(e.message,true);}
