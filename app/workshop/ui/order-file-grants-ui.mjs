import {orderRequest} from './order-store-context.mjs';

export function createOrderFileGrantsUI() {
  const section = document.createElement('section');
  section.innerHTML = '<h3>Dateien im Kundenkonto</h3><p>Testfreigaben für die bestätigte Bestellposition. PDF ist vorausgewählt; ein ZIP enthält zusätzlich private Originaldaten. Keine Fertigungsfreigabe.</p><p role="status" aria-live="polite"></p><form hidden><label>Gesicherte Ausgabe<select name="job" required></select></label><label>Datei<select name="format"><option value="pdf">Nur PDF</option><option value="white-pdf">Separate Weiß-PDF</option><option value="zip">ZIP mit allen Daten und Fotos</option></select></label><button type="submit">Für dieses Test-Kundenkonto freigeben</button></form><ul></ul>';
  document.querySelector('#order-output-section').after(section);
  const status = section.querySelector('[role=status]'), form = section.querySelector('form'), list = section.querySelector('ul');
  let row = null, serial = 0, busy = false;
  const controls = () => {for (const item of section.querySelectorAll('button,select')) item.disabled = busy;};
  async function api(path, data) {
    const response = await orderRequest(row,path,data);
    const value = await response.json(); if (!response.ok) throw Error(value.error?.message || 'Dateifreigabe nicht möglich.'); return value;
  }
  function render(grants) {
    list.replaceChildren(...grants.map(grant => {
      const li = document.createElement('li');
      li.append((grant.format === 'pdf' ? 'PDF' : grant.format === 'zip' ? 'Datenpaket' : 'Weiß-PDF') + ' · ' + grant.sha256.slice(0, 12) + ' · ' + (grant.revoked ? 'Widerrufen' : 'Testfreigabe gespeichert'));
      if (!grant.revoked) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Widerrufen';
        button.onclick = () => change('file-grants/' + grant.id + '/revoke', {}); li.append(' ', button);
      }
      return li;
    })); controls();
  }
  async function change(path, data) {
    if (busy || !row) return;
    const ticket = serial, id = row.id; busy = true; controls(); status.textContent = 'Dateiberechtigung wird gespeichert …';
    try {
      await api(path, data);
      if (ticket !== serial) return;
      const result = await api('orders/' + id + '/file-grants');
      if (ticket !== serial) return;
      render(result.grants); status.textContent = 'Gesichert. Zugriff erfordert weiterhin das passende Kundenkonto und einen gültigen Zahlungsstatus.';
    } catch (error) {if (ticket === serial) status.textContent = error.message;}
    finally {busy = false; controls();}
  }
  form.onsubmit = event => {event.preventDefault(); if (row) void change('orders/' + row.id + '/file-grants', {jobId: form.elements.job.value, format: form.elements.format.value});};
  return {async select(value) {
    row = value; const ticket = ++serial; form.hidden = true; list.replaceChildren(); status.textContent = ''; if (!row) return;
    const id = row.id;
    try {
      const session = await api('session'); if (ticket !== serial) return;
      if (session.scope !== 'shopify-merchant-test') {status.textContent = 'Testfreigaben benötigen die bestätigte Shopify-Händleranmeldung. Die lokale Werkstatt erteilt keine Kundenberechtigung.'; return;}
      const [outputs, grants] = await Promise.all([api('orders/' + id + '/outputs'), api('orders/' + id + '/file-grants')]);
      if (ticket !== serial) return;
      const completed = outputs.jobs.filter(job => job.status === 'completed');
      form.elements.job.replaceChildren(...completed.map(job => new Option(job.recipe + ' · ' + job.id.slice(-8), job.id)));
      form.elements.format.value = 'pdf'; form.hidden = !completed.length; render(grants.grants);
      status.textContent = completed.length ? 'Nur geprüfte Dateien ausdrücklich für diese Testbestellung freigeben.' : 'Zuerst eine Ausgabe zur gesicherten Gestaltung erstellen.';
    } catch (error) {if (ticket === serial) status.textContent = error.message;}
  }};
}
