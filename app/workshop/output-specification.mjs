// Only stored renderer metadata. Never infer effective settings from today's defaults.
export function outputSpecification(result){
 const m=result?.metadata;if(!m)return null;
 const settings=Object.fromEntries(['profile','mode','dpi','mirror','white','bleedMm','whiteBleedMm','pageWidthMm','pageHeightMm','colorSpace'].filter(k=>Object.hasOwn(m.settings||{},k)).map(k=>[k,m.settings[k]]));
 const p=m.productionProfile;
 return {settings,edgeInk:typeof m.edgeInk==='boolean'?m.edgeInk:null,
  profile:p?{name:p.document?.name,revision:p.revision,machine:p.document?.machine,rip:p.document?.rip}:null,
  profileSettingsOverridden:typeof m.profileSettingsOverridden==='boolean'?m.profileSettingsOverridden:null,
  warnings:Array.isArray(m.warnings)?m.warnings.filter(v=>typeof v==='string'):[],
  colorConversion:typeof m.colorConversion==='string'?m.colorConversion:null};
}
