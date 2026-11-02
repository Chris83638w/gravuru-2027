import fs from 'node:fs';
import path from 'node:path';
import {openKatalog} from '../app/workshop/katalog-source.mjs';
import {convertFont} from '../app/workshop/font-library.mjs';
import {planFamilyFormats} from '../app/workshop/katalog-family-formats.mjs';
import {readShopProductCut,validateShopProductCut} from '../app/workshop/shop-product-cut.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(s=>{const at=s.indexOf('=');return at<0?[s,true]:[s.slice(0,at),s.slice(at+1)];}));
const allowed=['--katalog','--linie','--unterkategorie','--output','--pruefvorlagen','--designs','--shop-product'];
if(Object.keys(args).some(k=>!allowed.includes(k))||!['--katalog','--linie','--unterkategorie','--output'].every(k=>typeof args[k]==='string'))throw Error('Aufruf: --katalog=<Pfad> --linie=<ID> --unterkategorie=<ID> --output=<neuer Ordner> [--pruefvorlagen] [--designs=<IDs,kommagetrennt>] [--shop-product=<Produkt-Metafeld-JSON>]');
const output=path.resolve(args['--output']);if(fs.existsSync(output))throw Error('Ausgabeordner existiert bereits; kein Überschreiben.');
const input=args['--shop-product']?JSON.parse(fs.readFileSync(args['--shop-product'],'utf8')):null;
const shopProduct=input?(input.namespace?readShopProductCut(input):validateShopProductCut(input)):null;
const result=await planFamilyFormats(openKatalog(args['--katalog']),args['--linie'],args['--unterkategorie'],{reviewUnreleased:args['--pruefvorlagen']===true,designIds:args['--designs']?.split(','),converter:convertFont,shopProduct});
fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'plan.json'),JSON.stringify(result.report,null,2)+'\n');
if(result.config)fs.writeFileSync(path.join(output,'review-config.json'),JSON.stringify(result.config)+'\n');
console.log(JSON.stringify({output,reviewProduct:!!result.config,availableVariants:result.report.shopify.availableVariants??0,plannedVariants:result.report.shopify.plannedVariants,blocked:result.report.blocked.length,unavailable:result.report.unavailable.length}));
