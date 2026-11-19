import {motifThemes} from '../configurator/variant-m/motif-themes.mjs';
import {initialMotifChoices,NATIVE_STARTER_MOTIFS,motifChoices} from '../configurator/variant-m/profile-selection.mjs';

// Public asset addresses only; never include a session, design data, price or upload.
// The existing start projection/slimmer supplies the exact native font hashes.
export function shopWarmManifest(config,{editorPath,pagePath='/konfigurator/shop/',previews=[]}={}){
 if(editorPath!=='/_merchant-acryl-editor.html'||pagePath!=='/konfigurator/shop/')return null;
 const profile=config?.profile,design=profile?.designs?.find(d=>d.id===profile.defaultDesignId)||profile?.designs?.[0];
 const names=[...new Set((design?.objects||[]).filter(o=>o.type==='text').map(o=>o.font))].filter(n=>typeof n==='string').slice(0,3);
 const own=new Map((config?.localResources?.lazyFonts||[]).map(f=>[f.name,f.url]));
 const selected=config?.workshopProfiles?.selections?.bestsellers;
 const allowed=config?.workshopProfiles?.selections?.motifs;
 // Public suggestions share the native initial resolver. Session usage ranks
 // are resolved later by the editor; no private usage/design data leaves here.
 const candidates=[...new Set([...(selected||[]),...(motifThemes[config?.motifTheme]?.featured||[]),...NATIVE_STARTER_MOTIFS,...(allowed||[])])];
 const available=motifChoices(candidates.map(key=>({key})),allowed);
 const motifs=config?.moduleProfile?.modules?.motifs===false?[]:initialMotifChoices(available,[],config).map(item=>item.key);
 const previewGlyphs=config?.localResources?.previewGlyphs;
 return {schema:'gravuru-shop-warm/v1',editorPath,catalogPath:'/_acryl-runtime/lazy/katalog-kern.json',
  ...(typeof previewGlyphs==='string'&&/^\/_acryl-runtime\/lazy\/vorschau-glyphen\/[a-f0-9]{64}\.json$/.test(previewGlyphs)?{previewGlyphs}:{}),
  fonts:names.map(name=>({name,...(typeof own.get(name)==='string'&&own.get(name).startsWith(pagePath+'schriften/')?{url:own.get(name)}:{})})),
  ...(Array.isArray(previews)&&previews.length?{previews:[...new Set(previews)].filter(url=>/^\/konfigurator\/shop\/vorschauen\/[a-f0-9]{64}\.svg$/.test(url)).slice(0,3)}:{}),
  motifs:[...new Set(motifs)].filter(k=>typeof k==='string'&&/^import-[a-f0-9]{24}$/.test(k)).slice(0,6)};
}
