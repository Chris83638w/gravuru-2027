import {moduleEnabled,validateModuleProfile} from './module-profile.mjs';

// Presentation only. Native product/process capabilities remain the upper bound.
export function moduleTabs(config,{upload=false}={}){
 return ['options','design','text','motif','upload'].filter(tab=>tab==='upload'
  ? upload&&(moduleEnabled(config,'photo')||moduleEnabled(config,'logo'))
  : moduleEnabled(config,({design:'designs',motif:'motifs'})[tab]||tab));
}

// Additional module gates for raw drafts and direct price requests. Persisted
// template objects remain intact; movement/removal keeps its original rights.
export function moduleDesignIssue(config,{source,objects,designId,defaultDesignId,options,defaultOptions,ink,template=false}={}){
 if(config?.moduleProfile===undefined)return null;
 validateModuleProfile(config.moduleProfile);
 if(!template&&!moduleEnabled(config,'designs')&&designId!==defaultDesignId)return 'Die Designauswahl ist bei diesem Produkt ausgeschaltet.';
 if(!template&&!moduleEnabled(config,'options')&&Object.keys({...options,...defaultOptions}).some(key=>JSON.stringify(options?.[key])!==JSON.stringify(defaultOptions?.[key])))return 'Die Ausführung ist bei diesem Produkt festgelegt.';
 const originals=new Map((source?.objects||[]).map(object=>[object.id,object]));
 for(const object of objects||[]){
  const original=originals.get(object.id);
  if((object.uxUploadKind==='photo'||object.type==='photoSlot')&&!moduleEnabled(config,'photo'))return 'Das Fotomodul ist bei diesem Produkt ausgeschaltet.';
  if(object.uxUploadKind==='logo'&&!moduleEnabled(config,'logo'))return 'Das Logomodul ist bei diesem Produkt ausgeschaltet.';
  if(object.type==='text'&&!moduleEnabled(config,'text')&&(!original||['text','font','bold','italic'].some(key=>JSON.stringify(object[key])!==JSON.stringify(original[key]))))return 'Die Textbearbeitung ist bei diesem Produkt ausgeschaltet.';
  const decoration=object.uxDecoration===true&&(source?.marks||[]).some((_,i)=>object.id==='ux-line-'+source.id+'-'+i&&object.motif===object.id);
  if(object.type==='motif'&&!decoration&&!moduleEnabled(config,'motifs')&&(!original||object.motif!==original.motif))return 'Die Motivauswahl ist bei diesem Produkt ausgeschaltet.';
  if(!moduleEnabled(config,'colors')&&['text','motif','graphic'].includes(object.type)&&!decoration&&object.color!==(original?original.color:ink))return 'Die Farbwahl ist bei diesem Produkt ausgeschaltet.';
 }
 return null;
}
