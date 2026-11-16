// Synthetic single-format configuration for simultaneous upload contract tests.
// This is never an Issue 230 source record or a live catalogue geometry.
export function asAcrylicUploadFamily(config){
 const p=config.profile,key='synthetic-acrylic-upload-size',themeId='familienschilder';
 p.material={kind:'acrylic',color:'#17191b',thicknessMm:3,variant:'schwarz',engravingSide:'back'};
 p.processing={profileId:'acrylic-engraving'};p.themeId=themeId;
 config.photo.enabled=true;config.photo.includedCount=0;
 p.optionGroups[0].values.push({id:'K00',label:'Ohne Befestigung',priceCents:0,currency:'EUR',holes:[]});
 for(const d of p.designs){d.themes=[themeId];d.katalog={designId:'SYNTHETIC-'+d.id,plateMm:[p.geometry.width,p.geometry.height]};}
 config.familyFormats={schema:'gravuru-family-formats/v1',defaultSize:key,fixedSize:key,defaultColor:'schwarz',colors:[{id:'schwarz',label:'Schwarz'}],
  source:{shopProduct:{sizeKey:key,themeId,defaultDesignId:p.designs.find(d=>d.id===p.defaultDesignId).katalog.designId}},designs:structuredClone(p.designs),
  formats:[{key,form:'RE',label:'Synthetic test format',geometry:structuredClone(p.geometry),variants:[{color:'schwarz',familyId:'acryl-3mm-tuerschilder-schwarz',sizeKey:key,basePriceCents:config.basePriceCents,material:structuredClone(p.material),mounting:structuredClone(p.optionGroups[0].values),designIds:p.designs.map(d=>d.id)}]}]};
 return config;
}
