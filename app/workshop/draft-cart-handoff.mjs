// Server-side composition for private, persisted form/acrylic drafts. Deliberately not
// a public HTTP route or Shopify customer-account authentication. The HTTP caller
// must enforce its host/origin/CSRF policy and derive buyerIp from trusted ingress.
import {createPersistentCartHandoff} from './cart-handoff-journal.mjs';
import {createStorefrontCartTransport} from './storefront-transport.mjs';

const fail = (status, code, message) => {
  throw Object.assign(new Error(message), {status, code, retryable: false, paymentConfirmed: false});
};
const fields = ['draftId', 'snapshotId', 'offerId', 'offerToken', 'expectedRevision'];

export function createDraftCartHandoff({drafts, config}, transportOptions = {}) {
  const transport = createStorefrontCartTransport(config, transportOptions);
  const handoff = createPersistentCartHandoff({journal: drafts.cartHandoffs, transport,
    shopDomain: config.shopDomain, apiVersion: config.apiVersion});
  const shopDomain = config.shopDomain;

  return async function submit(input, {draftToken, buyerIp, signal} = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).some(key => !fields.includes(key)) ||
        !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 1 ||
        fields.slice(0, 4).some(key => typeof input[key] !== 'string' || input[key].length > 128)) {
      fail(422, 'cart_fields', 'Nur den gespeicherten Entwurf und das bestehende Angebot angeben.');
    }
    // Copy before awaiting transport: caller mutations cannot switch ownership.
    const request = Object.freeze(Object.fromEntries(fields.map(key => [key, input[key]])));
    function resolve() {
      const acrylic = request.draftId.startsWith('adraft_');
      const draft = acrylic ? drafts.acrylicDrafts.get(request.draftId, draftToken) : drafts.get(request.draftId, draftToken);
      if (draft.revision !== request.expectedRevision) fail(409, 'cart_stale', 'Entwurf inzwischen geändert. Bitte den aktuellen Stand sichern.');
      const {manifest: m} = drafts.review(request.snapshotId);
      const ownsSnapshot = acrylic ? draft.snapshotId === request.snapshotId :
        m.source?.draftId === draft.id && m.source?.draftRevision === draft.revision;
      if (m.schema !== (acrylic ? 'gravuru-acrylic-review/v1' : 'gravuru-form-review/v1') || !ownsSnapshot || m.source?.designId !== draft.designId ||
          m.product?.id !== draft.productId || m.product?.revision !== draft.productRevision) {
        fail(404, 'cart_private', 'Dieser Prüfstand gehört nicht zum zugänglichen Entwurf.');
      }
      if (!Array.isArray(m.blockers) || m.blockers.length) fail(409, 'cart_blocked', 'Die offenen Punkte dieses Prüfstands zuerst klären.');
      return drafts.orderIntake.resolveCartOffer({...request, shopDomain});
    }
    const offer = resolve();
    const result = await handoff(offer, {principalId: 'draft:' + request.draftId, buyerIp, signal});
    // A draft can change or an order arrive during the network request. Keep the
    // journal, but never return a stale checkout capability or automatically retry.
    resolve();
    return result;
  };
}
