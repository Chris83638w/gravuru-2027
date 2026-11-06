export function reviewDesignMatches(data, filters) {
  let themes = [];
  try { themes = JSON.parse(data.themes || '[]'); } catch {}
  if (!Array.isArray(themes)) themes = [];
  return filters.view !== 'blanks' && String(data.search || '').includes(String(filters.search || '').toLowerCase().trim()) &&
    (!filters.material || data.material === filters.material) && (!filters.theme || themes.includes(filters.theme)) &&
    (!filters.category || data.category === filters.category) && (!filters.process || data.process === filters.process) &&
    (!filters.approval || data.approvalStatus === filters.approval);
}
export function reviewBlankMatches(data, filters) {
  return ['blanks', 'all'].includes(filters.view) && String(data.search || '').includes(String(filters.search || '').toLowerCase().trim()) &&
    (!filters.material || data.material === filters.material) && (!filters.form || data.form === filters.form);
}

// Persist stable native identities, never the ordinal position of a format.
export function savedReturnOption(options, target) {
  if (!target.productId && target.approvalKey) return [...options].find(option => option.dataset.approvalKey === target.approvalKey && !option.dataset.productId);
  return [...options].find(option => option.dataset.productId === target.productId && option.dataset.designId === target.designId && (!option.dataset.sizeKey || option.dataset.sizeKey === target.sizeKey));
}

export function materialOption(options, materialKey, current) {
  const candidates = [...options].filter(option => option.dataset.material === materialKey);
  return candidates.find(option => current?.dataset.mm && option.dataset.mm === current.dataset.mm) || candidates[0];
}

export async function installGalleryPage() {
const [{installInlineReview}, {installApprovalReview}] = await Promise.all([import('./inline.js'), import('./approvals.js')]);

const storageKey = 'gravuru-slate-gallery-v2';
const search = document.querySelector('#search');
const view = document.querySelector('#view');
const material = document.querySelector('#material');
const theme = document.querySelector('#theme');
const category = document.querySelector('#category');
const blankForm = document.querySelector('#blank-form');
const process = document.querySelector('#process');
const approvalFilter = document.querySelector('#approval-filter');
const cards = [...document.querySelectorAll('[data-design-card]')];
const blanks = [...document.querySelectorAll('[data-blank-card]')];
let saved = {};
try { saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch {}
let approvalEditor;
let savedReturnCard=null;
const previousFormats = new WeakMap();
let filtering = false;
const inlineEditor = installInlineReview({cards, onSaved: () => {remember();void approvalEditor?.refresh();}, onVisibilityChange: filter});
approvalEditor = installApprovalReview({cards,onChanged:filter});
function remember() {
  const formats = Object.fromEntries(cards.filter(card => card.querySelector('[data-format]')).map(card => {
    const option = card.querySelector('[data-format]').selectedOptions[0];
    return [card.id, {productId: option.dataset.productId, designId: option.dataset.designId, sizeKey: option.dataset.sizeKey, approvalKey: option.dataset.approvalKey}];
  }));
  try { sessionStorage.setItem(storageKey, JSON.stringify({search: search.value, view: view.value, material: material.value, theme: theme.value, category: category.value, form: blankForm.value, process: process.value, approval: approvalFilter.value, scroll: window.scrollY, formats})); } catch {}
}
function filter() {
  if (filtering) return;
  filtering = true;
  try {
  approvalEditor?.syncControls();
  const filters = {search: search.value, view: view.value, material: material.value, theme: theme.value, category: category.value, form: blankForm.value, process: process.value, approval: approvalFilter.value};
  for (const control of [theme, category, process, approvalFilter]) control.disabled = view.value === 'blanks';
  document.querySelector('#blank-form-filter').hidden = view.value === 'designs';
  let count = 0, blankCount = 0;
  for (const card of cards) {
    const pinned = inlineEditor.keepVisible(card)||card===savedReturnCard;
    // The material filter selects the real native target, never recolours a
    // preview. An unsaved edit or editor return keeps its exact target pinned.
    if (filters.material && card.dataset.material !== filters.material && !pinned) {
      const select = card.querySelector('[data-format]');
      const option = select && materialOption(select.options, filters.material, select.selectedOptions[0]);
      if (option && inlineEditor.beforeFormatChange(card)) {select.value = option.value; updateFormat(card);}
    }
    const matches = reviewDesignMatches(card.dataset, filters);
    card.hidden = !matches && !pinned;
    let note = card.querySelector('[data-inline-filter-note]');
    if (!matches && pinned && !note) { note = document.createElement('p'); note.dataset.inlineFilterNote = ''; note.className = 'inline-filter-note'; note.textContent = 'Deine offene Vorlage bleibt trotz Filter sichtbar. Bitte zuerst speichern oder zurücksetzen.'; card.querySelector('.card-heading').after(note); }
    if(note&&card===savedReturnCard)note.textContent='Die soeben gespeicherte Vorlage bleibt hier sichtbar. Deine Filter sind erhalten.';
    if (note) note.hidden = matches || !pinned;
    if (!card.hidden) count++;
  }
  for (const blank of blanks) { blank.hidden = !reviewBlankMatches(blank.dataset, filters); if (!blank.hidden) blankCount++; }
  for (const section of document.querySelectorAll('[data-category-section]')) {
    const count = section.querySelectorAll('[data-design-card]:not([hidden])').length;
    section.hidden = !count;
    section.querySelector('[data-section-count]').textContent = count;
  }
  const blankGallery = document.querySelector('#blank-gallery');
  if (blankGallery) { blankGallery.hidden = !blankCount; blankGallery.querySelector('[data-blank-count]').textContent = blankCount; }
  document.querySelector('#count').textContent = view.value === 'blanks' && !count ? blankCount + ' Rohlinge' : count + ' Vorlagen' + (view.value === 'designs' ? '' : ' · ' + blankCount + ' Rohlinge');
  document.querySelector('#no-results').hidden = count + blankCount > 0;
  } finally { filtering = false; }
}
function updateFormat(card) {
  const select = card.querySelector('[data-format]');
  const option = select.selectedOptions[0];
  const image = card.querySelector('[data-preview]');
  const unavailable = !option.dataset.productId;
  if (image && !unavailable) {
    image.src = option.dataset.preview;
    image.alt = card.querySelector('h3').textContent + ' · Konfi-Vorlage · ' + option.textContent;
  }
  const nativePreview = card.querySelector('[data-native-preview]'), openPreview = card.querySelector('[data-open-preview]');
  if (nativePreview) nativePreview.hidden = unavailable;
  if (openPreview) {openPreview.hidden = !unavailable; openPreview.querySelector('[data-open-reason]').textContent = option.dataset.openReason || '';}
  card.dataset.productId = option.dataset.productId;
  card.dataset.designId = option.dataset.designId;
  card.dataset.approvalKey = option.dataset.approvalKey;
  if (option.dataset.material) card.dataset.material = option.dataset.material;
  const badge = card.querySelector('[data-material-badge]');
  if (badge && option.dataset.materialLabel) badge.textContent = option.dataset.materialLabel + ' · ' + card.dataset.process;
  previousFormats.set(card, select.value);
  for (const link of card.querySelectorAll('[data-edit-link]')) {link.hidden = unavailable; if (!unavailable) link.href = option.dataset.edit; else link.removeAttribute('href');}
  approvalEditor.formatChanged(card);
}
search.value = saved.search || '';
for (const [control, key] of [[view, 'view'], [material, 'material'], [theme, 'theme'], [blankForm, 'form']]) {
  if ([...control.options].some(option => option.value === saved[key])) control.value = saved[key];
}
if ([...category.options].some(option => option.value === saved.category)) category.value = saved.category;
if ([...process.options].some(option => option.value === saved.process)) process.value = saved.process;
if ([...approvalFilter.options].some(option => option.value === saved.approval)) approvalFilter.value = saved.approval;
for (const card of cards) {
  const select = card.querySelector('[data-format]');
  if (select) {
    const value = saved.formats?.[card.id];
    const restored = value && typeof value === 'object' ? savedReturnOption(select.options, value) : [...select.options].find(option => option.value === value);
    if (restored) { select.value = restored.value; updateFormat(card); }
    previousFormats.set(card, select.value);
    select.addEventListener('change', () => {
      if (!inlineEditor.beforeFormatChange(card)) { select.value = previousFormats.get(card); return; }
      const chosen = select.selectedOptions[0];
      if (material.value && chosen.dataset.material && chosen.dataset.material !== material.value) material.value = '';
      updateFormat(card); filter(); remember();
    });
  }
  for (const link of card.querySelectorAll('[data-edit-link]')) link.addEventListener('click', event => {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && !inlineEditor.beforeNavigation()) { event.preventDefault(); return; }
    remember();
  });
}
function restoreSavedReturn() {
  let target;try { target=JSON.parse(sessionStorage.getItem('gravuru-gallery-return')||'null'); } catch {}
  if(!target||!Number.isSafeInteger(target.revision)||typeof target.originalId!=='string'||location.hash!=='#design-'+encodeURIComponent(target.originalId))return false;
  const card=cards.find(c=>c.dataset.originalId===target.originalId);if(!card)return false;
  const select=card.querySelector('[data-format]');
  if(select){const option=savedReturnOption(select.options,target);if(!option)return false;select.value=option.value;updateFormat(card);}
  else if(card.dataset.productId!==target.productId||card.dataset.designId!==target.designId)return false;
  savedReturnCard=card;
  try{sessionStorage.removeItem('gravuru-gallery-return');}catch{}
  filter();remember();void approvalEditor.refresh();return true;
}
restoreSavedReturn();
for (const control of [search, view, material, theme, category, blankForm, process, approvalFilter]) control.addEventListener('input', () => { savedReturnCard=null;filter(); remember(); });
filter();
let returnCard;
try { returnCard = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
const hasReturnCard = returnCard?.matches('[data-design-card]');
const revealReturnCard = hasReturnCard && returnCard.hidden;
if (revealReturnCard&&!savedReturnCard) {
  search.value = '';
  view.value = 'designs';
  material.value = returnCard.dataset.material;
  theme.value = '';
  category.value = returnCard.dataset.category;
  process.value = '';
  approvalFilter.value = '';
  filter();
}
window.addEventListener('pagehide', remember);
window.addEventListener('pageshow', event => {
  // Returning through history must also refresh previews that were edited.
  if (event.persisted) {restoreSavedReturn();void approvalEditor.refresh();if(savedReturnCard)requestAnimationFrame(()=>savedReturnCard.scrollIntoView({block:'start'}));}
});
if (hasReturnCard) requestAnimationFrame(() => { returnCard.scrollIntoView({block: 'start'}); remember(); });
else if (Number.isFinite(saved.scroll)) requestAnimationFrame(() => window.scrollTo(0, saved.scroll));
}

if (typeof document !== 'undefined') void installGalleryPage();
