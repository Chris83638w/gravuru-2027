// K12 / V1, V2, V3, V5: Katalog → Werkstatt.
// - `katalogDesignToTemplate`: design.svg (Lieferform 2: Ebenen `text-<n>` als echter
//   Text, `motiv-`/`deko-` Vektoren, `foto-` Fotofeld, `guide-` Hilfsebene) + design.json
//   → Vorlage im Produktformat (`profile.designs[]`-Objekt mit `objects[]`), dazu
//   eingebettete Motive, Rechte-Dokument (K2) und Ebenenrolle (K3).
// - `formatSeries`: Größen einer Familie nach Seitenverhältnis ±1 % gruppiert; ein
//   Design gehört zur Reihe seines Plattenmaßes, sonst `oldSize` (Katalogregel 7).
// - `scaleTemplate`/`templateFit`: Master → Zielgröße als reine Skalierung (Schriftgröße
//   mit, Bohrbild nie), Ergebnis „passt / prüfen / passt nicht“ über `customerLayoutIssue`.
// - `katalogFamilyToProduct`: Familie + Linie/Unterkategorie + Größe → Produktdokument über
//   die vorhandene Familienanlage (`familyProductConfig`), Preise in Cent (offen = Fehler).
// design.json (optional, nur gelesene Felder): `themes:[…]`, `bestseller`, `fields:{<ebene>:
// {required, maxLength, maxLines, locked, label}}`. Pflichtfeld ohne Angabe: das Namensfeld
// (`data-feld` name/familie/hausnummer, sonst der größte Text) – alles andere wird nicht geraten.
import {measureText} from '../platform/sources/app/shared/models/doorbell-preview.mjs';
import {validColor} from '../platform/sources/app/shared/models/processing-profiles.mjs';
import {escapeXml,validContentId} from '../platform/sources/app/shared/models/design-content.mjs';
import {customerLayoutIssue} from '../configurator/variant-m/contract.mjs';
import {applyNewMotifRights,checkWholePrintDesign} from '../configurator/variant-m/new-motif-rights.mjs';
import {familyProductConfig,familyProcess,geometryOf,validateFamily,sizeQuantityTiers} from './product-families.mjs';
import {quantityTiersIssue} from '../configurator/variant-m/contract.mjs';
import fs from 'node:fs';
import {makeProductDocument,validateProductDocument} from './product-model.mjs';
import {textLimits,textLimitIssue,TEXT_LIMIT_RANGES} from './theme-limits.mjs';
import {FONT_SET_ALWAYS} from './katalog-source.mjs';
import {MAX_FORM_DESIGNS as MAX_TEMPLATES} from './form-designs.mjs';

const fail=message=>{throw Object.assign(Error(message),{status:422,code:'katalog_design'});};
export const SERIES_TOLERANCE=0.01;// ±1 % Seitenverhältnis (README Ebene 3)
const EXACT=0.001;// darunter gilt die Umrechnung als reine Skalierung ohne Einpassen
const LAYER=/^(text|motiv|deko|foto|guide)-([A-Za-z0-9_.-]+)$/;
const slug=v=>String(v).replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'x';
const round=v=>Math.round(v*1000)/1000;

// ---- SVG lesen (ohne DOM): Elementbaum aus Start-, End- und Textknoten. ----
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const decode=s=>s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10)):ENTITIES[e.toLowerCase()]??m);
function parseXml(text){
 const root={tag:'#root',attrs:{},children:[]},stack=[root];
 const re=/<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
 let m;
 while((m=re.exec(text))){
  const parent=stack[stack.length-1];
  if(m[1]!==undefined)parent.children.push({tag:'#text',text:m[1]});
  else if(m[2]){if(parent.tag!==m[2])fail('SVG: Element „'+m[2]+'“ falsch geschlossen.');stack.pop();}
  else if(m[3]){
   const attrs={};for(const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1]]=decode(a[2]??a[3]??'');
   const node={tag:m[3],attrs,children:[]};parent.children.push(node);if(!m[5])stack.push(node);
  }else if(m[6]!==undefined){const t=decode(m[6]);if(t.trim()||parent.tag==='text'||parent.tag==='tspan')parent.children.push({tag:'#text',text:t});}
 }
 if(stack.length!==1)fail('SVG: Element „'+stack[stack.length-1].tag+'“ nicht geschlossen.');
 const svg=root.children.find(n=>n.tag==='svg');
 if(!svg)fail('SVG: kein <svg>-Wurzelelement.');
 return svg;
}
const find=(node,tag)=>{if(node.tag===tag)return node;for(const c of node.children||[]){const r=find(c,tag);if(r)return r;}return null;};
const findAll=(node,tags,out=[])=>{if(tags.includes(node.tag))out.push(node);for(const c of node.children||[])findAll(c,tags,out);return out;};
const num=(v,label)=>{if(v===undefined)return undefined;const n=Number(String(v).replace(/(mm|px)$/,''));if(!Number.isFinite(n))fail('SVG: '+label+' ist keine Zahl („'+v+'“).');return n;};
function svgSize(svg){
 const vb=(svg.attrs.viewBox||'').trim().split(/[\s,]+/).map(Number);
 if(vb.length===4&&vb.every(Number.isFinite)&&vb[2]>0&&vb[3]>0){if(vb[0]||vb[1])fail('SVG: viewBox muss bei 0 0 beginnen.');return [vb[2],vb[3]];}
 const w=num(svg.attrs.width,'width'),h=num(svg.attrs.height,'height');
 if(!(w>0&&h>0))fail('SVG: Maße fehlen (viewBox in mm).');return [w,h];
}
// Nur translate(x y) und rotate(a[ cx cy]) – mehr braucht Lieferform 2 nicht.
function transformOf(value){
 const t={dx:0,dy:0,rotation:0};if(!value)return t;
 for(const [,fn,args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)){
  const a=args.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if(fn==='translate'&&a.length>=1&&a.every(Number.isFinite)){t.dx+=a[0];t.dy+=a[1]||0;}
  else if(fn==='rotate'&&(a.length===1||a.length===3)&&a.every(Number.isFinite)){t.rotation+=a[0];if(a.length===3)t.pivot=[a[1],a[2]];}
  else fail('SVG: Transformation „'+fn+'“ wird nicht unterstützt (nur translate und rotate).');
 }
 return t;
}
// Hüllbox eines Pfads aus allen Stütz- und Kontrollpunkten (für Kurven konservativ).
export function pathBounds(d){
 const tokens=d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)||[];
 let cmd='',x=0,y=0,sx=0,sy=0,i=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const add=(px,py)=>{minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);};
 const next=()=>{const v=Number(tokens[i++]);if(!Number.isFinite(v))fail('SVG: Pfad unvollständig.');return v;};
 while(i<tokens.length){
  const t=tokens[i];if(/^[A-Za-z]$/.test(t)){cmd=t;i++;if(cmd==='Z'||cmd==='z'){x=sx;y=sy;continue;}}
  if(!cmd)fail('SVG: Pfad beginnt ohne Befehl.');
  const rel=cmd===cmd.toLowerCase(),c=cmd.toUpperCase();
  const pt=(px,py)=>rel?[x+px,y+py]:[px,py];
  if(c==='M'||c==='L'||c==='T'){const [px,py]=pt(next(),next());x=px;y=py;add(x,y);if(c==='M'){sx=x;sy=y;cmd=rel?'l':'L';}}
  else if(c==='H'){const v=next();x=rel?x+v:v;add(x,y);}
  else if(c==='V'){const v=next();y=rel?y+v:v;add(x,y);}
  else if(c==='C'){for(let k=0;k<3;k++){const [px,py]=pt(next(),next());add(px,py);if(k===2){x=px;y=py;}}}
  else if(c==='S'||c==='Q'){for(let k=0;k<2;k++){const [px,py]=pt(next(),next());add(px,py);if(k===1){x=px;y=py;}}}
  else if(c==='A'){const rx=Math.abs(next()),ry=Math.abs(next());next();next();next();const [px,py]=pt(next(),next());
   // Bogen: konservativ Start- und Endpunkt um die Radien erweitern (exakte Extrema nicht nötig für die Hüllbox).
   add(x-rx,y-ry);add(x+rx,y+ry);x=px;y=py;add(x-rx,y-ry);add(x+rx,y+ry);}
  else fail('SVG: unbekannter Pfadbefehl „'+cmd+'“.');
 }
 if(!Number.isFinite(minX))fail('SVG: Pfad ohne Punkte.');
 return [minX,minY,maxX-minX,maxY-minY];
}
// Exakte Hüllbox der Grundformen; Pfade über pathBounds.
const shapeBounds=n=>{
 const a=n.attrs,v=k=>num(a[k],k)??0;
 if(n.tag==='rect')return [v('x'),v('y'),v('width'),v('height')];
 if(n.tag==='circle')return [v('cx')-v('r'),v('cy')-v('r'),2*v('r'),2*v('r')];
 if(n.tag==='ellipse')return [v('cx')-v('rx'),v('cy')-v('ry'),2*v('rx'),2*v('ry')];
 return pathBounds(shapePath(n));
};
const shapePath=n=>{
 const a=n.attrs,v=k=>num(a[k],k)??0;
 if(n.tag==='path')return a.d||'';
 if(n.tag==='rect'){const x=v('x'),y=v('y'),w=v('width'),h=v('height');return `M${x} ${y} L${x+w} ${y} L${x+w} ${y+h} L${x} ${y+h} Z`;}
 if(n.tag==='circle'||n.tag==='ellipse'){const cx=v('cx'),cy=v('cy'),rx=n.tag==='circle'?v('r'):v('rx'),ry=n.tag==='circle'?v('r'):v('ry');return `M${cx-rx} ${cy} A${rx} ${ry} 0 1 0 ${cx+rx} ${cy} A${rx} ${ry} 0 1 0 ${cx-rx} ${cy} Z`;}
 if(n.tag==='polygon'||n.tag==='polyline'){const p=(a.points||'').trim().split(/[\s,]+/).map(Number);if(p.length<4)fail('SVG: Polygon ohne Punkte.');return 'M'+p[0]+' '+p[1]+p.slice(2).reduce((s,q,i)=>s+(i%2?' '+q:' L'+q),'')+(n.tag==='polygon'?' Z':'');}
 return '';
};
const textContent=node=>{
 const spans=findAll(node,['tspan']),preserve=node.attrs['xml:space']==='preserve';
 const text=n=>{const value=n.children.filter(c=>c.tag==='#text').map(c=>c.text).join('');return preserve?value:value.trim();};
 if(!spans.length)return {text:text(node),lines:1,firstY:undefined,lineHeight:undefined};
 let y=num(node.attrs.y,'text y')??0;const lines=spans.map(s=>{if(s.attrs.y!==undefined)y=num(s.attrs.y,'tspan y');y+=num(s.attrs.dy,'tspan dy')??0;return {text:text(s),y};});
 const breaks=lines.some((l,i)=>i&&Math.abs(l.y-lines[i-1].y)>1e-9);
 if(!breaks)return {text:text(node)+lines.map(l=>l.text).join(''),lines:1,firstY:lines[0].y,lineHeight:undefined};
 const rows=[];for(const l of lines){if(rows.length&&Math.abs(l.y-rows.at(-1).y)<1e-9)rows.at(-1).text+=l.text;else rows.push({...l});}
 const distances=rows.slice(1).map((l,i)=>l.y-rows[i].y),lineHeight=distances[0];
 if(!(lineHeight>0)||distances.some(v=>Math.abs(v-lineHeight)>.000001))fail('SVG: ungleichmäßige oder rückwärts laufende Textzeilen benötigen eine Quellkorrektur.');
 return {text:rows.map(l=>l.text).join('\n'),lines:rows.length,firstY:rows[0].y,lineHeight};
};
const fontFamily=v=>String(v??'').split(',')[0].trim().replace(/^["']|["']$/g,'');

export function parseDesignSvg(svgText){
 const svg=parseXml(svgText),[widthMm,heightMm]=svgSize(svg),layers=[],notes=[];
 for(const node of svg.children){
  if(node.tag==='#text'||['title','desc','defs','metadata','style'].includes(node.tag))continue;
  const id=node.attrs.id||'';
  if(id==='platte'||id==='kontur'||id==='rueckplatte'||id.startsWith('bohrbild'))continue;
  const m=id.match(LAYER);
  if(!m){notes.push('Ebene ohne Lieferform-2-Kennung übersprungen: <'+node.tag+(id?' id="'+id+'"':'')+'>');continue;}
  const kind=m[1],t=transformOf(node.attrs.transform);
  if(kind==='text'||(kind==='guide'&&find(node,'text'))){
   const textNodes=findAll(node,['text']);if(!textNodes.length)fail('Ebene „'+id+'“ enthält keinen <text>.');
   if(textNodes.length>1&&findAll(node,['g']).some(g=>g!==node&&g.attrs.transform))fail('Ebene „'+id+'“: verschachtelte Texttransformationen benötigen eine Quellkorrektur.');
   const rows=textNodes.map(el=>{
    const inner=transformOf(el.attrs.transform),content=textContent(el),size=num(el.attrs['font-size'],'font-size von „'+id+'“');
    if(!content.text||!(size>0))fail('Ebene „'+id+'“: Text oder font-size in mm fehlt.');
    return {id,kind,fieldKey:node.attrs['data-feld']||el.attrs['data-feld']||null,text:content.text,lines:content.lines,lineHeight:content.lineHeight??size*1.2,font:fontFamily(el.attrs['font-family'])||fail('Ebene „'+id+'“: font-family fehlt.'),size,x:(num(el.attrs.x,'x')??0)+t.dx+inner.dx,y:(content.firstY??num(el.attrs.y,'y')??0)+t.dy+inner.dy,anchor:el.attrs['text-anchor']||'start',letterSpacing:num(el.attrs['letter-spacing'],'letter-spacing')??0,fill:el.attrs.fill||node.attrs.fill||null,rotation:t.rotation+inner.rotation};
   });
   const first=rows[0];
   if(rows.length>1){
    const keys=['fieldKey','font','size','x','anchor','letterSpacing','fill','rotation'];
    if(rows.some(row=>row.lines!==1||keys.some(key=>row[key]!==first[key])))fail('Ebene „'+id+'“: zusammengehöriger Text braucht gleiche Schrift, Ausrichtung und Zeilenachse. Bitte die Quellgruppe prüfen.');
    const step=rows[1].y-first.y;
    if(!(step>0)||rows.slice(1).some((row,i)=>Math.abs(row.y-rows[i].y-step)>.000001))fail('Ebene „'+id+'“: ungleichmäßige Textzeilen benötigen eine Quellkorrektur.');
    layers.push({...first,text:rows.map(row=>row.text).join('\n'),lines:rows.length,lineHeight:step});
   }else layers.push(first);
  }else if(kind==='foto'){
   const mask=findAll(node,['rect','circle','ellipse','path']).find(n=>n.tag!=='path'||!n.attrs.d?.startsWith('M0'));
   if(!mask)fail('Ebene „'+id+'“: Fotofeld braucht eine Maske (rect, circle, ellipse oder path).');
   const bounds=shapeBounds(mask);
   if(mask.tag==='path')notes.push('Fotofeld „'+id+'“: Maske ist ein Pfad – als Rechteck übernommen, bitte prüfen.');
   // Platzhalterbild im Fotofeld (Musterfoto samt Upload-Hinweis aus der Vorlage): nur Vorschau, nie Fertigung.
   const image=findAll(node,['image'])[0],href=image?(image.attrs.href||image.attrs['xlink:href']||''):'';
   layers.push({id,kind,shape:mask.tag==='circle'||mask.tag==='ellipse'&&Math.abs(num(mask.attrs.rx,'rx')-num(mask.attrs.ry,'ry'))<0.01?'circle':'rect',bounds:[bounds[0]+t.dx,bounds[1]+t.dy,bounds[2],bounds[3]].map(round),rotation:t.rotation,...(/^[\w.-]+\.(png|jpe?g)$/i.test(href)?{placeholder:href}:{})});
  }else{
   const parts=(node.tag==='g'?findAll(node,['path','rect','circle','ellipse','polygon','polyline']):[node]).map(n=>({d:shapePath(n).trim(),fill:n.attrs.fill||node.attrs.fill||null,fillRule:n.attrs['fill-rule']||node.attrs['fill-rule']||'nonzero',stroke:n.attrs.stroke||node.attrs.stroke||null,strokeMm:num(n.attrs['stroke-width']??node.attrs['stroke-width'],'stroke-width')??1,opacity:num(n.attrs.opacity??node.attrs.opacity,'opacity')??1,transform:transformOf(n===node?'':n.attrs.transform)})).filter(p=>p.d);
   if(!parts.length)fail('Ebene „'+id+'“ enthält keine Vektorpfade.');
   for(const p of parts){if(p.transform.rotation)fail('Ebene „'+id+'“: gedrehte Einzelpfade werden nicht unterstützt.');if(p.transform.dx||p.transform.dy)fail('Ebene „'+id+'“: verschobene Einzelpfade werden nicht unterstützt.');if(!/^[MmLlHhVvCcSsQqTtAaZz\d.,+eE\s-]+$/.test(p.d))fail('Ebene „'+id+'“: Pfad enthält nicht erlaubte Zeichen.');if(p.strokeMm<0)fail('Ebene „'+id+'“: stroke-width darf nicht negativ sein.');if(p.opacity<0||p.opacity>1)fail('Ebene „'+id+'“: opacity muss zwischen 0 und 1 liegen.');}
   const nodes=node.tag==='g'?findAll(node,['path','rect','circle','ellipse','polygon','polyline']):[node];
   const boxes=nodes.filter(n=>shapePath(n).trim()).map(shapeBounds),x0=Math.min(...boxes.map(b=>b[0])),y0=Math.min(...boxes.map(b=>b[1])),x1=Math.max(...boxes.map(b=>b[0]+b[2])),y1=Math.max(...boxes.map(b=>b[1]+b[3]));
   layers.push({id,kind,paths:parts.map(p=>p.d),pathAttributes:parts.map(p=>({fill:p.fill,evenodd:p.fillRule==='evenodd',stroke:p.stroke,strokeMm:p.strokeMm,opacity:p.opacity})),translation:[t.dx,t.dy],fill:parts.find(p=>p.fill&&p.fill!=='none')?.fill||null,bounds:[x0+t.dx,y0+t.dy,x1-x0,y1-y0].map(round),rotation:t.rotation});
  }
 }
 return {widthMm,heightMm,layers,notes};
}

// ---- Design → Vorlage ----
const fieldRule=(design,layerId)=>{const f=design.fields?.[layerId];if(f===undefined)return {};if(!f||typeof f!=='object'||Array.isArray(f))fail(design.id+': design.json fields.'+layerId+' ist kein Objekt.');for(const k of Object.keys(f))if(!['required','maxLength','maxLines','locked','label'].includes(k))fail(design.id+': design.json fields.'+layerId+' kennt „'+k+'“ nicht.');for(const k of ['required','locked'])if(f[k]!==undefined&&typeof f[k]!=='boolean')fail(design.id+': fields.'+layerId+'.'+k+' ist true oder false.');for(const k of ['maxLength','maxLines']){const [min,max]=TEXT_LIMIT_RANGES[k];if(f[k]!==undefined&&!(Number.isInteger(f[k])&&f[k]>=min&&f[k]<=max))fail(design.id+': fields.'+layerId+'.'+k+' ist eine ganze Zahl von '+min+' bis '+max+'.');}return f;};
// design.json `movable: true` (Vorgabe Chris 20.10.2026 für Gedenktafeln 22 × 14): alle Elemente
// verschiebbar – Texte wie bisher, dazu Motive und das Fotofeld (ohne Skalieren, Ersetzen bleibt beim Foto).
const movableAll=design=>design.json?.movable===true||design.movable===true;
const samePlate=(a,b)=>Math.abs(a[0]-b[0])<0.5&&Math.abs(a[1]-b[1])<0.5;

// Die historische Corel-Plattenfläche ist ein einzelnes, deckendes Rechteck.
// Eine volle Hüllbox allein ist kein Flächennachweis: auch Rahmen und randlaufende Motive haben sie.
const isPlateArea=layer=>{
 if(layer.paths.length!==1)return false;
 const a=layer.pathAttributes[0];if(a.fill==='none'||a.stroke&&a.stroke!=='none'||a.opacity!==1)return false;
 const tokens=layer.paths[0].match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)||[];
 if(tokens.length!==13||[0,3,6,9,12].map(i=>tokens[i]).join('')!=='MLLLZ')return false;
 const points=[1,4,7,10].map(i=>[Number(tokens[i]),Number(tokens[i+1])]);
 return new Set(points.map(p=>p.join(','))).size===4&&points.every((p,i)=>{const q=points[(i+1)%4];return (p[0]===q[0])!==(p[1]===q[1]);});
};

// `fonts`: Glyphenressourcen (Name → {regular:{units,glyphs}}) aller Schriften, die das
// Design verwendet; fehlt eine, bricht die Umwandlung mit „Schrift fehlt“ ab (nie Ersatz).
export function katalogDesignToTemplate(design,family,theme,{fonts={},svgText}={}){
 const process=familyProcess(family);if(!process)fail(design.id+': Verfahrensprofil der Familie „'+family.id+'“ ist offen.');
 const motifPolicy={wholePrintDesign:design.json?.wholePrintDesign!==undefined?design.json.wholePrintDesign:design.wholePrintDesign};checkWholePrintDesign(motifPolicy,process.method);
 const parsed=parseDesignSvg(svgText??design.svg()),plate=design.plateMm||[parsed.widthMm,parsed.heightMm];
 if(!samePlate(plate,[parsed.widthMm,parsed.heightMm]))fail(design.id+': SVG-Maß '+parsed.widthMm+' × '+parsed.heightMm+' mm widerspricht dem Plattenmaß '+plate[0]+' × '+plate[1]+' mm.');
 const paint=(value)=>{const v=String(value);if(!/^(?:#[0-9a-f]{3}(?:[0-9a-f]{3})?|[a-z]+|rgba?\([\d\s.,%]+\))$/i.test(v))fail(design.id+': Druckfarbe enthält einen nicht unterstützten Wert: '+v);return escapeXml(v);};
 const print=process.method==='print',ink=process.ink,templateId='katalog-'+slug(design.id),themeId=theme?.id??design.themes?.[0]??null;
 const objects=[],motifs=[],rights={},notes=[...parsed.notes],usedFonts=new Set(),fieldKeys=new Set(),placeholders=[];
 // Namensfeld = Feldschlüssel mit name/familie/hausnummer, sonst der Text mit der größten Schrift.
 const texts=parsed.layers.filter(l=>l.kind==='text');
 const nameLayer=texts.find(l=>/name|familie|hausnummer/i.test(l.fieldKey||''))||texts.reduce((best,l)=>!best||l.size>best.size?l:best,null);
 let photo=false;
 for(const layer of parsed.layers){
  const id=slug(layer.id),rule=fieldRule(design,layer.id),guide=layer.kind==='guide';
  if(layer.kind==='text'||(guide&&layer.text)){
   const font=layer.font;if(!fonts[font])fail(design.id+': Schrift fehlt: '+font+' (Ebene „'+layer.id+'“).');
   const fieldKey=layer.fieldKey||id;
   if(!validContentId(fieldKey)||fieldKeys.has(fieldKey))fail(design.id+': Feldschlüssel „'+fieldKey+'“ ungültig oder doppelt.');fieldKeys.add(fieldKey);
   const o={id,type:'text',text:layer.text,font,size:round(layer.size),textAnchor:layer.anchor,letterSpacing:layer.letterSpacing||0,lineHeight:layer.lineHeight,x:0,y:0,w:1,h:1,rotation:round(layer.rotation),color:print&&validColor(layer.fill)?layer.fill.toLowerCase():ink,bold:false,templateOrigin:true,customerEditable:!guide};
   try{measureText(o,fonts);}catch(e){fail(design.id+': Ebene „'+layer.id+'“ – '+e.message);}
   // SVG: x/y = Grundlinie der ersten Zeile; Werkstatt: x/y = Mitte des Textkastens
   // (Grundlinie liegt bei Mitte + 0,35 · Größe, Zeilenabstand 1,2 · Größe, siehe textPaths).
   o.x=round(layer.anchor==='middle'?layer.x:layer.anchor==='end'?layer.x-o.w/2:layer.x+o.w/2);
   o.y=round(layer.y-0.35*o.size+(layer.lines-1)/2*o.lineHeight);
   if(guide){o.role='guide';o.locked=true;rights[id]={content:false,color:false,replace:false,move:false,scale:false,delete:false};}
   else{
    o.fieldKey=fieldKey;o.required=rule.required??(layer===nameLayer);
    if(rule.maxLength!==undefined)o.maxLength=rule.maxLength;if(rule.maxLines!==undefined)o.maxLines=rule.maxLines;
    const issue=textLimitIssue(o.text,textLimits(o,{themes:design.themes||[]},{themeId}));if(issue)fail(design.id+': Mustertext „'+fieldKey+'“ – '+issue);
    if(o.size<process.minTextMm-0.005)notes.push('Text „'+fieldKey+'“ ist mit '+o.size+' mm kleiner als die Mindestgröße '+process.minTextMm+' mm des Verfahrens.');
    const locked=rule.locked===true;
    rights[id]={content:true,color:print,replace:false,move:!locked,scale:!locked,delete:!locked&&!o.required};
   }
   usedFonts.add(font);objects.push(o);
  }else if(layer.kind==='foto'){
   if(!process.tools.photo)fail(design.id+': Fotofeld „'+layer.id+'“, aber das Verfahren „'+process.id+'“ sieht kein Foto vor.');
   const [bx,by,bw,bh]=layer.bounds,fieldKey='photo-'+id;
   if(fieldKeys.has(fieldKey))fail(design.id+': Fotofeld „'+fieldKey+'“ doppelt.');fieldKeys.add(fieldKey);
   objects.push({id,type:'photoSlot',fieldKey,photoShape:layer.shape,required:rule.required??true,x:round(bx+bw/2),y:round(by+bh/2),w:round(bw),h:round(bh),rotation:round(layer.rotation),templateOrigin:true,customerEditable:true});
   rights[id]={content:false,color:false,replace:true,move:movableAll(design),scale:false,delete:false};photo=true;
   if(layer.placeholder)placeholders.push({slotId:id,file:layer.placeholder,widthMm:round(bw),heightMm:round(bh)});
  }else{
   const [bx,by,bw,bh]=layer.bounds;
   if(samePlate([bw,bh],plate)&&Math.abs(bx)<0.5&&Math.abs(by)<0.5&&isPlateArea(layer)){notes.push('Ebene „'+layer.id+'“ füllt die ganze Platte (Plattenfläche aus Corel) und wird nicht übernommen.');continue;}
   const key=templateId+'-'+id;
   motifs.push({key,svgFragment:layer.paths.map((d,i)=>{
    const a=layer.pathAttributes?.[i]||{},fill=print?paint(a.fill??'#000000'):a.fill==='none'?'none':'currentColor',stroke=a.stroke&&a.stroke!=='none'?(print?paint(a.stroke):'currentColor'):null;
    // Gravur ersetzt nur die Farbe durch Profiltinte; Kontur, Aussparungen und Deckkraft bleiben Quelle.
    return '<path d="'+d+'" fill="'+fill+'" fill-rule="'+(a.evenodd?'evenodd':'nonzero')+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+a.strokeMm+'"':'')+(a.opacity!==undefined&&(print||a.opacity!==1)?' opacity="'+a.opacity+'"':'')+'/>';
   }).join(''),bounds:[round(bx),round(by),round(bw),round(bh)],embeddedOnly:true});
   const movable=movableAll(design)&&!guide;
   const o={id,type:'motif',motif:key,x:round(bx+bw/2),y:round(by+bh/2),w:round(bw),h:round(bh),rotation:round(layer.rotation),color:print&&validColor(layer.fill)?layer.fill.toLowerCase():ink,templateOrigin:true,customerEditable:(print||movable)&&!guide};
   if(!o.customerEditable)o.locked=true;if(guide)o.role='guide';
   // Verschiebbare Motive auch skalierbar (Ecken-Pfeile; Chris 20.10.2026: „die Pfeile sind nicht an den Ecken“).
   rights[id]=applyNewMotifRights(o,{content:false,color:print&&!guide,replace:movable,move:movable,scale:movable,delete:movable},motifPolicy);
   objects.push(o);
  }
 }
 if(!objects.length)fail(design.id+': keine Ebenen text-/motiv-/deko-/foto- gefunden.');
 if(objects.length>20)fail(design.id+': höchstens 20 Elemente je Vorlage ('+objects.length+' gefunden).');
 const template={id:templateId,name:design.name,objects,marks:[],themes:design.themes??[],bestseller:design.bestseller===true,katalog:{designId:design.id,source:design.source,plateMm:[plate[0],plate[1]]}};
 if(motifPolicy.wholePrintDesign!==undefined)template.wholePrintDesign=motifPolicy.wholePrintDesign;
 return {template,motifs,rights,photo,placeholders,fonts:[...usedFonts],notes,process:process.id};
}

// ---- Formatreihen ----
const ratioMatch=(a,b,tolerance)=>Math.abs(a/b-1)<=tolerance;
export function formatSeries(family,tolerance=SERIES_TOLERANCE){
 const series=[];
 for(const s of [...family.sizes].sort((a,b)=>a.widthMm*a.heightMm-b.widthMm*b.heightMm||a.widthMm-b.widthMm)){
  const ratio=s.widthMm/s.heightMm,hit=series.find(r=>ratioMatch(ratio,r.ratio,tolerance));
  if(hit)hit.sizes.push(s.key);else series.push({key:`${s.widthMm}x${s.heightMm}`.replace(/\.0(?=x|$)/g,''),ratio,widthMm:s.widthMm,heightMm:s.heightMm,masterKey:s.key,sizes:[s.key]});
 }
 return series;
}
export function seriesOf(series,plateMm,tolerance=SERIES_TOLERANCE){
 if(!Array.isArray(plateMm)||!(plateMm[0]>0&&plateMm[1]>0))return null;
 return series.find(r=>ratioMatch(plateMm[0]/plateMm[1],r.ratio,tolerance))||null;
}
// Design → Reihe der Familie; ohne passende Reihe `oldSize:true` (nur Einpassen, nie Übernahme).
// Nennt `design.json` eine Liste `sizes` (Größen-Schlüssel der Familie, z. B. aus den Corel-Bögen:
// grüne Überschrift = wählbar), gilt genau diese Liste – sonst alle Größen der Reihe gleichen
// Seitenverhältnisses. So bleiben Rechteck, abgerundete Ecken und Oval derselben Proportion
// getrennt (Edelstahl Türschilder, 23.10.2026); unbekannte Schlüssel werden ignoriert.
// The historical Retro masters explicitly list the green Corel sheet sizes in
// sizesOpen. Resolve only those names to already drawn family sizes; never extend
// a design to unlisted sizes or infer a new physical plate from the old canvas.
export function sourceContourSizes(family,design){
 if(family.material?.kind!=='steel')return [];
 const keys=[];
 for(const name of design.json?.sizesOpen||[]){
  const m=/^TR([12])-V2A-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(name);
  if(!m)continue;
  for(const s of family.sizes)if(s.groupKey==='RT'+m[1]&&family.groups.find(g=>g.key===s.groupKey)?.shape==='contour'&&Math.abs(s.widthMm-Number(m[2])*10)<.001&&Math.abs(s.heightMm-Number(m[3])*10)<.001)keys.push(s.key);
 }
 return [...new Set(keys)];
}
export function assignSeries(family,designs,tolerance=SERIES_TOLERANCE){
 const series=formatSeries(family,tolerance),known=new Set(family.sizes.map(s=>s.key));
 return designs.map(design=>{
  const hit=seriesOf(series,design.plateMm,tolerance),explicit=Array.isArray(design.json?.sizes)?design.json.sizes.filter(k=>typeof k==='string'&&known.has(k)):null;
  const sourceKeys=sourceContourSizes(family,design),mapped=sourceKeys.length>0;
  const sizes=mapped?[...new Set([...(explicit||[]),...sourceKeys])]:explicit??(hit?hit.sizes:[]);
  const contourOnly=!hit&&sizes.length>0&&sizes.every(k=>family.groups.find(g=>g.key===family.sizes.find(s=>s.key===k)?.groupKey)?.shape==='contour');
  const target=contourOnly?series.find(r=>r.sizes.includes(sizes[0])):null;
  return {design,series:hit?.key??target?.key??null,sizes,explicitSizes:explicit!==null||mapped,oldSize:!hit&&!target,...(mapped?{sourceContourSizes:sourceKeys}:{}),...(contourOnly?{proportionalFit:true}:{})};
 });
}

// ---- Master → Zielgröße ----
export function scaleTemplate(template,fromMm,toMm,fonts,{contain=false}={}){
 const widthScale=toMm[0]/fromMm[0],scale=contain?Math.min(widthScale,toMm[1]/fromMm[1]):widthScale,deviation=Math.abs((fromMm[1]*widthScale)/toMm[1]-1);
 if(!contain&&deviation>SERIES_TOLERANCE)fail('Vorlage „'+template.id+'“ gehört nicht zur Formatreihe von '+toMm[0]+' × '+toMm[1]+' mm.');
 const copy=structuredClone(template),dx=contain?(toMm[0]-fromMm[0]*scale)/2:0,dy=contain?(toMm[1]-fromMm[1]*scale)/2:0;
 copy.objects=copy.objects.map(o=>{
  const n={...o,x:round(o.x*scale+dx),y:round(o.y*scale+dy),w:round(o.w*scale),h:round(o.h*scale)};
  if(o.type==='text'){n.size=round(o.size*scale);if(o.letterSpacing!==undefined)n.letterSpacing=round(o.letterSpacing*scale);if(o.lineHeight!==undefined)n.lineHeight=o.lineHeight*scale;measureText(n,fonts);}
  if(o.strokeWidth!==undefined)n.strokeWidth=round(o.strokeWidth*scale);
  return n;
 });
 copy.katalog={...copy.katalog,scale,targetMm:[toMm[0],toMm[1]],ratioDeviation:round(deviation),...(contain?{fitMode:'proportional-contain',offsetMm:[round(dx),round(dy)],sourceMm:[...fromMm]}:{})};
 return copy;
}
// Motivpfade liegen in mm des Masters; `localFontIds` erlaubt kein transform im Fragment,
// deshalb werden die Pfadkoordinaten selbst skaliert.
export function scaleEmbeddedMotifs(motifs,scale){
 return motifs.map(m=>({...m,bounds:m.bounds.map(v=>round(v*scale)),svgFragment:m.svgFragment.replace(/d="([^"]*)"/g,(_,d)=>'d="'+scaleArcAware(d,scale)+'"').replace(/stroke-width="([^"]+)"/g,(_,width)=>'stroke-width="'+round(Number(width)*scale)+'"')}));
}
// Bogenbefehle: Radien und Endpunkt skalieren, Drehwinkel und Flags nicht.
function scaleArcAware(d,scale){
 // Große Motivpfade nicht gleichzeitig als Eingabe-, Token- und Ausgabe-Array halten.
 // Die Ausgabe bleibt bytegleich (auch Bogenflags, Winkel und Rundung).
 const token=/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g,chunks=[];
 let cmd='',k=0,part=[],match;
 while((match=token.exec(d))){
  const t=match[0];
  if(/^[A-Za-z]$/.test(t)){cmd=t.toUpperCase();k=0;part.push(t);}
  else{const pos=cmd==='A'?k%7:-1;part.push(pos===2||pos===3||pos===4?t:String(round(Number(t)*scale)));k++;}
  if(part.length===1024){chunks.push(part.join(' '));part=[];}
 }
 if(part.length)chunks.push(part.join(' '));
 return chunks.join(' ');
}
// „passt“: reine Skalierung ohne Einpassen, alle Elemente in der Gestaltungsfläche;
// „prüfen“: eingepasst (Reihe ±1 %) oder Text unter der Mindestgröße des Verfahrens;
// „passt nicht“: ein Element verlässt die Gestaltungsfläche (customerLayoutIssue).
export function templateFit(template,family,size,fonts,{motifs=[]}={}){
 const g=geometryOf(family,size),profile={kind:'universal-product',geometry:{width:g.width,height:g.height,...g,shape:g.shape==='plaque'?'rect':g.shape,safeMarginMm:family.designArea.marginMm??0,...(g.shape==='contour'?{holeKeepoutMm:family.designArea.keepoutMm,holes:g.holesMm.map(h=>({x:h.x,y:h.y,diameter:h.diameterMm}))}:{holes:[]})}};
 const process=familyProcess(family),issues=[];
 for(const o of template.objects){
  const measured=o.type==='text'?measureText(structuredClone(o),fonts):o;
  const issue=customerLayoutIssue(measured,profile,{motifs});if(issue)issues.push((o.fieldKey||o.id)+': '+issue);
 }
 if(issues.length)return {status:'passt nicht',issues};
 const review=[];
 if((template.katalog?.ratioDeviation??0)>EXACT)review.push('Seitenverhältnis weicht um '+(template.katalog.ratioDeviation*100).toFixed(2)+' % ab (eingepasst).');
 for(const o of template.objects)if(o.type==='text'&&o.customerEditable!==false&&process&&o.size<process.minTextMm-0.005)review.push((o.fieldKey||o.id)+': '+o.size+' mm unter der Mindestgröße '+process.minTextMm+' mm.');
 return review.length?{status:'prüfen',issues:review}:{status:'passt',issues:[]};
}

// ---- Familie → Produktmodell ----
const cents=v=>v===null||(Number.isSafeInteger(v)&&v>=0);
// Preisüberschreibungen der Unterkategorie auf eine Kopie der Familie anwenden
// (`priceOverrides.sizes[<key>]`, `.mounting[<regel-id>]`, `.options["<gruppe>/<option>"]`).
export function applyPriceOverrides(family,subcategory){
 const f=structuredClone(family),o=subcategory?.priceOverrides||{};
 for(const [key,value] of Object.entries(o.sizes||{})){const s=f.sizes.find(s=>s.key===key);if(!s)fail('Unterkategorie „'+subcategory.id+'“: Preis für unbekannte Größe „'+key+'“.');if(!cents(value))fail('Preis '+key+' prüfen.');s.baseCents=value;}
 for(const [key,value] of Object.entries(o.mounting||{})){const r=f.mountingRules.find(r=>r.id===key);if(!r)fail('Unterkategorie „'+subcategory.id+'“: Preis für unbekannte Befestigung „'+key+'“.');if(!cents(value))fail('Preis '+key+' prüfen.');r.priceCents=value;}
 for(const [key,value] of Object.entries(o.options||{})){const [gid,cid]=key.split('/'),c=(f.options||[]).find(g=>g.id===gid)?.choices.find(c=>c.id===cid);if(!c)fail('Unterkategorie „'+subcategory.id+'“: Preis für unbekannte Option „'+key+'“.');if(!cents(value))fail('Preis '+key+' prüfen.');c.priceCents=value;}
 // K14 / Ü11.1: Staffel der Unterkategorie überschreibt die der Familie (Liste = alle Größen).
 const tiers=o.quantityTiers;
 if(tiers!==undefined){
  const family=Array.isArray(tiers)?tiers:tiers.family;
  if(family!==undefined){f.quantityTiers=structuredClone(family);for(const s of f.sizes)delete s.quantityTiers;}
  for(const [key,value] of Object.entries(Array.isArray(tiers)?{}:tiers.sizes||{})){const s=f.sizes.find(s=>s.key===key);if(!s)fail('Unterkategorie „'+subcategory.id+'“: Staffel für unbekannte Größe „'+key+'“.');s.quantityTiers=structuredClone(value);}
 }
 return validateFamily(f);
}
// Vorgabe-Staffeln (app/workshop/quantity-tier-defaults.json): gelten nur, wenn weder
// Unterkategorie noch Familie/Größe eine Staffel nennen. Erste passende Regel gewinnt.
export const QUANTITY_TIER_DEFAULTS_SCHEMA='gravuru-quantity-tier-defaults/v1';
export function validateQuantityTierDefaults(doc){
 if(!doc||doc.schema!==QUANTITY_TIER_DEFAULTS_SCHEMA||!Array.isArray(doc.rules))fail('Staffel-Vorgaben: unbekanntes Format.');
 const ids=new Set();
 for(const r of doc.rules){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||Object.keys(r).some(k=>!['id','label','lineIds','themeIds','tiers'].includes(k)))fail('Staffel-Vorgaben: Regel mit eindeutiger Kennung, Linien/Themen und Stufen.');
  ids.add(r.id);
  for(const k of ['lineIds','themeIds'])if(r[k]!==undefined&&(!Array.isArray(r[k])||r[k].some(v=>typeof v!=='string'||!v)))fail('Staffel-Vorgaben „'+r.id+'“: '+k+' ist eine Liste von Kennungen.');
  const issue=quantityTiersIssue(r.tiers);if(issue)fail('Staffel-Vorgaben „'+r.id+'“: '+issue);
 }
 return doc;
}
let bundledDefaults=null;
export function quantityTierDefaults(){
 bundledDefaults??=validateQuantityTierDefaults(JSON.parse(fs.readFileSync(new URL('./quantity-tier-defaults.json',import.meta.url),'utf8')));
 return bundledDefaults;
}
export function defaultQuantityTiers(line,subcategory,defaults=quantityTierDefaults()){
 const rule=defaults.rules.find(r=>(r.lineIds||[]).includes(line?.id)||(subcategory?.themeId&&(r.themeIds||[]).includes(subcategory.themeId)));
 return rule?{ruleId:rule.id,tiers:structuredClone(rule.tiers)}:null;
}
export function priceGaps(family,size){
 const gaps=[];
 if(size.baseCents===null)gaps.push('Preis offen: '+size.label);
 for(const id of size.mounting){const r=family.mountingRules.find(r=>r.id===id);if(r&&r.priceCents===null)gaps.push('Preis offen: Befestigung „'+r.label+'“ ('+size.label+')');}
 return gaps;
}
const productName=(line,subcategory,family,size)=>line.name+' – '+subcategory.name+' · '+family.groups.find(g=>g.key===size.groupKey).name+' '+size.label;
const cleanId=v=>String(v).toLowerCase().replace(/[^a-z0-9._:-]+/g,'-').replace(/^-+|-+$/g,'');

// `templates`: [{template (auf die Größe skaliert), motifs, rights}], `fonts`: Glyphen der
// Schriften, die die Vorlagen verwenden (eingebettet wie bisher, ≤ 64). Das Schrift-Set der
// Unterkategorie wird nicht je Produkt eingebettet, sondern als Schriftprofil der
// Profilbibliothek zugeordnet (`fontProfileId` → profileAssignments.fonts, siehe
// katalog-import.mjs `ensureFontSet`); fehlende Set-Schriften werden gemeldet, nie erfunden.
export function katalogFamilyToProduct(family,line,subcategory,{size,theme=null,fontSet=null,fontProfileId=null,fonts={},templates=[],revision=1,tierDefaults,mainProduct=null}={}){
 if(!size)fail('Größe fehlt.');
 if(Array.isArray(subcategory.sizesOffered)&&!subcategory.sizesOffered.includes(size.key))fail('Größe '+size.key+' wird in „'+subcategory.name+'“ nicht angeboten.');
 const f=applyPriceOverrides(family,subcategory),s=f.sizes.find(x=>x.key===size.key);
 if(!s)fail('Unbekannte Größe '+size.key+'.');
 const gaps=priceGaps(f,s);if(gaps.length)fail(gaps.join(' · '));
 // A contour must use a source template that passed the physical fit check.
 // Keep missing source start designs open instead of creating a neutral fallback.
 if(f.groups.find(g=>g.key===s.groupKey)?.shape==='contour'&&!templates.length){
  if(subcategory.startDesign)fail('Unterkategorie „'+subcategory.id+'“: Startdesign „'+subcategory.startDesign+'“ ist für '+s.label+' nicht verfügbar.');
  fail('Keine passende Konturvorlage für '+s.label+'.');
 }
 // Sicht der Familie auf diese eine Größe: offene Preise anderer Größen sperren dieses
 // Produkt nicht (die Prüfung oben nennt die Größe), unbenutzte Bohrbild-Regeln bleiben außen vor.
 const view={...f,groups:f.groups.filter(g=>g.key===s.groupKey),sizes:[s],mountingRules:f.mountingRules.filter(r=>s.mounting.includes(r.id))};
 // Staffel: Unterkategorie > Größe > Familie > Vorgabe je Linie/Thema (Daten, nie geraten).
 const fallback=sizeQuantityTiers(f,s)===undefined?defaultQuantityTiers(line,subcategory,tierDefaults):null;
 if(fallback)view.quantityTiers=fallback.tiers;
 const config=familyProductConfig(view,s,revision),p=config.profile;
 // Eigene Produktkennung je Linie, Unterkategorie und Größe (Sitzungsschutz K7 und
 // Direktlinks K9 unterscheiden Produkte über binding.productId).
 p.id=cleanId('katalog-'+line.id+'-'+subcategory.id+'-'+s.key+(mainProduct?'-'+mainProduct.id:''));p.binding={kind:'local-review',productId:'local-'+p.id};
 const process=familyProcess(f);
 const setFonts=[...new Set([...FONT_SET_ALWAYS,...(fontSet?.fonts??[])])],fontsMissing=setFonts.filter(n=>!fonts[n]&&!(fontSet?.available??[]).includes(n));
 const localFonts={...config.localResources.fonts};
 for(const t of templates)for(const o of t.template.objects)if(o.type==='text'){if(!fonts[o.font])fail('Schrift fehlt: '+o.font+' (Vorlage „'+t.template.id+'“).');localFonts[o.font]=fonts[o.font];}
 if(Object.keys(localFonts).length>64)fail('Höchstens 64 Schriften je Produkt (Vorlagen ergeben '+Object.keys(localFonts).length+').');
 if(fontProfileId!==null&&!(typeof fontProfileId==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(fontProfileId)))fail('Ungültiges Schriftprofil.');
 config.localResources.fonts=localFonts;
 config.localResources.motifs=[...config.localResources.motifs,...templates.flatMap(t=>t.motifs)];
 if(templates.length){
  // Startdesign der Unterkategorie (Hauptbild im Shop = erstes Design im Konfigurator), dann Bestseller, dann Katalogfolge.
  const start=subcategory.startDesign?templates.find(t=>t.template.katalog?.designId===subcategory.startDesign):null;
  if(subcategory.startDesign&&!start)fail('Unterkategorie „'+subcategory.id+'“: Startdesign „'+subcategory.startDesign+'“ ist für '+s.label+' nicht verfügbar.');
  const rest=templates.filter(t=>t!==start);
  const ordered=[...(start?[start]:[]),...rest.filter(t=>t.template.bestseller),...rest.filter(t=>!t.template.bestseller)];
  if(ordered.length>MAX_TEMPLATES)fail('Höchstens '+MAX_TEMPLATES+' Vorlagen je Produkt ('+ordered.length+' für '+s.label+').');
  p.designs=ordered.map(t=>t.template);p.defaultDesignId=p.designs[0].id;
  // Musterfoto als Platzhalter (Werkstatt-Designressource): im Editor sichtbar, Klick lädt das Kundenfoto,
  // nie Teil von Design oder Fertigung. Der Upload-Hinweis steckt schon im Bild → eigener Hinweis aus.
  const examples=templates.flatMap(t=>(t.examples||[]).map(e=>({designId:t.template.id,slotId:e.slotId,assetId:e.assetId})));
  if(examples.length){
   config.localResources.photoExamples=[...(config.localResources.photoExamples||[]),...examples];
   config.photo={...config.photo,hints:[...(config.photo.hints||[]),...examples.map(e=>({designId:e.designId,slotId:e.slotId,text:'Foto-Upload hier klicken',enabled:false}))]};
  }
 }
 if(templates.some(t=>t.template.objects.some(o=>o.type==='photoSlot'))){if(!process?.tools.photo)fail('Fotofeld in einer Vorlage, aber das Verfahren sieht kein Foto vor.');config.photo={...config.photo,enabled:true};}
 if(subcategory.themeId)p.themeId=subcategory.themeId;
 p.name=productName(line,subcategory,f,s);
 if(mainProduct){
  // Hauptprodukt: eigener Name (Katalog) oder Name des Startdesigns als Zusatz; externe Kennungen (z. B. Amazon-Custom) nur als Backend-Kategorie.
  const startName=p.designs?.[0]?.name||mainProduct.startDesign;
  p.name=mainProduct.name?mainProduct.name:p.name+' – '+startName;
 }
 const document=makeProductDocument(config,{name:p.name,kind:'product'});
 document.categoryIds=[...new Set(['familie-'+f.id,'form-'+s.groupKey.toLowerCase(),'linie-'+cleanId(line.id),'unterkategorie-'+cleanId(line.id)+'-'+cleanId(subcategory.id),...(subcategory.themeId?['thema-'+cleanId(subcategory.themeId)]:[]),
  ...(mainProduct?['hauptprodukt-'+cleanId(mainProduct.id),...Object.entries(mainProduct.externalIds||{}).map(([k,v])=>cleanId('extern-'+k+'-'+v))]:[])])];
 for(const t of templates)document.elementRights[t.template.id]=structuredClone(t.rights);
 if(fontProfileId)document.profileAssignments.fonts={mode:'override',profileId:fontProfileId};
 return {document:validateProductDocument(document),fontsMissing,fontSet:fontSet?.id??null,fontProfileId,themeId:theme?.id??subcategory.themeId??null};
}

/** Uniform vector transform in master mm. Same command handling as scaleArcAware;
 * absolute coordinates receive an offset, relative deltas do not. Arc flags and
 * rotations are preserved. No flattening and no change to the catalogue shape. */
export function transformEmbeddedPath(d,scale,dx=0,dy=0){
 if(![scale,dx,dy].every(Number.isFinite)||scale<=0)fail('Ungültige Motivskalierung.');
 const tokens=d.match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g)||[];
 if(d.replace(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|[\s,]/g,''))fail('Ungültiger Motivpfad.');
 const arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},out=[];let cmd='',first=true,i=0;
 while(i<tokens.length){
  if(/^[A-Za-z]$/.test(tokens[i])){cmd=tokens[i++];out.push(cmd);if(cmd.toUpperCase()==='Z')continue;}
  const c=cmd.toUpperCase(),count=arity[c];if(!count||first&&c!=='M')fail('Unvollständiger Motivpfad.');
  const values=tokens.slice(i,i+count);if(values.length!==count||values.some(v=>/^[A-Za-z]$/.test(v)))fail('Unvollständiger Motivpfad.');
  const relative=cmd===cmd.toLowerCase();
  for(let k=0;k<count;k++){
   const value=Number(values[k]);if(!Number.isFinite(value))fail('Ungültige Motivkoordinate.');
   let result;
   if(c==='A'&&k>=2&&k<=4){if(k>=3&&value!==0&&value!==1)fail('Ungültiges Bogenflag.');result=value;}
   else{const axis=c==='V'?1:c==='H'?0:c==='A'?k===6?1:0:k%2,offset=c==='A'&&k<2?0:!relative||first?(axis?dy:dx):0;result=value*scale+offset;}
   out.push(String(Math.round(result*1e8)/1e8));
  }
  i+=count;first=false;
  if(c==='M')cmd=relative?'l':'L';
 }
 return out.join(' ');
}
