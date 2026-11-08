import {motifThemes} from '../configurator/variant-m/motif-themes.mjs';

// Public asset addresses only; never include a session, design, price or upload.
// The existing start projection/slimmer supplies the exact native font hashes.
export function shopWarmManifest(config,{editorPath,pagePath='/konfigurator/shop/'}={}){
 if(editorPath!=='/_merchant-acryl-editor.html'||pagePath!=='/konfigurator/shop/')return null;
 const profile=config?.profile,design=profile?.designs?.find(d=>d.id===profile.defaultDesignId)||profile?.designs?.[0];
 const names=[...new Set((design?.objects||[]).filter(o=>o.type==='text').map(o=>o.font))].filter(n=>typeof n==='string').slice(0,3);
 const own=new Map((config?.localResources?.lazyFonts||[]).map(f=>[f.name,f.url]));
 const selected=config?.workshopProfiles?.selections?.bestsellers;
 const allowed=config?.workshopProfiles?.selections?.motifs;
 // No theme is set on legacy steel products: warm existing common/home entries
 // without changing the visible selection. Explicit empty lists stay empty.
 const candidates=Array.isArray(selected)?selected:(motifThemes[config?.motifTheme]?.featured||motifThemes.home.featured);
 const motifs=config?.moduleProfile?.modules?.motifs===false?[]:Array.isArray(allowed)?candidates.filter(k=>allowed.includes(k)):candidates;
 return {schema:'gravuru-shop-warm/v1',editorPath,catalogPath:'/_acryl-runtime/lazy/katalog-kern.json',
  fonts:names.map(name=>({name,...(typeof own.get(name)==='string'&&own.get(name).startsWith(pagePath+'schriften/')?{url:own.get(name)}:{})})),
  motifs:[...new Set(motifs)].filter(k=>typeof k==='string'&&/^import-[a-f0-9]{24}$/.test(k)).slice(0,6)};
}
