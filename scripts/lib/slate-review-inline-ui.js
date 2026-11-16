// The card edits native positions and proportional sizes. Rendering, validation and revisions
// remain in the existing workshop backend; no product documents live in the page.
export function changedPositions(original, current) {
  const old = new Map(original.map(object => [object.id, object]));
  return current.filter(object => object.movable === true && old.has(object.id) &&
    (object.x !== old.get(object.id).x || object.y !== old.get(object.id).y ||
      old.get(object.id).resizable === true && (object.scale ?? 1) !== 1))
    .map(object => ({objectId: object.id, x: object.x, y: object.y,
      ...(old.get(object.id).resizable === true && (object.scale ?? 1) !== 1 ? {scale: object.scale} : {})}));
}

export function translatedObjectMatrix(matrix, original, current) {
  const scale = original.resizable === true ? current.scale ?? 1 : 1;
  return {a: matrix.a * scale, b: matrix.b * scale, c: matrix.c * scale, d: matrix.d * scale,
    e: matrix.e + current.x - original.x, f: matrix.f + current.y - original.y};
}

export function scaledInlineObject(original, current, factor) {
  if (!original?.resizable || !current?.resizable || !Number.isFinite(factor) || factor <= 0) return null;
  // Always derive from the loaded snapshot; multiple operations never scale SVG
  // matrices or text measurements cumulatively. Native text is remeasured at save.
  let scale = (current.scale ?? 1) * factor;
  if (Math.abs(scale - 1) < 1e-12) scale = 1;
  const next = {...current, scale, w: original.w * scale, h: original.h * scale};
  if (original.type === 'text') next.size = original.size * scale;
  return [next.w, next.h, scale].every(value => Number.isFinite(value) && value > 0) &&
    (original.type !== 'text' || Number.isFinite(next.size) && next.size > 0) ? next : null;
}

export function latestPreviewUrl(href, base) {
  const url = new URL(href, base);
  url.searchParams.delete('revision');
  return url.href;
}

export function installInlineReview({cards, onSaved = () => {}, onVisibilityChange = () => {}}) {
  let active = null;
  const query = (card, selector) => card.querySelector(selector);
  const csrf = () => document.querySelector('meta[name="slate-review-csrf"]').content;
  const dirty = session => !!session?.record && changedPositions(session.record.objects, session.objects).length > 0;
  const status = (session, text, tone = '') => {
    const node = query(session.card, '[data-inline-status]');
    node.textContent = text; node.dataset.tone = tone;
  };
  async function request(path, options) {
    const response = await fetch(path, {credentials: 'same-origin', ...options});
    let result;
    try { result = await response.json(); } catch { throw Error('Die Antwort konnte nicht gelesen werden. Deine Änderungen bleiben erhalten.'); }
    if (!response.ok) throw Object.assign(Error(result.error?.message || result.error || 'Die Vorlage konnte nicht geladen werden.'), {status: response.status});
    return result;
  }
  function sync(session) {
    const changed = dirty(session), card = session.card;
    const starter = query(card, '[data-inline-start]');
    if (starter) starter.disabled = session.busy;
    query(card, '[data-inline-save]').disabled = session.busy || !changed;
    query(card, '[data-inline-reset]').disabled = session.busy || !changed;
    query(card, '[data-inline-close]').disabled = session.busy;
    query(card, '[data-inline-reload]').disabled = session.busy;
    query(card, '[data-inline-reload]').hidden = !session.conflict;
    query(card, '[data-inline-element]').disabled = session.busy || !session.record;
    const selected = session.objects.find(object => object.id === session.selected && object.movable);
    for (const button of card.querySelectorAll('[data-inline-nudge]')) button.disabled = session.busy || !selected;
    for (const button of card.querySelectorAll('[data-inline-resize]')) button.disabled = session.busy || !selected?.resizable;
    const percentage = query(card, '[data-inline-scale]');
    if (percentage) {
      percentage.disabled = session.busy || !selected?.resizable;
      percentage.value = selected?.resizable ? Number(((selected.scale ?? 1) * 100).toFixed(6)) : '';
    }
    const dimensions = query(card, '[data-inline-dimensions]');
    if (dimensions) {
      const mm = value => Number(value.toFixed(2)).toLocaleString('de-DE');
      dimensions.textContent = selected?.resizable ? mm(selected.w) + ' × ' + mm(selected.h) + ' mm' +
        (selected.type === 'text' ? ' · Schrift ' + mm(selected.size) + ' mm' : '') +
        ((selected.scale ?? 1) !== 1 ? ' · ' + mm(selected.scale * 100) + ' %' : '') : '';
    }
    card.classList.toggle('inline-dirty', changed);
    card.setAttribute('aria-busy', String(session.busy));
    const pinned = session.busy || changed;
    if (session.pinned !== pinned) { session.pinned = pinned; onVisibilityChange(); }
  }
  function nodeFor(session, id) {
    return [...session.stage.querySelectorAll('[data-object]')].find(node => node.dataset.object === id);
  }
  function select(session, id) {
    const object = session.objects.find(object => object.id === id && object.movable);
    if (!object) return;
    session.selected = id;
    query(session.card, '[data-inline-element]').value = id;
    session.stage.querySelector('[data-inline-selection]')?.remove();
    const node = nodeFor(session, id), svg = session.stage.querySelector('svg');
    if (!node || !svg) return;
    const screen = node.getScreenCTM(), root = svg.getScreenCTM();
    if (!screen || !root) return;
    const matrix = root.inverse().multiply(screen), ns = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(ns, 'g'), rect = document.createElementNS(ns, 'rect');
    group.dataset.inlineSelection = id;
    group.setAttribute('transform', `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
    group.setAttribute('pointer-events', 'none'); group.setAttribute('aria-hidden', 'true');
    // The node matrix already includes the proportional change; use original
    // local bounds so the selection rectangle is not scaled twice.
    const original = session.record.objects.find(item => item.id === id);
    const box = Number.isFinite(original.w) && Number.isFinite(original.h)
      ? {x: -original.w / 2, y: -original.h / 2, width: original.w, height: original.h} : node.getBBox();
    for (const key of ['x', 'y', 'width', 'height']) rect.setAttribute(key, box[key]);
    rect.setAttribute('fill', 'none'); rect.setAttribute('stroke', '#c58e2f');
    rect.setAttribute('stroke-width', '2'); rect.setAttribute('vector-effect', 'non-scaling-stroke');
    group.append(rect); svg.append(group);
  }
  function draw(session, record) {
    const template = document.createElement('template'); template.innerHTML = record.svg;
    const svg = template.content.firstElementChild;
    if (svg?.localName !== 'svg' || !Array.isArray(record.objects)) throw Error('Die bearbeitbare Vorschau ist unvollständig.');
    session.stage.replaceChildren(svg);
    session.record = record; session.objects = record.objects.map(object => ({...object}));
    session.card.dataset.inlineRevision = String(record.revision);
    session.card.dataset.inlineFingerprint = record.reviewFingerprint || '';
    session.transforms = new Map(); session.conflict = false;
    const selectBox = query(session.card, '[data-inline-element]'); selectBox.replaceChildren();
    for (const object of session.objects.filter(object => object.movable)) {
      const node = nodeFor(session, object.id);
      if (!node) continue;
      node.dataset.inlineMovable = 'true';
      const matrix = node.transform.baseVal.consolidate()?.matrix;
      session.transforms.set(object.id, matrix ? {a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, e: matrix.e, f: matrix.f} : {a: 1, b: 0, c: 0, d: 1, e: 0, f: 0});
      const option = document.createElement('option'); option.value = object.id;
      option.textContent = object.label || object.id; selectBox.append(option);
    }
    query(session.card, '[data-inline-open]').hidden = true;
    session.stage.hidden = false; query(session.card, '[data-inline-controls]').hidden = false;
    session.card.classList.add('inline-active');
    const chosen = session.objects.find(object => object.id === session.selected && session.transforms.has(object.id))
      || session.objects.find(object => object.type === 'text' && session.transforms.has(object.id))
      || session.objects.find(object => session.transforms.has(object.id));
    if (chosen) select(session, chosen.id);
    status(session, chosen ? 'Element ziehen oder mit den Knöpfen verschieben und vergrößern. Danach Änderungen speichern.' : 'Diese Vorlage enthält kein direkt bearbeitbares Element. Öffne „Im Konfi bearbeiten“.');
    sync(session);
  }
  function move(session, object, x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const original = session.record.objects.find(item => item.id === object.id), base = session.transforms.get(object.id);
    if (!base || !original) return;
    object.x = x; object.y = y;
    const matrix = translatedObjectMatrix(base, original, object);
    nodeFor(session, object.id).setAttribute('transform', `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`);
    select(session, object.id); sync(session);
    status(session, dirty(session) ? 'Geändert · noch nicht gespeichert' : 'Gespeicherter Stand');
  }
  function nudge(session, direction, step = 1) {
    if (session.busy || session.drag || !session.record) return false;
    const delta = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]}[direction];
    const object = session.objects.find(object => object.id === session.selected && object.movable);
    if (!delta || !object) return false;
    move(session, object, object.x + delta[0] * step, object.y + delta[1] * step);
    return true;
  }
  function resize(session, factor) {
    if (session.busy || session.drag || !session.record) return false;
    const object = session.objects.find(object => object.id === session.selected && object.movable);
    const original = session.record.objects.find(item => item.id === object?.id);
    const next = scaledInlineObject(original, object, factor);
    if (!next) return false;
    Object.assign(object, next);
    move(session, object, object.x, object.y);
    return true;
  }
  function close(session) {
    session.stage.replaceChildren(); session.stage.hidden = true;
    query(session.card, '[data-inline-open]').hidden = false;
    query(session.card, '[data-inline-open]').disabled = false;
    const starter = query(session.card, '[data-inline-start]');
    if (starter) starter.disabled = false;
    query(session.card, '[data-inline-controls]').hidden = true;
    session.card.classList.remove('inline-active', 'inline-dirty');
    session.card.removeAttribute('aria-busy');
    status(session, ''); active = null; onVisibilityChange();
  }
  function canClose(session) {
    if (session.busy) { status(session, 'Bitte warten, bis Laden oder Speichern abgeschlossen ist.'); return false; }
    return !dirty(session) || window.confirm('Die Änderungen sind noch nicht gespeichert. Wirklich verwerfen?');
  }
  async function load(session) {
    session.busy = true; sync(session); status(session, 'Bearbeitbare Vorlage wird geladen …');
    try {
      const params = new URLSearchParams({productId: session.card.dataset.productId, designId: session.card.dataset.designId});
      draw(session, await request('/originale/design?' + params));
    } catch (error) {
      status(session, error.message, 'error');
      if (!session.record) { active = null; query(session.card, '[data-inline-open]').disabled = false; }
    } finally { session.busy = false; sync(session); }
  }
  async function open(card) {
    if (active?.card === card) return;
    if (active) {
      if (active.busy || dirty(active)) {
        status(active, 'Bitte diese Änderungen zuerst speichern oder zurücksetzen.');
        active.card.scrollIntoView({block: 'nearest'}); return;
      }
      close(active);
    }
    const session = {card, stage: query(card, '[data-inline-stage]'), record: null, objects: [], selected: null, busy: false, conflict: false, drag: null};
    active = session; query(card, '[data-inline-open]').disabled = true;
    await load(session);
  }
  async function save(session) {
    if (session.busy || !dirty(session) || session.drag) return;
    session.busy = true; sync(session); status(session, 'Änderungen werden gespeichert …');
    try {
      const positions = changedPositions(session.record.objects, session.objects);
      const record = await request('/originale/design', {method: 'PATCH', headers: {'Content-Type': 'application/json', 'X-Slate-Review-CSRF': csrf()},
        body: JSON.stringify({productId: session.record.productId, designId: session.record.designId, expectedRevision: session.record.revision, positions})});
      draw(session, record);
      // The saved revision is shown in the status; the gallery image must also
      // see later edits made in the full workshop when history restores it.
      if (record.previewUrl) query(session.card, '[data-preview]').src = latestPreviewUrl(record.previewUrl, location.href);
      status(session, 'Gespeichert · Stand ' + record.revision);
      onSaved(session.card, record);
    } catch (error) {
      session.conflict = error.status === 409;
      status(session, session.conflict ? 'Zwischenzeitlich geändert. Deine Änderungen bleiben erhalten. Prüfe sie, bevor du den aktuellen Stand lädst.' : error.message, 'error');
    } finally { session.busy = false; sync(session); }
  }
  for (const card of cards) {
    const opener = query(card, '[data-inline-open]'); if (!opener) continue;
    const stage = query(card, '[data-inline-stage]');
    opener.addEventListener('click', () => void open(card));
    query(card, '[data-inline-start]')?.addEventListener('click', () => void open(card));
    query(card, '[data-inline-element]').addEventListener('change', event => {
      if (active?.card !== card || active.busy) return;
      select(active, event.target.value); sync(active); stage.focus({preventScroll: true});
    });
    for (const button of card.querySelectorAll('[data-inline-nudge]')) button.addEventListener('click', () => {
      if (active?.card === card && nudge(active, button.dataset.inlineNudge)) stage.focus({preventScroll: true});
    });
    for (const button of card.querySelectorAll('[data-inline-resize]')) button.addEventListener('click', () => {
      const factor = {smaller: .9, larger: 1.1}[button.dataset.inlineResize];
      if (active?.card === card && resize(active, factor)) stage.focus({preventScroll: true});
    });
    const applyPercentage = value => {
      if (active?.card !== card || active.busy) return;
      const object = active.objects.find(object => object.id === active.selected);
      const percentage = Number(value);
      if (!object || !Number.isFinite(percentage) || percentage <= 0 || !resize(active, percentage / 100 / (object.scale ?? 1))) {
        sync(active); status(active, 'Bitte eine Größe größer als 0 Prozent eingeben.', 'error');
      }
    };
    const percentageInput = query(card, '[data-inline-scale]');
    percentageInput?.addEventListener('change', event => applyPercentage(event.target.value));
    percentageInput?.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.isComposing) return;
      event.preventDefault();
      applyPercentage(percentageInput.value);
    });
    query(card, '[data-inline-save]').addEventListener('click', () => { if (active?.card === card) void save(active); });
    query(card, '[data-inline-reset]').addEventListener('click', () => { if (active?.card === card && !active.busy) { const conflict = active.conflict; draw(active, active.record); active.conflict = conflict; sync(active); } });
    query(card, '[data-inline-close]').addEventListener('click', () => { if (active?.card === card && canClose(active)) close(active); });
    query(card, '[data-inline-reload]').addEventListener('click', () => { if (active?.card === card && canClose(active)) void load(active); });
    stage.addEventListener('pointerdown', event => {
      const session = active;
      if (session?.card !== card || session.busy || !session.record || event.button !== 0) return;
      const candidates = [...new Set(document.elementsFromPoint(event.clientX, event.clientY).map(node => node.closest?.('[data-object]')).filter(node => node && stage.contains(node)).map(node => node.dataset.object))]
        .map(id => session.objects.find(object => object.id === id && object.movable)).filter(Boolean).sort((a, b) => a.w * a.h - b.w * b.h);
      const object = candidates[0];
      if (!object) return;
      const matrix = nodeFor(session, object.id).parentNode.getScreenCTM()?.inverse(); if (!matrix) return;
      select(session, object.id); sync(session);
      const start = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
      session.drag = {pointer: event.pointerId, start, matrix, object, x: object.x, y: object.y};
      stage.setPointerCapture(event.pointerId); stage.focus({preventScroll: true}); event.preventDefault();
    });
    stage.addEventListener('pointermove', event => {
      const session = active, drag = session?.drag;
      if (session?.card !== card || drag?.pointer !== event.pointerId) return;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(drag.matrix);
      const dx = point.x - drag.start.x, dy = point.y - drag.start.y;
      if (!drag.moved && Math.hypot(dx, dy) < .25) return;
      drag.moved = true;
      move(session, drag.object, drag.x + dx, drag.y + dy);
    });
    const finish = event => {
      const session = active, drag = session?.drag;
      if (session?.card !== card || drag?.pointer !== event.pointerId) return;
      if (event.type === 'pointercancel') move(session, drag.object, drag.x, drag.y);
      session.drag = null;
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, finish);
    stage.addEventListener('keydown', event => {
      const session = active; if (session?.card !== card || session.busy || !session.record) return;
      const direction = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'}[event.key];
      if (direction && nudge(session, direction, event.shiftKey ? 10 : 1)) event.preventDefault();
      const factor = {'+': 1.1, '=': 1.1, '-': .9}[event.key];
      if (!event.ctrlKey && !event.metaKey && !event.altKey && factor && resize(session, factor)) event.preventDefault();
    });
    new ResizeObserver(() => { if (active?.card === card && active.selected) select(active, active.selected); }).observe(stage);
  }
  window.addEventListener('beforeunload', event => { if (dirty(active)) { event.preventDefault(); event.returnValue = ''; } });
  return {
    beforeFormatChange(card) {
      if (active?.card !== card) return true;
      if (!canClose(active)) return false;
      close(active); return true;
    },
    beforeNavigation() {
      if (!active) return true;
      if (!canClose(active)) return false;
      close(active); return true;
    },
    keepVisible: card => active?.card === card && (active.busy || dirty(active)),
    hasUnsavedChanges: () => dirty(active),
  };
}
