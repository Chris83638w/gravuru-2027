// Compact contextual controls stay with the selected object in the preview.
export function installDirectEditing({el,r,selected,editPhoto,changeObject}) {
  const stage=r.querySelector('.stage'),panel=document.createElement('section');
  panel.className='ux-direct-edit';panel.hidden=true;panel.setAttribute('aria-label','Ausgewähltes Element bearbeiten');
  panel.innerHTML='<label data-direct-text-label>Text ändern<textarea rows="1" data-direct-text aria-label="Text direkt bearbeiten" spellcheck="false"></textarea></label><div class="ux-direct-actions"><button type="button" data-direct-open>Text ändern</button><label data-direct-font-label>Schriftart<select data-direct-font aria-label="Schriftart direkt auswählen"></select></label><label data-direct-size-label>mm<input type="number" min="4" max="100" step="1" data-direct-size aria-label="Schriftgröße direkt in Millimetern"></label><span data-direct-color-label><button type="button" data-direct-colors aria-label="Farbe auswählen"><span data-direct-color-chip aria-hidden="true"></span>Farbe ▾</button><input type="color" data-direct-color hidden aria-label="Elementfarbe direkt ändern"></span><label data-direct-rotation-label>°<input type="number" step="1" data-direct-rotation aria-label="Elementdrehung in Grad"></label><button type="button" data-direct-turn>↻ 15° drehen</button><button type="button" data-direct-style="bold" aria-label="Fett" aria-pressed="false"><b>F</b></button><button type="button" data-direct-style="italic" aria-label="Kursiv" aria-pressed="false"><i>K</i></button><button type="button" data-direct-photo>Foto bearbeiten</button></div>';
  stage.append(panel);panel.append(panel.querySelector('[data-direct-text-label]'));
  const sizeLabel=panel.querySelector('[data-direct-size-label]');sizeLabel.firstChild.textContent='Schrifthöhe ';sizeLabel.insertAdjacentHTML('beforeend','<span>mm</span>');sizeLabel.querySelector('input').setAttribute('aria-label','Schrifthöhe in Millimetern');sizeLabel.querySelector('input').step='0.1';
  panel.querySelector('[data-direct-colors]').lastChild.textContent='Farbpalette ▾';
  const quick=document.createElement('div');quick.className='ux-direct-presets';quick.setAttribute('aria-label','Direkte Farbpalette');quick.innerHTML=[['Schwarz','#191919'],['Weiß','#ffffff'],['Rot','#c93232'],['Gelb','#efca37'],['Grün','#28734b'],['Blau','#245cac']].map(([name,color])=>`<button type="button" data-direct-swatch="${color}" aria-label="${name} direkt auswählen" title="${name}" style="--preset-color:${color}"></button>`).join('');panel.append(quick);
  const $=s=>panel.querySelector(s),field=$('[data-direct-text]'),font=$('[data-direct-font]'),size=$('[data-direct-size]'),color=$('[data-direct-color]'),rotation=$('[data-direct-rotation]');
  const can=(o,right)=>o&&!o.uxLocked&&!o.uxHidden&&el.uxCanEdit?.(o,right)!==false;
  let editedId=null,recorded=false,openingPhoto=false,textOpen=false;
  function update(){
    if(panel.parentElement!==stage)stage.append(panel);
    const o=selected(),text=o?.type==='text',photo=!!o?.uxUploadId,motif=o?.type==='motif';
    panel.hidden=!(text&&can(o,'content')||photo&&can(o,'replace')||motif&&(can(o,'color')||can(o,'scale')||can(o,'move')));
    if(panel.hidden)return;
    if(editedId!==o.id){editedId=o.id;recorded=false;textOpen=false;field.value=o.text||'';}
    $('[data-direct-open]').hidden=!text;$('[data-direct-text-label]').hidden=!text||!textOpen;field.disabled=!can(o,'content');
    if(text&&r.activeElement!==field)field.value=o.text;
    $('[data-direct-font-label]').hidden=!text;
    if(text)el.uxUpdateFontSelect?.(font,o);
    $('[data-direct-size-label]').hidden=!text;size.disabled=!can(o,'scale');
    if(text&&r.activeElement!==size)size.value=el.uxDisplayTextSize?.(o)??o.size;
    $('[data-direct-color-label]').hidden=!(text||motif);color.disabled=!can(o,'color');if(r.activeElement!==color)color.value=o.color||'#202824';
    const colorButton=$('[data-direct-colors]');colorButton.disabled=!can(o,'color');$('[data-direct-color-chip]').style.background=o.color||'#202824';
    quick.hidden=!(text||motif)||!can(o,'color');for(const b of quick.querySelectorAll('button'))b.setAttribute('aria-pressed',String(o.color?.toLowerCase()===b.dataset.directSwatch));
    const movable=can(o,'move');$('[data-direct-rotation-label]').hidden=!movable;$('[data-direct-turn]').hidden=!movable;
    if(r.activeElement!==rotation)rotation.value=Math.round((o.rotation||0)*10)/10;
    for(const b of panel.querySelectorAll('[data-direct-style]')){b.hidden=!text;b.disabled=!can(o,'content')||(b.dataset.directStyle==='bold'&&!el.fontData?.[o.font]?.bold&&!o.bold);b.setAttribute('aria-pressed',String(!!o[b.dataset.directStyle]));}
    $('[data-direct-photo]').hidden=!photo||!can(o,'replace');
    // Keep a gap to the corner handles; at the top edge, put the bar below.
    const svg=r.querySelector('.scene').getBoundingClientRect(),box=stage.getBoundingClientRect(),a=(o.rotation||0)*Math.PI/180;
    const half=(Math.abs(o.w*Math.sin(a))+Math.abs(o.h*Math.cos(a)))/2*svg.height/el.state.height;
    const x=svg.left-box.left+o.x*svg.width/el.state.width,y=svg.top-box.top+o.y*svg.height/el.state.height;
    const w=panel.offsetWidth,h=panel.offsetHeight,above=y-half-h-42;
    panel.style.left=Math.max(8,Math.min(box.width-w-8,x-w/2))+'px';
    panel.style.top=Math.max(8,Math.min(box.height-h-8,above>=8?above:y+half+62))+'px';
  }
  el.uxEditText=id=>{const o=el.state.objects.find(o=>o.id===id&&o.type==='text');if(!can(o,'content'))return;el.state.selected=id;el.sync();textOpen=true;update();field.focus({preventScroll:true});field.select();};
  $('[data-direct-open]').addEventListener('click',()=>el.uxEditText(selected()?.id));
  async function openPhoto(){if(openingPhoto||!can(selected(),'replace'))return;openingPhoto=true;try{await editPhoto(selected());}finally{openingPhoto=false;}}
  el.uxPhotoTap=()=>{};
  for(const type of ['pointerdown','pointerup','click','dblclick','keydown'])panel.addEventListener(type,e=>e.stopPropagation());
  panel.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();recorded=false;el.action(e.key.toLowerCase()==='y'||e.shiftKey?'redo':'undo');}});
  const action=el.action;el.action=function(key,...args){if(key==='undo'||key==='redo')recorded=false;return action.call(this,key,...args);};
  field.addEventListener('input',()=>{const o=selected();if(o?.type!=='text'||!can(o,'content'))return;if(!recorded){el.record();recorded=true;}o.text=field.value;o.uxCustomerText=true;el.normalize();el.sync();});
  field.addEventListener('blur',()=>{recorded=false;});
  font.addEventListener('change',()=>{el.uxSetFont?.(font.value);update();});
  for(const event of ['input','change'])size.addEventListener(event,()=>{if(can(selected(),'scale')&&Number.isFinite(size.valueAsNumber)&&size.valueAsNumber>=4&&size.valueAsNumber<=100)changeObject('size',size.valueAsNumber);if(event==='change')update();});
  $('[data-direct-colors]').addEventListener('click',()=>{if(can(selected(),'color'))el.uxOpenColors?.();});
  color.addEventListener('input',()=>{if(can(selected(),'color'))changeObject('color',color.value);});
  quick.addEventListener('click',e=>{const b=e.target.closest('[data-direct-swatch]');if(b&&can(selected(),'color'))changeObject('color',b.dataset.directSwatch);});
  rotation.addEventListener('change',()=>{if(can(selected(),'move')&&Number.isFinite(rotation.valueAsNumber))changeObject('rotation',((rotation.valueAsNumber%360)+360)%360);update();});
  $('[data-direct-turn]').addEventListener('click',()=>{if(can(selected(),'move'))changeObject('rotation',((selected().rotation||0)+15)%360);});
  $('[data-direct-photo]').addEventListener('click',openPhoto);
  for(const b of panel.querySelectorAll('[data-direct-style]'))b.addEventListener('click',()=>{if(can(selected(),'content'))changeObject(b.dataset.directStyle,!selected()[b.dataset.directStyle]);});
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);update();return result;};}
  new ResizeObserver(update).observe(stage);update();
}
