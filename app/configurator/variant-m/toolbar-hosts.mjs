// Move the original controls between layout hosts; never clone their state or listeners.
export function placePreviewToolbar({toolbar,workbench,heading,preview,full,mobile}){
  workbench.hidden=true;
  const home=full.open?full:heading;
  if(toolbar.parentNode!==home){
    if(full.open)full.querySelector('.ux-preview-back').after(toolbar);
    else heading.append(toolbar);
  }
}

export function placeDirectToolbar({panel,stage,preview,workbench,mobile,full,stableHost}){
  const inWorkbench=!!workbench&&!mobile&&!full;
  const home=stableHost&&!full?stableHost:inWorkbench||mobile&&!full?preview:stage;
  if(panel.parentNode!==home){
    const canvas=!full&&preview.querySelector('[data-ux-stage]');
    if(stableHost&&!full)home.append(panel);else if(canvas)preview.insertBefore(panel,canvas);else home.append(panel);
  }
  panel.classList.toggle('is-workbench',inWorkbench);
  panel.classList.toggle('is-docked',mobile);
  panel.classList.toggle('is-fullscreen-dock',mobile&&full);
  if(inWorkbench){
    for(const property of ['left','top','transform','transformOrigin'])panel.style[property]='';
    panel.style.removeProperty('--ux-full-dock-top');
  }
  return inWorkbench;
}
