import test from 'node:test';import assert from 'node:assert/strict';
import {thankYouPreview} from '../../ops/shopify/thank-you-preview/src/model.mjs';
const src='https://app-2027.gravuru-designwerkstatt.de/gestaltung/acryl/offer_11111111-1111-4111-8111-111111111111/'+'a'.repeat(64)+'.png';
const line=url=>({attributes:[{key:'_gravuru_config',value:'konfig_test'},{key:'_gravuru_bild',value:url}],merchandise:{title:'Türschild'}});
test('thank-you preview uses the immutable position image and spelling reminder',()=>{assert.deepEqual(thankYouPreview(line(src)),{src,alt:'Deine Gestaltung: Türschild',message:'Bitte prüfe die Schreibweise.'});});
test('thank-you rejects absent properties, foreign URLs, query tokens and editor links',()=>{for(const url of [undefined,src.replace('https:','http:'),src.replace('app-2027.gravuru-designwerkstatt.de','evil.example'),src+'?token=secret','https://app-2027.gravuru-designwerkstatt.de/werkstatt/'])assert.equal(thankYouPreview(line(url)),null);assert.equal(thankYouPreview({attributes:[]}),null);assert.equal(thankYouPreview(),null);});
