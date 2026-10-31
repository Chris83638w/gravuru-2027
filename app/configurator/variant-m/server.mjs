import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {build,HERE,ROOT,OUTPUT,LAZY} from './build.mjs';
import {createShopifyAdminHost} from '../../workshop/shopify-admin-host.mjs';
import {createWorkshop} from '../../workshop/http.mjs';
import {readThemeCatalog} from '../../workshop/theme-catalog.mjs';
import {openKatalog,katalogPath} from '../../workshop/katalog-source.mjs';
import {doorbellImageResource,isDoorbellImagePath} from '../../workshop/doorbell-image-resource.mjs';

const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.gz':'application/gzip'};
// Ladezeit: Textantworten gzip-komprimiert, wenn der Browser es anbietet (Inhalt unverändert).
const compressible=new Set(['.html','.css','.mjs','.js','.json','.txt','.svg']);
const gzip=promisify(zlib.gzip),gzipCache=new Map();
export function acceptsGzip(header){
  return String(header||'').split(',').some(part=>{const [name,...params]=part.trim().toLowerCase().split(';').map(v=>v.trim());const q=params.find(v=>v.startsWith('q='));return (name==='gzip'||name==='*')&&(!q||Number(q.slice(2))>0);});
}
async function compressed(file,bytes,cacheable){
  const stat=fs.statSync(file),hit=cacheable&&gzipCache.get(file);
  if(hit&&hit.mtimeMs===stat.mtimeMs&&hit.size===bytes.length)return hit.data;
  const data=await gzip(bytes,{level:6});
  if(cacheable)gzipCache.set(file,{mtimeMs:stat.mtimeMs,size:bytes.length,data});
  return data;
}
// Große Nachladeteile nach dem Start im Hintergrund vorkomprimieren (erster Abruf ohne Wartezeit).
export async function warmCompression(files){
  for(const file of files){try{await compressed(file,fs.readFileSync(file),true);}catch{/* fehlt die Datei, komprimiert der erste Abruf */}}
}
const csp="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; frame-src 'self'; object-src 'none'; frame-ancestors 'self'";

// Loopback application. Workshop writes require an explicit repository + CSRF token.
// No hosted authentication, checkout or production release is implied.
export function createPreviewServer({outputDirectory=OUTPUT,workshop,embeddedApp=null}={}) {
  const adminHost=embeddedApp?createShopifyAdminHost(embeddedApp,workshop?.sessionContext):null;
  const server=http.createServer(async (req,res)=>{
    const fail=status=>res.writeHead(status,{'Cache-Control':'no-store'}).end();
    try {
      const port=server.address()?.port;
      if(!adminHost&&![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return fail(403);
      const origin=adminHost?.origin||'http://'+req.headers.host;
      if(!adminHost&&((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site'))return fail(403);
      const url=new URL(req.url,origin),pathname=decodeURIComponent(url.pathname);
      if(adminHost){
        res.setHeader('Content-Security-Policy',adminHost.csp);res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
        if(!adminHost.authorize(req,pathname))return fail(403);
        if(!adminHost.allows(pathname))return fail(404);
      }
      if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(p=>p==='..'||p.startsWith('.')))return fail(404);
      if(workshop&&pathname.startsWith('/api/workshop/'))return await workshop.handle(req,res,url);
      if(!['GET','HEAD'].includes(req.method))return fail(405);
      if(workshop&&pathname==='/models.json'){
        try{
          let bytes=Buffer.from(JSON.stringify([workshop.model(url.searchParams.get('configuration')||workshop.defaultId,url.searchParams.get('revision'))]));
          const headers={'Content-Type':types['.json'],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',Vary:'Accept-Encoding'};
          if(bytes.length>1024&&acceptsGzip(req.headers['accept-encoding'])){bytes=await gzip(bytes,{level:6});headers['Content-Encoding']='gzip';}
          headers['Content-Length']=bytes.length;
          res.writeHead(200,headers);
          return res.end(req.method==='HEAD'?undefined:bytes);
        }catch(error){
          // B1: verständliche Meldung (z. B. pausierter Konfi) statt leerer Antwort.
          const status=error.status||422,bytes=Buffer.from(JSON.stringify({error:{code:error.code||'model_unavailable',message:status>=500?'Das Produkt kann gerade nicht geladen werden.':error.message}}));
          res.writeHead(status,{'Content-Type':types['.json'],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});return res.end(req.method==='HEAD'?undefined:bytes);
        }
      }
      // B1: Pausierte Konfis liefert die Kundenansicht nicht aus, sondern zeigt eine Hinweisseite.
      if(workshop?.pausedPage&&['/','/form-editor.html','/konfigurator/form','/konfigurator/form/'].includes(pathname)){
        const page=workshop.pausedPage(url.searchParams.get('configuration'));
        if(page){const bytes=Buffer.from(page);res.writeHead(423,{'Content-Type':types['.html'],'Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'"});return res.end(req.method==='HEAD'?undefined:bytes);}
      }
      let base,relative;
      const fixed={
        '/':[HERE,'index.html'],
        '/models.json':[outputDirectory,'models.json'],
        '/editor.html':[outputDirectory,'editor.html'],
        '/assistant.js':[outputDirectory,'assistant.js'],
        '/api/guides':[outputDirectory,'guides.json']
      };
      if(adminHost){fixed['/_merchant-editor.html']=[outputDirectory,'editor.html'];fixed['/_merchant-form-editor.html']=[path.join(ROOT,'workshop/ui'),'form-customer.html'];}
      if(workshop){fixed['/form-editor.html']=[path.join(ROOT,'workshop/ui'),'form-customer.html'];fixed['/konfigurator/ausfuehrungen/']=[path.join(ROOT,'workshop/ui'),'form-variant-picker.html'];fixed['/konfigurator/form']=[path.join(ROOT,'workshop/ui'),'form-customer.html'];fixed['/konfigurator/form/']=fixed['/konfigurator/form'];fixed['/werkstatt']=[path.join(ROOT,'workshop/ui'),'index.html'];fixed['/werkstatt/']=fixed['/werkstatt'];for(const [route,file] of [['katalog','catalog-structure.html'],['acryl','acryl-gallery.html'],['acryl/formen','acryl-gallery.html'],['kundenansicht','customer-preview.html'],['ausfuehrungen-import','variant-batch.html'],['ausfuehrungen','form-variants.html'],['serien','batch.html'],['profile','profiles.html'],['familien','families.html'],['fertigung','production-profiles.html'],['ausgaben','export-jobs.html'],['shopvorbereitung','shop-preparation.html'],['bestellungen','orders.html'],['warenkorbpruefung','cart-handoff.html'],['konturen','contours.html'],['formprodukt','form-product.html'],['pruefstaende','review-snapshots.html']]){fixed['/werkstatt/'+route]=[path.join(ROOT,'workshop/ui'),file];fixed['/werkstatt/'+route+'/']=fixed['/werkstatt/'+route];}}
      if(workshop)for(const [route,file] of [['konfis','konfis.html'],['mandanten','tenants.html'],['designs','design-dashboard.html'],['designs/bearbeiten','index.html']]){fixed['/werkstatt/'+route]=[path.join(ROOT,'workshop/ui'),file];fixed['/werkstatt/'+route+'/']=fixed['/werkstatt/'+route];}
      if(fixed[pathname])[base,relative]=fixed[pathname];
      else if(workshop&&/^\/workshop-ui\/(konfis-ui\.mjs|tenants-ui\.mjs|konfis\.css|design-dashboard-ui\.mjs|design-dashboard-review\.mjs|design-dashboard-editor\.mjs|design-quick-edit\.mjs|design-target-preview-cache\.mjs|design-dashboard\.css)$/.test(pathname)){base=path.join(ROOT,'workshop/ui');relative=pathname.split('/').pop();}
      else if(workshop&&['/workshop-ui/design-source-path.mjs','/workshop-ui/design-zip.mjs'].includes(pathname)){base=path.join(ROOT,'workshop');relative=pathname.split('/').pop();}
      // Der Kundeneditor importiert die Themenlimits aus dem Vertrag (contract.mjs → ../../workshop/theme-limits.mjs).
      else if(pathname==='/workshop/theme-limits.mjs'){base=path.join(ROOT,'workshop');relative='theme-limits.mjs';}
      // K10: Verfahrensprofil (contract.mjs/usability-model.mjs → ../../workshop/process-profiles.mjs).
      else if(pathname==='/workshop/process-profiles.mjs'){base=path.join(ROOT,'workshop');relative='process-profiles.mjs';}
      else if(workshop&&['/workshop-ui/material-surfaces/wood-leather-derived-v1.png','/workshop-ui/material-surfaces/steel-reference-v4.png'].includes(pathname)){base=path.join(ROOT,'workshop/ui/material-surfaces');relative=pathname.split('/').pop();}
      else if(workshop&&/^\/workshop-ui\/editor-icons\/[a-z0-9-]+\.svg$/.test(pathname)){base=path.join(ROOT,'workshop/ui/editor-icons');relative=pathname.split('/').pop();}
      else if(workshop&&/^\/workshop-ui\/(catalog-structure-ui\.mjs|catalog-structure\.css|acryl-shop-ui\.mjs|acryl-gallery-ui\.mjs|acryl-gallery-loader\.mjs|acryl-gallery\.css|families-ui\.mjs|catalog\.css|catalog-ui\.mjs|steel-options-ui\.mjs|editor-guides\.mjs|configurator-test-client\.mjs|customer-preview-link\.mjs|customer-preview\.mjs|customer-preview\.css|profile-impact-ui\.mjs|revision-compare-ui\.mjs|revision-compare\.css|merchant-media\.mjs|merchant-downloads\.mjs|shop-transfer-ui\.mjs|merchant-request\.mjs|merchant-navigation\.mjs|workshop-shell\.mjs|workshop-shell\.css|order-store-context\.mjs|order-file-grants-ui\.mjs|production-release-ui\.mjs|variant-batch-reader\.mjs|variant-batch-ui\.mjs|form-variants-ui\.mjs|form-variant-picker\.mjs|form-variants\.css|app\.mjs|style\.css|dashboard\.css|editor\.css|ai-design-ui\.mjs|ai-batch-ui\.mjs|product-editor-ui\.mjs|katalog-editor-ui\.mjs|design-authoring\.mjs|editor-selection\.mjs|product-overview-ui\.mjs|product-options-ui\.mjs|native-production-ui\.mjs|batch-reader\.mjs|batch-ui\.mjs|profiles-ui\.mjs|production-profiles-ui\.mjs|export-jobs-ui\.mjs|output-checks-ui\.mjs|output-summary\.mjs|output-specification\.mjs|order-output-context\.mjs|shop-preparation-ui\.mjs|orders-ui\.mjs|order-product-ui\.mjs|cart-handoff-ui\.mjs|production-profiles\.css|contours-ui\.mjs|form-product-ui\.mjs|form-design-ui\.mjs|review-snapshots-ui\.mjs|review-snapshots\.css|form-customer-ui\.mjs|form-interaction\.mjs|form-customer\.css|form-product\.css|contours\.css|design-import-ui\.mjs|customer-fields-ui\.mjs)$/.test(pathname)){base=path.join(ROOT,'workshop/ui');relative=pathname.split('/').pop();}
      // Gebündelte Editor-Module (bundle-build.mjs): Inhalts-Hash im Namen, daher unveränderlich und lange im Cache.
      else if(/^\/_bundle\/editor-[a-f0-9]{16}\.mjs$/.test(pathname)){
        const file=path.join(outputDirectory,'bundle',pathname.split('/').pop()),zipped=acceptsGzip(req.headers['accept-encoding'])&&fs.existsSync(file+'.gz');
        if(!fs.existsSync(file))return fail(404);
        const bytes=fs.readFileSync(zipped?file+'.gz':file);
        const headers={'Content-Type':types['.mjs'],'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff',Vary:'Accept-Encoding','Content-Length':bytes.length,'Content-Security-Policy':adminHost?.cspFor(pathname)||csp};
        if(zipped)headers['Content-Encoding']='gzip';
        res.writeHead(200,headers);return res.end(req.method==='HEAD'?undefined:bytes);
      }
      // Kundenansicht lädt die WebP-Fassungen (customer-images.json); PNG-Originale bleiben abrufbar.
      else if(isDoorbellImagePath(pathname)){
        const resource=doorbellImageResource(pathname,katalogPath());
        if(!resource)return fail(404);
        ({base,relative}=resource);
      }
      else if(/^\/acrylic-assets\/[a-z0-9-]+\.(png|webp)$/.test(pathname)){
        base=path.join(ROOT,'designs/acrylic-unser-anfang');relative=pathname.split('/').pop();
      } else {
        // `/_runtime/lazy/`: beim Build abgeleitete Einzelteile (build.mjs LAZY), vor dem allgemeinen Laufzeitordner.
        const mounts=[['/_runtime/lazy/',LAZY],['/_runtime/',path.join(ROOT,'designs/aosu-labrador/runtime')],['/platform/sources/app/shared/',path.join(ROOT,'platform/sources/app/shared')],['/configurator/variant-m/',HERE]];
        const mount=mounts.find(([prefix])=>pathname.startsWith(prefix));
        if(!mount)return fail(404);
        base=mount[1];relative=pathname.slice(mount[0].length);
        if(!relative||(!pathname.startsWith('/_runtime/')&&!/\.(mjs|js|css)$/.test(relative)))return fail(404);
      }
      const realBase=fs.realpathSync(base),file=fs.realpathSync(path.resolve(base,relative));
      const within=path.relative(realBase,file);
      if(within.startsWith('..')||path.isAbsolute(within)||!fs.statSync(file).isFile())return fail(404);
      let bytes=fs.readFileSync(file);const extension=path.extname(file);
      const transformed=adminHost&&extension==='.html';
      if(transformed)bytes=adminHost.html(bytes,pathname,url.search);
      const headers={'Content-Type':types[extension]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':adminHost?.cspFor(pathname)||csp};
      // Kundenbilder (Szene, Sockel, Beispielfoto): einen Tag im Cache, damit vorgeladene Sockelansichten
      // (background-loading.mjs) beim Wechsel ohne neuen Abruf erscheinen. Alles andere bleibt no-store.
      if(pathname.startsWith('/acrylic-assets/'))headers['Cache-Control']='public, max-age=86400';
      if(isDoorbellImagePath(pathname))headers['Cache-Control']='public, max-age=31536000, immutable';
      if(compressible.has(extension)){headers.Vary='Accept-Encoding';if(bytes.length>1024&&acceptsGzip(req.headers['accept-encoding'])){bytes=await compressed(file,bytes,!transformed);headers['Content-Encoding']='gzip';}}
      headers['Content-Length']=bytes.length;
      res.writeHead(200,headers);
      res.end(req.method==='HEAD'?undefined:bytes);
    } catch {if(!res.headersSent)fail(404);else res.end();}
  });
  return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.argv.find(v=>v.startsWith('--port='))?.split('=')[1]||8961);
  if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Ungültiger Port.');
  const result=build();
  const seed=JSON.parse(fs.readFileSync(path.join(OUTPUT,'models.json'),'utf8'))[0];
  // K9: optional `--themen=<pfad zu themen.json>` aus dem Katalog-Repo (nicht Teil dieses Repos).
  const themenFile=process.argv.find(v=>v.startsWith('--themen='))?.slice('--themen='.length);
  // K12: `--katalog=<pfad>` oder GRAVURU_KATALOG – Themen aus dem Katalog-Repo (wird beim Start geprüft,
  // nur gelesen); Produkte kommen über `scripts/katalog-import.mjs --commit` in die Werkstatt.
  const katalogDir=katalogPath(),katalog=katalogDir?openKatalog(katalogDir):null;
  const workshop=createWorkshop({filename:path.join(ROOT,'../.local-data/workshop.sqlite'),seedConfig:seed.universal,legacy:seed.legacy,themes:themenFile?readThemeCatalog(themenFile):katalog?katalog.themes:null,katalogDir});
  const server=createPreviewServer({workshop});
  server.on('close',()=>workshop.close());
  server.listen(port,'127.0.0.1',()=>{console.log(JSON.stringify({project:'Gravuru 2027',...result,url:`http://127.0.0.1:${port}/?model=acryl`,workshop:`http://127.0.0.1:${port}/werkstatt`,scope:'local-operator'}));warmCompression(['katalog-kern.json','motive-alle.json'].map(name=>path.join(LAZY,name)));});
}
