// Mikail, 04.11.2026: added motifs cost 1.69 EUR; acrylic stands are
// exclusive to memorial plaques, except 60 x 30 cm. Catalogue base prices,
// mounting geometry and original artwork remain the source of truth.
export function applySlateCustomerRules(config){
 if(config.profile?.material?.kind!=='slate')return config;
 const c=structuredClone(config),g=c.profile.geometry;
 c.extraMotifCents=169;c.motifCharge='additional';
 if(c.profile.themeId!=='gedenken')c.motifTheme='home';
 const large=(g.width===600&&g.height===300)||(g.width===300&&g.height===600);
 const standsAllowed=c.profile.themeId==='gedenken'&&!large;
 if(!standsAllowed){
  const stands=new Set(['staender-klar','staender-schwarz']);
  if(c.profile.optionFields)c.profile.optionFields=c.profile.optionFields.filter(f=>!stands.has(f.id));
  if(c.slateAccessories)c.slateAccessories.choices=c.slateAccessories.choices.filter(choice=>!stands.has(choice.fieldId)&&!stands.has(choice.optionId));
 }
 return c;
}
