const dirtyComments = new Set();
for (const form of document.querySelectorAll('[data-comment-form]')) {
  const field = form.querySelector('textarea');
  const button = form.querySelector('button');
  const status = form.querySelector('[role="status"]');
  let saved = field.value, busy = false;
  function sync() {
    const dirty = field.value !== saved;
    dirty ? dirtyComments.add(form) : dirtyComments.delete(form);
    button.disabled = busy || !dirty;
    return dirty;
  }
  field.addEventListener('input', () => {
    status.textContent = sync() ? 'Noch nicht gespeichert' : (Number(form.dataset.revision) ? 'Gespeichert' : 'Noch kein Kommentar');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !sync()) return;
    const text = field.value;
    busy = true; sync(); status.textContent = 'Kommentar wird gespeichert …';
    try {
      const response = await fetch('/originale/comments', {
        method: 'POST', credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', 'X-Slate-Review-CSRF': document.querySelector('meta[name="slate-review-csrf"]').content},
        body: JSON.stringify({designId: form.dataset.designId, text, expectedRevision: Number(form.dataset.revision)}),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Der Kommentar konnte nicht gespeichert werden.');
      saved = result.comment.text;
      form.dataset.revision = String(result.comment.revision);
      status.textContent = field.value === saved ? 'Gespeichert' : 'Noch nicht gespeicherte Ergänzung';
    } catch (error) {
      status.textContent = error instanceof TypeError ? 'Speichern nicht möglich. Deine Eingabe bleibt erhalten; bitte erneut versuchen.' : error.message;
    } finally { busy = false; sync(); }
  });
  sync();
}
window.addEventListener('beforeunload', event => {
  if (dirtyComments.size) { event.preventDefault(); event.returnValue = ''; }
});
