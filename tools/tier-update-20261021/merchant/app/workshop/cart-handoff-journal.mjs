// Private server-side orchestration. Callers must authenticate and resolve the
// current immutable offer before invoking this module. No HTTP/UI route enabled.
import {createHash, randomUUID} from 'node:crypto';
import {prepareCartRequest} from './storefront-cart.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, code, message) => Object.assign(new Error(message), {
  status, code, retryable: false, paymentConfirmed: false,
});
const shopPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;

export function createCartHandoffJournal({database: db}) {
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS storefront_cart_handoffs (
      id TEXT PRIMARY KEY, offer_key TEXT NOT NULL UNIQUE,
      principal_hash TEXT NOT NULL, request_hash TEXT NOT NULL,
      state TEXT NOT NULL CHECK(state IN ('started','completed','failed','unknown')),
      result TEXT, created_at TEXT NOT NULL, finished_at TEXT
    );
    CREATE TRIGGER IF NOT EXISTS storefront_cart_identity_immutable
      BEFORE UPDATE OF offer_key,principal_hash,request_hash,created_at ON storefront_cart_handoffs
      BEGIN SELECT RAISE(ABORT,'Cart handoff identity is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS storefront_cart_final_immutable
      BEFORE UPDATE ON storefront_cart_handoffs WHEN OLD.state!='started'
      BEGIN SELECT RAISE(ABORT,'Final cart handoff is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS storefront_cart_no_delete
      BEFORE DELETE ON storefront_cart_handoffs
      BEGIN SELECT RAISE(ABORT,'Cart handoff needs explicit retention migration'); END;`);

  return {
    claim({offerKey, principalHash, requestHash}) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const id = 'cart_' + randomUUID();
        const inserted = db.prepare(`INSERT OR IGNORE INTO storefront_cart_handoffs
          (id,offer_key,principal_hash,request_hash,state,created_at)
          VALUES(?,?,?,?,'started',?)`).run(id, offerKey, principalHash, requestHash, new Date().toISOString());
        const row = db.prepare('SELECT * FROM storefront_cart_handoffs WHERE offer_key=?').get(offerKey);
        if (row.principal_hash !== principalHash) throw fail(404, 'cart_private', 'Diese Warenkorbübergabe ist nicht zugänglich.');
        if (row.request_hash !== requestHash) throw fail(409, 'cart_changed', 'Die gespeicherte Warenkorbübergabe gehört zu einem anderen Angebotsstand.');
        const result = row.result ? JSON.parse(row.result) : null;
        db.exec('COMMIT');
        return {id: row.id, claimed: inserted.changes === 1, state: row.state, result};
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    finish(id, state, result = null) {
      if (!['completed', 'failed', 'unknown'].includes(state)) throw fail(422, 'cart_journal', 'Ungültiger Übergabestatus.');
      const changed = db.prepare(`UPDATE storefront_cart_handoffs SET state=?,result=?,finished_at=?
        WHERE id=? AND state='started'`).run(state, result === null ? null : JSON.stringify(result), new Date().toISOString(), id);
      if (changed.changes !== 1) throw fail(409, 'cart_journal', 'Die Warenkorbübergabe wurde bereits abgeschlossen.');
    },
  };
}

function safeResult(result, offer, shopDomain) {
  let url;
  try { url = new URL(result?.checkoutUrl); } catch { /* Reject without logging raw URLs. */ }
  if (!url || url.protocol !== 'https:' || url.hostname !== shopDomain || url.port || url.username || url.password ||
      typeof result?.cartId !== 'string' || !result.cartId.startsWith('gid://shopify/Cart/') ||
      result.quantity !== offer.quantity || result.unitCents !== offer.unitCents ||
      result.totalCents !== offer.unitCents * offer.quantity || result.currency !== 'EUR' || result.paymentConfirmed !== false) {
    throw fail(502, 'cart_result', 'Warenkorbergebnis nicht bestätigt. Keine erneute automatische Anlage.');
  }
  return {cartId: result.cartId, checkoutUrl: url.href, quantity: result.quantity,
    unitCents: result.unitCents, totalCents: result.totalCents, currency: 'EUR', paymentConfirmed: false};
}

export function createPersistentCartHandoff({journal, transport, shopDomain, apiVersion}) {
  if (typeof shopDomain !== 'string' || !shopPattern.test(shopDomain) ||
      typeof apiVersion !== 'string' || !/^20\d{2}-(01|04|07|10)$/.test(apiVersion) ||
      typeof transport !== 'function' || typeof journal?.claim !== 'function' || typeof journal?.finish !== 'function') {
    throw fail(422, 'cart_config', 'Gesicherte Warenkorbübergabe ist nicht eingerichtet.');
  }
  return async function handoff(offer, {principalId, buyerIp, signal} = {}) {
    if (typeof principalId !== 'string' || principalId.length < 1 || principalId.length > 512 || /[\x00-\x1f\x7f]/.test(principalId)) {
      throw fail(401, 'cart_principal', 'Ein authentifizierter privater Zugriff ist erforderlich.');
    }
    prepareCartRequest(offer);
    // Capture only established fields; photos, credentials and arbitrary metadata
    // never enter the journal. The raw offer token is stored only as a hash.
    const fixed = Object.freeze({scope: offer.scope, variantId: offer.variantId, quantity: offer.quantity,
      unitCents: offer.unitCents, currency: offer.currency,
      property: Object.freeze({name: offer.property.name, value: offer.property.value}),
      ...(offer.personalization?{personalization:Object.freeze({...offer.personalization})}:{})});
    let ticket;
    try {
      ticket = journal.claim({offerKey: hash(JSON.stringify([shopDomain, fixed.property.value])),
        principalHash: hash(principalId), requestHash: hash(JSON.stringify([shopDomain, apiVersion, fixed]))});
    } catch (error) {
      if (['cart_private', 'cart_changed'].includes(error?.code)) throw error;
      throw fail(503, 'cart_storage', 'Warenkorbübergabe konnte nicht privat gesichert werden. Anfrage nicht versendet.');
    }
    if (!ticket.claimed) {
      if (ticket.state === 'completed') return {...safeResult(ticket.result, fixed, shopDomain), duplicate: true};
      throw fail(409, 'cart_review', 'Warenkorbübergabe bereits begonnen oder fehlgeschlagen. Status prüfen; nicht automatisch erneut anlegen.');
    }
    let result;
    try {
      result = safeResult(await transport(fixed, {buyerIp, signal}), fixed, shopDomain);
    } catch (error) {
      // Even a restart with an unfinished 'started' entry blocks another send.
      // No transport error messages or response bodies are persisted or exposed.
      try { journal.finish(ticket.id, error?.mayHaveCreatedCart === false ? 'failed' : 'unknown'); } catch { /* 'started' also blocks resending. */ }
      throw fail(502, 'cart_review', 'Warenkorbübergabe nicht bestätigt. Gespeicherten Status prüfen; keine automatische Wiederholung.');
    }
    try { journal.finish(ticket.id, 'completed', result); } catch {
      throw fail(503, 'cart_storage', 'Shopantwort konnte nicht gesichert werden. Keine Weiterleitung oder erneute automatische Anlage.');
    }
    return {...result, duplicate: false};
  };
}
