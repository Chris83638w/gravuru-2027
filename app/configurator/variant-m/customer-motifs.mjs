// Customer preview motif list. Rendering flags of imported artwork come from
// the same stored resource as the merchant preview, so steel vector engraving
// looks identical (black) for merchant and customer.
export function customerMotifs(config,motifs,catalog){
 const local=new Map((config.localResources?.motifs||[]).map(m=>[m.key,m]));
 return Object.entries(motifs||{}).map(([key,svgFragment])=>{
  const stored=local.get(key);
  return {key,svgFragment,bounds:catalog?.motif_bounds?.[key]||[0,0,100,100],embeddedOnly:stored?.embeddedOnly===true,...(stored?.artwork?{artwork:stored.artwork}:{}),...(stored?.vectorOnly===true?{vectorOnly:true}:{})};
 });
}
