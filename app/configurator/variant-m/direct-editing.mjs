import {textToolbarPosition} from './text-toolbar-position.mjs';
import {placeDirectToolbar} from './toolbar-hosts.mjs';
import {alignmentContent,uiIcon} from './ui-icons.mjs';
import {fontDisplayName} from './font-display.mjs';
import {measureText,textPaths} from '../../platform/sources/app/shared/models/text-paths.mjs';
import {textLength,textLimitCount,clampText} from '../../workshop/theme-limits.mjs';
import {processPalette,processFreeColor} from '../../workshop/process-profiles.mjs';
// Reuse the editor's state, rights, text-size controls and photo editor at the selection.
export function installDirectEditing({el,r,config,selected,editPhoto,changeObject}) {
  const stage=r.querySelector('.stage');
  // Keep the plate's screen coordinates stable when selection opens its tools.
  // Reserve phone space only while the selected text is being edited.
  const stableDoorbell=config?.doorbell?.schema==='gravuru-doorbell/v1';
  const stableHost=document.createElement('div');
  stableHost.className='ux-direct-slot'+(stableDoorbell?' doorbell-direct-slot':'');r.querySelector('[data-ux-stage]').before(stableHost);
  // K10 / Ü1.2: Farbwerkzeuge nur nach Verfahrensprofil (el.uxProcess, gesetzt in ux.mjs).
  // Gravur: keine Farbwahl. Druck: die Profilpalette als runde Schnellfarbpunkte und zusätzlich der
  // Farbwähler für eine freie Farbe (processFreeColor, Chris 22./23.10.2026).
  const process=el.uxProcess||null,colorTool=!!process?.tools.textColor,minTextMm=el.uxMinTextMm||4;
  const colorSelection=config?.workshopProfiles?.selections?.colors??null;
  const paletteColors=colorTool?processPalette(process,colorSelection):[],freeColor=colorTool&&processFreeColor(process,colorSelection);
  const presetColors=paletteColors===null?[['Schwarz','#202124'],['Weiß','#ffffff'],['Grau','#80868b'],['Terrakotta','#b86a45'],['Dunkelgrün','#365b49'],['Goldton','#c5a15b']]:paletteColors.map(hex=>[hex.toUpperCase(),hex]);
  const panel=document.createElement('section');
  panel.className='ux-direct-edit';panel.hidden=true;panel.setAttribute('aria-label','Ausgewähltes Element bearbeiten');
  panel.innerHTML='<div class="ux-direct-actions"><button type="button" data-direct-open>Text ändern</button><button type="button" data-direct-font title="Schriftart wählen" aria-label="Schriftart wählen">Schriftart ▾</button><button type="button" data-direct-style="bold" aria-label="Fett" aria-pressed="false"><b>F</b></button><button type="button" data-direct-style="italic" aria-label="Kursiv" aria-pressed="false" title="Kursiv – Schrift neigen"><i>K</i></button><label data-direct-size-label><span class="ux-direct-sr">Schriftgröße</span><input type="number" min="'+minTextMm+'" max="100" step="1" data-direct-size aria-label="Schriftgröße direkt in Millimetern"><span>mm</span></label><label data-direct-color-label title="Textfarbe"><input type="color" data-direct-color aria-label="Textfarbe direkt ändern"></label><button type="button" data-direct-motif="shrink" aria-label="Motiv verkleinern">−</button><button type="button" data-direct-motif="grow" aria-label="Motiv vergrößern">+</button><button type="button" data-direct-motif="rotate" aria-label="Motiv um 15 Grad drehen">↻ Drehen</button><div data-direct-confirm hidden><button type="button" data-direct-cancel>Abbrechen</button><button type="button" data-direct-done>Fertig</button></div></div>';
  const presets=document.createElement('div');presets.className='ux-direct-presets';presets.setAttribute('aria-label','Profilfarben');
  for(const [name,value] of presetColors){const button=document.createElement('button');button.type='button';button.dataset.directPreset=value;button.title=name;button.setAttribute('aria-label','Farbe '+name);button.style.setProperty('--preset-color',value);button.addEventListener('click',()=>{const o=selected();if(colorTool&&(o?.type==='motif'||o?.type==='text')&&can(o,'color'))changeObject('color',value);});presets.append(button);}
  panel.querySelector('[data-direct-color-label]').before(presets);
  stage.append(panel);
  const extras=document.createElement('span');extras.className='ux-direct-text-actions';extras.innerHTML=['left','center','right'].map(mode=>'<button type="button" data-direct-align="'+mode+'" aria-label="'+({left:'Links',center:'Mittig',right:'Rechts'})[mode]+' auf dem Schild ausrichten">'+uiIcon(mode)+'</button>').join('');
  panel.querySelector('[data-direct-size-label]').before(extras);
  for(const [key,label,symbol] of [['smaller','Schrift verkleinern','−'],['bigger','Schrift vergrößern','+']]){const b=document.createElement('button');b.type='button';b.dataset.directStep=key;b.setAttribute('aria-label',label);b.textContent=symbol;const input=panel.querySelector('[data-direct-size-label]');key==='smaller'?input.before(b):input.after(b);}
  const sizeArrows=document.createElement('span');sizeArrows.className='ux-direct-size-arrows';
  sizeArrows.innerHTML=[['bigger','Schriftgröße um einen Schritt erhöhen','M2 7L6 2L10 7Z'],['smaller','Schriftgröße um einen Schritt verringern','M2 2L6 7L10 2Z']].map(([step,label,path])=>'<button type="button" data-direct-step="'+step+'" data-size-arrow aria-label="'+label+'"><svg viewBox="0 0 12 9" aria-hidden="true"><path d="'+path+'" fill="currentColor"/></svg></button>').join('');
  panel.querySelector('[data-direct-size]').after(sizeArrows);
  const tail=document.createElement('span');tail.className='ux-direct-tail';tail.innerHTML='<button type="button" data-direct-turn aria-label="Element um 15 Grad drehen">↻</button><button type="button" data-ux="delete" aria-label="Element löschen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/></svg></button>';panel.querySelector('.ux-direct-actions').append(tail);
  // Keep semantic control groups. The modern mobile layout presents both groups
  // in one horizontally scrollable row without changing controls or edit rights.
  const actions=panel.querySelector('.ux-direct-actions'),primary=document.createElement('div'),secondary=document.createElement('div');
  primary.className='ux-direct-primary';secondary.className='ux-direct-secondary';
  for(const node of [...actions.children])(node.matches('[data-direct-font],[data-direct-style]')||node===extras?primary:secondary).append(node);
  actions.append(primary,secondary);
  const selectionName=document.createElement('span');selectionName.className='ux-direct-selection';selectionName.setAttribute('aria-live','polite');primary.prepend(selectionName);
  const box=document.createElement('div');box.className='ux-direct-input';box.hidden=true;box.innerHTML='<textarea rows="1" aria-label="Text direkt im Design bearbeiten" spellcheck="false" aria-describedby="ux-direct-count"></textarea><small id="ux-direct-count" class="ux-direct-count" data-direct-count aria-live="polite"></small>';stage.append(box);
  const openButton=panel.querySelector('[data-direct-open]'),field=box.querySelector('textarea'),count=box.querySelector('[data-direct-count]'),size=panel.querySelector('[data-direct-size]'),font=panel.querySelector('[data-direct-font]'),color=panel.querySelector('[data-direct-color]'),confirm=panel.querySelector('[data-direct-confirm]');
  const style=document.createElement('style');style.textContent=`
    .ux-direct-edit{position:absolute;z-index:40;box-sizing:border-box;width:max-content;max-width:calc(100% - 24px);padding:5px 7px;border:1px solid #e0e6e2;border-radius:999px;background:#ffffffed;box-shadow:0 4px 18px #263b301c;backdrop-filter:blur(12px);color:#263c32;pointer-events:auto}
    .ux-direct-edit[hidden],.ux-direct-edit [hidden],.ux-direct-input[hidden]{display:none!important}
    .ux-direct-actions,.ux-direct-edit [data-direct-confirm]{display:flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center}
    .ux-direct-edit button{box-sizing:border-box;width:auto!important;min-width:0!important;min-height:32px!important;height:32px!important;margin:0!important;padding:5px 10px!important;border:0!important;border-radius:999px!important;background:transparent!important;color:#30473c!important;font:500 12px/1.2 sans-serif!important;white-space:nowrap;cursor:pointer}
    .ux-direct-edit button[aria-pressed=true]{background:#dceee2!important;color:#165238!important}.ux-direct-edit button:hover{background:#edf3ef!important}.ux-direct-edit button:focus-visible{outline:2px solid #2f7558!important;outline-offset:1px}
    .ux-direct-edit label{display:flex!important;align-items:center;gap:2px;margin:0!important;font:12px/1 sans-serif!important;color:#607068}
    .ux-direct-edit [data-direct-size-label]{border-left:1px solid #dce4de;padding:0 5px}
    .ux-direct-edit input[type=number]{box-sizing:border-box;width:42px!important;min-width:0!important;height:30px!important;min-height:30px!important;margin:0!important;padding:3px 1px 3px 5px!important;background:transparent!important;color:#263c32;border:0!important;outline-offset:1px;border-radius:4px!important;font:600 13px/1 sans-serif!important}
    .ux-direct-edit input[type=color]{appearance:none;box-sizing:border-box;width:26px!important;min-width:0!important;height:26px!important;min-height:26px!important;margin:0 4px!important;padding:0!important;border:2px solid white!important;outline:1px solid #cbd6ce;border-radius:50%!important;background:none;overflow:hidden;cursor:pointer}
    .ux-direct-edit input[type=color]::-webkit-color-swatch-wrapper{padding:0}.ux-direct-edit input[type=color]::-webkit-color-swatch{border:0;border-radius:50%}
    .ux-direct-edit [data-direct-done]{background:#286347!important;color:white!important}.ux-direct-edit [data-direct-cancel]{color:#748078!important;font-size:11px!important}
    .ux-direct-edit button:disabled,.ux-direct-edit input:disabled{opacity:.4;cursor:default}
    .ux-direct-input{position:absolute;z-index:41;box-sizing:border-box;padding:0 6px;background:#ffffffed;border:0;border-bottom:2px solid #347a58;border-radius:4px;box-shadow:0 2px 8px #1a3e2220}
    .ux-direct-input textarea{display:block;box-sizing:border-box;width:100%!important;min-width:0!important;min-height:32px!important;height:auto;margin:0!important;padding:5px 0!important;background:transparent!important;color:#293e34;border:0!important;border-radius:0!important;outline:none!important;box-shadow:none!important;resize:none;text-align:center;line-height:1.25!important}
    .ux-direct-count{display:block;padding:0 0 4px;font:11px/1.2 sans-serif;color:#607068;text-align:right;font-variant-numeric:tabular-nums}.ux-direct-count:empty{display:none}
    .ux-direct-presets{display:flex;gap:4px;align-items:center}.ux-direct-edit .ux-direct-presets button{width:24px!important;min-width:24px!important;height:24px!important;min-height:24px!important;padding:0!important;background:var(--preset-color)!important;border:1px solid #afb4bb!important;border-radius:50%!important}.ux-direct-edit .ux-direct-presets button[aria-pressed=true]{outline:2px solid #555e68;outline-offset:2px}
    .ux-direct-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
    @media(max-width:480px){.ux-direct-edit{padding:4px;max-width:calc(100% - 16px)}.ux-direct-edit button{padding:4px 7px!important;font-size:11px!important}.ux-direct-actions,.ux-direct-edit [data-direct-confirm]{gap:1px}}
    /* Werkzeugleiste farbig hervorgehoben (Chris 20.10.2026): Markengrün, weiße Schrift */
    .ux-direct-edit{background:#17634d!important;border-color:#17634d!important;box-shadow:0 6px 22px #17634d4d!important;color:#fff!important}
    .ux-direct-edit button,.ux-direct-edit label,.ux-direct-edit input[type=number]{color:#fff!important}
    .ux-direct-edit button:hover{background:#ffffff26!important}.ux-direct-edit button[aria-pressed=true]{background:#ffffff40!important;color:#fff!important}
    .ux-direct-edit button:focus-visible{outline:2px solid #fff!important}.ux-direct-edit [data-direct-size-label]{border-left-color:#ffffff59!important}
    .ux-direct-edit input[type=number]{background:#ffffff1f!important}.ux-direct-edit [data-direct-done]{background:#fff!important;color:#17634d!important}.ux-direct-edit [data-direct-cancel]{color:#d8ebe2!important}
  `;r.append(style);
  let editing=null;
  const can=(o,right)=>o&&!o.uxLocked&&!o.uxHidden&&el.uxCanEdit?.(o,right)!==false;
  // K1: Zeichen-/Zeilenlimit aus der Vorlage (el.uxTextLimits), Zähler neben dem Feld.
  const limitsOf=o=>{try{return el.uxTextLimits?.(o)||null;}catch{return null;}};
  function updateCount(o){const limits=limitsOf(o),used=limits?textLimitCount(field.value,limits):0;count.textContent=limits&&used>=limits.maxLength*.8?used+'/'+limits.maxLength+(limits.perLine?' je Zeile':''):'';}
  function close(cancel=false){
    if(!editing)return;
    const old=editing;editing=null;box.hidden=true;for(const g of r.querySelectorAll('[data-direct-active]')){g.style.visibility='';delete g.dataset.directActive;}
    if(cancel){const o=el.state.objects.find(o=>o.id===old.id);if(o){o.text=old.text;o.size=old.size;if(old.lineHeight===undefined)delete o.lineHeight;else o.lineHeight=old.lineHeight;o.font=old.font;o.bold=old.bold;o.italic=old.italic;o.color=old.color;o.uxCustomerText=old.customerText;el.normalize();el.sync();}}
    update();
  }
  function update(){
    const o=selected();if(editing&&o?.id!==editing.id)close();
    const mobile=matchMedia('(max-width:767px)').matches,full=r.querySelector('.c-large-preview').open;
    const inWorkbench=placeDirectToolbar({panel,stage,preview:r.querySelector('.ux-preview'),workbench:r.querySelector('.ux-workbench-toolbar'),mobile,full,stableHost:mobile||stableDoorbell?stableHost:null});
    const text=o?.type==='text',photo=!!o?.uxUploadId&&!o.uxVectorLogo,motif=o?.type==='motif';
    selectionName.hidden=!text;selectionName.textContent=text?(el.uxTextLabel?.(o)||'Text'):'';selectionName.title=selectionName.textContent;
    panel.setAttribute('aria-label',text?selectionName.textContent+' bearbeiten':'Ausgewähltes Element bearbeiten');
    const alignHost=mobile?secondary:primary;if(extras.parentNode!==alignHost){if(mobile)secondary.prepend(extras);else primary.append(extras);}
    const deleteButton=panel.querySelector('[data-ux=delete]'),deleteHost=mobile?primary:tail;if(deleteButton.parentNode!==deleteHost)deleteHost.append(deleteButton);
    panel.hidden=!(text&&can(o,'content')||photo&&can(o,'replace')&&!el.uxPhotoPositionActive?.(o)||motif&&(can(o,'color')||can(o,'scale')||can(o,'move')));
    const textEditing=text&&!panel.hidden&&(full||r.querySelector('[data-ux-tab="text"]')?.getAttribute('aria-selected')==='true');
    if(el.dataset.uxTextEditing!==String(!!textEditing))el.dataset.uxTextEditing=String(!!textEditing);
    stableHost.hidden=mobile&&!textEditing;
    if(mobile&&!full&&!textEditing)panel.hidden=true;
    if(panel.hidden){stage.style.setProperty('--ux-mobile-dock-space',stableDoorbell&&mobile&&full?'202px':'0px');stage.style.setProperty('--ux-toolbar-space',stableDoorbell&&full?'112px':'0px');el.style.setProperty('--ux-textbar-h',stableDoorbell&&mobile?'116px':'0px');if(editing)close();return;}
    openButton.textContent=text?'Text ändern':'Foto bearbeiten';openButton.hidden=text||!!editing||motif;confirm.hidden=!editing;font.hidden=!text;font.disabled=!can(o,'content');font.textContent=fontDisplayName(o.font||'Schrift');font.title=font.textContent;
    if(text){try{const sample={...o,color:'#292d32',text:fontDisplayName(o.font),size:12,letterSpacing:0,lineHeight:14};measureText(sample,el.fontData);font.innerHTML='<svg data-direct-font-sample viewBox="'+(-sample.w/2-2)+' '+(-sample.h/2-2)+' '+(sample.w+4)+' '+(sample.h+4)+'" aria-hidden="true"><g>'+textPaths(sample,el.fontData)+'</g></svg>'+uiIcon('chevron');const ink=font.querySelector('g').getBBox();if(ink.width>0&&ink.height>0)font.querySelector('svg').setAttribute('viewBox',[ink.x-1,ink.y-1,ink.width+2,ink.height+2].join(' '));}catch{font.textContent=fontDisplayName(o.font);}}
    extras.hidden=!text;for(const b of extras.querySelectorAll('button'))b.disabled=!can(o,'move');
    for(const b of panel.querySelectorAll('[data-direct-step]')){b.hidden=!text;b.disabled=!can(o,'scale');}
    panel.querySelector('[data-direct-turn]').disabled=!can(o,'move');
    panel.querySelector('[data-ux=delete]').disabled=!can(o,'delete');color.parentElement.hidden=!(text||motif)||!freeColor;color.parentElement.title=motif?'Motivfarbe':'Textfarbe';color.setAttribute('aria-label',motif?'Motivfarbe direkt ändern':'Textfarbe direkt ändern');color.disabled=!can(o,'color');if((text||motif)&&r.activeElement!==color)color.value=o.color||'#202824';
    for(const b of panel.querySelectorAll('[data-direct-style]')){b.hidden=!text;b.disabled=!can(o,'content')||(b.dataset.directStyle==='bold'&&!el.fontData?.[o.font]?.bold&&!o.bold);b.title=b.dataset.directStyle==='bold'?(b.disabled?'Für diese Schrift ist kein Fettschnitt verfügbar':'Fett'):'Kursiv – Schrift neigen';b.setAttribute('aria-pressed',!!o[b.dataset.directStyle]);}
    for(const b of panel.querySelectorAll('[data-direct-motif]')){b.hidden=!motif||b.dataset.directMotif==='rotate'&&el.uxCanRotate?.(o)===false;b.disabled=!can(o,b.dataset.directMotif==='rotate'?'move':'scale');}
    presets.hidden=!colorTool||!(text||motif)||(paletteColors===null&&!motif);for(const b of presets.children){b.disabled=!can(o,'color');b.setAttribute('aria-pressed',String((o.color||'').toLowerCase()===b.dataset.directPreset));}
    panel.querySelector('[data-direct-size-label]').hidden=!text;
    size.disabled=!can(o,'scale');
    if(r.activeElement!==size)size.value=r.querySelector('#ux-size')?.value||Math.round(o.size||4);
    const scene=r.querySelector('.scene');if(!scene)return;
    const placement=el.state.ui?.textToolbarPlacement||'plate',scale=!mobile&&!inWorkbench&&placement==='selection'?.78:1;
    panel.dataset.placement=placement;panel.style.transform=scale===1?'':'scale('+scale+')';panel.style.transformOrigin=inWorkbench?'':'top left';
    // Reserve space above the fitted plate; the toolbar never occupies artwork.
    stage.style.setProperty('--ux-toolbar-space',stableDoorbell?(full?'112px':'0px'):!mobile&&!inWorkbench?Math.ceil(panel.offsetHeight*scale+16)+'px':'0px');
    stage.style.setProperty('--ux-mobile-dock-space',mobile&&full?(stableDoorbell?202:panel.offsetHeight+86)+'px':'0px');
    const barHeight=mobile&&!full&&textEditing?panel.offsetHeight:0;el.style.setProperty('--ux-textbar-h',barHeight+'px');
    const bounds=scene.getBoundingClientRect(),parent=stage.getBoundingClientRect();
    if(!mobile&&!inWorkbench){
      const target=scene.querySelector('[data-object="'+CSS.escape(o.id)+'"]')?.getBoundingClientRect();
      const pos=textToolbarPosition({stage:parent,plate:bounds,selection:target,width:panel.offsetWidth*scale,height:panel.offsetHeight*scale,placement,zoomed:(el.uxViewZoom?.()||1)>1});
      panel.style.left=pos.left+'px';panel.style.top=pos.top+'px';
    }else if(full){panel.style.left='0px';panel.style.setProperty('--ux-full-dock-top',Math.max(8,Math.min(parent.height-panel.offsetHeight-60,bounds.bottom-parent.top+34))+'px');}
    if(editing){
      const group=scene.querySelector('[data-object="'+CSS.escape(o.id)+'"]'),target=group?.getBoundingClientRect();
      const width=Math.min(parent.width-24,Math.max(260,(target?.width||160)+32));
      const center=target?target.left-parent.left+target.width/2:bounds.left-parent.left+o.x*bounds.width/el.state.width;
      box.style.width=width+'px';box.style.left=Math.max(12,Math.min(parent.width-width-12,center-width/2))+'px';
      // The general input font uses !important; keep the actual design font and
      // a comfortable editing size without changing the engraved millimetres.
      field.style.setProperty('font-family','"'+String(o.font||'').replaceAll('"','')+'", serif','important');
      field.style.setProperty('font-size',Math.max(mobile?22:26,Math.min(mobile?32:42,o.size*bounds.width/el.state.width))+'px','important');
      field.style.setProperty('font-weight',o.bold?'700':'400','important');field.style.setProperty('font-style',o.italic?'italic':'normal','important');field.style.color='#252a2e';
      field.style.height='auto';field.style.height=Math.min(mobile?140:200,Math.max(32,field.scrollHeight))+'px';updateCount(o);
      const centerY=target?target.top-parent.top+target.height/2:bounds.top-parent.top+o.y*bounds.height/el.state.height;
      const bottomGap=typeof el.uxViewZoom==='function'?60:8;
      const maxTop=Math.max(8,parent.height-box.offsetHeight-bottomGap),minTop=mobile||inWorkbench?8:Math.min(maxTop,(parseFloat(panel.style.top)||0)+panel.offsetHeight*scale+8);
      box.style.top=Math.max(minTop,Math.min(maxTop,centerY-box.offsetHeight/2))+'px';
      if(group){group.style.visibility='hidden';group.dataset.directActive='';}
    }

  }
  function openText(id){
    const o=el.state.objects.find(o=>o.id===id&&o.type==='text');if(!can(o,'content'))return;
    if(editing?.id===id){field.focus({preventScroll:true});return;}
    close();el.state.selected=id;el.sync();editing={id,text:o.text,size:o.size,lineHeight:o.lineHeight,customerText:o.uxCustomerText,font:o.font,bold:o.bold,italic:o.italic,color:o.color,recorded:false};
    const limits=limitsOf(o);if(limits&&!limits.perLine&&!limits.wholeField)field.maxLength=limits.maxLength;else field.removeAttribute('maxlength');
    field.value=o.text;box.hidden=false;update();field.focus({preventScroll:true});field.select();
  }
  el.uxEditText=openText;
  let openingPhoto=false;
  async function openPhoto(o){if(openingPhoto||r.querySelector('.ux-photo-edit-dialog')?.open)return;openingPhoto=true;try{await editPhoto(o);}finally{openingPhoto=false;}}
  // Opening the editor is an explicit button action, never a tap on the photo.
  // Do not let the stage's drag/shortcut handlers consume editing gestures.
  for(const host of [panel,box])for(const type of ['pointerdown','pointerup','click','dblclick','keydown'])host.addEventListener(type,e=>e.stopPropagation());
  field.addEventListener('input',()=>{
    const o=selected();if(!editing||o?.id!==editing.id||!can(o,'content'))return;
    if(!editing.recorded){el.record();editing.recorded=true;}
    const limits=limitsOf(o);if(limits){const next=clampText(field.value,limits,o.text);if(next!==field.value){const at=Math.min(field.selectionStart??next.length,next.length);field.value=next;try{field.setSelectionRange(at,at);}catch{}}}
    o.text=field.value;o.uxCustomerText=true;el.normalize();el.sync();
  });
  field.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey||!e.shiftKey&&!limitsOf(selected())?.wholeField)){e.preventDefault();close();}else if(e.key==='Enter'){const limits=limitsOf(selected());if(limits&&field.value.split('\n').length>=limits.maxLines)e.preventDefault();}});
  openButton.addEventListener('click',()=>{const o=selected();if(o?.type==='text')openText(o.id);else if(o?.uxUploadId&&can(o,'replace'))openPhoto(o);});
  panel.querySelector('[data-direct-done]').addEventListener('click',()=>close());
  panel.querySelector('[data-direct-cancel]').addEventListener('click',()=>close(true));
  for(const b of panel.querySelectorAll('[data-direct-style]'))b.addEventListener('click',()=>{if(can(selected(),'content'))r.querySelector('[data-ux='+b.dataset.directStyle+']')?.click();});
  for(const b of panel.querySelectorAll('[data-direct-align]'))b.addEventListener('click',()=>{if(can(selected(),'move'))el.uxAlign?.(b.dataset.directAlign);});
  for(const b of panel.querySelectorAll('[data-direct-step]'))b.addEventListener('click',()=>{if(can(selected(),'scale'))r.querySelector('[data-ux='+b.dataset.directStep+']')?.click();});
  panel.querySelector('[data-direct-turn]').addEventListener('click',()=>{const o=selected();if(can(o,'move')&&el.uxCanRotate?.(o)!==false)changeObject('rotation',((o.rotation||0)+15)%360);});
  panel.querySelector('[data-ux=delete]').addEventListener('click',()=>{r.querySelector('.ux-controls [data-ux=delete]')?.click();});
  font.addEventListener('click',()=>r.querySelector('[data-ux=fonts]')?.click());
  color.addEventListener('input',()=>{if(colorTool&&can(selected(),'color'))changeObject('color',color.value);});
  for(const b of panel.querySelectorAll('[data-direct-motif]'))b.addEventListener('click',()=>{const o=selected(),action=b.dataset.directMotif;if(action==='rotate'&&el.uxCanRotate?.(o)===false)return;if(o?.type!=='motif'||!can(o,action==='rotate'?'move':'scale'))return;if(action==='rotate')changeObject('rotation',((o.rotation||0)+15)%360);else el.action(action);});
  size.addEventListener('change',()=>{
    const o=selected();if(o?.type!=='text'||!can(o,'scale')||!Number.isFinite(size.valueAsNumber))return;
    const input=r.querySelector('#ux-size');input.value=Math.max(minTextMm,Math.min(100,Math.round(size.valueAsNumber)));
    input.dispatchEvent(new Event('change',{bubbles:true}));size.value=input.value;update();
  });
  if(stableDoorbell)size.addEventListener('input',()=>{
    const o=selected();if(o?.type!=='text'||!can(o,'scale')||size.value===''||!Number.isFinite(size.valueAsNumber))return;
    const requested=Math.max(minTextMm,Math.min(100,Math.round(size.valueAsNumber)));
    if(requested!==Math.round(o.size*(el.uxTextScale?.()||1)))changeObject('size',requested);
  });
  r.addEventListener('dblclick',e=>{
    if(!e.target.closest('.stage,.c-large-preview')||e.target.closest('.ux-direct-edit,.ux-direct-input'))return;
    const id=e.target.closest('[data-object]')?.dataset.object;
    const o=id?el.state.objects.find(o=>o.id===id):selected();
    if(o?.uxUploadId){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  for(const name of ['render','sync']){const original=el[name];el[name]=function(...args){const result=original.apply(this,args);update();return result;};}
  el.uxRefreshTextToolbar=update;
  window.addEventListener('resize',update);new ResizeObserver(update).observe(stage);update();
}
