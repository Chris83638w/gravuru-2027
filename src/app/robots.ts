import {origin,publicSite} from '@/lib/content'
import type {MetadataRoute} from 'next'
export default function robots():MetadataRoute.Robots{return {rules:publicSite?{userAgent:'*',allow:['/','/api/media/file/'],disallow:['/admin','/api','/anfrage','/gestalten','/materialverwaltung','/werkstatt-api','/vorschau']}:{userAgent:'*',disallow:'/'},...(publicSite?{sitemap:origin+'/sitemap.xml'}:{})}}
