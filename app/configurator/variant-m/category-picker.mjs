import {uiIcon} from './ui-icons.mjs';

// Category symbols are navigation aids; motif artwork/names still come from the catalogue.
export function categorySymbol(label){
 const text=label.toLocaleLowerCase('de');
 if(/bestseller/.test(text))return 'star';
 if(/leuchtt/.test(text))return 'lighthouse';
 if(/infinity|unendlich/.test(text))return 'infinity';
 if(/musik/.test(text))return 'music';
 if(/kerz/.test(text))return 'candle';
 if(/pfeil/.test(text))return 'arrow';
 if(/regenbogen/.test(text))return 'rainbow';
 if(/sonne|urlaub|sternzeichen/.test(text))return 'sun';
 if(/stern/.test(text))return 'star';
 if(/schmetter/.test(text))return 'butterfly';
 if(/schleif/.test(text))return 'bow';
 if(/ostern/.test(text))return 'egg';
 if(/weihnacht/.test(text))return 'tree';
 if(/sport/.test(text))return 'ball';
 if(/figur|muttertag|vatertag/.test(text))return 'person';
 if(/brandzeichen/.test(text))return 'flame';
 if(/social/.test(text))return 'message';
 if(/ornament|verzierung/.test(text))return 'flourish';
 if(/jubil/.test(text))return 'gift';
 if(/pferd|vögel/.test(text))return 'paw';
 if(/kleine schilder/.test(text))return 'sign';
 if(/anker|maritim/.test(text))return 'anchor';
 if(/herz|liebe|hochzeit/.test(text))return 'heart';
 if(/baum|bäum|natur|pflanz|zweig/.test(text))return 'tree';
 if(/blum/.test(text))return 'flower';
 if(/haus|heim/.test(text))return 'house';
 if(/tier|hund|katz|pfot/.test(text))return 'paw';
 if(/baby|kind/.test(text))return 'baby';
 if(/kreuz|relig/.test(text))return 'cross';
 if(/geburtstag/.test(text))return 'gift';
 if(/beruf|gewerb/.test(text))return 'work';
 if(/engel|flügel|feder/.test(text))return 'feather';
 if(/hinweis|piktogram/.test(text))return 'info';
 return 'grid';
}

// Native select remains the single source of values and change events.
export function installCategoryPicker(select,{doc=document}={}){
 const host=doc.createElement('div');host.className='ux-category-picker';
 const trigger=doc.createElement('button');trigger.type='button';trigger.className='ux-category-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 const list=doc.createElement('div');list.className='ux-motif-category-menu';list.id='ux-motif-category-list';list.setAttribute('popover','auto');list.setAttribute('role','listbox');list.setAttribute('aria-label','Motivkategorie');
 trigger.setAttribute('aria-controls',list.id);host.append(trigger,list);select.after(host);select.classList.add('ux-category-source');select.setAttribute('aria-hidden','true');select.tabIndex=-1;
 let signature='',rows=[];
 function refresh(){
  const options=[...select.options],selected=options.find(o=>o.value===select.value)||options[0];
  trigger.disabled=select.disabled;trigger.replaceChildren();
  const icon=doc.createElement('span');icon.innerHTML=uiIcon(categorySymbol(selected?.textContent||''));
  const label=doc.createElement('span');label.textContent=selected?.textContent||'Kategorie';
  const arrow=doc.createElement('span');arrow.className='ux-category-chevron';arrow.innerHTML=uiIcon('chevron');trigger.append(icon,label,arrow);trigger.setAttribute('aria-label','Motivkategorie: '+label.textContent);
  const next=JSON.stringify(options.map(o=>[o.value,o.textContent,o.disabled]));
  if(next!==signature){signature=next;list.replaceChildren();rows=options.map(option=>{
   const row=doc.createElement('div');row.setAttribute('role','option');row.tabIndex=-1;row.dataset.value=option.value;row.setAttribute('aria-disabled',String(option.disabled));
   const symbol=doc.createElement('span');symbol.innerHTML=uiIcon(categorySymbol(option.textContent));const name=doc.createElement('span');name.textContent=option.textContent;row.append(symbol,name);list.append(row);
   row.onclick=()=>{if(option.disabled)return;select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));refresh();list.hidePopover();trigger.focus();};return row;
  });}
  for(const row of rows)row.setAttribute('aria-selected',String(row.dataset.value===select.value));
 }
 function open(){refresh();const b=trigger.getBoundingClientRect(),view=doc.defaultView;
  list.style.width=Math.min(b.width,view.innerWidth-24)+'px';list.style.left=Math.min(b.left,view.innerWidth-Math.min(b.width,view.innerWidth-24)-12)+'px';
  const below=view.innerHeight-b.bottom-12,above=b.top-12,under=below>=Math.min(240,above);
  list.style.top=under?b.bottom+4+'px':'auto';list.style.bottom=under?'auto':view.innerHeight-b.top+4+'px';list.style.maxHeight=Math.max(80,Math.min(360,under?below:above))+'px';
  list.showPopover();(rows.find(row=>row.dataset.value===select.value)||rows[0])?.focus();
 }
 trigger.onclick=()=>list.matches(':popover-open')?list.hidePopover():open();
 trigger.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}});
 list.addEventListener('toggle',event=>trigger.setAttribute('aria-expanded',String(event.newState==='open')));
 list.addEventListener('keydown',event=>{
  const enabled=rows.filter(row=>row.getAttribute('aria-disabled')!=='true'),index=enabled.indexOf(event.target);
  let target;
  if(event.key==='ArrowDown')target=enabled[(index+1)%enabled.length];
  if(event.key==='ArrowUp')target=enabled[(index-1+enabled.length)%enabled.length];
  if(event.key==='Home')target=enabled[0];if(event.key==='End')target=enabled.at(-1);
  if(target){event.preventDefault();target.focus();}
  if(['Enter',' '].includes(event.key)){event.preventDefault();event.target.click();}
  if(event.key==='Escape'){event.preventDefault();list.hidePopover();trigger.focus();}
  if(event.key==='Tab')list.hidePopover();
 });
 select.addEventListener('change',refresh);refresh();return refresh;
}
