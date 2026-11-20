// Mikail, 04.11.2026: additional motifs cost 1.69 EUR; acrylic stands are exclusive to memorial plaques.
// Chris, 18.11.2026: only rectangular/square blanks up to 400 × 300 mm accept those stands.
// https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6976844579
// The catalogue supplies the original prices, mounting geometry and artwork.
// The catalogue uses these explicit theme IDs (themen.json, 43fe1f23).
// `gedenken` is the older shared theme; its audience is assigned by the importer.
// Do not classify unrelated products by a substring in their display name.
const memorialThemes=new Map([
 ['gedenken',null],
 ['gedenktafeln','remembranceHuman'],
 ['tiergedenktafeln','remembranceAnimal'],
 ['hundegedenktafeln','remembranceAnimal'],
 ['katzengedenktafeln','remembranceAnimal'],
]);
const standIds=new Set(['staender-klar','staender-schwarz']);
export function slateAccessoryFits(id,profile){
 if(!standIds.has(id))return true;
 const {shape,width,height}=profile.geometry;
 // Seven rectangular corded blanks have traced edges. Their register group
 // identifies the actual plate shape without changing the cutting contour.
 const rectangular=shape==='rect'||(shape==='contour'&&['RE','QU'].includes(profile.slateCatalogueForm));
 return rectangular&&Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0
  &&Math.max(width,height)<=400&&Math.min(width,height)<=300;
}
export function applySlateCustomerRules(config){
 if(config.profile?.material?.kind!=='slate')return config;
 const c=structuredClone(config);
 c.extraMotifCents=169;c.motifCharge='additional';
 const memorial=memorialThemes.has(c.profile.themeId),motifTheme=memorialThemes.get(c.profile.themeId);
 if(!memorial)c.motifTheme='home';
 else if(motifTheme)c.motifTheme=motifTheme;
 const allowed=id=>!standIds.has(id)||(memorial&&slateAccessoryFits(id,c.profile));
 if(c.profile.optionFields)c.profile.optionFields=c.profile.optionFields.filter(f=>allowed(f.id));
 if(c.slateAccessories)c.slateAccessories.choices=c.slateAccessories.choices.filter(choice=>allowed(choice.fieldId)&&allowed(choice.optionId));
 return c;
}
