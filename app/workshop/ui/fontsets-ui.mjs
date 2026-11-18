import {merchantRequest as fetch} from './merchant-request.mjs';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const base='/api/workshop/catalog-fontsets',state={data:null,set:null,fonts:[],dirty:false,busy:false,csrf:null};
function notice(text){$('#fontset-notice').textContent=text;$('#fontset-notice').hidden=!text;}
async function api(url,{method='GET',body}={}){
 if(method!=='GET'&&!state.csrf)state.csrf=(await api('/api/workshop/session')).csrfToken;
 const r=await fetch(url,{method,credentials:'same-origin',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(method==='GET'?{}:{'X-Gravuru-CSRF':state.csrf})},...(body?{body:JSON.stringify(body)}:{})});
 const result=await r.json();if(!r.ok)throw Error(result.error?.message||result.message||'Aktion nicht möglich.');return result;
}
function controls(){
 for(const node of document.querySelectorAll('#main button,#main select,#main input'))node.disabled=state.busy||!state.data;
 for(const node of document.querySelectorAll('[data-font-unavailable]'))node.disabled=true;
 for(const node of document.querySelectorAll('[data-move]'))node.disabled=state.busy||(node.dataset.move==='up'?Number(node.dataset.index)===0:Number(node.dataset.index)===state.fonts.length-1);
 $('#fontset-preview').disabled=state.busy||!state.set;
 $('#fontset-refresh').disabled=state.busy;
 $('#fontset-state').textContent=state.dirty?'Ungespeicherte Auswahl':state.set?.synchronized?'Gespeicherte Auswahl · Profil übernommen':'Im Katalog gespeichert · Profilübernahme ausstehend. Mit „Auswirkungen prüfen“ erneut übernehmen.';
}
async function run(work){if(state.busy)return;state.busy=true;controls();try{await work();}catch(e){notice(e.message);}finally{state.busy=false;controls();}}
async function confirm(title,html,label){
 const d=$('#fontset-confirm');$('#fontset-confirm-title').textContent=title;$('#fontset-confirm-content').innerHTML=html;$('#fontset-confirm-save').textContent=label;d.returnValue='cancel';d.showModal();
 return new Promise(resolve=>d.addEventListener('close',()=>resolve(d.returnValue==='save'),{once:true}));
}
const discard=()=>!state.dirty||confirm('Ungespeicherte Auswahl verwerfen?','<p>Die Änderungen dieser Schriftgruppe wurden noch nicht gespeichert.</p>','Änderungen verwerfen');
function render(){
 $('#fontset-editor').hidden=!state.set;if(!state.set)return;
 $('#fontset-title').textContent=state.set.name;$('#fontset-count').textContent=state.fonts.length;
 const search=$('#fontset-search').value.trim().toLocaleLowerCase('de');
 $('#fontset-fonts').innerHTML=state.data.fonts.filter(f=>f.name.toLocaleLowerCase('de').includes(search)).map(f=>'<label class="catalog-option"><input type="checkbox" data-font="'+esc(f.name)+'" '+(state.fonts.includes(f.name)?'checked ':'')+(!f.available?'data-font-unavailable disabled':'')+'><span>'+esc(f.name)+(f.notes.length?'<small style="display:block">'+f.notes.map(esc).join(' · ')+'</small>':'')+'</span></label>').join('');
 $('#fontset-selected').innerHTML=state.fonts.map((name,index)=>'<li><span class="selected-name">'+esc(name)+'</span><span class="selected-actions"><button data-move="up" data-index="'+index+'" aria-label="'+esc(name)+' nach oben">↑</button><button data-move="down" data-index="'+index+'" aria-label="'+esc(name)+' nach unten">↓</button><button data-remove="'+index+'" aria-label="'+esc(name)+' entfernen">×</button></span></li>').join('');
 controls();
}
function select(id){state.set=state.data.sets.find(s=>s.id===id)||state.data.sets[0];state.fonts=[...(state.set?.fonts||[])];state.dirty=false;$('#fontset-group').value=state.set?.id||'';render();}
async function load(){
 const id=state.set?.id||decodeURIComponent(location.hash.slice(1));state.data=await api(base);
 $('#fontset-group').innerHTML=state.data.sets.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+s.fonts.length+' Schriften</option>').join('');$('#fontset-effect').textContent=state.data.effect;
 $('#fontset-migration').hidden=!state.data.migration.length;$('#fontset-candidates').innerHTML=state.data.migration.map(p=>'<article><h3>'+esc(p.name)+'</h3><p>Stand '+p.revision+' · '+p.items.length+' Schriften</p><p>'+esc(p.reason)+'</p><details><summary>Liste ansehen</summary><p>'+p.items.map(esc).join(', ')+'</p></details>'+(p.eligible?'<button data-adopt="'+esc(p.profileId)+'">Herkunft prüfen …</button>':'')+'</article>').join('');select(id);
}
$('#fontset-group').addEventListener('change',()=>{const id=$('#fontset-group').value;run(async()=>{if(await discard())select(id);else $('#fontset-group').value=state.set.id;});});
$('#fontset-refresh').addEventListener('click',()=>run(async()=>{if(await discard())await load();}));
$('#fontset-search').addEventListener('input',render);
$('#fontset-fonts').addEventListener('change',e=>{const name=e.target.dataset.font;if(!name||state.busy)return;state.fonts=e.target.checked?[...state.fonts,name]:state.fonts.filter(v=>v!==name);state.dirty=true;render();});
$('#fontset-selected').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||state.busy)return;if(b.dataset.remove!==undefined)state.fonts.splice(Number(b.dataset.remove),1);else{const i=Number(b.dataset.index),j=i+(b.dataset.move==='up'?-1:1);if(j<0||j>=state.fonts.length)return;[state.fonts[i],state.fonts[j]]=[state.fonts[j],state.fonts[i]];}state.dirty=true;render();});
function rows(items,renderItem){return items.length?'<ul>'+items.map(x=>'<li>'+renderItem(x)+'</li>').join('')+'</ul>':'<p>Keine</p>';}
$('#fontset-preview').addEventListener('click',()=>run(async()=>{
 const input={setId:state.set.id,fonts:[...state.fonts],sourceSha256:state.data.sourceSha256},impact=await api(base+'/impact',{method:'POST',body:input});
 const html='<p>'+esc(impact.effect)+'</p><p>'+impact.before.length+' → '+impact.after.length+' Schriften</p><p>'+impact.after.map(esc).join(', ')+'</p><h3>Themen</h3>'+rows(impact.themes,x=>esc(x.name))+'<h3>Unterkategorien</h3>'+rows(impact.subcategories,x=>esc(x.lineId+' / '+x.name)+(x.explicit?' · eigene Zuordnung':' · über Thema'))+'<h3>Produkte mit dieser Schriftgruppe</h3>'+rows(impact.products,x=>esc(x.name)+' · Stand '+x.revision)+'<h3>Abweichende Produktzuordnungen bleiben erhalten</h3>'+rows(impact.exceptions,x=>esc(x.name));
 if(!await confirm('Auswirkungen: '+impact.name,html,'Im Katalog speichern'))return;
 const result=await api(base,{method:'PUT',body:{...input,impactToken:impact.token}});state.dirty=false;
 notice(result.synchronized?(result.changed?'Schriftgruppe gespeichert. ':'Auswahl bestätigt. ')+result.effect:result.warning);await load();
}));
$('#fontset-candidates').addEventListener('click',e=>{const id=e.target.closest('[data-adopt]')?.dataset.adopt;if(!id)return;run(async()=>{
 const p=state.data.migration.find(v=>v.profileId===id);
 const draft=state.dirty?{setId:state.set.id,fonts:[...state.fonts]}:null;
 if(!await confirm('Herkunft bestätigen','<p>Gehört „'+esc(p.name)+'“ tatsächlich zur Kataloggruppe „'+esc(p.setId)+'“?</p><h3>Bisheriges Profil · '+p.items.length+' Schriften</h3>'+rows(p.items,esc)+'<h3>Aktuelle Kataloggruppe · '+p.catalogFonts.length+' Schriften</h3>'+rows(p.catalogFonts,esc)+'<p>Profilkennungen können von Katalognamen abweichen. Diese Bestätigung ändert nur die Herkunft; die bisherige Auswahl bleibt jetzt erhalten. Beim nächsten Speichern oder Import wird die Katalogauswahl übernommen. Abweichungen deshalb vorher prüfen.</p>','Geprüfte Herkunft übernehmen'))return;
 await api(base+'/adopt',{method:'POST',body:{setId:p.setId,profileId:p.profileId,expectedRevision:p.revision,sourceSha256:state.data.sourceSha256,confirmOrigin:true}});notice('Herkunft zugeordnet. Auswahl und bisherige Stände bleiben erhalten.');await load();
 if(draft&&state.set?.id===draft.setId){state.fonts=draft.fonts;state.dirty=true;render();}
});});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
run(load);
