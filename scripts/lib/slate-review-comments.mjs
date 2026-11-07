import {DatabaseSync} from 'node:sqlite';

const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };

// Review notes belong to stable original IDs, including originals without native targets.
// They never write a template, product document, approval, or catalogue original.
export function createSlateReviewComments(filename, designIds) {
  const ids = new Set(designIds), db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS review_comments (
      design_id TEXT NOT NULL, revision INTEGER NOT NULL,
      text TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(design_id, revision)
    );`);
  const known = id => { if (!ids.has(id)) fail(404, 'Diese Vorlage wurde nicht gefunden.'); };
  const get = id => {
    known(id);
    return db.prepare('SELECT revision, text, updated_at AS updatedAt FROM review_comments WHERE design_id=? ORDER BY revision DESC LIMIT 1').get(id)
      || {revision: 0, text: '', updatedAt: null};
  };
  return {
    get,
    all: (selectedIds = [...ids]) => Object.fromEntries(selectedIds.map(id => [id, get(id)])),
    save(id, text, expectedRevision) {
      known(id);
      if (typeof text !== 'string' || text.length > 10000) fail(422, 'Bitte einen Kommentar mit höchstens 10.000 Zeichen eingeben.');
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) fail(422, 'Bitte die Galerie neu laden.');
      db.exec('BEGIN IMMEDIATE');
      try {
        const old = get(id);
        if (old.revision !== expectedRevision) fail(409, 'Dieser Kommentar wurde inzwischen in einem anderen Fenster geändert. Deine Eingabe bleibt erhalten. Bitte kopiere sie vor dem Neuladen.');
        if (old.text === text) { db.exec('COMMIT'); return old; }
        db.prepare('INSERT INTO review_comments VALUES(?,?,?,?)').run(id, old.revision + 1, text, new Date().toISOString());
        db.exec('COMMIT');
        return get(id);
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close: () => db.close(),
  };
}
