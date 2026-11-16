import fs from 'node:fs';

// Verified snapshot only: catalogue existence is not gallery connectivity or
// production readiness. Other materials deliberately receive no unverified URL.
const snapshot = JSON.parse(fs.readFileSync(new URL('../data/review-material-overview-20261106.json', import.meta.url), 'utf8'));
export const REVIEW_MATERIAL_OVERVIEW = Object.freeze({
  ...snapshot,
  architectureEvidence: Object.freeze(snapshot.architectureEvidence),
  materials: Object.freeze(snapshot.materials.map(row => Object.freeze({...row, profileIds: Object.freeze(row.profileIds), cataloguePaths: Object.freeze(row.cataloguePaths)}))),
});
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));

export function materialOverviewHtml({expanded = false, activeMaterials = null} = {}) {
  const connected = activeMaterials === null ? null : new Map(activeMaterials.map(row => [row.key, row]));
  const materials = REVIEW_MATERIAL_OVERVIEW.materials.flatMap(row => {
    if (!connected) return row;
    const actual = connected.get(row.id);
    const variants = actual ? [actual] : [...connected.values()].filter(item => item.kind === row.id);
    if (!variants.length) return {...row, galleryStatus: 'not-connected', statusLabel: 'Noch nicht verbunden', detail: row.galleryStatus === 'active' ? 'Katalog-Zuordnung vorhanden. Vorlagen und Rohlinge sind in dieser Galerie noch nicht verbunden.' : row.detail};
    return variants.map(item => ({...row, id: item.key, label: item.label || row.label, galleryStatus: 'active', statusLabel: 'In dieser Galerie',
      detail: `${item.originals} Vorlagen · ${item.editable} bearbeitbar${item.blanks ? ` · ${item.blanks} Rohlinge` : ''}. Offene Aufbereitung und Freigaben sind getrennt gekennzeichnet.`}));
  });
  const activeLabels = materials.filter(row => row.galleryStatus === 'active').map(row => row.label);
  const title = connected ? activeLabels.length ? 'Materialien · ' + activeLabels.join(' und ') : 'Materialien' : 'Materialien · Schiefer aktiv';
  const intro = connected ? `Diese Galerie enthält ${activeLabels.length ? activeLabels.join(' und ') : 'noch keine verbundenen Materialien'}. Materialien und Themen kannst du unabhängig filtern.` : 'Diese Galerie enthält Schiefer. Hier siehst du außerdem die geprüften Materialgruppen und ihre Zuordnung.';
  const items = materials.map(row => `<li class="review-material-item${row.galleryStatus === 'active' ? ' is-active' : ''}" data-review-material="${escape(row.id)}"><div class="review-material-name"><strong>${escape(row.label)}</strong><span class="review-material-status">${escape(row.statusLabel)}</span></div><p>${escape(row.detail)}</p></li>`).join('');
  return `<style>.review-material-overview{margin:16px 0;border:1px solid #c8d4cd;border-radius:10px;background:#fff}.review-material-overview>summary{padding:12px 16px;cursor:pointer;font-weight:700}.review-material-overview>summary:focus-visible{outline:3px solid #17614f;outline-offset:3px}.review-material-intro{margin:0;padding:0 16px 12px;color:#53645c}.review-material-list{list-style:none;margin:0;padding:0 16px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.review-material-item{border:1px solid #d5ded7;border-radius:8px;padding:12px;background:#fafbf9}.review-material-item.is-active{border-color:#17614f;background:#eef6f0}.review-material-name{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.review-material-status{font-size:12px;color:#53645c}.review-material-item.is-active .review-material-status{color:#17614f;font-weight:700}.review-material-item p{font-size:13px;line-height:1.45;margin:7px 0 0;color:#53645c}@media(max-width:480px){.review-material-list{grid-template-columns:1fr}}</style><details class="review-material-overview"${expanded ? ' open' : ''}><summary>${escape(title)}</summary><p class="review-material-intro">${escape(intro)} Eine Katalogvorlage ist noch keine fertige Konfi-Vorlage.</p><ul class="review-material-list" aria-label="Materialien und Galerie-Zuordnung">${items}</ul></details>`;
}
