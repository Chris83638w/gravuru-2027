// K14 / Ü15.1: Reiter „Vorderseite / Rückseite“ über der Platte – nur wenn das Produkt eine
// Rückseite hat. Die Vorschau zeigt die gewählte Seite (adapter.mjs filtert nach
// `el.state.uxSurface`), neue Elemente landen auf ihr, Text- und Fotozeilen der anderen
// Seite werden ausgeblendet (auch im Mobile-Schritt Text/Foto). Ein offener Aufpreis
// sperrt die Rückseite: Reiter sichtbar, aber nicht wählbar, mit Hinweis.
import {hasBack,backBookable,backSurface,objectSurface,surfaceLabel,backDesigned} from './surfaces.mjs';
import {money} from './contract.mjs';

export function surfaceTabState(profile){
  if(!hasBack(profile))return null;
  const back=backSurface(profile),bookable=backBookable(profile);
  return {tabs:[{id:'front',label:surfaceLabel(profile,'front'),enabled:true,note:''},
    {id:'back',label:surfaceLabel(profile,'back'),enabled:bookable,note:bookable?(back.priceCents?'Rückseite gestalten +'+money(back.priceCents):'Rückseite gestalten ohne Aufpreis'):'Rückseite: Preis offen – noch nicht buchbar'}]};
}

export function installSurfaceTabs({el,r,config,button,say}){
  const profile=config?.profile,state=profile&&surfaceTabState(profile);
  if(!state)return null;
  const $=s=>r.querySelector(s),all=s=>[...r.querySelectorAll(s)];
  el.state.uxSurface=el.state.uxSurface==='back'&&state.tabs[1].enabled?'back':'front';
  const bar=document.createElement('div');bar.className='ux-surface-tabs';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Seite des Produkts');
  bar.innerHTML=state.tabs.map(t=>button('surface-'+t.id,t.label,`role="tab" data-ux-surface="${t.id}" aria-selected="${t.id==='front'}" ${t.enabled?'':'aria-disabled="true"'} title="${t.note}"`)).join('')+`<small data-ux-surface-note>${state.tabs[1].note}</small>`;
  const stage=$('[data-ux-stage]');stage.before(bar);
  const style=document.createElement('style');
  style.textContent='.ux-surface-tabs{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px;padding:0 4px}.ux-surface-tabs button{border:1px solid #c4cbc6;border-radius:999px;background:#fff;padding:7px 14px;font:inherit;color:#1c3327;min-height:36px}.ux-surface-tabs button[aria-selected=true]{background:#e3eee7!important;border:2px solid #1c3327!important;font-weight:700!important}.ux-surface-tabs button[aria-disabled=true]{opacity:.55;cursor:not-allowed}.ux-surface-tabs small{font-size:12px;color:#46574d;flex-basis:100%}[data-ux-surface-hidden]{display:none!important}';
  r.append(style);
  // Alle je gesehenen Kennungen (wächst nur): Rückgängig/Wiederholen und Entwurf-Laden ordnen nichts neu zu.
  const known=new Set(el.state.objects.map(o=>o.id));let adopt=true;
  function choose(id){
    if(id==='back'&&!state.tabs[1].enabled){say(state.tabs[1].note);return;}
    if(el.state.uxSurface===id)return;
    el.state.uxSurface=id;el.state.selected=null;el.sync();
  }
  bar.addEventListener('click',e=>{const b=e.target.closest('[data-ux-surface]');if(b)choose(b.dataset.uxSurface);});
  // Text- oder Fotofehler auf der anderen Seite: erst die Seite wechseln, dann zeigen.
  const reveal=el.uxRevealTextIssue;
  if(reveal)el.uxRevealTextIssue=id=>{const o=el.state.objects.find(x=>x.id===id);if(o&&objectSurface(o)!==el.state.uxSurface)choose(objectSurface(o));return reveal(id);};
  // Neu entstandene Kundenelemente (Text, Motiv, Foto, Logo) gehören zur gewählten Seite – vor dem Zeichnen.
  function adoptNew(){
    const active=el.state.uxSurface||'front';
    for(const o of el.state.objects){if(adopt&&!known.has(o.id)&&o.templateOrigin!==true&&o.surfaceId===undefined&&active==='back')o.surfaceId='back';known.add(o.id);}
  }
  const restore=el.restoreDraft;
  if(restore)el.restoreDraft=function(...args){adopt=false;try{return restore.apply(this,args);}finally{for(const o of el.state.objects)known.add(o.id);adopt=true;}};
  function refresh(){
    const active=el.state.uxSurface||'front';
    for(const b of all('[data-ux-surface]'))b.setAttribute('aria-selected',String(b.dataset.uxSurface===active));
    const note=$('[data-ux-surface-note]');if(note)note.textContent=state.tabs[1].note+(backDesigned(el.state.objects)?' · Rückseite gestaltet':'');
    const surfaceOf=id=>objectSurface(el.state.objects.find(o=>o.id===id));
    for(const row of all('[data-ux-row]'))row.toggleAttribute('data-ux-surface-hidden',surfaceOf(row.dataset.uxRow)!==active);
    for(const row of all('.ux-upload-row')){const id=row.querySelector('[data-id]')?.dataset.id;if(id)row.toggleAttribute('data-ux-surface-hidden',surfaceOf(id)!==active);}
  }
  const sync=el.sync;el.sync=function(...args){adoptNew();const result=sync.apply(this,args);refresh();return result;};
  refresh();
  return {choose,refresh};
}
