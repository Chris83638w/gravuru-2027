import {materialOverviewHtml} from './review-material-overview.mjs';
import {designReviewMaterial, designReviewCategory, designReviewApprovalKey, resolveDesignReviewTarget} from './design-review-targets.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sizeLabel = mm => mm.map(value => Number((value / 10).toFixed(2))).join(' × ') + ' cm';
const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'de', {numeric: true});
export function reviewThemes(row, category = designReviewCategory(row)) {
  const declared = (row.reviewThemes || []).filter(theme => typeof theme?.key === 'string' && theme.key && typeof theme.label === 'string' && theme.label);
  return [...new Map((declared.length ? declared : [{key: category.topic || category.key, label: category.label.replace(/ (?:ohne Foto|mit Foto|Fotozuordnung offen)$/, '')}]).map(theme => [theme.key, {key: theme.key, label: theme.label}])).values()];
}
export function orderedReviewTargets(row, imported) {
  const steel = designReviewMaterial(row).key === 'steel';
  return (row.targets || []).flatMap(target => {
    const resolved = resolveDesignReviewTarget(row, target, imported);
    return resolved ? [{...resolved, approvalKey: designReviewApprovalKey(row, target.sizeKey)}] : [];
  }).sort((a, b) => steel
    ? a.mm[0] * a.mm[1] - b.mm[0] * b.mm[1] || a.mm[0] - b.mm[0] || a.mm[1] - b.mm[1] || compareText(a.sizeKey, b.sizeKey)
    : Number(b.mm[0] === 300 && b.mm[1] === 200) - Number(a.mm[0] === 300 && a.mm[1] === 200));
}
export function blankPreviewUrl(preview) {
  const parts = typeof preview === 'string' ? preview.split('/') : [];
  if (parts.length !== 3 || parts[0] !== 'originals' || parts[1] !== '_blanks' || !parts[2] || !/\.webp$/i.test(parts[2]) || /[\\\x00-\x1f]/.test(preview) || ['.', '..'].includes(parts[2])) return null;
  return '/originale/files/' + parts.map(encodeURIComponent).join('/');
}

export function slateGalleryHtml(pack, imported, {comments = {}, csrfToken = '', approvals = {}, overviewHtml = '', managementEnabled = false} = {}) {
  const rows = [...pack.originals].sort((a, b) => {
    const am = designReviewMaterial(a), bm = designReviewMaterial(b), ac = designReviewCategory(a), bc = designReviewCategory(b);
    return Number(bm.key === 'slate') - Number(am.key === 'slate') || compareText(am.label, bm.label) || ac.rank - bc.rank || compareText(ac.key, bc.key) || compareText(a.id, b.id);
  });
  const sections = new Map(), materials = new Map(), categories = new Map(), themes = new Map();
  const blanks = pack.blanks || [];
  const materialEntry = material => {
    if (!materials.has(material.key)) materials.set(material.key, {...material, originals: 0, editable: 0, blanks: 0});
    return materials.get(material.key);
  };
  let editable = 0;
  for (const row of rows) {
    const category = designReviewCategory(row), material = designReviewMaterial(row), rowThemes = reviewThemes(row, category);
    const sectionKey = JSON.stringify([material.key, category.key]);
    if (!sections.has(sectionKey)) sections.set(sectionKey, {category, material, cards: []});
    categories.set(category.key, category);
    for (const theme of rowThemes) if (!themes.has(theme.key)) themes.set(theme.key, theme);
    const materialCounts = materialEntry(material);materialCounts.originals++;
    const targets = orderedReviewTargets(row, imported).map(target => ({...target, label: sizeLabel(target.mm),
      preview: approvals[target.approvalKey]?.metadata?.previewUrl || '/api/workshop/products/' + encodeURIComponent(target.productId) + '/preview.svg?' + new URLSearchParams({designId: target.designId}),
      edit: '/originale/editor?' + new URLSearchParams({configuration: target.productId, design: target.designId, originalId:row.id})}));
    if (targets.length) {editable++;materialCounts.editable++;}
    const selected = targets[0];
    const approvalKey = selected?.approvalKey || designReviewApprovalKey(row, row.targets?.[0]?.sizeKey);
    const approval = approvals[approvalKey];
    const approvalStatus = approval?.status || (selected ? 'unreviewed' : 'unavailable');
    const approvalLabel = {approved:'Bestätigt',unreviewed:'Noch nicht freigegeben',changed:'Geändert · erneut prüfen',unavailable:'Aufbereitung offen'}[approvalStatus];
    const process = row.process === 'UV' ? 'UV-Druck' : 'Gravur';
    const comment = comments[row.id] || {text: '', revision: 0};
    const openReasons = [...new Set((row.targets || []).filter(target => target.status !== 'prepared').map(target => sizeLabel(target.mm) + ': ' + (target.reason || 'Aufbereitung offen')))];
    const visualNotes = [...new Set((row.visualReviewIssues || []).map(issue => typeof issue === 'string' ? issue : issue?.message).filter(message => typeof message === 'string' && message))];
    const reason = row.reason || row.error || openReasons.join(' · ') || 'Konfi-Aufbereitung noch offen.';
    const preview = selected
      ? `<div class="preview-link" data-preview-host><button class="inline-open" type="button" data-inline-open aria-label="${esc(row.id)} direkt in der Übersicht verschieben"><img data-preview loading="lazy" src="${esc(selected.preview)}" alt="${esc(row.id)} · Konfi-Vorlage · ${esc(selected.label)}"><span>Direkt verschieben</span></button><div class="inline-stage" data-inline-stage hidden tabindex="0" aria-label="Element auswählen und verschieben; Pfeiltasten bewegen um einen Millimeter"></div></div><div class="inline-controls" data-inline-controls hidden><label>Element<select data-inline-element></select></label><div class="inline-actions"><button class="inline-save" type="button" data-inline-save disabled>Speichern</button><button type="button" data-inline-reset disabled>Zurücksetzen</button><button type="button" data-inline-close>Schließen</button><button type="button" data-inline-reload hidden>Aktuellen Stand laden</button></div></div><p class="inline-status" data-inline-status role="status" aria-live="polite"></p>`
      : `<div class="open"><strong>Konfi-Version noch offen</strong><span>${esc(reason.replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.', 'Diese Druckvorlage muss noch farbgetreu für den Konfi aufbereitet werden.'))}</span></div>`;
    const formats = targets.length > 1
      ? `<label class="format">Format <select data-format aria-label="Format für ${esc(row.id)}">${targets.map((target, index) => `<option value="${index}" data-approval-key="${esc(target.approvalKey)}" data-preview="${esc(target.preview)}" data-edit="${esc(target.edit)}" data-product-id="${esc(target.productId)}" data-design-id="${esc(target.designId)}" data-size-key="${esc(target.sizeKey)}">${esc(target.label)}</option>`).join('')}</select></label>`
      : `<span class="format">${selected ? esc(selected.label) : 'Noch nicht bearbeitbar'}</span>`;
    sections.get(sectionKey).cards.push(`<article id="design-${esc(row.id)}" data-design-card ${selected ? `data-product-id="${esc(selected.productId)}" data-design-id="${esc(selected.designId)}"` : ''} data-original-id="${esc(row.id)}" data-material="${esc(material.key)}" data-themes="${esc(JSON.stringify(rowThemes.map(theme => theme.key)))}" data-approval-key="${esc(approvalKey)}" data-approval-status="${esc(approvalStatus)}" data-search="${esc([row.id, row.group, row.subcategory, material.label, category.label, ...rowThemes.map(theme => theme.label), process].join(' ').toLowerCase())}" data-category="${esc(category.key)}" data-process="${process}">
      <div class="card-heading"><h3>${esc(row.id)}</h3><span class="badge${row.process === 'UV' ? ' print' : ''}">${esc(material.label)} · ${process}</span></div>
      ${preview}<div class="card-tools">${formats}${selected ? `<a class="edit" data-edit-link href="${esc(selected.edit)}">Bearbeiten</a>` : ''}</div>
      ${selected && openReasons.length ? `<p class="note">${esc(openReasons.join(' · '))}</p>` : ''}
      ${visualNotes.length ? `<p class="note review-source-note">${esc(visualNotes.join(' · '))}</p>` : ''}
      <div class="design-approval"><label><input type="checkbox" data-approval-check ${approvalStatus === 'approved' ? 'checked ' : ''}disabled>Für dieses Format freigeben</label><span data-approval-status-label>${esc(approvalLabel)}</span><small data-approval-progress></small><p data-approval-message role="status" aria-live="polite"></p></div>
      <form class="comment-form" data-comment-form data-design-id="${esc(row.id)}" data-revision="${comment.revision}">
        <label for="comment-${esc(row.id)}">Kommentar zu ${esc(row.id)}</label>
        <textarea id="comment-${esc(row.id)}" rows="2" maxlength="10000" placeholder="Dein Hinweis – bei Bedarf mit Größe …">\n${esc(comment.text)}</textarea>
        <div class="comment-actions"><button type="submit" disabled>Kommentar speichern</button><span role="status" aria-live="polite">${comment.revision ? 'Gespeichert' : 'Noch kein Kommentar'}</span></div>
      </form></article>`);
  }
  const blankForms = [...new Set(blanks.map(blank => blank.form))].sort(compareText);
  const blankCards = [...blanks].sort((a, b) => compareText(a.materialLabel, b.materialLabel) || compareText(a.form, b.form) || a.mm[0] * a.mm[1] - b.mm[0] * b.mm[1] || compareText(a.key, b.key)).map(blank => {
    materialEntry({key: blank.materialKey, label: blank.materialLabel}).blanks++;
    const image = blankPreviewUrl(blank.preview);
    return `<article class="blank-card" data-blank-card data-material="${esc(blank.materialKey)}" data-form="${esc(blank.form)}" data-search="${esc([blank.key, blank.materialLabel, blank.form, blank.label, sizeLabel(blank.mm)].join(' ').toLowerCase())}"><div class="card-heading"><h3>${esc(blank.label)}</h3><span class="badge">${esc(blank.materialLabel)}</span></div>${image ? `<img loading="lazy" src="${esc(image)}" alt="${esc(blank.label)} · ${esc(sizeLabel(blank.mm))} · Rohling ohne Gestaltung">` : '<p class="open">Rohling-Vorschau noch offen.</p>'}<p class="blank-caption">${esc(blank.form)} · ${esc(sizeLabel(blank.mm))}</p><small>${esc(blank.key)}</small></article>`;
  }).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="slate-review-csrf" content="${esc(csrfToken)}"><title>Katalog · Vorlagen prüfen und bearbeiten</title><link rel="stylesheet" href="/originale/gallery.css"></head><body>
    <header><p class="eyebrow">DEINE KATALOGVORLAGEN</p><h1>Vorlagen prüfen & bearbeiten</h1><p>${rows.length} Vorlagen · ${editable} bearbeitbar${blanks.length ? ` · ${blanks.length} Rohlinge` : ''}. Pro Karte siehst du eine Konfi-Version.</p><p class="help">„Direkt verschieben“ aktiviert die Vorlage in dieser Karte: Text oder Motiv ziehen und hier speichern. „Bearbeiten“ öffnet den Werkstatteditor mit weiteren Funktionen. Mit dem Häkchen bestätigst du den gespeicherten Stand für das angezeigte Material und Format. Nach einer Änderung muss die Vorlage erneut geprüft werden.</p></header>
    ${managementEnabled?'<nav aria-label="Galerieverwaltung"><a href="/originale/verwaltung">Produktgruppen &amp; Synchronisierung öffnen →</a></nav>':''}
    ${materialOverviewHtml({activeMaterials: [...materials.values()]})}
    <div id="review-overview">${overviewHtml}</div>
    <div class="filters"><label class="search">Suchen<input id="search" type="search" placeholder="Designnummer, Thema oder Rohling …"></label><label>Ansicht<select id="view"><option value="designs">Vorlagen</option>${blanks.length ? '<option value="blanks">Rohlinge</option><option value="all">Vorlagen und Rohlinge</option>' : ''}</select></label><label>Material<select id="material"><option value="">Alle Materialien</option>${[...materials.values()].map(material => `<option value="${esc(material.key)}">${esc(material.label)}</option>`).join('')}</select></label><label>Thema<select id="theme"><option value="">Alle Themen</option>${[...themes.values()].sort((a, b) => compareText(a.label, b.label)).map(theme => `<option value="${esc(theme.key)}">${esc(theme.label)}</option>`).join('')}</select></label><label>Vorlagengruppe<select id="category"><option value="">Alle Gruppen</option>${[...categories.values()].map(category => `<option value="${esc(category.key)}">${esc(category.label)}</option>`).join('')}</select></label><label id="blank-form-filter" hidden>Form<select id="blank-form"><option value="">Alle Formen</option>${blankForms.map(form => `<option value="${esc(form)}">${esc(form)}</option>`).join('')}</select></label><label>Verfahren<select id="process"><option value="">Gravur und Druck</option><option>Gravur</option><option>UV-Druck</option></select></label><label>Freigabe · gewähltes Format<select id="approval-filter"><option value="">Alle</option><option value="unreviewed">Noch nicht freigegeben</option><option value="approved">Bestätigt</option><option value="changed">Erneut prüfen</option><option value="unavailable">Aufbereitung offen</option></select></label><span id="count" role="status" aria-live="polite">${rows.length} Vorlagen</span></div>
    <main>${[...sections.values()].map(({category, material, cards}) => `<section data-category-section="${esc(category.key)}" data-material-section="${esc(material.key)}"><h2>${esc(category.label)} <span>${esc(material.label)}</span><span data-section-count>${cards.length}</span></h2><div class="card-grid">${cards.join('')}</div></section>`).join('')}${blanks.length ? `<section id="blank-gallery" hidden><h2>Rohlinge <span data-blank-count>${blanks.length}</span></h2><p class="help">Originale Grundplatten ohne Gestaltung. Wähle Material und Form für die Übersicht.</p><div class="card-grid">${blankCards}</div></section>` : ''}<p id="no-results" hidden>Keine Vorlage oder kein Rohling passt zu dieser Auswahl.</p></main>
    <footer>Die Freigabe bestätigt deine Gestaltung. Sie veröffentlicht keine Shop-Produkte. Kommentare bleiben unabhängig davon gespeichert.</footer>
    <script id="review-approval-data" type="application/json">${JSON.stringify(approvals).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>
    <script type="module" src="/originale/gallery.js"></script><script type="module" src="/originale/comments.js"></script></body></html>`;
}
