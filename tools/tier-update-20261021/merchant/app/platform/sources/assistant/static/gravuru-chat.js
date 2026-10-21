/* Commands operate on the existing editor; no model-provided scripts or URLs. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GravuruDesignBridge = api;
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  const clone = value => structuredClone(value);
  const kinds = new Set(['set_texts','add_text','edit_text','style','move','align','arrange','rotate','scale','duplicate','delete','layer','add_motif','design','option','undo','redo','preview']);
  const words = value => String(value || '').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const round = n => Math.round(Number(n || 0) * 100) / 100;
  function number(value, min, max, fallback) {
    if (value == null && fallback !== undefined) return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw Error('Dieser Wert liegt außerhalb des möglichen Bereichs.');
    return value;
  }
  function text(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 180 || /[\u0000-\u0008\u000b-\u001f]/.test(value)) throw Error('Bitte verwende einen Text mit 1 bis 180 Zeichen.');
    return value;
  }
  function targets(el, target) {
    const objects = el.state.objects;
    let found = [];
    if (target === 'selected') found = objects.filter(o => o.id === el.state.selected);
    else if (target === 'all') found = objects.slice();
    else if (target === 'all_texts') found = objects.filter(o => o.type === 'text');
    else if (target === 'all_motifs') found = objects.filter(o => o.type === 'motif');
    else if (/^(text|motif|image):[1-9][0-9]?$/.test(target || '')) {
      const [type, index] = target.split(':');
      found = [objects.filter(o => o.type === type)[Number(index) - 1]].filter(Boolean);
    } else if (typeof target === 'string' && target.startsWith('contains:')) {
      const needle = target.slice(9).trim().toLocaleLowerCase('de-DE');
      if (needle) found = objects.filter(o => o.type === 'text' && o.text.toLocaleLowerCase('de-DE').includes(needle));
      if (found.length > 1) throw Error('Der Text kommt mehrfach vor. Bitte nenne Text 1, Text 2 oder die gewünschte Nummer.');
    }
    if (!found.length) throw Error('Bitte nenne das gewünschte Element, zum Beispiel Text 1 oder Motiv 1.');
    if (found.some(o => o.type === 'photoSlot' || el.photoLayout?.(o))) throw Error('Dieses Element gehört fest zur Vorlage und kann hier nicht verändert werden.');
    return found;
  }
  function box(o) {
    const a = (o.rotation || 0) * Math.PI / 180;
    const w = Math.abs(o.w * Math.cos(a)) + Math.abs(o.h * Math.sin(a));
    const h = Math.abs(o.w * Math.sin(a)) + Math.abs(o.h * Math.cos(a));
    return { left:o.x-w/2, right:o.x+w/2, top:o.y-h/2, bottom:o.y+h/2, width:w, height:h };
  }
  function groupBox(objects) {
    const boxes = objects.map(box);
    return {left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};
  }
  function margin(el) { return Math.max(Number(el.catalog?.product?.safe_margin_mm)||0, Math.min(2.5, Math.min(el.state.width,el.state.height)*.05)); }
  function fits(el, objects) {
    const w=el.state.width,h=el.state.height,m=margin(el),format=el.stainlessFormat?.(),geometry=el.geometry();
    const shape=format?.shape || el.catalog?.product?.geometry?.shape || 'rect';
    const radius=Math.max(0,(format?.cornerRadiusMm || el.catalog?.product?.geometry?.corner_radius_mm || 0)-m);
    return objects.every(o=>{
      if (![o.x,o.y,o.w,o.h,o.rotation||0].every(Number.isFinite) || o.w<=0 || o.h<=0 || (o.type==='text'&&o.size<1)) return false;
      const b=box(o), points=[[b.left,b.top],[b.right,b.top],[b.left,b.bottom],[b.right,b.bottom]];
      if(points.some(([x,y])=>{
        if(x<m || x>w-m || y<m || y>h-m) return true;
        if(shape==='ellipse') return ((x-w/2)/(w/2-m))**2+((y-h/2)/(h/2-m))**2>1;
        if(radius>0){const cx=Math.max(m+radius,Math.min(w-m-radius,x)),cy=Math.max(m+radius,Math.min(h-m-radius,y));return Math.hypot(x-cx,y-cy)>radius+.001;}
        return false;
      })) return false;
      return (geometry.holes||[]).every(p=>Math.hypot(Math.max(b.left-p.x,0,p.x-b.right),Math.max(b.top-p.y,0,p.y-b.bottom)) >= (['B02S','B04S'].includes(el.state.mountingKey)?Math.max(3.8,p.r+.8):p.r+.8));
    });
  }
  function arrange(el, objects, layout='vertical', gap=3) {
    gap=number(gap,0,100,3);
    if(!['vertical','horizontal'].includes(layout)) throw Error('Diese Anordnung ist nicht verfügbar.');
    const vertical=layout==='vertical', extent=o=>vertical?box(o).height:box(o).width;
    const total=objects.reduce((n,o)=>n+extent(o),0)+gap*(objects.length-1);
    let cursor=(vertical?el.state.height:el.state.width)/2-total/2;
    for(const o of objects){const d=extent(o);o.x=vertical?el.state.width/2:cursor+d/2;o.y=vertical?cursor+d/2:el.state.height/2;cursor+=d+gap;}
  }
  function align(el, objects, alignment) {
    const b=groupBox(objects),m=margin(el);
    if(alignment==='center_x'){for(const o of objects)o.x=el.state.width/2;return;}
    const delta={center:[el.state.width/2-(b.left+b.right)/2,el.state.height/2-(b.top+b.bottom)/2],center_y:[0,el.state.height/2-(b.top+b.bottom)/2],left:[m-b.left,0],right:[el.state.width-m-b.right,0],top:[0,m-b.top],bottom:[0,el.state.height-m-b.bottom]}[alignment];
    if(!delta)throw Error('Diese Ausrichtung ist nicht verfügbar.');
    for(const o of objects){o.x+=delta[0];o.y+=delta[1];}
  }
  function choiceList(root,selector) { const e=root?.querySelector(selector);return e&&!e.disabled?Array.from(e.options).filter(o=>!o.disabled&&!o.hidden).map(o=>({key:o.value,name:o.textContent.trim().slice(0,180)})):[]; }
  function create(getEditor) {
    let lastResult='';
    const available=()=>{const el=getEditor();return !!(el?.state?.objects && el.fontList?.length && el.normalize && el.sync && el.record && el.geometry);};
    const stamp=el=>JSON.stringify([el.state,el.cfg?.variant,el.cTextEdits]);
    function context(message) {
      if(!available())return null;
      const el=getEditor(),counts={};
      const search=words(message),motifs=Object.keys(el.motifs||{}).map(key=>({key,name:String(el.labels?.[key]||key).slice(0,180)}));
      const matches=motifs.map(m=>({...m,score:words(m.name).reduce((n,w)=>n+search.filter(s=>w.includes(s)||s.includes(w)).length,0)})).filter(m=>m.score>0).sort((a,b)=>b.score-a.score);
      const r=el.shadowRoot;
      return {version:1,width_mm:el.state.width,height_mm:el.state.height,
        objects:el.state.objects.map(o=>({target:o.type+':'+(counts[o.type]=(counts[o.type]||0)+1),type:o.type,selected:o.id===el.state.selected,font:o.type==='text'?o.font:null,size_mm:o.type==='text'?round(o.size):null,x_mm:round(o.x),y_mm:round(o.y),width_mm:round(o.w),height_mm:round(o.h)})),
        fonts:el.fontList.slice(0,100),designs:(el.catalog.designs||[]).slice(0,100).map(d=>({key:d.id,name:d.name.slice(0,180)})),
        motifs:matches.slice(0,24).map(({key,name})=>({key,name})),
        shapes:Array.from(r?.querySelectorAll('[data-guide-form]')||[]).filter(b=>!b.disabled&&!b.hidden).map(b=>({key:b.dataset.guideForm,name:b.textContent.trim()})),
        sizes:choiceList(r,'[data-stainless="size"]'),mountings:choiceList(r,'[data-stainless="mounting"]'),
        can_undo:!!el.history?.length,can_redo:!!el.future?.length,color_editable:el.profile?.method==='print',last_result:lastResult};
    }
    function capture(){if(!available())return null;const el=getEditor();return {el,stamp:stamp(el)};}
    function applyStyle(el,objects,a){
      if(a.font!=null && !el.fontList.includes(a.font))throw Error('Diese Schrift ist für das Produkt nicht verfügbar.');
      if(a.color!=null && (el.profile?.method!=='print'||!/^#[0-9a-f]{6}$/i.test(a.color)))throw Error('Die Gravurfarbe ist durch das Material vorgegeben.');
      for(const o of objects){
        if((a.font!=null||a.size_mm!=null||a.bold!=null)&&o.type!=='text')throw Error('Schrifteinstellungen gelten nur für Texte.');
        if(a.font!=null)o.font=a.font;
        if(a.size_mm!=null)o.size=number(a.size_mm,1,100);
        if(a.bold!=null){if(typeof a.bold!=='boolean')throw Error('Ungültige Schrifteinstellung.');o.bold=a.bold;}
        if(a.color!=null)o.color=a.color;
      }
    }
    async function apply(actions,expected) {
      if(!Array.isArray(actions)||!actions.length)return {ok:true,changed:false,message:''};
      const el=getEditor();
      if(!available()||!expected||expected.el!==el||expected.stamp!==stamp(el))return {ok:false,changed:false,message:'Deine Gestaltung wurde inzwischen verändert. Bitte sende den Wunsch erneut; ich überschreibe die neuere Änderung nicht.'};
      const before=clone(el.state),history=clone(el.history),future=clone(el.future),edits=clone(el.cTextEdits||{}),variant=el.cfg?.variant;
      const changed=new Set();let autoFit=false;
      try {
        if(actions.length>12||actions.some(a=>!a||!kinds.has(a.kind)))throw Error('Dieser Gestaltungsbefehl wird nicht unterstützt.');
        const special=actions.filter(a=>['undo','redo','preview','option'].includes(a.kind));
        if(special.length&&actions.length!==1)throw Error('Bitte ändere Form, Größe oder Befestigung in einem eigenen Schritt.');
        if(special.length){
          const a=special[0];
          if(a.kind==='preview'){const b=el.shadowRoot?.querySelector('[data-guide-preview]');if(!b)throw Error('Die große Vorschau ist hier nicht verfügbar.');b.click();return {ok:true,changed:false,message:'Die große Vorschau ist geöffnet.'};}
          if(a.kind==='undo'||a.kind==='redo'){
            if(!(a.kind==='undo'?el.history:el.future).length)throw Error('Hier ist noch kein Schritt verfügbar.');
            await el.action(a.kind);lastResult=a.kind==='undo'?'Der letzte Schritt wurde rückgängig gemacht.':'Der Schritt wurde wiederholt.';return {ok:true,changed:true,message:lastResult};
          }
          const listName={shape:'shapes',size:'sizes',mounting:'mountings'}[a.option];
          const options=listName?context('')[listName]:[];
          if(!options.some(o=>o.key===a.key))throw Error('Diese Auswahl ist für das aktuelle Produkt nicht verfügbar.');
          if(a.option==='shape'){
            const button=Array.from(el.shadowRoot.querySelectorAll('[data-guide-form]')).find(b=>b.dataset.guideForm===a.key);
            if(!button||button.disabled)throw Error('Diese Form ist gesperrt.');button.click();
          }else{
            const select=el.shadowRoot.querySelector('[data-stainless="'+a.option+'"]');
            if(!select||select.disabled)throw Error('Diese Auswahl ist gesperrt.');select.value=a.key;
            select.dispatchEvent(new select.ownerDocument.defaultView.Event('change',{bubbles:true}));
          }
          for(let i=0;i<40;i++){
            await new Promise(resolve=>setTimeout(resolve,150));
            const now=getEditor(),r=now?.shadowRoot;
            const selected=a.option==='shape'?r?.querySelector('[data-guide-form][aria-pressed="true"]')?.dataset.guideForm:r?.querySelector('[data-stainless="'+a.option+'"]')?.value;
            if(selected===a.key&&now?.state?.objects){lastResult='Die Produktauswahl wurde geändert. Bitte prüfe Gestaltung und Gesamtpreis in der Vorschau.';return {ok:true,changed:true,message:lastResult};}
          }
          lastResult='Die Produktauswahl lädt noch. Bitte prüfe die Vorschau, bevor du weitergestaltest.';
          return {ok:false,changed:false,message:lastResult};
        }
        el.endTextSelection?.();
        for(const a of actions){
          let selected=[];
          if(a.kind==='set_texts'){
            if(!Array.isArray(a.lines)||!a.lines.length||a.lines.length>10)throw Error('Bitte nenne 1 bis 10 Textzeilen.');
            const lines=a.lines.map(text),old=el.state.objects.filter(o=>o.type==='text'),others=el.state.objects.filter(o=>o.type!=='text');
            selected=lines.map((line,i)=>({...clone(old[i]||{}),id:old[i]?.id||el.id(),type:'text',text:line,font:old[i]?.font||el.fontList[0],size:old[i]?.size||Math.min(10,el.state.height*.13),bold:old[i]?.bold||false,x:el.state.width/2,y:el.state.height/2,w:1,h:1,rotation:0,color:old[i]?.color||'#000000'}));
            if(others.length+selected.length>20)throw Error('Es passen höchstens 20 Elemente in eine Gestaltung.');
            el.state.objects=[...others,...selected];applyStyle(el,selected,a);el.normalize();arrange(el,selected,a.layout||'vertical',a.gap_mm??3);
            if(a.alignment&&a.alignment!=='center')align(el,selected,a.alignment);
          }else if(a.kind==='add_text'){
            selected=[{id:el.id(),type:'text',text:text(a.text),font:a.font||el.fontList[0],size:a.size_mm??Math.min(10,el.state.height*.13),bold:false,x:a.x_mm??el.state.width/2,y:a.y_mm??el.state.height/2,w:1,h:1,rotation:0,color:'#000000'}];applyStyle(el,selected,a);el.state.objects.push(...selected);
          }else if(a.kind==='add_motif'){
            if(typeof a.key!=='string'||!Object.hasOwn(el.motifs,a.key))throw Error('Dieses Motiv ist nicht in der Bibliothek verfügbar.');
            const bounds=el.catalog.motif_bounds?.[a.key]||[0,0,100,100],w=Math.min(el.state.width,el.state.height)*.22;
            selected=[{id:el.id(),type:'motif',motif:a.key,x:a.x_mm??el.state.width/2,y:a.y_mm??el.state.height/2,w,h:w*bounds[3]/bounds[2],rotation:0,color:'#000000'}];el.state.objects.push(...selected);
          }else if(a.kind==='design'){
            if(!el.catalog.designs.some(d=>d.id===a.key))throw Error('Diese Vorlage ist für das Produkt nicht verfügbar.');
            const texts=el.state.objects.filter(o=>o.type==='text').map(o=>o.text);
            el.chooseDesign(a.key);const newTexts=el.state.objects.filter(o=>o.type==='text');
            texts.forEach((value,i)=>{if(newTexts[i])newTexts[i].text=value;});selected=el.state.objects.slice();
          }else {
            selected=targets(el,a.target);
            if(a.kind==='edit_text'){if(selected.some(o=>o.type!=='text'))throw Error('Bitte wähle ein Textfeld.');for(const o of selected)o.text=text(a.text);}
            else if(a.kind==='style')applyStyle(el,selected,a);
            else if(a.kind==='move')for(const o of selected){o.x=a.x_mm!=null?number(a.x_mm,0,el.state.width):o.x+number(a.dx_mm,-300,300,0);o.y=a.y_mm!=null?number(a.y_mm,0,el.state.height):o.y+number(a.dy_mm,-300,300,0);}
            else if(a.kind==='align')align(el,selected,a.alignment||'center_x');
            else if(a.kind==='arrange')arrange(el,selected,a.layout||'vertical',a.gap_mm??3);
            else if(a.kind==='rotate')for(const o of selected)o.rotation=number(a.degrees,-360,360);
            else if(a.kind==='scale'){const factor=number(a.factor,.1,5);for(const o of selected){if(o.type==='text')o.size=number(o.size*factor,1,100);else{o.w*=factor;o.h*=factor;}}}
            else if(a.kind==='delete'){el.state.objects=el.state.objects.filter(o=>!selected.includes(o));const keys=new Set(selected.map(o=>o.personalId));for(const p of el.state.personalItems||[])if(keys.has(p.key))p.enabled=false;selected=[];}
            else if(a.kind==='duplicate'){selected=selected.map(o=>({...clone(o),id:el.id(),personalId:'personal:'+el.id(),fieldKey:undefined,templateOrigin:false,x:o.x+3,y:o.y+3}));el.state.objects.push(...selected);}
            else if(a.kind==='layer'){
              if(!['front','back','forward','backward'].includes(a.direction))throw Error('Diese Ebenenrichtung ist nicht verfügbar.');
              const list=el.state.objects;
              if(['front','back'].includes(a.direction)){const rest=list.filter(o=>!selected.includes(o));el.state.objects=a.direction==='front'?[...rest,...selected]:[...selected,...rest];}
              else {const ordered=a.direction==='forward'?selected.slice().reverse():selected;for(const o of ordered){const i=list.indexOf(o),j=i+(a.direction==='forward'?1:-1);if(j>=0&&j<list.length&&!selected.includes(list[j]))[list[i],list[j]]=[list[j],list[i]];}}
            }
          }
          if(el.state.objects.length>20)throw Error('Es passen höchstens 20 Elemente in eine Gestaltung.');
          selected.forEach(o=>changed.add(o.id));if(selected.length)el.state.selected=selected[selected.length-1].id;
          el.normalize();
        }
        for(const o of el.state.objects){const original=before.objects.find(p=>p.id===o.id);if(original&&!changed.has(o.id))Object.assign(o,clone(original));}
        const affected=el.state.objects.filter(o=>changed.has(o.id));
        // Restrict fitting to the changed elements; preserve unrelated customer artwork.
        if(affected.length&&!fits(el,affected)){
          const originals=clone(affected), b=groupBox(affected),cx=(b.left+b.right)/2,cy=(b.top+b.bottom)/2;
          let fitted=false;
          for(let step=1;step<=70;step++){
            const f=.97**step;
            affected.forEach((o,i)=>{const v=originals[i];o.x=cx+(v.x-cx)*f;o.y=cy+(v.y-cy)*f;o.w=v.w*f;o.h=v.h*f;if(o.type==='text')o.size=v.size*f;});
            if(fits(el,affected)){fitted=true;break;}
          }
          if(!fitted)throw Error('Dort reicht der Platz mit Randabstand und Bohrlöchern nicht aus. Bitte wähle eine andere Position oder kleinere Gestaltung.');autoFit=true;
        }
        for(const o of el.state.objects.filter(o=>o.type==='text')){
          const font=el.fontData?.[o.font]?.[o.bold?'bold':'regular'];
          if(font&&[...o.text].some(c=>c!=='\n'&&!font.glyphs[c]))throw Error('Die gewählte Schrift enthält nicht alle Zeichen deines Textes. Bitte wähle eine andere Schrift.');
        }
        el.state.showHero=false;if(!el.state.objects.some(o=>o.id===el.state.selected))el.state.selected=null;
        el.history=history;el.future=future;el.record(before);el.rememberPersonal?.();el.sync();
        const price=el.shadowRoot?.querySelector('.guided-final-price strong, .total-price')?.textContent?.trim()||'';
        lastResult='Die Gestaltung wurde übernommen.'+(autoFit?' Für Rand und Bohrlöcher wurde die Größe angepasst.':'')+(actions.some(a=>['add_motif','design','duplicate'].includes(a.kind))&&price?' Aktueller Gesamtpreis: '+price+'.':'');
        return {ok:true,changed:true,message:lastResult};
      }catch(error){el.state=before;el.history=history;el.future=future;el.cTextEdits=edits;if(el.cfg)el.cfg.variant=variant;el.sync();lastResult=String(error.message||'Die Änderung konnte nicht übernommen werden.');return {ok:false,changed:false,message:lastResult};}
    }
    return {available,context,capture,apply};
  }
  return {create,targets,box,groupBox,fits,arrange,align};
});

(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GravuruVoice=api;})(typeof window==='object'?window:this,function(){
  'use strict';
  function create({environment=window,input,button,readToggle,notice}){
    const Recognition=environment.SpeechRecognition||environment.webkitSpeechRecognition;
    let recognition=null,recording=false,timeout=null,original='',heard='';
    function state(active){recording=active;button.setAttribute('aria-pressed',String(active));button.textContent=active?'■ Aufnahme beenden':'🎙 Sprechen';button.setAttribute('aria-label',active?'Spracheingabe beenden':'Spracheingabe starten');}
    function stop(){clearTimeout(timeout);if(recognition){try{recognition.stop();}catch{}}state(false);}
    function quiet(){environment.speechSynthesis?.cancel();}
    function speak(message){
      if(!readToggle.checked||!environment.speechSynthesis||!environment.SpeechSynthesisUtterance)return;
      quiet();const utterance=new environment.SpeechSynthesisUtterance(String(message).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').slice(0,1400));
      utterance.lang='de-DE';utterance.rate=1;environment.speechSynthesis.speak(utterance);
    }
    readToggle.disabled=!environment.speechSynthesis;
    readToggle.addEventListener('change',()=>{if(!readToggle.checked)quiet();});
    button.addEventListener('click',()=>{
      if(recording){stop();return;}
      if(!Recognition){notice('Dieser Browser bietet hier keine Spracheingabe. Du kannst Wispr Flow oder das Mikrofon deiner Gerätetastatur direkt im Textfeld verwenden.');input.focus();return;}
      quiet();original=input.value.trim();heard='';recognition=new Recognition();recognition.lang='de-DE';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=1;
      recognition.onstart=()=>{state(true);notice('Ich höre zu. Danach kannst du den erkannten Text prüfen und senden.');};
      recognition.onresult=event=>{heard=Array.from(event.results).map(result=>result[0]?.transcript||'').join(' ').trim();input.value=(original+(original&&heard?' ':'')+heard).slice(0,1500);input.dispatchEvent(new environment.Event('input',{bubbles:true}));};
      recognition.onerror=event=>{const messages={'not-allowed':'Der Mikrofonzugriff wurde nicht erlaubt. Du kannst weiter tippen oder Wispr Flow im Textfeld verwenden.','audio-capture':'Kein Mikrofon gefunden. Bitte prüfe dein Mikrofon.','network':'Die Spracherkennung ist nicht erreichbar. Bitte tippe deinen Wunsch oder nutze Wispr Flow.','no-speech':'Ich habe keine Sprache erkannt. Bitte versuche es erneut.'};notice(messages[event.error]||'Die Spracheingabe wurde beendet. Dein eingegebener Text bleibt erhalten.');stop();};
      recognition.onend=()=>{clearTimeout(timeout);state(false);if(heard)notice('Bitte prüfe besonders Namen und Zahlen im Textfeld. Mit „Senden“ übernimmst du deinen Wunsch.');input.focus();};
      try{recognition.start();timeout=setTimeout(stop,30000);}catch{state(false);notice('Die Spracheingabe kann gerade nicht starten. Wispr Flow und Texteingabe bleiben nutzbar.');}
    });
    return {stop,speak,quiet,destroy(){stop();quiet();if(recognition){recognition.onresult=null;recognition.onend=null;recognition.onerror=null;}},supported:!!Recognition};
  }
  return {create};
});

(() => {
  'use strict';
  if (window.GravuruChat) return;
  const script = document.currentScript;
  const apiUrl = new URL(script?.dataset.api || new URL(script.src).origin, window.location.origin);
  const isProxy = script?.dataset.proxy === 'true';
  if (!['http:','https:'].includes(apiUrl.protocol) || (isProxy && apiUrl.origin !== window.location.origin)) return;
  const base = (apiUrl.origin + apiUrl.pathname).replace(/\/+$/, '');
  const store = script?.dataset.store || 'gravuru';
  let currentDocument = document;
  let session = null;
  let busy = false;
  let guideData = null;
  let destroyed = false;
  let voice = null;
  const bridge = window.GravuruDesignBridge?.create(()=>currentDocument.querySelector('gravuru-configurator'));
  const host = document.createElement('div');
  if (isProxy) host.hidden = true;
  host.id = 'gravuru-assistant';
  // Hyper hides empty light-DOM divs; the chat content lives in a shadow root.
  host.className = 'no-empty';
  host.style.cssText = 'position:fixed;right:22px;bottom:max(24px,env(safe-area-inset-bottom));z-index:2147483647;isolation:isolate;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
    :host{font-family:Arial,Helvetica,sans-serif;color:#302e2b;font-size:15px;line-height:1.5;color-scheme:light}
    *{box-sizing:border-box}button,input,textarea{font:inherit}button{cursor:pointer}button:disabled{cursor:wait;opacity:.6}
    button:focus-visible,a:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #9e7753;outline-offset:3px}
    .launcher{display:flex;align-items:center;gap:11px;background:#34312c;color:white;border:1px solid #665849;padding:14px 21px;border-radius:30px;box-shadow:0 7px 30px #332c282b;font-weight:600;font-size:14px;min-height:52px}
    .launcher svg{width:23px;height:23px}.launcher:hover{background:#50463a}
    .panel{position:absolute;right:0;bottom:68px;width:390px;max-width:calc(100vw - 32px);height:min(650px,calc(100dvh - var(--chat-clearance,120px)));display:flex;flex-direction:column;background:#fff;border:1px solid #e5dfd7;border-radius:20px;box-shadow:0 14px 60px #28231f30;overflow:hidden}
    [hidden]{display:none!important}.head{padding:22px 22px 17px;background:#f6f2ec;display:flex;gap:12px;align-items:center;border-bottom:1px solid #e8e1d8}
    .brand{font-size:10px;letter-spacing:2.6px;color:#786e62;font-weight:700}.title{font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#352f29;margin-top:2px}.subtitle{font-size:12px;color:#766c61;margin-top:3px}
    .close{margin-left:auto;align-self:flex-start;background:none;border:0;color:#6e6358;border-radius:50%;width:34px;height:34px;font-size:25px;line-height:1}
    .tabs{display:flex;border-bottom:1px solid #e8e3dc;flex-shrink:0;padding:0 20px;background:#fff}.tab{flex:1;padding:13px 5px;background:none;border:0;border-bottom:2px solid transparent;color:#7b7267;font-size:13px;font-weight:600}.tab[aria-selected=true]{border-color:#8d7255;color:#3b332b}
    .view{flex:1;min-height:0;display:flex;flex-direction:column}.messages{overflow:auto;flex:1;min-height:0;padding:20px;scroll-behavior:smooth;overscroll-behavior:contain}
    .message{margin:0 0 15px;max-width:100%;white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.65}.message.user{margin-left:26px;padding:11px 14px;background:#eee7dc;border-radius:13px 13px 3px 13px;color:#40372d}.message.bot{padding:0 2px}.message.error{padding:12px;background:#fff5e6;border:1px solid #eddbba;border-radius:9px;font-size:13px}
    .bubble-label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#8a7967;font-weight:700;margin-bottom:5px}
    .suggestions{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.chip{background:#fff;border:1px solid #d9d0c3;color:#625441;border-radius:18px;padding:7px 11px;text-align:left;font-size:12px}.chip:hover{background:#f6f1e9}
    .show-section{margin:9px 0 0;display:block;border:0;border-radius:6px;background:#eee6d9;padding:8px 11px;color:#51402d;font-size:12px;font-weight:600}.human{display:block;font-size:12px;margin-top:10px;color:#6c5139;text-decoration:underline}
    .composer{border-top:1px solid #eee7de;padding:13px 16px 12px;background:#fff}.field{display:flex;align-items:flex-end;gap:8px;background:#faf8f5;border:1px solid #e0d8cd;border-radius:12px;padding:6px}
    textarea{width:100%;height:48px;min-height:42px;max-height:110px;resize:vertical;border:0;outline:none;background:transparent;padding:8px;color:#352f29;font-size:14px;line-height:1.5}.send{flex:0 0 37px;width:37px;height:37px;border:0;border-radius:8px;background:#443a30;color:#fff;display:grid;place-items:center;margin-bottom:2px}.send svg{height:17px;width:17px}
    .context-label{display:flex;gap:7px;align-items:center;font-size:10px;color:#786d5f;margin:8px 0}.context-label input{accent-color:#766049;width:13px;height:13px}.fine{font-size:10px;color:#8b8175;line-height:1.4;margin:7px 1px 0}.fine a{color:inherit}.clear{border:0;background:none;font-size:10px;color:#7c6a55;text-decoration:underline;padding:0}.footline{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:7px}
    .guide-list{overflow:auto;padding:12px 20px;flex:1;overscroll-behavior:contain}.guide-row{display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:0;border-bottom:1px solid #eee8df;background:#fff;padding:14px 0;color:#493c2e;font-size:13px}.guide-row span{color:#af9679;font-size:11px;width:20px;flex-shrink:0}.guide-row:after{content:'›';margin-left:auto;font-size:20px;color:#ad9577}.guide-row:hover{color:#8c6845}
    .guide-detail{padding:19px 21px;overflow:auto;flex:1}.guide-detail h3{font-family:Georgia,serif;font-size:23px;line-height:1.3;font-weight:400;margin:15px 0;color:#44372b}.guide-detail p{font-size:14px;line-height:1.8;white-space:pre-wrap}.back{border:0;background:none;color:#8a6b49;font-size:12px;padding:0}.notice{font-size:11px;color:#8e7354;padding:8px 15px;background:#faf4e9;line-height:1.5}
    .assistant-controls,.voice-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:7px 0}.assistant-controls button,.voice-controls button{border:1px solid #d9d0c3;border-radius:7px;background:#faf8f5;color:#554838;padding:7px 9px;font-size:12px}.voice-controls button[aria-pressed=true]{background:#8c302c;color:white}.voice-controls label,.assistant-controls label{font-size:11px;color:#685947;display:flex;align-items:center;gap:5px}.speech-help{font-size:10px;line-height:1.4;color:#796f64;margin:5px 0}.applied{border-left:3px solid #718566;padding-left:9px!important}.show-design{background:#443a30;color:white;border:0;border-radius:6px;padding:8px 11px;margin-top:7px;display:block;font-size:12px}
    @media(max-width:600px){.panel{position:fixed;inset:8px 8px auto;width:calc(100vw - 16px);max-width:none;height:calc(100dvh - 16px);border-radius:16px}.head{padding:17px 20px 14px}.launcher{padding:12px 16px}.title{font-size:22px}.composer{padding-bottom:max(12px,env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.messages{scroll-behavior:auto}}
    </style>
    <section class="panel" role="dialog" aria-label="Gravuru Assistent" hidden>
      <header class="head"><div><div class="brand">GRAVURU</div><div class="title">Dein Gestaltungshelfer.</div><div class="subtitle">Von der ersten Idee bis zu deinem Schild.</div></div><button class="close" aria-label="Chat schließen">×</button></header>
      <div class="tabs" role="tablist" aria-label="Hilfe auswählen"><button class="tab" role="tab" id="chat-tab" aria-selected="true" aria-controls="chat-view">Mit Assistent chatten</button><button class="tab" role="tab" id="guide-tab" aria-selected="false" aria-controls="guide-view" tabindex="-1">Schritt für Schritt</button></div>
      <div class="view" id="chat-view" role="tabpanel" aria-labelledby="chat-tab">
        <div class="messages" role="log" aria-live="polite" aria-relevant="additions"></div>
        <form class="composer"><div class="assistant-controls" hidden><label><input type="checkbox" id="design-enabled" checked>Gestaltung per Chat ändern</label><button type="button" data-local="undo">Rückgängig</button><button type="button" data-local="redo">Wiederholen</button></div><label class="context-label"><input type="checkbox" id="context-consent">Form, Größe und Befestigung einbeziehen</label><div class="field"><textarea aria-label="Deine Frage" placeholder="Setze Familie Meier auf zwei Zeilen, mittig" maxlength="1500" rows="2" autocomplete="off"></textarea><button class="send" type="submit" aria-label="Frage senden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m5 12 7-7 7 7M12 5v15"/></svg></button></div><div class="voice-controls"><button type="button" class="microphone" aria-label="Spracheingabe starten" aria-pressed="false">🎙 Sprechen</button><label><input type="checkbox" id="read-aloud">Antwort vorlesen</label></div><p class="speech-help">Diktieren mit dem Browser, Wispr Flow oder deiner Gerätetastatur. Erkannten Text vor dem Senden prüfen. Das Mikrofon nutzt den Spracherkennungsdienst deines Browsers.</p><p class="fine">KI-Hilfe · Deine Nachricht und technische Gestaltungseinstellungen werden von OpenAI verarbeitet. Bestehende Gravurtexte und Uploads werden nicht automatisch mitgesendet.</p><div class="footline"><span class="fine">Gravuru · Persönlich gestaltet.</span><button class="clear" type="button">Chat löschen</button></div></form>
      </div>
      <div class="view" id="guide-view" role="tabpanel" aria-labelledby="guide-tab" hidden><div class="guide-list"></div><div class="guide-detail" hidden></div></div>
      <div class="notice" role="status" hidden></div>
    </section>
    <button class="launcher" aria-expanded="false" aria-label="Gravuru Hilfe öffnen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 11.5a8 8 0 0 1-8 8H4l1.3-3.2A8 8 0 1 1 20 11.5Z"/><path d="M8 10h8M8 13.5h5"/></svg><span>Fragen? Ich helfe dir.</span></button>`;
  const $ = selector => shadow.querySelector(selector);
  const messages = $('.messages');
  const input = $('textarea');
  const panel = $('.panel');
  const launcher = $('.launcher');
  const send = $('.send');
  const notice = $('.notice');
  const labels = { start:'So funktioniert’s',form:'Form & Befestigung',design:'Dein Design',text:'Deine Texte',font:'Schrift & Größe',arrangement:'Anordnung',motif:'Motive',logo:'Eigenes Logo',review:'Vorschau & Bestellung',save:'Entwurf speichern',problem:'Probleme lösen' };
  function showNotice(text) { notice.textContent = text; notice.hidden = !text; }
  function open() { panel.hidden = false; launcher.setAttribute('aria-expanded','true'); input.focus(); }
  function close() { voice?.stop();voice?.quiet();panel.hidden = true; launcher.setAttribute('aria-expanded','false'); launcher.focus(); }
  function tab(name) {
    for (const kind of ['chat','guide']) { const selected=kind===name; $(`#${kind}-view`).hidden=!selected; $(`#${kind}-tab`).setAttribute('aria-selected',String(selected)); $(`#${kind}-tab`).tabIndex=selected?0:-1; }
  }
  launcher.addEventListener('click',()=>panel.hidden?open():close());
  $('.close').addEventListener('click',close);
  shadow.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();}
    if(event.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); const next=event.target.id==='chat-tab'?'guide':'chat';tab(next);$(`#${next}-tab`).focus(); }
  });
  $('#chat-tab').addEventListener('click',()=>tab('chat'));
  $('#guide-tab').addEventListener('click',()=>tab('guide'));

  function editor() { return currentDocument.querySelector('gravuru-configurator')?.shadowRoot; }
  function selectedOption(root, selector) { const el=root?.querySelector(selector);return el?.selectedOptions?.[0]?.textContent?.trim() || ''; }
  function context() {
    if(!$('#context-consent').checked) return null;
    const root=editor(); if(!root) return null;
    return {configurator:'variante-c',shape:(root.querySelector('.form-choices [aria-pressed="true"]')?.textContent?.trim()||'').slice(0,50),size:selectedOption(root,'[data-stainless="size"]').slice(0,50),mounting:selectedOption(root,'[data-stainless="mounting"]').slice(0,100),text_count:Math.min(root.querySelectorAll('[data-c-text]').length,100)};
  }
  const targets={start:'#guided-step-1',form:'#guided-step-1',design:'.c-design-section',text:'.c-text-fields',font:'.c-text-fields',arrangement:'.c-text-fields',motif:'#panel-motif',logo:'#panel-image',review:'#guided-step-4',save:'.guided-download',problem:'#guided-step-4'};
  function highlight(section) {
    const root=editor();const target=root?.querySelector(targets[section]);
    if(!target){showNotice('Öffne den Konfigurator Variante C, um dir den Bereich zeigen zu lassen.');return;}
    for(let parent=target;parent&&parent!==root;parent=parent.parentElement){
      if(parent.tagName==='DETAILS')parent.open=true;
      if(parent.id?.startsWith('guided-step-')&&parent.hidden){const toggle=root.querySelector(`[aria-controls="${parent.id}"]`);if(toggle?.getAttribute('aria-expanded')==='false')toggle.click();}
    }
    if(section==='logo'){const details=target.closest('details');if(details)details.open=true;}
    const activeText=root.querySelector('.c-text-card.is-active');
    if(section==='arrangement'&&activeText){const details=activeText.querySelector('.c-arrangement');if(details)details.open=true;}
    const highlightTarget=section==='arrangement'?(activeText?.querySelector('.c-arrangement')||target):(['font','text'].includes(section)?activeText||target:target);
    const prevOutline=highlightTarget.style.outline;const prevOffset=highlightTarget.style.outlineOffset;
    highlightTarget.style.outline='3px solid #b59464';highlightTarget.style.outlineOffset='6px';
    highlightTarget.scrollIntoView({behavior:currentDocument.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    setTimeout(()=>{highlightTarget.style.outline=prevOutline;highlightTarget.style.outlineOffset=prevOffset;},6000);
    close();
    showNotice('Der passende Bereich ist markiert. Deine Gestaltung bleibt unverändert.');
  }
  function sectionButton(section) {
    const button=currentDocument.createElement('button');button.className='show-section';button.type='button';button.textContent='Im Konfigurator zeigen ↗';button.addEventListener('click',()=>highlight(section));return button;
  }
  function append(text,kind='bot',section=null,human=false) {
    const node=currentDocument.createElement('div');node.className=`message ${kind}`;
    if(kind==='bot'){const label=currentDocument.createElement('span');label.className='bubble-label';label.textContent='Gravuru Assistent';node.append(label);}
    const body=currentDocument.createElement('span');
    const source=String(text).replace(/\*\*([^*]+)\*\*/g,'$1');
    const links=/\[([^\]]{1,200})\]\((https:\/\/[^\s)]+)\)/g;let offset=0;let match;
    while((match=links.exec(source))){body.append(currentDocument.createTextNode(source.slice(offset,match.index)));let safe=false;try{const url=new URL(match[2]);safe=url.origin==='https://gravuru-design.myshopify.com'&&url.pathname.startsWith('/products/');}catch{}
      if(safe){const link=currentDocument.createElement('a');link.textContent=match[1];link.href=match[2];link.target='_blank';link.rel='noopener noreferrer';link.className='human';body.append(link);}else{body.append(currentDocument.createTextNode(match[1]));}offset=links.lastIndex;}
    body.append(currentDocument.createTextNode(source.slice(offset)));node.append(body);
    if(section&&targets[section])node.append(sectionButton(section));
    if(human&&guideData?.contact){const a=currentDocument.createElement('a');a.className='human';a.textContent='Gravuru-Team kontaktieren';a.href=`mailto:${guideData.contact}?subject=${encodeURIComponent('Frage zu meiner Gravuru-Gestaltung')}`;node.append(a);}
    messages.append(node);messages.scrollTop=messages.scrollHeight;return node;
  }
  function welcome() {
    const node=append('Hallo! Beschreibe deinen Gestaltungswunsch. Im verbundenen Konfigurator kann ich Texte einsetzen, ausrichten, Schriften ändern und Motive ergänzen. Du kannst schreiben oder diktieren.');
    const suggestions=currentDocument.createElement('div');suggestions.className='suggestions';
    for(const question of ['Familie Meier zweizeilig, beide mittig','Text 2 etwas größer','Wie füge ich ein Logo hinzu?']){const b=currentDocument.createElement('button');b.type='button';b.className='chip';b.textContent=question;b.addEventListener('click',()=>submit(question));suggestions.append(b);}node.append(suggestions);
  }
  function designResult(result) {
    const node=append(result.message,result.ok?'bot':'error');
    if(result.ok&&result.changed){node.classList.add('applied');const b=currentDocument.createElement('button');b.type='button';b.className='show-design';b.textContent='Gestaltung ansehen';b.addEventListener('click',()=>{close();editor()?.querySelector('.stage-wrap')?.scrollIntoView({behavior:'smooth',block:'center'});});node.append(b);}
    voice?.speak(result.message);return node;
  }
  async function localAction(kind){if(busy||!bridge?.available())return;busy=true;try{designResult(await bridge.apply([{kind}],bridge.capture()));}finally{busy=false;updateControls();}}
  function updateControls(){const ready=bridge?.available();$('.assistant-controls').hidden=!ready;for(const kind of ['undo','redo']){const e=currentDocument.querySelector('gravuru-configurator');$('[data-local="'+kind+'"]').disabled=busy||!ready||!(kind==='undo'?e?.history:e?.future)?.length;}$('.microphone').disabled=busy;}
  for(const b of shadow.querySelectorAll('[data-local]'))b.addEventListener('click',()=>localAction(b.dataset.local));
  voice=window.GravuruVoice?.create({environment:window,input,button:$('.microphone'),readToggle:$('#read-aloud'),notice:showNotice});
  async function submit(message) {
    message=message.trim();if(!message||busy)return;
    voice?.stop();voice?.quiet();
    const shortcut=message.toLocaleLowerCase('de-DE').replace(/[.!?]/g,'').trim();
    const local={'rückgängig':'undo','zurück':'undo','letzten schritt rückgängig':'undo','wiederholen':'redo','nochmal herstellen':'redo'}[shortcut];
    if(local&&bridge?.available()){append(message,'user');input.value='';await localAction(local);return;}
    const designEnabled=$('#design-enabled').checked&&bridge?.available();
    const snapshot=designEnabled?bridge.capture():null;
    const designContext=designEnabled?bridge.context(message):null;
    busy=true;send.disabled=true;input.disabled=true;$('.clear').disabled=true;showNotice('');
    updateControls();
    append(message,'user');input.value='';const pending=append('Ich schaue kurz nach …');
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),55000);
    try {
      const response=await fetch(base+'/api/chat',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({store,message,session,context:context(),editor:designContext}),signal:controller.signal});
      const data=await response.json();if(!response.ok){if(response.status===410)session=null;throw new Error(typeof data.detail==='string'?data.detail:'Die Anfrage konnte nicht verarbeitet werden.');}
      session=data.session;pending.remove();
      if(data.actions?.length){
        if(!designEnabled||!$('#design-enabled').checked)append('Die direkte Bearbeitung ist ausgeschaltet. Aktiviere „Gestaltung per Chat ändern“ und sende deinen Wunsch erneut.','error');
        else {const result=await bridge.apply(data.actions,snapshot);if(result.ok)append(data.answer,'bot');designResult(result);}
      }else{append(data.answer,'bot',data.guide_section,data.needs_human);voice?.speak(data.answer);}
    }catch(error){pending.remove();append(error.name==='AbortError'?'Die Antwort dauert gerade zu lange. Bitte versuche es erneut oder nutze „Schritt für Schritt“.':error.message||'Die Verbindung ist unterbrochen. Bitte nutze die Direkthilfe.','error');}
    finally{clearTimeout(timer);busy=false;send.disabled=false;input.disabled=false;$('.clear').disabled=false;updateControls();input.focus();}
  }
  $('.composer').addEventListener('submit',e=>{e.preventDefault();submit(input.value);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();submit(input.value);}});
  $('.clear').addEventListener('click',async()=>{
    if(busy)return;
    if(session){try{const r=await fetch(base+'/api/session/'+encodeURIComponent(session)+(isProxy?'/delete':''),{method:isProxy?'POST':'DELETE',credentials:'omit'});if(!r.ok)throw new Error();}catch{showNotice('Der Chat konnte gerade nicht gelöscht werden. Bitte erneut versuchen.');return;}}
    session=null;messages.replaceChildren();welcome();showNotice('Die Unterhaltung wurde gelöscht.');
  });
  function guide(section) {
    const info=guideData?.guides?.[section];if(!info)return;
    const detail=$('.guide-detail');detail.replaceChildren();$('.guide-list').hidden=true;detail.hidden=false;
    const back=currentDocument.createElement('button');back.className='back';back.textContent='← Alle Themen';back.addEventListener('click',()=>{detail.hidden=true;$('.guide-list').hidden=false;});
    const h=currentDocument.createElement('h3');h.textContent=info.title;
    const p=currentDocument.createElement('p');p.textContent=info.text;
    detail.append(back,h,p,sectionButton(section));
  }
  async function loadGuides() {
    try {const response=await fetch(base+'/api/guides',{credentials:'omit'});if(!response.ok)throw new Error();guideData=await response.json();const list=$('.guide-list');list.replaceChildren();
      if (isProxy && guideData.enabled !== true) { window.GravuruChat.destroy(); return; }
      host.hidden = false;
      Object.keys(labels).forEach((key,i)=>{const b=currentDocument.createElement('button');b.className='guide-row';const number=currentDocument.createElement('span');number.textContent=String(i+1).padStart(2,'0');b.append(number,currentDocument.createTextNode(labels[key]));b.addEventListener('click',()=>guide(key));list.append(b);});
      const account=currentDocument.createElement('a');account.className='human';account.textContent='Meine Bestellung im Kundenkonto ansehen';account.href=guideData.account_url;account.target='_blank';account.rel='noopener noreferrer';list.append(account);
    } catch {showNotice('Die Direkthilfe ist gerade nicht erreichbar. Bitte versuche es später erneut.');}
  }
  function mount() {
    if(destroyed)return;
    let target=document;
    try {for(let depth=0;depth<3;depth++){const frame=target.querySelector('#gravuru-variant-c-frame');if(!frame?.contentDocument?.body)break;target=frame.contentDocument;}}catch{}
    if(!target.body)return;
    currentDocument=target;
    if(host.ownerDocument!==target||host.parentElement!==target.body)target.body.append(host);
    host.inert=false;
    const hasEditor=Boolean(editor());$('.context-label').hidden=!hasEditor;
    updateControls();
    // Keep clear of the existing configurator's fixed purchase bar.
    host.style.bottom=hasEditor?'max(110px,calc(env(safe-area-inset-bottom) + 90px))':'max(24px,env(safe-area-inset-bottom))';
    host.style.setProperty('--chat-clearance',hasEditor?'205px':'120px');
  }
  window.GravuruChat={open,close,show:section=>{open();tab('guide');guide(section);},destroy:()=>{destroyed=true;voice?.destroy();clearInterval(mountTimer);host.remove();delete window.GravuruChat;}};
  mount();welcome();loadGuides();const mountTimer=setInterval(mount,1200);
})();
