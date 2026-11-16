// Mikail, 06.11.2026: review the actual options before creating new products.
// Mount ONLY on the private gallery host, before the ordinary workshop handler.
// This does not change repository/CLI imports or the general customer server.
// Route sources: app/workshop/http.mjs; batch jobs/plans store no new products.
export const GALLERY_PRODUCT_CREATION_URL='/originale/verwaltung#anlegen';

const routes=[
 ['native-product',/^\/api\/workshop\/products$/],
 ['form-product',/^\/api\/workshop\/form-products$/],
 ['product-copy',/^\/api\/workshop\/products\/cfg_[a-f0-9-]+\/copy$/],
 ['family-products',/^\/api\/workshop\/families\/[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}\/products$/],
 ['order-product',/^\/api\/workshop\/orders\/orderline_[a-f0-9-]+\/product-draft\/apply$/],
 ['variant-group',/^\/api\/workshop\/variants$/],
 // These old commit endpoints can mix creation and updates. The private host
 // deliberately does not replay/replace request streams to split their rows.
 // Existing products remain editable individually; CLI imports stay untouched.
 ['product-batch',/^\/api\/workshop\/batch\/commit$/],
 ['variant-batch',/^\/api\/workshop\/variants\/batch\/commit$/]
];

export function galleryManagementCreationRoute(method,pathname){
 if(method!=='POST')return null;
 return routes.find(([,pattern])=>pattern.test(pathname))?.[0]||null;
}

export function createGalleryManagementCreationGate(){
 return (req,res,url=new URL(req.url,'http://127.0.0.1'))=>{
  const route=galleryManagementCreationRoute(req.method,url.pathname);
  if(!route)return false;
  const batch=route.endsWith('-batch');
  const message=batch
   ?'Alte Tabellenübernahmen sind in dieser privaten Galerie gesperrt, auch reine Update-Tabellen. Neue Produkte bitte unter „Anlegen“ mit allen konkreten Optionen bestätigen. Bestehende Produkte können weiterhin einzeln bearbeitet werden.'
   :'Vor der Neuanlage bitte die Produktgruppe, Materialien, Größen und alle konkreten Optionen unter „Anlegen“ prüfen und ausdrücklich bestätigen.';
  const bytes=Buffer.from(JSON.stringify({error:{code:'group_confirmation_required',message,url:GALLERY_PRODUCT_CREATION_URL,route},scope:'private-gallery',created:false}));
  res.writeHead(428,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Location':GALLERY_PRODUCT_CREATION_URL}).end(bytes);
  return true;
 };
}
