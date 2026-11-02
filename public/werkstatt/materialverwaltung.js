'use strict';
const $=s=>document.querySelector(s),plates=window.GravuruPlateGeometry;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token,data,material,parentId=null,busy=false,holeOverrides=[],lastPreview=null,drag=null,removedId=null,selectedHole=null,selectedLayer=null,acceptedClearanceKey=null,layerOptionsHidden=false,acrylicAnchorInset=10,showGuides=false,plateLocks={acrylic:true,steel:true},centerProposal=null;
const modelSelect=$('#bell-model');modelSelect.append(new Option('Keine Klingel – Modell auswählen',''),new Option('AOSU Pro · bisherige Vorlage','legacy'),...plates.bellModels.map(m=>new Option(m.name,m.id)));modelSelect.options[1].hidden=true;
function chosenModel(){return plates.modelFor({modelId:modelSelect.value==='legacy'?'':modelSelect.value});}
function modelSize(){if(!modelSelect.value){$('#bell-model-size').textContent='Modell auswählen – die Klingel erscheint direkt auf Ihrer Platte.';return}const m=chosenModel(),r=m.bell;$('#bell-model-size').textContent=`${m.name||'AOSU Pro'} · Positionsrahmen ${r.width.toFixed(1)} × ${r.height.toFixed(1)} mm · Originalausschnitte hinterlegt`;}
const acrylicBase=new URLSearchParams(location.search).get('material')==='acryl';
const printMode=new URLSearchParams(location.search).get('bearbeitung')==='druck';$('#print-finish-field').hidden=!printMode;
$('#base-acrylic-options').hidden=!acrylicBase;
if(printMode&&!acrylicBase){const select=$('#acrylic-color');select.replaceChildren(new Option('Weißes Acrylglas · matter Druck','weiss-matt'),new Option('Klares Acrylglas · hochglänzende Optik','klar-hochglanz'));select.parentElement.firstChild.textContent='Druckausführung';$('#acrylic-section h3').textContent='Bedrucktes Acrylglas';$('#acrylic-section .bell-intro').textContent='Vorne: bedrucktes Acrylglas · hinten: Edelstahl-Grundplatte. Maße und Bohrungen oben gelten für Edelstahl.';}

const fields=['widthMm','heightMm','cornerRadiusMm','holeCount','holeDiameterMm','edgeMm'];
async function api(url,body){const r=await fetch(url,body?{method:'POST',headers:{'content-type':'application/json','x-gravuru-token':token},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Error(d.error||'Aktion fehlgeschlagen.');return d;}
function status(text,error=false){$('#status').textContent=text;$('#status').classList.toggle('error',error);}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(e.message,true);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);if(material)$('#approve').disabled=!!material.approved_at;preview();}}
function basic(){return {...(Number($('#spacer-count').value)?{spacers:{count:Number($('#spacer-count').value)}}:{}),...(acrylicBase?{baseAcrylicThicknessMm:Number($('#base-acrylic-thickness').value),...(printMode?{baseAcrylicFinish:$('#print-finish').value}:{})}:{}),shape:$('#shape').value,...Object.fromEntries(fields.map(k=>[k,Number($('#'+k).value)]))};}
function input(){const g={...basic(),holeOverrides:Array.from({length:Number($('#holeCount').value)},(_,i)=>holeOverrides[i]||null)};if($('#acrylic-enabled').checked||$('#bell-enabled').checked)g.assembly={reference:chosenModel().revision,...(modelSelect.value&&modelSelect.value!=='legacy'?{modelId:modelSelect.value}:{}),acrylic:$('#acrylic-enabled').checked?{x:Number($('#acrylic-x').value),y:Number($('#acrylic-y').value),width:Number($('#acrylic-width').value),height:Number($('#acrylic-height').value),shape:$('#acrylic-shape').value,cornerRadiusMm:Number($('#acrylic-radius').value),thicknessMm:Number($('#acrylic-thickness').value),color:$('#acrylic-color').value}:null,bell:$('#bell-enabled').checked?{x:Number($('#bell-x').value),y:Number($('#bell-y').value)}:null};if(acceptedClearanceKey)g.screwClearanceAcceptedFor=acceptedClearanceKey;return g;}
function holeRows(){const g=basic(),hs=plates.holes(g);holeOverrides=Array.from({length:g.holeCount},(_,i)=>holeOverrides[i]||null);$('#hole-positions').innerHTML=hs.map((h,i)=>{const p=holeOverrides[i],locked=!p||p.locked;return `<div class="hole-row"><strong>Bohrung ${i+1}</strong><label>X (mm)<input aria-label="Bohrung ${i+1} X" data-hole="${i}" data-axis="x" type="number" step="0.01" value="${p?.x??h.x}" ${locked?'disabled':''}></label><label>Y (mm)<input aria-label="Bohrung ${i+1} Y" data-hole="${i}" data-axis="y" type="number" step="0.01" value="${p?.y??h.y}" ${locked?'disabled':''}></label><label class="check"><input aria-label="Bohrung ${i+1} entsperren" type="checkbox" data-unlock="${i}" ${locked?'':'checked'}>Entsperrt</label><button type="button" data-reset="${i}">Standard</button><button type="button" data-symmetry="${i}" ${locked?'disabled':''}>Von hier symmetrisch anordnen</button></div>`;}).join('');}
$('#hole-positions').onclick=e=>{const t=e.target;if(t.dataset.reset!==undefined){holeOverrides[Number(t.dataset.reset)]=null;holeRows();preview();}if(t.dataset.symmetry!==undefined){const i=Number(t.dataset.symmetry);if(holeOverrides[i]?.locked!==false)return;holeOverrides=plates.symmetricHoles(input(),i);holeRows();preview();status('Bohrungen spiegelbildlich angeordnet. Die Sperren für die Einzelbearbeitung bleiben erhalten.');}};
function layersForm(a){modelSelect.value=a?.bell?a.modelId||'legacy':'';modelSize();$('#acrylic-enabled').checked=!acrylicBase&&!!a?.acrylic;$('#acrylic-thickness').value=String(a?.acrylic?.thicknessMm||3);$('#bell-enabled').checked=!!a?.bell;if(a?.acrylic){for(const k of ['x','y','width','height'])$('#acrylic-'+k).value=a.acrylic[k];$('#acrylic-shape').value=a.acrylic.shape;$('#acrylic-radius').value=a.acrylic.cornerRadiusMm;$('#acrylic-color').value=printMode?(['weiss-matt','klar-hochglanz'].includes(a.acrylic.color)?a.acrylic.color:'weiss-matt'):a.acrylic.color;}if(a?.bell){$('#bell-x').value=a.bell.x;$('#bell-y').value=a.bell.y;}}


const anchorOptions=[['11','Mittig zentriert'],['01','Links mittig'],['21','Rechts mittig'],['10','Oben mittig'],['12','Unten mittig'],['00','Links oben'],['20','Rechts oben'],['02','Links unten'],['22','Rechts unten']];
function anchorSelect(id){return '<label class="anchor-choice">Ausrichtung<select id="'+id+'"><option value="free">Frei positioniert</option>'+anchorOptions.map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('')+'</select></label>';}
function currentAnchor(g,type){
 const a=type==='acrylic'?g.assembly?.acrylic:plates.holes(g)[selectedHole];if(!a)return 'free';
 const width=type==='acrylic'?a.width:0,height=type==='acrylic'?a.height:0,inset=type==='acrylic'?acrylicAnchorInset:g.edgeMm;
 return anchorOptions.find(([key])=>{const p=plates.anchorPosition(g,key,width,height,inset);return Math.abs(p.x-a.x)<.05&&Math.abs(p.y-a.y)<.05;})?.[0]||'free';
}
function applyAnchor(type,key){
 if(key==='free')return;const g=input(),a=type==='acrylic'?g.assembly?.acrylic:plates.holes(g)[selectedHole];if(!a)return;
 if(type==='acrylic'&&plateLocks.acrylic&&!document.body.classList.contains('compact-mode'))return;if(type==='hole'&&holeOverrides[selectedHole]?.locked!==false)return;
 const p=plates.anchorPosition(g,key,type==='acrylic'?a.width:0,type==='acrylic'?a.height:0,type==='acrylic'?acrylicAnchorInset:g.edgeMm);
 if(type==='acrylic'){$('#acrylic-x').value=p.x;$('#acrylic-y').value=p.y;}else{holeOverrides[selectedHole]={...holeOverrides[selectedHole],...p};holeRows();}preview();
}
function anchorGuides(g){
 if(!showGuides)return '';
 const type=selectedLayer==='acrylic'?'acrylic':selectedHole!==null?'hole':null;if(!type)return '';
 const a=type==='acrylic'?g.assembly?.acrylic:plates.holes(g)[selectedHole];if(!a)return '';
 const key=currentAnchor(g,type),inset=type==='acrylic'?acrylicAnchorInset:g.edgeMm,active=key==='free'?null:plates.anchorPosition(g,key,0,0,inset),r=Math.max(g.widthMm,g.heightMm)/130;
 let out='<g class="anchor-guides" pointer-events="none" fill="none" stroke="#2e9a98" stroke-width=".55"><path stroke-dasharray="3 3" d="M'+g.widthMm/2+' 0V'+g.heightMm+' M0 '+g.heightMm/2+'H'+g.widthMm+'"/>';
 for(const [id] of anchorOptions){const p=plates.anchorPosition(g,id,0,0,inset);out+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+r+'" opacity=".55"/>';}
 if(active)out+='<path stroke-dasharray="2 2" d="M'+active.x+' 0V'+g.heightMm+' M0 '+active.y+'H'+g.widthMm+'"/><circle cx="'+active.x+'" cy="'+active.y+'" r="'+r*2+'" stroke-width="1.1"/><circle cx="'+active.x+'" cy="'+active.y+'" r="'+r*.5+'" fill="#2e9a98"/>';
 return out+'</g>';
}
function rulers(g,margin){
 const w=g.widthMm,h=g.heightMm,font=margin*.24,gap=margin*.22,tick=margin*.12;
 const desired=Math.max(w,h)/7,step=[1,2,5,10,20,25,50,100].find(n=>n>=desired)||100;
 const ticks=length=>{const a=[];for(let n=0;n<=length;n+=step)a.push(n);if(length-a.at(-1)>step*.45)a.push(length);else if(a.at(-1)!==length)a[a.length-1]=length;return a;};
 let minor='';for(let x=step/5;x<w;x+=step/5)minor+='<path d="M'+x+' '+(-gap-tick/4)+'v'+(tick/2)+' M'+x+' '+(h+gap-tick/4)+'v'+(tick/2)+'"/>';for(let y=step/5;y<h;y+=step/5)minor+='<path d="M'+(-gap-tick/4)+' '+y+'h'+(tick/2)+' M'+(w+gap-tick/4)+' '+y+'h'+(tick/2)+'"/>';
 let markup='<g class="measurement-rulers" pointer-events="none" fill="#425e50" font-size="'+font+'" font-family="Segoe UI,Arial,sans-serif">';
 markup+='<g stroke="#8b9d8d" stroke-width=".3" fill="none">'+minor+'</g>';
 for(const y of [-gap,h+gap]){markup+='<path d="M0 '+y+'H'+w+'" fill="none" stroke="#8b9d8d" stroke-width=".4"/>';for(const x of ticks(w)){markup+='<path d="M'+x+' '+(y-tick/2)+'v'+tick+'" stroke="#8b9d8d" stroke-width=".4"/><text x="'+x+'" y="'+(y<0?y-tick:y+tick+font)+'" text-anchor="middle">'+x+'</text>';}}
 for(const x of [-gap,w+gap]){markup+='<path d="M'+x+' 0V'+h+'" fill="none" stroke="#8b9d8d" stroke-width=".4"/>';for(const y of ticks(h)){markup+='<path d="M'+(x-tick/2)+' '+y+'h'+tick+'" stroke="#8b9d8d" stroke-width=".4"/><text x="'+(x<0?x-tick:x+tick)+'" y="'+(y+font*.35)+'" text-anchor="'+(x<0?'end':'start')+'">'+y+'</text>';}}
 markup+='<text x="'+(w/2)+'" y="'+(-margin*.8)+'" text-anchor="middle">X · mm von links</text><text x="'+(w/2)+'" y="'+(h+margin*.86)+'" text-anchor="middle">Y · mm von oben · Nullpunkt links oben</text>';
 const selected=selectedHole===null?null:plates.holes(g)[selectedHole];
 if(selected&&Number.isFinite(selected.x)&&Number.isFinite(selected.y))markup+='<path d="M'+selected.x+' '+(-gap)+'V'+selected.y+'H'+(-gap)+'" stroke="#d07200" stroke-width=".65" stroke-dasharray="2 2" fill="none"/><circle cx="'+selected.x+'" cy="'+selected.y+'" r="'+(selected.diameter/2+2)+'" fill="none" stroke="#d07200" stroke-width=".7"/>';
 return markup+'</g>';
}
function svg(g,id){const draft=id==='draft-plate',geo=plates.geometry(g,draft),margin=draft?Math.max(g.widthMm,g.heightMm)*(new URLSearchParams(location.search).has("kompakt")&&window.innerWidth<=700&&!showGuides ? .02 : .115):3;return `<svg role="img" aria-label="${g.widthMm} mal ${g.heightMm} Millimeter" xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${g.widthMm+2*margin} ${g.heightMm+2*margin}"><defs><clipPath id="${id}"><path d="${geo.clip}" clip-rule="evenodd"/></clipPath></defs><path d="${geo.outline}" transform="translate(.675 .675)" fill="#737a7d"/>${new URLSearchParams(location.search).get("material")==="acryl"?`<path d="${geo.outline}" fill="${g.baseAcrylicFinish==='weiss-matt'?'#ffffff':g.baseAcrylicFinish==='klar-hochglanz'?'#dce8ee':'#45494c'}"/>`:`<image href="${esc(material.previewUrl||material.imageUrl)}" width="${g.widthMm}" height="${g.heightMm}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`}<path d="${geo.outline}" fill="none" stroke="#536c55" stroke-width=".3"/>${draft?`<path data-steel="true" d="${geo.outline}" fill="transparent"/>`:""}${plates.assemblyPreview(g)}${draft?acrylicTarget(g):''}${draft?(showGuides?rulers(g,margin):'')+layerSelection(g):''}${draft&&g.assembly?.bell?`<rect data-drag-bell="true" class="movable" x="${g.assembly.bell.x}" y="${g.assembly.bell.y}" width="${plates.modelFor(g).bell.width}" height="${plates.modelFor(g).bell.height}" fill="transparent"/>`:""}${geo.holes.map((h,i)=>`${draft?`<circle data-drag-hole="${i}" class="${holeOverrides[i]?.locked===false?'movable':'locked'}" cx="${h.x}" cy="${h.y}" r="${Math.max(h.r,6)}" fill="transparent"/>`:""}<circle ${draft?`data-drag-hole="${i}" class="${holeOverrides[i]?.locked===false?'movable':'locked'}"`:""} cx="${h.x}" cy="${h.y}" r="${h.r}" fill="#f2f4ee" stroke="#536c55" stroke-width=".3"/>`).join('')}${id==='draft-plate'?geo.holes.map((h,i)=>`<text x="${h.x+3}" y="${h.y-3}" font-size="4" fill="#d07200">${i+1}</text>`).join(''):''}${plates.spacerPreview(g)}${draft?acrylicHandles(g)+anchorGuides(g)+centerMarkers(g):''}</svg>`;}
function warningMarkup(message,target){
 const holes=target?.holes||[],field=target?.field;
 const primary=target?.preferField&&field?'field:'+field:holes.length?'hole:'+holes[0]:'field:'+(field||'widthMm');
 let text='<button type="button" class="warning-link" data-warning-target="'+primary+'">'+'<span aria-hidden="true">⚠</span> '+esc(message)+' <span>→ Jetzt anpassen</span></button>';
 if(holes.length>1||holes.length&&field){text+='<span class="warning-targets">'+holes.map(i=>'<button type="button" data-warning-target="hole:'+i+'">Bohrung '+(i+1)+'</button>').join('')+(field?'<button type="button" data-warning-target="field:'+field+'">'+(field.startsWith('bell-')?'Klingel':'Ebene')+' bearbeiten</button>':'')+'</span>';}
 return text;
}
function focusWarning(target){
 if(busy)return;document.querySelectorAll('.warning-focus').forEach(e=>e.classList.remove('warning-focus'));
 if(target.startsWith('hole:')){const i=Number(target.slice(5));if(!plates.holes(input())[i])return;selectedLayer=null;selectedHole=i;preview();$('#preview-shell').scrollIntoView({behavior:'smooth',block:'center'});const field=$('#hole-popover-x').disabled?$('#hole-popover-unlock'):$('#hole-popover-x');field.focus({preventScroll:true});}
 else{layerOptionsHidden=false;const id=target.slice(6),field=$('#'+id);if(!field)return;selectedHole=null;selectedLayer=id.startsWith('bell-')?'bell':id.startsWith('acrylic-')?'acrylic':'steel';preview();$('#preview-shell').scrollIntoView({behavior:'smooth',block:'center'});const direct=$('#layer-popover [data-layer-field="'+id+'"]')||$('#layer-popover input');direct?.focus({preventScroll:true});}
}
for(const id of ['geometry-note','screw-note','symmetry-note'])$('#'+id).onclick=e=>{const b=e.target.closest('[data-warning-target]');if(b)focusWarning(b.dataset.warningTarget);};
function templateDownloads(t){
 const link=(layer,format,label)=>'<button type="button" data-download="'+esc(t.id)+'" data-layer="'+layer+'" data-format="'+format+'">'+label+'</button>';
 return '<div class="template-downloads"><strong>Konstruktion herunterladen</strong><p>Maßhaltig · ohne Gravur, Skala und Positionshilfen</p><div class="actions">'+link('steel','pdf','Edelstahl PDF')+link('steel','svg','Edelstahl SVG')+(t.geometry.assembly?.acrylic?link('acrylic','pdf','Acryl PDF')+link('acrylic','svg','Acryl SVG')+link('overview','svg','Ebenenübersicht SVG'):'')+'</div>'+(t.geometry.assembly?.acrylic?'<p>Ebenenübersicht nur zur Zuordnung, keine Fertigungsdatei.</p>':'')+'</div>';
}
async function downloadTemplate(button){
 const id=button.dataset.download,layer=button.dataset.layer,format=button.dataset.format;
 const response=await fetch('/werkstatt-api/templates/'+encodeURIComponent(id)+'/export?layer='+layer+'&format='+format);
 if(!response.ok){let message='Download fehlgeschlagen.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
 const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download='vorlage-'+id+'-'+layer+'.'+format;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Konstruktionsdatei heruntergeladen: '+layer+' · '+format.toUpperCase()+'.');
}
function preview(){
 if(!material)return;
 normalizeMeasurements();$('#spacer-note').hidden=!Number($('#spacer-count').value);$('#holeCount').disabled=!!Number($('#spacer-count').value);$('#holeDiameterMm').disabled=!!Number($('#spacer-count').value);
 const noBell=acrylicBase||($('#acrylic-enabled').checked&&$('#acrylic-thickness').value==='5');modelSelect.disabled=noBell||busy;$('#bell-compatibility').hidden=!noBell;$('#bell-compatibility').textContent=acrylicBase?'Eine Funkklingel ist nur mit Edelstahl-Grundplatte möglich.':'Bei 5 mm Acrylglas ist keine Funkklingel möglich. Wählen Sie 3 mm, wenn Sie eine Funkklingel hinzufügen möchten.';
 $('#select-acrylic').disabled=!$('#acrylic-enabled').checked||busy;$('#assembly-fields').hidden=!$('#acrylic-enabled').checked;$('#add-acrylic').hidden=$('#acrylic-enabled').checked;$('#remove-acrylic').hidden=printMode||!$('#acrylic-enabled').checked;$('#acrylic-section').classList.toggle('has-acrylic',$('#acrylic-enabled').checked);$('#bell-fields').hidden=!$('#bell-enabled').checked;$('#remove-bell').hidden=!$('#bell-enabled').checked;$('#klingel-section').classList.toggle('has-bell',$('#bell-enabled').checked);$('#bell-mounting').textContent=$('#acrylic-enabled').checked?'Montage auf der Acrylplatte · Ausschnitte im Acryl':'Montage direkt auf der Grundplatte · ohne zusätzliche Acrylplatte';
 $('#acrylic-radius').disabled=$('#acrylic-shape').value==='ellipse';if($('#acrylic-radius').disabled)$('#acrylic-radius').value=0;
 $('#cornerRadiusMm').disabled=$('#shape').value!=='rounded';if($('#cornerRadiusMm').disabled)$('#cornerRadiusMm').value=0;
 const noHoles=$('#holeCount').value==='0';$('#holeDiameterMm').disabled=noHoles||!!Number($('#spacer-count').value);$('#edgeMm').disabled=noHoles;
 const raw=input();if(selectedLayer==='acrylic'&&!raw.assembly?.acrylic||selectedLayer==='bell'&&!raw.assembly?.bell)selectedLayer=null;let error='',errorTarget=null,stale=false;
 try{plates.validate(raw);}catch(e){error=e.message;errorTarget=e.target||{field:'widthMm'};}
 try{const markup=svg(raw,'draft-plate');$('#preview').innerHTML=markup;lastPreview=structuredClone(raw);}catch(e){stale=true;if(lastPreview)$('#preview').innerHTML=svg(lastPreview,'draft-plate');}
 $('#preview').classList.toggle('invalid',!!error);$('#preview').dataset.stale=String(stale);
 $('#geometry-note').textContent=error?error+(stale?' Die letzte darstellbare Ansicht bleibt sichtbar. Bitte zuerst die Maße korrigieren.':' Die Konstruktion bleibt zur Korrektur sichtbar.'):
 raw.widthMm+' × '+raw.heightMm+' mm · '+raw.holeCount+' Bohrungen · Vorschau, keine Fertigungsfreigabe';
 if(error)$('#geometry-note').innerHTML=warningMarkup($('#geometry-note').textContent,errorTarget);
 $('#geometry-note').className=error?'error':'';$('#save-template').disabled=busy||!!error;$('#download-current').disabled=busy||!!error;
 for(const option of $('#draft-format').options){option.disabled=option.value.split(':')[0]!=='steel'&&!raw.assembly?.acrylic;option.hidden=option.disabled;}if($('#draft-format').selectedOptions[0].disabled)$('#draft-format').value='steel:pdf';
 let warnings=[];try{plates.previewInput(raw);warnings=plates.screwWarnings(raw,true);}catch{}
 $('#screw-note').innerHTML=warnings.map(w=>warningMarkup(w.message,w.target)).join('');$('#screw-note').hidden=!warnings.length;
 if(acceptedClearanceKey!==plates.clearanceKey(raw)||!warnings.length)acceptedClearanceKey=null;
 const acknowledged=!!acceptedClearanceKey;$('#clearance-confirmation').hidden=!warnings.length;$('#clearance-accepted').checked=acknowledged;$('#clearance-accepted').disabled=busy||!!error;$('#clearance-state').textContent=acknowledged?'Bestätigt: Die Anordnung kann so gespeichert werden.':'Bitte die Platte einrücken oder bestätigen, um diese Anordnung zu speichern. Downloads zur Prüfung bleiben möglich.';$('#save-template').disabled=busy||!!error||(warnings.length>0&&!acknowledged);
 const symmetric=error?null:plates.holesAreSymmetric(raw);$('#symmetry-note').hidden=symmetric===null;$('#symmetry-note').className=symmetric?'alignment-ok':'warning';$('#symmetry-note').textContent=symmetric?'Bohrungen symmetrisch angeordnet.':'Die Bohrungen sind nicht symmetrisch angeordnet. Bitte prüfe die Positionen. Wenn die Abweichung beabsichtigt ist, kannst du sie beibehalten; andernfalls nutze „Von hier symmetrisch anordnen“ bei deiner Ausgangsbohrung.';
 if(symmetric===false)$('#symmetry-note').innerHTML=warningMarkup($('#symmetry-note').textContent,{holes:plates.holes(raw).map((h,i)=>i)});
 document.querySelectorAll('[data-symmetry]').forEach(b=>b.disabled=busy||holeOverrides[Number(b.dataset.symmetry)]?.locked!==false);
 syncHolePopover();syncLayerPopover();
 $('#toggle-guides').textContent='Hilfslinien: '+(showGuides?'An':'Aus');$('#toggle-guides').setAttribute('aria-pressed',String(showGuides));
 $('#center-proposal').hidden=!centerProposal;
 if(window.workshopReady)publishConfiguration(false);
}
async function receiveDownload(response,filename){
 if(!response.ok){let message='Download fehlgeschlagen.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
 const url=URL.createObjectURL(await response.blob()),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('#download-current').onclick=()=>run(async()=>{const geometry=input(),[layer,format]=$('#draft-format').value.split(':');plates.validate(geometry);const response=await fetch('/werkstatt-api/preview-export',{method:'POST',headers:{'content-type':'application/json','x-gravuru-token':token},body:JSON.stringify({geometry,layer,format})});await receiveDownload(response,'konstruktion-aktuell-'+layer+'.'+format);status('Aktuelle Konstruktion heruntergeladen · '+format.toUpperCase()+'.');});
$('#clearance-accepted').onchange=e=>{acceptedClearanceKey=e.target.checked?plates.clearanceKey(input()):null;preview();};
function acrylicTarget(g){if(!g.assembly?.acrylic)return '';const a=g.assembly.acrylic;return '<path data-acrylic="true" class="'+(plateLocks.acrylic?'locked':'movable')+'" d="'+plates.geometry(plates.acrylicGeometry(a)).outline+'" transform="translate('+a.x+' '+a.y+')" fill="transparent"/>';}
function acrylicHandles(g){
 if(!['acrylic','steel'].includes(selectedLayer)||selectedLayer==='acrylic'&&!g.assembly?.acrylic)return '';const steel=selectedLayer==='steel',a=steel?{x:0,y:0,width:g.widthMm,height:g.heightMm}:g.assembly.acrylic,font=Math.max(g.widthMm,g.heightMm)*.02,size=Math.max(4,font*.75),gap=font;
 const handles=[['w',a.x,a.y+a.height/2,'↔'],['e',a.x+a.width,a.y+a.height/2,'↔'],['n',a.x+a.width/2,a.y,'↕'],['s',a.x+a.width/2,a.y+a.height,'↕'],['nw',a.x,a.y,'↖'],['ne',a.x+a.width,a.y,'↗'],['sw',a.x,a.y+a.height,'↙'],['se',a.x+a.width,a.y+a.height,'↘']];
 let markup='<g class="acrylic-measures" pointer-events="none" stroke="#d07200" fill="none" stroke-width=".6"><path d="M'+a.x+' '+(-gap)+'V'+a.y+' M'+(a.x+a.width)+' '+(-gap)+'V'+a.y+' M'+(-gap)+' '+a.y+'H'+a.x+' M'+(-gap)+' '+(a.y+a.height)+'H'+a.x+'" stroke-dasharray="2 2"/><path d="M'+a.x+' '+(a.y-gap)+'H'+(a.x+a.width)+' M'+(a.x-gap)+' '+a.y+'V'+(a.y+a.height)+'"/></g><g pointer-events="none" fill="#d07200" font-size="'+font+'"><text x="'+(a.x+a.width/2)+'" y="'+(a.y-gap-2)+'" text-anchor="middle">'+a.width+' mm</text><text transform="translate('+(a.x-gap-2)+' '+(a.y+a.height/2)+') rotate(-90)" text-anchor="middle">'+a.height+' mm</text></g>';
 if(steel)markup='';
 if(plateLocks[selectedLayer])return markup;
 return markup+handles.filter(([handle])=>!steel||['e','s','se'].includes(handle)).map(([handle,x,y,arrow])=>'<g '+(steel?'data-steel-resize':'data-acrylic-resize')+'="'+handle+'" class="resize-'+handle+'"><circle cx="'+x+'" cy="'+y+'" r="'+size+'" fill="white" stroke="#d07200" stroke-width=".6"/><text x="'+x+'" y="'+(y+font*.32)+'" font-size="'+font+'" text-anchor="middle" fill="#945800">'+arrow+'</text></g>').join('');
}
function layerSelection(g){
 if(!selectedLayer)return '';const a=selectedLayer==='bell'?g.assembly?.bell:selectedLayer==='acrylic'?g.assembly?.acrylic:{x:0,y:0,width:g.widthMm,height:g.heightMm};if(!a)return '';
 const w=selectedLayer==='bell'?plates.modelFor(g).bell.width:a.width,h=selectedLayer==='bell'?plates.modelFor(g).bell.height:a.height;
 return '<rect pointer-events="none" x="'+a.x+'" y="'+a.y+'" width="'+w+'" height="'+h+'" fill="none" stroke="#d07200" stroke-width="1.2" stroke-dasharray="3 2"/>';
}
function syncLayerPopover(){
 syncPlaceButton();
 const panel=$('#layer-popover');panel.hidden=!selectedLayer||layerOptionsHidden||!!drag?.moved;if(panel.hidden)return;
 const definitions={bell:[['bell-x','X von links'],['bell-y','Y von oben']],acrylic:[['acrylic-x','X von links'],['acrylic-y','Y von oben'],['acrylic-width','Breite'],['acrylic-height','Höhe'],['acrylic-radius','Eckenradius']],steel:[['widthMm','Breite'],['heightMm','Höhe'],['cornerRadiusMm','Eckenradius'],['holeDiameterMm','Bohrdurchmesser'],['edgeMm','Randabstand']]};
 $('#layer-position-help').textContent=selectedLayer==='bell'?'Klingel direkt auf der Vorschau verschieben oder X und Y ändern.':selectedLayer==='acrylic'&&document.body.classList.contains('compact-mode')?'Maße, Position, Form und Farbe direkt ändern. Zum Ziehen der Acrylplatte zuerst entsperren.':document.body.classList.contains('compact-mode')?'Maße direkt eingeben. Zum Ziehen der Plattenkante zuerst entsperren.':'Zum Verschieben zuerst entsperren. Anschließend wieder sperren.';
 const directAcrylic=document.body.classList.contains('compact-mode');const fields=definitions[selectedLayer];$('#plate-lock').hidden=!['acrylic','steel'].includes(selectedLayer);$('#plate-lock').textContent=plateLocks[selectedLayer]?'Entsperren?':'Sperren?';$('#plate-lock').setAttribute('aria-pressed',String(!!plateLocks[selectedLayer]));$('#layer-popover-title').textContent={bell:'Funkklingel',acrylic:'Acrylplatte',steel:'Edelstahlschild'}[selectedLayer];
 if(panel.dataset.object!==selectedLayer){$('#layer-popover-fields').innerHTML=fields.map(([id,label])=>'<label>'+label+'<input type="number" step="0.01" data-layer-field="'+id+'" aria-label="Objekt '+label+'"></label>').join('')+(selectedLayer==='acrylic'?'<label>Form<select data-layer-field="acrylic-shape" aria-label="Acrylform"><option value="rect">Rechteckig</option><option value="rounded">Abgerundete Ecken</option><option value="ellipse">Oval</option></select></label><label class="acrylic-color-choice">Farbe<select data-layer-field="acrylic-color" aria-label="Acrylfarbe"><option value="anthrazit">Anthrazit</option><option value="schwarz">Schwarz</option></select></label>'+anchorSelect('acrylic-anchor')+'<label class="anchor-choice">Anker-Randabstand (mm)<input id="acrylic-anchor-inset" type="number" min="0" step="0.01" value="'+acrylicAnchorInset+'"></label><p class="anchor-help">Bezug: Edelstahlplatte. Auswahl setzt die Position einmalig. Danach frei verschiebbar.</p>':'');panel.dataset.object=selectedLayer;}
 for(const [id] of fields){const dest=$('#layer-popover [data-layer-field="'+id+'"]'),source=$('#'+id);if(document.activeElement!==dest)dest.value=source.value;dest.disabled=busy||source.disabled||(!directAcrylic&&!!plateLocks[selectedLayer]);}
 const alignment=$('#acrylic-anchor');if(alignment){alignment.value=currentAnchor(input(),'acrylic');alignment.disabled=busy||(!directAcrylic&&plateLocks.acrylic);alignment.onchange=e=>applyAnchor('acrylic',e.target.value);const inset=$('#acrylic-anchor-inset');inset.disabled=busy||(!directAcrylic&&plateLocks.acrylic);inset.oninput=e=>{if(Number.isFinite(e.target.valueAsNumber)&&e.target.valueAsNumber>=0){acrylicAnchorInset=e.target.valueAsNumber;preview();}};}
 const color=$('#layer-popover [data-layer-field="acrylic-color"]');if(color){if(printMode&&!color.querySelector('[value="weiss-matt"]')){color.replaceChildren(new Option('Weiß · matter Druck','weiss-matt'),new Option('Klar · hochglänzend','klar-hochglanz'));color.parentElement.firstChild.textContent='Druckausführung';}color.value=$('#acrylic-color').value;color.disabled=busy||(!directAcrylic&&plateLocks.acrylic);}
 const shape=$('#layer-popover [data-layer-field="acrylic-shape"]');if(shape){shape.value=$('#acrylic-shape').value;shape.disabled=busy||(!directAcrylic&&plateLocks.acrylic);}

}
$('#select-steel').onclick=()=>{centerProposal=null;layerOptionsHidden=false;selectedHole=null;selectedLayer='steel';preview();};$('#select-acrylic').onclick=()=>{if(!input().assembly?.acrylic)return;centerProposal=null;layerOptionsHidden=false;selectedHole=null;selectedLayer='acrylic';preview();};
$('#layer-popover-close').onclick=()=>deselectPlate();
$('#layer-popover').oninput=e=>{const id=e.target.dataset.layerField;if(!id)return;const source=$('#'+id);source.value=e.target.value;source.dispatchEvent(new Event('input',{bubbles:true}));};
$('#layer-popover').onkeydown=e=>{if(e.key==='Escape'){deselectPlate();}};
window.addEventListener('resize',syncLayerPopover);
function syncHolePopover(){
 const panel=$('#hole-popover'),g=input(),h=selectedHole===null?null:plates.holes(g)[selectedHole];
 panel.hidden=!h||!!drag?.moved;
 if(panel.hidden)return;
 const locked=holeOverrides[selectedHole]?.locked!==false;
 $('#hole-anchor').value=currentAnchor(g,'hole');$('#hole-anchor').disabled=locked||busy;
 $('#hole-popover-title').textContent='Bohrung '+(selectedHole+1)+' · Ø '+g.holeDiameterMm+' mm';
 for(const axis of ['x','y']){const field=$('#hole-popover-'+axis);if(document.activeElement!==field)field.value=Number.isFinite(h[axis])?h[axis]:'';field.disabled=locked||busy;}
 $('#hole-popover-unlock').checked=!locked;$('#hole-popover-unlock').disabled=busy;
 $('#hole-popover-symmetry').disabled=locked||busy;$('#hole-popover-reset').disabled=busy;

}
$('#hole-anchor').onchange=e=>applyAnchor('hole',e.target.value);
$('#hole-popover-close').onclick=()=>{selectedHole=null;preview();};
$('#hole-popover').onkeydown=e=>{if(e.key==='Escape'){selectedHole=null;preview();}};
$('#hole-popover-unlock').onchange=e=>{if(selectedHole===null)return;const h=plates.holes(input())[selectedHole];holeOverrides[selectedHole]={x:h.x,y:h.y,locked:!e.target.checked};holeRows();preview();};
for(const axis of ['x','y'])$('#hole-popover-'+axis).oninput=e=>{if(selectedHole===null||holeOverrides[selectedHole]?.locked!==false)return;holeOverrides[selectedHole][axis]=e.target.value===''?NaN:Number(e.target.value);holeRows();preview();};
$('#hole-popover-symmetry').onclick=()=>{if(selectedHole===null||holeOverrides[selectedHole]?.locked!==false)return;holeOverrides=plates.symmetricHoles(input(),selectedHole);holeRows();preview();};
$('#hole-popover-reset').onclick=()=>{if(selectedHole===null)return;holeOverrides[selectedHole]=null;holeRows();preview();};
window.addEventListener('resize',syncHolePopover);
function pointerPosition(e){if(drag?.inverse)return new DOMPoint(e.clientX,e.clientY).matrixTransform(drag.inverse);const svg=$('#preview svg'),matrix=svg?.getScreenCTM();if(!matrix)return null;return new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());}
$('#preview').onpointerdown=e=>{
 if(busy||e.button!==0||$('#preview').dataset.stale==='true')return;
 const target=e.target.closest('[data-drag-hole],[data-drag-bell],[data-acrylic],[data-acrylic-resize],[data-steel],[data-steel-resize]');if(!target){deselectPlate();return;}
 const p=pointerPosition(e);if(!p)return;
 const index=target.dataset.dragHole===undefined?null:Number(target.dataset.dragHole),acrylic=target.hasAttribute('data-acrylic')||target.hasAttribute('data-acrylic-resize'),steel=target.hasAttribute('data-steel')||target.hasAttribute('data-steel-resize');
 const nextLayer=index===null?(steel?'steel':acrylic?'acrylic':'bell'):null;centerProposal=null;layerOptionsHidden=!!(target.dataset.acrylicResize||target.dataset.steelResize);selectedHole=index;selectedLayer=index===null?(steel?'steel':acrylic?'acrylic':'bell'):null;preview();
 if(plateLocks[selectedLayer])return;
 if(steel&&!target.dataset.steelResize)return;
 if(index!==null&&holeOverrides[index]?.locked!==false)return;
 const origin=steel?{x:0,y:0,width:input().widthMm,height:input().heightMm}:acrylic?input().assembly.acrylic:index===null?input().assembly.bell:plates.holes(input())[index];
 drag={pointerId:e.pointerId,index,acrylic,steel,resize:target.dataset.acrylicResize||target.dataset.steelResize,start:p,origin:{...origin},inverse:$('#preview svg').getScreenCTM().inverse()};
 $('#preview').setPointerCapture(e.pointerId);e.preventDefault();
};
$('#preview').onpointermove=e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;const p=pointerPosition(e);if(!p)return;
 if(!drag.moved&&Math.hypot(p.x-drag.start.x,p.y-drag.start.y)<.3)return;drag.moved=true;
 const x=Math.round((drag.origin.x+p.x-drag.start.x)*10)/10,y=Math.round((drag.origin.y+p.y-drag.start.y)*10)/10;
 if(drag.steel){const a=plates.resizeAcrylic(drag.origin,drag.resize,p.x-drag.start.x,p.y-drag.start.y);$('#widthMm').value=a.width;$('#heightMm').value=a.height;holeRows();}else if(drag.acrylic){const a=drag.resize?plates.resizeAcrylic(drag.origin,drag.resize,p.x-drag.start.x,p.y-drag.start.y):plates.snapAcrylicCenter(input(),{...drag.origin,x,y});for(const key of ['x','y','width','height'])$('#acrylic-'+key).value=a[key];}else if(drag.index===null){$('#bell-x').value=x;$('#bell-y').value=y;}else{holeOverrides[drag.index]={x,y,locked:false};holeRows();}preview();
};
function endDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;drag=null;centerProposal=null;$('#center-proposal').hidden=!centerProposal;if($('#preview').hasPointerCapture(e.pointerId))$('#preview').releasePointerCapture(e.pointerId);syncHolePopover();syncLayerPopover();}
$('#preview').onpointerup=endDrag;$('#preview').onpointercancel=endDrag;$('#preview').onlostpointercapture=()=>{drag=null;syncHolePopover();syncLayerPopover();};
function form(t){plateLocks={acrylic:true,steel:true};centerProposal=null;selectedLayer=null;selectedHole=null;lastPreview=null;parentId=t?.id||null;$('#form-eyebrow').textContent=t?'ABLEITUNG AUS: '+t.name:'NEUE MASSVORLAGE';$('#name').value=t?t.name+' · neue Größe':'Edelstahl · neue Vorlage';const g=t?.geometry||{shape:'rounded',widthMm:300,heightMm:200,cornerRadiusMm:5,holeCount:2,holeDiameterMm:4,edgeMm:8};$('#spacer-count').value=String(g.spacers?.count||0);$('#base-acrylic-thickness').value=String(g.baseAcrylicThicknessMm||3);$('#print-finish').value=g.baseAcrylicFinish||'weiss-matt';$('#shape').value=g.shape;for(const k of fields)$('#'+k).value=g[k];acceptedClearanceKey=g.screwClearanceAcceptedFor||null;holeOverrides=structuredClone(g.holeOverrides||[]);holeRows();layersForm(g.assembly);preview();$('#form-section').scrollIntoView({behavior:'smooth',block:'start'});}
async function reload(){data=await api('/werkstatt-api');material={...data.materials[0],previewUrl:'/werkstatt/edelstahl-vorschau.webp'};if(window.workshopAdmin)$('#material-image').src=material.imageUrl;$('#material-name').textContent=material.name;$('#hash').textContent='SHA-256: '+material.original_sha;$('#approval').textContent=material.approved_at?'✓ Materialoriginal freigegeben':'Materialbild zur Freigabe';$('#approve').disabled=!!material.approved_at;
 $('#templates').innerHTML=data.templates.map((t,i)=>`<article class="template">${svg(t.geometry,'saved-'+i)}<h3>${esc(t.name)}</h3><p>${t.geometry.widthMm} × ${t.geometry.heightMm} × 1,5 mm · ${t.geometry.holeCount} Bohrungen</p><p>Eigene, unveränderliche Maßvorlage</p><div class="actions"><button data-design="${esc(t.id)}" class="primary">${new URLSearchParams(location.search).get('series')==='1'?'Für Serienauftrag verwenden':'Design gestalten'}</button><button data-copy="${esc(t.id)}">Ableiten</button><button data-delete="${esc(t.id)}" class="danger">Löschen</button></div>${templateDownloads(t)}</article>`).join('');preview();}
$('#templates').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.download){run(()=>downloadTemplate(b));return;}if(b.dataset.delete){const t=data.templates.find(t=>t.id===b.dataset.delete);$('#delete-name').textContent=t.name;$('#delete-confirm').dataset.id=t.id;$('#delete-dialog').showModal();}if(b.dataset.copy)form(data.templates.find(t=>t.id===b.dataset.copy));if(b.dataset.design&&new URLSearchParams(location.search).get('series')==='1'&&parent!==window){const t=data.templates.find(t=>t.id===b.dataset.design);if(t)parent.postMessage({type:'gravuru-series-template-saved',productId:t.product_id},location.origin);return;}if(b.dataset.design)run(async()=>{form(data.templates.find(t=>t.id===b.dataset.design));publishConfiguration(true);});};
$('#delete-cancel').onclick=()=>$('#delete-dialog').close();
$('#delete-confirm').onclick=()=>run(async()=>{const id=$('#delete-confirm').dataset.id;const t=await api('/werkstatt-api/templates/remove',{templateId:id});removedId=id;$('#delete-dialog').close();if(parentId===id){parentId=null;$('#form-eyebrow').textContent='NEUE MASSVORLAGE';}await reload();$('#undo-delete').hidden=false;status('Vorlage „'+t.name+'“ gelöscht. Bestehende Designs bleiben erhalten.');});
$('#undo-delete').onclick=()=>run(async()=>{await api('/werkstatt-api/templates/restore',{templateId:removedId});removedId=null;$('#undo-delete').hidden=true;await reload();status('Vorlage wiederhergestellt.');});
$('#new').onclick=()=>form(null);$('#template-form').oninput=e=>{const t=e.target;centerProposal=null;if(t.id==='spacer-count'){const count=Number(t.value);try{const next=plates.withSpacers({...input(),spacers:undefined},count);$('#holeCount').value=next.holeCount;$('#holeDiameterMm').value=next.holeDiameterMm;holeOverrides=next.holeOverrides||[];acceptedClearanceKey=null;holeRows();preview();}catch(error){t.value=String(lastPreview?.spacers?.count||0);status(error.message,true);}return;}if(['acrylic-thickness','base-acrylic-thickness'].includes(t.id)){$('#'+t.id+'-note').textContent='';if(t.value==='5'&&$('#bell-enabled').checked){t.value='3';preview();$('#'+t.id+'-note').textContent='Bitte zuerst die Funkklingel entfernen. Mit Klingel sind nur 3 mm Acrylglas möglich.';return;}acceptedClearanceKey=null;}if(t.closest('#hole-popover,#layer-popover')||t.id==='clearance-accepted')return;if(t.dataset.unlock!==undefined){const i=Number(t.dataset.unlock),h=holeOverrides[i]||plates.holes(basic())[i];holeOverrides[i]={x:h.x,y:h.y,locked:!t.checked};holeRows();}else if(t.dataset.hole!==undefined){holeOverrides[Number(t.dataset.hole)][t.dataset.axis]=t.value===''?NaN:Number(t.value);}else if(fields.includes(t.id)){if(t.id==='holeCount'){holeOverrides=[];selectedHole=null;}holeRows();}if(t.id==='acrylic-radius'&&Number(t.value)>0&&$('#acrylic-shape').value==='rect')$('#acrylic-shape').value='rounded';if(t.id==='acrylic-shape'&&t.value==='rect')$('#acrylic-radius').value=0;if(t.id==='acrylic-enabled'&&t.checked){const before=input().assembly;try{const a=plates.initialAcrylic({...basic(),holeOverrides}),next={...before,acrylic:a};if(next.bell){try{plates.validate({...basic(),holeOverrides,assembly:next});}catch{next.bell=plates.centeredBell({...basic(),assembly:next});}plates.validate({...basic(),holeOverrides,assembly:next});}layersForm(next);acceptedClearanceKey=null;}catch(error){t.checked=false;preview();status(error.message,true);return;}}if(t.id==='bell-model'){$('#bell-enabled').checked=!!modelSelect.value;acceptedClearanceKey=null;$('#bell-selection-note').textContent='';modelSize();if(!modelSelect.value)status('Keine Klingel ausgewählt.');}if((t.id==='bell-enabled'&&t.checked)||(t.id==='bell-model'&&$('#bell-enabled').checked)){const g=input(),b=plates.centeredBell(g);$('#bell-x').value=b.x;$('#bell-y').value=b.y;try{const candidate=plates.validate(input());if(plates.screwWarnings(candidate).length)throw Error('Bitte mehr Platz zwischen Klingel und Befestigungsbohrungen vorsehen.');status((chosenModel().name||'AOSU Pro')+' hinzugefügt.');}catch(error){const message=(chosenModel().name||'AOSU Pro')+': Für dieses Modell bitte die '+($('#acrylic-enabled').checked?'Acrylfläche':'Grundplatte')+' vergrößern oder die Bohrungen versetzen.';$('#bell-enabled').checked=false;modelSelect.value='';modelSize();preview();$('#bell-selection-note').textContent=message;status(message,true);return;}}preview();};
$('#template-form').onsubmit=e=>{e.preventDefault();if(!window.workshopAdmin){publishConfiguration(true);return;}run(async()=>{const t=await api('/werkstatt-api/templates',{materialId:material.id,parentId,name:$('#name').value,geometry:input()});await reload();if(new URLSearchParams(location.search).get('series')==='1'&&parent!==window)parent.postMessage({type:'gravuru-series-template-saved',productId:t.product_id},location.origin);status('Vorlage „'+t.name+'“ gespeichert. Du kannst jetzt ein Design gestalten.');$('#templates').scrollIntoView({behavior:'smooth',block:'start'});});};
$('#approve').onclick=()=>$('#approval-dialog').showModal();$('#approval-cancel').onclick=()=>$('#approval-dialog').close();$('#approval-confirm').onclick=()=>run(async()=>{await api('/werkstatt-api/approve',{materialId:material.id,sha:material.original_sha,confirmed:true});$('#approval-dialog').close();await reload();status('Materialoriginal freigegeben und unverändert hinterlegt.');});
run(async()=>{const session=await api('/werkstatt-api/session');window.workshopAdmin=session.admin&&new URLSearchParams(location.search).get('verwaltung')==='1';document.body.classList.toggle('customer-mode',!window.workshopAdmin);token=session.token;await reload();holeRows();window.workshopReady=true;window.dispatchEvent(new Event('workshop-ready'));status('Material und Maßvorlagen geladen.');});

function deselectPlate(){selectedLayer=null;selectedHole=null;centerProposal=null;preview();}
$('#plate-lock').onclick=()=>{if(selectedLayer in plateLocks){plateLocks[selectedLayer]=!plateLocks[selectedLayer];centerProposal=null;preview();}};
$('#toggle-guides').onclick=()=>{showGuides=!showGuides;preview();};
$('#center-yes').onclick=()=>{if(!centerProposal)return;$('#acrylic-x').value=centerProposal.x;$('#acrylic-y').value=centerProposal.y;centerProposal=null;preview();};
$('#center-no').onclick=()=>{centerProposal=null;preview();};
document.addEventListener('pointerdown',e=>{if(!selectedLayer&&!selectedHole&&selectedHole!==0)return;if(e.target.closest('#place-plate,#preview,#layer-popover,#hole-popover,#select-steel,#select-acrylic,#toggle-guides,#center-proposal,.object-dimensions'))return;deselectPlate();},true);
document.addEventListener('focusin',e=>{if(selectedLayer&&!e.target.closest('#preview-shell,#select-steel,#select-acrylic,#toggle-guides,#center-proposal,.object-dimensions'))deselectPlate();});

function syncPlaceButton(){
 const button=$('#place-plate'),g=lastPreview||input(),a=selectedLayer==='acrylic'?g.assembly?.acrylic:selectedLayer==='steel'?{x:0,y:0,width:g.widthMm,height:g.heightMm}:null;
 button.hidden=!a||!!drag?.moved;if(button.hidden)return;
 button.disabled=busy;button.textContent=plateLocks[selectedLayer]?'Entsperren?':'Sperren?';button.setAttribute('aria-label',(plateLocks[selectedLayer]?'Entsperren: ':'Sperren: ')+(selectedLayer==='acrylic'?'Acrylplatte':'Edelstahlplatte'));
 const matrix=$('#preview svg')?.getScreenCTM();if(!matrix)return;const point=new DOMPoint(a.x,a.y).matrixTransform(matrix),shell=$('#preview-shell').getBoundingClientRect(),box=button.getBoundingClientRect();
 button.style.left=Math.max(4,Math.min(shell.width-box.width-4,point.x-shell.left+14))+'px';button.style.top=Math.max(4,Math.min(shell.height-box.height-4,point.y-shell.top-box.height-12))+'px';
}
$('#place-plate').onclick=()=>{if(selectedLayer in plateLocks){plateLocks[selectedLayer]=!plateLocks[selectedLayer];centerProposal=null;preview();}};

function centerMarkers(g){
 if(selectedLayer!=='acrylic'||!g.assembly?.acrylic)return '';const a=g.assembly.acrylic,r=Math.max(g.widthMm,g.heightMm)/160;
 return '<g class="plate-center-markers" pointer-events="none" aria-hidden="true"><path class="steel-center-anchor" d="M'+(g.widthMm/2-r*3)+' '+g.heightMm/2+'h'+r*6+' M'+g.widthMm/2+' '+(g.heightMm/2-r*3)+'v'+r*6+'" fill="none" stroke="#b9ded7" stroke-opacity=".65" stroke-width="'+r*.4+'"/><circle class="acrylic-center-point" cx="'+(a.x+a.width/2)+'" cy="'+(a.y+a.height/2)+'" r="'+r*1.5+'" fill="#fff" stroke="#536c55" stroke-width="'+r*.25+'"/></g>';
}

function normalizeMeasurements(){
 document.querySelectorAll('#template-form input[type="number"]').forEach(field=>{field.step='0.01';if(field!==document.activeElement&&Number.isFinite(field.valueAsNumber))field.value=String(Math.round(field.valueAsNumber*100)/100);});
}
document.addEventListener('focusout',e=>{const field=e.target;if(!field.matches('#template-form input[type="number"]')||!Number.isFinite(field.valueAsNumber))return;const value=String(Math.round(field.valueAsNumber*100)/100);if(field.value!==value){field.value=value;field.dispatchEvent(new Event('input',{bubbles:true}));}});

$('#remove-bell').onclick=()=>{$('#bell-enabled').checked=false;modelSelect.value='';acceptedClearanceKey=null;selectedLayer=selectedLayer==='bell'?null:selectedLayer;$('#bell-selection-note').textContent='';modelSize();preview();status('Klingel entfernt. Ihre Platte bleibt erhalten.');};

$('#add-acrylic').onclick=()=>{$('#acrylic-enabled').checked=true;$('#acrylic-enabled').dispatchEvent(new Event('input',{bubbles:true}));};
$('#remove-acrylic').onclick=()=>{$('#acrylic-enabled').checked=false;$('#acrylic-enabled').dispatchEvent(new Event('input',{bubbles:true}));status('Acrylplatte entfernt. Die Grundplatte bleibt erhalten.');};

$('#print-finish').onchange=()=>preview();

let previewViewportWidth=window.innerWidth;window.addEventListener("resize",()=>{if(window.innerWidth===previewViewportWidth)return;previewViewportWidth=window.innerWidth;if(material)preview()});

// Do not validate an unfinished number (e.g. the 4 while typing 400).
const measurementInput=window.GravuruNumberInputs(window,'#template-form input[type=number]');
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===parent&&e.data?.type==='gravuru-material-continue')measurementInput.commit()},true);
