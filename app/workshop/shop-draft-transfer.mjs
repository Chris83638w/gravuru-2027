import {createHash, randomUUID} from 'node:crypto';
import {tenantOption,ensureTenantColumn,TENANT_COLUMN} from './tenant.mjs';
import {prepareShopProduct} from './shop-preparation.mjs';

const fail = (status, message) => {throw Object.assign(Error(message), {status, code: 'shop_draft_transfer'});};
const hash = value => createHash('sha256').update(value).digest('hex');
const shopPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$/;
const fields = 'id handle title status tags seo { title description } variants(first: 100) { nodes { id price selectedOptions { name value } } pageInfo { hasNextPage } }';
export const SHOP_DRAFT_LOOKUP = `query GravuruDraftLookup($query: String!) { shop { myshopifyDomain currencyCode } products(first: 2, query: $query) { nodes { ${fields} } pageInfo { hasNextPage } } }`;
export const SHOP_DRAFT_CREATE = `mutation GravuruDraftCreate($input: ProductSetInput!) { productSet(input: $input, synchronous: true) { product { ${fields} } userErrors { field code message } } }`;

export function shopDraftRequest(record, shopDomain) {
  if (!shopPattern.test(shopDomain || '')) fail(422, 'Bestätigte Shop-Domain fehlt.');
  const plan = prepareShopProduct(record);
  if (!plan.sourceReady || !plan.variants.length || plan.variants.length > 100) fail(422, 'Vollständiges Produkt mit 1 bis 100 Ausführungen erforderlich.');
  const groups = record.document.config?.profile.optionGroups || [];
  const options = groups.length ? groups.map(g => ({name: g.name, values: g.values.map(v => ({name: v.label || v.id}))})) : [{name: 'Ausführung', values: [{name: 'Standard'}]}];
  const text = value => typeof value === 'string' && value.length > 0 && value.length <= 255 && !/[\x00-\x1f]/.test(value);
  if (options.length > 3 || new Set(options.map(o=>o.name)).size !== options.length || options.some(o=>!text(o.name)||new Set(o.values.map(v=>v.name)).size!==o.values.length||o.values.some(v=>!text(v.name)))) fail(422, 'Bis zu drei eindeutig benannte Optionsgruppen mit eindeutigen Werten erforderlich.');
  const selections = plan.variants.map(v => groups.length ? groups.map(g=>({name:g.name,value:g.values.find(x=>x.id===v.options[g.id]).label||v.options[g.id]})) : [{name:'Ausführung',value:'Standard'}]);
  // Physical options retain their existing groups. Designs are not extra variants.
  const identity = hash(JSON.stringify([shopDomain, record.id])), handle = 'gravuru-' + identity;
  const input = {title: plan.title, status: 'DRAFT', handle, tags: ['gravuru-source-' + plan.sha256],
    seo: {title: plan.seo.title || '', description: plan.seo.description || ''},
    productOptions: options.map((o,i)=>({...o,position:i+1})),
    variants: plan.variants.map((v, index) => ({price: (v.priceCents / 100).toFixed(2), optionValues: selections[index].map(o=>({optionName:o.name,name:o.value}))}))};
  return {identity, sourceSha256: plan.sha256, productId: record.id, revision: record.revision, shopDomain,
    handle, input, mappings: plan.variants.map((v, i) => ({key: v.key, options: selections[i], priceCents: v.priceCents})),
    requestSha256: hash(JSON.stringify(input))};
}

function verifyProduct(product, request) {
  if (!/^gid:\/\/shopify\/Product\/[1-9][0-9]*$/.test(product?.id || '') || product.handle !== request.handle || product.title !== request.input.title || product.status !== 'DRAFT' || !Array.isArray(product.tags) || !product.tags.includes(request.input.tags[0]) || product.variants?.pageInfo?.hasNextPage !== false || !Array.isArray(product.variants.nodes) || product.variants.nodes.length !== request.mappings.length) fail(409, 'Shop-Entwurf ist nicht vollständig dem gespeicherten Produktstand zugeordnet.');
  if (!product.seo || (product.seo.title || '') !== request.input.seo.title || (product.seo.description || '') !== request.input.seo.description) fail(409, 'SEO-Angaben des Shop-Entwurfs stimmen nicht überein.');
  const used = new Set(), mappings = request.mappings.map(expected => {
    const matches = product.variants.nodes.filter(v => v.selectedOptions?.length === expected.options.length && expected.options.every(o=>v.selectedOptions.filter(x=>x.name===o.name&&x.value===o.value).length===1));
    const v = matches[0], id = v?.id?.match(/^gid:\/\/shopify\/ProductVariant\/([1-9][0-9]{0,19})$/)?.[1];
    const match = typeof v?.price === 'string' && v.price.match(/^(\d+)\.(\d{1,2})$/);
    const cents = match ? Number(match[1]) * 100 + Number(match[2].padEnd(2, '0')) : NaN;
    if (matches.length !== 1 || !id || used.has(id) || !Number.isSafeInteger(cents) || cents !== expected.priceCents) fail(409, 'Shop-Varianten oder Preise stimmen nicht vollständig überein.');
    used.add(id); return {key: expected.key, variantId: id};
  });
  return {shopifyProductId: product.id, handle: product.handle, status: 'DRAFT', mappings, published: false, imagesTransferred: false};
}

export function createShopDraftTransport(config, {fetchImpl = globalThis.fetch, timeoutMs = 15000} = {}) {
  if (!config || !shopPattern.test(config.shopDomain || '') || config.apiVersion !== '2026-07' || !(typeof config.getAccessToken==='function'||typeof config.accessToken==='string'&&/^[\x21-\x7e]{16,4096}$/.test(config.accessToken)) || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) fail(503, 'Shop-Entwurfsanbindung ist nicht eingerichtet.');
  const endpoint = `https://${config.shopDomain}/admin/api/${config.apiVersion}/graphql.json`;
  async function execute(query, variables, signal) {
    const controller = new AbortController(), combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const timer = setTimeout(() => controller.abort(), timeoutMs); let reader;
    try {
      if (combined.aborted) fail(409, 'Übertragung abgebrochen.');
      const accessToken=config.getAccessToken?await config.getAccessToken():config.accessToken;
      const response = await fetchImpl(endpoint, {method: 'POST', redirect: 'manual', cache: 'no-store', signal: combined,
        headers: {'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': accessToken}, body: JSON.stringify({query, variables})});
      if (!response.ok || response.redirected || response.headers.get('x-shopify-api-version') !== config.apiVersion || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '') || !response.body) fail(502, 'Shop-Antwort nicht bestätigt. Status prüfen; keine automatische Wiederholung.');
      reader = response.body.getReader(); const chunks = []; let size = 0;
      for (;;) {const {value, done} = await reader.read(); if (combined.aborted) fail(409, 'Übertragung abgebrochen.'); if (done) break; size += value.byteLength; if (size > 1024 * 1024) fail(502, 'Shop-Antwort zu groß.'); chunks.push(Buffer.from(value));}
      const value = JSON.parse(Buffer.concat(chunks).toString());
      if (value.errors !== undefined && (!Array.isArray(value.errors) || value.errors.length) || !value.data) fail(502, 'Shop-Anfrage nicht bestätigt. Status prüfen.');
      return value.data;
    } catch {fail(502, 'Shop-Ergebnis unbestätigt. Status prüfen; nicht erneut anlegen.');}
    finally {clearTimeout(timer); if (reader) try {await reader.cancel();} catch { /* Never expose raw upstream errors. */ }}
  }
  return {
    async lookup(request, {signal} = {}) {
      const data = await execute(SHOP_DRAFT_LOOKUP, {query: 'handle:' + request.handle + ' AND status:active,draft,archived,unlisted'}, signal);
      if (data.shop?.myshopifyDomain !== config.shopDomain || data.shop.currencyCode !== 'EUR' || !Array.isArray(data.products?.nodes) || data.products.pageInfo?.hasNextPage !== false) fail(409, 'Shop, Euro-Währung oder Suchergebnis nicht bestätigt.');
      if (!data.products.nodes.length) return null;
      if (data.products.nodes.length !== 1) fail(409, 'Mehrere mögliche Shop-Entwürfe. Manuell prüfen.');
      return verifyProduct(data.products.nodes[0], request);
    },
    async create(request, {signal} = {}) {
      const data = await execute(SHOP_DRAFT_CREATE, {input: request.input}, signal), result = data.productSet;
      if (!Array.isArray(result?.userErrors) || result.userErrors.length) fail(409, 'Shop hat die Entwurfsanlage nicht bestätigt. Status prüfen.');
      return verifyProduct(result.product, request);
    }
  };
}

export function createShopDraftJournal({database: db, tenantId}) {
  const tenant = tenantOption({tenantId});
  db.exec(`CREATE TABLE IF NOT EXISTS shop_draft_transfers(id TEXT PRIMARY KEY,identity TEXT UNIQUE NOT NULL,source_sha TEXT NOT NULL,request TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('started','unknown','completed')),result TEXT,created_at TEXT NOT NULL,${TENANT_COLUMN});
    CREATE TRIGGER IF NOT EXISTS shop_transfer_fixed BEFORE UPDATE OF identity,source_sha,request,created_at ON shop_draft_transfers BEGIN SELECT RAISE(ABORT,'Transfer identity is immutable');END;
    CREATE TRIGGER IF NOT EXISTS shop_transfer_completed BEFORE UPDATE ON shop_draft_transfers WHEN OLD.state='completed' BEGIN SELECT RAISE(ABORT,'Completed transfers are immutable');END;
    CREATE TRIGGER IF NOT EXISTS shop_transfer_keep BEFORE DELETE ON shop_draft_transfers BEGIN SELECT RAISE(ABORT,'Transfers require explicit retention');END;`);
  ensureTenantColumn(db, 'shop_draft_transfers');
  const byIdentity = identity => db.prepare('SELECT * FROM shop_draft_transfers WHERE identity=? AND tenant_id=?').get(identity, tenant);
  const publicRow = row => row ? {id: row.id, state: row.state, sourceSha256: row.source_sha, result: row.result ? JSON.parse(row.result) : null, createdAt: row.created_at} : null;
  return {
    get: identity => publicRow(byIdentity(identity)),
    // B1 (Konfis): abgeschlossene Übertragungen je Produkt, nur lesend (Shopify-Produkt-ID und Handle aus dem Journal).
    completed: () => db.prepare("SELECT request,result FROM shop_draft_transfers WHERE state='completed' AND tenant_id=? ORDER BY rowid DESC").all(tenant).map(row => {const request = JSON.parse(row.request), result = JSON.parse(row.result || 'null'); return {productId: request.productId, revision: request.revision, shopDomain: request.shopDomain, shopifyProductId: result?.shopifyProductId || null, handle: result?.handle || request.handle || null, status: result?.status || null};}),
    claim(request) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const old = byIdentity(request.identity);
        if (old && (old.source_sha !== request.sourceSha256 || JSON.parse(old.request).requestSha256 !== request.requestSha256)) fail(409, 'Dieses Produkt hat bereits einen anderen Übertragungsstand. Keine zweite Anlage; Änderung gesondert prüfen.');
        if (old) {db.exec('COMMIT'); return {...publicRow(old), claimed: false};}
        db.prepare('INSERT INTO shop_draft_transfers(id,identity,source_sha,request,state,result,created_at,tenant_id) VALUES(?,?,?,?,?,?,?,?)').run('transfer_' + randomUUID(), request.identity, request.sourceSha256, JSON.stringify(request), 'started', null, new Date().toISOString(), tenant);
        const row = publicRow(byIdentity(request.identity)); db.exec('COMMIT'); return {...row, claimed: true};
      } catch (e) {db.exec('ROLLBACK'); throw e;}
    },
    finish(identity, result) {
      const row = byIdentity(identity); if (!row) fail(409, 'Übertragungsjournal fehlt.');
      if (row.state === 'completed') {if (row.result !== JSON.stringify(result)) fail(409, 'Widersprüchliche Übertragungsergebnisse.'); return;}
      db.prepare("UPDATE shop_draft_transfers SET state='completed',result=? WHERE identity=? AND state!='completed' AND tenant_id=?").run(JSON.stringify(result), identity, tenant);
    },
    unknown(identity) {db.prepare("UPDATE shop_draft_transfers SET state='unknown' WHERE identity=? AND state='started' AND tenant_id=?").run(identity, tenant);}
  };
}

export function createShopDraftTransfer({repository, orders, journal, config, transport}) {
  if (config?.mode !== 'draft-only' || !shopPattern.test(config.shopDomain || '')) fail(503, 'Entwurfsübertragung ist nicht eingerichtet.');
  const client = transport || createShopDraftTransport(config);
  function recordFor(id, revision) {
    const record = repository.get(id);
    if (record.revision !== revision || record.status === 'archived') fail(409, 'Produktstand wurde geändert oder archiviert. Bitte neu prüfen.');
    return record;
  }
  return async ({productId, expectedRevision, sourceSha256, action}, principal, {signal} = {}) => {
    if (principal?.role !== 'merchant' || principal.shopDomain !== config.shopDomain) fail(403, 'Bestätigte Händleranmeldung für diesen Shop erforderlich.');
    if (!['create', 'reconcile'].includes(action) || !Number.isSafeInteger(expectedRevision)) fail(422, 'Gültige Aktion und Produktrevision erforderlich.');
    const record = recordFor(productId, expectedRevision), request = shopDraftRequest(record, config.shopDomain);
    if (request.sourceSha256 !== sourceSha256) fail(409, 'Produktvorbereitung wurde geändert. Bitte neu prüfen.');
    if (signal?.aborted) fail(409, 'Vor dem Versand abgebrochen.');
    if (action === 'reconcile' && !journal.get(request.identity)) fail(409, 'Es wurde noch keine Übertragung begonnen.');
    if (!journal.get(request.identity) && orders.bindings().some(b=>b.shopDomain===config.shopDomain&&b.productId===productId)) fail(409, 'Dieses Produkt besitzt bereits Shop-Variantenbindungen. Bestehende Produktzuordnung prüfen statt ein zweites Produkt anlegen.');
    const ticket = journal.claim(request); let result = ticket.result;
    if (ticket.state !== 'completed') {
      if (!ticket.claimed && action !== 'reconcile') fail(409, 'Übertragung bereits begonnen. Status prüfen statt erneut anlegen.');
      try {
        result = await client.lookup(request, {signal});
        if (!result) {
          if (!ticket.claimed || action !== 'create') fail(409, 'Kein bestätigter Entwurf gefunden. Die erste Anfrage kann noch laufen; keine erneute Anlage.');
          recordFor(productId, expectedRevision);
          if (signal?.aborted) fail(409, 'Vor der Anlage abgebrochen.');
          result = await client.create(request, {signal});
        }
        journal.finish(request.identity, result);
      } catch (error) {journal.unknown(request.identity); throw error;}
    }
    // A successful remote write is retained even if local edits or binding conflicts
    // occurred meanwhile. Retrying local binding never repeats the mutation.
    recordFor(productId, expectedRevision);
    const bound = orders.bindVariants({record, shopDomain: config.shopDomain, mappings: result.mappings});
    return {...journal.get(request.identity), bindings: bound.bindings, bindingsConfirmed:true, scope: 'draft-only', published: false};
  };
}
