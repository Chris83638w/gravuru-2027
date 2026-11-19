// Ring Wired Pro comparison case for beta #267.
// Price, SKU and the Strichdesign path come from the catalog pin.
// The device image is the public file whose SHA-256 matches that catalog index.
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createCartLedger} from './beta-267-cart.mjs';

const root = new URL('./test-fixtures/beta-267/', import.meta.url);
export const ringPin = JSON.parse(fs.readFileSync(new URL('ring-pin.json', root), 'utf8'));
const devicePath = fileURLToPath(new URL(ringPin.device.localFile, root));
const previewScript = fileURLToPath(new URL('./beta-267-ring-preview.py', import.meta.url));

export function ringDeviceBytes(){
  const bytes = fs.readFileSync(devicePath);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if(sha !== ringPin.device.sha256 || bytes.length !== ringPin.device.bytes){
    throw Object.assign(Error('Das Ring-Gerätebild entspricht nicht dem Katalogindex.'), {code:'ring_device_mismatch'});
  }
  return bytes;
}

export function ringUnitCents(mountingKey = 'K00'){
  if(mountingKey !== 'K00'){
    throw Object.assign(Error('Dieser Vergleich gilt nur für Keine Befestigung. Ein Aufpreis wird hier nicht erfunden.'), {code:'ring_surcharge_refused'});
  }
  if(ringPin.mountingK00.surchargeCents !== 0 || ringPin.variant.priceCents !== 4999 || ringPin.basePriceCents !== 4999){
    throw Object.assign(Error('Der gepinnte Ring-Preis ist nicht mehr 49,99 Euro.'), {code:'ring_price_pin'});
  }
  return ringPin.variant.priceCents;
}

export function renderRingPreview({designId, text, scale = 5}){
  const design = ringPin.designs[designId];
  if(!design) throw Object.assign(Error('Unbekanntes Ring-Design.'), {code:'ring_design'});
  ringDeviceBytes();
  const child = spawnSync(process.env.GRAVURU_PYTHON || 'python3', [previewScript], {
    input: JSON.stringify({scale, plate: ringPin.plate, bounds: ringPin.bellImageBounds, device: devicePath, marks: design.marks || [], text}),
    maxBuffer: 16 * 1024 * 1024
  });
  if(child.status !== 0) throw Object.assign(Error(child.stderr?.toString() || 'Ring-Vorschau fehlgeschlagen.'), {code:'ring_preview'});
  const parsed = JSON.parse(child.stdout.toString());
  return {png: Buffer.from(parsed.png, 'hex'), samples: parsed.samples, deviceCenter: parsed.deviceCenter, width: parsed.width, height: parsed.height, design};
}

export function ringPreviewSvg({designId, text}){
  const design = ringPin.designs[designId];
  const esc = value => String(value).replace(/[&<>"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const marks = (design.marks || []).map(mark => `<path d="${esc(mark.d)}" fill="none" stroke="#ffffff" stroke-width="${mark.width}" data-original-mark="true"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ringPin.plate.widthMm} ${ringPin.plate.heightMm}" data-device-sha="${ringPin.device.sha256}" data-design="${designId}"><image href="doorbell-asset" x="${ringPin.bellImageBounds.x}" y="${ringPin.bellImageBounds.y}" width="${ringPin.bellImageBounds.width}" height="${ringPin.bellImageBounds.height}"/>${marks}<text x="24" y="40">${esc(text)}</text></svg>`;
}

export function requireSourcedPrice(material, source){
  if(!source || !Number.isSafeInteger(source.unitCents)){
    throw Object.assign(Error(material + ': Preis fehlt in der gelesenen Quelle und wird nicht ergänzt.'), {code:'price_open'});
  }
  return source.unitCents;
}

export function ringCartLines(){
  const unitCents = ringUnitCents();
  const nord = renderRingPreview({designId:'FK-RUNDUM', text:'Haus Nord 12'});
  const sued = renderRingPreview({designId:'FK-SEITLICH', text:'Haus Süd 27'});
  const ledger = createCartLedger();
  const common = {variantId: ringPin.variant.variantId, productTitle: 'Klingelschild Ring Wired Pro (3. Gen)', options:[{label:'Farbe', value:'Schwarz'},{label:'Rahmen', value:'Ganzer Rahmen'},{label:'Befestigung', value:'Keine Befestigung'}], unitCents, quantity:1, currency:'EUR'};
  const lineA = ledger.commit({...common, designName: nord.design.name, gravurtext:'Haus Nord 12', designSha256: createHash('sha256').update('FK-RUNDUM|Haus Nord 12').digest('hex'), previewPng: nord.png, snapshotId:'ring-nord'});
  const lineB = ledger.commit({...common, designName: sued.design.name, gravurtext:'Haus Süd 27', designSha256: createHash('sha256').update('FK-SEITLICH|Haus Süd 27').digest('hex'), previewPng: sued.png, snapshotId:'ring-sued'});
  return {ledger, lineA, lineB, nord, sued};
}
