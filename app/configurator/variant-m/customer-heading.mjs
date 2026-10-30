import {materialLabel} from './mobile-steps.mjs';
import {selectedProfile} from './contract.mjs';
import {physicalGeometry} from './print-geometry.mjs';

export const customerSelectionHeading=(config,state)=>customerHeading(selectedProfile(config,state.mOptions||{}),physicalGeometry(config,state));

export function customerHeading(profile={},geometry=profile.geometry||{}){
 const name=String(profile.name||'');
 const title=/gedenktafel/i.test(name)?'Deine Gedenktafel gestalten':/funkklingel|klingelschild/i.test(name)?'Dein Klingelschild gestalten':/türschild|tuerschild/i.test(name)?'Dein Türschild gestalten':/acrylglasbild|acrylbild/i.test(name)?'Dein Acrylglasbild gestalten':'Dein Produkt gestalten';
 const material=typeof profile.material==='string'?materialLabel(profile.material):materialLabel({...profile.material,thicknessMm:undefined});
 const number=n=>Number(n/10).toLocaleString('de-DE',{maximumFractionDigits:2});
 const size=Number.isFinite(geometry.width)&&Number.isFinite(geometry.height)?`${number(geometry.width)} × ${number(geometry.height)} cm`:'';
 const square=geometry.width===geometry.height;
 const shape=geometry.shape==='ellipse'?(square?'Rund':'Oval'):geometry.shape==='contour'?'Konturform':geometry.shape==='plaque'?'Eingezogene Ecken':geometry.shape==='rect'?(geometry.cornerRadiusMm>0?'Abgerundete Ecken':square?'Quadratisch':'Rechteckig'):'';
 return {title,features:[material,size,shape].filter(Boolean).join(' · ')};
}
