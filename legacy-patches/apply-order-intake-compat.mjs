import {createHash} from 'node:crypto';
// Exact-source-only patch. Caller reads/writes a NEW staging copy; no I/O here.
export const ORIGINAL_SHA256="bd39118bf132db2515ed1fbe5e96ed0bd57ccd3de8046523323061f352fb3a19";
const changes=[
  [
    "import {prepareShopProduct} from './shop-preparation.mjs';",
    "import {prepareShopProduct} from './shop-preparation.mjs';\nimport {createLegacyOrderIntakeAccess,createLegacyOrderRouting} from './shop-product-binding-legacy.mjs';"
  ],
  [
    " const tx=fn=>",
    " const legacyRouting=createLegacyOrderRouting({database:db});\n const tx=fn=>"
  ],
  [
    " return {get,",
    " const intake={get,"
  ],
  [
    "  receive(raw,headers,config){",
    "  receive(raw,headers,config,routing){\n   if(routing!==undefined&&headers['x-shopify-topic']!=='orders/paid')fail(422,'Eine Positionsauswahl ist nur für Zahlungsnachrichten vorgesehen.');"
  ],
  [
    "const verified=verifyPaidWebhook(raw,headers,config);return tx(()=>{",
    "const verified=verifyPaidWebhook(raw,headers,config),accepted=legacyRouting.prepare(verified,routing);return tx(()=>{"
  ],
  [
    "if(existing){if(existing.body_sha256",
    "if(existing){legacyRouting.replay(verified,accepted);if(existing.body_sha256"
  ],
  [
    "const lineId=identifier(line.id);if(seen.has(lineId))fail(422,'Doppelte Bestellposition.');seen.add(lineId);",
    "const lineId=identifier(line.id);if(seen.has(lineId))fail(422,'Doppelte Bestellposition.');seen.add(lineId);\n    if(accepted&&!accepted.has(lineId))continue;"
  ],
  [
    "    for(const expected of personalizationAttributes(extra?.personalization)){",
    "    legacyRouting.assertProduct(b,line,shop);\n    for(const expected of personalizationAttributes(extra?.personalization)){"
  ],
  [
    "   db.prepare('INSERT INTO form_order_events VALUES(?,?,?,?,?)')",
    "   legacyRouting.complete(verified,accepted);\n   db.prepare('INSERT INTO form_order_events VALUES(?,?,?,?,?)')"
  ],
  [
    "  });}\n };\n}",
    "  });}\n };\n return createLegacyOrderIntakeAccess({database:db,orderIntake:intake,clock});\n}"
  ]
];
export function patchLegacyOrderIntakeSource(source){
 if(typeof source!=='string'||createHash('sha256').update(source).digest('hex')!==ORIGINAL_SHA256)throw Error('Legacy source SHA256 differs; explicit review required.');
 let result=source;for(const [before,after] of changes){if(result.split(before).length!==2)throw Error('Legacy patch anchor mismatch');result=result.replace(before,after);}return result;
}
