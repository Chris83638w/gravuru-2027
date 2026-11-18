import {themedMotifSelection} from './motif-themes.mjs';
export {themedMotifSelection};
export {filterMotifBrowser} from './motif-browser-model.mjs';
// Profiles limit customer choices, never the rendering resources of existing designs.
// Missing/null keeps the native catalog; an explicit empty array offers no new choices.
export function selectionIds(available, selection = null) {
  if (selection !== null && (!Array.isArray(selection) || selection.some(id => typeof id !== 'string'))) {
    throw new TypeError('Ungültige Profilauswahl.');
  }
  const known = new Set(available);
  return [...new Set(selection ?? available)].filter(id => known.has(id));
}

// Chris, 18.11.2026: offer the group plus the original typefaces of the open
// design. Pass the trusted template, never the customer's edited objects or
// the complete product gallery. Missing/null still means the native catalog.
export function designFontSelection(selection = null, design = null) {
  if (selection === null) return null;
  const selected = selectionIds(selection, selection);
  const original = (design?.objects ?? []).filter(o => o.type === 'text' && typeof o.font === 'string').map(o => o.font);
  return [...new Set([...selected, ...original])];
}

// Retain the familiar start font when allowed, otherwise follow the configured
// choice order. No replacement font or choice is invented for an empty list.
export function initialTextFont(available, selection, preferred) {
  const choices = selectionIds(available, selection);
  return choices.includes(preferred) ? preferred : choices[0] ?? null;
}

export function motifChoices(entries, selection = null, excludedKeys = new Set()) {
  const index = new Map();
  for (const entry of entries) if (entry.category !== 'Grundmotive' && !excludedKeys.has(entry.key) && !index.has(entry.key)) index.set(entry.key, entry);
  return selectionIds([...index.keys()], selection).map(id => index.get(id));
}

export function bestsellerChoices(available, fallback, selection = null, {fillTo=0} = {}) {
  // A bestseller cannot re-introduce a motif excluded by the product/category profile.
  const known=available.map(entry => entry.key),keys=selectionIds(known,selection ?? fallback.map(entry => entry.key));
  // Only fill the uncurated starter selection. Explicit lists, including [],
  // remain authoritative; no sales rank or catalogue flag is manufactured.
  if(selection===null)for(const key of known){if(keys.length>=fillTo)break;if(!keys.includes(key))keys.push(key);}
  return keys.map(key => ({key}));
}

export function colorPalettes(fallback, selection = null) {
  if (selection == null) return fallback.map(([name, colors]) => [name, colors.map(color => [...color])]);
  if (!Array.isArray(selection) || selection.some(color => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) {
    throw new TypeError('Ungültige Profilfarbe.');
  }
  const labels = new Map(fallback.flatMap(([, colors]) => colors.map(([label, color]) => [color.toLowerCase(), label])));
  const colors = [...new Set(selection.map(color => color.toLowerCase()))];
  return colors.length ? [['Empfohlene Farben', colors.map(color => [labels.get(color) ?? color.toUpperCase(), color])]] : [];
}

// The existing native starter order is shared with the bounded shop warmup.
export const NATIVE_STARTER_MOTIFS=Object.freeze(['import-b56d5711a75f34c1fa8d9c30','import-8adc51cf09cbad881db95ef6','import-4609f5a437c8a0a9d6c8dca3','import-7435d6dce5e1fa3c4c4fc1b5','import-178f0cc0a5c7c40768ed14cf','import-f46b8d0fcc6e60810ece9d9d','import-e0d730f75c8bea96d661a446','branch']);
export function initialMotifChoices(available,ranked=[],config={}){
 return bestsellerChoices(available,ranked.length?ranked:NATIVE_STARTER_MOTIFS.map(key=>({key})),themedMotifSelection(available,config.motifTheme,config.workshopProfiles?.selections?.bestsellers),{fillTo:ranked.length?0:18});
}
