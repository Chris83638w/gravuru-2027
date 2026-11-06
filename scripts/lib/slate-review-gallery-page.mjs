import {slateReviewCategory, sortSlateReviewRows} from './slate-review-catalog.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sizeLabel = mm => mm.map(value => Number((value / 10).toFixed(2))).join(' × ') + ' cm';

export function slateGalleryHtml(pack, imported, {comments = {}, csrfToken = ''} = {}) {
  const rows = sortSlateReviewRows(pack.originals);
  const sections = new Map();
  let editable = 0;
  for (const row of rows) {
    const category = slateReviewCategory(row);
    if (!sections.has(category.key)) sections.set(category.key, {category, cards: []});
    const targets = (row.targets || []).flatMap(target => {
      const product = target.status === 'prepared' && imported.products.find(product => product.key.startsWith(target.sizeKey + ':') && product.designIds.includes(row.id));
      if (!product) return [];
      const design = 'katalog-' + row.id;
      return [{label: sizeLabel(target.mm), preferred: target.mm[0] === 300 && target.mm[1] === 200,
        preview: '/api/workshop/products/' + encodeURIComponent(product.productId) + '/preview.svg?' + new URLSearchParams({designId: design}),
        edit: '/werkstatt/?' + new URLSearchParams({configuration: product.productId, design, reviewGallery: '1', reviewQuick: '1'})}];
    }).sort((a, b) => Number(b.preferred) - Number(a.preferred));
    if (targets.length) editable++;
    const selected = targets[0];
    const process = row.process === 'UV' ? 'UV-Druck' : 'Gravur';
    const comment = comments[row.id] || {text: '', revision: 0};
    const openReasons = [...new Set((row.targets || []).filter(target => target.status !== 'prepared').map(target => sizeLabel(target.mm) + ': ' + (target.reason || 'Aufbereitung offen')))];
    const reason = row.reason || row.error || openReasons.join(' · ') || 'Konfi-Aufbereitung noch offen.';
    const preview = selected
      ? `<a class="preview-link" data-edit-link href="${esc(selected.edit)}"><img data-preview loading="lazy" src="${esc(selected.preview)}" alt="${esc(row.id)} · Konfi-Vorlage · ${esc(selected.label)}"></a>`
      : `<div class="open"><strong>Konfi-Version noch offen</strong><span>${esc(reason.replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.', 'Diese Druckvorlage muss noch farbgetreu für den Konfi aufbereitet werden.'))}</span></div>`;
    const formats = targets.length > 1
      ? `<label class="format">Format <select data-format aria-label="Format für ${esc(row.id)}">${targets.map((target, index) => `<option value="${index}" data-preview="${esc(target.preview)}" data-edit="${esc(target.edit)}">${esc(target.label)}</option>`).join('')}</select></label>`
      : `<span class="format">${selected ? esc(selected.label) : 'Noch nicht bearbeitbar'}</span>`;
    sections.get(category.key).cards.push(`<article id="design-${esc(row.id)}" data-design-card data-search="${esc([row.id, row.group, row.subcategory, category.label, process].join(' ').toLowerCase())}" data-category="${esc(category.key)}" data-process="${process}">
      <div class="card-heading"><h3>${esc(row.id)}</h3><span class="badge${row.process === 'UV' ? ' print' : ''}">${process}</span></div>
      ${preview}<div class="card-tools">${formats}${selected ? `<a class="edit" data-edit-link href="${esc(selected.edit)}">Verschieben & bearbeiten</a>` : ''}</div>
      ${selected && openReasons.length ? `<p class="note">${esc(openReasons.join(' · '))}</p>` : ''}
      <form class="comment-form" data-comment-form data-design-id="${esc(row.id)}" data-revision="${comment.revision}">
        <label for="comment-${esc(row.id)}">Kommentar zu ${esc(row.id)}</label>
        <textarea id="comment-${esc(row.id)}" rows="2" maxlength="10000" placeholder="Dein Hinweis – bei Bedarf mit Größe …">\n${esc(comment.text)}</textarea>
        <div class="comment-actions"><button type="submit" disabled>Kommentar speichern</button><span role="status" aria-live="polite">${comment.revision ? 'Gespeichert' : 'Noch kein Kommentar'}</span></div>
      </form></article>`);
  }
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="slate-review-csrf" content="${esc(csrfToken)}"><title>Schiefer · Vorlagen prüfen und bearbeiten</title><link rel="stylesheet" href="/originale/gallery.css"></head><body>
    <header><p class="eyebrow">SCHIEFER · DEINE KATALOGVORLAGEN</p><h1>Vorlagen prüfen & bearbeiten</h1><p>${rows.length} Vorlagen · ${editable} bearbeitbar. Pro Karte siehst du eine Konfi-Version.</p><p class="help">Zum Korrigieren „Verschieben & bearbeiten“ öffnen, das Element an die richtige Stelle ziehen und „Speichern & zurück“ wählen. Änderungen gelten für das gewählte Format. Dein OK gibst du weiterhin im Chat mit der Designnummer.</p></header>
    <div class="filters"><label class="search">Suchen<input id="search" type="search" placeholder="Designnummer oder Thema …"></label><label>Thema<select id="category"><option value="">Alle Themen</option>${[...sections.values()].map(({category}) => `<option value="${esc(category.key)}">${esc(category.label)}</option>`).join('')}</select></label><label>Verfahren<select id="process"><option value="">Gravur und Druck</option><option>Gravur</option><option>UV-Druck</option></select></label><span id="count" role="status" aria-live="polite">${rows.length} Vorlagen</span></div>
    <main>${[...sections.values()].map(({category, cards}) => `<section data-category-section="${esc(category.key)}"><h2>${esc(category.label)} <span data-section-count>${cards.length}</span></h2><div class="card-grid">${cards.join('')}</div></section>`).join('')}<p id="no-results" hidden>Keine Vorlage passt zu dieser Auswahl.</p></main>
    <footer>Kommentare und Änderungen sind noch keine Bildfreigabe. Diese Prüfseite verändert keine Shop-Produkte.</footer>
    <script type="module" src="/originale/gallery.js"></script><script type="module" src="/originale/comments.js"></script></body></html>`;
}
