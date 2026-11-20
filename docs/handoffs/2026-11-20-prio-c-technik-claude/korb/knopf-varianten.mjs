// Claude · 20.11.2026 · Hat jede Variante der Produktseite den Knopf „Jetzt personalisieren“ im HTML des Themes? Nur lesend.
import {createRequire} from 'node:module';
const require=createRequire(process.env.NODE_MODULES_DIR+'/');const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,proxy:{server:process.env.HTTPS_PROXY}});
const ctx=await browser.newContext({locale:'de-DE',userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
for(const h of process.argv.slice(2)){
 const js=await (await ctx.request.get('https://gravuru-design.myshopify.com/products/'+h+'.js')).json();
 const zeilen=[];
 for(const v of js.variants){
  const r=await ctx.request.get('https://gravuru-design.myshopify.com/products/'+h+'?variant='+v.id);const html=await r.text();
  const block=/data-gravuru-personalisieren[^>]*data-variant-id="(\d+)"/.exec(html),knopf=/<a[^>]*data-gravuru-start[^>]*>([^<]*)</.exec(html),thema=/\/cdn\/shop\/t\/(\d+)\//.exec(html);
  zeilen.push({variante:v.title,id:v.id,verfuegbar:v.available,status:r.status(),thema:thema?.[1],block:block?block[1]===String(v.id)?'ja':'ja (für '+block[1]+')':'NEIN',knopf:knopf?knopf[1].trim():'NEIN'});
 }
 console.log(h,'· Varianten',js.variants.length);for(const z of zeilen)console.log('  ',JSON.stringify(z));
}
await browser.close();
