// Version 1 of the line properties written by the isolated F02 storefront.
// The approved binding comes from the workshop, separately from the order.
export const F02_SHOP = 'gravuru-f02-test.myshopify.com';
const numericId = value => typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value);
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

export function f02Binding(shop, input) {
  if (shop !== F02_SHOP || input?.shop !== shop || !numericId(input.product) || !numericId(input.variant)
      || typeof input.revision!=='string' || !/^[a-f0-9]{64}$/.test(input.revision) || input.unitCents !== 1099) {
    throw Error('Die F02-Freigabe für Testshop, Artikel, Variante, Revision und 10,99 € fehlt.');
  }
  const {product, variant, revision, unitCents, sku} = input;
  return {shop, product, variant, revision, unitCents, sku};
}

export function confirmF02Price(money,binding) {
  if (money?.currencyCode !== 'EUR' || typeof money.amount !== 'string' || !/^\d+(\.\d{1,2})?$/.test(money.amount)
      || Math.round(Number(money.amount) * 100) !== binding.unitCents) throw Error('Preis oder Währung der F02-Position weicht ab.');
}

export function readF02Line(attributes, binding) {
  const fields = new Map();
  for (const {key, value} of attributes) {
    if (!key.startsWith('_gravuru_')) continue;
    if (fields.has(key)) throw Error('Doppelte F02-Gestaltungsangabe.');
    fields.set(key, value);
  }
  const reference = fields.get('_gravuru_ref');
  const parts = fields.get('_gravuru_parts');
  const count = Number(parts);
  if (!uuid(reference) || !Number.isInteger(count) || count < 1 || count > 64
      || String(count) !== parts || fields.size !== count + 2) {
    throw Error('Die F02-Gestaltung ist unvollständig oder mehrdeutig.');
  }
  const encoded = [];
  for (let i = 0; i < count; i++) {
    const part = fields.get('_gravuru_data_' + i);
    if (typeof part !== 'string' || !part.length || part.length > 176) throw Error('Gestaltungsabschnitt fehlt.');
    encoded.push(part);
  }
  const source = encoded.join('');
  const bytes = Buffer.from(source, 'base64');
  if (bytes.toString('base64') !== source) throw Error('Ungültige F02-Gestaltungsdaten.');
  const data = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
  if (!record(data) || Object.keys(data).sort().join(',') !== 'design,edits,motifs,revision,version'
      || data.version !== 1 || data.revision !== binding.revision || typeof data.design !== 'string'
      || !record(data.edits) || !record(data.motifs)) throw Error('Unbekannte F02-Gestaltung oder Revision.');
  return {reference, design:data.design, revision:data.revision, edits:data.edits, motifs:data.motifs};
}
