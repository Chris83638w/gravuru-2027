// Server-side composition for private, persisted form/acrylic drafts. Deliberately not
// a public HTTP route or Shopify customer-account authentication. The HTTP caller
// must enforce its host/origin/CSRF policy and derive buyerIp from trusted ingress.
import {createPersistentCartHandoff} from './cart-handoff-journal.mjs';
import {createStorefrontCartTransport} from './storefront-transport.mjs';
import {isNativeReviewSchema} from './native-review-schema.mjs';
import {CART_CONFIG_ID, CART_LINE_ID} from './cart-configuration.mjs';
import {editLink} from './storefront-cart.mjs';

const fail = (status, code, message) => {
  throw Object.assign(new Error(message), {status, code, retryable: false, paymentConfirmed: false});
};
const fields = ['draftId', 'snapshotId', 'offerId', 'offerToken', 'expectedRevision'];
// K8 (Ü9.1): optional – `configId` bestätigt die Konfiguration aus dem Bearbeiten-Link,
// `cartLineId` meldet, dass der Kunde die Warenkorbzeile noch vor sich hat (Ersetzen statt Anlegen).
const optional = ['configId', 'cartLineId'];

export function createDraftCartHandoff({drafts, config, reviewPolicy = null}, transportOptions = {}) {
  // `editUrl` (optional, https) wird als sichtbare Eigenschaft „Bearbeiten“ mitgegeben; der Transport kennt sie nicht.
  const {editUrl, ...transportConfig} = config ?? {};
  if (editUrl !== undefined) editLink(editUrl, {id: 'konfig_' + '0'.repeat(36), rev: 1});
  const transport = createStorefrontCartTransport(transportConfig, transportOptions);
  const handoff = createPersistentCartHandoff({journal: drafts.cartHandoffs, transport,
    shopDomain: config.shopDomain, apiVersion: config.apiVersion});
  const shopDomain = config.shopDomain, ledger = drafts.cartConfigurations;
  if (typeof ledger?.assign !== 'function') fail(503, 'cart_config', 'Das Konfigurationsregister ist nicht eingerichtet.');

  return async function submit(input, {draftToken, buyerIp, signal, existingCart} = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some(key => !fields.includes(key) && !optional.includes(key)) ||
        !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 ||
        fields.slice(0, 4).some(key => typeof input[key] !== 'string' || input[key].length > 128) ||
        (input.configId !== undefined && (typeof input.configId !== 'string' || !CART_CONFIG_ID.test(input.configId))) ||
        (input.cartLineId !== undefined && (typeof input.cartLineId !== 'string' || input.cartLineId.length < 1 || input.cartLineId.length > 512 || /[\x00-\x1f\x7f]/.test(input.cartLineId)))) {
      fail(422, 'cart_fields', 'Nur den gespeicherten Entwurf und das bestehende Angebot angeben.');
    }
    // Copy before awaiting transport: caller mutations cannot switch ownership.
    const request = Object.freeze(Object.fromEntries([...fields, ...optional].filter(key => input[key] !== undefined).map(key => [key, input[key]])));
    // Only the authenticated server gateway may supply a previously owned cart.
    const addTo=existingCart===undefined?undefined:Object.freeze({...existingCart});
    function resolve() {
      const acrylic = request.draftId.startsWith('adraft_');
      const draft = acrylic ? drafts.acrylicDrafts.get(request.draftId, draftToken) : drafts.get(request.draftId, draftToken);
      if (draft.revision !== request.expectedRevision) fail(409, 'cart_stale', 'Entwurf inzwischen geändert. Bitte den aktuellen Stand sichern.');
      const {manifest: m} = drafts.review(request.snapshotId);
      const ownsSnapshot = acrylic ? draft.snapshotId === request.snapshotId :
        m.source?.draftId === draft.id && m.source?.draftRevision === draft.revision;
      if (!(acrylic ? isNativeReviewSchema(m.schema) : m.schema === 'gravuru-form-review/v1') || !ownsSnapshot || m.source?.designId !== draft.designId ||
          m.product?.id !== draft.productId || m.product?.revision !== draft.productRevision) {
        fail(404, 'cart_private', 'Dieser Prüfstand gehört nicht zum zugänglichen Entwurf.');
      }
      if(reviewPolicy)reviewPolicy(m);
      else if (!Array.isArray(m.blockers) || m.blockers.length) fail(409, 'cart_blocked', 'Die offenen Punkte dieses Prüfstands zuerst klären.');
      // Ein Bearbeiten-Link darf nur die Konfiguration des zugänglichen Entwurfs nennen.
      const known = ledger.forDraft(draft.id);
      if (request.configId !== undefined && (!known || known.id !== request.configId)) fail(404, 'cart_private', 'Diese Konfiguration gehört nicht zum zugänglichen Entwurf.');
      const offer=drafts.orderIntake.resolveCartOffer({...request, shopDomain});
      if(acrylic && m.selection?.price && offer.quantity!==m.selection.price.quantity)fail(409,'cart_stale','Menge und gesicherter Prüfstand stimmen nicht überein.');
      return {draft, offer};
    }
    const {draft, offer} = resolve();
    // Revision 1 bei der ersten Übergabe, sonst n+1; dasselbe Angebot behält seine Revision (Wiederholung).
    const assigned = ledger.assign({draftId: draft.id, draftRevision: draft.revision, snapshotId: request.snapshotId, offerId: offer.id, productId: draft.productId});
    const configuration = Object.freeze({id: assigned.id, rev: assigned.rev, ...(editUrl === undefined ? {} : {editUrl})});
    let replace = null;
    if (request.cartLineId !== undefined) {
      // Bearbeiten: die zuletzt bestätigte Warenkorbzeile dieser Konfiguration wird ersetzt – nie dupliziert.
      const anchor = ledger.lastCartLine(assigned.id, {before: assigned.rev});
      if (!anchor) fail(409, 'cart_line_unknown', 'Zu dieser Konfiguration ist keine Warenkorbzeile bekannt. Bitte die Gestaltung normal in den Warenkorb legen.');
      if (!CART_LINE_ID.test(request.cartLineId) || request.cartLineId !== anchor.lineId) fail(409, 'cart_line_mismatch', 'Die Warenkorbzeile gehört nicht zu dieser Konfiguration. Bitte den Warenkorb neu laden.');
      if(addTo && (Object.keys(addTo).length!==1 || addTo.cartId!==anchor.cartId))fail(409,'cart_line_mismatch','Der bestehende Warenkorb passt nicht zur Konfiguration.');
      replace = {cartId: anchor.cartId, lineId: anchor.lineId};
    }
    const result = await handoff({...offer, configuration}, {principalId: 'draft:' + request.draftId, buyerIp, signal, ...(replace ? {replace} : addTo ? {addTo} : {})});
    ledger.attachCartLine(assigned.id, assigned.rev, {cartId: result.cartId, lineId: result.lineId});
    // A draft can change or an order arrive during the network request. Keep the
    // journal, but never return a stale checkout capability or automatically retry.
    resolve();
    return {...result, configuration: {id: assigned.id, rev: assigned.rev}};
  };
}
