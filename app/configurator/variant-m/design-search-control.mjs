import {designSearchQuery} from './design-search.mjs';

// Invalidate as soon as a new input arrives, before the debounce starts. A slow
// previous page can therefore never repopulate the grid while the user types.
export function createDesignSearchInput({change,invalidate=()=>{},schedule=setTimeout,cancel=clearTimeout,delay=250}){
 let timer=null,query='',composing=false;
 const clearTimer=()=>{if(timer!==null)cancel(timer);timer=null;};
 const flush=()=>{clearTimer();if(!composing)change(query);};
 return {
  get query(){return query;},
  input(value,{immediate=false}={}){query=designSearchQuery(value);clearTimer();invalidate();if(!composing){if(immediate||!query)flush();else timer=schedule(flush,delay);}},
  compositionStart(){composing=true;clearTimer();invalidate();},
  compositionEnd(value){composing=false;this.input(value);},
  flush,dispose(){clearTimer();}
 };
}
export function installDesignSearchControl({container,before,onChange,onInvalidate,document:doc=document}){
 const form=doc.createElement('div');form.className='ux-design-search';
 form.innerHTML='<label for="ux-design-search-input">Design suchen</label><div class="ux-design-search-row"><input id="ux-design-search-input" type="search" maxlength="80" placeholder="z. B. Haus, Familie oder D23" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" aria-controls="ux-design-search-results"><button type="button" aria-label="Suche löschen" hidden>Leeren</button></div>';
 if(before)before.before(form);else container.prepend(form);
 const input=form.querySelector('input'),clear=form.querySelector('button');
 const state=createDesignSearchInput({change:onChange,invalidate:onInvalidate});
 const update=immediate=>{clear.hidden=!input.value;state.input(input.value,{immediate});};
 input.addEventListener('input',()=>update(false));input.addEventListener('search',()=>update(true));
 input.addEventListener('compositionstart',()=>state.compositionStart());input.addEventListener('compositionend',()=>{clear.hidden=!input.value;state.compositionEnd(input.value);});
 input.addEventListener('keydown',event=>{if(event.isComposing)return;if(event.key==='Enter'){event.preventDefault();state.flush();}else if(event.key==='Escape'){event.preventDefault();input.value='';update(true);}});
 clear.addEventListener('click',()=>{input.value='';update(true);input.focus();});
 return {...state,input,element:form,get query(){return state.query;}};
}
