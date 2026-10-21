import {textPaths} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {fitsSurface,fittingTextSize,canColorElement,PRINT_PALETTES,paletteGroups,restoreOriginalColors} from './usability-model.mjs';
import {processPalette} from '../../workshop/process-profiles.mjs';
import {money} from './contract.mjs';
import {colorPalettes} from './profile-selection.mjs';

export async function installUsability(api) {
  const {el,r,profile,config,esc,button,mutate,selected,say,acceptFiles,changeObject}=api;
  const $=s=>r.querySelector(s), all=s=>[...r.querySelectorAll(s)];
  const css=await fetch('/configurator/variant-m/usability.css');
  if(!css.ok)throw Error('Bedienoberfläche fehlt.');
  const style=document.createElement('style');style.textContent=await css.text();r.append(style);

  // The stage grows; the product always stays complete and uses its real aspect ratio.
  const stage=$('.stage'),holder=$('.plate-holder'),title=$('.ux-heading h1');
  title.remove();
  const sizing=document.createElement('label');sizing.className='ux-preview-size';
  sizing.innerHTML='<span>Vorschaugröße</span><input type="range" min="0" max="100" step="1" value="0" aria-label="Gesamte Produktvorschau vergrößern"><span aria-hidden="true">− / +</span>';
  stage.append(sizing);
  let enlargement=0;
  function resizeStage(){
    const mobile=matchMedia('(max-width:900px)').matches;
    const base=32+(mobile?Math.max(340,Math.min(430,innerHeight*.48)):Math.max(480,Math.min(630,innerHeight*.78)));
    const width=$('.ux-preview').getBoundingClientRect().width;
    const maximum=Math.max(base,(width-104)*el.state.height/el.state.width+180);
    // The fixed acrylic scene has no working enlargement range. Do not offer a dead slider.
    sizing.hidden=!!config?.acrylic||maximum-base<16;
    sizing.querySelector('input').disabled=sizing.hidden;
    stage.style.setProperty('--ux-preview-height',(base+(maximum-base)*enlargement/100)+'px');
    stage.style.setProperty('--ux-preview-ratio',el.state.width+'/'+el.state.height);
    stage.style.setProperty('--ux-product-width',el.state.width);
    stage.style.setProperty('--ux-product-height',el.state.height);
  }
  sizing.querySelector('input').addEventListener('input',e=>{enlargement=Number(e.target.value);resizeStage();});
  new ResizeObserver(resizeStage).observe($('.ux-preview'));
  window.addEventListener('resize',resizeStage);resizeStage();

  // Keep legacy controls as renderer dependencies, but remove their announcements/focus.
  for(const container of [...r.children].filter(node=>node.matches('.workspace,.head,.foot,.guided-parking'))){
    container.inert=true;container.setAttribute('aria-hidden','true');
    for(const node of container.querySelectorAll('[aria-live],[role=status],[role=alert]')){
      node.removeAttribute('aria-live');node.removeAttribute('role');
    }
  }
  const extra=document.createElement('details');extra.className='ux-more-options';
  extra.innerHTML='<summary>Mehr Optionen</summary>';
  $('.ux-controls').append(extra);extra.append($('.ux-controls>.ux-actions'),$('.ux-precise'));
  const alignment=document.createElement('div');alignment.className='ux-alignment-help';
  alignment.innerHTML=button('alignment-help','ⓘ Text mittig ausrichten')+'<p>Mit Hilfslinien rasten Texte an der Mitte und an anderen Texten ein.</p>';
  $('[data-ux=add-text]').after(alignment);$('.ux-controls>.ux-tip')?.remove();

  // Design cards expand with the page. A fade hints at more choices without a nested scrollbar.
  const designGrid=$('.c-gallery'),designWrap=document.createElement('div');designWrap.className='ux-design-reveal';
  designGrid.before(designWrap);designWrap.append(designGrid);designGrid.id='ux-design-list';designGrid.setAttribute('aria-label','Designübersicht');
  const allDesigns=document.createElement('button');allDesigns.type='button';allDesigns.className='ux-design-toggle';allDesigns.setAttribute('aria-controls',designGrid.id);designWrap.append(allDesigns);
  let designsExpanded=true;
  function updateDesignReveal(){const cards=[...designGrid.querySelectorAll('[data-c-design]')].filter(c=>!c.hidden);designWrap.classList.toggle('is-expanded',designsExpanded);designWrap.classList.toggle('has-more',cards.length>4);allDesigns.hidden=true;allDesigns.textContent=designsExpanded?'Weniger anzeigen':`Alle anzeigen (${cards.length})`;allDesigns.setAttribute('aria-expanded',String(designsExpanded));cards.forEach((card,i)=>{card.inert=!designsExpanded&&i>=4;});}
  allDesigns.addEventListener('click',()=>{designsExpanded=!designsExpanded;updateDesignReveal();if(!designsExpanded)allDesigns.scrollIntoView({block:'nearest'});});
  new MutationObserver(updateDesignReveal).observe(designGrid,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});updateDesignReveal();

  function scrollList(grid,name){
    if(!grid)return;
    grid.classList.add('ux-scroll-list');grid.setAttribute('aria-label',name+' – nach unten scrollen');grid.tabIndex=0;
    const toggle=document.createElement('button');toggle.type='button';toggle.className='ux-list-edge';
    toggle.textContent='Mehr anzeigen';toggle.setAttribute('aria-expanded','false');grid.after(toggle);
    toggle.addEventListener('click',()=>{const expanded=grid.classList.toggle('ux-list-expanded');
      toggle.textContent=expanded?'Weniger anzeigen':'Mehr anzeigen';toggle.setAttribute('aria-expanded',String(expanded));
      if(!expanded)grid.scrollTop=0;
    });
    return toggle;
  }
  scrollList($('[data-bestseller-grid]'),'Bestseller');
  const grid=$('[data-library-grid]'),libraryToggle=scrollList(grid,'Motive');
  const more=$('[data-library-more]'),less=$('[data-library-less]');
  if(more)more.parentElement.hidden=true;
  libraryToggle?.addEventListener('click',()=>{if(grid.classList.contains('ux-list-expanded')&&!more.hidden)more.click();});
  if(grid&&more)grid.addEventListener('scroll',()=>{
    if(grid.scrollTop+grid.clientHeight>=grid.scrollHeight-40&&!more.hidden)more.click();
  },{passive:true});
  all('[data-c-more],[data-c-less]').forEach(b=>b.hidden=true);
  const search=$('[data-library-search]'),category=$('[data-library-category]');
  const empty=document.createElement('div');empty.className='ux-search-empty';empty.hidden=true;
  empty.innerHTML=button('reset-search','Suche zurücksetzen')+'<p>Zum Beispiel:</p><div>'+['Hund','Herz','Baum'].map(s=>button('search-suggestion',s,`data-search="${s}"`)).join('')+'</div>';
  grid?.after(empty);
  const total=Number($('[data-library-count]')?.textContent.match(/von\s+(\d+)/)?.[1]||0);
  const libraryHeading=$('#ux-panel-motif h3');if(libraryHeading)libraryHeading.textContent=`Alle ${total} Motive durchsuchen`;
  const motifFee=config?.extraMotifCents??profile.purchasing?.motifPriceCents??169;
  const priceText=motifFee===0?'Motive sind im Preis enthalten.':`Vorlagenmotive sind enthalten. Jedes zusätzlich gewählte Motiv: +${money(motifFee)} je Produkt.`;
  for(const p of all('#ux-panel-motif p'))if(/je Motiv|einzeln berechnet/.test(p.textContent))p.textContent=priceText;
  const priceNote=document.createElement('p');priceNote.className='ux-motif-pricing';priceNote.textContent=priceText;$('[data-bestsellers]').after(priceNote);
  const categoryIcon='<path d="M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z" fill="none" stroke="currentColor" stroke-width="1.5"/>';
  function improveCategories(){for(const svg of all('.ux-category-control svg,.ux-category-list svg')){
    if(svg.innerHTML.includes('M20 15h60v70H20Z')){svg.setAttribute('viewBox','0 0 24 24');svg.innerHTML=categoryIcon;}
  }}
  new MutationObserver(improveCategories).observe($('.ux-category-control'),{childList:true,subtree:true});
  new MutationObserver(improveCategories).observe($('.ux-category-list'),{childList:true});improveCategories();
  function refreshLibrary(){const has=!!grid?.querySelector('[data-motif]');empty.hidden=has;if(libraryToggle)libraryToggle.hidden=!has;if(grid)grid.hidden=!has;namespaceAll();if(has&&grid.clientHeight>0&&grid.classList.contains('ux-list-expanded')&&grid.scrollHeight<=grid.clientHeight+1&&!more.hidden)more.click();}
  if(grid)new MutationObserver(refreshLibrary).observe(grid,{childList:true});
  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b)return;
    if(b.dataset.ux==='reset-search'||b.dataset.ux==='search-suggestion'){
      search.value=b.dataset.search||'';category.value='';category.dispatchEvent(new Event('change',{bubbles:true}));search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();
    }
  });

  // Photo and logo share the same guarded import; drops do not bypass size/count checks.
  const uploadButtons=$('.ux-upload-buttons'),fileInput=$('[data-ux-file]');fileInput.multiple=true;
  const drop=document.createElement('div');drop.className='ux-upload-drop';
  const enabledKinds=[['photo','Foto'],['logo','Logo']].filter(([kind])=>uploadButtons.querySelector(`[data-ux=${kind}-upload]`));
  let uploadKind=enabledKinds[0]?.[0]||'photo';
  // Chris 21.10.2026: ein Knopf, keine Auswahl „Foto/Logo“, wenn es nur eine Art gibt.
  drop.innerHTML=(enabledKinds.length>1?'<div class="ux-upload-kind" role="group" aria-label="Art des Uploads">'+enabledKinds.map(([kind,label])=>button('upload-kind',label,`data-kind="${kind}" aria-pressed="${kind===uploadKind}"`)).join('')+'</div>':'')+button('choose-upload',enabledKinds.length>1?'↑ Dateien auswählen':uploadKind==='photo'?'↑ Foto hochladen':'↑ Logo hochladen','class="ux-file-select"')+'<p></p>';
  uploadButtons.before(drop);uploadButtons.hidden=true;
  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b)return;
    if(b.dataset.ux==='upload-kind'){uploadKind=b.dataset.kind;for(const choice of drop.querySelectorAll('[data-kind]'))choice.setAttribute('aria-pressed',String(choice===b));}
    if(b.dataset.ux==='choose-upload')uploadButtons.querySelector(`[data-ux=${uploadKind}-upload]`)?.click();
    if(b.dataset.ux==='select-upload')api.select(b.dataset.id);
  });
  for(const type of ['dragenter','dragover'])drop.addEventListener(type,e=>{e.preventDefault();drop.classList.add('is-dragover');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragover'));
  drop.addEventListener('drop',async e=>{e.preventDefault();drop.classList.remove('is-dragover');await acceptFiles(e.dataTransfer.files,uploadKind,null);});
  const uploadedTitle=document.createElement('h3');uploadedTitle.textContent='Hochgeladen';$('.ux-uploads').before(uploadedTitle);

  // K10 / Ü1.2: Farbwerkzeug nur, wenn das Verfahrensprofil es erlaubt (Gravur: keines).
  // Die Swatches sind genau die Profilpalette (Produktauswahl grenzt ein); eine freie
  // Farbwahl gibt es nur bei palette === null.
  let palette;
  const process=el.uxProcess||null,colorSelection=config?.workshopProfiles?.selections?.colors??null;
  colorPalettes(PRINT_PALETTES,colorSelection); // prüft die Produktauswahl (Hex), wie bisher
  const allowedColors=process?.tools.textColor?processPalette(process,colorSelection):[];
  if(process?.tools.textColor){
    const freeChoice=allowedColors===null;
    palette=document.createElement('section');palette.className='ux-color-palette';palette.hidden=true;
    palette.innerHTML='<h3 data-color-title>Elementfarbe</h3>'+paletteGroups(allowedColors).map(([name,colors])=>'<fieldset><legend>'+name+'</legend><div class="ux-swatches">'+colors.map(([label,color])=>button('swatch','',`data-color="${color}" style="--swatch:${color}" aria-label="${label}" title="${label}" aria-pressed="false"`)).join('')+'</div></fieldset>').join('')+(freeChoice?'<label>Ausgewählte Farbe <input type="color" data-free-color aria-label="Ausgewählte Farbe" value="#202824"></label>':'')+(process.tools.motifRecolor?button('original-colors','Originalfarben verwenden'):'')+'<p data-logo-color-note hidden>Einfarbige Logovorschau: Weiß wird transparent. Die Originaldatei bleibt erhalten.</p>';
    $('.ux-editor').append(palette);
    r.addEventListener('click',e=>{const b=e.target.closest('[data-ux]');if(!b||!canColorElement(selected()))return;
      if(b.dataset.ux==='swatch')changeObject('color',b.dataset.color);
      if(b.dataset.ux==='original-colors')mutate(()=>restoreOriginalColors(selected()));
    });
    palette.querySelector('[data-free-color]')?.addEventListener('change',e=>{if(canColorElement(selected()))changeObject('color',e.target.value);});
  }
  function updatePalette(){if(!palette)return;const o=selected();palette.hidden=!canColorElement(o);if(palette.hidden)return;
    const parent=o.type==='text'?$('.ux-controls'):$('.ux-panel:not([hidden])');if(parent&&palette.parentElement!==parent)parent.append(palette);
    palette.querySelector('[data-color-title]').textContent='Farbe: '+(o.type==='text'?'Text':o.uxUploadKind==='logo'?'Logo':o.type==='graphic'?'Grafik':'Motiv');
    const originals=o.uxUploadKind==='logo'?!o.uxLogoTint:o.type==='motif'&&o.preserveColors!==false;
    for(const swatch of palette.querySelectorAll('[data-color]'))swatch.setAttribute('aria-pressed',String(!originals&&o.color?.toLowerCase()===swatch.dataset.color));
    const free=palette.querySelector('[data-free-color]');if(free)free.value=o.color||'#202824';palette.querySelector('[data-logo-color-note]').hidden=o.uxUploadKind!=='logo';
    const original=palette.querySelector('[data-ux=original-colors]');if(original){original.hidden=!['image','motif'].includes(o.type);original.setAttribute('aria-pressed',String(!!originals));}
  }
  r.addEventListener('click',e=>{if(e.target.closest('[data-ux-tab]'))updatePalette();});

  function drawAlignment(){const scene=$('.scene');scene?.querySelector('.ux-alignment-guides')?.remove();if(!scene||!$('[data-ux-guides]').checked)return;
    // Existing renderer guides are replaced visually here, not in exported production data.
    scene.querySelectorAll('.guided-alignment').forEach(n=>n.remove());
    const w=el.state.width,h=el.state.height,pixels=scene.getBoundingClientRect().width/w,radius=3/Math.max(.1,pixels);
    const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.classList.add('ux-alignment-guides');group.setAttribute('pointer-events','none');group.setAttribute('aria-hidden','true');
    const line=(x1,y1,x2,y2,active=false)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${active?'#007b83':'#467467'}" stroke-width="${active?1.6:1}" stroke-dasharray="${active?'0':'4 4'}" vector-effect="non-scaling-stroke"/>`;
    const anchor=(x,y)=>`<circle cx="${x}" cy="${y}" r="${radius}" fill="white" stroke="#007b83" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
    let markup=line(w/2,0,w/2,h)+line(0,h/2,w,h/2)+anchor(w/2,h/2);
    const state={...el.state,objects:el.state.objects.filter(o=>!o.uxHidden)},o=selected();
    for(const text of state.objects.filter(o=>o.type==='text'))markup+=anchor(text.x,text.y);
    if(o&&window.GravuruGuided){const targets=window.GravuruGuided.alignmentTargets(state,o);for(const axis of ['x','y'])for(const target of targets[axis].filter(t=>Math.abs(t.value-o[axis])<.03)){markup+=axis==='x'?line(target.line,0,target.line,h,true)+anchor(target.line,o.y):line(0,target.line,w,target.line,true)+anchor(o.x,target.line);}}
    group.innerHTML=markup;scene.append(group);
  }

  // No repeated SVG ids between live product, gallery, mini preview and dialog.
  let svgSerial=0;
  function namespaceAll(){
    for(const svg of all('svg')){
      if(svg.parentElement?.closest('svg'))continue;
      const prefix=svg.dataset.uxNamespace||(svg.dataset.uxNamespace='uxv'+(++svgSerial)+'-');
      const names=new Map();
      for(const node of svg.querySelectorAll('[id]')){const id=node.id;if(!id.startsWith(prefix)){names.set(id,prefix+id);node.id=prefix+id;}}
      if(!names.size)continue;
      for(const node of [svg,...svg.querySelectorAll('*')])for(const attr of [...node.attributes]){
        let value=attr.value;
        for(const [from,to]of names){value=value.replaceAll('url(#'+from+')','url(#'+to+')');if(value==='#'+from)value='#'+to;}
        if(value!==attr.value)node.setAttribute(attr.name,value);
      }
    }
  }

  const boundsCache=new Map();
  function textBounds(o){
    const key=JSON.stringify([o.text,o.font,o.bold,o.italic,o.size]);if(boundsCache.has(key))return boundsCache.get(key);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.style.cssText='position:absolute;visibility:hidden;width:1px;height:1px';
    svg.innerHTML='<g>'+textPaths(o,el.fontData)+'</g>';r.append(svg);
    const measured=svg.firstElementChild.getBBox();const bounds={x:measured.x,y:measured.y,width:measured.width,height:measured.height};svg.remove();
    if(boundsCache.size>100)boundsCache.clear();boundsCache.set(key,bounds);return bounds;
  }
  function surface(){
    if(config)return {x:0,y:0,...profile.geometry};
    return profile.frames.find(f=>f.key===el.state.fkFrame)?.acrylic||profile.frames[0].acrylic;
  }
  function issues(){return el.state.objects.filter(o=>o.type==='text'&&!o.uxHidden&&o.text.trim()).flatMap(o=>{
    try{return fitsSurface(o,textBounds(o),surface())?[]:[{id:o.id,code:'outside-surface',message:'Text ragt über die Gestaltungsfläche.'}];}
    catch{return [{id:o.id,code:'font-invalid',message:'Die Schrift kann diesen Text nicht vollständig darstellen.'}];}
  });}
  el.uxTextBounds=textBounds; // Randsperre nach Buchstaben (edge-clamp.mjs)
  el.uxValidateDesign=issues; // Same gate can be called by the future trusted order adapter.
  function updateWarnings(){
    const problem=issues(),ids=new Set(problem.map(p=>p.id));
    for(const row of all('[data-ux-row]')){
      const issue=problem.find(p=>p.id===row.dataset.uxRow);row.classList.toggle('ux-overflow',!!issue);
      let message=row.querySelector('[data-ux-overflow-message]');
      if(issue&&!message){message=document.createElement('div');message.dataset.uxOverflowMessage='';message.setAttribute('role','status');row.append(message);}
      if(issue)message.innerHTML=`<span>${issue.message}</span>${issue.code==='outside-surface'?button('fit-text','Text passend verkleinern',`data-id="${esc(issue.id)}"`):''}`;
      else message?.remove();
    }
    for(const group of all('.scene [data-object]')){
      const id=group.dataset.object;group.classList.toggle('ux-outside',ids.has(id));
      if(ids.has(id))group.setAttribute('aria-label','Text außerhalb der Gestaltungsfläche');else if(group.getAttribute('aria-label')==='Text außerhalb der Gestaltungsfläche')group.removeAttribute('aria-label');
    }
    const badge=$('[data-ux-boundary-status]');badge.hidden=!problem.length;
    badge.textContent=problem.length?'Text passt nicht auf die Fläche':'';
  }
  const warning=document.createElement('p');warning.dataset.uxBoundaryStatus='';warning.className='ux-boundary-status';warning.hidden=true;stage.append(warning);
  r.addEventListener('click',e=>{const b=e.target.closest('[data-ux=fit-text]');if(!b)return;
    const o=el.state.objects.find(o=>o.id===b.dataset.id);if(!o||o.uxLocked)return;
    const size=fittingTextSize(o,textBounds(o),surface(),el.uxTextScale?.()||1,el.uxMinTextMm);
    if(size===null){say('Auch mit '+String(el.uxMinTextMm||4).replace('.',',')+' mm passt der Text hier nicht. Bitte kürzen oder weiter nach innen verschieben.');return;}
    mutate(()=>{o.size=size;el.state.selected=o.id;});say('Text auf '+el.uxDisplayTextSize(o).toLocaleString('de-DE')+' mm angepasst.');
  });
  const render=el.render;el.render=function(...args){const value=render.apply(this,args);drawAlignment();namespaceAll();return value;};
  const sync=el.sync;el.sync=function(...args){const value=sync.apply(this,args);updateWarnings();updatePalette();uploadedTitle.hidden=!$('.ux-upload-row');const full=new Set(el.state.objects.filter(o=>o.uxUploadId).map(o=>o.uxUploadId)).size>=4;drop.querySelector('[data-ux=choose-upload]').disabled=full;drop.querySelector('p').textContent=full?'Vier Dateien vorhanden. Entferne ein Bild, um ein neues hinzuzufügen.':'';namespaceAll();return value;};
  // Update after catalogue search rebuilds cards without calling the main sync method.
  const gallery=$('.c-gallery');new MutationObserver(()=>{
    for(const card of all('[data-c-design]')){const note=card.querySelector('small');if(note)note.hidden=true;}
    const shown=all('[data-c-design]').filter(c=>!c.hidden).length;
    const count=$('[data-c-count]');if(count)count.textContent=shown+' Designs';
    const totalLabel=$('.c-section-heading small');if(totalLabel)totalLabel.textContent='';
    namespaceAll();
  }).observe(gallery,{childList:true});
  refreshLibrary();updateWarnings();namespaceAll();
}
