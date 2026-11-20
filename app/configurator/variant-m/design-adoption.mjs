// Auftrag #265 (Chris, 20.11.2026), Weg A: schnelle Variante-C-Technik im Prio R15.
// Ein Türschild-Konfi mit allen Größen lädt nur sein Startdesign. Für jedes weitere Design
// liefert der Server über `model?design=` dasselbe Produkt im selben Produktstand, nur mit
// den Vorlagen dieses Designs. Zwei solche Modelle unterscheiden sich ausschließlich in
// den Design-Teilen (geprüft am Live-Stand 2bd7bd8e, Edelstahl-Türschild, Stand 4):
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

/** Nimmt die Vorlagen von `designId` aus `source` in `target` auf. Beide sind Modelle
 * desselben Produkts im selben Produktstand. Gibt true zurück, wenn etwas dazukam. */
export function adoptDesignModel(target,source,designId){
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
 if(!plan.length&&!familyDesigns.length&&!profileDesigns.length&&!newRights.length)return false;
 for(const [list,extra] of plan)list.push(...extra);
 a.designs.push(...familyDesigns.map(copy));target.profile.designs.push(...profileDesigns.map(copy));
 if(newRights.length){target.workshopElementRights??={};for(const [id,value] of newRights)target.workshopElementRights[id]=copy(value);}
 return true;
}
