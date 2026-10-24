import {getProcessingProfile} from './processing-profiles.mjs';

// Customer-upload default only: authored template PNGs, examples and logos stay original.
// An explicit photo choice is authoritative across render, reload and material changes.
export const PHOTO_COLORS=Object.freeze(['original','grayscale','sepia']);
export function defaultPhotoColor(profile){
 if(profile?.material?.kind==='slate')return 'grayscale';
 if(profile?.material?.kind==='acrylic'&&getProcessingProfile(profile).method==='engraving')return 'grayscale';
 return 'original';
}
export const isCustomerPhotoUpload=object=>object?.type==='photoSlot'&&object.uxUploadKind==='photo'&&typeof object.uxUploadId==='string'&&object.uxUploadId.length>0;
export function photoColorMode(profile,object={}){
 if(!isCustomerPhotoUpload(object))return 'original';
 return PHOTO_COLORS.includes(object.uxPhotoColor)?object.uxPhotoColor:defaultPhotoColor(profile);
}
export const photoColorFilter=color=>color==='grayscale'?'<feColorMatrix type="saturate" values="0"/>':color==='sepia'?'<feColorMatrix type="matrix" values=".393 .769 .189 0 0 .349 .686 .168 0 0 .272 .534 .131 0 0 0 0 0 1 0"/>':'';
// Light engraving is a preview composition over the material, never a cutout.
// Black contributes no light, and existing alpha remains a continuous multiplier.
export function photoEngravingPreviewFilter(profile,color){
 if(color!=='grayscale'||!['slate','acrylic'].includes(profile?.material?.kind))return '';
 const processing=getProcessingProfile(profile);if(processing.method!=='engraving')return '';
 const rgb=processing.ink.slice(1).match(/../g).map(h=>parseInt(h,16)/255);
 return '<feColorMatrix type="matrix" values="'+rgb.map(v=>'0 0 0 0 '+v).join(' ')+' .2126 .7152 .0722 0 0"/><feComposite in2="SourceAlpha" operator="in"/>';
}
