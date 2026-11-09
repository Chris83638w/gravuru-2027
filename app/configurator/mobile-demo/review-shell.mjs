import {executionKind} from '../variant-m/execution-registry.mjs';
import {installMobileDemo} from './demo.mjs';

export function reviewPresentationContext({host,view,config}){
 const presentation=host?.GravuruReviewPresentation;
 if(presentation?.name!=='prio-r15')return null;
 const binding=host.GravuruWorkshopReview,profile=config?.profile;
 if(!view||host===view||host.location?.origin!==view.location?.origin||
  host.GravuruShopEntry||host.GravuruConfiguratorTest||host.GravuruCommerce||
  !binding||presentation.binding!==binding||!binding.productId||
  !Number.isSafeInteger(binding.productRevision)||binding.productRevision<1||
  config!==host.UniversalConfig||config?.reviewOnly!==true||profile?.features?.orderEnabled!==false||
  profile.binding?.kind!=='local-review'||profile.binding.productId!==binding.productId||
  profile.revision!==binding.productId+':'+binding.productRevision||
  config.familyFormats?.source?.lineId!=='uv-gedenkkreuze'||executionKind(config)!=='uv-cross')
  throw Error('Die Prio-Vorschau passt nicht zum geladenen Prüfstand.');
 return Object.freeze({mode:'review',badge:'Prio Konfi',badgeTitle:'UV-Gedenkkreuze · Werkstattvorschau',
  accountNote:'Du kannst deine Gestaltung für die Werkstattprüfung sichern.',
  optionLabel:'Größe',uploadLabel:'Foto',returnLabel:'Zur UV-Galerie',
  summary:state=>{
   if(![state?.width,state?.height].every(mm=>Number.isFinite(mm)&&mm>0))return profile.name;
   const cm=mm=>(mm/10).toLocaleString('de-DE',{maximumFractionDigits:2});
   return `Acrylglas · ${cm(state.width)} × ${cm(state.height)} cm`;
  }});
}

export async function installPrioReviewShell(el,config,{host=window.parent,view=window}={}){
 const context=reviewPresentationContext({host,view,config});
 return context?installMobileDemo(el,config,context):null;
}
