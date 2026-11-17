// Kundenfoto für die Bearbeitung vorbereiten: eine verkleinerte Ansicht für den Editor.
// Das Original wird unverändert hochgeladen und für die Fertigung verwendet.
const MAX_KANTE = 1600;
const MAX_BYTES = 30 * 1024 * 1024;

export async function fotoVorbereiten(datei, {grau = false} = {}) {
  if (datei.size > MAX_BYTES) throw new Error('Das Foto ist größer als 30 MB. Bitte wähle eine kleinere Datei.');
  let quelle;
  try {
    quelle = await createImageBitmap(datei, {imageOrientation: 'from-image'});
  } catch {
    throw new Error('Dieses Bildformat kann dein Browser nicht öffnen. Bitte verwende JPG oder PNG.');
  }
  const k = Math.min(1, MAX_KANTE / Math.max(quelle.width, quelle.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(quelle.width * k);
  canvas.height = Math.round(quelle.height * k);
  canvas.getContext('2d').drawImage(quelle, 0, 0, canvas.width, canvas.height);
  quelle.close?.();
  return {
    url: canvas.toDataURL('image/jpeg', 0.86), w: canvas.width, h: canvas.height, grau,
    // Hinweis für die Werkstatt: so viele Pixel hat das Original.
    original: {w: Math.round(canvas.width / k), h: Math.round(canvas.height / k)},
  };
}
