// Metadata-only test inspector. File contents are read only after explicit submit.
export function initializeAmazonCustomUI({ request } = {}) {
  const host = document.querySelector('#view-custom');
  if (!host || host.querySelector('#amazon-custom-inspector')) return null;
  if (typeof request !== 'function') throw Error('Die geschützte Werkstattanbindung fehlt.');
  const el = (tag, text, attrs = {}) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value); return node; };
  const panel = el('section', undefined, { id: 'amazon-custom-inspector', class: 'panel' });
  panel.append(el('h3', 'Custom-Testdatei prüfen'), el('p', 'Prüfe eine synthetische oder bereits anonymisierte JSON-/ZIP-Datei. Angezeigt werden Dateiinventar, Prüfsummen und mögliche Feldpfade. Die Prüfung erzeugt keine fertige Gestaltung und speichert keinen Produktionsauftrag.'));
  const form = el('form'), fileLabel = el('label', 'Testdatei auswählen '), file = el('input', undefined, { type: 'file', accept: '.json,.zip,application/json,application/zip', required: '', 'aria-label': 'Custom-Testdatei' });
  fileLabel.append(file);
  const classificationLabel = el('label', ' Art der Testdaten '), classification = el('select', undefined, { required: '', 'aria-label': 'Art der Custom-Testdaten' });
  for (const [value, label] of [['', 'Bitte auswählen'], ['synthetic', 'Synthetisch erstellt'], ['anonymized', 'Bereits anonymisiert']]) classification.append(el('option', label, { value }));
  classificationLabel.append(classification);
  const approvalLabel = el('label'), approval = el('input', undefined, { type: 'checkbox', 'aria-label': 'Testdaten ausdrücklich freigeben' });
  approvalLabel.append(approval, document.createTextNode(' Ich bestätige: Die Datei enthält ausschließlich freigegebene Testdaten und keine echten personenbezogenen Kundenangaben.'));
  const button = el('button', 'Testdatei prüfen', { type: 'submit' }); button.disabled = true;
  const notice = el('p', 'JSON bis 1 MiB, ZIP bis 8 MiB. XML und SVG werden nicht als Gestaltung übernommen.', { role: 'status', 'aria-live': 'polite' });
  const result = el('div'); let busy = false;
  form.append(fileLabel, classificationLabel, approvalLabel, button); panel.append(form, notice, result); host.append(panel);
  const enabled = () => { button.disabled = busy || !file.files?.length || !['synthetic', 'anonymized'].includes(classification.value) || !approval.checked; };
  for (const control of [file, classification, approval]) control.addEventListener('change', enabled);
  const render = report => {
    result.replaceChildren();
    result.append(el('p', `Original: ${report.originalBytes} Bytes · SHA-256 ${report.originalSha256}`),
      el('p', 'Prüfung erforderlich. Mögliche Felder sind noch keinem bestätigten Amazon-Custom-Schema oder Produktionsformat zugeordnet.'));
    const table = el('table'), head = el('thead'), row = el('tr');
    for (const title of ['Datei', 'Typ / Prüfung', 'Größe', 'SHA-256']) row.append(el('th', title));
    head.append(row); const body = el('tbody');
    for (const entry of report.inventory ?? []) { const tr = el('tr'); for (const value of [entry.name, `${entry.type} / ${entry.inspection}`, entry.bytes, entry.sha256]) tr.append(el('td', String(value))); body.append(tr); }
    table.append(head, body); result.append(table);
    const showFields = (title, entries) => {
      result.append(el('h4', `${title} (${entries.length})`)); const list = el('ul');
      for (const entry of entries.slice(0, 100)) list.append(el('li', `${entry.file} · ${entry.path || '/'} · ${entry.kind ?? entry.type}`));
      result.append(list); if (entries.length > 100) result.append(el('p', 'Die Anzeige ist auf die ersten 100 Feldpfade begrenzt.'));
    };
    showFields('Mögliche Feldpfade', report.candidates ?? []); showFields('Unbekannte Felder', report.unknownFields ?? []);
    result.append(el('p', 'Personalisierungswerte und Bilder werden hier nicht angezeigt. XML bleibt unverarbeitet; SVG wird nicht gerendert.'));
  };
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || button.disabled) return;
    const selected = file.files?.[0], selectedClassification = classification.value;
    if (!selected || !approval.checked || !['synthetic', 'anonymized'].includes(selectedClassification)) return;
    const extension = selected.name.toLowerCase().split('.').at(-1), format = ['json', 'zip'].includes(extension) ? extension : null;
    if (!format || selected.size < 1 || selected.size > (format === 'json' ? 1024 * 1024 : 8 * 1024 * 1024)) { notice.textContent = 'Bitte eine JSON-Datei bis 1 MiB oder ein ZIP bis 8 MiB auswählen.'; return; }
    busy = true; enabled(); notice.textContent = 'Die freigegebene Testdatei wird geprüft …'; result.replaceChildren();
    try {
      const bytes = new Uint8Array(await selected.arrayBuffer()); let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      const report = await request('amazon/custom/inspect', { format, base64: btoa(binary), classification: selectedClassification, operatorApproved: true });
      render(report); notice.textContent = 'Testdatei geprüft. Keine Daten gespeichert, keine Gestaltung oder Sendung erstellt.';
    } catch (error) { notice.textContent = error?.message || 'Die Testdatei konnte nicht geprüft werden.'; }
    finally { busy = false; enabled(); }
  });
  return { root: panel };
}
