// Selection is scoped to the addressed product; opening a link never changes its default design.
export function linkedEditorDesign(search, productId, designs, fallback) {
  const p = new URLSearchParams(search);
  const requested = p.get('configuration') === productId ? p.get('design') : null;
  return designs.some(d => d.id === requested) ? requested : fallback;
}

export function editorDesignPath(search, productId, designId) {
  const old = new URLSearchParams(search);
  const p = new URLSearchParams({configuration: productId});
  if (designId) p.set('design', designId);
  if (old.get('reviewGallery') === '1') p.set('reviewGallery', '1');
  return '/werkstatt/?' + p;
}
