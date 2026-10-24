// Dashboard-only delivery copy. Catalogue SVGs and editable text remain untouched.
// Advances match measureText/textPaths: glyph.a + letterSpacing, no pair kerning.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {convertFont} from './font-library.mjs';
import {katalogFor} from './design-dashboard.mjs';

export const PREVIEW_WARNING_HEADER='X-Gravuru-Preview-Warnings';
export const PREVIEW_CACHE_ENTRIES=64,PREVIEW_CACHE_BYTES=16*1024*1024;
const unsupportedTypography=['baseline-shift','word-spacing','font-variant','font-variant-ligatures','font-feature-settings','font-variation-settings','font-kerning','kerning','font-stretch','text-transform','text-decoration','unicode-bidi','glyph-orientation-horizontal','glyph-orientation-vertical','text-indent'];
const inherited=[...unsupportedTypography,'font-family','font-size','font-weight','font-style','text-anchor','letter-spacing','fill','fill-opacity','xml:space','dominant-baseline','alignment-baseline','writing-mode','direction','stroke'];
const layout=new Set(['x','y','dx','dy','rotate','textLength','lengthAdjust',...inherited.filter(k=>!['fill','fill-opacity','stroke','xml:space'].includes(k))]);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const hash=v=>createHash('sha256').update(v).digest('hex');
const fail=message=>{throw Error(message);};
const number=(v,fallback=0)=>{if(v===undefined)return fallback;if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(v.trim()))fail('nicht unterstützte Textposition oder Einheit');const n=Number(v.replace(/px$/i,''));if(!Number.isFinite(n)||Math.abs(n)>1e8)fail('ungültige Textposition');return n;};
const fmt=n=>String(Number(n.toFixed(10)));
function decode(s){return s.replace(/&([^;]+);/g,(_,e)=>{const known={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(Object.hasOwn(known,e))return known[e];if(/^#(?:x[0-9a-f]+|\d+)$/i.test(e)){const n=e[1].toLowerCase()==='x'?parseInt(e.slice(2),16):Number(e.slice(1));if(n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff))return String.fromCodePoint(n);}fail('unbekannte XML-Entität');});}
function parse(source){
 if(/<!DOCTYPE|<!ENTITY/i.test(source))fail('DTD/Entitäten werden nicht umgewandelt');
 const root={tag:'#root',attrs:{},children:[]},stack=[root];
 const re=/<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/gy;
 let m,at=0;
 while(at<source.length){re.lastIndex=at;m=re.exec(source);if(!m)fail('SVG-Struktur nicht unterstützt');const p=stack.at(-1);at=re.lastIndex;
  if(m[1]!==undefined)p.children.push({tag:'#text',value:m[1]});
  else if(m[2]){if(p.tag!==m[2])fail('SVG-Struktur nicht geschlossen');p.end=at;stack.pop();}
  else if(m[3]){const attrs={};for(const a of m[4].matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)){if(Object.hasOwn(attrs,a[1]))fail('doppelte SVG-Eigenschaft');attrs[a[1]]=decode(a[2]??a[3]);}const n={tag:m[3],attrs,children:[],start:m.index,end:at};p.children.push(n);if(!m[5])stack.push(n);}
  else if(m[6]!==undefined)p.children.push({tag:'#text',value:decode(m[6])});
 }
 if(stack.length!==1)fail('SVG-Struktur nicht geschlossen');return root;
}
function properties(node,parent={}){
 const a={};for(const key of inherited)if(parent[key]!==undefined)a[key]=parent[key];Object.assign(a,node.attrs);
 if(a.style)for(const declaration of a.style.split(';')){if(!declaration.trim())continue;const colon=declaration.indexOf(':');if(colon<0)fail('nicht unterstützte Textformatierung');const key=declaration.slice(0,colon).trim(),value=declaration.slice(colon+1).trim();if(/!important/i.test(value)||key==='font'||['x','y','dx','dy','rotate'].includes(key))fail('nicht unterstützte Textformatierung');a[key]=value;}
 return a;
}
const family=v=>String(v??'').split(',')[0].trim().replace(/^['"]|['"]$/g,'');
function fontStyle(a){
 if(unsupportedTypography.some(key=>a[key]!==undefined))fail('nicht unterstützte Typografie bleibt unverändert');
 if(a['font-style']&&!['normal'].includes(a['font-style']))fail('nicht unterstützter Schriftschnitt');
 if(a['font-weight']&&!['normal','400','bold','700'].includes(a['font-weight']))fail('nicht unterstützte Schriftstärke');
 for(const key of ['dominant-baseline','alignment-baseline'])if(a[key]&&!['auto','alphabetic','baseline'].includes(a[key]))fail('nicht unterstützte Textgrundlinie');
 if(a['writing-mode']&&!['horizontal-tb','lr-tb','lr'].includes(a['writing-mode']))fail('nicht unterstützte Schreibrichtung');
 if(a.direction&&a.direction!=='ltr')fail('nicht unterstützte Schreibrichtung');
 if(a.stroke&&a.stroke!=='none')fail('Text mit Kontur bleibt unverändert');
 if(a.textLength!==undefined||a.lengthAdjust!==undefined||a.rotate!==undefined)fail('nicht unterstützte Textstreckung oder Zeichendrehung');
 const font=family(a['font-family']);if(!font)fail('Schriftfamilie fehlt');const size=number(a['font-size'],NaN);if(!(size>0))fail('Schriftgröße fehlt');
 const anchor=a['text-anchor']??'start';if(!['start','middle','end'].includes(anchor))fail('unbekannter Textanker');
 return {font,size,anchor,bold:['bold','700'].includes(a['font-weight']),spacing:a['letter-spacing']==='normal'?0:number(a['letter-spacing']),fill:a.fill??'#000000',fillOpacity:a['fill-opacity']};
}
function planText(node,parent){
 const events=[],names=new Set();
 function visit(n,base,outer=false){
  if(n.tag==='#text'){events.push({kind:'text',text:n.value,style:fontStyle(base),preserve:base['xml:space']==='preserve'});return;}
  if(!outer&&n.tag!=='tspan')fail('nicht unterstütztes Textelement');
  const tspanAttributes=new Set(['x','y','dx','dy','font-family','font-size','font-weight','font-style','text-anchor','letter-spacing','fill','fill-opacity','xml:space','style']);
  if(!outer&&Object.keys(n.attrs).some(k=>!tspanAttributes.has(k)))fail('komplexes tspan bleibt unverändert');
  const a=properties(n,base);
  if(!outer&&n.attrs.style&&n.attrs.style.split(';').filter(Boolean).some(declaration=>!inherited.includes(declaration.slice(0,declaration.indexOf(':')).trim())))fail('komplexes tspan bleibt unverändert');
  const style=fontStyle(a);names.add(style.font);
  const position={};for(const key of ['x','y','dx','dy'])if(n.attrs[key]!==undefined)position[key]=number(n.attrs[key]);
  events.push({kind:'position',...position,anchor:style.anchor,outer});
  for(const c of n.children)visit(c,a);
 }
 visit(node,parent,true);
 // SVG default white-space: line endings/tabs collapse to one space, leading and
 // trailing whitespace disappears across tspan boundaries. xml:space keeps it.
 let began=false,space=false;
 for(const e of events){if(e.kind!=='text')continue;if(e.preserve){began ||= e.text.length>0;space=/\s$/.test(e.text);continue;}let text=e.text.replace(/[\t\r\n ]+/g,' ');if(!began||space)text=text.replace(/^ /,'');began ||= text.length>0;space=text.endsWith(' ');e.text=text;}
 for(let i=events.length-1;i>=0;i--){const e=events[i];if(e.kind!=='text'||!e.text)continue;if(!e.preserve)e.text=e.text.replace(/ $/,'');break;}
 return {node,events,names};
}
function draw(plan,fonts){
 const chunks=[];let current=null,x=0,y=0;
 for(const e of plan.events){
  if(e.kind==='position'){
   const absolute=e.x!==undefined||e.y!==undefined||e.outer;
   if(absolute){if(current){x=current.x+current.width;}if(e.x!==undefined)x=e.x;if(e.y!==undefined)y=e.y;current={x:x+(e.dx??0),y:y+(e.dy??0),width:0,anchor:e.anchor,items:[]};x=current.x;y=current.y;chunks.push(current);}
   else {if(e.dx!==undefined){current.width+=e.dx;}if(e.dy!==undefined){y+=e.dy;} }
   continue;
  }
  const s=e.style,f=fonts[s.font]?.[s.bold?'bold':'regular'];
  if(!f||!(f.units>0)||!f.glyphs)fail('Schrift fehlt: '+s.font+(s.bold?' (fett)':''));
  for(const c of e.text){if(!Object.hasOwn(f.glyphs,c))fail('Zeichen „'+c+'“ fehlt in '+s.font);const g=f.glyphs[c];if(!Number.isFinite(g.a)||typeof g.d!=='string')fail('ungültige Glyphendaten: '+s.font);}
  const letters=[...e.text];if(!letters.length)continue;
  // Each chunk has spacing only BETWEEN glyphs, exactly like production.
  for(const c of letters){if(current.items.length)current.width+=current.items.at(-1).spacing;const g=f.glyphs[c];current.items.push({x:current.width,y:y-current.y,d:g.d,scale:s.size/f.units,spacing:s.spacing,fill:s.fill,fillOpacity:s.fillOpacity});current.width+=g.a*s.size/f.units;}
 }
 const attrs={...plan.node.attrs};for(const key of layout)delete attrs[key];
 if(attrs.style){attrs.style=attrs.style.split(';').filter(d=>{const key=d.slice(0,d.indexOf(':')).trim();return !layout.has(key)&&key!=='font';}).join(';');if(!attrs.style)delete attrs.style;}
 const outer=Object.entries(attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('');
 return '<g'+outer+' data-preview-text-paths="true">'+chunks.filter(c=>c.items.length).map(c=>{const shift=c.anchor==='middle'?-c.width/2:c.anchor==='end'?-c.width:0;return '<g transform="translate('+fmt(c.x+shift)+' '+fmt(c.y)+')">'+c.items.map(g=>'<path fill="'+esc(g.fill)+'"'+(g.fillOpacity===undefined?'':' fill-opacity="'+esc(g.fillOpacity)+'"')+' d="'+esc(g.d)+'" transform="translate('+fmt(g.x)+' '+fmt(g.y)+') scale('+fmt(g.scale)+' '+fmt(-g.scale)+')"/>').join('')+'</g>';}).join('')+'</g>';
}
function plans(source){
 const root=parse(source),list=[];let styled=false;
 function visit(n,parent={}){if(n.tag==='style')styled=true;if(n.tag==='text'){try{list.push({...planText(n,parent),error:null});}catch(error){list.push({node:n,names:new Set(),error:error.message});}return;}if(n.tag==='#text')return;const a=properties(n,parent);for(const c of n.children)visit(c,a);}
 visit(root);if(styled)for(const p of list)p.error='SVG-Stylesheet: Text bleibt unverändert';return list;
}
const cache=new Map();let cacheBytes=0;
export function clearDesignPreviewCache(){cache.clear();cacheBytes=0;}
export function designPreviewCacheInfo(){return {entries:cache.size,bytes:cacheBytes};}
export function previewWarningHeader(warnings){
 if(!warnings.length)return null;const compact=[];
 for(const warning of warnings){const points=[...String(warning).toWellFormed()],value=points.slice(0,200).join('')+(points.length>200?'…':'');
  if(encodeURIComponent(JSON.stringify([...compact,value])).length>5600){compact.push('Weitere Hinweise gekürzt.');break;}compact.push(value);
 }
 return encodeURIComponent(JSON.stringify(compact));
}
export async function designPreviewGlyphs({file,root,katalog=null,available={},converter=convertFont}){
 const bytes=fs.readFileSync(file),source=bytes.toString('utf8');let list;
 try{list=plans(source);}catch(error){return {bytes,warnings:[error.message],convertedTexts:0,cacheHit:false};}
 if(!list.length)return {bytes,warnings:[],convertedTexts:0,cacheHit:false};
 katalog??=katalogFor(root);const names=[...new Set(list.flatMap(p=>[...p.names]))].sort(),fonts={},versions={},fontIssues=[];
 for(const name of names){try{const r=await katalog.fontResources([name],{available,converter});if(r.fonts[name]){fonts[name]=r.fonts[name];versions[name]=r.versions?.[name]??hash(JSON.stringify(r.fonts[name]));}else fontIssues.push(name);}catch{fontIssues.push(name);}}
 const key=hash(bytes)+':'+hash(JSON.stringify({versions,fontIssues}));
 const hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return {...hit,cacheHit:true};}
 let at=0,out='',convertedTexts=0;const warnings=[];
 for(const plan of list){out+=source.slice(at,plan.node.start);try{if(plan.error)fail(plan.error);out+=draw(plan,fonts);convertedTexts++;}catch(error){out+=source.slice(plan.node.start,plan.node.end);warnings.push((plan.node.attrs.id||'Text')+': '+error.message);}at=plan.node.end;}
 out+=source.slice(at);const result={bytes:Buffer.from(out),warnings,convertedTexts};cache.set(key,result);cacheBytes+=result.bytes.length;
 while(cache.size>PREVIEW_CACHE_ENTRIES||cacheBytes>PREVIEW_CACHE_BYTES){const k=cache.keys().next().value;cacheBytes-=cache.get(k).bytes.length;cache.delete(k);}
 return {...result,cacheHit:false};
}
