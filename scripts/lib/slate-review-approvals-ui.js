const labels = {approved:'Bestätigt', unreviewed:'Noch nicht freigegeben', changed:'Geändert · erneut prüfen', unavailable:'Aufbereitung offen'};

export function approvalScopeUrl(ids) {
  if(ids===null)return '/originale/approvals';
  if(!Array.isArray(ids)||ids.length>60||ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)throw Error('Ungültiger Galerie-Seitenumfang.');
  return '/originale/approvals?originalIds='+encodeURIComponent(JSON.stringify(ids));
}

export function approvalCanBeChanged(state, {dirty=false,busy=false,previewReady=false}={}) {
  return !!state?.fingerprint && state.status !== 'unavailable' && !dirty && !busy && previewReady;
}

export function installApprovalReview({cards,onChanged=()=>{}}) {
  const scopeElement=document.querySelector('#review-original-ids');
  const approvalUrl=approvalScopeUrl(scopeElement?JSON.parse(scopeElement.textContent):null);
  let states = JSON.parse(document.querySelector('#review-approval-data')?.textContent || '{}');
  function progressIndex(bundle) {
    const byOriginal = new Map();
    for (const state of Object.values(bundle)) {
      const id = state.metadata?.id;
      if (!id) continue;
      const progress = byOriginal.get(id) || {total:0,approved:0};
      progress.total++;
      if (state.status === 'approved') progress.approved++;
      byOriginal.set(id,progress);
    }
    return byOriginal;
  }
  let progressByOriginal = progressIndex(states);
  let mutating = false, sequence = 0;
  const bulkButton = document.querySelector('[data-approval-bulk]');
  const bulkStatus = document.querySelector('[data-approval-bulk-status]');
  const bulkPanel = document.querySelector('[data-approval-bulk-panel]');
  const bulkSummary = document.querySelector('[data-approval-bulk-summary]');
  const bulkConfirm = document.querySelector('[data-approval-bulk-confirm]');
  const bulkCancel = document.querySelector('[data-approval-bulk-cancel]');
  let bulkSyncPending = false, pendingBatch = null;
  const filterSignature = () => JSON.stringify(['view','search','material','theme','category','blank-form','process','approval-filter'].map(id=>document.querySelector('#'+id)?.value??null));
  const csrf = () => document.querySelector('meta[name="slate-review-csrf"]').content;
  const message = (card,text) => { card.querySelector('[data-approval-message]').textContent = text; };
  function ready(card,state) {
    if (card.classList.contains('inline-active')) return Number(card.dataset.inlineRevision) === state?.metadata?.productRevision && !!state?.fingerprint && card.dataset.inlineFingerprint === state.fingerprint;
    const image = card.querySelector('[data-preview]');
    return !!image?.complete && image.naturalWidth > 0 && !!state?.metadata?.previewUrl &&
      image.src === new URL(state.metadata.previewUrl,location.href).href;
  }
  function syncCard(card) {
    const state = states[card.dataset.approvalKey], checkbox = card.querySelector('[data-approval-check]');
    if (!checkbox) return;
    const dirty = card.classList.contains('inline-dirty');
    checkbox.checked = !dirty && state?.status === 'approved';
    checkbox.disabled = !approvalCanBeChanged(state,{dirty,busy:mutating||!!pendingBatch||card.getAttribute('aria-busy')==='true',previewReady:ready(card,state)});
    card.dataset.approvalStatus = state?.status || 'unavailable';
    if(state?.metadata?.productRevision)card.dataset.sourceRevision=String(state.metadata.productRevision);
    card.querySelector('[data-approval-status-label]').textContent = dirty ? 'Ungespeichert · noch nicht bestätigt' : labels[card.dataset.approvalStatus];
    const progress = progressByOriginal.get(card.dataset.originalId);
    card.querySelector('[data-approval-progress]').textContent = progress?.total > 1 ? progress.approved + ' von ' + progress.total + ' Formaten bestätigt' : '';
    checkbox.title = card.classList.contains('inline-dirty') ? 'Bitte zuerst die Änderungen speichern.' : state?.status === 'unavailable' ? 'Die bearbeitbare Konfi-Version muss zuerst vollständig vorliegen.' : 'Freigabe für den angezeigten gespeicherten Stand';
  }
  function visible(card) {
    const pinnedNote = card.querySelector('[data-inline-filter-note]');
    return !card.hidden && !card.closest?.('[hidden]') && !(pinnedNote && !pinnedNote.hidden);
  }
  function eligible(card,state) {
    return visible(card) && approvalCanBeChanged(state,{dirty:card.classList.contains('inline-dirty'),busy:card.getAttribute('aria-busy')==='true',previewReady:ready(card,state)});
  }
  function batchSelection() {
    const seen = new Set(), entries = [];
    let approved = 0, excluded = 0;
    for (const card of cards) {
      if (!visible(card)) continue;
      const state = states[card.dataset.approvalKey];
      if (state?.status === 'approved' && !card.classList.contains('inline-dirty')) { approved++; continue; }
      if (!eligible(card,state)) { excluded++; continue; }
      if (seen.has(state.key)) continue;
      seen.add(state.key);
      entries.push({card,key:state.key,revision:state.revision,fingerprint:state.fingerprint,
        material:state.metadata?.material || 'Material offen',format:state.metadata?.format || 'Format offen'});
    }
    return {entries,approved,excluded};
  }
  function syncBulk() {
    if (!bulkButton) return;
    if (pendingBatch && (pendingBatch.filters !== filterSignature() || !pendingBatch.entries.every(currentEntry))) {
      pendingBatch = null;
      if (bulkPanel) bulkPanel.hidden = true;
      if (bulkStatus) bulkStatus.textContent = 'Auswahl oder Vorlagenstand wurde geändert. Bitte die Sammelfreigabe erneut prüfen.';
      cards.forEach(syncCard);
    }
    const {entries} = batchSelection();
    bulkButton.disabled = mutating || !!pendingBatch || !entries.length;
    bulkButton.textContent = 'Gefilterte Vorlagen freigeben (' + entries.length + ')';
    if (bulkConfirm) bulkConfirm.disabled = mutating || !pendingBatch;
    if (bulkCancel) bulkCancel.disabled = mutating;
  }
  function scheduleBulkSync() {
    // Gallery filtering updates card.hidden immediately after syncControls.
    // Count once after that pass, without re-running the gallery filter.
    if (!bulkButton || bulkSyncPending) return;
    bulkSyncPending = true;
    queueMicrotask(()=>{bulkSyncPending=false;syncBulk();});
  }
  const syncControls = () => { cards.forEach(syncCard); syncBulk(); scheduleBulkSync(); };
  function apply(bundle) {
    if (!bundle?.approvals) throw Error('Die Freigaben konnten nicht gelesen werden.');
    states = bundle.approvals;
    progressByOriginal = progressIndex(states);
    if (typeof bundle.overviewHtml === 'string') {
      const host = document.querySelector('#review-overview'), expanded = host.querySelector('details')?.open;
      host.innerHTML = bundle.overviewHtml;
      if (expanded && host.querySelector('details')) host.querySelector('details').open = true;
    }
    for (const card of cards) {
      for (const option of card.querySelectorAll('[data-approval-key]')) {
        const preview = states[option.dataset.approvalKey]?.metadata?.previewUrl;
        if (preview) option.dataset.preview = preview;
      }
      const image = card.querySelector('[data-preview]'), preview = states[card.dataset.approvalKey]?.metadata?.previewUrl;
      if (image && preview && image.src !== new URL(preview,location.href).href) image.src = preview;
    }
    syncControls(); onChanged();
  }
  async function request(options) {
    const response = await fetch(approvalUrl,{credentials:'same-origin',cache:'no-store',...options});
    let result; try { result = await response.json(); } catch { throw Error('Die Freigabe konnte nicht gelesen werden. Bitte erneut versuchen.'); }
    if (!response.ok) throw Object.assign(Error(result.error || 'Die Freigabe konnte nicht gespeichert werden.'),{status:response.status});
    return result;
  }
  async function refresh() {
    if (mutating) return false;
    const current = ++sequence;
    try {
      const result = await request();
      if (current === sequence) { apply(result); return true; }
    } catch { /* Keep the last proven state; writes still compare the exact server fingerprint. */ }
    return false;
  }
  function currentEntry(entry) {
    const state = states[entry.key];
    return entry.card.dataset.approvalKey === entry.key && eligible(entry.card,state) &&
      state?.revision === entry.revision && state.fingerprint === entry.fingerprint;
  }
  function showBatchConfirmation() {
    if (mutating || pendingBatch || !bulkPanel || !bulkSummary || !bulkConfirm || !bulkCancel) return;
    const selection = batchSelection(), {entries} = selection;
    if (!entries.length) { syncBulk(); return; }
    const groups = new Map();
    for (const entry of entries) {
      const key = entry.material + ' · ' + entry.format;
      groups.set(key,(groups.get(key)||0)+1);
    }
    const summary = [...groups].map(([label,count])=>count+' × '+label).join('\n');
    bulkSummary.textContent = entries.length + ' angezeigte Vorlagen freigeben?\n\n' + summary +
      '\n\nEs gilt nur das jeweils angezeigte Material und Format, nicht alle Größen eines Designs.' +
      '\n' + selection.approved + ' bereits bestätigt; ' + selection.excluded + ' offen, ungespeichert oder noch nicht geladen – ausgelassen.' +
      '\n\nIch habe diese Vorlagen geprüft und bestätige die angezeigten gespeicherten Stände. Es wird nichts im Shop veröffentlicht.';
    pendingBatch = {entries,filters:filterSignature()};
    bulkConfirm.textContent = 'Jetzt ' + entries.length + ' Vorlagen freigeben';
    bulkPanel.hidden = false;
    if (bulkStatus) bulkStatus.textContent = '';
    syncControls();
    bulkPanel.focus?.({preventScroll:true});
  }
  function cancelBatch() {
    if (mutating || !pendingBatch) return;
    pendingBatch = null; bulkPanel.hidden = true;
    if (bulkStatus) bulkStatus.textContent = 'Die Sammelfreigabe wurde nicht ausgeführt.';
    syncControls(); bulkButton.focus?.({preventScroll:true});
  }
  async function approvePendingBatch() {
    if (mutating || !pendingBatch) return;
    const {entries,filters} = pendingBatch;
    pendingBatch = null; bulkPanel.hidden = true;
    if (filters !== filterSignature() || !entries.every(currentEntry)) {
      if (bulkStatus) bulkStatus.textContent = 'Auswahl oder Vorlagenstand wurde geändert. Bitte die Sammelfreigabe erneut prüfen.';
      syncControls(); return;
    }
    mutating = true; ++sequence; syncControls();
    let confirmed = 0, skipped = 0, failure = null, pendingCard = null;
    try {
      for (const entry of entries) {
        const current = states[entry.key];
        // A previous response can prove a concurrent approval of the same
        // fingerprint. It needs no duplicate event and is counted separately.
        if (current?.status === 'approved' && current.fingerprint === entry.fingerprint) { skipped++; continue; }
        pendingCard = entry.card;
        if (!currentEntry(entry)) throw Error('Auswahl, Vorschau oder Vorlagenstand wurde zwischenzeitlich geändert.');
        if (bulkStatus) bulkStatus.textContent = confirmed + ' von ' + entries.length + ' Freigaben bestätigt · nächste Vorlage wird gespeichert …';
        message(entry.card,'Freigabe wird gespeichert …');
        const bundle = await request({method:'POST',headers:{'Content-Type':'application/json','X-Slate-Review-CSRF':csrf()},
          body:JSON.stringify({key:entry.key,approved:true,expectedRevision:entry.revision,expectedFingerprint:entry.fingerprint})});
        const saved = bundle?.approvals?.[entry.key];
        if (saved?.status !== 'approved' || saved.fingerprint !== entry.fingerprint || saved.approvedFingerprint !== entry.fingerprint) throw Error('Die letzte Freigabe wurde nicht eindeutig bestätigt.');
        apply(bundle); confirmed++;
        message(entry.card,'Freigabe gespeichert.');
        pendingCard = null;
      }
    } catch (error) {
      failure = error;
      if (pendingCard) message(pendingCard,error.message);
    } finally {
      mutating = false; syncControls();
      if (bulkStatus) bulkStatus.textContent = failure
        ? confirmed + ' Freigaben sicher gespeichert. Aktueller Stand wird geprüft …'
        : confirmed + ' Freigaben gespeichert.' + (skipped ? ' ' + skipped + ' inzwischen bereits bestätigt und ausgelassen.' : '');
    }
    if (failure) {
      // A lost POST response may still have committed. Read back, never resend;
      // report proven current approvals rather than assuming success or failure.
      const refreshed = await refresh();
      if (!refreshed) {
        if (bulkStatus) bulkStatus.textContent = confirmed + ' Freigaben sicher gespeichert. Gestoppt: ' + failure.message + ' Die letzte Freigabe bleibt ungeklärt, weil der aktuelle Stand nicht geladen werden konnte. Bitte neu laden und die Häkchen prüfen; es wird nichts automatisch erneut gesendet.';
        return;
      }
      const verified = entries.filter(entry=>states[entry.key]?.status==='approved'&&states[entry.key].fingerprint===entry.fingerprint).length;
      if (bulkStatus) bulkStatus.textContent = verified + ' von ' + entries.length + ' ausgewählten Vorlagen bestätigt. Gestoppt: ' + failure.message + ' Verbleibende Karten bitte prüfen; es wird nichts automatisch erneut gesendet.';
    }
  }
  bulkButton?.addEventListener('click',showBatchConfirmation);
  bulkConfirm?.addEventListener('click',approvePendingBatch);
  bulkCancel?.addEventListener('click',cancelBatch);
  for (const card of cards) {
    card.querySelector('[data-preview]')?.addEventListener('load',()=>{syncCard(card);scheduleBulkSync();});
    card.querySelector('[data-preview]')?.addEventListener('error',()=>{syncCard(card);scheduleBulkSync();});
    card.querySelector('[data-approval-check]')?.addEventListener('change',async event=>{
      const state = states[card.dataset.approvalKey], approved = event.target.checked;
      if (!approvalCanBeChanged(state,{dirty:card.classList.contains('inline-dirty'),busy:mutating||!!pendingBatch||card.getAttribute('aria-busy')==='true',previewReady:ready(card,state)})) { syncCard(card); return; }
      mutating = true; ++sequence; syncControls(); message(card,'Freigabe wird gespeichert …');
      try {
        const bundle = await request({method:'POST',headers:{'Content-Type':'application/json','X-Slate-Review-CSRF':csrf()},body:JSON.stringify({key:state.key,approved,expectedRevision:state.revision,expectedFingerprint:state.fingerprint})});
        apply(bundle); message(card,approved?'Freigabe gespeichert.':'Freigabe zurückgenommen.');
      } catch (error) {
        message(card,error.message);
        if (error.status === 409) { mutating = false; await refresh(); }
      } finally { mutating = false; syncControls(); }
    });
  }
  window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
  window.addEventListener('focus',()=>void refresh());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  syncControls();
  return {refresh,syncControls,formatChanged(card){syncCard(card);scheduleBulkSync();onChanged();}};
}
