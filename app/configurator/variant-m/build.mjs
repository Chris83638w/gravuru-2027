import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareConfig} from './contract.mjs';


import {localAssistant,ACRYLIC_GUIDES} from './help.mjs';

import {makeAcrylicConfig} from './acrylic-product.mjs';
import {measureText} from '../../platform/sources/app/shared/models/doorbell-preview.mjs';
import {writeLazyResources,patchEditorLoading} from './lazy-resources-build.mjs';
import {buildProductEditorBundles,patchEditorBundle} from './bundle-build.mjs';
import {splitReferenceDevice} from './reference-device-build.mjs';
export const HERE=path.dirname(fileURLToPath(import.meta.url));
export const ROOT=path.resolve(HERE,'../..');
export const OUTPUT=path.join(HERE,'.preview');
// Gemeinsame, beim Build abgeleitete Nachladeteile (lazy-resources-build.mjs); Server-Route /_runtime/lazy/.
export const LAZY=path.join(OUTPUT,'lazy');
const read=file=>JSON.parse(fs.readFileSync(path.join(ROOT,file),'utf8').replace(/^\uFEFF/,''));
export function build({outputDirectory=OUTPUT}={}){
  // Immutable inputs are checked against their existing inventory, not a refreshed baseline.
  // The old inventory also contains an unrelated historical admin snapshot.
  // Validate every selected catalog/editor resource; do not import that backend.
  const inventory=read('designs/aosu-labrador/RESOURCE-INVENTORY.json').filter(item=>item.path.startsWith('designs/aosu-labrador/')||item.path.startsWith('references/aosu-upgrade-2026-09-21/verification/'));
  for(const item of inventory){
    const bytes=fs.readFileSync(path.join(ROOT,item.path));
    if(bytes.length!==item.bytes||createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Referenz-Prüfsumme abweichend: '+item.path);
  }
  // Only the verified acrylic pilot is active. Legacy supplies the editor shell,
  // never historical Shopify bindings or demo product/pricing data.
  const baseline=read('references/aosu-upgrade-2026-09-21/verification/profile-source.json');
  baseline.features={...baseline.features,orderEnabled:false,productionConfirmed:false};
  baseline.binding={kind:'local-review',productId:null};
  for(const v of baseline.purchasing.variants)v.variantId=null;
  baseline.geometry={...baseline.geometry,bell:{x:-1000,y:-1000,width:0,height:0},bellImageBounds:{x:-1000,y:-1000,width:0,height:0},cutPaths:[]};
  const resources=read('designs/acrylic-unser-anfang/resources.json');
  const sourceInfo=read('designs/acrylic-unser-anfang/source.json');
  const acrylic=makeAcrylicConfig({profile:{schemaVersion:1,kind:'universal-product',features:{motifsAllowed:true}}},resources,sourceInfo.sha256);
  for(const o of acrylic.profile.designs[0].objects.filter(o=>o.type==='text')){
    measureText(o,resources.fonts);
    if(o.id==='names'){o.size*=118/o.w;measureText(o,resources.fonts);}
  }
  baseline.designs=acrylic.profile.designs;
  baseline.purchasing.basePriceCents=acrylic.basePriceCents;
  baseline.purchasing.bellModel=acrylic.profile.name;
  const models=[{key:'acryl',name:acrylic.profile.name,legacy:baseline,universal:prepareConfig(acrylic)}];
  fs.mkdirSync(outputDirectory,{recursive:true});
  fs.writeFileSync(path.join(outputDirectory,'assistant.js'),localAssistant(fs.readFileSync(path.join(ROOT,'platform/sources/assistant/static/gravuru-chat.js'),'utf8')));
  fs.writeFileSync(path.join(outputDirectory,'guides.json'),JSON.stringify({enabled:true,guides:ACRYLIC_GUIDES,account_url:null}));
  fs.writeFileSync(path.join(outputDirectory,'models.json'),JSON.stringify(models));
  let source=fs.readFileSync(path.join(ROOT,'references/aosu-upgrade-2026-09-21/verification/editor-source.html'),'utf8');
  function replaceOnce(from,to){if(source.split(from).length!==2)throw Error('M-Anker ist nicht eindeutig: '+from.slice(0,90));source=source.replace(from,to);}
  const urls=JSON.parse(source.match(/<script[^>]*id="preview-urls"[^>]*>([\s\S]*?)<\/script>/)[1]);
  // Ladezeit: Katalog, Schriften und Motive zusätzlich als einzeln ladbare Teile (/_runtime/lazy/).
  const lazy=writeLazyResources(LAZY,path.join(ROOT,'designs/aosu-labrador/runtime'),urls);
  for(const [key,value] of Object.entries(urls))urls[key]=Array.isArray(value)?value.map(u=>'/_runtime/'+u.split('/').pop()):'/_runtime/'+value.split('/').pop();
  source=source.replace(/(<script[^>]*id="preview-urls"[^>]*>)[\s\S]*?(<\/script>)/,(_,a,b)=>a+JSON.stringify(urls)+b);
  replaceOnce('<base href="/" target="_top">','');
  // The old page header/loading copy must never enter the rendered document.
  // The shop host owns the loading screen; retain only the internal form/status hooks.
  const oldIntro=source.slice(source.indexOf('<body>'),source.indexOf('<script id="preview-data"'));
  const formMarkup=oldIntro.match(/<label hidden>[\s\S]*?<\/label>/)?.[0];
  if(!formMarkup)throw Error('Interne Formularauswahl fehlt');
  replaceOnce(oldIntro,'<body>\n<main class="c-main">'+formMarkup+'<p id="loading" role="status" hidden></p><main id="editor"></main>\n');
  replaceOnce("document.querySelector('header').append(close)","document.querySelector('header')?.append(close)");
  replaceOnce("document.querySelector('.preview-badge').textContent=profile.purchasing.bellModel;",'');
  // Initialise compatibility controls outside the document. They supply the editor
  // state/events, but the browser never paints the old green editor during startup.
  replaceOnce("host.querySelector('gravuru-configurator')?.cCleanup?.();host.replaceChildren(el);",
    "host.querySelector('gravuru-configurator')?.cCleanup?.();if(window.parent.UniversalConfig){await el.connectedCallback();}else{host.replaceChildren(el);}");
  replaceOnce("host.removeAttribute('aria-busy');status.textContent='';",
    "host.removeAttribute('aria-busy');status.textContent='';return el;");
  replaceOnce("}catch(error){status.textContent='Die Vorschau konnte nicht vollständig geladen werden. Bitte die Seite neu laden. '+error.message;}",
    "}catch(error){console.error('Editorstart fehlgeschlagen',error);status.hidden=false;status.textContent='Die Gestaltung konnte nicht geladen werden. Bitte erneut öffnen.';window.parent.postMessage({type:'gravuru-ux-failed',message:status.textContent},location.origin);}");
  replaceOnce('stainlessMoney=c=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(c/100)',
    'stainlessEuro=new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}),stainlessMoney=c=>stainlessEuro.format(c/100)');
  // The shared legacy shell can render once before its optional doorbell image
  // Native products use their validated mm geometry; the legacy steel fitter
  // must not measure and shrink that composition while mounting the shell.
  replaceOnce('el.fitComposition=function(){','el.fitComposition=function(){if(window.parent.UniversalConfig)return;');
  replaceOnce('const galleryScroll=gallery.scrollTop;',
    'if(window.parent.UniversalConfig?.familyFormats?.fixedSize)return sync.apply(this,args);const galleryScroll=gallery.scrollTop;');
  replaceOnce('const scroll=gallery.scrollTop,result=sync.apply(this,args);gallery.scrollTop=scroll;',
    'if(window.parent.UniversalConfig?.familyFormats?.fixedSize)return sync.apply(this,args);const scroll=gallery.scrollTop,result=sync.apply(this,args);gallery.scrollTop=scroll;');
  replaceOnce('el.updateMobilePreview=function(){oldMobile.call(this);',
    'el.updateMobilePreview=function(){if(window.parent.UniversalConfig?.familyFormats?.fixedSize)return;oldMobile.call(this);');
  // has loaded. Native products have no such component or image at all.
  replaceOnce('function bell(){const b=geometry.bellImageBounds||geometry.bell;',
    'function bell(){if(!window.FunkklingelImage)return "";const b=geometry.bellImageBounds||geometry.bell;');
  // Native workshop designs receive their SVG thumbnails after mounting.
  // The legacy gallery must not request a literal /undefined in between.
  replaceOnce('<img src="${esc(d.preview)}" alt="" loading="lazy">',
    '<img${d.preview?\' src="\'+esc(d.preview)+\'"\':\'\'} alt="" loading="lazy">');
  // The internal editor belongs to its immediate workshop host. Shopify may wrap
  // that host in a cross-origin frame, and private runtime assets need its cookie.
  source=source.replaceAll('window.top','window.parent')
    .replaceAll("credentials:'omit'","credentials:'same-origin'")
    .replaceAll('credentials:"omit"','credentials:"same-origin"');
  replaceOnce("let shown=16,signature='',compareSignature='';","let shown=Number.MAX_SAFE_INTEGER,signature='',compareSignature='';");
  replaceOnce("shown=6;renderGallery();","shown=Number.MAX_SAFE_INTEGER;renderGallery();");
  replaceOnce("render();grid.children[firstNew]?.focus({preventScroll:true});","render();");
  replaceOnce("const filtered=all.filter(e=>(!category.value||e.category===category.value)&&(!needle||(e.name+' '+e.category).toLocaleLowerCase('de').includes(needle)));",
    "const score=e=>el.uxMotifScore?el.uxMotifScore(e,needle):(!needle||(e.name+' '+e.category).toLocaleLowerCase('de').includes(needle)?1:0);const filtered=all.filter(e=>(!category.value||e.category===category.value)&&score(e)>0).sort((a,b)=>score(b)-score(a));");
  // Embedded PDF fonts may contain only the source glyphs. Keep the font picker usable.
  replaceOnce("const family=el.fontData[object.font],face=family[object.bold?'bold':'regular'];","const family=el.fontData[object.font],face=family[object.bold?'bold':'regular']||family.regular;");
  replaceOnce("const glyph=face.glyphs[ch]||face.glyphs['?'];","const glyph=face.glyphs[ch]||face.glyphs['?']||{d:'',a:face.units*.5};");
  replaceOnce('const all=[...entries,...original],categories=[...new Set(all.map(e=>e.category))];',
    'const all=window.GravuruProfileChoices.motifChoices([...entries,...original],window.parent.UniversalConfig?.workshopProfiles?.selections?.motifs,window.GravuruTemplateOnlyMotifKeys),categories=[...new Set(all.map(e=>e.category))];el.uxMotifChoiceIds=all.map(e=>e.key);');
  replaceOnce('const popular=ranked.length?ranked:doorSignStarterKeys.filter(key=>motifIndex.has(key)).map(key=>({key}));',
    'const popular=window.GravuruProfileChoices.bestsellerChoices(all,ranked.length?ranked:doorSignStarterKeys.filter(key=>motifIndex.has(key)).map(key=>({key})),window.parent.UniversalConfig?.workshopProfiles?.selections?.bestsellers,{fillTo:ranked.length?0:18});bestsellers.hidden=popular.length===0;');
  replaceOnce("ranked.length?'Die meistgenutzten Motive für Türschilder.':'Unsere Startauswahl für Türschilder.'",
    "window.parent.UniversalConfig?.workshopProfiles?.selections?.bestsellers!=null?'Unsere Auswahl für dieses Produkt.':ranked.length?'Die meistgenutzten Motive.':'Unsere Startauswahl.'");
  replaceOnce('await customElements.whenDefined(\'gravuru-configurator\');',
    "window.GravuruProfileChoices=await import('/configurator/variant-m/profile-selection.mjs');window.GravuruPreviewResource=await import('/configurator/variant-m/preview-resource.mjs');const adapter=await import('/configurator/variant-m/adapter.mjs');if(window.parent.UniversalConfig){const resources=await import('/configurator/variant-m/lazy-resources.mjs');await resources.hydrateContourFonts(window.parent.UniversalConfig);adapter.installUniversal(window.parent.UniversalConfig);}await customElements.whenDefined('gravuru-configurator');");
  replaceOnce('prepareMotifGeometry(entries);',
    'if(!window.parent.UniversalConfig){Object.assign(catalog.fonts,window.parent.LabradorFonts);entries.unshift(window.parent.LabradorMotif);}const localResources=window.parent.UniversalConfig?.localResources;if(localResources)Object.assign(catalog.fonts,localResources.fonts);prepareMotifGeometry(entries.filter(e=>typeof e.svgFragment===\'string\'));if(localResources)entries.unshift(...localResources.motifs.map(m=>({...m,svgFragment:window.GravuruPreviewResource.previewResourceMarkup(m.svgFragment)})));window.GravuruTemplateOnlyMotifKeys=new Set((localResources?.motifs||[]).filter(m=>m.embeddedOnly===true||localResources.motive_in_bibliothek===false).map(m=>m.key));window.GravuruMotifCategories=window.GravuruProfileChoices.motifChoices(entries,window.parent.UniversalConfig?.workshopProfiles?.selections?.motifs,window.GravuruTemplateOnlyMotifKeys).map(({key,name,category})=>({key,name,category}));');
  replaceOnce('await mount(form.value);',
    "const specimen=await mount(form.value);if(window.parent.UniversalConfig)adapter.installEarlyPhotoTap(specimen,window.parent.UniversalConfig);if(!window.parent.UniversalConfig){specimen.chooseDesign('FK-LABRADOR-MICHROMA-01');adapter.hardenDoorbell(specimen);}specimen.$('[data-setting=guides]').checked=false;specimen.cfg.orderEnabled=false;specimen.cfg.demo=true;specimen.sync();const ux=await import('/configurator/variant-m/ux.mjs');await ux.installUX(specimen,window.parent.UniversalConfig,window.parent.GravuruModelProfile,{attach:()=>host.replaceChildren(specimen)});");
  for(const item of read('designs/aosu-labrador/image-source-verification.json'))source=source.replaceAll(item.url,'/_runtime/images/'+item.name);
  source=patchEditorLoading(source);
  // Ladezeit: alle Editor-Module als ein Bündel (bundle-build.mjs, Route /_bundle/); `?module=einzeln` lädt Einzelmodule.
  const bundle=buildProductEditorBundles(outputDirectory);
  source=patchEditorBundle(source,bundle.url,bundle.chunks);
  // Design-Karten/Galerie: Größenregeln nur für das äußere Vorschau-SVG, nie für verschachtelte Motiv-SVGs
  // (sonst werden Kreuz, Rose usw. in der Designauswahl aufgeblasen und verschoben; Fehler 20.10.2026).
  source=source.replace(/(\.c-design-card svg|\.c-gallery svg)(?=\s*[,{])/g,'$1:not(svg svg)');
  // Leistung mobil (20.10.2026): Die Altgalerie zeichnet bei jedem sync alle Vorlagenkarten neu – beim Ziehen je Fingerbewegung.
  // Die Karten hängen nicht von der Lage des gezogenen Elements ab; solange `uxDragging` gesetzt ist (adapter.mjs), überspringen.
  {const loop="for(const card of r.querySelectorAll('[data-c-design]')){\n        const item=designs.find(d=>d.id===card.dataset.cDesign);";
   if(source.split(loop).length!==2)throw Error('Galerie-Schleife für Zieh-Schutz nicht eindeutig gefunden.');
   // Family targets may have IDs absent from the frozen legacy design closure.
   // Their gallery is rendered by adapter.renderThumbnails using the selected form.
   source=source.replace(loop,'if(!this.uxDragging&&!this.uxFamilyGallery)'+loop);}
  source=splitReferenceDevice(source,LAZY).source;
  fs.writeFileSync(path.join(outputDirectory,'editor.html'),source);
  return {verifiedResources:inventory.length,models:models.length,editorBytes:Buffer.byteLength(source),lazyResources:{fonts:lazy.fonts,motifs:lazy.motifs},bundle:{url:bundle.url,modules:bundle.modules.length,styles:bundle.styles.length,bytes:bundle.bytes,gzipBytes:bundle.gzipBytes}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(build()));
