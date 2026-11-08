// Optional demo decision only: no geometry, pricing, validation or checkout
// mutation. The caller supplies a fresh content/resource fingerprint and an
// inspector which waits for pending placement/render work before reading it.
export function createOverlapConsentController({dialog, inspect, onFailure = () => {}} = {}) {
  const doc = dialog?.ownerDocument, problems = dialog?.querySelector('[data-layout-problems]');
  if (!doc || !problems || typeof inspect !== 'function' ||
      typeof dialog.showModal !== 'function' || typeof dialog.close !== 'function') {
    throw new TypeError('Layout dialog and current-state inspector are required.');
  }
  const accept = doc.createElement('button');
  accept.type = 'button';
  accept.className = 'md-overlap-accept';
  accept.dataset.demoOverlapAccept = '';
  accept.textContent = 'So übernehmen und weiter';
  accept.hidden = true;
  accept.disabled = true;
  dialog.append(accept);
  let disposed = false, pending = null, acknowledged = null;

  function snapshot(value) {
    if (!value || !Array.isArray(value.issues) || typeof value.fingerprint !== 'string' || !value.fingerprint.trim()) {
      throw new TypeError('Current layout evidence is missing.');
    }
    // Copy the issues: a later renderer update must not change the evidence
    // which the customer actually saw. The issue list is bound as well as the
    // caller's full content/geometry/resource fingerprint.
    const issues = JSON.parse(JSON.stringify(value.issues));
    if (issues.some(issue => !issue || typeof issue !== 'object' || Array.isArray(issue))) {
      throw new TypeError('Current layout issues are invalid.');
    }
    return {issues, key:JSON.stringify([value.fingerprint, issues])};
  }
  const onlyOverlaps = state => state.issues.length > 0 && state.issues.every(issue =>
    issue.code === 'overlap' && Array.isArray(issue.ids) && issue.ids.length >= 2 &&
    issue.ids.every(id => typeof id === 'string' && id.length > 0) && new Set(issue.ids).size === issue.ids.length);
  const report = message => { try { onFailure(message); } catch { /* A status renderer must not release a blocked decision. */ } };
  function render(state) {
    const messages = [...new Set(state.issues.map(issue =>
      typeof issue.message === 'string' ? issue.message : 'Bitte prüfe die markierte Stelle.'))];
    problems.replaceChildren(...messages.map(message => {
      const p = doc.createElement('p');
      p.textContent = message;
      return p;
    }));
    accept.hidden = !onlyOverlaps(state);
    accept.disabled = true;
    accept.removeAttribute('aria-busy');
  }
  function settle(request, result, close = false) {
    if (pending !== request) return;
    pending = null;
    accept.disabled = true;
    accept.removeAttribute('aria-busy');
    // Close before resolving: the native commerce checks deliberately reject
    // any still-open editing dialog after awaiting the layout decision.
    if (close && dialog.open) {
      try { dialog.close(); }
      catch { result = false; acknowledged = null; report('Bitte schließe die Gestaltungsprüfung und versuche es erneut.'); }
    }
    request.done(result);
  }
  function fail(request, message) {
    acknowledged = null;
    report(message);
    settle(request, false, request.shown);
  }
  async function verify(request) {
    if (pending !== request || request.checking || disposed) return;
    request.checking = true;
    const verification = ++request.verification;
    accept.disabled = true;
    accept.setAttribute('aria-busy', 'true');
    try {
      const current = snapshot(await inspect());
      if (disposed || pending !== request || request.verification !== verification) return;
      if (!onlyOverlaps(current) || current.key !== request.state.key) {
        fail(request, 'Die Gestaltung hat sich geändert. Bitte prüfe sie erneut.');
        return;
      }
      acknowledged = current.key;
      settle(request, true, request.shown);
    } catch {
      if (!disposed && pending === request && request.verification === verification) fail(request, 'Die Gestaltung konnte noch nicht geprüft werden. Bitte erneut versuchen.');
    }
  }
  function resolve(value) {
    // Two simultaneous completion handlers must never both continue and open
    // the native review twice. Only the first call owns this decision.
    if (disposed || pending) return Promise.resolve(false);
    let state;
    try { state = snapshot(value); }
    catch { acknowledged = null; report('Die Gestaltung konnte noch nicht geprüft werden. Bitte erneut versuchen.'); return Promise.resolve(false); }
    if (acknowledged !== state.key) acknowledged = null;
    if (!state.issues.length) return Promise.resolve(true);
    if (!onlyOverlaps(state)) {
      render(state);
      try { if (!dialog.open) dialog.showModal(); }
      catch { report('Die Gestaltungsprüfung konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
      return Promise.resolve(false);
    }
    const reuse = acknowledged === state.key;
    const promise = new Promise(done => { pending = {state, done, shown:!reuse, checking:false, verification:0}; });
    const request = pending;
    if (reuse) { void verify(request); return promise; }
    render(state);
    accept.disabled = false;
    try { if (!dialog.open) dialog.showModal(); }
    catch { fail(request, 'Die Gestaltungsprüfung konnte nicht geöffnet werden. Bitte erneut versuchen.'); }
    return promise;
  }
  function acceptClick(event) {
    event.preventDefault();
    if (!accept.disabled && !accept.hidden && pending?.shown) void verify(pending);
  }
  function nativeAction(event) {
    const target = event.composedPath?.()[0] || event.target;
    const action = target?.closest?.('[data-ux]')?.dataset.ux;
    if (!['layout-fit', 'close'].includes(action)) return;
    acknowledged = null;
    if (pending?.shown) {
      if (action === 'close') settle(pending, false);
      else {
        // Fit may fail without changing anything. Keep the original decision
        // pending until native close/cancel, so the customer can still accept.
        // Invalidate an in-flight consent inspection; the fit wrapper owns
        // disabling this button while busy and restoring it on a failed fit.
        pending.verification++;
        pending.checking = false;
        accept.disabled = true;
        accept.removeAttribute('aria-busy');
      }
    }
    // Do not consume the event. Native fit, close and their undo behavior stay
    // responsible for their own actions; automatic fitting is not consent.
  }
  function closed() {
    // An old queued close event may arrive after the dialog has been reopened.
    if (!dialog.open && pending?.shown) settle(pending, false);
  }
  function cancelled() { if (pending?.shown) settle(pending, false); }
  accept.addEventListener('click', acceptClick);
  dialog.addEventListener('click', nativeAction, true);
  dialog.addEventListener('close', closed);
  dialog.addEventListener('cancel', cancelled);
  return {resolve, dispose() {
    if (disposed) return;
    disposed = true;
    acknowledged = null;
    if (pending) settle(pending, false, pending.shown);
    accept.removeEventListener('click', acceptClick);
    dialog.removeEventListener('click', nativeAction, true);
    dialog.removeEventListener('close', closed);
    dialog.removeEventListener('cancel', cancelled);
    accept.remove();
  }};
}
