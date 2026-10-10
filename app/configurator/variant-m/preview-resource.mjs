// Private renderer resources are fetched by the authenticated parent once.
// Persistent design documents retain their immutable source URLs.
export function previewResourceURL(url){
 try{const value=globalThis.window?.parent?.GravuruPreviewResources?.[url];if(typeof value==='string'&&/^data:image\/(?:svg\+xml|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value))return value;}catch{}
 return url;
}
