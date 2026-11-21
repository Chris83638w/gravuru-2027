import {ORDER_BLOCK_QUERY,orderBlockModel,orderGid} from './model.mjs';
// #265 Stufe C, ENTSCHEIDUNGEN 3.53 (6)/3.57 (1): Block in der Bestellseite des Shopify-Admin.
// API 2025-10, admin.order-details.block.render. Quelle für die bestehende Shopify-App: hier weder Veröffentlichung noch
// Schreibzugriff. Bild und beide Verweise zeigen auf den eigenen Server; über Shopify wird keine Datei ausgeliefert.
// Am echten Shop zu bestätigen (ohne Netz nicht prüfbar): Zielname, `shopify.data.selected`, der lesende Abruf über
// `shopify:admin/api/graphql.json`, die Bausteine s-stack/s-box/s-image/s-button/s-text samt ihrer Eigenschaften in dieser
// API-Version und ob der Admin ein Bild vom eigenen Server anzeigt. Zeigt er es nicht, bleiben die beiden Verweise nutzbar.
const element=(name,properties={},children=[])=>{const node=document.createElement(name);Object.assign(node,properties);node.append(...children);return node;};
const note=message=>element('s-text',{textContent:message});

async function readOrder(id){
 const response=await fetch('shopify:admin/api/graphql.json',{method:'POST',body:JSON.stringify({query:ORDER_BLOCK_QUERY,variables:{id}})});
 if(!response.ok)throw Error('order_block_read');
 const body=await response.json();
 if(body.errors?.length||!body.data?.order)throw Error('order_block_read');
 return body.data.order;
}

function lineView(line){
 const heading=element('s-text',{textContent:line.quantity?line.quantity+' × '+line.title:line.title});
 const buttons=element('s-stack',{direction:'inline',gap:'small'},line.actions.map(action=>element('s-button',{href:action.href,target:'_blank',textContent:action.label})));
 const picture=line.image?[element('s-box',{maxInlineSize:'240px'},[element('s-image',{src:line.image.src,alt:line.image.alt})])]:[];
 return element('s-stack',{direction:'block',gap:'small'},[heading,...picture,buttons]);
}

export default async function(){
 const show=children=>document.body.replaceChildren(element('s-admin-block',{},[element('s-stack',{direction:'block',gap:'base'},children)]));
 const id=orderGid(shopify.data?.selected?.[0]?.id);
 if(!id)return show([note('Die Bestellung konnte nicht gelesen werden.')]);
 show([note('Gestaltung wird geladen …')]);
 try{
  const model=orderBlockModel(await readOrder(id));
  show(model.lines.length?model.lines.map(lineView):[note('Diese Bestellung enthält keine Gravuru-Gestaltung.')]);
 }catch{show([note('Die Gestaltung konnte nicht geladen werden. Bitte die Seite neu laden.')]);}
}
