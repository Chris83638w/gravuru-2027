// Profiles limit customer choices, never the rendering resources of existing designs.
// Missing/null keeps the native catalog; an explicit empty array offers no new choices.
export function selectionIds(available, selection = null) {
  if (selection !== null && (!Array.isArray(selection) || selection.some(id => typeof id !== 'string'))) {
    throw new TypeError('Ungültige Profilauswahl.');
  }
  const known = new Set(available);
  return [...new Set(selection ?? available)].filter(id => known.has(id));
}

export function motifChoices(entries, selection = null, excludedKeys = new Set()) {
  const index = new Map();
  for (const entry of entries) if (!excludedKeys.has(entry.key) && !index.has(entry.key)) index.set(entry.key, entry);
  return selectionIds([...index.keys()], selection).map(id => index.get(id));
}

export function bestsellerChoices(available, fallback, selection = null) {
  // A bestseller cannot re-introduce a motif excluded by the product/category profile.
  return selectionIds(available.map(entry => entry.key), selection ?? fallback.map(entry => entry.key)).map(key => ({key}));
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
