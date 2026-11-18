// Private operator service, deliberately not mounted on an HTTP/customer route.
// Targets and approved sets come from a reviewed, versioned operator plan.
import {isDeepStrictEqual as same} from 'node:util';
import {syncHash, syncFail} from './gallery-shop-sync-native.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';
import {capturePersonalization} from './cart-personalization.mjs';

const clone = value => structuredClone(value);
const fail = (code, message) => syncFail('font_connection_' + code, message);

function withoutFontMetadata(value) {
  const result = clone(value);
  if (!result?.profiles?.selections || !result?.profiles?.sources)
    fail('historical_metadata', 'Der bisherige Produktstand enthält keine vollständigen Profilbelege. Den Bestandsfall zuerst gesondert prüfen.');
  delete result.profiles.selections.fonts;
  delete result.profiles.sources.fonts;
  // Settings counters are evidence, not an effective product selection. The
  // other selections/sources and manufacturing evidence still compare exactly.
  delete result.profiles.settingsRevision;
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
      activation?.tenantId !== tenantId || activation.shopDomain !== shopDomain || activation.storeId !== 'acryl' || activation.approvalMode !== 'preserve' || typeof activation.checkBindings !== 'function' ||
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
  function unchangedPricing(pricing, binding, document) {
    for (const head of binding.heads) {
      const assigned = pricing.variants.find(v => v.id === head.shopifyVariantId);
      const contract = pricing.contracts.find(c => c.sha256 === assigned?.sha256);
      const captured = contract ? capturePersonalization(contract.pricing, {
        variantId: head.shopifyVariantId.split('/').at(-1), baseCents: head.unitCents, document,
      }) : null;
      if (!same(captured, head.personalization))
        fail('contract_changed', 'Der Schriftanschluss würde einen bestehenden Zusatzpreisvertrag ändern oder erstmals anlegen.');
    }
  }
  function checkPlan(plan) {
    const {sha256, ...body} = plan;
    if (sha256 !== syncHash(body) || body.tenantId !== tenantId || body.shopDomain !== shopDomain || body.schema !== 'gravuru-font-connection/v1')
      fail('plan_changed', 'Der gespeicherte Prüfplan passt nicht mehr.');
    const t = target(body.targetId);
    if (!same(body.target, t) || !same(body.approvedSets, fixedSets)) fail('plan_changed', 'Die bestätigte Zuordnung hat sich geändert.');
    return {t, key: 'font-connect:' + sha256};
  }
  function selection(t, record, restoreRevision) {
    if (restoreRevision === null) {
      const selectedProfile = profile(t.setId);
      return {selectedProfile, assignment: {mode: 'override', profileId: selectedProfile.id}};
    }
    if (!Number.isSafeInteger(restoreRevision) || restoreRevision < 1 || restoreRevision >= record.revision)
      fail('restore_revision', 'Für den Rückweg ist ein früherer Stand desselben Produkts erforderlich.');
    return {selectedProfile: null, assignment: repository.get(record.id, {revision: restoreRevision}).document.profileAssignments.fonts};
  }
  function restoredMetadata(record, projected, restoreRevision) {
    if (restoreRevision === null) return;
    const oldMetadata = repository.get(record.id, {revision: restoreRevision}).metadata;
    assertOnlyFontMetadata(oldMetadata, projected.metadata);
    if (!same(oldMetadata.profiles?.selections?.fonts ?? null, projected.metadata.profiles?.selections?.fonts ?? null))
      fail('restore_changed', 'Die frühere wirksame Schriftauswahl lässt sich nicht unverändert wiederherstellen.');
  }
  function reviewed(t, binding, restoreRevision) {
    if (restoreRevision === null && (!Number.isSafeInteger(t.reviewedRevision) || t.reviewedRevision < 1 || binding.boundRevision !== t.reviewedRevision))
      fail('reviewed_revision', 'Ein ausdrücklich geprüfter, unveränderter gebundener Produktstand ist erforderlich.');
  }
  function sourceRecord(t, binding, recoveryPlan = null) {
    const id = t.mapping.target.productId, head = repository.get(id);
    ensureHead(id, head.revision);
    // A supplied earlier plan proves exactly which revision our atomic import
    // journal saved. A prefix or a font-only manual edit alone is NOT proof.
    // Nested plans cover consecutive interrupted retries without a new table.
    let revision = head.revision, proof = recoveryPlan;
    while (revision > binding.boundRevision) {
      if (!proof) fail('recovery_required', 'Für den gespeicherten, noch nicht gebundenen Anschluss fehlt sein ursprünglicher Prüfplan.');
      const {sha256, ...body} = proof, prior = repository.importItem('font-connect:' + sha256);
      const after = repository.get(id, {revision}), before = repository.get(id, {revision: revision - 1});
      if (syncHash(body) !== sha256 || proof.schema !== 'gravuru-font-connection/v1' || proof.tenantId !== tenantId || proof.shopDomain !== shopDomain ||
          proof.targetId !== t.id || !same(proof.target?.mapping, t.mapping) || proof.fromRevision !== revision - 1 ||
          !same(proof.binding, binding) || prior?.id !== id || prior.fingerprint !== sha256 ||
          syncHash(before.document) !== proof.beforeDocumentSha256 || syncHash(after.document) !== proof.documentSha256 || !same(after.metadata, proof.metadata))
        fail('recovery_changed', 'Der Wiederanlaufbeleg passt nicht exakt zum gespeicherten eigenen Anschluss.');
      const onlyFonts = clone(before.document); onlyFonts.profileAssignments.fonts = clone(after.document.profileAssignments.fonts);
      if (!same(onlyFonts, after.document)) fail('recovery_changed', 'Der Zwischenstand enthält weitere Produktänderungen.');
      assertOnlyFontMetadata(before.metadata, after.metadata);
      revision--; proof = proof.recoveryPlan ?? null;
    }
    if (revision !== binding.boundRevision || proof !== null) fail('recovery_changed', 'Der Wiederanlaufbeleg umfasst nicht genau die ungebundenen Zwischenstände.');
    return head;
  }
  async function plan({targetId, restoreRevision = null, recoveryPlan = null} = {}) {
    const t = target(targetId), mapping = t.mapping, binding = activation.capture(mapping);
    reviewed(t, binding, restoreRevision);
    const record = sourceRecord(t, binding, recoveryPlan);
    const {selectedProfile, assignment} = selection(t, record, restoreRevision);
    const projected = projectFontConnection({repository, record, assignment});
    if (!recoveryPlan && same(projected.document, record.document) && same(projected.metadata, record.metadata)) fail('unchanged', 'Das Produkt besitzt bereits diesen Schriftstand.');
    restoredMetadata(record, projected, restoreRevision);
    const remote = await transport.inspect(mapping);
    ensureHead(record.id, record.revision); sameBindings(mapping, binding);
    activation.checkBindings({mapping, record, binding, remote});
    const pricing = activation.prepare({mapping, record, document: projected.document, binding, remote});
    unchangedPricing(pricing, binding, projected.document);
    const body = {schema: 'gravuru-font-connection/v1', tenantId, shopDomain, targetId, target: t, approvedSets: fixedSets,
      fromRevision: record.revision, restoreRevision, recoveryPlan: clone(recoveryPlan), binding, assignment, selectedProfile,
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
    reviewed(t, plan.binding, plan.restoreRevision);
    const original = repository.get(id, {revision: plan.fromRevision});
    const selected = selection(t, original, plan.restoreRevision);
    if (!same(selected.selectedProfile, plan.selectedProfile) || !same(selected.assignment, plan.assignment))
      fail('set_changed', 'Die Zuordnung muss aus der bestätigten Schriftliste oder dem früheren Produktstand stammen.');
    if (syncHash(original.document) !== plan.beforeDocumentSha256) fail('source_changed', 'Der geprüfte Ausgangsstand stimmt nicht mehr.');
    const projected = projectFontConnection({repository, record: original, assignment: selected.assignment});
    restoredMetadata(original, projected, plan.restoreRevision);
    if (syncHash(projected.document) !== plan.documentSha256 || !same(projected.metadata, plan.metadata))
      fail('profiles_changed', 'Die Profilstände haben sich seit der Vorschau geändert.');
    const remote = await transport.inspect(mapping);
    const prior = repository.importItem(key);
    if (!prior) {
      ensureHead(id, plan.fromRevision); sameBindings(mapping, plan.binding);
      sourceRecord(t, plan.binding, plan.recoveryPlan);
    } else if (prior.id !== id || prior.fingerprint !== plan.sha256) fail('journal_conflict', 'Der Wiederanlauf gehört zu einem anderen Produktstand.');
    activation.checkBindings({mapping, record: repository.get(id), binding: plan.binding, remote});
    const pricing = activation.prepare({mapping, record: original, document: projected.document, binding: plan.binding, remote});
    unchangedPricing(pricing, plan.binding, projected.document);
    if (!same(pricing, plan.pricing)) fail('pricing_changed', 'Die geprüften Zusatzpreise haben sich geändert.');
    if (!prior) {
      repository.importBatch([{key, fingerprint: plan.sha256, action: 'update', productId: id, expectedRevision: plan.fromRevision,
        document: projected.document, expectedMetadata: plan.metadata}], {beforeWrite() {
        ensureHead(id, plan.fromRevision); sameBindings(mapping, plan.binding);
        sourceRecord(t, plan.binding, plan.recoveryPlan);
        if (plan.selectedProfile && !same(profile(t.setId), plan.selectedProfile)) fail('set_changed', 'Die Schriftliste wurde inzwischen geändert.');
      }});
    }
    const saved = repository.get(id, {revision: plan.fromRevision + 1});
    ensureHead(id, saved.revision);
    if (syncHash(saved.document) !== plan.documentSha256 || !same(saved.metadata, plan.metadata)) fail('saved_changed', 'Der gespeicherte Stand passt nicht zum Prüfplan.');
    activation.activate({operationId: key, entries: [{mapping, newRevision: saved.revision,
      documentSha256: plan.documentSha256, binding: plan.binding, pricing: plan.pricing, remote}]});
    return {productId: id, previousRevision: plan.fromRevision, revision: saved.revision, approved: activation.capture(mapping).approved};
  }
  return Object.freeze({plan, execute});
}
