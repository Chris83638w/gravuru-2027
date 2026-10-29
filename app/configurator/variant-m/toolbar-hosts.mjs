// Move the original controls between layout hosts; never clone their state or listeners.
export function placePreviewToolbar({toolbar,workbench,heading,full,mobile}){
  workbench.hidden=mobile||full.open;
  const home=full.open?full:mobile?heading:workbench;
  if(toolbar.parentNode!==home){
    if(full.open)full.querySelector('.ux-preview-back').after(toolbar);
    else if(mobile)heading.append(toolbar);
    else workbench.prepend(toolbar);
  }
}

export function placeDirectToolbar({panel,stage,preview,workbench,mobile,full}){
  const inWorkbench=!!workbench&&!mobile&&!full;
  const home=inWorkbench?workbench:mobile&&!full?preview:stage;
  if(panel.parentNode!==home)home.append(panel);
  panel.classList.toggle('is-workbench',inWorkbench);
  panel.classList.toggle('is-docked',mobile);
  panel.classList.toggle('is-fullscreen-dock',mobile&&full);
  if(inWorkbench){
    for(const property of ['left','top','transform','transformOrigin'])panel.style[property]='';
    panel.style.removeProperty('--ux-full-dock-top');
  }
  return inWorkbench;
}
