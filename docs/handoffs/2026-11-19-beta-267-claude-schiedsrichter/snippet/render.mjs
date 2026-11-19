// Rendert die Warenkorb-Snippets beider Kandidaten mit denselben Warenkorbzeilen (lokal, ohne Shop).
// Aufruf: node render.mjs <Pfad Kandidat A> <Pfad Kandidat B>
// Hinweis: liquidjs ist nicht Shopify-Liquid; {% doc %}/{% stylesheet %} werden entfernt, asset_url nachgebildet.
import {Liquid} from 'liquidjs';
import fs from 'node:fs';
import path from 'node:path';
const [a,b]=process.argv.slice(2);
const snip=(root,name)=>fs.readFileSync(path.join(root,'ops/shopify/theme-block/snippets',name),'utf8')
  .replace(/\{%-?\s*doc\s*-?%\}[\s\S]*?\{%-?\s*enddoc\s*-?%\}/g,'')
  .replace(/\{%-?\s*stylesheet\s*-?%\}[\s\S]*?\{%-?\s*endstylesheet\s*-?%\}/g,'');
const quellen={
  'A neu (gravuru-warenkorb-bearbeiten, eingebunden)':snip(a,'gravuru-warenkorb-bearbeiten.liquid'),
  'B eingebunden (gravuru-warenkorb-bearbeiten, unverändert)':snip(b,'gravuru-warenkorb-bearbeiten.liquid'),
  'B Vorschlag (gravuru-warenkorb-nur-vorschau, nicht eingebunden)':snip(b,'gravuru-warenkorb-nur-vorschau.liquid'),
};
const engine=new Liquid({strictFilters:true});
engine.registerFilter('asset_url',v=>'/assets/'+v);engine.registerFilter('t',v=>'['+v+']');engine.registerFilter('image_url',v=>'/standardbild/'+v);engine.registerFilter('image_tag',v=>'<img class="standardbild" src="'+v+'">');
const root='https://app-2027.gravuru-designwerkstatt.de/gestaltung/';
const hex=c=>c.repeat(64);
const nat=(extra)=>({product:{title:'Klingelschild Ring <Test>',id:1,url:'/products/ring'},variant:{id:57471227756924},key:'k1',url:'/products/ring?variant=57471227756924',title:'Klingelschild Ring',image:'ring-standard.jpg',properties:{_gravuru_config:'cfg-1',_gravuru_rev:'3',_gravuru_bearbeiten:'https://gravuru.de/apps/konfigurator/start?gravuru_cart=1&config=cfg-1',...extra}});
const faelle={
  '1 eigenes Bild (Zeile Nord)':nat({_gravuru_bild:root+'nord/'+hex('a')+'.png'}),
  '2 eigenes Bild (Zeile Süd, gleiche Variante)':nat({_gravuru_config:'cfg-2',_gravuru_bild:root+'sued/'+hex('b')+'.png'}),
  '3 nur Shopify-Datei (_gravuru_checkout_image)':nat({_gravuru_checkout_image:'https://cdn.shopify.com/s/files/1/0001/files/gravuru-gestaltung-'+hex('c')+'.png?v=1'}),
  '4 Bild auf fremdem Server':nat({_gravuru_bild:'https://example.org/gestaltung/x.png'}),
  '5 Bild mit eingeschleustem Attribut':nat({_gravuru_bild:root+'x" onerror="alert(1)" y=".png'}),
  '6 kein Bild, Status gesichert':nat({_gravuru_vorschau_status:'persoenlich_gesichert'}),
  '7 kein Bild, kein Status':nat({}),
  '8 gewöhnlicher Artikel ohne Gestaltung':{product:{title:'Zubehör'},properties:{}},
  '9 Altbestand (Upload-Weg)':{product:{title:'Altes Schild'},properties:{'_Gravuru Vorgang':'v1','Bearbeitbarer Entwurf':'https://cdn.shopify.com/s/files/1/x/e.json','Entwurf':'https://cdn.shopify.com/s/files/1/x/e.png'}},
};
const out={};
for (const [k,src] of Object.entries(quellen)) {
  out[k]={};
  for (const [f,item] of Object.entries(faelle)) {
    let html;
    try {html=(await engine.parseAndRender(src,{item})).replace(/\s+/g,' ').trim();}
    catch(e){out[k][f]={fehler:String(e.message).slice(0,160)};continue;}
    const imgs=[...html.matchAll(/<img[^>]*src="([^"]*)"/g)].map(m=>m[1]);
    const links=[...html.matchAll(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(m=>({href:m[1],text:m[2].replace(/<[^>]+>/g,'').trim()}));
    out[k][f]={
      bild:imgs,
      bearbeitenLink:links.filter(l=>/start\?|gravuru_cart=|config=|bearbeiten|cart\.edit/i.test(l.href+l.text)).length,standardbild:imgs.filter(u=>u.startsWith('/standardbild/')).length,
      vergroessern:links.filter(l=>imgs.includes(l.href)).length,
      status:[...html.matchAll(/role="?(status|alert)"?[^>]*>([^<]*)</g)].map(m=>m[1]+': '+m[2].trim()),
      rohesAttribut:/onerror="alert/.test(html),
      leer:html==='',
    };
  }
}
fs.writeFileSync('ergebnis.json',JSON.stringify(out,null,1));
for (const [k,v] of Object.entries(out)) {console.log('\n== '+k);for (const [f,r] of Object.entries(v)) console.log(' '+f+' → '+JSON.stringify(r));}
