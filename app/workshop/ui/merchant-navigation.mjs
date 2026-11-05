// Preserve public embedding context only. Session tokens never enter links.
export function merchantNavigation(href, current, {newTab=false, apiKey='', shop=''}={}) {
  const url=new URL(href,current), source=new URL(current);
  if(url.origin!==source.origin||!url.pathname.startsWith('/werkstatt'))return url.href;
  for(const key of ['id_token','session','hmac'])url.searchParams.delete(key);
  if(newTab&&/^[a-zA-Z0-9_-]+$/.test(apiKey)&&/^[a-z0-9-]+\.myshopify\.com$/.test(shop)){
    const target=new URL('https://'+shop+'/admin/apps/'+apiKey+url.pathname);
    for(const [key,value] of url.searchParams)if(!['host','shop','embedded','id_token','session','hmac'].includes(key))target.searchParams.set(key,value);
    return target.href;
  }
  for(const key of ['host','shop','embedded'])if(source.searchParams.has(key))url.searchParams.set(key,source.searchParams.get(key));
  return url.href;
}
if(globalThis.document?.querySelector('meta[name=gravuru-merchant-auth]')){
 const nav=document.querySelector('.ws-nav,nav[aria-label="Hauptnavigation"]');if(nav&&!nav.querySelector('a[href="/werkstatt/motivsuche/"]')){const link=document.createElement('a');link.href='/werkstatt/motivsuche/';link.className=nav.classList.contains('ws-nav')?'ws-nav-item':'nav-item';link.dataset.motifAnalytics='';link.textContent='Suchauswertung';nav.append(link);}
 const apiKey=document.querySelector('meta[name=shopify-api-key]')?.content,shop=document.querySelector('meta[name=shopify-shop]')?.content;
 const follow=event=>{
  const link=event.target.closest('a[href]');if(!link||link.hasAttribute('download'))return;
  const original=link.getAttribute('href'),modified=event.ctrlKey||event.metaKey||event.shiftKey||event.button===1;
  link.href=merchantNavigation(link.href,location.href,{apiKey,shop,newTab:link.target==='_blank'||modified});
  if(modified)setTimeout(()=>link.setAttribute('href',original),0);
 };
 document.addEventListener('click',follow,true);document.addEventListener('auxclick',follow,true);
 for(const node of document.querySelectorAll('.sidebar-footer,.sidebar-bottom,.environment-label'))if(node.textContent.includes('Lokale Werkstatt'))node.textContent='Shopify-Werkstatt';
}
