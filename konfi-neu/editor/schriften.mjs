// Schriften laden: jede Schrift genau einmal, als WOFF2, erst wenn sie gebraucht wird.
import {schriftFamilie} from '../core/zeichnen.mjs';

const geladen = new Map(); // Name → Promise<ArrayBuffer>

/**
 * @param {string} basis  Adresse des veröffentlichten Datenordners
 * @param {Record<string,{u:string}>} verzeichnis  Schriften des Produkts
 */
export function schriftLader(basis, verzeichnis) {
  function laden(name) {
    if (geladen.has(name)) return geladen.get(name);
    const eintrag = verzeichnis[name];
    if (!eintrag) return Promise.reject(new Error('Schrift nicht verfügbar: ' + name));
    const promise = fetch(basis + eintrag.u)
      .then(response => { if (!response.ok) throw new Error('Schrift ' + name + ': ' + response.status); return response.arrayBuffer(); })
      .then(async bytes => {
        const face = new FontFace(schriftFamilie(name), bytes.slice(0));
        await face.load();
        document.fonts.add(face);
        return bytes;
      });
    promise.catch(() => geladen.delete(name)); // nach einem Netzfehler erneut versuchen dürfen
    geladen.set(name, promise);
    return promise;
  }
  return {
    laden,
    alle: namen => Promise.all([...new Set(namen)].map(laden)),
    /** @font-face-Regeln mit eingebetteten Schriften, für das Warenkorbbild. */
    async css(namen) {
      const regeln = [];
      for (const name of new Set(namen)) {
        const bytes = new Uint8Array(await laden(name));
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        regeln.push(`@font-face{font-family:"${schriftFamilie(name)}";src:url(data:font/woff2;base64,${btoa(binary)})}`);
      }
      return regeln.join('');
    },
    verfuegbar: name => Boolean(verzeichnis[name]),
    namen: () => Object.keys(verzeichnis),
  };
}
