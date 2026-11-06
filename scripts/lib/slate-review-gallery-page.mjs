import {slateReviewCategory, sortSlateReviewRows} from './slate-review-catalog.mjs';
import {materialOverviewHtml} from './review-material-overview.mjs';
import {slateReviewApprovalKey} from './slate-review-approval-targets.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sizeLabel = mm => mm.map(value => Number((value / 10).toFixed(2))).join(' × ') + ' cm';

export function slateGalleryHtml(pack, imported, {comments = {}, csrfToken = '', approvals = {}, overviewHtml = ''} = {}) {
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
      const approvalKey = slateReviewApprovalKey(row.id, target.sizeKey);
      return [{label: sizeLabel(target.mm), preferred: target.mm[0] === 300 && target.mm[1] === 200,
        approvalKey, preview: approvals[approvalKey]?.metadata?.previewUrl || '/api/workshop/products/' + encodeURIComponent(product.productId) + '/preview.svg?' + new URLSearchParams({designId: design}),
        productId: product.productId, designId: design,
        edit: '/werkstatt/?' + new URLSearchParams({configuration: product.productId, design, reviewGallery: '1'})}];
    }).sort((a, b) => Number(b.preferred) - Number(a.preferred));
    if (targets.length) editable++;
    const selected = targets[0];
    const approvalKey = selected?.approvalKey || slateReviewApprovalKey(row.id, row.targets?.[0]?.sizeKey);
    const approval = approvals[approvalKey];
    const approvalStatus = approval?.status || (selected ? 'unreviewed' : 'unavailable');
    const approvalLabel = {approved:'Bestätigt',unreviewed:'Noch nicht freigegeben',changed:'Geändert · erneut prüfen',unavailable:'Aufbereitung offen'}[approvalStatus];
    const process = row.process === 'UV' ? 'UV-Druck' : 'Gravur';
    const comment = comments[row.id] || {text: '', revision: 0};
    const openReasons = [...new Set((row.targets || []).filter(target => target.status !== 'prepared').map(target => sizeLabel(target.mm) + ': ' + (target.reason || 'Aufbereitung offen')))];
    const reason = row.reason || row.error || openReasons.join(' · ') || 'Konfi-Aufbereitung noch offen.';
    const preview = selected
      ? `<div class="preview-link" data-preview-host><button class="inline-open" type="button" data-inline-open aria-label="${esc(row.id)} direkt in der Übersicht verschieben"><img data-preview loading="lazy" src="${esc(selected.preview)}" alt="${esc(row.id)} · Konfi-Vorlage · ${esc(selected.label)}"><span>Direkt verschieben</span></button><div class="inline-stage" data-inline-stage hidden tabindex="0" aria-label="Element auswählen und verschieben; Pfeiltasten bewegen um einen Millimeter"></div></div><div class="inline-controls" data-inline-controls hidden><label>Element<select data-inline-element></select></label><div class="inline-actions"><button class="inline-save" type="button" data-inline-save disabled>Speichern</button><button type="button" data-inline-reset disabled>Zurücksetzen</button><button type="button" data-inline-close>Schließen</button><button type="button" data-inline-reload hidden>Aktuellen Stand laden</button></div></div><p class="inline-status" data-inline-status role="status" aria-live="polite"></p>`
      : `<div class="open"><strong>Konfi-Version noch offen</strong><span>${esc(reason.replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.', 'Diese Druckvorlage muss noch farbgetreu für den Konfi aufbereitet werden.'))}</span></div>`;
    const formats = targets.length > 1
      ? `<label class="format">Format <select data-format aria-label="Format für ${esc(row.id)}">${targets.map((target, index) => `<option value="${index}" data-approval-key="${esc(target.approvalKey)}" data-preview="${esc(target.preview)}" data-edit="${esc(target.edit)}" data-product-id="${esc(target.productId)}" data-design-id="${esc(target.designId)}">${esc(target.label)}</option>`).join('')}</select></label>`
      : `<span class="format">${selected ? esc(selected.label) : 'Noch nicht bearbeitbar'}</span>`;
    sections.get(category.key).cards.push(`<article id="design-${esc(row.id)}" data-design-card ${selected ? `data-product-id="${esc(selected.productId)}" data-design-id="${esc(selected.designId)}"` : ''} data-original-id="${esc(row.id)}" data-approval-key="${esc(approvalKey)}" data-approval-status="${esc(approvalStatus)}" data-search="${esc([row.id, row.group, row.subcategory, category.label, process].join(' ').toLowerCase())}" data-category="${esc(category.key)}" data-process="${process}">
      <div class="card-heading"><h3>${esc(row.id)}</h3><span class="badge${row.process === 'UV' ? ' print' : ''}">${process}</span></div>
      ${preview}<div class="card-tools">${formats}${selected ? `<a class="edit" data-edit-link href="${esc(selected.edit)}">Bearbeiten</a>` : ''}</div>
      ${selected && openReasons.length ? `<p class="note">${esc(openReasons.join(' · '))}</p>` : ''}
      <div class="design-approval"><label><input type="checkbox" data-approval-check ${approvalStatus === 'approved' ? 'checked ' : ''}disabled>Für dieses Format freigeben</label><span data-approval-status-label>${esc(approvalLabel)}</span><small data-approval-progress></small><p data-approval-message role="status" aria-live="polite"></p></div>
      <form class="comment-form" data-comment-form data-design-id="${esc(row.id)}" data-revision="${comment.revision}">
        <label for="comment-${esc(row.id)}">Kommentar zu ${esc(row.id)}</label>
        <textarea id="comment-${esc(row.id)}" rows="2" maxlength="10000" placeholder="Dein Hinweis – bei Bedarf mit Größe …">\n${esc(comment.text)}</textarea>
        <div class="comment-actions"><button type="submit" disabled>Kommentar speichern</button><span role="status" aria-live="polite">${comment.revision ? 'Gespeichert' : 'Noch kein Kommentar'}</span></div>
      </form></article>`);
  }
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="slate-review-csrf" content="${esc(csrfToken)}"><title>Schiefer · Vorlagen prüfen und bearbeiten</title><link rel="stylesheet" href="/originale/gallery.css"></head><body>
    <header><p class="eyebrow">SCHIEFER · DEINE KATALOGVORLAGEN</p><h1>Vorlagen prüfen & bearbeiten</h1><p>${rows.length} Vorlagen · ${editable} bearbeitbar. Pro Karte siehst du eine Konfi-Version.</p><p class="help">„Direkt verschieben“ aktiviert die Vorlage in dieser Karte: Text oder Motiv ziehen und hier speichern. „Bearbeiten“ öffnet den Werkstatteditor mit weiteren Funktionen. Mit dem Häkchen bestätigst du den gespeicherten Stand für das angezeigte Material und Format. Nach einer Änderung muss die Vorlage erneut geprüft werden.</p></header>
    ${materialOverviewHtml()}
    <div id="review-overview">${overviewHtml}</div>
    <div class="filters"><label class="search">Suchen<input id="search" type="search" placeholder="Designnummer oder Thema …"></label><label>Thema<select id="category"><option value="">Alle Themen</option>${[...sections.values()].map(({category}) => `<option value="${esc(category.key)}">${esc(category.label)}</option>`).join('')}</select></label><label>Verfahren<select id="process"><option value="">Gravur und Druck</option><option>Gravur</option><option>UV-Druck</option></select></label><label>Freigabe · gewähltes Format<select id="approval-filter"><option value="">Alle</option><option value="unreviewed">Noch nicht freigegeben</option><option value="approved">Bestätigt</option><option value="changed">Erneut prüfen</option><option value="unavailable">Aufbereitung offen</option></select></label><span id="count" role="status" aria-live="polite">${rows.length} Vorlagen</span></div>
    <main>${[...sections.values()].map(({category, cards}) => `<section data-category-section="${esc(category.key)}"><h2>${esc(category.label)} <span data-section-count>${cards.length}</span></h2><div class="card-grid">${cards.join('')}</div></section>`).join('')}<p id="no-results" hidden>Keine Vorlage passt zu dieser Auswahl.</p></main>
    <footer>Die Freigabe bestätigt deine Gestaltung. Sie veröffentlicht keine Shop-Produkte. Kommentare bleiben unabhängig davon gespeichert.</footer>
    <script id="review-approval-data" type="application/json">${JSON.stringify(approvals).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>
    <script type="module" src="/originale/gallery.js"></script><script type="module" src="/originale/comments.js"></script></body></html>`;
}
