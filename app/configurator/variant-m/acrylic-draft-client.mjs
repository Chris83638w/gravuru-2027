// Only access metadata belongs in sessionStorage. Photos/design data remain in
// the existing private server package and in the editor, never in URLs/storage.
export function createAcrylicDraftClient({fetchImpl = globalThis.fetch, storage} = {}) {
  const known = new Map();
  return async function save(input, csrfToken) {
    const key = 'gravuru-acrylic-private:' + JSON.stringify([input.productId, input.productRevision, input.designId]);
    let previous = known.get(key);
    if (!previous) {
      let raw;
      try {raw = storage.getItem(key); storage.setItem(key, raw || 'null'); previous = raw ? JSON.parse(raw) : null;}
      catch {throw Error('Der private Entwurfszugriff kann in diesem Tab nicht gespeichert werden. Bitte den Browserspeicher zulassen.');}
      if (previous && (!/^adraft_[a-f0-9-]+$/.test(previous.id) || !/^[a-f0-9]{64}$/.test(previous.token) ||
          !Number.isSafeInteger(previous.revision) || previous.revision < 1)) throw Error('Der gespeicherte Entwurfszugriff ist ungültig.');
    }
    const endpoint = '/api/workshop/acrylic-drafts' + (previous ? '/' + previous.id : '');
    const response = await fetchImpl(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json',
      'X-Gravuru-CSRF': csrfToken, ...(previous ? {'X-Gravuru-Draft': previous.token} : {})},
      body: JSON.stringify({input, ...(previous ? {expectedRevision: previous.revision} : {})})});
    const result = await response.json();
    if (!response.ok) throw Error(result.error?.message || 'Der private Acrylentwurf konnte nicht gespeichert werden.');
    const credential = {id: result.id, token: previous?.token || result.token, revision: result.revision};
    if (!/^adraft_[a-f0-9-]+$/.test(credential.id) || !/^[a-f0-9]{64}$/.test(credential.token) ||
        !Number.isSafeInteger(credential.revision) || credential.revision !== (previous ? previous.revision + 1 : 1) ||
        previous && credential.id !== previous.id || typeof result.snapshotId !== 'string') throw Error('Die Entwurfssicherung wurde nicht vollständig bestätigt.');
    known.set(key, credential);
    let accessStored = true;
    try {storage.setItem(key, JSON.stringify(credential));} catch {accessStored = false;}
    return {id: result.snapshotId, draftId: credential.id, revision: credential.revision, accessStored};
  };
}
