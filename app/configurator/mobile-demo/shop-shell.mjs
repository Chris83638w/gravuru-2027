// Same approved R15 presentation, mounted on the existing native shop session.
// This module neither creates a session nor changes product/price/cart rights.
import {installMobileDemo} from './demo.mjs';

export function shopPresentationContext({host,view,config}){
 if(host?.GravuruShopEntry?.presentation!=='prio-r15')return null;
 if(!view||host===view||host.location?.origin!==view.location?.origin)throw Error('Der Konfi benötigt seine gebundene Produktsitzung.');
 const entry=host.GravuruShopEntry,binding=host.GravuruWorkshopReview;
 if(!binding||!binding.productId||!Number.isSafeInteger(binding.productRevision)||binding.productRevision<1||
  entry.productId!==binding.productId||entry.productRevision!==binding.productRevision||
  !config||config!==host.UniversalConfig||entry.cartMode!=='theme'||typeof entry.submitCart!=='function'||typeof entry.request!=='function')
  throw Error('Die Produktsitzung passt nicht zum geladenen Konfigurator.');
 return Object.freeze({mode:'shop',badge:'Konfigurator',badgeTitle:'Dein Produkt gestalten',accountNote:'',
  productTitle:entry.productName||config.profile?.name||'Dein Produkt',
  logoOnly:config.photo?.enabled===false&&config.logo?.enabled===true});
}

export function shopProductSummary(config,state,context){
 if(context?.mode!=='shop')return state?.width&&state?.height?`Schiefer · ${Math.round(state.width/10)} × ${Math.round(state.height/10)} cm`:'Schiefer-Gedenktafel';
 const name={steel:'Edelstahl',slate:'Schiefer',acrylic:'Acrylglas'}[config?.profile?.material?.kind]||context.productTitle;
 const number=value=>(value/10).toLocaleString('de-DE',{maximumFractionDigits:2});
 return [state?.width,state?.height].every(v=>Number.isFinite(v)&&v>0)?`${name} · ${number(state.width)} × ${number(state.height)} cm`:context.productTitle;
}

export async function installPrioShopShell(el,config,{host=window.parent,view=window}={}){
 const context=shopPresentationContext({host,view,config});
 if(!context)return null;
 // No GravuruMobileDemo global: its standalone autostart and checkout guard
 // continue to belong only to the static demo builder.
 return installMobileDemo(el,config,{...context,summary:state=>shopProductSummary(config,state,context)});
}
