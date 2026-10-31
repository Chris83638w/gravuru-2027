// Transport only: the shop entry is served outside the editor bundle. Never
// import the editor contract here. The receiving editor's
// preserveProductSelection still resolves conditions/defaults and checks every
// supplied value before applying it; the server remains authoritative for price.
export function copyProductSelection(selection,config){
 if(!selection)return null;
 const quantity=Number(selection.quantity),options=selection.options??{};
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>99)throw Error('Bitte eine Menge zwischen 1 und 99 wählen.');
 if(!options||typeof options!=='object'||Array.isArray(options))throw Error('Ungültige Optionen.');
 const groups=config.profile.optionGroups||[],fields=config.profile.optionFields||[];
 for(const [key,value] of Object.entries(options)){
  const group=groups.find(g=>g.id===key),field=fields.find(f=>f.id===key);
  if(!group&&!field)throw Error('Unbekannte Optionsgruppe.');
  if(group&&!group.values.some(v=>v.id===value))throw Error('Die gewählte Ausführung ist bei diesem Design nicht verfügbar. Deine bisherige Gestaltung bleibt erhalten.');
 }
 // Do not fill defaults or silently drop a choice from another product.
 return {options:structuredClone(options),quantity};
}
