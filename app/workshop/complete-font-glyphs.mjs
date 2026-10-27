// Supplement an explicitly identified original face. Existing PDF outlines,
// advances and IDs remain intact; the caller verifies the source font identity.
export function completeFontGlyphs(subset, complete) {
  if (!subset?.regular?.glyphs || !complete?.regular?.glyphs)
    throw Error('Originalschrift und vollständiger Schriftschnitt fehlen.');
  const result = structuredClone(subset);
  let added = 0;
  for (const style of ['regular', 'bold', 'italic', 'boldItalic']) {
    const face = result[style];
    if (!face) continue;
    const source = complete[style];
    if (!source || source.units !== face.units)
      throw Error('Schriftschnitt oder Einheiten stimmen nicht mit der Originalschrift überein.');
    for (const [character, glyph] of Object.entries(face.glyphs)) {
      const original = source.glyphs[character];
      if (/^[A-Za-z0-9]$/.test(character) &&
          (!original || Math.abs(original.a - glyph.a) > .01))
        throw Error('Zeichenbreiten stimmen nicht mit der Originalschrift überein.');
    }
    for (const [character, glyph] of Object.entries(source.glyphs)) {
      if (!Object.hasOwn(face.glyphs, character)) {
        face.glyphs[character] = structuredClone(glyph);
        added++;
      }
    }
  }
  return {font: result, added};
}
