import type {Metadata} from 'next'
import {origin} from './content'

export function regionalMetadata(title:string,description:string,path:string,image?:any):Metadata {
 const regionalTitle=/Bielefeld/i.test(title)?title:`${title} in Bielefeld`
 const media=image&&typeof image==='object'&&image.approved&&image.url?image:null
 const images=media?[{url:new URL(media.url,origin).href,width:media.width,height:media.height,alt:media.alt}]:undefined
 return {title:regionalTitle,description,alternates:{canonical:path},openGraph:{title:regionalTitle,description,url:path,siteName:'Gravuru Manufaktur',locale:'de_DE',type:'website',...(images?{images}:{})},twitter:{card:images?'summary_large_image':'summary',title:regionalTitle,description,...(images?{images:images.map(i=>i.url)}:{})}}
}
