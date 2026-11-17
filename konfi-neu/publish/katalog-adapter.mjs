// Einzige Stelle, an der der Neuaufbau bestehenden Code aus app/ benutzt.
//
// Warum: Welches Design zu welcher Familie und Größe passt, wie eine Kontur aussieht und wo
// Bohrlöcher sitzen, ist abgenommene Fachlogik (Katalogregeln, Entscheidungen von Chris).
// Die wird hier nicht neu erfunden, sondern beim Veröffentlichen einmal ausgeführt.
// Der Kunde lädt davon nichts: Im Browser landet nur das fertige Ergebnis.
import {openKatalog} from '../../app/workshop/katalog-source.mjs';
import {designTargets, assignTargetSeries} from '../../app/workshop/design-targets.mjs';
import {parseDesignSvg} from '../../app/workshop/katalog-convert.mjs';
import {geometryOf} from '../../app/workshop/product-families.mjs';
import {holesFor} from '../../app/platform/sources/app/shared/models/mounting-rules.mjs';
import {nativeContour} from '../../app/workshop/acrylic-artwork.mjs';
import {PROCESSING_PROFILES, MATERIAL_COLORS} from '../../app/platform/sources/app/shared/models/processing-profiles.mjs';

export function katalogOeffnen(root) {
  return openKatalog(root);
}

/** Designs, die für diese Familie freigegeben sind (Freigabe setzt nur Chris). */
export function freigegebeneDesigns(katalog, familyId) {
  return katalog.designs.masters.filter(design =>
    !design.hidden &&
    designTargets(design, katalog).some(t => t.familie === familyId && t.freigabe?.status === 'freigegeben'));
}

/** Je Design: passende Größen der Familie und ob proportional eingepasst wird. */
export function groessenZuordnung(katalog, family, designs) {
  return assignTargetSeries(family, designs, katalog).map(row => ({
    design: row.design,
    sizes: row.sizes,
    einpassen: row.proportionalFit === true,
    alteGroesse: row.oldSize === true,
  }));
}

export function designEbenen(design) {
  return parseDesignSvg(design.svg());
}

/** Außenkontur einer Größe als SVG-Pfad in mm (Ursprung links oben). */
export function konturPfad(family, size) {
  const geometry = geometryOf(family, size);
  const contour = nativeContour({...geometry, holes: []});
  return {d: contour.contours[0].d, form: geometry.shape, radius: geometry.cornerRadiusMm || 0};
}

/** Bohrlöcher für eine Befestigungsregel; leere Liste bei Kleben oder ohne Bohrung. */
export function bohrloecher(family, size, rule) {
  if (!rule || rule.layout === 'none' || !rule.count) return [];
  const group = family.groups.find(g => g.key === size.groupKey);
  if (group?.shape === 'contour') {
    return (size.holesMm || []).map(h => ({x: h.x, y: h.y, d: h.diameterMm}));
  }
  if (rule.diameterMm == null || rule.edgeMm == null) return null; // Bohrbild im Katalog offen
  return holesFor(geometryOf(family, size), rule).map(h => ({x: h.x, y: h.y, d: h.diameter}));
}

export function verfahren(family) {
  const profile = PROCESSING_PROFILES.find(p => p.id === family.material?.processingProfileId);
  if (!profile) return null;
  return {id: profile.id, art: profile.method === 'print' ? 'druck' : 'gravur', farbe: profile.ink};
}

/**
 * Darstellung des Materials in der Vorschau. Nur Anzeige, keine Fertigungsangabe.
 * Texturen gibt es bisher nur für Edelstahl; andere Materialien zeigen ihre Grundfarbe.
 */
export function materialDarstellung(family, appRoot) {
  const kind = family.material.kind;
  const farbe = kind === 'acrylic' && family.material.variant === 'anthrazit' ? '#3a3d40' : MATERIAL_COLORS[kind] || MATERIAL_COLORS.other;
  const images = appRoot + '/designs/aosu-labrador/runtime/images/';
  return {
    farbe,
    textur: kind === 'steel' ? images + 'gravuru-edelstahl-feine-maserung-vorschau.webp' : null,
    schraube: images + 'gravuru-schraubenkopf-fotorealistisch.webp',
  };
}
