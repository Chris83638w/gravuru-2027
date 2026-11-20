// Auftrag #265 (Chris, 20.11.2026), Weg A: schnelle Variante-C-Technik im Prio R15.
// Ein Türschild-Konfi mit allen Größen lädt nur sein Startdesign. Für jedes weitere Design
// liefert der Server über `model?design=` dasselbe Produkt im selben Produktstand, nur mit
// den Vorlagen dieses Designs. Zwei solche Modelle unterscheiden sich ausschließlich in
// den Design-Teilen und den von der Werkstatt darin eingebetteten Motivpfaden:
//   profile.designs, familyFormats.designs, familyFormats.formats[].variants[].designIds,
//   workshopElementRights sowie die drei Angaben zum Startdesign.
// Diese Datei vereinigt genau diese Teile im laufenden Editor. Alles andere muss gleich
// sein, sonst wird nichts übernommen und der bisherige Wechsel über den Server greift.
// Preise, Größen, Materialien, Befestigungen und Rechte werden hier nie verändert.
const same=(a,b)=>a===b||JSON.stringify(a)===JSON.stringify(b);
const copy=value=>structuredClone(value);
const refuse=reason=>{throw Object.assign(Error('Dieses Design wird über den bisherigen Weg geladen.'),{code:'design_adoption_refused',reason});};
const FAMILY='gravuru-family-formats/v1';
// Kleine Produktangaben, die in beiden Modellen übereinstimmen müssen.
const FIXED=['quantityTiers','quantityTierScope','productExecution','photo','logo','textRules','workshopProfiles','moduleProfile','customerUI'];

export const canAdoptDesigns=config=>config?.familyFormats?.schema===FAMILY&&Array.isArray(config.familyFormats.formats)&&
 Array.isArray(config.familyFormats.designs)&&Array.isArray(config.profile?.designs)&&typeof config.profile.id==='string';

function additions(present,offered,what){
 const known=new Map(present.map(item=>[item.id,item])),added=[];
 for(const item of offered){
  if(typeof item?.id!=='string')refuse(what+' ohne Kennung');
  if(!known.has(item.id))added.push(item);
  else if(!same(known.get(item.id),item))refuse(what+' weicht ab');
 }
 return added;
}

// Der klassische Einstieg kann auch Medien mit separaten Freigaben und URLs laden.
// Im bestehenden Editor können wir eigenständige, eingebettete Pfade direkt registrieren.
function addedTemplateMotifs(current={},incoming={}){
 for(const key of new Set([...Object.keys(current),...Object.keys(incoming)])){
  if(key!=='motifs'&&!same(current[key],incoming[key]))refuse('Ressource '+key+' weicht ab');
 }
 const known=new Map((current.motifs||[]).map(m=>[m.key,m])),added=[];
 for(const m of incoming.motifs||[]){
  if(known.has(m.key)){
   if(!same(known.get(m.key),m))refuse('Motivkontur weicht ab');
   continue;
  }
  const b=m.bounds,svg=m.svgFragment;
  if(typeof m.key!=='string'||!m.key||m.embeddedOnly!==true||m.artwork||
     !Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[2]<=0||b[3]<=0||
     typeof svg!=='string'||!/^\s*(?:<path\b(?=[^<>]*\sd=["']\s*[mM])[^<>]*\/>\s*)+$/.test(svg)||
     /(?:\b(?:href|style|on\w+)\s*=|url\s*\()/i.test(svg))refuse('Motiv benötigt den vollständigen Einstieg');
  known.set(m.key,m);added.push(m);
 }
 // Der bereits montierte Begrenzungsprüfer hält genau dieses Array fest.
 if(added.length&&!Array.isArray(current.motifs))refuse('Motivregister fehlt');
 return added;
}

/** Prüft den kompletten Wechsel, bevor eine der beiden Modellkopien verändert wird. */
export function planDesignAdoption(target,source,designId){
 if(!canAdoptDesigns(target)||!canAdoptDesigns(source))refuse('kein Produkt mit allen Größen');
 if(typeof designId!=='string'||!source.profile.designs.some(design=>design.id===designId))refuse('Design fehlt im geladenen Modell');
 if(target.profile.id!==source.profile.id)refuse('anderes Profil');
 for(const key of FIXED)if(!same(target[key],source[key]))refuse(key+' weicht ab');
 const a=target.familyFormats,b=source.familyFormats;
 for(const key of ['defaultSize','defaultColor','fixedSize'])if(!same(a[key],b[key]))refuse(key+' weicht ab');
 if(!same(a.colors,b.colors)||a.formats.length!==b.formats.length)refuse('Formate weichen ab');
 // Erst vollständig prüfen und planen, dann schreiben: bei einer Abweichung bleibt `target` unverändert.
 const plan=[];
 for(let i=0;i<a.formats.length;i++){
  const mine=a.formats[i],theirs=b.formats[i];
  if(mine.key!==theirs.key||mine.variants?.length!==theirs.variants?.length)refuse('Format '+i+' weicht ab');
  for(const key of new Set([...Object.keys(mine),...Object.keys(theirs)]))if(key!=='variants'&&!same(mine[key],theirs[key]))refuse('Format '+mine.key+' weicht ab');
  for(let j=0;j<mine.variants.length;j++){
   const v=mine.variants[j],w=theirs.variants[j];
   if(!Array.isArray(v.designIds)||!Array.isArray(w.designIds))refuse('Designzuordnung fehlt');
   // Preis, Material, Befestigungen und Staffeln der Variante müssen übereinstimmen.
   for(const key of new Set([...Object.keys(v),...Object.keys(w)]))if(key!=='designIds'&&!same(v[key],w[key]))refuse('Variante '+mine.key+' weicht ab');
   const extra=w.designIds.filter(id=>!v.designIds.includes(id));
   if(extra.some(id=>typeof id!=='string'))refuse('Designzuordnung ungültig');
   if(extra.length)plan.push([v.designIds,extra]);
  }
 }
 const familyDesigns=additions(a.designs,b.designs,'Formatvorlage'),profileDesigns=additions(target.profile.designs,source.profile.designs,'Vorlage');
 const rights=Object.entries(source.workshopElementRights||{}),newRights=[];
 for(const [id,value] of rights){
  if(target.workshopElementRights&&Object.hasOwn(target.workshopElementRights,id)){if(!same(target.workshopElementRights[id],value))refuse('Rechte weichen ab');}
  else newRights.push([id,value]);
 }
 // Jede zugeordnete Vorlage muss danach vorhanden sein.
 const available=new Set([...a.designs,...familyDesigns].map(design=>design.id));
 for(const [,extra] of plan)if(extra.some(id=>!available.has(id)))refuse('Formatvorlage fehlt');
 const motifs=addedTemplateMotifs(target.localResources,source.localResources);
 return registerMotifs=>{
  if(!plan.length&&!familyDesigns.length&&!profileDesigns.length&&!newRights.length&&!motifs.length)return false;
  if(motifs.length){
   registerMotifs?.(motifs);
   target.localResources.motifs.push(...motifs.map(copy));
  }
  for(const [list,extra] of plan)list.push(...extra);
  a.designs.push(...familyDesigns.map(copy));target.profile.designs.push(...profileDesigns.map(copy));
  if(newRights.length){target.workshopElementRights??={};for(const [id,value] of newRights)target.workshopElementRights[id]=copy(value);}
  return true;
 };
}

/** Nimmt die geprüften Vorlagen in ein einzelnes Modell auf. */
export const adoptDesignModel=(target,source,designId,registerMotifs)=>planDesignAdoption(target,source,designId)(registerMotifs);
