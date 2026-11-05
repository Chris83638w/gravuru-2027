// Mikail, 04.11.2026: added motifs cost 1.69 EUR; acrylic stands are
// exclusive to memorial plaques, except 60 x 30 cm. Catalogue base prices,
// mounting geometry and original artwork remain the source of truth.
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
export function applySlateCustomerRules(config){
 if(config.profile?.material?.kind!=='slate')return config;
 const c=structuredClone(config),g=c.profile.geometry;
 c.extraMotifCents=169;c.motifCharge='additional';
 const memorial=memorialThemes.has(c.profile.themeId),motifTheme=memorialThemes.get(c.profile.themeId);
 if(!memorial)c.motifTheme='home';
 else if(motifTheme)c.motifTheme=motifTheme;
 const large=(g.width===600&&g.height===300)||(g.width===300&&g.height===600);
 const standsAllowed=memorial&&!large;
 if(!standsAllowed){
  const stands=new Set(['staender-klar','staender-schwarz']);
  if(c.profile.optionFields)c.profile.optionFields=c.profile.optionFields.filter(f=>!stands.has(f.id));
  if(c.slateAccessories)c.slateAccessories.choices=c.slateAccessories.choices.filter(choice=>!stands.has(choice.fieldId)&&!stands.has(choice.optionId));
 }
 return c;
}
