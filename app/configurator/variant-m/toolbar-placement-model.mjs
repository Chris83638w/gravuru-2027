// UI-Zuordnung, keine Produktoption: bleibt beim Entwurf und verändert keinen Preis.
export const TOOLBAR_PLACEMENTS=Object.freeze(['plate','selection']);
export const TOOLBAR_VISITOR_KEY='gravuru:text-toolbar-placement:v1';
const invalid=()=>{throw Error('Position der Textleiste ist ungültig.');};
export function toolbarPlacement(value='plate'){
 if(!TOOLBAR_PLACEMENTS.includes(value))invalid();
 return value;
}
export function editorUi(input){
 if(input===undefined)return undefined;
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==1||!Object.hasOwn(input,'textToolbarPlacement'))invalid();
 if(input.textToolbarPlacement===undefined)invalid();
 return {textToolbarPlacement:toolbarPlacement(input.textToolbarPlacement)};
}
export function validateToolbarConfig(config){
 toolbarPlacement(config.textToolbarPlacement);
 if(config.textToolbarExperiment!==undefined&&typeof config.textToolbarExperiment!=='boolean')invalid();
}
export function toolbarPlacementQuery(search,{embedded=false}={}){
 if(!embedded)return undefined;
 const values=new URLSearchParams(search).getAll('leiste');
 return values.length===1?(values[0]==='a'?'selection':values[0]==='b'?'plate':undefined):undefined;
}
export function resolveToolbarPlacement({config={},embedded=false,search='',savedUi,storage,random=Math.random}={}){
 validateToolbarConfig(config);
 const saved=editorUi(savedUi),query=toolbarPlacementQuery(search,{embedded});
 if(query)return query;
 if(saved)return saved.textToolbarPlacement;
 const fallback=toolbarPlacement(config.textToolbarPlacement);
 // Bis zur ausdrücklichen Aktivierung bleibt jeder neue Besucher bei der Vorgabe.
 if(!embedded||config.textToolbarExperiment!==true)return fallback;
 // Ohne beständigen Browserspeicher nicht bei jedem Aufruf neu auslosen.
 try{
  if(typeof storage?.getItem!=='function'||typeof storage?.setItem!=='function')return fallback;
  const remembered=storage.getItem(TOOLBAR_VISITOR_KEY);
  if(TOOLBAR_PLACEMENTS.includes(remembered))return remembered;
  const draw=random();if(!Number.isFinite(draw)||draw<0||draw>=1)return fallback;
  const chosen=draw<.5?'selection':'plate';
  storage.setItem(TOOLBAR_VISITOR_KEY,chosen);
  return storage.getItem(TOOLBAR_VISITOR_KEY)===chosen?chosen:fallback;
 }catch{return fallback;}
}
