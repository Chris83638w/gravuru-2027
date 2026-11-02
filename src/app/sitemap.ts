import type {MetadataRoute} from 'next'
import {getPages,getSettings,origin,pagePath,publicSite} from '@/lib/content'
export const dynamic='force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap>{if(!publicSite)return [];const [pages,settings]=await Promise.all([getPages(),getSettings()]);const media=(image:any)=>image&&typeof image==='object'&&image.approved&&image.url?[new URL(image.url,origin).href]:[];return [...['','/leistungen','/fuer-wen','/produkte','/ueber-uns','/kontakt','/konfigurator','/referenzen'].map(path=>({url:origin+path,...(path===''?{images:media(settings.heroImage)}:{})})),...pages.map(p=>({url:origin+pagePath(p),lastModified:p.updatedAt,images:media(p.image)}))]}
