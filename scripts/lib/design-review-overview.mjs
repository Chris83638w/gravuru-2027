// Review counts describe existing original IDs and exact material/format targets.
// Expected coverage is only evaluated against an explicitly supplied list.
const STATUSES = ['approved', 'unreviewed', 'changed', 'unavailable'];
const SEVERITY = {approved: 0, unreviewed: 1, changed: 2, unavailable: 3};
const collator = new Intl.Collator('de', {numeric: true, sensitivity: 'base'});
const text = value => typeof value === 'string' ? value.trim() : '';
const dimension = value => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  throw new TypeError('Material und Format benötigen stabile Zeichenfolgen als Kennung.');
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const DESIGN_REVIEW_STATE_LABELS = Object.freeze({
  no_approved: 'Noch keine Bestätigung', some_approved: 'Teilweise bestätigt', all_approved: 'Alle vorhandenen Formatversionen bestätigt',
});

function category(value) {
  const key = text(typeof value === 'string' ? value : value?.key ?? value?.categoryKey);
  if (!key) throw new TypeError('Eine Unterkategorie benötigt eine stabile Kennung.');
  return {key, label: text(typeof value === 'object' ? value.label ?? value.categoryLabel : '') || key};
}
function categoriesOf(entry) {
  const supplied = entry.categories ?? entry.categoryKeys;
  if (supplied != null && !Array.isArray(supplied)) throw new TypeError('categories muss eine Liste sein.');
  const values = supplied?.length ? supplied : entry.categoryKey ? [{key: entry.categoryKey, label: entry.categoryLabel}] : [{key: '__uncategorized__', label: 'Noch ohne Unterkategorie'}];
  return [...new Map(values.map(value => {const item = category(value); return [item.key, item];})).values()];
}
function summarize(targets) {
  const originals = new Map(), counts = Object.fromEntries(STATUSES.map(status => [status, 0]));
  for (const target of targets) {
    counts[target.status]++;
    const previous = originals.get(target.id);
    if (!previous || SEVERITY[target.status] > SEVERITY[previous]) originals.set(target.id, target.status);
  }
  const originalStatusCounts = Object.fromEntries(STATUSES.map(status => [status, 0]));
  for (const status of originals.values()) originalStatusCounts[status]++;
  const state = !counts.approved ? 'no_approved' : counts.approved === targets.length ? 'all_approved' : 'some_approved';
  return {distinctOriginals: originals.size, targets: targets.length, ...counts, originalStatusCounts,
    pending: counts.unreviewed + counts.changed + counts.unavailable, state, stateLabel: DESIGN_REVIEW_STATE_LABELS[state]};
}

/**
 * entries: one source original/target per record, repeated across categories allowed.
 * Required: id (or explicit originalId), status in approved|unreviewed|changed|unavailable.
 * Target identity: original ID + key/targetKey + material/materialKey + format/formatKey.
 * Categories: categoryKey/categoryLabel, or categories: [{key,label}] / categoryKeys.
 * Do not pass all historical revisions: status must describe the current target.
 * Conflicting repeated statuses are conservatively collapsed, and reported.
 *
 * expectedCategories: null, string keys, or {key,label,material?,format?,minimumOriginals?,requiredOriginalIds?}.
 * Scopes without a quantity/ID list require only one existing original. Technical
 * unavailability does not make a source original absent. Coverage is not release.
 */
export function buildDesignReviewOverview(entries, {expectedCategories = null} = {}) {
  if (!Array.isArray(entries)) throw new TypeError('entries muss eine Liste sein.');
  if (expectedCategories !== null && !Array.isArray(expectedCategories)) throw new TypeError('expectedCategories muss null oder eine Liste sein.');
  const targets = new Map(), labels = new Map(), conflicts = [];
  for (const entry of entries) {
    const id = text(entry?.originalId ?? entry?.id);
    if (!id) throw new TypeError('Eine Vorlage benötigt eine stabile Original-ID.');
    const status = entry.status ?? 'unreviewed';
    if (!STATUSES.includes(status)) throw new TypeError(`Unbekannter Prüfstatus: ${status}`);
    const material = dimension(entry.materialKey ?? entry.material), format = dimension(entry.formatKey ?? entry.format);
    const key = dimension(entry.targetKey ?? entry.key);
    const identity = JSON.stringify([id, key, material, format]);
    const groups = categoriesOf(entry);
    for (const item of groups) if (!labels.has(item.key) || labels.get(item.key) === item.key) labels.set(item.key, item.label);
    const prior = targets.get(identity);
    if (prior) {
      if (prior.status !== status) {
        conflicts.push({id, key, material, format, statuses: [prior.status, status]});
        if (SEVERITY[status] > SEVERITY[prior.status]) prior.status = status;
      }
      for (const item of groups) prior.categories.add(item.key);
    } else targets.set(identity, {id, key, material, format, status, categories: new Set(groups.map(item => item.key))});
  }
  const rows = [...targets.values()];
  const categories = [...labels].map(([key, label]) => ({key, label, ...summarize(rows.filter(row => row.categories.has(key)))}))
    .sort((a, b) => collator.compare(a.label, b.label) || collator.compare(a.key, b.key));
  const expectedCoverageKnown = expectedCategories !== null;
  let coverage = null;
  if (expectedCoverageKnown) {
    const scopes = new Map();
    for (const raw of expectedCategories) {
      const item = category(raw), data = typeof raw === 'string' ? {} : raw;
      const material = dimension(data.materialKey ?? data.material), format = dimension(data.formatKey ?? data.format);
      const requiredIds = data.requiredOriginalIds ?? [];
      if (!Array.isArray(requiredIds) || requiredIds.some(id => !text(id))) throw new TypeError('requiredOriginalIds benötigt gültige Original-IDs.');
      const ids = [...new Set(requiredIds.map(text))];
      const minimumOriginals = data.minimumOriginals ?? Math.max(1, ids.length);
      if (!Number.isSafeInteger(minimumOriginals) || minimumOriginals < 0) throw new TypeError('minimumOriginals muss eine nicht negative ganze Zahl sein.');
      const identity = JSON.stringify([item.key, material, format]);
      const candidate = {key: item.key, label: item.label, material, format, minimumOriginals, requiredOriginalIds: ids.sort(collator.compare)};
      if (scopes.has(identity)) {
        const prior = scopes.get(identity);
        if (prior.minimumOriginals !== minimumOriginals || JSON.stringify(prior.requiredOriginalIds) !== JSON.stringify(candidate.requiredOriginalIds)) throw new TypeError('Widersprüchliche Sollvorgaben für dieselbe Unterkategorie und dasselbe Ziel.');
        continue;
      }
      scopes.set(identity, candidate);
    }
    coverage = [...scopes.values()].map(scope => {
      const found = rows.filter(row => row.categories.has(scope.key) && (!scope.material || row.material === scope.material) && (!scope.format || row.format === scope.format));
      const ids = new Set(found.map(row => row.id)), missingOriginalIds = scope.requiredOriginalIds.filter(id => !ids.has(id));
      const minimumShortfall = Math.max(0, scope.minimumOriginals - ids.size);
      return {...scope, distinctOriginals: ids.size, targets: found.length, unavailable: found.filter(row => row.status === 'unavailable').length,
        missingOriginalIds, minimumShortfall, lacking: Math.max(minimumShortfall, missingOriginalIds.length), missingCategory: ids.size === 0 && (scope.minimumOriginals > 0 || scope.requiredOriginalIds.length > 0)};
    });
  }
  const lackingScopes = coverage?.filter(scope => scope.lacking > 0).length ?? null;
  const missingCategories = coverage?.filter(scope => scope.missingCategory) ?? null;
  return {schema: 'gravuru-design-review-overview/v1', summary: summarize(rows), categories,
    expectedCoverageKnown, coverage, lackingScopes, lacking: lackingScopes, missingCategories, conflicts,
    coverageNote: expectedCoverageKnown
      ? 'Geprüft werden ausschließlich die angegebenen Unterkategorien und Zielbereiche. Ohne Mengen- oder ID-Vorgabe genügt eine vorhandene Originalvorlage; offene Aufbereitung zählt weiterhin als vorhandene Quelle.'
      : 'Vollständigkeitsprüfung folgt mit deiner Unterkategorienliste'};
}

export function designReviewOverviewHtml(overview, {expanded = false} = {}) {
  if (overview?.schema !== 'gravuru-design-review-overview/v1') throw new TypeError('Eine berechnete Prüfübersicht wird benötigt.');
  const rows = overview.categories.map(row => `<tr data-review-category="${escape(row.key)}"><th scope="row">${escape(row.label)}</th><td>${row.distinctOriginals}</td><td>${row.targets}</td><td>${row.approved}</td><td>${row.unreviewed}</td><td>${row.changed}</td><td>${row.unavailable}</td><td>${escape(row.stateLabel)}</td></tr>`).join('');
  const gaps = overview.coverage?.filter(scope => scope.lacking > 0) ?? [];
  const scopeLabel = scope => [scope.label, scope.material, scope.format].filter(Boolean).join(' · ');
  const missing = gaps.length ? `<p><strong>Noch fehlende Quellen laut Soll-Liste:</strong></p><ul>${gaps.map(scope => `<li>${escape(scopeLabel(scope))}: ${scope.missingCategory ? 'noch keine Vorlage vorhanden' : `mindestens ${scope.lacking} weitere Originalvorlage${scope.lacking === 1 ? '' : 'n'} erforderlich`}${scope.missingOriginalIds.length ? ` · fehlende IDs: ${escape(scope.missingOriginalIds.join(', '))}` : ''}</li>`).join('')}</ul>` : '';
  const s = overview.summary;
  return `<details class="design-review-overview"${expanded ? ' open' : ''}><summary>Prüfübersicht · ${s.distinctOriginals} Vorlagen · ${s.approved} von ${s.targets} Formatversionen bestätigt</summary><p>${escape(overview.coverageNote)}</p><p>Vorlagen werden je Thema einmal gezählt. Bestätigung, ungeprüft, erneut prüfen und Aufbereitung offen zählen die einzelnen Material- und Formatversionen. Eine Vorlage kann zu mehreren Themen gehören; die Gesamtzahl enthält sie nur einmal.</p>${rows ? `<div class="design-review-overview-scroll" style="overflow-x:auto"><table><caption>Vorhandene Vorlagen nach Unterkategorie</caption><thead><tr><th scope="col">Unterkategorie</th><th scope="col">Vorlagen</th><th scope="col">Formatversionen</th><th scope="col">Bestätigt</th><th scope="col">Ungeprüft</th><th scope="col">Erneut prüfen</th><th scope="col">Aufbereitung offen</th><th scope="col">Stand</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p>Noch keine Vorlagen in dieser Übersicht vorhanden.</p>'}${missing}<p>„Erneut prüfen“ bedeutet: seit der Bestätigung geändert. „Aufbereitung offen“ bedeutet: Original vorhanden, technische Bearbeitung noch offen.</p>${overview.conflicts.length ? '<p role="status">Für einzelne Formatversionen wurden unterschiedliche Prüfstände geliefert. Sie werden vorsorglich offen gezählt.</p>' : ''}</details>`;
}
