import {merchantConfig, verifyMerchantStorage, prepareMerchantStorage, checkMerchantPython} from './merchant-config.mjs';
try {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['prepare', 'check'].includes(args[0])) throw Error();
  const config = merchantConfig(process.env);
  if (args[0] === 'prepare') prepareMerchantStorage(config);
  else {verifyMerchantStorage(config); checkMerchantPython(config);}
  console.log(JSON.stringify({ok: true, action: args[0], scope: 'shopify-merchant-test', merchantLoginVerified: false, shopMutationsEnabled: false, checkoutEnabled: false}));
} catch (error) {
  const code = /^merchant_[a-z_]+$/.test(error.code || '') ? error.code : 'merchant_check_failed';
  console.error(JSON.stringify({ok: false, code})); process.exitCode = 1;
}
