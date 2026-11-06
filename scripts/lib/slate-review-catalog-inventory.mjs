import {slateReviewCategory, withSlateReviewMetadata} from './slate-review-catalog.mjs';

export function catalogueSizeMm(label) {
  const match = String(label).trim().replaceAll(',', '.').match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i);
  return match ? match.slice(1).map(value => Math.round(Number(value) * 1000) / 100) : null;
}

export function slateExtensionTargetSizes(row, family) {
  return family.sizes.filter(size => row.targetSizeKeys?.includes(size.key) &&
    ['RE', 'QU'].includes(size.groupKey) && size.widthMm === row.sourcePlateMm?.[0] && size.heightMm === row.sourcePlateMm?.[1]);
}

// The material of the actual master is decisive. `materials` may list other
// variants of an acrylic or steel master, which must not become slate originals.
export function slateInventoryRows(indexes, treeEntries, preparedRows = []) {
  const prepared = new Map(preparedRows.map(row => [row.id, row]));
  const tree = new Map(treeEntries.map(entry => [entry.path, entry]));
  const folders = new Map();
  for (const entry of treeEntries) {
    const folder = entry.path.slice(0, entry.path.lastIndexOf('/'));
    if (!folders.has(folder)) folders.set(folder, []);
    folders.get(folder).push(entry);
  }
  const byId = new Map();
  for (const {family, designs} of indexes) for (const design of designs) {
    if (design.material !== 'Schiefer') continue;
    if (!design.masterId || !design.path || /(^|\/)\.\.(\/|$)/.test(design.path)) throw Error(`Invalid catalogue entry in ${family}`);
    const source = `designs/bestand/${family}/${design.path}/design.json`;
    const folder = source.slice(0, -'/design.json'.length);
    const files = (folders.get(folder) || []).map(entry => ({name: entry.path.slice(folder.length + 1), gitBlob: entry.sha, bytes: entry.bytes}));
    const existing = prepared.get(design.masterId);
    const row = withSlateReviewMetadata({
      id: design.masterId,
      catalogueKey: design.key,
      family,
      material: design.material,
      process: existing?.process ?? design.process,
      catalogueProcess: design.process,
      source,
      sourcePaths: [source],
      sourcePlateMm: [design.plate?.widthMm, design.plate?.heightMm],
      sourceKind: design.sourceKind ?? null,
      group: design.kategorie?.ziel,
      subcategory: design.kategorie?.unter,
      stockSizes: (design.sizesInStock || []).map(label => ({label, mm: catalogueSizeMm(label), evidence: 'catalogue-stock-reference-only'})),
      files,
      sourceAvailable: tree.has(source),
      originalSvgAvailable: files.some(file => file.name === 'design.svg'),
      originalPreviewAvailable: files.some(file => file.name === 'preview.png'),
      fontsMissingInCatalogue: design.fontsMissing || [],
      targets: existing?.targets || [],
      ...(existing?.photoSlots === undefined ? {} : {photoSlots: existing.photoSlots}),
      preparationStatus: existing ? existing.targets?.some(target => target.status === 'prepared') ? 'prepared' : 'open' : 'source-only',
      released: false,
    }, {katalog: design, sheetLabel: design.sheetLabel});
    row.category = slateReviewCategory(row);
    row.nextAction = row.preparationStatus === 'prepared'
      ? 'Vorbereitete Konfi-Version einzeln prüfen; Bildfreigabe offen.'
      : row.preparationStatus === 'open'
        ? existing.reason || existing.error || 'Vorhandene Vorbereitung enthält offene Punkte.'
        : !row.sourceAvailable ? 'Originaldatei fehlt trotz Katalogeintrag.'
          : !row.originalSvgAvailable ? 'Bearbeitbare Originalebenen prüfen; keine Konfi-Version vorbereitet.'
            : 'Original-SVG und Text-/Fotofelder technisch vorbereiten; Formatbindung prüfen. Noch keine Konfi-Version.';
    const previous = byId.get(row.id);
    if (!previous) byId.set(row.id, row);
    else {
      // A master can occur in a general and a special catalogue. Preserve both
      // provenances but show one ID; prefer the already prepared exact source.
      const sources = [...new Set([...previous.sourcePaths, source])];
      if (existing?.source === source) byId.set(row.id, {...row, sourcePaths: sources});
      else previous.sourcePaths = sources;
    }
  }
  return [...byId.values()].sort((a, b) => a.family.localeCompare(b.family, 'de') || a.id.localeCompare(b.id, 'de', {numeric: true}));
}
