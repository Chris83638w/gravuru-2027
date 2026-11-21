import {thankYouPreview} from './model.mjs';
// API 2026-10, purchase.thank-you.cart-line-item.render-after.
// Source for the existing Shopify app: no deployment or network mutation here.
export default function(){
 const render=line=>{
  const value=thankYouPreview(line);
  if(!value){document.body.replaceChildren();return;}
  const stack=document.createElement('s-stack'),link=document.createElement('s-link'),image=document.createElement('s-image'),text=document.createElement('s-text');
  stack.gap='small';link.href=value.src;link.target='_blank';image.src=value.src;image.alt=value.alt;text.textContent=value.message;
  link.append(image);stack.append(link,text);document.body.replaceChildren(stack);
 };
 render(shopify.target.value);
 shopify.target.subscribe(render);
}
