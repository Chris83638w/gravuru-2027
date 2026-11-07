// Demo presentation only. Text values, fonts, size conversion, rights and undo
// continue to belong to the original textareas and native editor handlers.
const installed = new WeakMap();

export function installDemoTextEditor(el, {onFocusChange} = {}) {
  if (installed.has(el)) return installed.get(el);
  const root = el.shadowRoot, panel = root?.querySelector('#ux-panel-text');
  const fields = panel?.querySelector('.ux-fields'), controls = panel?.querySelector('.ux-controls');
  const size = controls?.querySelector('#ux-size'), sizeGroup = size?.closest('.ux-stepper')?.parentElement;
  if (!panel || !fields || !controls || !size || !sizeGroup) return null;

  const document = panel.ownerDocument;
  const picker = document.createElement('div');
  picker.className = 'md-text-picker'; picker.setAttribute('role','group'); picker.setAttribute('aria-label','Textbereich auswählen');
  fields.before(picker);
  const rangeLabel = document.createElement('label'); rangeLabel.className = 'md-text-size-control';
  const rangeTitle = document.createElement('span'); rangeTitle.textContent = 'Schrifthöhe';
  const range = document.createElement('input'); range.type = 'range'; range.className = 'md-text-size-range'; range.setAttribute('aria-label','Schrifthöhe');
  rangeLabel.append(rangeTitle,range); sizeGroup.append(rangeLabel);
  const priorMarker = panel.getAttribute('data-md-text-editor'); panel.setAttribute('data-md-text-editor','');
  const priorControls = {parent:controls.parentNode,next:controls.nextSibling};
  const nativeUpdate = el.uxUpdateTextUI, nativeEdit = el.uxEditText;
  const choices = new Map(), previousRows = new Map(), cleanups = [];
  let disposed = false, refreshing = false, refreshAgain = false, visible = false, activeId = null;
  let lastFocused = false, lastFocusedField = null;

  const listen = (node,type,fn) => { node.addEventListener(type,fn); cleanups.push(() => node.removeEventListener(type,fn)); };
  const selected = () => el.state?.objects?.find(object => object.id === el.state.selected && object.type === 'text');
  const sameAttribute = (node,key,value) => {
    if (value === null) { if (node.hasAttribute(key)) node.removeAttribute(key); }
    else if (node.getAttribute(key) !== String(value)) node.setAttribute(key,String(value));
  };
  const currentRows = () => [...fields.querySelectorAll('.ux-text-row')].map(row => ({row,field:row.querySelector('[data-ux-text]')})).filter(item => item.field);
  const canSize = () => {
    const object = selected();
    return !!object && !object.uxLocked && !object.uxHidden && !size.disabled && !size.readOnly && el.uxCanEdit?.(object,'scale') !== false;
  };
  function refreshRange() {
    for (const key of ['min','max','step']) sameAttribute(range,key,size.getAttribute(key));
    const disabled = !canSize() || size.value === '' || !Number.isFinite(Number(size.value));
    if (range.disabled !== disabled) range.disabled = disabled;
    if (size.value !== '' && Number.isFinite(Number(size.value)) && range.value !== size.value) range.value = size.value;
    sameAttribute(range,'aria-valuetext',size.value || null);
  }
  function focusState() {
    if (disposed) return;
    const field = root.activeElement;
    const focused = !!field && panel.contains(field) && (field === size || field.matches?.('[data-ux-text]')) && !field.disabled;
    const nextField = focused ? field : null;
    if (focused !== lastFocused || nextField !== lastFocusedField) {
      lastFocused = focused; lastFocusedField = nextField;
      onFocusChange?.(focused,{id:focused ? field.dataset.uxText || selected()?.id || null : null,field:nextField});
    }
  }
  function refresh() {
    if (disposed) return;
    if (refreshing) { refreshAgain = true; return; }
    refreshing = true;
    try {
      const rows = currentRows(), present = new Set(rows.map(({row}) => row));
      // Keep only current DOM rows. A design switch replaces them natively.
      for (const [row,wasActive] of previousRows) if (!present.has(row)) { row.classList.toggle('md-text-active',wasActive); previousRows.delete(row); }
      const ids = new Set(rows.map(({field}) => field.dataset.uxText));
      for (const [id,button] of choices) if (!ids.has(id)) { button.remove(); choices.delete(id); }
      const object = selected();
      if (object && ids.has(object.id)) activeId = object.id;
      else if (!ids.has(activeId)) activeId = rows[0]?.field.dataset.uxText || null;
      for (const [index,{row,field}] of rows.entries()) {
        const id = field.dataset.uxText;
        if (!previousRows.has(row)) previousRows.set(row,row.classList.contains('md-text-active'));
        row.classList.toggle('md-text-active',id === activeId);
        let button = choices.get(id);
        if (!button) {
          button = document.createElement('button'); button.type = 'button'; button.className = 'md-text-choice';
          // Existing delegated action selects the object and syncs native UI.
          // It intentionally never focuses the textarea or opens a keyboard.
          button.dataset.ux = 'select-content'; button.dataset.id = id;
          choices.set(id,button);
        }
        const label = field.getAttribute('aria-label') || row.querySelector('label')?.textContent?.trim() || 'Text';
        if (button.textContent !== label) button.textContent = label;
        sameAttribute(button,'aria-pressed',id === activeId ? 'true' : 'false');
        sameAttribute(button,'aria-controls',field.id || null);
        if (picker.children[index] !== button) picker.insertBefore(button,picker.children[index] || null);
      }
      if (picker.hidden !== (rows.length === 0)) picker.hidden = rows.length === 0;
      const activeRow = rows.find(({field}) => field.dataset.uxText === activeId)?.row;
      if (activeRow && controls.parentNode !== activeRow) activeRow.append(controls);
      const showControls = !!object && object.id === activeId && !!activeRow;
      if (controls.hidden === showControls) controls.hidden = !showControls;
      refreshRange(); focusState();
      const entering = !panel.hidden && !visible; visible = !panel.hidden;
      // Initial entry gets a native selection, but later canvas selections or
      // every typed character must never be overridden by a presentation refresh.
      if (entering && !object && activeId) {
        choices.get(activeId)?.click();
        refreshAgain = true;
      }
    } finally {
      refreshing = false;
      if (refreshAgain) { refreshAgain = false; refresh(); }
    }
  }
  function forwardSize(event) {
    if (disposed || !canSize() || range.disabled || range.value === '' || !Number.isFinite(Number(range.value))) return;
    size.value = range.value;
    size.dispatchEvent(new Event(event.type,{bubbles:true,composed:true}));
    // The native path can reject, clamp or convert the value. Read it back;
    // never write directly to the text's size, width, height or history.
    refreshRange();
  }
  listen(range,'input',forwardSize); listen(range,'change',forwardSize);
  listen(panel,'focusin',focusState);
  listen(panel,'focusout',() => queueMicrotask(focusState));
  const update = function(...args) { const result = nativeUpdate?.apply(this,args); refresh(); return result; };
  el.uxUpdateTextUI = update;
  const edit = function(id) {
    if (disposed) return;
    const object = el.state?.objects?.find(item => item.id === id && item.type === 'text');
    // Same content gate as native direct-editing.openText, without its upper
    // input or automatic focus. Existing double-tap detection still calls here.
    if (!object || object.uxLocked || object.uxHidden || el.uxCanEdit?.(object,'content') === false) return;
    const full = root.querySelector('.c-large-preview'); if (full?.open) full.close();
    el.state.selected = id; el.sync(); el.uxShowSection?.('text'); refresh();
  };
  el.uxEditText = edit;
  const observer = new MutationObserver(refresh);
  observer.observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled','readonly','min','max','step']});
  const api = {refresh,activate() {
    if (disposed) return;
    // Closing the demo sheet does not hide the native panel. Explicit entry
    // therefore needs its own signal, separate from ordinary model refreshes.
    visible = false; refresh();
  },dispose() {
    if (disposed) return;
    disposed = true; observer.disconnect(); cleanups.forEach(fn => fn());
    if (el.uxUpdateTextUI === update) {
      if (nativeUpdate === undefined) delete el.uxUpdateTextUI; else el.uxUpdateTextUI = nativeUpdate;
    }
    if (el.uxEditText === edit) {
      if (nativeEdit === undefined) delete el.uxEditText; else el.uxEditText = nativeEdit;
    }
    for (const [row,wasActive] of previousRows) row.classList.toggle('md-text-active',wasActive);
    previousRows.clear(); choices.clear(); picker.remove(); rangeLabel.remove();
    sameAttribute(panel,'data-md-text-editor',priorMarker);
    const parent = priorControls.parent?.isConnected ? priorControls.parent : panel;
    parent.insertBefore(controls,priorControls.next?.parentNode === parent ? priorControls.next : null);
    nativeUpdate?.call(el);
    if (lastFocused) onFocusChange?.(false,{id:null,field:null});
    installed.delete(el);
  }};
  installed.set(el,api); refresh(); return api;
}
