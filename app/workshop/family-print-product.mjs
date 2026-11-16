import {prepareConfig,selectedProfile,variantCombinations} from '../configurator/variant-m/contract.mjs';
import {validateGeometryHoles} from '../platform/sources/app/shared/models/design-content.mjs';

// Use the native plate renderer and shared options for front-side colour print.
// The generated catalogue document is a review product until separately released.
export function nativeFamilyPrintConfig(input){
 const p=input?.profile,mounting=p?.optionGroups?.[0];
 if(p?.kind!=='universal-product'||p.material?.kind!=='aluDibond'||p.processing?.profileId!=='color-print'||
    input.acrylic||input.doorbell||p.material.engravingSide==='back'||input.reviewOnly!==true||
    p.binding?.kind!=='local-review'||p.features?.orderEnabled!==false||p.features?.productionConfirmed!==false){
  throw Error('Die Alu-Dibond-Familie benötigt eine native Prüfvorlage für Farbdruck auf der Vorderseite.');
 }
 if(mounting?.id!=='mounting'||!Array.isArray(mounting.values)||!mounting.values.length||
    mounting.values.some(value=>!Array.isArray(value.holes))){
  throw Error('Die Alu-Dibond-Familie benötigt ausdrückliche Bohrbilder je Befestigung.');
 }
 const config=prepareConfig(input);
 if(config.profile.designs.length!==p.designs.length)throw Error('Eine Vorlage widerspricht der Fotofreigabe.');
 for(const options of variantCombinations(config))validateGeometryHoles(selectedProfile(config,options));
 return config;
}
