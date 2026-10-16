// Retention preview ONLY. There is deliberately no storage, delete or scheduling API.
const DAY = 86400000;
const CLASSES = new Set(['order_core', 'fulfillment_pii', 'custom_assets', 'legal_accounting_record', 'security_audit']);
const PII = new Set(['fulfillment_pii', 'custom_assets']);
const fail = () => { throw Object.assign(new Error('Aufbewahrungsdaten unvollständig oder widersprüchlich.'), { status: 422, code: 'amazon_retention' }); };
const text = v => typeof v === 'string' && v.length > 0 && v.length <= 160 && !/[\u0000-\u001f\u007f]/u.test(v);
const time = value => {
  if (value == null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) fail();
  const n = Date.parse(value);
  if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 19) !== value.slice(0, 19)) fail();
  return n;
};
const iso = value => value === null ? null : new Date(value).toISOString();

/** Each record uses an OPAQUE internal id, never names, addresses or payloads.
 * policy is mandatory and explicitly approved; it never enables deletion.
 * Optional postShipmentDays (0..7) is a reviewed internal deadline, not Amazon law.
 */
export function planAmazonRetention({ records, now, policy = {} } = {}) {
  const current = time(now);
  if (current === null || !Array.isArray(records) || records.length > 10000 || policy === null || typeof policy !== 'object' || Array.isArray(policy)) fail();
  if (policy.postShipmentDays != null && (!Number.isInteger(policy.postShipmentDays) || policy.postShipmentDays < 0 || policy.postShipmentDays > 7)) fail();
  const approved = policy.reviewed === true && text(policy.version);
  const seen = new Set();
  const decisions = records.map(record => {
    if (!record || typeof record !== 'object' || !text(record.id) || seen.has(record.id) || !CLASSES.has(record.dataClass)) fail();
    seen.add(record.id);
    const shipped = time(record.shippedAt), delivered = time(record.deliveredAt), purpose = time(record.purposeCompletedAt),
      revoked = time(record.authorizationRevokedAt), explicit = time(record.retentionDueAt);
    if ((shipped !== null && shipped > current) || (delivered !== null && delivered > current) ||
        (shipped !== null && delivered !== null && delivered < shipped) || (revoked !== null && revoked > current) ||
        (purpose !== null && purpose > current)) fail();
    const base = { id: record.id, dataClass: record.dataClass, action: 'review', dueAt: null, reasons: [] };
    if (!approved) return { ...base, reasons: ['policy_not_reviewed'] };
    // No global legalHold boolean: a specific basis and expiry must be documented.
    if (record.legalException != null) {
      const hold = record.legalException, expiry = time(hold.retainUntil);
      if (!hold || typeof hold !== 'object' || !text(hold.basis) || !text(hold.documentClass) ||
          !text(hold.reviewedBy) || time(hold.reviewedAt) === null || time(hold.reviewedAt) > current || expiry === null) {
        return { ...base, reasons: ['legal_exception_incomplete'] };
      }
      if (revoked !== null) return { ...base, dueAt: iso(revoked + 30 * DAY), reasons: ['revocation_with_legal_exception_requires_review'] };
      return { ...base, action: expiry <= current ? 'review' : 'retain_legal', dueAt: iso(expiry),
        reasons: [expiry <= current ? 'legal_exception_expired_review_required' : 'documented_legal_exception'] };
    }
    if (record.dataClass === 'legal_accounting_record') return { ...base, reasons: ['legal_basis_and_expiry_required'] };
    const deadlines = [];
    if (purpose !== null) deadlines.push([purpose, 'purpose_completed']);
    if (explicit !== null) deadlines.push([explicit, 'reviewed_record_deadline']);
    if (revoked !== null) deadlines.push([revoked + 30 * DAY, 'authorization_revoked']);
    if (PII.has(record.dataClass)) {
      if (delivered !== null) deadlines.push([delivered + 30 * DAY, 'amazon_delivery_limit']);
      if (shipped !== null && policy.postShipmentDays != null) deadlines.push([shipped + policy.postShipmentDays * DAY, 'reviewed_internal_shipping_rule']);
    }
    if (!deadlines.length) return { ...base, reasons: [PII.has(record.dataClass) ? 'purpose_or_delivery_deadline_missing' : 'documented_deadline_required'] };
    deadlines.sort((a, b) => a[0] - b[0]);
    const earliest = deadlines[0][0];
    return { ...base, action: earliest <= current ? 'delete_candidate' : 'retain_until', dueAt: iso(earliest),
      reasons: deadlines.filter(d => d[0] === earliest).map(d => d[1]) };
  });
  return { schema: 'gravuru-amazon-retention-preview/v1', dryRun: true, deletionEnabled: false,
    generatedAt: iso(current), policyVersion: approved ? policy.version : null, decisions,
    counts: Object.fromEntries(['review', 'retain_legal', 'retain_until', 'delete_candidate'].map(action => [action, decisions.filter(d => d.action === action).length])) };
}
