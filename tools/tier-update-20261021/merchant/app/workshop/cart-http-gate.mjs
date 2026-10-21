import {isIP} from 'node:net';
import {createDraftCartHandoff} from './draft-cart-handoff.mjs';

const fail = (status, code, message) => {throw Object.assign(new Error(message), {
  status, code, retryable: false, paymentConfirmed: false,
});};

// Optional server wiring for the local operator surface. No environment values
// are auto-discovered, no browser token/IP is trusted and no real shop is enabled
// by default. Hosted customer/merchant authentication remains a separate layer.
export function createCartHttpGate({drafts, repository, settings}) {
  if (!settings || settings.mode !== 'test-only' || typeof settings.resolveBuyerIp !== 'function' ||
      Object.keys(settings).some(key => !['mode', 'config', 'resolveBuyerIp', 'transportOptions'].includes(key))) {
    fail(503, 'cart_disabled', 'Die bestätigte Test-Warenkorbanbindung ist nicht eingerichtet.');
  }
  const resolveBuyerIp = settings.resolveBuyerIp;
  const submit = createDraftCartHandoff({drafts, config: settings.config}, settings.transportOptions);
  return async function send(input, {draftToken, request, signal} = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.draftId !== 'string')
      fail(422, 'cart_fields', 'Ein gespeicherter privater Entwurf ist erforderlich.');
    // Snapshot request data before any async operation or mutable request callback.
    const fixed = structuredClone(input);
    function activeProduct() {
      const draft = fixed.draftId.startsWith('adraft_') ? drafts.acrylicDrafts.get(fixed.draftId, draftToken) : drafts.get(fixed.draftId, draftToken);
      const current = repository.get(draft.productId), pinned = repository.get(draft.productId, {revision: draft.productRevision});
      if (current.status === 'archived' || pinned.status === 'archived' || pinned.document.kind !== 'product')
        fail(409, 'cart_product_unavailable', 'Dieses Produkt ist derzeit nicht für die Warenkorbübergabe freigegeben.');
    }
    activeProduct();
    if (signal?.aborted || request?.aborted) fail(409, 'cart_cancelled', 'Die Warenkorbanfrage wurde abgebrochen.');
    let buyerIp;
    try {buyerIp = await resolveBuyerIp(request);} catch {
      fail(503, 'cart_buyer_context', 'Der vertrauenswürdige Käuferkontext ist nicht verfügbar.');
    }
    if (typeof buyerIp !== 'string' || !isIP(buyerIp) || buyerIp.includes('%'))
      fail(503, 'cart_buyer_context', 'Der vertrauenswürdige Käuferkontext ist nicht verfügbar.');
    // Context resolution may be asynchronous; recheck before reserving a send.
    activeProduct();
    if (signal?.aborted || request?.aborted) fail(409, 'cart_cancelled', 'Die Warenkorbanfrage wurde abgebrochen.');
    const result = await submit(fixed, {draftToken, buyerIp, signal});
    activeProduct();
    return result;
  };
}
