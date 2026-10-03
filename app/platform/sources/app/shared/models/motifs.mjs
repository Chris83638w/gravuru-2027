export const TYPE = 'gravuru_motif';
export const FIELDS = `id handle updatedAt fields {
  key value reference { ... on MediaImage { image { url altText } } }
}`;
export const LIST = `query GravuruMotifs($after: String) {
  metaobjects(type: "gravuru_motif", first: 100, after: $after) {
    nodes { ${FIELDS} } pageInfo { hasNextPage endCursor }
  }
}`;
export const ONE = `query GravuruMotif($handle: MetaobjectHandleInput!) {
  metaobjectByHandle(handle: $handle) { ${FIELDS} }
}`;
export const SAVE = `mutation SaveGravuruMotif($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id } userErrors { field message code }
  }
}`;

export async function request(query, variables = {}) {
  const response = await fetch('shopify:admin/api/2026-07/graphql.json', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query, variables}),
  });
  if (!response.ok) throw new Error(`Shopify ist nicht erreichbar (HTTP ${response.status}). Bitte erneut versuchen.`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join(' · '));
  if (!result.data) throw new Error('Shopify hat keine Daten zurückgegeben.');
  return result.data;
}

export function decode(node) {
  if (!node) throw new Error('Das Motiv wurde nicht gefunden. Bitte die Bibliothek neu laden.');
  const fields = Object.fromEntries(node.fields.map(f => [f.key, f.value ?? '']));
  const preview = node.fields.find(f => f.key === 'preview')?.reference?.image;
  return {...node, values: fields, name: fields.name || node.handle,
    category: fields.category || '', notes: fields.notes || '',
    enabled: fields.enabled === 'true', preview: preview?.url || '',
    originalAvailable: Boolean(fields.source_data || fields.source_file)};
}

export async function listMotifs() {
  const items = [];
  let after = null;
  const cursors = new Set();
  do {
    const data = await request(LIST, {after});
    const page = data.metaobjects;
    items.push(...page.nodes.map(decode));
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
    if (!after || cursors.has(after)) throw new Error('Die Bibliothek konnte nicht vollständig geladen werden. Bitte erneut versuchen.');
    cursors.add(after);
  } while (true);
  return items.sort((a, b) => a.name.localeCompare(b.name, 'de'));
}

export async function saveMotif(original, draft) {
  const name = draft.name.trim();
  const category = draft.category.trim();
  if (!name || name.length > 200) throw new Error('Bitte einen Motivnamen mit 1 bis 200 Zeichen eingeben.');
  if (category.length > 200 || draft.notes.length > 5000) throw new Error('Kategorie oder Notizen sind zu lang.');
  const handle = {type: TYPE, handle: original.handle};
  const current = decode((await request(ONE, {handle})).metaobjectByHandle);
  if (current.id !== original.id || current.updatedAt !== original.updatedAt) {
    throw new Error('Dieses Motiv wurde zwischenzeitlich geändert. Bitte abbrechen, neu laden und deine Änderungen erneut eintragen.');
  }
  // Do not write source vectors, checksums, preview references or production bounds.
  const expected = {name, category, notes: draft.notes, enabled: String(Boolean(draft.enabled))};
  const fields = Object.entries(expected).map(([key, value]) => ({key, value}));
  const saved = (await request(SAVE, {handle, metaobject: {fields}})).metaobjectUpsert;
  if (saved.userErrors?.length) throw new Error(saved.userErrors.map(e => e.message).join(' · '));
  if (!saved.metaobject?.id) throw new Error('Shopify hat das Speichern nicht bestätigt. Bitte vor erneutem Speichern die Bibliothek prüfen.');
  const verified = decode((await request(ONE, {handle})).metaobjectByHandle);
  if (verified.id !== original.id || Object.entries(expected).some(([key, value]) => verified.values[key] !== value)) {
    throw new Error('Die gespeicherten Angaben konnten nicht vollständig bestätigt werden. Bitte die Bibliothek neu laden.');
  }
  return verified;
}

