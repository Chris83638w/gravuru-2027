// Private operator service, deliberately not mounted on an HTTP/customer route.
// Targets and approved sets come from a reviewed, versioned operator plan.
import {isDeepStrictEqual as same} from 'node:util';
import {syncHash, syncFail} from './gallery-shop-sync-native.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

const clone = value => structuredClone(value);
const fail = (code, message) => syncFail('font_connection_' + code, message);

function withoutFontMetadata(value) {
  const result = clone(value);
  if (!result?.profiles?.selections || !result?.profiles?.sources)
    fail('historical_metadata', 'Der bisherige Produktstand enthält keine vollständigen Profilbelege. Den Bestandsfall zuerst gesondert prüfen.');
  delete result.profiles.selections.fonts;
  delete result.profiles.sources.fonts;
  return result;
}

function assertOnlyFontMetadata(before, after) {
  // The pinned customer model uses unrestricted selections when profiles are
  // absent (http.mjs); native review uses no manufacturing profile when absent
  // (acrylic-review.mjs). Apply those existing fallbacks only to historical rows
  // without profiles, never today's settings as a substitute for their history.
  if (before.profiles) {
    if (!same(withoutFontMetadata(before), withoutFontMetadata(after)))
      fail('other_profiles_changed', 'Neben den Schriften würden weitere Profil- oder Fertigungsstände geändert.');
    return;
  }
  const rest = value => { const r = clone(value); delete r.profiles; delete r.productionProfile; return r; };
  if (!same(rest(before), rest(after)) || !same(before.productionProfile || null, after.productionProfile || null) ||
      ['motifs', 'colors', 'bestsellers'].some(type => after.profiles?.selections?.[type] !== null))
    fail('other_profiles_changed', 'Der bisher wirksame Rückfall würde neben den Schriften weitere Produktvorgaben ändern.');
}

export function projectFontConnection({repository, record, assignment}) {
  if (record.document.schema !== 'gravuru-product/v1' || record.document.kind !== 'product' || record.document.config?.doorbell)
    fail('product_kind', 'Dieser Anschluss ist für native Katalogprodukte vorgesehen; andere Bestandswege benötigen ihre eigene Prüfung.');
  const document = clone(record.document);
  document.profileAssignments.fonts = clone(assignment);
  const validated = repository.validate(document);
  if (!same(validated, document)) fail('validation_changed', 'Die Dokumentprüfung würde weitere Produktdaten ändern.');
  const metadata = repository.previewMetadata(document);
  assertOnlyFontMetadata(record.metadata, metadata);
  const before = prepareShopProduct(record), after = prepareShopProduct({...record, document});
  for (const key of ['variants', 'extras', 'title', 'seo'])
    if (!same(before[key], after[key])) fail('commerce_changed', 'Ausführungen oder kaufmännische Daten würden geändert.');
  return {document, metadata};
}

export function createFontGroupConnection({workshop, tenantId, shopDomain, activation, transport,
  catalogFontSets, targets, approvedSets, executionEnabled = false} = {}) {
  if (workshop?.tenantId !== tenantId || workshop.repository?.tenantId !== tenantId ||
      activation?.tenantId !== tenantId || activation.shopDomain !== shopDomain || activation.storeId !== 'acryl' || activation.approvalMode !== 'preserve' ||
      transport?.shopDomain !== shopDomain || typeof transport.inspect !== 'function' ||
      typeof catalogFontSets?.list !== 'function' || !Array.isArray(targets) || !Array.isArray(approvedSets))
    fail('scope', 'Vorhandene Dienste, bestätigte Ziele und Schriftlisten müssen zum selben Mandanten und Shop gehören.');
  const repository = workshop.repository, fixedTargets = clone(targets), fixedSets = clone(approvedSets);
  if (new Set(fixedTargets.map(t => t.id)).size !== fixedTargets.length ||
      new Set(fixedTargets.map(t => t.mapping?.target?.productId)).size !== fixedTargets.length ||
      new Set(fixedTargets.map(t => t.mapping?.shopifyProductId)).size !== fixedTargets.length ||
      new Set(fixedSets.map(s => s.id)).size !== fixedSets.length)
    fail('targets', 'Die bestätigten Ziele und Schriftgruppen müssen eindeutig sein.');
  function target(id) {
    const result = fixedTargets.find(t => t.id === id);
    if (!result) fail('target_missing', 'Das Produkt gehört nicht zum bestätigten Anschlussplan.');
    return result;
  }
  function profile(setId) {
    const approved = fixedSets.find(s => s.id === setId), set = catalogFontSets.list().sets.find(s => s.id === setId);
    if (!approved || !set || !same(set.fonts, approved.fonts) || !set.synchronized ||
        set.profile?.source?.kind !== 'katalog-fontset' || set.profile.source.setId !== setId || set.profile.type !== 'fonts')
      fail('set_pending', 'Die bestätigte Schriftliste und ihr Herkunftsprofil sind noch nicht vollständig synchronisiert.');
    return clone(set.profile);
  }
  function ensureHead(id, revision) {
    const head = repository.head(id);
    if (head.revision !== revision || head.status === 'archived') fail('head_changed', 'Gebundener Stand und aktueller Produktstand weichen ab.');
  }
  function sameBindings(mapping, expected) {
    const actual = activation.capture(mapping);
    if (!same(actual, expected)) fail('bindings_changed', 'Die Varianten-Zuordnung hat sich seit der Vorschau geändert.');
    return actual;
  }
  function checkPlan(plan) {
    const {sha256, ...body} = plan;
    if (sha256 !== syncHash(body) || body.tenantId !== tenantId || body.shopDomain !== shopDomain || body.schema !== 'gravuru-font-connection/v1')
      fail('plan_changed', 'Der gespeicherte Prüfplan passt nicht mehr.');
    const t = target(body.targetId);
    if (!same(body.target, t) || !same(body.approvedSets, fixedSets)) fail('plan_changed', 'Die bestätigte Zuordnung hat sich geändert.');
    return {t, key: 'font-connect:' + sha256};
  }
  async function plan({targetId, restoreRevision} = {}) {
    const t = target(targetId), mapping = t.mapping, binding = activation.capture(mapping);
    if (restoreRevision === undefined && t.reviewedRevision !== undefined && binding.boundRevision !== t.reviewedRevision)
      fail('reviewed_revision', 'Der gebundene Produktstand weicht vom ausdrücklich geprüften Ziel ab.');
    ensureHead(mapping.target.productId, binding.boundRevision);
    const record = repository.get(mapping.target.productId, {revision: binding.boundRevision});
    let selectedProfile = null, assignment;
    if (restoreRevision !== undefined) {
      if (!Number.isSafeInteger(restoreRevision) || restoreRevision < 1 || restoreRevision >= record.revision)
        fail('restore_revision', 'Für den Rückweg ist ein früherer Stand desselben Produkts erforderlich.');
      assignment = repository.get(record.id, {revision: restoreRevision}).document.profileAssignments.fonts;
    } else {
      selectedProfile = profile(t.setId);
      assignment = {mode: 'override', profileId: selectedProfile.id};
    }
    const projected = projectFontConnection({repository, record, assignment});
    if (same(projected.document, record.document) && same(projected.metadata, record.metadata)) fail('unchanged', 'Das Produkt besitzt bereits diesen Schriftstand.');
    if (restoreRevision !== undefined) {
      const oldMetadata = repository.get(record.id, {revision: restoreRevision}).metadata;
      assertOnlyFontMetadata(oldMetadata, projected.metadata);
      if (!same(oldMetadata.profiles?.selections?.fonts ?? null, projected.metadata.profiles?.selections?.fonts ?? null))
        fail('restore_changed', 'Die frühere wirksame Schriftauswahl lässt sich nicht unverändert wiederherstellen.');
    }
    const remote = await transport.inspect(mapping);
    ensureHead(record.id, record.revision); sameBindings(mapping, binding);
    const pricing = activation.prepare({mapping, record, document: projected.document, binding, remote});
    const body = {schema: 'gravuru-font-connection/v1', tenantId, shopDomain, targetId, target: t, approvedSets: fixedSets,
      fromRevision: record.revision, restoreRevision: restoreRevision ?? null, binding, assignment, selectedProfile,
      beforeDocumentSha256: syncHash(record.document), documentSha256: syncHash(projected.document), metadata: projected.metadata, pricing};
    return clone({...body, sha256: syncHash(body)});
  }
  // A plan is an operator-owned review artifact, not an authentication token.
  // Rebuild from immutable history and recheck every write dependency, including
  // after awaited remote reads. The import journal makes restart/retry exact-once.
  async function execute(plan) {
    if (executionEnabled !== true) syncFail('font_connection_execution_disabled', 'Der Anschluss ist noch nicht zum Ausführen freigegeben.', 403);
    plan = clone(plan);
    const {t, key} = checkPlan(plan), mapping = t.mapping, id = mapping.target.productId;
    if (plan.selectedProfile && !same(profile(t.setId), plan.selectedProfile)) fail('set_changed', 'Das bestätigte Schriftprofil wurde inzwischen geändert.');
    const original = repository.get(id, {revision: plan.fromRevision});
    if (syncHash(original.document) !== plan.beforeDocumentSha256) fail('source_changed', 'Der geprüfte Ausgangsstand stimmt nicht mehr.');
    const projected = projectFontConnection({repository, record: original, assignment: plan.assignment});
    if (syncHash(projected.document) !== plan.documentSha256 || !same(projected.metadata, plan.metadata))
      fail('profiles_changed', 'Die Profilstände haben sich seit der Vorschau geändert.');
    const remote = await transport.inspect(mapping);
    const pricing = activation.prepare({mapping, record: original, document: projected.document, binding: plan.binding, remote});
    if (!same(pricing, plan.pricing)) fail('pricing_changed', 'Die geprüften Zusatzpreise haben sich geändert.');
    const prior = repository.importItem(key);
    if (!prior) {
      repository.importBatch([{key, fingerprint: plan.sha256, action: 'update', productId: id, expectedRevision: plan.fromRevision,
        document: projected.document, expectedMetadata: plan.metadata}], {beforeWrite() {
        ensureHead(id, plan.fromRevision); sameBindings(mapping, plan.binding);
        if (plan.selectedProfile && !same(profile(t.setId), plan.selectedProfile)) fail('set_changed', 'Die Schriftliste wurde inzwischen geändert.');
      }});
    } else if (prior.id !== id || prior.fingerprint !== plan.sha256) fail('journal_conflict', 'Der Wiederanlauf gehört zu einem anderen Produktstand.');
    const saved = repository.get(id, {revision: plan.fromRevision + 1});
    ensureHead(id, saved.revision);
    if (syncHash(saved.document) !== plan.documentSha256 || !same(saved.metadata, plan.metadata)) fail('saved_changed', 'Der gespeicherte Stand passt nicht zum Prüfplan.');
    activation.activate({operationId: key, entries: [{mapping, newRevision: saved.revision,
      documentSha256: plan.documentSha256, binding: plan.binding, pricing: plan.pricing, remote}]});
    return {productId: id, previousRevision: plan.fromRevision, revision: saved.revision, approved: activation.capture(mapping).approved};
  }
  return Object.freeze({plan, execute});
}
