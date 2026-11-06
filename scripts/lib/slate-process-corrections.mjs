// Explicit, visually confirmed corrections only. Never infer process from a colour threshold.
export function correctSlateProcesses(rows, plan, products = []) {
  for (const [id, rule] of Object.entries(plan.designs)) {
    const row = rows.find(r => r.id === id);
    if (!row) throw Error('Correction source missing: ' + id);
    if (!['Gravur', 'UV'].includes(rule.to) || row.files.find(f => f.name === 'preview.png')?.sha256 !== rule.previewSha256) throw Error('Correction evidence changed: ' + id);
    if (row.process !== rule.from && !(row.process === rule.to && row.processCorrection?.previewSha256 === rule.previewSha256)) throw Error('Unexpected source process: ' + id);
    if (row.targets?.some(t => t.status === 'prepared') || products.some(p => p.designIds.includes(id))) throw Error('Prepared design requires explicit migration: ' + id);
  }
  return rows.map(row => {
    const rule = plan.designs[row.id];
    if (!rule) return row;
    const result = {...row, process: rule.to, normalized: false, status: 'open', reason: rule.reason,
      processCorrection: {...rule, approval: plan.approval}};
    delete result.technicalChanges; // Previous engraving normalization is not a print preparation.
    return result;
  });
}
