import {materialOverviewHtml} from './review-material-overview.mjs';
import {designReviewMaterial, designReviewMaterials, designReviewCategory, designReviewApprovalKey, resolveDesignReviewTarget} from './design-review-targets.mjs';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sizeLabel = mm => mm.map(value => Number((value / 10).toFixed(2))).join(' × ') + ' cm';
const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'de', {numeric: true});
export function reviewThemes(row, category = designReviewCategory(row)) {
  const declared = (row.reviewThemes || []).filter(theme => typeof theme?.key === 'string' && theme.key && typeof theme.label === 'string' && theme.label);
  return [...new Map((declared.length ? declared : [{key: category.topic || category.key, label: category.label.replace(/ (?:ohne Foto|mit Foto|Fotozuordnung offen)$/, '')}]).map(theme => [theme.key, {key: theme.key, label: theme.label}])).values()];
}
export function orderedReviewTargets(row, imported) {
  const primary = designReviewMaterial(row).key;
  return (row.targets || []).flatMap(target => {
    const resolved = resolveDesignReviewTarget(row, target, imported);
    return resolved ? [{...resolved, approvalKey: designReviewApprovalKey(row, target.sizeKey, target)}] : [];
  }).sort((a, b) => Number(b.material.key === primary) - Number(a.material.key === primary) || compareText(a.material.label, b.material.label) ||
    (a.material.key === 'slate'
      ? Number(b.mm[0] === 300 && b.mm[1] === 200) - Number(a.mm[0] === 300 && a.mm[1] === 200)
      : a.mm[0] * a.mm[1] - b.mm[0] * b.mm[1] || a.mm[0] - b.mm[0] || a.mm[1] - b.mm[1] || compareText(a.sizeKey, b.sizeKey)));
}
export function blankPreviewUrl(preview) {
  const parts = typeof preview === 'string' ? preview.split('/') : [];
  if (parts.length !== 3 || parts[0] !== 'originals' || parts[1] !== '_blanks' || !parts[2] || !/\.webp$/i.test(parts[2]) || /[\\\x00-\x1f]/.test(preview) || ['.', '..'].includes(parts[2])) return null;
  return '/originale/files/' + parts.map(encodeURIComponent).join('/');
}

export function slateGalleryHtml(pack, imported, {comments = {}, csrfToken = '', approvals = {}, overviewHtml = '', managementEnabled = false} = {}) {
  const rows = [...pack.originals].sort((a, b) => {
    const am = designReviewMaterial(a), bm = designReviewMaterial(b), ac = designReviewCategory(a), bc = designReviewCategory(b);
    return Number(bm.key === 'slate') - Number(am.key === 'slate') ||
      (Number.isFinite(a.reviewOrder) && Number.isFinite(b.reviewOrder) ? a.reviewOrder - b.reviewOrder : 0) ||
      compareText(am.label, bm.label) || ac.rank - bc.rank || compareText(ac.key, bc.key) || compareText(a.id, b.id);
  });
  const sections = new Map(), materials = new Map(), categories = new Map(), themes = new Map();
  const blanks = pack.blanks || [];
  const materialEntry = material => {
    if (!materials.has(material.key)) materials.set(material.key, {...material, originals: 0, editable: 0, blanks: 0});
    return materials.get(material.key);
  };
  let editable = 0;
  for (const row of rows) {
    const category = designReviewCategory(row), material = designReviewMaterial(row), rowMaterials = designReviewMaterials(row), rowThemes = reviewThemes(row, category);
    const multipleMaterials = rowMaterials.length > 1;
    const sectionKey = JSON.stringify([material.key, category.key]);
    if (!sections.has(sectionKey)) sections.set(sectionKey, {category, material, materials: new Map(), cards: []});
    for (const item of rowMaterials) sections.get(sectionKey).materials.set(item.key, item);
    categories.set(category.key, category);
    for (const theme of rowThemes) if (!themes.has(theme.key)) themes.set(theme.key, theme);
    for (const item of rowMaterials) materialEntry(item).originals++;
    const targets = orderedReviewTargets(row, imported).map(target => ({...target, label: (multipleMaterials ? (target.familyLabel || target.material.label) + ' · ' : '') + sizeLabel(target.mm),
      preview: approvals[target.approvalKey]?.metadata?.previewUrl || '/api/workshop/products/' + encodeURIComponent(target.productId) + '/preview.svg?' + new URLSearchParams({designId: target.designId}),
      edit: '/originale/editor?' + new URLSearchParams({configuration: target.productId, design: target.designId, originalId:row.id})}));
    if (targets.length) editable++;
    for (const key of new Set(targets.map(target => target.material.key))) materials.get(key).editable++;
    const openTargets = multipleMaterials ? (row.targets || []).filter(target => target.status !== 'prepared').map(target => ({...target,
      material: designReviewMaterial(row, target), approvalKey: designReviewApprovalKey(row, target.sizeKey, target),
      label: (target.familyLabel || designReviewMaterial(row, target).label) + ' · ' + sizeLabel(target.mm) + ' · Aufbereitung offen'})) : [];
    const choices = [...targets, ...openTargets];
    const selected = targets[0];
    const selectedMaterial = selected?.material || material;
    const approvalKey = selected?.approvalKey || designReviewApprovalKey(row, row.targets?.[0]?.sizeKey, row.targets?.[0]);
    const approval = approvals[approvalKey];
    const approvalStatus = approval?.status || (selected ? 'unreviewed' : 'unavailable');
    const approvalLabel = {approved:'Bestätigt',unreviewed:'Noch nicht freigegeben',changed:'Geändert · erneut prüfen',unavailable:'Aufbereitung offen'}[approvalStatus];
    const process = row.process === 'UV' ? 'UV-Druck' : 'Gravur';
    const comment = comments[row.id] || {text: '', revision: 0};
    const openReasons = [...new Set((row.targets || []).filter(target => target.status !== 'prepared').map(target => (multipleMaterials ? designReviewMaterial(row, target).label + ' · ' : '') + sizeLabel(target.mm) + ': ' + (target.reason || 'Aufbereitung offen')))];
    const visualNotes = [...new Set([...(row.visualReviewIssues || []), ...(row.targets || []).flatMap(target => target.visualReviewIssues || [])].map(issue => typeof issue === 'string' ? issue : issue?.message).filter(message => typeof message === 'string' && message))];
    const fitNotes = [...new Set((row.targets || []).filter(target => target.fit?.status === 'prüfen').map(target =>
      designReviewMaterial(row, target).label + ' · ' + sizeLabel(target.mm) + ': ' + (target.fit.issues?.join(' · ') || 'Darstellung bitte prüfen.')))];
    const reason = row.reason || row.error || openReasons.join(' · ') || 'Konfi-Aufbereitung noch offen.';
    const preview = selected
      ? `<div class="preview-link" data-preview-host><button class="inline-open" type="button" data-inline-open aria-label="${esc(row.id)} direkt in der Übersicht bearbeiten"><img data-preview loading="lazy" src="${esc(selected.preview)}" alt="${esc(row.id)} · Konfi-Vorlage · ${esc(selected.label)}"><span>Zum Bearbeiten anklicken</span></button><div class="inline-stage" data-inline-stage hidden tabindex="0" aria-label="Element auswählen, verschieben und Größe ändern; Pfeiltasten bewegen um einen Millimeter; Plus und Minus ändern die Größe"></div></div><div class="inline-controls" data-inline-controls hidden><div class="inline-caption"><strong>Schnellbearbeitung</strong><span>Direkt auf dieser Karte</span></div><label>Text, Motiv oder Foto auswählen<select data-inline-element></select></label><div class="inline-nudges" role="group" aria-label="Ausgewähltes Element um 1 mm verschieben"><span>Je 1 mm</span><button type="button" data-inline-nudge="left" aria-label="1 mm nach links">Links</button><button type="button" data-inline-nudge="right" aria-label="1 mm nach rechts">Rechts</button><button type="button" data-inline-nudge="up" aria-label="1 mm nach oben">Hoch</button><button type="button" data-inline-nudge="down" aria-label="1 mm nach unten">Runter</button></div><div class="inline-sizes" role="group" aria-label="Ausgewähltes Element proportional vergrößern oder verkleinern"><button type="button" data-inline-resize="smaller" aria-label="Um 10 Prozent verkleinern">− Kleiner</button><button type="button" data-inline-resize="larger" aria-label="Um 10 Prozent vergrößern">+ Größer</button><label>Größe (%)<input type="number" inputmode="decimal" step="1" value="100" data-inline-scale aria-label="Größe in Prozent des geladenen Stands; 100 setzt die Größe zurück"></label><output data-inline-dimensions aria-live="polite"></output></div><div class="inline-actions"><button class="inline-save" type="button" data-inline-save disabled>Änderungen speichern</button><button type="button" data-inline-reset disabled>Änderungen zurücksetzen</button><button type="button" data-inline-close>Fertig</button><button type="button" data-inline-reload hidden>Aktuellen Stand laden</button></div></div><p class="inline-status" data-inline-status role="status" aria-live="polite"></p>`
      : `<div class="open"><strong>Konfi-Version noch offen</strong><span>${esc(reason.replace('UV source is incomplete; editable original print layers cannot be reconstructed exactly.', 'Diese Druckvorlage muss noch farbgetreu für den Konfi aufbereitet werden.'))}</span></div>`;
    const formats = choices.length > 1
      ? `<label class="format">${multipleMaterials ? 'Material / Format' : 'Format'} <select data-format aria-label="${multipleMaterials ? 'Material und Format' : 'Format'} für ${esc(row.id)}">${choices.map((target, index) => `<option value="${index}" data-approval-key="${esc(target.approvalKey)}" data-preview="${esc(target.preview)}" data-edit="${esc(target.edit)}" data-product-id="${esc(target.productId)}" data-design-id="${esc(target.designId)}" data-size-key="${esc(target.sizeKey)}" data-material="${esc(target.material.key)}" data-material-label="${esc(target.material.label)}" data-mm="${esc(target.mm.join('x'))}"${!target.productId ? ` data-open-reason="${esc(target.reason || 'Konfi-Aufbereitung noch offen.')}"` : ''}>${esc(target.label)}</option>`).join('')}</select></label>`
      : `<span class="format">${selected ? esc(selected.label) : 'Noch nicht bearbeitbar'}</span>`;
    sections.get(sectionKey).cards.push(`<article id="design-${esc(row.id)}" data-design-card ${selected ? `data-product-id="${esc(selected.productId)}" data-design-id="${esc(selected.designId)}"` : ''} data-original-id="${esc(row.id)}" data-material="${esc(selectedMaterial.key)}" data-materials="${esc(JSON.stringify(rowMaterials.map(item => item.key)))}" data-themes="${esc(JSON.stringify(rowThemes.map(theme => theme.key)))}" data-approval-key="${esc(approvalKey)}" data-approval-status="${esc(approvalStatus)}" data-search="${esc([row.id, row.group, row.subcategory, ...rowMaterials.map(item => item.label), category.label, ...rowThemes.map(theme => theme.label), process].join(' ').toLowerCase())}" data-category="${esc(category.key)}" data-process="${process}">
      <div class="card-heading"><h3>${esc(row.id)}</h3><span data-material-badge class="badge${row.process === 'UV' ? ' print' : ''}">${esc(selectedMaterial.label)} · ${process}</span></div>
      <div data-native-preview>${preview}</div>${openTargets.length ? '<div class="open" data-open-preview hidden><strong>Konfi-Version noch offen</strong><span data-open-reason></span></div>' : ''}<div class="card-tools">${formats}${selected ? `<div class="card-edit-actions"><button class="quick-edit-start" type="button" data-inline-start aria-label="${esc(row.id)} schnell bearbeiten">Schnell bearbeiten</button><a class="edit" data-edit-link href="${esc(selected.edit)}">Im Konfi bearbeiten</a></div><p class="card-edit-help">Position und Größe direkt hier · Text, Schrift und Fotoaustausch im Konfi</p>` : ''}</div>
      ${selected && openReasons.length ? `<p class="note">${esc(openReasons.join(' · '))}</p>` : ''}
      ${visualNotes.length ? `<p class="note review-source-note">${esc(visualNotes.join(' · '))}</p>` : ''}
      ${fitNotes.length ? `<details class="note review-fit-notes"><summary>Darstellung prüfen · ${fitNotes.length} Material-/Format-Hinweise</summary><ul>${fitNotes.map(note => `<li>${esc(note)}</li>`).join('')}</ul></details>` : ''}
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
    <header><p class="eyebrow">DEINE KATALOGVORLAGEN</p><h1>Vorlagen prüfen & bearbeiten</h1><p>${rows.length} Vorlagen · ${editable} bearbeitbar${blanks.length ? ` · ${blanks.length} Rohlinge` : ''}</p><p class="help">Schnell bearbeiten: Text oder Motiv auf der Karte verschieben und speichern. Für alle Funktionen öffnest du den Konfi.</p></header>
    <nav class="gallery-nav" aria-label="Galeriebereiche"><div class="view-switch" role="group" aria-label="Ansicht"><button type="button" data-view-nav="designs" aria-pressed="true">Vorlagen</button>${blanks.length ? '<button type="button" data-view-nav="blanks" aria-pressed="false">Rohlinge</button><button type="button" data-view-nav="all" aria-pressed="false">Alles</button>' : ''}</div><a href="#review-overview" data-overview-link>Freigaben &amp; Fortschritt</a>${managementEnabled?'<a class="management-link" href="/originale/verwaltung" data-gallery-leave>Verwaltung</a>':''}</nav>
    <div class="gallery-summaries"><div id="material-overview">${materialOverviewHtml({activeMaterials: [...materials.values()]})}</div><div id="review-overview">${overviewHtml}</div></div>
    <div class="filters" aria-label="Vorlagen filtern"><select id="view" aria-label="Ansicht" hidden><option value="designs">Vorlagen</option>${blanks.length ? '<option value="blanks">Rohlinge</option><option value="all">Vorlagen und Rohlinge</option>' : ''}</select><div class="filter-primary"><label class="search">Suchen<input id="search" type="search" placeholder="Designnummer oder Thema …"></label><label>Material<select id="material"><option value="">Alle Materialien</option>${[...materials.values()].map(material => `<option value="${esc(material.key)}">${esc(material.label)}</option>`).join('')}</select></label><label data-design-filter>Thema<select id="theme"><option value="">Alle Themen</option>${[...themes.values()].sort((a, b) => compareText(a.label, b.label)).map(theme => `<option value="${esc(theme.key)}">${esc(theme.label)}</option>`).join('')}</select></label><label id="blank-form-filter" hidden>Form<select id="blank-form"><option value="">Alle Formen</option>${blankForms.map(form => `<option value="${esc(form)}">${esc(form)}</option>`).join('')}</select></label><label data-design-filter>Prüfstatus<select id="approval-filter"><option value="">Alle</option><option value="unreviewed">Noch nicht freigegeben</option><option value="approved">Bestätigt</option><option value="changed">Erneut prüfen</option><option value="unavailable">Aufbereitung offen</option></select></label></div><div class="filter-secondary"><details id="more-filters"><summary>Weitere Filter<span data-filter-count></span></summary><div class="filter-extra"><label data-design-filter>Vorlagengruppe<select id="category"><option value="">Alle Gruppen</option>${[...categories.values()].map(category => `<option value="${esc(category.key)}">${esc(category.label)}</option>`).join('')}</select></label><label data-design-filter>Verfahren<select id="process"><option value="">Gravur und Druck</option><option>Gravur</option><option>UV-Druck</option></select></label></div></details><button class="reset-filters" type="button" data-reset-filters>Filter zurücksetzen</button><span id="count" role="status" aria-live="polite">${rows.length} Vorlagen</span></div></div>
    <div class="bulk-approval"><button type="button" data-approval-bulk disabled>Gefilterte Vorlagen freigeben</button><p>Vorher werden Anzahl, Material und Format angezeigt. Es zählen nur vollständig geladene, gespeicherte Vorlagen im gewählten Filter.</p><p data-approval-bulk-status role="status" aria-live="polite"></p><div class="bulk-approval-confirmation" data-approval-bulk-panel hidden tabindex="-1" role="region" aria-labelledby="bulk-approval-title"><h2 id="bulk-approval-title">Sammelfreigabe prüfen</h2><div data-approval-bulk-summary></div><div class="bulk-approval-actions"><button type="button" data-approval-bulk-confirm disabled>Jetzt Vorlagen freigeben</button><button type="button" class="bulk-approval-cancel" data-approval-bulk-cancel>Abbrechen</button></div></div></div>
    <main id="gallery-results">${[...sections.values()].map(({category, material, materials, cards}) => `<section data-category-section="${esc(category.key)}" data-material-section="${esc(material.key)}"><h2>${esc(category.label)} <span>${esc([...materials.values()].map(item => item.label).join(' / '))}</span><span data-section-count>${cards.length}</span></h2><div class="card-grid">${cards.join('')}</div></section>`).join('')}${blanks.length ? `<section id="blank-gallery" hidden><h2>Rohlinge <span data-blank-count>${blanks.length}</span></h2><p class="help">Originale Grundplatten ohne Gestaltung. Wähle Material und Form für die Übersicht.</p><div class="card-grid">${blankCards}</div></section>` : ''}<div id="no-results" hidden><p>Für diese Auswahl gibt es noch keine passenden Vorlagen oder Rohlinge.</p><button type="button" data-reset-filters>Filter zurücksetzen</button></div></main>
    <footer>Die Freigabe bestätigt deine Gestaltung. Sie veröffentlicht keine Shop-Produkte. Kommentare bleiben unabhängig davon gespeichert.</footer>
    <script id="review-approval-data" type="application/json">${JSON.stringify(approvals).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')}</script>
    <script type="module" src="/originale/gallery.js"></script><script type="module" src="/originale/comments.js"></script></body></html>`;
}
