const assert = require('node:assert/strict');

async function devicePhotoReference(frame) {
  return frame.evaluate(async () => {
    const el = document.querySelector('gravuru-configurator');
    const svg = new DOMParser().parseFromString(
      el.svg(),
      'image/svg+xml',
    ).documentElement;
    const photo = Array.from(svg.querySelectorAll('image')).find((n) =>
      /^\/doorbell-assets\//.test(n.getAttribute('href')),
    );
    if (!photo) throw Error('Das gebundene Ring-Originalbild fehlt im Editor.');
    const image = new Image();
    image.src = photo.getAttribute('href');
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const [ox, oy, width, height] = svg
      .getAttribute('viewBox')
      .split(/\s+/)
      .map(Number);
    const read = (k) => Number(photo.getAttribute(k));
    const scale = Math.min(
      read('width') / canvas.width,
      read('height') / canvas.height,
    );
    const x0 = read('x') + (read('width') - canvas.width * scale) / 2;
    const y0 = read('y') + (read('height') - canvas.height * scale) / 2;
    const samples = [];
    for (let y = 2; y < canvas.height - 2; y += 3)
      for (let x = 2; x < canvas.width - 2; x += 3) {
        const i = (y * canvas.width + x) * 4;
        const [r, g, b, a] = data.subarray(i, i + 4);
        if (a > 245 && b - r > 40 && g - r > 18 && b > 85)
          samples.push([
            (x0 + (x + 0.5) * scale - ox) / width,
            (y0 + (y + 0.5) * scale - oy) / height,
            r,
            g,
            b,
          ]);
      }
    if (samples.length < 24)
      throw Error('Zu wenige markante Bildpunkte im Ring-Original.');
    return Array.from(
      { length: 24 },
      (_, i) => samples[Math.floor((i * samples.length) / 24)],
    );
  });
}
async function devicePhotoMatches(image, samples) {
  return image.evaluate((img, points) => {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    return points.filter(([x, y, r, g, b]) => {
      const i =
        (Math.floor(y * c.height) * c.width + Math.floor(x * c.width)) * 4;
      return (
        data[i + 2] - data[i] > 20 &&
        Math.max(
          Math.abs(data[i] - r),
          Math.abs(data[i + 1] - g),
          Math.abs(data[i + 2] - b),
        ) < 52
      );
    }).length;
  }, samples);
}
async function checkDevicePhoto(image, samples) {
  const matched = await devicePhotoMatches(image, samples);
  assert.ok(
    matched >= 17,
    'Ring-Gerätefoto im gespeicherten Bild: ' + matched + '/24 Merkmale',
  );
  return matched;
}
async function checkOriginalAngle(image, expected) {
  // Ring 16 × 28, K00. The verified source 994bd7bd has the path M22 87 H138 V237.
  const counts = await image.evaluate((img) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const bright = (x, y, vertical) => {
      const col = Math.round(((x + 8) * canvas.width) / 176),
        row = Math.round(((y + 8) * canvas.height) / 296);
      for (let d = -2; d <= 2; d++) {
        const idx =
          ((row + (vertical ? 0 : d)) * canvas.width +
            col +
            (vertical ? d : 0)) *
          4;
        if (Math.min(data[idx], data[idx + 1], data[idx + 2]) > 112)
          return true;
      }
      return false;
    };
    return {
      horizontal: Array.from({ length: 16 }, (_, i) =>
        bright(40 + i * 4, 87, false),
      ).filter(Boolean).length,
      vertical: Array.from({ length: 16 }, (_, i) =>
        bright(138, 112 + i * 6, true),
      ).filter(Boolean).length,
    };
  });
  if (expected)
    assert.ok(
      counts.horizontal >= 14 && counts.vertical >= 14,
      'Originalwinkel fehlt: ' + JSON.stringify(counts),
    );
  else
    assert.ok(
      counts.horizontal <= 2 && counts.vertical <= 2,
      'Fremder Originalwinkel: ' + JSON.stringify(counts),
    );
  return counts;
}

module.exports = {
  devicePhotoReference,
  devicePhotoMatches,
  checkDevicePhoto,
  checkOriginalAngle,
};
