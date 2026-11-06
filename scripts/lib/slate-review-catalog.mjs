// Review groups come from the catalogue, not from guessed subjects in sample photos.
// Keep source metadata available even when an original has no prepared target yet.
const fold = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function withSlateReviewMetadata(row, original = {}) {
  const category = original.katalog?.kategorie || {};
  return {
    ...row,
    catalogueCategory: {
      ...row.catalogueCategory,
      group: category.ziel ?? row.catalogueCategory?.group ?? row.group,
      subcategory: category.unter ?? row.catalogueCategory?.subcategory ?? row.subcategory,
      photo: category.foto ?? row.catalogueCategory?.photo,
      sheetLabel: original.sheetLabel ?? original.katalog?.sheetLabel ?? row.catalogueCategory?.sheetLabel,
      sourceKind: original.katalog?.sourceKind ?? row.catalogueCategory?.sourceKind,
    },
  };
}

function photoState(row) {
  if (Number(row.photoSlots) > 0) return 'with';
  const stated = fold(row.catalogueCategory?.photo ?? row.katalog?.kategorie?.foto);
  if (['ja', 'yes', 'with', 'mit foto'].includes(stated)) return 'with';
  if (['nein', 'no', 'without', 'ohne foto'].includes(stated)) return 'without';
  // An unprepared original with no photoSlots property is not evidence of no photo.
  if (row.photoSlots === 0 && row.targets?.some(target => target.status === 'prepared')) return 'without';
  const label = fold(row.catalogueCategory?.sheetLabel);
  if (/\bohne foto\b/.test(label)) return 'without';
  if (/\bmit foto\b/.test(label)) return 'with';
  return 'unknown';
}

function topicState(row) {
  const source = fold(row.source ?? row.sourcePath).replaceAll('\\', '/');
  const group = fold(row.catalogueCategory?.group ?? row.group);
  const sub = fold(row.catalogueCategory?.subcategory ?? row.subcategory);
  const words = `${group} ${sub}`;
  if (source.includes('/hausnummern/') || /hausnummer/.test(group)) return ['hausnummern', 'Hausnummern', 110];
  if (source.includes('/tuerschilder/') || /turschild|tuerschild/.test(group)) return ['tuerschilder', 'Türschilder', 100];
  if (source.includes('/kordelschilder/')) return ['kordelschilder', 'Kordelschilder', 120];
  if (source.includes('/boxenschilder/')) return ['boxenschilder', 'Boxenschilder', 130];
  if (source.includes('/firmenschilder/')) return ['firmenschilder', 'Firmenschilder', 140];
  if (source.includes('/hinweisschilder/')) return ['hinweisschilder', 'Hinweisschilder', 150];
  if (source.includes('/tierschilder/')) return ['tierschilder', 'Tierschilder', 160];
  if (/\bhund(?:e)?\b/.test(words)) return ['hunde', 'Hunde', 0];
  if (/sternenkind/.test(words)) return ['sternenkinder', 'Sternenkinder', 50];
  if (/\bmenschen?\b/.test(group)) return ['menschen', 'Menschen', 10];
  if (/\bkatz(?:e|en)\b/.test(words)) return ['katzen', 'Katzen', 20];
  if (/kleintier/.test(words)) return ['kleintiere', 'Kleintiere', 30];
  if (/\bpferd(?:e)?\b/.test(words)) return ['pferde', 'Pferde', 40];
  if (/\btier(?:e)?\b/.test(group)) return ['weitere-tiere', 'Weitere Tiere', 60];
  return ['weitere-schiefer', 'Weitere Schiefer-Vorlagen', 200];
}

export function slateReviewCategory(row) {
  const [topic, title, topicRank] = topicState(row);
  const photo = photoState(row);
  const suffix = {without: 'ohne Foto', with: 'mit Foto', unknown: 'Fotozuordnung offen'}[photo];
  return {
    key: `${topic}-${photo}`,
    label: `${title} ${suffix}`,
    rank: topicRank * 3 + {without: 0, with: 1, unknown: 2}[photo],
    photo,
    topic,
  };
}

export function sortSlateReviewRows(rows) {
  return [...rows].sort((a, b) => {
    const first = slateReviewCategory(a), second = slateReviewCategory(b);
    return first.rank - second.rank || first.key.localeCompare(second.key, 'de') ||
      String(a.id ?? '').localeCompare(String(b.id ?? ''), 'de', {numeric: true});
  });
}
