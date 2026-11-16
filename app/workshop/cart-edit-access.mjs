import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';

// The browser keeps only this scoped, expiring credential in its editor-origin storage.
// The lifetime matches the saved checkout offer. The draft token never goes to the shop page.
const lifetimeMs=7*24*60*60*1000;
const format=/^gce1\.([A-Za-z0-9_-]{1,240})$/;
const draftFormat=/^[a-f0-9]{64}$/;
const associatedData=({configId,rev,binding,customerId})=>Buffer.from(JSON.stringify([
 configId,rev,binding.shopDomain,binding.storeId,binding.tenantId,binding.shopifyProductId,
 binding.shopifyVariantId,binding.productId,binding.productRevision,customerId??null
]));

export function createCartEditAccess({secret,clock=Date.now}){
 const key=createHmac('sha256',secret).update('gravuru-cart-edit-access-v1').digest();
 return {
  issue(draftToken,scope){
   const expiresAt=clock()+lifetimeMs,nonce=randomBytes(12);
   const cipher=createCipheriv('aes-256-gcm',key,nonce);
   cipher.setAAD(associatedData(scope));
   const encrypted=Buffer.concat([cipher.update(JSON.stringify({draftToken,expiresAt})),cipher.final()]);
   return {token:'gce1.'+Buffer.concat([nonce,cipher.getAuthTag(),encrypted]).toString('base64url'),expiresAt};
  },
  recover(token,scope){
   const encoded=typeof token==='string'?token.match(format)?.[1]:null;
   if(!encoded)return null;
   try{
    const bytes=Buffer.from(encoded,'base64url');
    const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
    decipher.setAAD(associatedData(scope));
    decipher.setAuthTag(bytes.subarray(12,28));
    const {draftToken,expiresAt}=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]));
    return draftFormat.test(draftToken??'')&&Number.isSafeInteger(expiresAt)&&expiresAt>clock()?draftToken:null;
   }catch{return null;}
  }
 };
}
