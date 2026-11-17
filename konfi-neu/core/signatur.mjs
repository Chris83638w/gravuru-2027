// Preisangabe einer Warenkorbzeile, vom Server unterschrieben.
//
// Problem bisher: Die Preisfunktion im Shopify-Warenkorb hat den Zählern in den Zeileneigenschaften
// vertraut. Die kann ein Kunde im Browser ändern; aufgefallen ist das erst nach der Zahlung.
// Jetzt: Der Server rechnet den Aufpreis aus, unterschreibt ihn zusammen mit Gestaltung, Variante
// und Ablaufdatum. Die Preisfunktion prüft nur noch diese Unterschrift. Ohne gültige Unterschrift
// gibt es keinen Aufpreis-Nachlass, sondern eine gesperrte Zeile an der Kasse.
//
// Format der Eigenschaft `_gravuru_preis`:  v1.<aufpreisCents>.<staffel>.<ablaufSekunden>.<unterschrift>
// Unterschrieben wird:                      v1|<gestaltung>|<variante>|<aufpreisCents>|<staffel>|<ablaufSekunden>
// <staffel> ist die Mengenstaffel als Text, z. B. "3x5_5x10_10x15" (ab 3 Stück 5 % …), oder "0" ohne Staffel.
//
// Die Datei läuft in Node (Server) und – ohne node:crypto – in der Shopify-Funktion.
import {hmacSha256Base64Url} from './sha256.mjs';

export const PREIS_VERSION = 'v1';

export function nachricht(gestaltung, variante, aufpreisCents, staffel, ablauf) {
  return [PREIS_VERSION, gestaltung, String(variante), String(aufpreisCents), staffel, String(ablauf)].join('|');
}

/** [{ab, prozent}] → "3x5_5x10" */
export function staffelText(stufen) {
  const liste = (stufen || []).filter(s => Number.isInteger(s.ab) && Number.isInteger(s.prozent) && s.ab > 1 && s.prozent > 0 && s.prozent < 100).sort((a, b) => a.ab - b.ab);
  return liste.length ? liste.map(s => `${s.ab}x${s.prozent}`).join('_') : '0';
}

/** Stückpreis in Cent nach Staffel; rundet wie core/modell.mjs. */
export function staffelPreis(listeCents, menge, staffel) {
  let prozent = 0;
  if (staffel !== '0') for (const teil of staffel.split('_')) { const [ab, p] = teil.split('x').map(Number); if (menge >= ab) prozent = p; }
  return prozent ? Math.round(listeCents * (100 - prozent) / 100) : listeCents;
}

export function unterschreiben(schluessel, {gestaltung, variante, aufpreisCents, staffel = '0', ablauf}) {
  if (!Number.isInteger(aufpreisCents) || aufpreisCents < 0) throw new Error('Aufpreis muss eine ganze Zahl in Cent sein.');
  if (!/^(0|\d+x\d+(_\d+x\d+)*)$/.test(staffel)) throw new Error('Ungültige Staffel.');
  const signatur = hmacSha256Base64Url(schluessel, nachricht(gestaltung, variante, aufpreisCents, staffel, ablauf));
  return `${PREIS_VERSION}.${aufpreisCents}.${staffel}.${ablauf}.${signatur}`;
}

/** @returns {{ok:true, aufpreisCents:number, staffel:string} | {ok:false, grund:string}} */
export function pruefen(schluessel, wert, {gestaltung, variante, jetzt}) {
  const teile = String(wert || '').split('.');
  if (teile.length !== 5 || teile[0] !== PREIS_VERSION) return {ok: false, grund: 'format'};
  const aufpreisCents = Number(teile[1]);
  const staffel = teile[2];
  const ablauf = Number(teile[3]);
  if (!Number.isInteger(aufpreisCents) || aufpreisCents < 0 || !Number.isInteger(ablauf) || !/^(0|\d+x\d+(_\d+x\d+)*)$/.test(staffel)) return {ok: false, grund: 'format'};
  const erwartet = hmacSha256Base64Url(schluessel, nachricht(gestaltung, variante, aufpreisCents, staffel, ablauf));
  // Vergleich ohne frühes Abbrechen
  let abweichung = erwartet.length ^ teile[4].length;
  for (let i = 0; i < erwartet.length; i++) abweichung |= erwartet.charCodeAt(i) ^ (teile[4].charCodeAt(i) || 0);
  if (abweichung !== 0) return {ok: false, grund: 'unterschrift'};
  if (jetzt != null && jetzt > ablauf) return {ok: false, grund: 'abgelaufen'};
  return {ok: true, aufpreisCents, staffel};
}
