// Keep the original library controls, listeners and current search in place.
export function installInlineMotifBrowser({root,panel,bestsellers}){
 const offered=!!bestsellers&&!bestsellers.hidden;
 function show(mode){
  const all=mode==='all'||!offered;
  panel.hidden=!all;
  if(bestsellers)bestsellers.hidden=all||!offered;
  for(const button of root.querySelectorAll('[data-ux=discover-motifs],[data-ux=bestsellers]'))
   button.setAttribute('aria-pressed',String((button.dataset.ux==='discover-motifs')===all));
 }
 root.addEventListener('click',event=>{
  const action=event.target.closest('[data-ux]')?.dataset.ux;
  if(action==='discover-motifs')show('all');
  if(action==='bestsellers')show('bestsellers');
 });
 show('bestsellers');
 return show;
}
