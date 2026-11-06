import {installInlineReview} from './inline.js';
import {installApprovalReview} from './approvals.js';

const storageKey = 'gravuru-slate-gallery-v2';
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const process = document.querySelector('#process');
const approvalFilter = document.querySelector('#approval-filter');
const cards = [...document.querySelectorAll('[data-design-card]')];
let saved = {};
try { saved = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch {}
let approvalEditor;
const inlineEditor = installInlineReview({cards, onSaved: () => {remember();void approvalEditor?.refresh();}, onVisibilityChange: filter});
approvalEditor = installApprovalReview({cards,onChanged:filter});
function remember() {
  const formats = Object.fromEntries(cards.filter(card => card.querySelector('[data-format]')).map(card => [card.id, card.querySelector('[data-format]').value]));
  try { sessionStorage.setItem(storageKey, JSON.stringify({search: search.value, category: category.value, process: process.value, approval: approvalFilter.value, scroll: window.scrollY, formats})); } catch {}
}
function filter() {
  approvalEditor?.syncControls();
  let count = 0;
  for (const card of cards) {
    const matches = card.dataset.search.includes(search.value.toLowerCase().trim()) && (!category.value || card.dataset.category === category.value) && (!process.value || card.dataset.process === process.value) && (!approvalFilter.value || card.dataset.approvalStatus === approvalFilter.value);
    const pinned = inlineEditor.keepVisible(card);
    card.hidden = !matches && !pinned;
    let note = card.querySelector('[data-inline-filter-note]');
    if (!matches && pinned && !note) { note = document.createElement('p'); note.dataset.inlineFilterNote = ''; note.className = 'inline-filter-note'; note.textContent = 'Deine offene Vorlage bleibt trotz Filter sichtbar. Bitte zuerst speichern oder zurücksetzen.'; card.querySelector('.card-heading').after(note); }
    if (note) note.hidden = matches || !pinned;
    if (!card.hidden) count++;
  }
  for (const section of document.querySelectorAll('[data-category-section]')) {
    const count = section.querySelectorAll('[data-design-card]:not([hidden])').length;
    section.hidden = !count;
    section.querySelector('[data-section-count]').textContent = count;
  }
  document.querySelector('#count').textContent = count + ' Vorlagen';
  document.querySelector('#no-results').hidden = count > 0;
}
function updateFormat(card) {
  const select = card.querySelector('[data-format]');
  const option = select.selectedOptions[0];
  const image = card.querySelector('[data-preview]');
  image.src = option.dataset.preview;
  image.alt = card.querySelector('h3').textContent + ' · Konfi-Vorlage · ' + option.textContent;
  card.dataset.productId = option.dataset.productId;
  card.dataset.designId = option.dataset.designId;
  card.dataset.approvalKey = option.dataset.approvalKey;
  for (const link of card.querySelectorAll('[data-edit-link]')) link.href = option.dataset.edit;
  approvalEditor.formatChanged(card);
}
search.value = saved.search || '';
if ([...category.options].some(option => option.value === saved.category)) category.value = saved.category;
if ([...process.options].some(option => option.value === saved.process)) process.value = saved.process;
if ([...approvalFilter.options].some(option => option.value === saved.approval)) approvalFilter.value = saved.approval;
for (const card of cards) {
  const select = card.querySelector('[data-format]');
  if (select) {
    const value = saved.formats?.[card.id];
    if ([...select.options].some(option => option.value === value)) { select.value = value; updateFormat(card); }
    let previous = select.value;
    select.addEventListener('change', () => {
      if (!inlineEditor.beforeFormatChange(card)) { select.value = previous; return; }
      previous = select.value; updateFormat(card); remember();
    });
  }
  for (const link of card.querySelectorAll('[data-edit-link]')) link.addEventListener('click', event => {
    if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && !inlineEditor.beforeNavigation()) { event.preventDefault(); return; }
    remember();
  });
}
for (const control of [search, category, process, approvalFilter]) control.addEventListener('input', () => { filter(); remember(); });
filter();
let returnCard;
try { returnCard = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
const revealReturnCard = returnCard?.matches('[data-design-card]') && returnCard.hidden;
if (revealReturnCard) {
  search.value = '';
  category.value = returnCard.dataset.category;
  process.value = '';
  approvalFilter.value = '';
  filter();
}
window.addEventListener('pagehide', remember);
window.addEventListener('pageshow', event => {
  // Returning through history must also refresh previews that were edited.
  if (event.persisted) for (const image of document.querySelectorAll('img[data-preview]')) image.src = image.src;
});
if (revealReturnCard) requestAnimationFrame(() => { returnCard.scrollIntoView({block: 'start'}); remember(); });
else if (Number.isFinite(saved.scroll)) requestAnimationFrame(() => window.scrollTo(0, saved.scroll));
