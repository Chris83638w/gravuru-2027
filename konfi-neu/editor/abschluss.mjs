// Abschluss: Gestaltung speichern und als EINE Position in den Warenkorb legen.
//
// Ablauf (zwei Anfragen statt bisher rund zehn):
//   1. POST <api>/gestaltungen   → Server prüft, rechnet den Preis nach, speichert unveränderlich,
//                                  antwortet mit Kennung und signierten Warenkorb-Angaben.
//   2. Warenkorb des Shops       → Position mit diesen Angaben hinzufügen (oder alte Position ersetzen).
// Der Zustand liegt danach beim Server und in der Warenkorbzeile – nicht in einem Browser-Tab.
import {gestaltungSvg} from '../core/zeichnen.mjs';

const dataUrl = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
const bildCache = new Map();
function alsDataUrl(adresse) {
  if (!bildCache.has(adresse)) bildCache.set(adresse, fetch(adresse).then(r => r.blob()).then(dataUrl));
  return bildCache.get(adresse);
}

/** Bild der Gestaltung als WebP (Rückfall JPEG), so wie der Kunde es sieht. */
export async function vorschauBild(zustand, familie, {basis, schriften, breite = 900}) {
  const material = {...familie.material};
  if (material.textur) material.textur = await alsDataUrl(basis + material.textur);
  if (material.schraube) material.schraube = await alsDataUrl(basis + material.schraube);
  const schriftCss = await schriften.css(zustand.els.filter(el => el.t === 'text').map(el => el.font));
  const svg = gestaltungSvg(zustand, {...familie, material}, {schriftCss, breite, hintergrund: '#f3f6f6'});
  const bild = new Image();
  bild.decoding = 'async';
  bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await bild.decode();
  const canvas = document.createElement('canvas');
  canvas.width = bild.naturalWidth || breite;
  canvas.height = bild.naturalHeight || breite;
  canvas.getContext('2d').drawImage(bild, 0, 0, canvas.width, canvas.height);
  let url = canvas.toDataURL('image/webp', 0.85);
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.85);
  return url;
}

export async function abschliessen({o, zustand, familie, eintrag, schriften, uploads}) {
  // Originalfotos müssen oben sein, bevor gespeichert wird.
  const originale = {};
  for (const el of zustand.els) {
    if (el.t !== 'foto' || !el.bild) continue;
    if (el.bild.upload) { originale[el.id] = el.bild.upload; continue; }
    const upload = uploads.get(el.id);
    if (!upload) throw Object.assign(new Error('Foto ohne Upload'), {kundentext: 'Ein Foto wurde noch nicht hochgeladen. Bitte lade es erneut hoch.'});
    originale[el.id] = (await upload).id;
  }
  const vorschau = await vorschauBild(zustand, familie, {basis: o.basis, schriften});
  // Für den Server zählt das Original; die verkleinerte Ansicht bleibt zur Wiederbearbeitung erhalten.
  const sauber = {...zustand, els: zustand.els.map(el => el.t === 'foto' && el.bild ? {...el, bild: {...el.bild, upload: originale[el.id]}} : el)};
  const antwort = await fetch(o.api + '/gestaltungen', {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({zustand: sauber, vorschau, vorgaenger: o.bearbeiten ? {id: o.bearbeiten.id, token: o.bearbeiten.token} : null, stand: eintrag.stand || null}),
  });
  const daten = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw Object.assign(new Error('Speichern ' + antwort.status + ' ' + (daten.code || '')), {kundentext: daten.kundentext});
  // daten.position = {sku, menge, eigenschaften}: genau das, was in die Warenkorbzeile gehört.
  if (o.bearbeiten?.zeile) await o.shop.ersetzen(o.bearbeiten.zeile, daten.position);
  else await o.shop.hinzufuegen(daten.position);
  return daten;
}
