import {randomBytes} from 'node:crypto';
import {prepareShopProduct} from '../../app/workshop/shop-preparation.mjs';
import {prepareThemeCart} from '../../app/workshop/theme-cart.mjs';
import {createCustomerDesignImages} from '../../app/workshop/customer-design-image.mjs';

export const cartShopDomain='gravuru-beta267.myshopify.com';
const variantKey=o=>JSON.stringify([o.format??o.formatKey,o.color,o.frame,o.mounting]);
const failure=(status,message)=>Object.assign(Error(message),{status});
const sessionName='gravuru_beta_cart';

export function createPreviewCart({workshop,record,entry,variants,origin,secret}){
  const catalogue=new Map(variants.map(v=>[variantKey(v),v]));
  const plan=prepareShopProduct(record);
  const mappings=plan.variants.flatMap(v=>{
    const match=catalogue.get(variantKey(v.options));
    if(!match?.existingVariantId)return [];
    if(match.priceCents!==v.priceCents)throw Error('Ring-Preis stimmt nicht mit dem Katalog überein.');
    return [{key:v.key,variantId:String(match.existingVariantId)}];
  });
  const pricing={schema:'gravuru-personalization-pricing/v1',enabled:true,productId:entry.shopifyProductId,revision:record.revision,currency:'EUR',
    variants:Object.fromEntries(variants.filter(v=>v.existingVariantId).map(v=>[v.existingVariantId,v.priceCents])),
    extraMotifCents:record.document.config.extraMotifCents??0,extraPhotoCents:record.document.config.photo?.extraPriceCents??0};
  const bound=workshop.orderIntake.bindVariants({record,shopDomain:cartShopDomain,mappings,personalizationPricing:pricing});
  const bindings=new Map(bound.bindings.map(b=>[String(b.variantId),{storeId:'ring',tenantId:workshop.tenantId,shopDomain:cartShopDomain,
    shopifyProductId:entry.shopifyProductId,shopifyVariantId:'gid://shopify/ProductVariant/'+b.variantId,
    bindingId:b.id,productId:b.productId,productRevision:b.productRevision,options:b.options,unitCents:b.unitCents,assignmentRevision:1}]));
  const registry={resolve({shopifyProductId,shopifyVariantId}){
    if(shopifyProductId!==entry.shopifyProductId)throw failure(404,'Prüfprodukt fehlt.');
    const binding=bindings.get(shopifyVariantId.split('/').pop());if(!binding)throw failure(404,'Prüfvariante fehlt.');return binding;
  }};
  const images=createCustomerDesignImages({origin,shopDomain:cartShopDomain,secret,stores:[{storeId:'ring',workshop}]});
  // The loopback transport represents a single synthetic shop. All offer,
  // price, draft-grant and revision checks still run against the local workshop.
  const cartWorkshop={customerDrafts:workshop.customerDrafts,repository:workshop.repository,
    tenantId:workshop.tenantId,sessionContext:{shopDomain:cartShopDomain}};
  const carts=new Map();
  function basket(req,res){
    const id=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(sessionName+'='))?.slice(sessionName.length+1);
    if(id&&carts.has(id))return carts.get(id);
    const key=randomBytes(32).toString('hex'),lines=new Map();
    res.setHeader('Set-Cookie',sessionName+'='+key+'; Path=/; HttpOnly; SameSite=Strict');
    carts.set(key,lines);return lines;
  }
  function add(lines,body,token){
    if(!Number.isSafeInteger(body.quantity)||body.quantity<1||body.quantity>99||body.configId!==undefined||body.cartRevision!==undefined||body.cartLineId!==undefined)throw failure(422,'Eine neue Gestaltung mit gültiger Menge ist erforderlich.');
    const draft=workshop.customerDrafts.acrylicDrafts.get(body.draftId,token);
    const manifest=workshop.customerDrafts.review(draft.snapshotId).manifest;
    const variant=catalogue.get(variantKey(manifest.selection.options));
    if(!variant?.existingVariantId||draft.productId!==record.id)throw failure(422,'Diese Gestaltung gehört nicht zu einer gebundenen Ring-Ausführung.');
    const binding=bindings.get(String(variant.existingVariantId));
    const transfer=prepareThemeCart({workshop:cartWorkshop,registry,shopDomain:cartShopDomain,proxyPath:'/apps/konfigurator',customerImageUrl:id=>images.url('ring',id)},
      binding,{draftId:body.draftId,expectedRevision:body.expectedRevision,quantity:body.quantity},{draftToken:token});
    const p=transfer.payload,key=p.configuration.id;
    const current=lines.get(key);
    if(current?.revision===p.configuration.rev)return;
    if(current)throw failure(409,'Eine bestehende Warenkorbposition kann nur entfernt werden.');
    transfer.claim(randomBytes(32).toString('hex'));
    lines.set(key,{key,revision:p.configuration.rev,variant:p.variantId,sku:variant.existingSku,title:entry.title||record.document.name,
      design:p.properties.Design,text:p.properties.Gravurtext,format:p.properties.Format,
      options:manifest.selection.labels.map(v=>v.value),unitCents:p.unitCents,quantity:p.quantity,totalCents:p.totalCents,
      image:new URL(p.properties._gravuru_bild).pathname,sourceImageSha256:manifest.files.find(f=>f.path==='gestaltung-kundenansicht.png')?.sha256??manifest.files.find(f=>f.path==='gestaltung-referenz.png')?.sha256});
  }
  return async function handle(req,res,path,send){
    if(images.matches(path)){
      try{return send(200,'image/png',images.read(path));}catch{return send(404,'text/plain','Vorschaubild nicht verfügbar.');}
    }
    if(!path.startsWith('/beta-warenkorb/daten'))return false;
    try{
      const lines=basket(req,res);
      if(req.method==='POST'&&path==='/beta-warenkorb/daten'){
        let raw='';for await(const part of req){raw+=part;if(raw.length>4096)throw failure(413,'Anfrage zu groß.');}
        add(lines,JSON.parse(raw),req.headers['x-gravuru-draft']);
      }else if(req.method==='DELETE'){
        const match=/^\/beta-warenkorb\/daten\/(konfig_[a-f0-9-]{36})$/.exec(path);
        if(!match||!lines.delete(match[1]))throw failure(404,'Position fehlt.');
      }else if(req.method!=='GET'||path!=='/beta-warenkorb/daten')throw failure(405,'Unbekannte Warenkorbaktion.');
      const items=[...lines.values()];
      return send(200,'application/json',JSON.stringify({items,totalCents:items.reduce((sum,i)=>sum+i.totalCents,0)}));
    }catch(err){return send(err.status||422,'application/json',JSON.stringify({error:err.message}));}
  };
}
