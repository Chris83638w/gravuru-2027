// SVG-Pfade in mm: verkleinern und Hüllbox berechnen. Läuft in Node und im Browser.

const TOKEN = /[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/**
 * Pfad für die Vorschau verkleinern: Zahlen auf 0,01 mm runden, überflüssige Zeichen entfernen.
 * 0,01 mm liegt weit unter jeder Fertigungstoleranz. Die Fertigungsdatei benutzt dieselben Pfade;
 * Schnittpfade (Geräteaussparungen) werden mit 0,001 mm veröffentlicht.
 */
export function kompaktPfad(d, digits = 2) {
  const tokens = String(d).match(TOKEN) || [];
  let out = '';
  let previousWasNumber = false;
  for (const token of tokens) {
    if (/^[a-zA-Z]$/.test(token)) {
      out += token;
      previousWasNumber = false;
      continue;
    }
    let text = String(Number(Number(token).toFixed(digits)));
    if (text.startsWith('0.')) text = text.slice(1);
    else if (text.startsWith('-0.')) text = '-' + text.slice(2);
    if (previousWasNumber && !text.startsWith('-')) out += ' ';
    out += text;
    previousWasNumber = true;
  }
  return out;
}
