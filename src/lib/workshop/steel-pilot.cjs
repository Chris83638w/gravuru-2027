/* Scoped workshop pilot. Existing catalog products and the shared engine stay unchanged. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GravuruSteelPilot = api;
})(typeof window === 'object' ? window : this, function () {
  'use strict';
  const plates = typeof module === 'object' && module.exports ? require('./plate-geometry.cjs') : window.GravuruPlateGeometry;
  const PROFILE = 'steel-300x200-r5-edge8-v1';
  const K = .552284749831;
  function product(count) {
    if (![2, 4].includes(count)) throw Error('Bohrbild muss zwei oder vier Bohrungen enthalten.');
    const points = count === 2 ? [[8, 100], [292, 100]] : [[8, 8], [292, 8], [8, 192], [292, 192]];
    return {
      id: 'PILOT-ES-300X200-B0' + count, title: 'Edelstahl-Testfall · ' + count + ' Bohrungen',
      pilotProfile: PROFILE, material: 'Edelstahl', method: 'engraving', shape: 'rounded',
      widthMm: 300, heightMm: 200, thicknessMm: 1.5, cornerRadiusMm: 5,
      configured: false, previewEnabled: true, productionConfirmed: false,
      groupName: 'Edelstahl-Testfall · R5 · Randabstand 8 mm',
      holeOptions: [{ count, edgeMm: 8, holes: points.map(([x, y]) => ({ x, y, diameter: 4 })) }]
    };
  }
  function active(p) { return p?.pilotProfile === PROFILE || p?.templateProfile === plates.PROFILE; }
  function assertProduct(p) {
    if(p?.templateProfile === plates.PROFILE){
      const expected=plates.product(p.templateGeometry,p.id,p.title);
      for(const key of ['material','method','shape','widthMm','heightMm','thicknessMm','cornerRadiusMm','holeOptions'])if(JSON.stringify(p[key])!==JSON.stringify(expected[key]))throw Error('Die gespeicherte Maßvorlage wurde verändert: '+key);
      return;
    }
    const count = p?.holeOptions?.[0]?.count;
    const expected = product(count);
    for (const key of ['pilotProfile', 'widthMm', 'heightMm', 'thicknessMm', 'cornerRadiusMm', 'material', 'method', 'shape']) {
      if (p[key] !== expected[key]) throw Error('Das Edelstahl-Testprofil wurde verändert: ' + key);
    }
    if (JSON.stringify(p.holeOptions) !== JSON.stringify(expected.holeOptions)) throw Error('Das Bohrbild passt nicht zum Testprofil.');
  }
  function assertState(p, state) {
    assertProduct(p);
    if (!state || state.width !== p.widthMm || state.height !== p.heightMm || state.holes !== (p.holeOptions[0].count>0) ||
        state.holeCount !== p.holeOptions[0].count || state.mountingKey !== (state.holeCount?'B0' + state.holeCount:'K00') || state.spacers !== false) {
      throw Error('Maße und Bohrbild des Edelstahl-Testfalls sind fest vorgegeben.');
    }
  }
  // Cubic circles avoid SVG arc commands unsupported by the existing PDF compiler.
  function circle(x, y, r) {
    const a = K * r;
    return `M${x + r} ${y}C${x + r} ${y + a} ${x + a} ${y + r} ${x} ${y + r}C${x - a} ${y + r} ${x - r} ${y + a} ${x - r} ${y}C${x - r} ${y - a} ${x - a} ${y - r} ${x} ${y - r}C${x + a} ${y - r} ${x + r} ${y - a} ${x + r} ${y}Z`;
  }
  function geometry(p) {
    assertProduct(p);
    if(p.templateProfile===plates.PROFILE)return plates.geometry(p.templateGeometry);
    const r = 5, a = K * r;
    const outline = `M5 0H295C${295 + a} 0 300 ${5 - a} 300 5V195C300 ${195 + a} ${295 + a} 200 295 200H5C${5 - a} 200 0 ${195 + a} 0 195V5C0 ${5 - a} ${5 - a} 0 5 0Z`;
    const holes = p.holeOptions[0].holes.map(h => ({ x: h.x, y: h.y, r: h.diameter / 2 }));
    return { outline, holes, clip: outline + holes.map(h => circle(h.x, h.y, h.r)).join(' '), gap: 0 };
  }
  function apply(el, p, texture = '') {
    if (!active(p)) return;
    assertProduct(p);
    el.geometry = () => geometry(p);
    const assembly=p.templateGeometry?.assembly;
    const body = el.svgBody;
    el.svgBody = function (preview = true, guides = false) {
      let result = body.call(this, preview, guides);
      if (preview && texture) {
        const g = this.geometry(), clipId = this.uid + '-pilot-texture';
        const material = `<defs><clipPath id="${clipId}"><path d="${g.clip}" clip-rule="evenodd"/></clipPath></defs><image data-material-reference="steel-original" href="${texture}" width="${p.widthMm}" height="${p.heightMm}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
        result = `<path d="${g.outline}" transform="translate(.675 .675)" fill="#737a7d" data-material-depth-mm="1.5"/>` + result.replace('<g id="gravur"', material + (assembly?plates.assemblyPreview(p.templateGeometry):'') + '<g id="gravur"');
        if(assembly?.acrylic)result=result.replaceAll('fill="#000000"','fill="#ededed"');
      }
      return result;
    };
    el.svg = function (preview = false, reference = true) {
      const g = this.geometry();
      const refs = !preview && reference ? `<g id="schildkontur" data-layer="Schildkontur - Referenz" data-coreldraw-outline="hairline" fill="none" stroke="#0000FF" stroke-width="0.001"><path d="${g.outline}"/></g><g id="bohrungen" data-layer="Bohrungen - Referenz" data-coreldraw-outline="hairline" fill="none" stroke="#0000FF" stroke-width="0.001">${g.holes.map(h => `<circle cx="${h.x}" cy="${h.y}" r="${h.r}"/>`).join('')}</g>` : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.widthMm}mm" height="${p.heightMm}mm" viewBox="0 0 ${p.widthMm} ${p.heightMm}">${this.svgBody(preview, false)}${refs}${!preview&&assembly?.bell&&!assembly.acrylic?plates.cutSVG(p.templateGeometry):''}</svg>`;
    };
    el.productionLayerSvg=function(layer){
      if(!assembly||!['steel','acrylic','overview'].includes(layer))throw Error('Keine passende Fertigungsebene.');
      const a=assembly.acrylic;
      if(!a){if(layer!=='steel')throw Error('Keine Acrylebene vorhanden.');return this.svg(false,true);}
      if(layer==='overview'){
        const geo=geometry(p),ag=plates.geometry(plates.acrylicGeometry(a));
        const style='fill="none" stroke-width="0.001" data-coreldraw-outline="hairline"';
        const steel=`<g id="ebene-1-edelstahl" data-layer="1 Edelstahl" stroke="#0000FF" ${style}><path d="${geo.outline}"/>${geo.holes.map(h=>`<circle cx="${h.x}" cy="${h.y}" r="${h.r}"/>`).join('')}</g>`;
        const acrylic=`<g id="ebene-2-acryl" data-layer="2 Acryl ${a.thicknessMm} mm" transform="translate(${a.x} ${a.y})" stroke="#FFFF00" ${style}><path d="${ag.outline}"/>${plates.acrylicHoles(p.templateGeometry).map(h=>`<circle cx="${h.x}" cy="${h.y}" r="${h.diameter/2}"/>`).join('')}${plates.cutSVG(p.templateGeometry).replaceAll('#FF0000','#FFFF00')}</g>`;
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.widthMm}mm" height="${p.heightMm}mm" viewBox="0 0 ${p.widthMm} ${p.heightMm}"><title>Ebenenübersicht zur Zuordnung - keine Fertigungsdatei</title>${steel}${acrylic}</svg>`;
      }
      const steel=layer==='steel',w=steel?p.widthMm:a.width,h=steel?p.heightMm:a.height;
      const outline=steel?geometry(p).outline:plates.geometry(plates.acrylicGeometry(a)).outline;
      const hs=steel?p.holeOptions[0].holes:plates.acrylicHoles(p.templateGeometry);
      const engraving=steel?'':`<defs><clipPath id="acrylic-export-clip"><path d="${outline}"/></clipPath></defs><g clip-path="url(#acrylic-export-clip)"><g transform="translate(${-a.x} ${-a.y})">${this.svgBody(false,false)}</g></g>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}"><g id="${steel?'ebene-1-edelstahl':'ebene-2-acryl'}" data-layer="${steel?'1 Edelstahl':'2 Acryl '+a.thicknessMm+' mm'}">${engraving}<g fill="none" stroke="${steel?'#0000FF':'#FFFF00'}" stroke-width="0.001" data-coreldraw-outline="hairline"><path d="${outline}"/></g><g fill="none" stroke="${steel?'#0000FF':'#FF0000'}" stroke-width="0.001" data-coreldraw-outline="hairline">${hs.map(v=>`<circle cx="${v.x}" cy="${v.y}" r="${v.diameter/2}"/>`).join('')}</g>${steel?'':plates.cutSVG(p.templateGeometry)}</g></svg>`;
    };
    if (el.shadowRoot) {
      const fix = () => Object.assign(el.state, { width: p.widthMm, height: p.heightMm, holes: p.holeOptions[0].count>0, holeCount: p.holeOptions[0].count, mountingKey: p.holeOptions[0].count?'B0' + p.holeOptions[0].count:'K00', spacers: false });
      const sync = el.sync;
      el.sync = function () {
        fix(); sync.call(this); fix(); this.render();
        const label = this.shadowRoot.querySelector('#panel-image .upload strong');
        if (label) label.textContent = 'Foto / Logo hochladen';
        if(assembly){const formats=this.shadowRoot.querySelector('.export-type');if(formats){formats.querySelectorAll('option').forEach(o=>{if(o.value!=='png')o.remove();});formats.value='png';}}
      };
      for (const key of ['holes', 'spacers']) {
        const input = el.shadowRoot.querySelector(`[data-setting=${key}]`);
        if (input) { input.disabled = true; input.parentElement.hidden = true; }
      }
      const note = el.shadowRoot.querySelector('.stage-note');
      if (note) note.textContent = `Edelstahl · ${p.widthMm} × ${p.heightMm} × 1,5 mm · ${p.holeOptions[0].count} Bohrungen · feste Maßvorlage. Neue Vorlagen vor der Fertigung prüfen.`;
    }
  }
  return { PROFILE, product, active, assertProduct, assertState, geometry, apply };
});
