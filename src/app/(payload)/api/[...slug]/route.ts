import config from '@payload-config'
import {REST_GET,REST_POST,REST_DELETE,REST_PATCH,REST_PUT,REST_OPTIONS} from '@payloadcms/next/routes'
export const GET=REST_GET(config)
const post=REST_POST(config)
export const POST:typeof post=(req,ctx)=>{
 if(process.env.SITE_PUBLIC==='true'&&new URL(req.url).pathname.replace(/\/+$/,'')==='/api/users/first-register')return Promise.resolve(Response.json({error:'Die öffentliche Ersteinrichtung ist gesperrt.'},{status:403}))
 return post(req,ctx)
}
export const DELETE=REST_DELETE(config)
export const PATCH=REST_PATCH(config)
export const PUT=REST_PUT(config)
export const OPTIONS=REST_OPTIONS(config)
