// Local component check only. No family, plate, design, Shopify or order is created.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {bindSlateAccessories} from '../app/workshop/slate-accessories.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const catalogueRoot=path.resolve(process.argv[2]||'../katalog-zubehoer');
const sourcePath='materialien/zubehoer/schiefer-zubehoer.json';
const catalogue=JSON.parse(fs.readFileSync(path.join(catalogueRoot,sourcePath)));
const groups=[{id:'mounting',name:'Befestigung',values:[{id:'K00',label:'Ohne Befestigung',priceCents:0,holes:[]}]},{id:'accessory',name:'Zubehör',values:[{id:'none',label:'Ohne Zubehör',priceCents:0}]}],bindings=[];
for(const row of catalogue.optionen.filter(row=>row.art!=='aufpreis')){
 const group=groups[row.art==='zubehoer'?1:0];
 for(const colour of row.farben||[undefined]){
  const id=row.id+(colour?'-'+row.farben.indexOf(colour):'');
  group.values.push({id,label:row.name+(colour?' · '+colour:''),priceCents:row.preisCents+(colour?(row.preisJeFarbe[colour]??row.preisJeFarbe.farbig):0)});
  bindings.push({groupId:group.id,valueId:id,optionId:row.id,...(colour?{imageName:colour}:{})});
 }
}
const config=bindSlateAccessories({profile:{optionGroups:groups},photo:{enabled:true,includedCount:0,extraPriceCents:catalogue.optionen.find(row=>row.id==='foto').preisCents}},
 {catalogue,source:{path:sourcePath,revision:'local-component-check'},bindings,includePhoto:true,resolveImage:file=>'/catalogue/materialien/zubehoer/'+file});
const html=`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Schiefer-Zubehör · lokale Komponentenprüfung</title><style>body{font:16px system-ui;margin:20px;background:#f4f4f4}main{max-width:780px;margin:auto}button{font:inherit}#width{margin:12px 0}</style><main><h1>Schiefer-Zubehör</h1><p>Lokale Komponentenprüfung mit Katalogbildern. Kein Produkt und kein freigegebenes Sortiment. Zubehör hier nur als Test-Auswahl.</p><button id="width">390 px prüfen</button><div id="host"></div><output id="status" aria-live="polite">Noch keine Auswahl</output></main><script type="module">
import {installMemorialExecution} from '/app/configurator/variant-m/memorial-execution.mjs';
const config=await (await fetch('/config.json')).json(),el=document.querySelector('#host');
el.attachShadow({mode:'open'});el.shadowRoot.innerHTML='<style>:host{display:block}h3{margin:18px 0 8px}.m-option-pictures>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.m-option-tile{display:grid;justify-items:center;gap:6px;padding:12px;border:1px solid #ccc;border-radius:12px;background:white;color:#222;min-width:0}.m-option-tile[aria-pressed=true]{border:2px solid #55616b;background:#edf0f3}.m-option-tile svg{width:32px;height:32px}small{font-size:12px}strong{text-align:center}button:focus-visible{outline:2px solid #333}</style><div id="picks"><div id="pictures" class="m-option-pictures"></div></div>';
const picks=el.shadowRoot.querySelector('#picks'),pictures=el.shadowRoot.querySelector('#pictures'),status=document.querySelector('#status');
el.uxShowSection=section=>status.textContent='Foto gestalten: '+section;
installMemorialExecution({el,config,picks,pictures});
pictures.addEventListener('click',event=>{const button=event.target.closest('[data-picture-option]');if(!button)return;const group=button.dataset.pictureGroup;for(const b of pictures.querySelectorAll('[data-picture-group]'))if(b.dataset.pictureGroup===group)b.setAttribute('aria-pressed',String(b===button));status.textContent='Auswahl: '+button.innerText.replaceAll('\\n',' · ');});
document.querySelector('#width').onclick=()=>{document.querySelector('main').style.width='390px';document.querySelector('main').style.maxWidth='100%';status.textContent='Prüfbreite 390 px';};
window.addEventListener('error',event=>status.textContent='Fehler: '+event.message);
</script></html>`;
const mime={'.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(html);}
 if(pathname==='/config.json'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(config));}
 const catalogueAsset=pathname.startsWith('/catalogue/materialien/zubehoer/bilder/'),appAsset=pathname.startsWith('/app/');
 if(!catalogueAsset&&!appAsset){res.statusCode=404;return res.end();}
 const base=catalogueAsset?catalogueRoot:root,file=path.resolve(base,'.'+(catalogueAsset?pathname.slice('/catalogue'.length):pathname));
 if(!file.startsWith(base+path.sep)){res.statusCode=403;return res.end();}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end();}
}).listen(8976,'127.0.0.1',()=>console.log('Local accessory component check: http://127.0.0.1:8976'));
