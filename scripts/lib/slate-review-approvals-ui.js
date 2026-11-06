const labels = {approved:'Bestätigt', unreviewed:'Noch nicht freigegeben', changed:'Geändert · erneut prüfen', unavailable:'Aufbereitung offen'};

export function approvalCanBeChanged(state, {dirty=false,busy=false,previewReady=false}={}) {
  return !!state?.fingerprint && state.status !== 'unavailable' && !dirty && !busy && previewReady;
}

export function installApprovalReview({cards,onChanged=()=>{}}) {
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
    checkbox.disabled = !approvalCanBeChanged(state,{dirty,busy:mutating||card.getAttribute('aria-busy')==='true',previewReady:ready(card,state)});
    card.dataset.approvalStatus = state?.status || 'unavailable';
    card.querySelector('[data-approval-status-label]').textContent = dirty ? 'Ungespeichert · noch nicht bestätigt' : labels[card.dataset.approvalStatus];
    const progress = progressByOriginal.get(card.dataset.originalId);
    card.querySelector('[data-approval-progress]').textContent = progress?.total > 1 ? progress.approved + ' von ' + progress.total + ' Formaten bestätigt' : '';
    checkbox.title = card.classList.contains('inline-dirty') ? 'Bitte zuerst die Verschiebung speichern.' : state?.status === 'unavailable' ? 'Die bearbeitbare Konfi-Version muss zuerst vollständig vorliegen.' : 'Freigabe für den angezeigten gespeicherten Stand';
  }
  const syncControls = () => cards.forEach(syncCard);
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
    const response = await fetch('/originale/approvals',{credentials:'same-origin',cache:'no-store',...options});
    let result; try { result = await response.json(); } catch { throw Error('Die Freigabe konnte nicht gelesen werden. Bitte erneut versuchen.'); }
    if (!response.ok) throw Object.assign(Error(result.error || 'Die Freigabe konnte nicht gespeichert werden.'),{status:response.status});
    return result;
  }
  async function refresh() {
    if (mutating) return;
    const current = ++sequence;
    try { const result = await request(); if (current === sequence) apply(result); }
    catch { /* Keep the last proven state; writes still compare the exact server fingerprint. */ }
  }
  for (const card of cards) {
    card.querySelector('[data-preview]')?.addEventListener('load',()=>syncCard(card));
    card.querySelector('[data-preview]')?.addEventListener('error',()=>syncCard(card));
    card.querySelector('[data-approval-check]')?.addEventListener('change',async event=>{
      const state = states[card.dataset.approvalKey], approved = event.target.checked;
      if (!approvalCanBeChanged(state,{dirty:card.classList.contains('inline-dirty'),busy:mutating||card.getAttribute('aria-busy')==='true',previewReady:ready(card,state)})) { syncCard(card); return; }
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
  return {refresh,syncControls,formatChanged(card){syncCard(card);onChanged();}};
}
